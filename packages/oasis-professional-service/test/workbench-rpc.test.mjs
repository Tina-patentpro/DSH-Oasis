import assert from 'node:assert/strict'
import test from 'node:test'

import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { WorkspaceMaterialError } from '../src/workspace-materials.js'
import {
  createEditableDraft,
  createRunSnapshot,
  createV2Record,
} from './workbench-fixtures.mjs'

test('dispatches state endpoints with a schema-v2 editable replacement', async () => {
  const calls = []
  const service = {
    getState(workspaceId) {
      calls.push(['get', workspaceId])
      return createV2Record(workspaceId, 0, { empty: true })
    },
    async replaceState(workspaceId, expectedRevision, state) {
      calls.push(['replaceEditable', workspaceId, expectedRevision, state])
      return { committed: true, current: createV2Record(workspaceId, 1, { empty: true }) }
    },
  }
  const handler = createWorkbenchRpcHandler(service)
  const draft = createEditableDraft()

  assert.deepEqual(await handler('state/get', { workspaceId: 'workspace-a' }), {
    ok: true,
    value: createV2Record('workspace-a', 0, { empty: true }),
  })
  assert.deepEqual(await handler('state/replace', {
    workspaceId: 'workspace-a',
    expectedRevision: 0,
    state: draft,
  }), {
    ok: true,
    value: { committed: true, current: createV2Record('workspace-a', 1, { empty: true }) },
  })
  assert.deepEqual(calls.map((call) => call[0]), ['get', 'replaceEditable'])
})

test('returns revision conflict as a successful business payload', async () => {
  const current = createV2Record('workspace-a', 2, { empty: true })
  const handler = createWorkbenchRpcHandler({
    async replaceState() {
      return { committed: false, reason: 'revision-conflict', current }
    },
  })
  assert.deepEqual(await handler('state/replace', {
    workspaceId: 'workspace-a', expectedRevision: 1, state: createEditableDraft(),
  }), {
    ok: true,
    value: { committed: false, reason: 'revision-conflict', current },
  })
})

test('rejects unknown endpoints, extra root fields, identity injection, and Host evidence', async () => {
  const handler = createWorkbenchRpcHandler({
    getState() { throw new Error('service must not be called') },
    async replaceState() { throw new Error('service must not be called') },
  })
  const evidence = createEditableDraft()
  evidence.tasks['task-a'].runs = { 'run-a': createRunSnapshot() }

  for (const [endpoint, payload] of [
    ['state/delete', { workspaceId: 'workspace-a' }],
    ['state/get', { workspaceId: 'workspace-a', extra: true }],
    ['state/replace', {
      workspaceId: 'workspace-a', expectedRevision: 0,
      state: { ...createEditableDraft(), workspaceId: 'workspace-b' },
    }],
    ['state/replace', { workspaceId: 'workspace-a', expectedRevision: 0, state: evidence }],
  ]) {
    const result = await handler(endpoint, payload)
    assert.equal(result.ok, false)
    assert.equal(result.error.code, 'bad-request')
    assert.equal(result.error.details.issues.length > 0, true)
  }
})

test('does not disguise repository infrastructure failures', async () => {
  const handler = createWorkbenchRpcHandler({ getState() { throw new Error('storage corrupt') } })
  await assert.rejects(handler('state/get', { workspaceId: 'workspace-a' }), /storage corrupt/)
})

test('rejects over-budget editable drafts before calling the repository', async () => {
  const handler = createWorkbenchRpcHandler({
    async replaceState() { throw new Error('service must not be called') },
  })
  const state = createEditableDraft()
  state.taskOrder = Array.from({ length: 33 }, (_, index) => `task-${index}`)
  state.activeTaskId = state.taskOrder[0]
  state.tasks = Object.fromEntries(state.taskOrder.map((taskId) => [taskId, {
    ...state.tasks['task-a'], taskId,
  }]))
  const result = await handler('state/replace', {
    workspaceId: 'workspace-a', expectedRevision: 0, state,
  })
  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'bad-request')
})

test('dispatches a strictly validated workflow catalog endpoint', async () => {
  const calls = []
  const value = { schemaVersion: 1, workflows: [] }
  const handler = createWorkbenchRpcHandler({
    getWorkflowCatalog(workType) {
      calls.push(workType)
      return value
    },
  })
  assert.deepEqual(await handler('workflow/catalog', {}), { ok: true, value })
  assert.deepEqual(await handler('workflow/catalog', { workType: 'technical-rd' }), { ok: true, value })
  assert.deepEqual(calls, [undefined, 'technical-rd'])

  for (const payload of [{ workType: 'unknown' }, { extra: true }]) {
    const result = await handler('workflow/catalog', payload)
    assert.equal(result.ok, false)
    assert.equal(result.error.code, 'bad-request')
  }
})

test('dispatches strictly validated material commands without accepting Host evidence', async () => {
  const calls = []
  const value = { committed: true, current: createV2Record('workspace-a', 2, { withEvidence: true }) }
  const handler = createWorkbenchRpcHandler({
    async addMaterial(payload) { calls.push(['add', payload]); return value },
    async refreshMaterial(payload) { calls.push(['refresh', payload]); return value },
    async removeMaterial(payload) { calls.push(['remove', payload]); return value },
  })
  const add = {
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 1,
    relativePath: 'materials\\spec.md', confirmed: true,
  }
  const refresh = { workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 1, referenceId: 'ref-a' }
  const remove = { ...refresh }

  assert.deepEqual(await handler('material/add', add), { ok: true, value })
  assert.deepEqual(await handler('material/refresh', refresh), { ok: true, value })
  assert.deepEqual(await handler('material/remove', remove), { ok: true, value })
  assert.deepEqual(calls, [['add', add], ['refresh', refresh], ['remove', remove]])

  for (const [endpoint, payload] of [
    ['material/add', { ...add, confirmed: false }],
    ['material/add', { ...add, extra: true }],
    ['material/refresh', { ...refresh, referenceId: '' }],
    ['material/remove', { ...remove, expectedRevision: -1 }],
  ]) {
    const result = await handler(endpoint, payload)
    assert.equal(result.ok, false)
    assert.equal(result.error.code, 'bad-request')
  }
})

test('serializes known material failures but still propagates infrastructure failures', async () => {
  const known = createWorkbenchRpcHandler({
    async addMaterial() {
      throw new WorkspaceMaterialError('MATERIAL_CHANGED', 'Confirmed material changed', { referenceId: 'ref-a' })
    },
  })
  assert.deepEqual(await known('material/add', {
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 1,
    relativePath: 'materials\\spec.md', confirmed: true,
  }), {
    ok: false,
    error: {
      code: 'MATERIAL_CHANGED',
      message: 'Confirmed material changed',
      details: { referenceId: 'ref-a' },
    },
  })

  const infrastructure = createWorkbenchRpcHandler({
    async refreshMaterial() { throw new Error('disk offline') },
  })
  await assert.rejects(infrastructure('material/refresh', {
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 1, referenceId: 'ref-a',
  }), /disk offline/)
})

test('dispatches strict task create and review commands without accepting Client evidence', async () => {
  const calls = []
  const value = { committed: true, current: createV2Record('workspace-a', 4, { withEvidence: true }) }
  const handler = createWorkbenchRpcHandler({
    async createRun(payload) { calls.push(['create', payload]); return value },
    async reviewRun(payload) { calls.push(['review', payload]); return value },
  })
  const create = {
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 3, requestKey: 'request-a',
  }
  const review = {
    workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-a', expectedRevision: 3,
    status: 'changes-requested', note: '请补充验证标准',
  }

  assert.deepEqual(await handler('task/create', create), { ok: true, value })
  assert.deepEqual(await handler('task/review', review), { ok: true, value })
  assert.deepEqual(calls, [['create', create], ['review', review]])

  for (const [endpoint, payload] of [
    ['task/create', { ...create, result: createRunSnapshot().result }],
    ['task/create', { ...create, requestKey: '' }],
    ['task/review', { ...review, status: 'not-reviewed' }],
    ['task/review', { ...review, note: '   ' }],
    ['task/review', { ...review, inputSnapshot: createRunSnapshot().inputSnapshot }],
  ]) {
    const result = await handler(endpoint, payload)
    assert.equal(result.ok, false)
    assert.equal(result.error.code, 'bad-request')
  }
  assert.equal(calls.length, 2)
})

test('serializes known run-domain failures and propagates runner infrastructure faults', async () => {
  const known = createWorkbenchRpcHandler({
    async createRun() {
      throw new WorkspaceMaterialError('IDEMPOTENCY_CONFLICT', 'Request key conflict', {
        requestKey: 'request-a', runId: 'run-a',
      })
    },
  })
  assert.deepEqual(await known('task/create', {
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 3, requestKey: 'request-a',
  }), {
    ok: false,
    error: {
      code: 'IDEMPOTENCY_CONFLICT',
      message: 'Request key conflict',
      details: { requestKey: 'request-a', runId: 'run-a' },
    },
  })

  const infrastructure = createWorkbenchRpcHandler({
    async reviewRun() { throw new Error('runner invariant failed') },
  })
  await assert.rejects(infrastructure('task/review', {
    workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-a', expectedRevision: 3,
    status: 'approved', note: '',
  }), /runner invariant failed/)
})

test('dispatches strict two-phase writeback commands and commit accepts only a token', async () => {
  const calls = []
  const prepared = {
    confirmationToken: 'secret-token',
    manifest: {
      schemaVersion: 1,
      workspaceId: 'workspace-a',
      taskId: 'task-a',
      runId: 'run-a',
      artifactId: `sha256:${'c'.repeat(64)}`,
      relativeDirectory: 'outputs\\run-a',
      absoluteTarget: 'D:\\workspace\\outputs\\run-a',
      files: [
        {
          relativePath: 'outputs\\run-a\\result.md',
          absolutePath: 'D:\\workspace\\outputs\\run-a\\result.md',
          sizeBytes: 24,
          sha256: 'c'.repeat(64),
          mediaType: 'text/markdown',
        },
        {
          relativePath: 'outputs\\run-a\\result.oasis.json',
          absolutePath: 'D:\\workspace\\outputs\\run-a\\result.oasis.json',
          sizeBytes: 128,
          sha256: 'd'.repeat(64),
          mediaType: 'application/json',
        },
      ],
      expiresAt: '2026-08-26T01:12:03.000Z',
    },
  }
  const committed = { committed: true, current: createV2Record('workspace-a', 4, { withEvidence: true }) }
  const handler = createWorkbenchRpcHandler({
    async prepareWriteback(payload) { calls.push(['prepare', payload]); return prepared },
    async commitWriteback(payload) { calls.push(['commit', payload]); return committed },
  })
  const prepare = {
    workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-a', expectedRevision: 3,
    artifactId: `sha256:${'c'.repeat(64)}`, relativeDirectory: 'outputs\\run-a',
  }
  const commit = { confirmationToken: 'secret-token' }
  assert.deepEqual(await handler('artifact/prepare-writeback', prepare), { ok: true, value: prepared })
  assert.deepEqual(await handler('artifact/commit-writeback', commit), { ok: true, value: committed })
  assert.deepEqual(calls, [['prepare', prepare], ['commit', commit]])

  for (const [endpoint, payload] of [
    ['artifact/prepare-writeback', { ...prepare, artifact: createRunSnapshot().result.artifact }],
    ['artifact/prepare-writeback', { ...prepare, relativeDirectory: '' }],
    ['artifact/prepare-writeback', { ...prepare, expectedRevision: -1 }],
    ['artifact/commit-writeback', { ...commit, workspaceId: 'workspace-a' }],
    ['artifact/commit-writeback', { confirmationToken: '' }],
  ]) {
    const result = await handler(endpoint, payload)
    assert.equal(result.ok, false)
    assert.equal(result.error.code, 'bad-request')
  }
  assert.equal(calls.length, 2)
})

test('serializes committed-index failure with only a relative recovery manifest', async () => {
  const details = {
    manifest: {
      schemaVersion: 1,
      workspaceId: 'workspace-a',
      taskId: 'task-a',
      runId: 'run-a',
      artifactId: `sha256:${'c'.repeat(64)}`,
      relativeDirectory: 'outputs\\run-a',
      files: [
        { relativePath: 'outputs\\run-a\\result.md', sha256: 'c'.repeat(64), mediaType: 'text/markdown' },
        { relativePath: 'outputs\\run-a\\result.oasis.json', sha256: 'd'.repeat(64), mediaType: 'application/json' },
      ],
    },
  }
  const handler = createWorkbenchRpcHandler({
    async commitWriteback() {
      throw new WorkspaceMaterialError(
        'WRITEBACK_COMMITTED_INDEX_FAILED',
        'Files committed but Domain index failed',
        details,
      )
    },
  })
  assert.deepEqual(await handler('artifact/commit-writeback', { confirmationToken: 'secret-token' }), {
    ok: false,
    error: {
      code: 'WRITEBACK_COMMITTED_INDEX_FAILED',
      message: 'Files committed but Domain index failed',
      details,
    },
  })

  const unsafe = createWorkbenchRpcHandler({
    async commitWriteback() {
      throw new WorkspaceMaterialError(
        'WRITEBACK_COMMITTED_INDEX_FAILED',
        'unsafe recovery payload',
        { manifest: { ...details.manifest, absoluteTarget: 'D:\\workspace\\outputs\\run-a' } },
      )
    },
  })
  await assert.rejects(
    unsafe('artifact/commit-writeback', { confirmationToken: 'secret-token' }),
    /recovery manifest/i,
  )
})
