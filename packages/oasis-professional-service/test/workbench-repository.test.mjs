import assert from 'node:assert/strict'
import test from 'node:test'

import { computeOasisRemoteInputSha256 } from '../src/workbench-domain.js'
import { openOasisWorkbenchRepository } from '../src/workbench-repository.js'
import {
  NOW,
  createEditableDraft,
  createLegacyRecord,
  createMaterialReference,
  createRunSnapshot,
  createV3Record,
  recordToEditableDraft,
} from './workbench-fixtures.mjs'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function createUnresolvedRemoteExecution() {
  const providerSnapshot = {
    apiBaseOrigin: 'https://oasis-staging.example',
    apiId: 132,
    apiEndpoint: 'claims-v1',
    apiProcess: '整理,撰写',
    folderId: 8,
    price: 3,
  }
  const formValues = { User_input: '生成权利要求书' }
  return {
    executionId: 'execution-a',
    requestKey: 'remote-request-a',
    status: 'wait-stopped',
    inputSha: computeOasisRemoteInputSha256({ providerSnapshot, formValues, inputRefs: [] }),
    formValues,
    apiBaseOrigin: providerSnapshot.apiBaseOrigin,
    serviceSnapshot: {
      apiId: providerSnapshot.apiId,
      apiEndpoint: providerSnapshot.apiEndpoint,
      apiProcess: providerSnapshot.apiProcess,
      schemaHash: 'b'.repeat(64),
    },
    folderSnapshot: { folderId: providerSnapshot.folderId, folderName: '测试项目' },
    priceSnapshot: { price: providerSnapshot.price, balance: 20 },
    materialSnapshots: [],
    uploadedFiles: [],
    safeError: { code: 'WAIT_STOPPED', message: '本地等待已停止' },
    createdAt: NOW,
    updatedAt: NOW,
    submittedAt: NOW,
    completedAt: null,
  }
}

function createStorageFixture({ beforePut } = {}) {
  const records = new Map()
  const calls = { open: 0, put: [], close: 0 }
  const table = {
    get(key) {
      return records.get(key)
    },
    async put(key, value) {
      calls.put.push({ key, value })
      await beforePut?.(key, value)
      records.set(key, value)
    },
  }
  const domain = {
    table(name) {
      assert.equal(name, 'workspaces')
      return table
    },
    async close() {
      calls.close += 1
    },
  }
  const storageDomain = {
    async open(spec) {
      calls.open += 1
      assert.equal(spec.name, 'oasis_workbench')
      assert.equal(spec.version, 1)
      return domain
    },
  }
  return { storageDomain, records, calls }
}

test('v4 Host rejects changes to the input of an unresolved legacy execution', async () => {
  const fixture = createStorageFixture()
  const current = createV3Record('workspace-a', 4)
  current.tasks['task-a'].remoteExecutionOrder = ['execution-a']
  current.tasks['task-a'].remoteExecutions = { 'execution-a': createUnresolvedRemoteExecution() }
  fixture.records.set('workspace-a', current)
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })
  try {
    const draft = recordToEditableDraft(current)
    draft.tasks['task-a'].formValues = { objective: 'changed during unknown execution' }
    await assert.rejects(repository.replaceEditable('workspace-a', 4, draft), /unresolved|locked/i)
    assert.equal(fixture.calls.put.length, 0)
  } finally { await repository.close() }
})

test('missing and legacy reads publish v4 without materializing a row', async () => {
  const fixture = createStorageFixture()
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })
  assert.equal(repository.get('workspace-a').schemaVersion, 4)
  assert.equal(fixture.calls.put.length, 0)

  fixture.records.set('workspace-b', createLegacyRecord('workspace-b'))
  const migrated = repository.get('workspace-b')
  assert.equal(migrated.schemaVersion, 4)
  assert.equal(fixture.records.get('workspace-b').schemaVersion, 1)
  assert.equal(fixture.calls.put.length, 0)
  await repository.close()
})

test('first editable replacement materializes schema v4 with Host identity and time', async () => {
  const fixture = createStorageFixture()
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })
  const result = await repository.replaceEditable('workspace-a', 0, createEditableDraft())

  assert.equal(result.committed, true)
  assert.equal(result.current.schemaVersion, 4)
  assert.equal(result.current.workspaceId, 'workspace-a')
  assert.equal(result.current.revision, 1)
  assert.equal(result.current.updatedAt, NOW)
  assert.deepEqual(result.current.tasks['task-a'].inputRefs, [])
  assert.deepEqual(result.current.tasks['task-a'].runs, {})
  assert.equal(fixture.records.get('workspace-a').schemaVersion, 4)
  await repository.close()
})

test('editable replacement preserves Host-owned evidence byte-for-byte', async () => {
  const fixture = createStorageFixture()
  const current = createV3Record('workspace-a', 4, { withEvidence: true })
  fixture.records.set('workspace-a', current)
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })
  const evidence = structuredClone({
    inputRefs: current.tasks['task-a'].inputRefs,
    runOrder: current.tasks['task-a'].runOrder,
    runs: current.tasks['task-a'].runs,
  })
  const draft = recordToEditableDraft(current)
  draft.tasks['task-a'].title = '用户修改标题'
  draft.tasks['task-a'].formValues = { objective: '新的草稿目标' }

  const result = await repository.replaceEditable('workspace-a', 4, draft)
  assert.equal(result.committed, true)
  assert.equal(result.current.tasks['task-a'].title, '用户修改标题')
  assert.deepEqual({
    inputRefs: result.current.tasks['task-a'].inputRefs,
    runOrder: result.current.tasks['task-a'].runOrder,
    runs: result.current.tasks['task-a'].runs,
  }, evidence)
  await repository.close()
})

test('editable replacement cannot delete a task with an unresolved remote execution', async () => {
  const fixture = createStorageFixture()
  const current = createV3Record('workspace-a', 4)
  current.tasks['task-a'].remoteExecutionOrder = ['execution-a']
  current.tasks['task-a'].remoteExecutions = { 'execution-a': createUnresolvedRemoteExecution() }
  fixture.records.set('workspace-a', current)
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })
  const draft = recordToEditableDraft(current)
  draft.activeTaskId = null
  draft.taskOrder = []
  draft.tasks = {}

  await assert.rejects(
    repository.replaceEditable('workspace-a', current.revision, draft),
    /unresolved remote execution/i,
  )
  assert.equal(repository.get('workspace-a').tasks['task-a'].remoteExecutions['execution-a'].status, 'wait-stopped')
  await repository.close()
})

test('a Host mutation can append evidence only through full-record validation', async () => {
  const fixture = createStorageFixture()
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })
  await repository.replaceEditable('workspace-a', 0, createEditableDraft())

  const result = await repository.mutate('workspace-a', 1, (current) => {
    const next = structuredClone(current)
    next.tasks['task-a'].inputRefs.push(createMaterialReference())
    return next
  })
  assert.equal(result.committed, true)
  assert.deepEqual(result.current.tasks['task-a'].inputRefs, [createMaterialReference()])

  await assert.rejects(repository.mutate('workspace-a', 2, (current) => ({
    ...structuredClone(current),
    extra: true,
  })), /unrecognized|extra/i)
  assert.equal(repository.get('workspace-a').revision, 2)
  await repository.close()
})

test('a Host no-op mutation returns the current record without a revision or storage write', async () => {
  const fixture = createStorageFixture()
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })
  const created = await repository.replaceEditable('workspace-a', 0, createEditableDraft())
  const putsBefore = fixture.calls.put.length

  const result = await repository.mutate('workspace-a', created.current.revision, (current) => current)
  assert.equal(result.committed, true)
  assert.equal(result.current.revision, created.current.revision)
  assert.equal(fixture.calls.put.length, putsBefore)
  assert.deepEqual(repository.get('workspace-a'), created.current)
  await repository.close()
})

test('persists immutable run and review evidence across repository reopen', async () => {
  const fixture = createStorageFixture()
  const first = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })
  const created = await first.replaceEditable('workspace-a', 0, createEditableDraft())
  const withRun = await first.mutate('workspace-a', created.current.revision, (current) => {
    const next = structuredClone(current)
    const run = createRunSnapshot()
    next.tasks['task-a'].runs[run.runId] = run
    next.tasks['task-a'].runOrder.push(run.runId)
    next.tasks['task-a'].activeRunId = run.runId
    return next
  })
  const reviewed = await first.mutate('workspace-a', withRun.current.revision, (current) => {
    const next = structuredClone(current)
    next.tasks['task-a'].runs['run-a'].review = {
      status: 'approved', note: '已人工检查结构', updatedAt: NOW,
    }
    return next
  })
  const expectedBytes = JSON.stringify(reviewed.current.tasks['task-a'].runs['run-a'])
  await first.close()

  const reopened = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })
  assert.equal(JSON.stringify(reopened.get('workspace-a').tasks['task-a'].runs['run-a']), expectedBytes)
  await reopened.close()
})

test('serializes same-Workspace replacements and isolates Workspaces', async () => {
  const fixture = createStorageFixture()
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })
  const [first, second] = await Promise.all([
    repository.replaceEditable('workspace-a', 0, createEditableDraft('task-a')),
    repository.replaceEditable('workspace-a', 0, createEditableDraft('task-b')),
  ])
  assert.equal(first.committed, true)
  assert.deepEqual(second, { committed: false, reason: 'revision-conflict', current: first.current })

  const writeB = await repository.replaceEditable('workspace-b', 0, createEditableDraft('task-b'))
  assert.equal(writeB.current.workspaceId, 'workspace-b')
  assert.equal(repository.get('workspace-a').activeTaskId, 'task-a')
  assert.equal(repository.get('workspace-b').activeTaskId, 'task-b')
  await repository.close()
})

test('explicit editable mutation upgrades a stored v1 row to v4', async () => {
  const fixture = createStorageFixture()
  fixture.records.set('workspace-a', createLegacyRecord())
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })
  const current = repository.get('workspace-a')
  const result = await repository.replaceEditable('workspace-a', current.revision, recordToEditableDraft(current))
  assert.equal(result.current.schemaVersion, 4)
  assert.equal(fixture.records.get('workspace-a').schemaVersion, 4)
  await repository.close()
})

test('round-trips a migrated partial workflow identity but never creates or changes one', async () => {
  const fixture = createStorageFixture()
  const legacy = createLegacyRecord()
  legacy.tasks['task-a'].workflowVersion = null
  fixture.records.set('workspace-a', legacy)
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })

  const current = repository.get('workspace-a')
  const preserved = await repository.replaceEditable('workspace-a', current.revision, recordToEditableDraft(current))
  assert.equal(preserved.committed, true)
  assert.equal(preserved.current.tasks['task-a'].workflowVersion, null)

  const changedLegacy = recordToEditableDraft(preserved.current)
  changedLegacy.tasks['task-a'].workflowVersion = '1'
  await assert.rejects(
    repository.replaceEditable('workspace-a', preserved.current.revision, changedLegacy),
    /workflow identity.*immutable/i,
  )

  const newPartial = createEditableDraft('task-new')
  newPartial.tasks['task-new'].workflowVersion = null
  await assert.rejects(
    repository.replaceEditable('workspace-b', 0, newPartial),
    /workflow identity.*complete|partial workflow/i,
  )
  await repository.close()
})

test('storage failure leaves authoritative state unchanged', async () => {
  const fixture = createStorageFixture({ async beforePut() { throw new Error('durability failed') } })
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })
  await assert.rejects(repository.replaceEditable('workspace-a', 0, createEditableDraft()), /durability failed/)
  assert.equal(repository.get('workspace-a').revision, 0)
  assert.equal(fixture.records.size, 0)
  await repository.close()
})

test('rejects exhausted revision and closes only after admitted writes settle', async () => {
  const exhaustedFixture = createStorageFixture()
  exhaustedFixture.records.set('workspace-a', createV3Record('workspace-a', Number.MAX_SAFE_INTEGER))
  const exhausted = await openOasisWorkbenchRepository(exhaustedFixture.storageDomain, { clock: () => NOW })
  await assert.rejects(
    exhausted.replaceEditable('workspace-a', Number.MAX_SAFE_INTEGER, recordToEditableDraft(exhausted.get('workspace-a'))),
    /revision.*exhausted/i,
  )
  await exhausted.close()

  const release = deferred()
  const started = deferred()
  const fixture = createStorageFixture({ async beforePut() { started.resolve(); await release.promise } })
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })
  const admitted = repository.replaceEditable('workspace-a', 0, createEditableDraft())
  await started.promise
  const closing = repository.close()
  await assert.rejects(repository.replaceEditable('workspace-b', 0, createEditableDraft('task-b')), /closed/i)
  release.resolve()
  assert.equal((await admitted).committed, true)
  await closing
  await repository.close()
  assert.equal(fixture.calls.close, 1)
  assert.throws(() => repository.get('workspace-a'), /closed/i)
})
