import assert from 'node:assert/strict'
import test from 'node:test'

import { createOasisRemoteService } from '../src/oasis-remote-service.js'
import { parseWorkbenchRecord, computeOasisRemoteInputSha256 } from '../src/workbench-domain.js'
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
    async getUserDetail() { calls.push(['user']); return { id: 101, balance: 20 } },
    async getCategoryCatalog() { calls.push(['catalog']); return [SERVICE] },
    async getApiDetail(name) { calls.push(['detail', name]); return structuredClone(DETAIL) },
    async getFolderList() { calls.push(['folders']); return { total: 1, items: [{ id: 8, name: '测试项目' }] } },
    async getFolderDetail(id) { calls.push(['folder', id]); return { id, name: '测试项目' } },
    async uploadFile(file) { calls.push(['upload', file.fileName]); return 'https://files-staging.example/upload/material.md' },
    async createWorkflow(input) {
      calls.push(['create', structuredClone(input)])
      return { resolved: true, result: {
        recordId: 90,
        key: input.key,
        answerText: '远程权利要求书草稿',
        fileUrls: ['https://files-staging.example/result/claims.docx'],
      } }
    },
    async queryProcess(key) { calls.push(['query', key]); return { key, status: 'running', progressPercent: 50, result: null } },
    async getRunningWater() {
      calls.push(['running-water'])
      return { total: 1, items: [{
        id: 301, linkId: 90, type: '消费', money: 3, balance: 17,
        createTime: '2026-08-26 09:02:03',
      }] }
    },
    ...overrides,
  }
}

function createHarness({ client = createClient(), pollLimit = 2, initial } = {}) {
  const record = initial ?? createV3Record('workspace-a', 1, { withEvidence: true })
  const task = record.tasks['task-a']
  if (!initial) task.inputRefs = [createMaterialReference()]
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
  const runtime = {
    enabled: true, environmentKind: 'non-production', apiBaseOrigin: 'https://oasis-staging.example',
    credentialConfigured: true, client,
  }
  const service = createOasisRemoteService({
    repository,
    materialManager,
    getRuntime: async () => runtime,
    clock: () => NOW,
    executionIdFactory: () => 'execution-remote-a',
    runIdFactory: () => 'run-remote-a',
    pollLimit,
    sleep: async () => {},
  })
  return { client, repository, service, runtime }
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

async function prepareRemote(harness) {
  await configureDraft(harness)
  await harness.service.start({
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: harness.repository.get().revision,
    requestKey: 'remote-request-a', priceConfirmed: true, externalTransferConfirmed: true,
  })
}

const REMOTE_EXECUTION = { workspaceId: 'workspace-a', taskId: 'task-a', executionId: 'execution-remote-a' }
const REMOTE_RUN = { workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-remote-a' }

test('S6 new execution and result bind the authenticated account into input integrity', async () => {
  const h = createHarness()
  await prepareRemote(h)
  assert.equal(h.repository.get().tasks['task-a'].remoteExecutions['execution-remote-a'].accountId, 101)
  await h.service.continue(REMOTE_EXECUTION)
  const record = h.repository.get()
  assert.equal(record.tasks['task-a'].runs['run-remote-a'].providerSnapshot.accountId, 101)
  const tampered = structuredClone(record)
  tampered.tasks['task-a'].remoteExecutions['execution-remote-a'].accountId = 202
  assert.throws(() => parseWorkbenchRecord('workspace-a', tampered))
})

test('S6 different account cannot continue an existing operation or observe its ledger', async () => {
  const h = createHarness()
  await prepareRemote(h)
  const before = JSON.stringify(h.repository.get())
  h.client.getUserDetail = async () => ({ id: 202, balance: 20 })
  await assert.rejects(h.service.continue(REMOTE_EXECUTION), { code: 'REMOTE_ACCOUNT_MISMATCH' })
  assert.equal(JSON.stringify(h.repository.get()), before)
  assert.equal(h.client.calls.filter(([name]) => ['upload', 'create', 'query'].includes(name)).length, 0)
  h.client.getUserDetail = async () => ({ id: 101, balance: 20 })
  await h.service.continue(REMOTE_EXECUTION)
  h.client.getUserDetail = async () => ({ id: 202, balance: 20 })
  await assert.rejects(h.service.observeRunningWater(REMOTE_RUN), { code: 'REMOTE_ACCOUNT_MISMATCH' })
  assert.equal(h.client.calls.filter(([name]) => name === 'running-water').length, 0)
})

test('S6 legacy unbound execution remains readable without silently acquiring the current account', async () => {
  const h = createHarness()
  await prepareRemote(h)
  const legacy = h.repository.get()
  const execution = legacy.tasks['task-a'].remoteExecutions['execution-remote-a']
  // Construct historical-format synthetic data; no stored user record is migrated.
  delete execution.accountId
  execution.inputSha = computeOasisRemoteInputSha256({
    providerSnapshot: { apiBaseOrigin: execution.apiBaseOrigin, apiId: execution.serviceSnapshot.apiId,
      apiEndpoint: execution.serviceSnapshot.apiEndpoint, apiProcess: execution.serviceSnapshot.apiProcess,
      folderId: execution.folderSnapshot.folderId, price: execution.priceSnapshot.price },
    formValues: execution.formValues, inputRefs: execution.materialSnapshots,
  })
  h.repository.replace(legacy)
  const bytes = JSON.stringify(h.repository.get()), calls = h.client.calls.length
  await assert.rejects(h.service.continue(REMOTE_EXECUTION), { code: 'REMOTE_ACCOUNT_UNVERIFIED' })
  assert.equal(h.client.calls.length, calls)
  assert.equal(JSON.stringify(h.repository.get()), bytes)
  assert.equal(Object.hasOwn(h.repository.get().tasks['task-a'].remoteExecutions['execution-remote-a'], 'accountId'), false)
})

test('S6 an old request key cannot be rebound to another authenticated account', async () => {
  const h = createHarness()
  await prepareRemote(h)
  const before = JSON.stringify(h.repository.get())
  h.client.getUserDetail = async () => ({ id: 202, balance: 20 })
  await assert.rejects(h.service.start({ workspaceId: 'workspace-a', taskId: 'task-a',
    expectedRevision: h.repository.get().revision, requestKey: 'remote-request-a',
    priceConfirmed: true, externalTransferConfirmed: true }), { code: 'IDEMPOTENCY_CONFLICT' })
  assert.equal(JSON.stringify(h.repository.get()), before)
})

for (const id of [undefined, '101', -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
  test(`S6 refuses a new execution with invalid authenticated account id ${id}`, async () => {
    const h = createHarness({ client: createClient({ getUserDetail: async () => ({ id, balance: 20 }) }) })
    await configureDraft(h)
    const before = JSON.stringify(h.repository.get())
    await assert.rejects(h.service.start({ workspaceId: 'workspace-a', taskId: 'task-a',
      expectedRevision: h.repository.get().revision, requestKey: 'account-test',
      priceConfirmed: true, externalTransferConfirmed: true }), { code: 'REMOTE_ACCOUNT_UNVERIFIED' })
    assert.equal(JSON.stringify(h.repository.get()), before)
  })
}

test('explicit production mode persists into execution and result and blocks mode changes', async () => {
  const h = createHarness()
  h.runtime.environmentKind = 'production'
  h.runtime.apiBaseOrigin = 'https://lzhxpy.oasisintwrite.com'
  assert.equal((await h.service.getBootstrap()).environmentKind, 'production')
  await prepareRemote(h)
  assert.equal(h.repository.get().tasks['task-a'].remoteExecutions['execution-remote-a'].environmentKind, 'production')
  h.runtime.environmentKind = 'non-production'
  await assert.rejects(h.service.continue(REMOTE_EXECUTION), { code: 'REMOTE_ENVIRONMENT_MISMATCH' })
  assert.equal(h.client.calls.filter(([name]) => name === 'create').length, 0)
  h.runtime.environmentKind = 'production'
  await h.service.continue(REMOTE_EXECUTION)
  const record = h.repository.get()
  assert.equal(record.tasks['task-a'].runs['run-remote-a'].providerSnapshot.environmentKind, 'production')
})

test('5A create authentication failure never resubmits after continue, stop or storage reload', async (t) => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Network forbidden in 5A') })
  const client = createClient({
    async createWorkflow(input) {
      this.calls.push(['create', structuredClone(input)])
      throw Object.assign(new Error('synthetic authentication failure'), { code: 'AUTH_REQUIRED' })
    },
  })
  const h = createHarness({ client, pollLimit: 1 })
  await prepareRemote(h)
  await h.service.continue(REMOTE_EXECUTION)
  const first = h.repository.get().tasks['task-a'].remoteExecutions['execution-remote-a']
  assert.equal(first.status, 'auth-required')
  await h.service.continue(REMOTE_EXECUTION)
  await h.service.stop(REMOTE_EXECUTION)
  const restored = createHarness({ client, pollLimit: 1, initial: JSON.parse(JSON.stringify(h.repository.get())) })
  await restored.service.continue(REMOTE_EXECUTION)
  assert.equal(client.calls.filter(([name]) => name === 'create').length, 1)
  assert.equal(first.submittedAt, NOW)
  const last = restored.repository.get().tasks['task-a'].remoteExecutions['execution-remote-a']
  assert.equal(last.submittedAt, first.submittedAt)
  assert.equal(last.requestKey, first.requestKey)
  assert.deepEqual(client.calls.filter(([name]) => name === 'query'), [
    ['query', first.requestKey], ['query', first.requestKey],
  ])
  assert.equal(client.calls.filter(([name]) => name === 'upload').length, 1)
})

test('5A polling authentication failure preserves submission through credential recovery and reload', async (t) => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Network forbidden in 5A') })
  let queryAuthorized = false
  const client = createClient({
    async createWorkflow(input) {
      this.calls.push(['create', structuredClone(input)])
      return { resolved: false, receipt: { key: input.key } }
    },
    async queryProcess(key) {
      this.calls.push(['query', key])
      if (!queryAuthorized) throw Object.assign(new Error('synthetic query auth'), { code: 'AUTH_REQUIRED' })
      return { key, status: 'running', progressPercent: 50, result: null }
    },
  })
  const h = createHarness({ client, pollLimit: 1 })
  await prepareRemote(h)
  await h.service.continue(REMOTE_EXECUTION)
  assert.equal(h.repository.get().tasks['task-a'].remoteExecutions['execution-remote-a'].submittedAt, NOW)
  h.runtime.credentialConfigured = false
  await assert.rejects(h.service.continue(REMOTE_EXECUTION), { code: 'AUTH_REQUIRED' })
  queryAuthorized = true
  const restored = createHarness({ client, pollLimit: 1, initial: JSON.parse(JSON.stringify(h.repository.get())) })
  await restored.service.continue(REMOTE_EXECUTION)
  assert.equal(client.calls.filter(([name]) => name === 'create').length, 1)
  assert.equal(restored.repository.get().tasks['task-a'].remoteExecutions['execution-remote-a'].submittedAt, NOW)
})

test('5A pre-dispatch missing credentials permits exactly one first create after configuration', async (t) => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Network forbidden in 5A') })
  const h = createHarness()
  await prepareRemote(h)
  h.runtime.credentialConfigured = false
  const before = h.repository.get()
  await assert.rejects(h.service.continue(REMOTE_EXECUTION), { code: 'AUTH_REQUIRED' })
  assert.deepEqual(h.repository.get(), before)
  assert.equal(h.client.calls.filter(([name]) => name === 'create').length, 0)
  assert.equal(before.tasks['task-a'].remoteExecutions['execution-remote-a'].submittedAt, null)
  h.runtime.credentialConfigured = true
  await h.service.continue(REMOTE_EXECUTION)
  await h.service.continue(REMOTE_EXECUTION)
  assert.equal(h.client.calls.filter(([name]) => name === 'create').length, 1)
  assert.equal(h.repository.get().tasks['task-a'].remoteExecutions['execution-remote-a'].status, 'completed')
})

test('F3 rejects malformed nonmatching normalized ledger items before claiming a miss', async () => {
  const h = createHarness({ client: createClient({ async getRunningWater() {
    return { total: 1, items: [{ id: 301, linkId: '90', type: '消费', money: 3, balance: 17 }] }
  } }) })
  await prepareRemote(h)
  await h.service.continue(REMOTE_EXECUTION)
  await assert.rejects(h.service.observeRunningWater(REMOTE_RUN), { code: 'INVALID_RUNNING_WATER_RESPONSE' })
})

test('F3 refuses duplicate link candidates rather than selecting the first transaction type', async () => {
  const item = { id: 301, linkId: 90, type: '充值', money: 30, balance: 17, createTime: null }
  const h = createHarness({ client: createClient({ async getRunningWater() {
    return { total: 2, items: [item, { ...item, id: 302, type: '消费' }] }
  } }) })
  await prepareRemote(h)
  await h.service.continue(REMOTE_EXECUTION)
  await assert.rejects(h.service.observeRunningWater(REMOTE_RUN), { code: 'RUNNING_WATER_AMBIGUOUS' })
})

test('F2 refuses cross-environment observation without reading a foreign ledger or changing state', async () => {
  const h = createHarness()
  await prepareRemote(h)
  await h.service.continue(REMOTE_EXECUTION)
  h.runtime.apiBaseOrigin = 'https://other-staging.example'
  const before = JSON.stringify(h.repository.get())
  await assert.rejects(h.service.observeRunningWater(REMOTE_RUN), { code: 'REMOTE_ENVIRONMENT_MISMATCH' })
  assert.equal(h.client.calls.some(([name]) => name === 'running-water'), false)
  assert.equal(JSON.stringify(h.repository.get()), before)
})

test('F2 refuses cross-environment continuation before any remote call', async () => {
  const h = createHarness()
  await prepareRemote(h)
  h.client.calls.length = 0
  h.runtime.apiBaseOrigin = 'https://other-staging.example'
  await assert.rejects(h.service.continue(REMOTE_EXECUTION), { code: 'REMOTE_ENVIRONMENT_MISMATCH' })
  assert.deepEqual(h.client.calls, [])
})

test('F4 preserves the create anchor and fails a conflicting query ID', async () => {
  const h = createHarness({ client: createClient({
    async createWorkflow(input) { return { resolved: false, receipt: { key: input.key, recordId: 90 } } },
    async queryProcess(key) { return { key, status: 'completed', result: { key, recordId: 91, answerText: 'conflict', fileUrls: [] } } },
  }) })
  await prepareRemote(h)
  const completed = await h.service.continue(REMOTE_EXECUTION)
  const task = completed.current.tasks['task-a']
  const execution = task.remoteExecutions['execution-remote-a']
  assert.equal(execution.recordId, 90)
  assert.equal(execution.recordIdSource, 'create')
  assert.equal(execution.safeError.code, 'REMOTE_RECORD_ID_MISMATCH')
  assert.equal(execution.status, 'failed')
  assert.equal(task.runs['run-remote-a'], undefined)
})

test('F4 query IDs never supply an absent create anchor', async () => {
  const h = createHarness({ client: createClient({
    async createWorkflow(input) { return { resolved: false, receipt: { key: input.key } } },
    async queryProcess(key) { return { key, status: 'completed', result: { key, recordId: 90, answerText: 'query only', fileUrls: [] } } },
  }) })
  await prepareRemote(h)
  await h.service.continue(REMOTE_EXECUTION)
  const observed = await h.service.observeRunningWater(REMOTE_RUN)
  assert.equal(observed.status, 'unverifiable')
  assert.equal(h.client.calls.some(([name]) => name === 'running-water'), false)
})

test('F4 a historical ID without provenance remains readable but is not an observation anchor', async () => {
  const h = createHarness()
  await prepareRemote(h)
  await h.service.continue(REMOTE_EXECUTION)
  const old = h.repository.get()
  delete old.tasks['task-a'].remoteExecutions['execution-remote-a'].recordIdSource
  h.repository.replace(old)
  const observed = await h.service.observeRunningWater(REMOTE_RUN)
  assert.equal(observed.status, 'unverifiable')
  assert.equal(h.client.calls.some(([name]) => name === 'running-water'), false)
})

test('F4 a wrong create key cannot store a record ID before rejection', async () => {
  const h = createHarness({ client: createClient({
    async createWorkflow() { return { resolved: true, result: { key: 'wrong-key', recordId: 99, answerText: 'wrong', fileUrls: [] } } },
  }) })
  await prepareRemote(h)
  await h.service.continue(REMOTE_EXECUTION)
  const e = h.repository.get().tasks['task-a'].remoteExecutions['execution-remote-a']
  assert.equal(e.recordId, null)
  assert.equal(e.safeError.code, 'REMOTE_KEY_MISMATCH')
})

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
  assert.equal(finalTask.remoteExecutions['execution-remote-a'].recordId, 90)
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

test('observes running water on demand without persisting it or claiming settlement', async () => {
  const harness = createHarness()
  await configureDraft(harness)
  await harness.service.start({
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 1,
    requestKey: 'remote-request-a', priceConfirmed: true, externalTransferConfirmed: true,
  })
  await harness.service.continue({
    workspaceId: 'workspace-a', taskId: 'task-a', executionId: 'execution-remote-a',
  })
  const before = JSON.stringify(harness.repository.get())

  const observed = await harness.service.observeRunningWater({
    workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-remote-a',
  })

  assert.deepEqual(observed, {
    status: 'observed',
    associationStatus: 'unverified',
    runId: 'run-remote-a',
    recordId: 90,
    scope: 'current-page',
    total: 1,
    item: {
      id: 301, linkId: 90, type: '消费', money: 3, balance: 17,
      createTime: '2026-08-26 09:02:03',
    },
    observedAt: NOW,
  })
  assert.equal(JSON.stringify(harness.repository.get()), before)
  assert.equal(harness.client.calls.filter(([name]) => name === 'running-water').length, 1)
  assert.equal(JSON.stringify(observed).includes('username'), false)
  assert.equal(JSON.stringify(observed).includes('settled'), false)
})

test('distinguishes a current-page miss from an unverifiable execution without querying twice', async () => {
  const missClient = createClient({
    async getRunningWater() {
      this.calls.push(['running-water'])
      return { total: 0, items: [] }
    },
  })
  const missHarness = createHarness({ client: missClient })
  await configureDraft(missHarness)
  await missHarness.service.start({
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 1,
    requestKey: 'remote-request-a', priceConfirmed: true, externalTransferConfirmed: true,
  })
  await missHarness.service.continue({
    workspaceId: 'workspace-a', taskId: 'task-a', executionId: 'execution-remote-a',
  })
  assert.deepEqual(await missHarness.service.observeRunningWater({
    workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-remote-a',
  }), {
    status: 'not-observed', runId: 'run-remote-a', recordId: 90,
    associationStatus: 'unverified',
    scope: 'current-page', total: 0, item: null, observedAt: NOW,
  })

  const unverifiableClient = createClient({
    async createWorkflow(input) {
      this.calls.push(['create', structuredClone(input)])
      return { resolved: true, result: { key: input.key, answerText: '无记录 id', fileUrls: [] } }
    },
  })
  const unverifiableHarness = createHarness({ client: unverifiableClient })
  await configureDraft(unverifiableHarness)
  await unverifiableHarness.service.start({
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 1,
    requestKey: 'remote-request-a', priceConfirmed: true, externalTransferConfirmed: true,
  })
  await unverifiableHarness.service.continue({
    workspaceId: 'workspace-a', taskId: 'task-a', executionId: 'execution-remote-a',
  })
  assert.deepEqual(await unverifiableHarness.service.observeRunningWater({
    workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-remote-a',
  }), {
    status: 'unverifiable', runId: 'run-remote-a', recordId: null,
    associationStatus: 'unverified',
    scope: 'current-page', total: null, item: null, observedAt: NOW,
  })
  assert.equal(unverifiableClient.calls.some(([name]) => name === 'running-water'), false)
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
