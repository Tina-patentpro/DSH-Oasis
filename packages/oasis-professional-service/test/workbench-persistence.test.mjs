import assert from 'node:assert/strict'
import test from 'node:test'

import { createWorkbenchStore } from '../src/client/workbench-store.js'

const NOW = '2026-08-25T03:00:00.000Z'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function emptyRecord(workspaceId, revision = 0) {
  return {
    schemaVersion: 1,
    workspaceId,
    revision,
    panelMode: 'hidden',
    activeTaskId: null,
    taskOrder: [],
    tasks: {},
    updatedAt: revision === 0 ? '1970-01-01T00:00:00.000Z' : NOW,
  }
}

function committedRecord(workspaceId, revision, draft) {
  return {
    ...draft,
    workspaceId,
    revision,
    updatedAt: NOW,
  }
}

function createStore(remote) {
  let id = 0
  return createWorkbenchStore({
    remote,
    createId: () => `task-${++id}`,
    clock: () => NOW,
  })
}

test('never saves the default state before hydration, then applies the queued open action', async () => {
  const hydration = deferred()
  const calls = { get: 0, replace: [] }
  const remote = {
    async get() {
      calls.get += 1
      return hydration.promise
    },
    async replace(workspaceId, expectedRevision, state) {
      calls.replace.push({ workspaceId, expectedRevision, state })
      return { committed: true, current: committedRecord(workspaceId, expectedRevision + 1, state) }
    },
  }
  const store = createStore(remote)
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }])

  store.openPanel('workspace-a')
  assert.equal(store.getWorkspaceState('workspace-a').syncStatus, 'loading')
  assert.equal(store.getWorkspaceState('workspace-a').panelMode, 'normal')
  assert.equal(calls.replace.length, 0)

  hydration.resolve(emptyRecord('workspace-a'))
  await store.whenSettled('workspace-a')
  const state = store.getWorkspaceState('workspace-a')
  assert.equal(calls.get, 1)
  assert.equal(calls.replace.length, 1)
  assert.equal(calls.replace[0].expectedRevision, 0)
  assert.equal(state.syncStatus, 'ready')
  assert.equal(state.revision, 1)
  assert.equal(state.pages.length, 1)
  assert.equal(state.panelMode, 'normal')
})

test('hydrates persisted pages without issuing a replacement', async () => {
  const persisted = committedRecord('workspace-a', 7, {
    schemaVersion: 1,
    panelMode: 'expanded',
    activeTaskId: 'task-a',
    taskOrder: ['task-a'],
    tasks: {
      'task-a': {
        taskId: 'task-a', title: '已保存任务', workType: null, workflowId: null, workflowVersion: null,
        inputRefs: [], formValues: {}, run: null, preview: null, review: 'not-reviewed',
        createdAt: NOW, updatedAt: NOW,
      },
    },
  })
  let replacements = 0
  const store = createStore({
    async get() { return persisted },
    async replace() { replacements += 1 },
  })
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }])

  await store.hydrateWorkspace('workspace-a')

  const state = store.getWorkspaceState('workspace-a')
  assert.equal(state.revision, 7)
  assert.equal(state.pages[0].title, '已保存任务')
  assert.equal(state.panelMode, 'expanded')
  assert.equal(replacements, 0)
})

test('serializes rapid same-Workspace actions with the revision returned by each write', async () => {
  const firstWrite = deferred()
  const calls = []
  const remote = {
    async get(workspaceId) { return emptyRecord(workspaceId) },
    async replace(workspaceId, expectedRevision, state) {
      calls.push({ workspaceId, expectedRevision, state })
      if (calls.length === 1) return firstWrite.promise
      return { committed: true, current: committedRecord(workspaceId, expectedRevision + 1, state) }
    },
  }
  const store = createStore(remote)
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
  await store.hydrateWorkspace('workspace-a')

  store.createPage('workspace-a')
  store.setPanelMode('workspace-a', 'expanded')
  await Promise.resolve()
  assert.equal(calls.length, 1)
  assert.equal(calls[0].expectedRevision, 0)

  firstWrite.resolve({
    committed: true,
    current: committedRecord('workspace-a', 1, calls[0].state),
  })
  await store.whenSettled('workspace-a')

  assert.equal(calls.length, 2)
  assert.equal(calls[1].expectedRevision, 1)
  assert.equal(store.getWorkspaceState('workspace-a').revision, 2)
  assert.equal(store.getWorkspaceState('workspace-a').panelMode, 'expanded')
})

test('keeps Workspace save queues independent', async () => {
  const gates = { 'workspace-a': deferred(), 'workspace-b': deferred() }
  const calls = []
  const remote = {
    async get(workspaceId) { return emptyRecord(workspaceId) },
    async replace(workspaceId, expectedRevision, state) {
      calls.push({ workspaceId, expectedRevision, state })
      return gates[workspaceId].promise
    },
  }
  const store = createStore(remote)
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }, { workspaceId: 'workspace-b' }])
  await Promise.all([store.hydrateWorkspace('workspace-a'), store.hydrateWorkspace('workspace-b')])

  store.createPage('workspace-a')
  store.createPage('workspace-b')
  await Promise.resolve()
  assert.deepEqual(calls.map((call) => call.workspaceId).sort(), ['workspace-a', 'workspace-b'])

  for (const call of calls) {
    gates[call.workspaceId].resolve({
      committed: true,
      current: committedRecord(call.workspaceId, 1, call.state),
    })
  }
  await Promise.all([store.whenSettled('workspace-a'), store.whenSettled('workspace-b')])
  assert.equal(store.getWorkspaceState('workspace-a').revision, 1)
  assert.equal(store.getWorkspaceState('workspace-b').revision, 1)
})

test('preserves the local draft on revision conflict and reloads only on explicit request', async () => {
  const current = emptyRecord('workspace-a', 2)
  let gets = 0
  const remote = {
    async get(workspaceId) {
      gets += 1
      return gets === 1 ? emptyRecord(workspaceId, 1) : current
    },
    async replace() {
      return { committed: false, reason: 'revision-conflict', current }
    },
  }
  const store = createStore(remote)
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
  await store.hydrateWorkspace('workspace-a')

  store.createPage('workspace-a')
  await store.whenSettled('workspace-a')
  let state = store.getWorkspaceState('workspace-a')
  assert.equal(state.syncStatus, 'conflict')
  assert.equal(state.pages.length, 1)
  assert.equal(state.conflictCurrent.revision, 2)

  await store.reloadWorkspace('workspace-a')
  state = store.getWorkspaceState('workspace-a')
  assert.equal(state.syncStatus, 'ready')
  assert.equal(state.revision, 2)
  assert.equal(state.pages.length, 0)
})

test('shows transport failure without discarding the unsaved draft', async () => {
  const store = createStore({
    async get(workspaceId) { return emptyRecord(workspaceId) },
    async replace() { throw new Error('connection lost') },
  })
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
  await store.hydrateWorkspace('workspace-a')

  store.createPage('workspace-a')
  await store.whenSettled('workspace-a')
  const state = store.getWorkspaceState('workspace-a')
  assert.equal(state.syncStatus, 'error')
  assert.match(state.syncError, /connection lost/i)
  assert.equal(state.pages.length, 1)
})
