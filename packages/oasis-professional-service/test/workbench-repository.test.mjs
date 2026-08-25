import assert from 'node:assert/strict'
import test from 'node:test'

import { openOasisWorkbenchRepository } from '../src/workbench-repository.js'

const NOW = '2026-08-25T01:02:03.000Z'

function createDraft(taskId = 'task-a') {
  return {
    schemaVersion: 1,
    panelMode: 'normal',
    activeTaskId: taskId,
    taskOrder: [taskId],
    tasks: {
      [taskId]: {
        taskId,
        title: '技术研发任务',
        workType: 'technical-rd',
        workflowId: 'workflow-a',
        workflowVersion: '1',
        inputRefs: [],
        formValues: {},
        run: null,
        preview: null,
        review: 'not-reviewed',
        createdAt: NOW,
        updatedAt: NOW,
      },
    },
  }
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
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
      return domain
    },
  }
  return { storageDomain, records, calls }
}

test('opens the declared Domain and missing reads do not materialize a row', async () => {
  const fixture = createStorageFixture()
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })

  const state = repository.get('workspace-a')

  assert.equal(state.revision, 0)
  assert.equal(state.workspaceId, 'workspace-a')
  assert.equal(fixture.calls.open, 1)
  assert.equal(fixture.calls.put.length, 0)
  assert.equal(fixture.records.size, 0)
  await repository.close()
})

test('first replacement materializes revision one with Host-owned identity and time', async () => {
  const fixture = createStorageFixture()
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })

  const result = await repository.replace('workspace-a', 0, createDraft())

  assert.equal(result.committed, true)
  assert.equal(result.current.workspaceId, 'workspace-a')
  assert.equal(result.current.revision, 1)
  assert.equal(result.current.updatedAt, NOW)
  assert.equal(fixture.records.get('workspace-a').revision, 1)
  assert.equal(Object.isFrozen(result.current.tasks['task-a']), true)
  await repository.close()
})

test('serializes same-Workspace replacements so one revision wins and one receives current', async () => {
  const fixture = createStorageFixture()
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })

  const [first, second] = await Promise.all([
    repository.replace('workspace-a', 0, createDraft('task-a')),
    repository.replace('workspace-a', 0, createDraft('task-b')),
  ])

  assert.equal(first.committed, true)
  assert.deepEqual(second, {
    committed: false,
    reason: 'revision-conflict',
    current: first.current,
  })
  assert.equal(fixture.calls.put.length, 1)
  await repository.close()
})

test('keeps revision and state independent across Workspaces', async () => {
  const fixture = createStorageFixture()
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })

  const writeA = await repository.replace('workspace-a', 0, createDraft('task-a'))
  const writeB = await repository.replace('workspace-b', 0, createDraft('task-b'))

  assert.equal(writeA.committed, true)
  assert.equal(writeB.committed, true)
  assert.equal(writeB.current.workspaceId, 'workspace-b')
  assert.equal(repository.get('workspace-a').activeTaskId, 'task-a')
  assert.equal(repository.get('workspace-b').activeTaskId, 'task-b')
  await repository.close()
})

test('propagates storage failure and leaves the authoritative row unchanged', async () => {
  const fixture = createStorageFixture({
    async beforePut() {
      throw new Error('durability failed')
    },
  })
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })

  await assert.rejects(repository.replace('workspace-a', 0, createDraft()), /durability failed/)
  assert.equal(repository.get('workspace-a').revision, 0)
  assert.equal(fixture.records.size, 0)
  await repository.close()
})

test('rejects a replacement when the persisted revision is exhausted', async () => {
  const fixture = createStorageFixture()
  fixture.records.set('workspace-a', {
    ...createDraft(),
    workspaceId: 'workspace-a',
    revision: Number.MAX_SAFE_INTEGER,
    updatedAt: NOW,
  })
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })

  await assert.rejects(
    repository.replace('workspace-a', Number.MAX_SAFE_INTEGER, createDraft()),
    /revision.*exhausted/i,
  )
  assert.equal(fixture.calls.put.length, 0)
  await repository.close()
})

test('close rejects new work, drains admitted writes, then closes the Domain once', async () => {
  const release = deferred()
  const started = deferred()
  const fixture = createStorageFixture({
    async beforePut() {
      started.resolve()
      await release.promise
    },
  })
  const repository = await openOasisWorkbenchRepository(fixture.storageDomain, { clock: () => NOW })

  const admitted = repository.replace('workspace-a', 0, createDraft())
  await started.promise
  const closing = repository.close()
  await assert.rejects(repository.replace('workspace-b', 0, createDraft('task-b')), /closed/i)
  assert.equal(fixture.calls.close, 0)

  release.resolve()
  assert.equal((await admitted).committed, true)
  await closing
  await repository.close()
  assert.equal(fixture.calls.close, 1)
  assert.throws(() => repository.get('workspace-a'), /closed/i)
})
