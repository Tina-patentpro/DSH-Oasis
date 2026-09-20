import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { createOasisRemoteService } from '../src/oasis-remote-service.js'
import { openOasisWorkbenchRepository } from '../src/workbench-repository.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { createMaterialReference, createV3Record, NOW } from './workbench-fixtures.mjs'

const ids = { workspaceId: 'workspace-a', taskId: 'task-a', executionId: 'execution-a' }
const bytes = new TextEncoder().encode('合成材料\r\n保持原文\n')
const sha = createHash('sha256').update(bytes).digest('hex')
const detail = { id: 132, name: 'synthetic-claims', apiType: 'Workflow', price: 3, modelName: '', executionMode: 'sync',
  inputFields: [{ fieldId: 'file', label: '交底', description: '', type: 'file', control: 'single-file' },
    { fieldId: 'User_input', label: '要求', description: '', type: 'paragraph', control: 'long-text' }],
  outputFields: [{ fieldId: 'output', label: '结果', description: '', type: 'paragraph', control: 'text-output' }] }

async function harness(t, { secondFile = false } = {}) {
  const record = createV3Record('workspace-a', 1)
  record.tasks['task-a'].inputRefs = [createMaterialReference({ sha256: sha, sizeBytes: bytes.length })]
  const serviceDetail = structuredClone(detail)
  if (secondFile) {
    record.tasks['task-a'].inputRefs.push(createMaterialReference({ referenceId: 'ref-b', sha256: sha, sizeBytes: bytes.length }))
    serviceDetail.inputFields.push({ fieldId: 'otherFile', label: '附图', description: '', type: 'file', control: 'single-file' })
  }
  const records = new Map([['workspace-a', record]]), calls = []
  const fault = { conflict: null, put: null, material: null, upload: null }
  const storage = { async open() { return { table() { return {
    get: key => records.get(key),
    async put(key, value) {
      if (fault.put?.(value.tasks['task-a'].remoteExecutions['execution-a'])) throw new Error('synthetic storage failure')
      records.set(key, structuredClone(value))
    },
  } }, async close() {} } } }
  let repository = await openOasisWorkbenchRepository(storage, { clock: () => NOW })
  t.after(() => repository.close())
  const boundary = {
    get: id => repository.get(id),
    async mutate(id, revision, operation) {
      const current = repository.get(id)
      if (fault.conflict?.(current.tasks['task-a'].remoteExecutions['execution-a'])) {
        fault.conflict = null
        await repository.mutate(id, revision, value => {
          const next = structuredClone(value); next.tasks['task-a'].title = 'concurrent edit preserved'; return next
        })
      }
      return repository.mutate(id, revision, operation)
    },
  }
  const client = {
    async getUserDetail() { return { id: 101, balance: 20 } },
    async getCategoryCatalog() { return [{ apiId: 132, apiEndpoint: 'synthetic-claims', apiProcess: 'one' }] },
    async getApiDetail() { return structuredClone(serviceDetail) },
    async getFolderDetail(id) { return { id, name: 'synthetic-folder' } },
    async uploadFile(upload) {
      calls.push('upload')
      assert.equal(execution().status, 'uploading', 'intent must be durable before upload')
      assert.deepEqual(upload.bytes, bytes)
      if (fault.upload) throw fault.upload
      return 'https://files-staging.example/material.md'
    },
    async createWorkflow(input) {
      calls.push('create')
      assert.notEqual(execution().submittedAt, null, 'create intent must be durable')
      assert.equal(input.inputs.file.url, 'https://files-staging.example/material.md')
      if (secondFile) assert.equal(input.inputs.otherFile.url, 'https://files-staging.example/material.md')
      return { resolved: true, result: { key: input.key, recordId: 90, answerText: 'synthetic-result', fileUrls: [] } }
    },
    async queryProcess(key) { calls.push('query'); return { key, status: 'running', progressPercent: 50, result: null } },
  }
  const materials = {
    async recheckAll(_id, refs) { return structuredClone(refs) },
    async readForUpload() {
      calls.push('material')
      if (fault.material) throw fault.material
      return { fileName: 'technical.md', mediaType: 'text/markdown', bytes: bytes.slice(), sha256: sha }
    },
  }
  const runtime = { enabled: true, credentialConfigured: true, environmentKind: 'non-production',
    apiBaseOrigin: 'https://oasis-staging.example', client }
  const make = () => createOasisRemoteService({ repository: boundary, materialManager: materials,
    getRuntime: async () => runtime, clock: () => NOW, executionIdFactory: () => 'execution-a',
    runIdFactory: () => 'run-a', pollLimit: 1, sleep: async () => {} })
  let service = make()
  const state = () => repository.get('workspace-a')
  function execution() { return state().tasks['task-a'].remoteExecutions['execution-a'] }
  const parsedDetail = await service.getServiceDetail('synthetic-claims')
  await repository.mutate('workspace-a', state().revision, current => {
    const next = structuredClone(current)
    next.tasks['task-a'].professionalDraft = { selectedApiEndpoint: 'synthetic-claims', selectedApiId: 132,
      schemaHash: parsedDetail.schemaHash, formValues: { User_input: '仅合成', file: 'ref-a', ...(secondFile ? { otherFile: 'ref-b' } : {}) }, folderId: 8, updatedAt: NOW }
    return next
  })
  await service.start({ ...ids, expectedRevision: state().revision, requestKey: 'synthetic-request',
    priceConfirmed: true, externalTransferConfirmed: true })
  return { calls, fault, state, execution, client, runtime, materials,
    continue: () => service.continue(ids),
    rpc: () => createWorkbenchRpcHandler({}, service)('professional/continue', ids),
    async mutate(change) { await repository.mutate('workspace-a', state().revision, current => {
      const next = structuredClone(current); change(next.tasks['task-a'].remoteExecutions['execution-a']); return next
    }) },
    async reload() {
      await repository.close()
      for (const [key, value] of records) records.set(key, JSON.parse(JSON.stringify(value)))
      repository = await openOasisWorkbenchRepository(storage, { clock: () => NOW }); service = make()
    },
  }
}

test('upload receipt storage failure cannot cause repeat upload or create after reload', async t => {
  const h = await harness(t)
  h.fault.put = e => e?.uploadedFiles.length === 1
  await assert.rejects(h.continue(), /storage failure/)
  assert.equal(h.execution().status, 'uploading')
  assert.equal(h.execution().uploadedFiles.length, 0)
  h.fault.put = null; await h.reload()
  await h.continue(); await h.continue()
  assert.equal(h.calls.filter(x => x === 'upload').length, 1)
  assert.equal(h.calls.includes('create'), false)
  assert.equal(h.execution().safeError.code, 'UPLOAD_OUTCOME_UNKNOWN')
})

for (const [name, predicate, uploads] of [
  ['upload intent', e => e?.status === 'prepared' && !e.uploadedFiles.length, 0],
  ['upload receipt', e => e?.status === 'uploading', 1],
  ['create intent', e => e?.status === 'ready-to-submit', 1],
]) test(`revision conflict at ${name} stops the next side effect and preserves concurrent edits`, async t => {
  const h = await harness(t); h.fault.conflict = predicate
  const result = await h.rpc()
  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'REMOTE_STATE_CONFLICT')
  assert.equal(h.calls.filter(x => x === 'upload').length, uploads)
  assert.equal(h.calls.includes('create'), false)
  assert.equal(h.calls.includes('query'), false)
  assert.equal(h.state().tasks['task-a'].title, 'concurrent edit preserved')
  if (name === 'upload receipt') {
    await h.reload(); await h.continue()
    assert.equal(h.calls.filter(x => x === 'upload').length, 1)
  } else {
    await h.reload(); await h.continue(); await h.continue()
    assert.equal(h.calls.filter(x => x === 'upload').length, 1)
    assert.equal(h.calls.filter(x => x === 'create').length, 1)
    assert.equal(h.execution().status, 'completed')
  }
})

test('receipt persisted before a later failure is reused exactly once after reload', async t => {
  const h = await harness(t)
  h.fault.put = e => e?.status === 'ready-to-submit'
  await assert.rejects(h.continue(), /storage failure/)
  assert.equal(h.execution().status, 'prepared')
  assert.equal(h.execution().uploadedFiles[0].sha256, sha)
  h.fault.put = null; await h.reload()
  await h.continue(); await h.continue()
  assert.equal(h.calls.filter(x => x === 'upload').length, 1)
  assert.equal(h.calls.filter(x => x === 'create').length, 1)
  assert.equal(h.execution().status, 'completed')
})

test('authentication error returned by an attempted upload is not permission to re-upload', async t => {
  const h = await harness(t)
  h.fault.upload = Object.assign(new Error('synthetic auth'), { code: 'AUTH_REQUIRED' })
  await h.continue()
  h.fault.upload = null; await h.reload(); await h.continue()
  assert.equal(h.calls.filter(x => x === 'upload').length, 1)
  assert.equal(h.calls.includes('create'), false)
  assert.equal(h.execution().safeError.code, 'UPLOAD_OUTCOME_UNKNOWN')
})

test('local material read failure before dispatch leaves no ambiguous upload intent', async t => {
  const h = await harness(t)
  h.fault.material = new Error('synthetic material changed')
  await assert.rejects(h.continue(), /material changed/)
  assert.equal(h.execution().status, 'prepared')
  assert.equal(h.calls.includes('upload'), false)
  h.fault.material = null; await h.reload(); await h.continue()
  assert.equal(h.calls.filter(x => x === 'upload').length, 1)
  assert.equal(h.execution().status, 'completed')
})

test('historical uploading record without a receipt never authorizes an automatic retry', async t => {
  const h = await harness(t)
  await h.mutate(e => { e.status = 'uploading' })
  await h.reload(); await h.continue()
  assert.equal(h.calls.includes('upload'), false)
  assert.equal(h.calls.includes('create'), false)
  assert.equal(h.execution().safeError.code, 'UPLOAD_OUTCOME_UNKNOWN')
})

test('historical pre-submission auth error cannot conceal an earlier attempted upload', async t => {
  const h = await harness(t)
  await h.mutate(e => { e.status = 'auth-required'; e.safeError = { code: 'AUTH_REQUIRED', message: 'synthetic old upload error' } })
  await h.reload(); await h.continue()
  assert.equal(h.calls.includes('upload'), false)
  assert.equal(h.calls.includes('create'), false)
  assert.equal(h.execution().safeError.code, 'UPLOAD_OUTCOME_UNKNOWN')
})

test('second upload receipt failure preserves first receipt and never replays either upload', async t => {
  const h = await harness(t, { secondFile: true })
  h.fault.put = e => e?.uploadedFiles.length === 2
  await assert.rejects(h.continue(), /storage failure/)
  assert.equal(h.execution().uploadedFiles.length, 1)
  assert.equal(h.execution().uploadedFiles[0].referenceId, 'ref-a')
  h.fault.put = null; await h.reload(); await h.continue()
  assert.equal(h.calls.filter(x => x === 'upload').length, 2)
  assert.equal(h.calls.includes('create'), false)
})

test('a receipt for another selected material cannot satisfy this file field', async t => {
  const h = await harness(t, { secondFile: true })
  await h.mutate(e => {
    e.uploadedFiles = [{ fieldId: 'file', referenceId: 'ref-b', sha256: sha,
      url: 'https://files-staging.example/material.md', uploadedAt: NOW }]
  })
  await h.continue()
  assert.equal(h.calls.includes('upload'), false)
  assert.equal(h.calls.includes('create'), false)
  assert.equal(h.execution().safeError.code, 'REMOTE_UPLOAD_RECEIPT_INVALID')
})

for (const [name, change] of [
  ['unknown field', list => { list[0].fieldId = 'other-field' }],
  ['text field', list => { list[0].fieldId = 'User_input' }],
]) test(`rejects ${name} in saved receipts without uploading or creating`, async t => {
  const h = await harness(t)
  await h.mutate(e => {
    e.uploadedFiles = [{ fieldId: 'file', referenceId: 'ref-a', sha256: sha,
      url: 'https://files-staging.example/material.md', uploadedAt: NOW }]
    change(e.uploadedFiles)
  })
  await h.reload(); await h.continue()
  assert.equal(h.calls.includes('upload'), false)
  assert.equal(h.calls.includes('create'), false)
  assert.equal(h.execution().safeError.code, 'REMOTE_UPLOAD_RECEIPT_INVALID')
})

for (const [name, change] of [
  ['wrong hash', list => { list[0].sha256 = 'b'.repeat(64) }],
  ['wrong reference', list => { list[0].referenceId = 'other-material' }],
  ['duplicate field', list => { list.push({ ...list[0] }) }],
]) test(`existing repository integrity rejects ${name} without saving it`, async t => {
  const h = await harness(t), before = JSON.stringify(h.state())
  await assert.rejects(h.mutate(e => {
    e.uploadedFiles = [{ fieldId: 'file', referenceId: 'ref-a', sha256: sha,
      url: 'https://files-staging.example/material.md', uploadedAt: NOW }]
    change(e.uploadedFiles)
  }))
  assert.equal(JSON.stringify(h.state()), before)
  assert.equal(h.calls.includes('upload'), false)
  assert.equal(h.calls.includes('create'), false)
})
