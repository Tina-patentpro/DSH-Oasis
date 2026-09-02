import assert from 'node:assert/strict'
import test from 'node:test'

import { createOasisRemoteService } from '../src/oasis-remote-service.js'
import { parseWorkbenchRecord } from '../src/workbench-domain.js'
import { createMaterialReference, createV3Record, NOW } from './workbench-fixtures.mjs'

const SERVICE = Object.freeze({
  categoryId: 6,
  categoryName: '权利要求书生成',
  group: '专利撰写',
  description: '生成草稿',
  apiId: 132,
  apiEndpoint: 'claims-v1',
  apiProcess: '整理,撰写',
  apiDescription: '测试服务',
})

const DETAIL = Object.freeze({
  id: 132,
  name: 'claims-v1',
  apiType: 'Workflow',
  price: 3,
  modelName: '',
  executionMode: 'sync',
  inputFields: [
    { fieldId: 'User_input', label: '要求', description: '', type: 'paragraph', control: 'long-text' },
    { fieldId: 'file', label: '交底书', description: '', type: 'file', control: 'single-file' },
  ],
  outputFields: [{ fieldId: 'output', label: '结果', description: '', type: 'paragraph', control: 'text-output' }],
})

function createRepository(initial) {
  let current = parseWorkbenchRecord(initial.workspaceId, initial)
  return {
    get() { return structuredClone(current) },
    replace(next) { current = parseWorkbenchRecord(next.workspaceId, next) },
    async mutate(workspaceId, expectedRevision, operation) {
      if (expectedRevision !== current.revision) {
        return { committed: false, reason: 'revision-conflict', current: structuredClone(current) }
      }
      const next = await operation(structuredClone(current))
      if (next === current || JSON.stringify(next) === JSON.stringify(current)) {
        return { committed: true, current: structuredClone(current) }
      }
      next.revision = current.revision + 1
      next.updatedAt = NOW
      current = parseWorkbenchRecord(workspaceId, next)
      return { committed: true, current: structuredClone(current) }
    },
  }
}

function createClient(overrides = {}) {
  const calls = []
  return {
    calls,
    async getUserDetail() { calls.push(['user']); return { balance: 20 } },
    async getCategoryCatalog() { calls.push(['catalog']); return [SERVICE] },
    async getApiDetail(name) { calls.push(['detail', name]); return structuredClone(DETAIL) },
    async getFolderList() { calls.push(['folders']); return { total: 1, items: [{ id: 8, name: '测试项目' }] } },
    async getFolderDetail(id) { calls.push(['folder', id]); return { id, name: '测试项目' } },
    async uploadFile(file) { calls.push(['upload', file.fileName]); return 'https://files-staging.example/upload/material.md' },
    async createWorkflow(input) {
      calls.push(['create', structuredClone(input)])
      return { resolved: true, result: {
        key: input.key,
        answerText: '远程权利要求书草稿',
        fileUrls: ['https://files-staging.example/result/claims.docx'],
      } }
    },
    async queryProcess(key) { calls.push(['query', key]); return { key, status: 'running', progressPercent: 50, result: null } },
    ...overrides,
  }
}

function createHarness({ client = createClient(), pollLimit = 2 } = {}) {
  const record = createV3Record('workspace-a', 1, { withEvidence: true })
  const task = record.tasks['task-a']
  task.inputRefs = [createMaterialReference()]
  const repository = createRepository(record)
  const materialManager = {
    async recheckAll(_workspaceId, references) { return structuredClone(references) },
    async readForUpload(_workspaceId, reference) {
      return {
        bytes: new TextEncoder().encode('material'),
        fileName: reference.displayName,
        mediaType: reference.mediaType,
        sha256: reference.sha256,
      }
    },
  }
  const service = createOasisRemoteService({
    repository,
    materialManager,
    getRuntime: async () => ({
      enabled: true,
      environmentKind: 'non-production',
      apiBaseOrigin: 'https://oasis-staging.example',
      credentialConfigured: true,
      client,
    }),
    clock: () => NOW,
    executionIdFactory: () => 'execution-remote-a',
    runIdFactory: () => 'run-remote-a',
    pollLimit,
    sleep: async () => {},
  })
  return { client, repository, service }
}

async function configureDraft(harness) {
  const detail = await harness.service.getServiceDetail('claims-v1')
  const current = harness.repository.get()
  current.tasks['task-a'].professionalDraft = {
    selectedApiEndpoint: 'claims-v1',
    selectedApiId: 132,
    schemaHash: detail.schemaHash,
    formValues: { User_input: '请撰写', file: 'ref-a' },
    folderId: 8,
    updatedAt: NOW,
  }
  harness.repository.replace(current)
  return detail
}

test('publishes a safe non-production bootstrap and schema-hashed service detail', async () => {
  const harness = createHarness()
  const bootstrap = await harness.service.getBootstrap()
  assert.equal(bootstrap.environmentKind, 'non-production')
  assert.equal(bootstrap.remoteEnabled, true)
  assert.equal(bootstrap.credentialConfigured, true)
  assert.equal(bootstrap.balance, 20)
  assert.deepEqual(bootstrap.services, [SERVICE])
  assert.deepEqual(bootstrap.folders, [{ id: 8, name: '测试项目' }])
  assert.equal(JSON.stringify(bootstrap).includes('jwt'), false)

  const detail = await harness.service.getServiceDetail('claims-v1')
  assert.match(detail.schemaHash, /^[a-f0-9]{64}$/)
  assert.equal(Object.hasOwn(detail, 'raw'), false)
})

test('persists a prepared execution before upload and completes through one create call', async () => {
  const harness = createHarness()
  await configureDraft(harness)
  const prepared = await harness.service.start({
    workspaceId: 'workspace-a',
    taskId: 'task-a',
    expectedRevision: 1,
    requestKey: 'remote-request-a',
    priceConfirmed: true,
    externalTransferConfirmed: true,
  })
  const execution = prepared.current.tasks['task-a'].remoteExecutions['execution-remote-a']
  assert.equal(execution.status, 'prepared')
  assert.deepEqual(execution.formValues, { User_input: '请撰写', file: 'ref-a' })
  assert.equal(harness.client.calls.some(([name]) => name === 'upload'), false)
  assert.equal(harness.client.calls.some(([name]) => name === 'create'), false)

  const completed = await harness.service.continue({
    workspaceId: 'workspace-a', taskId: 'task-a', executionId: 'execution-remote-a',
  })
  const finalTask = completed.current.tasks['task-a']
  assert.equal(finalTask.remoteExecutions['execution-remote-a'].status, 'completed')
  assert.equal(finalTask.runs['run-remote-a'].mode, 'oasis-legacy')
  assert.equal(finalTask.runs['run-remote-a'].result.answerText, '远程权利要求书草稿')
  assert.deepEqual(harness.client.calls.filter(([name]) => name === 'upload').length, 1)
  assert.deepEqual(harness.client.calls.filter(([name]) => name === 'create').length, 1)
  const createInput = harness.client.calls.find(([name]) => name === 'create')[1]
  assert.deepEqual(createInput.inputs.file, {
    type: 'document', transfer_method: 'remote_url',
    url: 'https://files-staging.example/upload/material.md',
  })
  assert.equal(JSON.stringify(completed.current).includes('"bytes"'), false)
})

test('never repeats an uncertain create and reconciles only through the original key', async () => {
  let queries = 0
  const client = createClient({
    async createWorkflow(input) {
      this.calls.push(['create', structuredClone(input)])
      throw new TypeError('socket closed after request write')
    },
    async queryProcess(key) {
      this.calls.push(['query', key])
      queries += 1
      return queries === 1
        ? { key, status: 'running', progressPercent: 50, result: null }
        : { key, status: 'completed', progressPercent: 100, result: {
            key, answerText: '对账后取得结果', fileUrls: [],
          } }
    },
  })
  const harness = createHarness({ client, pollLimit: 1 })
  await configureDraft(harness)
  await harness.service.start({
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 1,
    requestKey: 'remote-request-a', priceConfirmed: true, externalTransferConfirmed: true,
  })
  const uncertain = await harness.service.continue({
    workspaceId: 'workspace-a', taskId: 'task-a', executionId: 'execution-remote-a',
  })
  assert.equal(uncertain.current.tasks['task-a'].remoteExecutions['execution-remote-a'].status, 'wait-stopped')
  assert.equal(client.calls.filter(([name]) => name === 'create').length, 1)

  const reconciled = await harness.service.continue({
    workspaceId: 'workspace-a', taskId: 'task-a', executionId: 'execution-remote-a',
  })
  assert.equal(reconciled.current.tasks['task-a'].remoteExecutions['execution-remote-a'].status, 'completed')
  assert.equal(client.calls.filter(([name]) => name === 'create').length, 1)
  assert.equal(client.calls.filter(([name]) => name === 'query').length, 2)
})

test('shares one continuation job so concurrent callers cannot duplicate upload or create', async () => {
  let releaseCreate
  let announceCreate
  const createEntered = new Promise((resolve) => { announceCreate = resolve })
  const createBarrier = new Promise((resolve) => { releaseCreate = resolve })
  const client = createClient({
    async createWorkflow(input) {
      this.calls.push(['create', structuredClone(input)])
      announceCreate()
      await createBarrier
      return { resolved: true, result: {
        key: input.key, answerText: '并发安全结果', fileUrls: [],
      } }
    },
  })
  const harness = createHarness({ client })
  await configureDraft(harness)
  await harness.service.start({
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 1,
    requestKey: 'remote-request-a', priceConfirmed: true, externalTransferConfirmed: true,
  })

  const first = harness.service.continue({
    workspaceId: 'workspace-a', taskId: 'task-a', executionId: 'execution-remote-a',
  })
  await createEntered
  const second = harness.service.continue({
    workspaceId: 'workspace-a', taskId: 'task-a', executionId: 'execution-remote-a',
  })
  releaseCreate()
  const [firstResult, secondResult] = await Promise.all([first, second])

  assert.equal(client.calls.filter(([name]) => name === 'upload').length, 1)
  assert.equal(client.calls.filter(([name]) => name === 'create').length, 1)
  assert.deepEqual(secondResult, firstResult)
})

test('fails closed when the Host receives a completed result for another request key', async () => {
  const client = createClient({
    async createWorkflow(input) {
      this.calls.push(['create', structuredClone(input)])
      return { resolved: true, result: {
        key: 'other-request', answerText: 'wrong result', fileUrls: [],
      } }
    },
  })
  const harness = createHarness({ client })
  await configureDraft(harness)
  const initialRunOrder = harness.repository.get().tasks['task-a'].runOrder
  await harness.service.start({
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 1,
    requestKey: 'remote-request-a', priceConfirmed: true, externalTransferConfirmed: true,
  })

  const result = await harness.service.continue({
    workspaceId: 'workspace-a', taskId: 'task-a', executionId: 'execution-remote-a',
  })
  const task = result.current.tasks['task-a']
  assert.equal(task.remoteExecutions['execution-remote-a'].status, 'failed')
  assert.equal(task.remoteExecutions['execution-remote-a'].safeError.code, 'REMOTE_KEY_MISMATCH')
  assert.deepEqual(task.runOrder, initialRunOrder)
})

test('marks an uncertain upload failed and never uploads it again for the same execution', async () => {
  let uploads = 0
  const client = createClient({
    async uploadFile(file) {
      this.calls.push(['upload', file.fileName])
      uploads += 1
      throw new TypeError('upload response lost')
    },
  })
  const harness = createHarness({ client })
  await configureDraft(harness)
  await harness.service.start({
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 1,
    requestKey: 'remote-request-a', priceConfirmed: true, externalTransferConfirmed: true,
  })

  const failed = await harness.service.continue({
    workspaceId: 'workspace-a', taskId: 'task-a', executionId: 'execution-remote-a',
  })
  assert.equal(failed.current.tasks['task-a'].remoteExecutions['execution-remote-a'].status, 'failed')
  assert.equal(failed.current.tasks['task-a'].remoteExecutions['execution-remote-a'].safeError.code, 'UPLOAD_OUTCOME_UNKNOWN')

  const repeated = await harness.service.continue({
    workspaceId: 'workspace-a', taskId: 'task-a', executionId: 'execution-remote-a',
  })
  assert.equal(repeated.current.tasks['task-a'].remoteExecutions['execution-remote-a'].status, 'failed')
  assert.equal(uploads, 1)
  assert.equal(client.calls.filter(([name]) => name === 'create').length, 0)
})
