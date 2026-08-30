import assert from 'node:assert/strict'
import test from 'node:test'

import { createWorkbenchStore } from '../src/client/workbench-store.js'
import {
  createMaterialReference,
  createV2Record,
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

function createManualScheduler() {
  let nextTimerId = 0
  const timers = new Map()
  return {
    setTimeout(callback, delay) {
      const id = ++nextTimerId
      timers.set(id, { callback, delay })
      return id
    },
    clearTimeout(id) { timers.delete(id) },
    delays() { return [...timers.values()].map((timer) => timer.delay) },
    runNext() {
      const entry = timers.entries().next().value
      if (!entry) throw new Error('no scheduled timer')
      const [id, timer] = entry
      timers.delete(id)
      timer.callback()
    },
    size() { return timers.size },
  }
}

const TEST_CATALOG = Object.freeze({
  schemaVersion: 1,
  workflows: [{
    workflowId: 'remote-technical-rd',
    workflowVersion: '2026.08',
    workType: 'technical-rd',
    title: '远程目录研发流程',
    description: '来自 Host 目录。',
    executionMode: 'local-mock',
    materialPolicy: {
      acceptedExtensions: ['.md'], maxFiles: 8, maxFileBytes: 4096, contentReadMode: 'metadata-only',
    },
    outputSections: ['summary'],
    form: { fields: [
      { fieldId: 'objective', control: 'long-text', label: '目标', description: '', required: true, maxChars: 200 },
    ] },
  }],
})

function createTwoWorkspaceStore() {
  const store = createWorkbenchStore({ workflowCatalog: TEST_CATALOG })
  store.syncWorkspaces([
    { workspaceId: 'workspace-a' },
    { workspaceId: 'workspace-b' },
  ])
  return store
}

test('keeps pages when switching sessions inside one Workspace', () => {
  const store = createTwoWorkspaceStore()
  const page = store.createPage('workspace-a')
  store.selectWorkflow('workspace-a', page.pageId, 'remote-technical-rd')

  assert.equal(store.getWorkspaceState('workspace-a').pages.length, 1)
  assert.equal(store.getWorkspaceState('workspace-a').pages[0].view, 'workspace')
  assert.equal(store.getWorkspaceState('workspace-a').pages[0].title, '远程目录研发流程')
})

test('loads the chooser catalog from the Host and fails closed for an unknown workflow', async () => {
  let catalogCalls = 0
  const remote = {
    async getWorkflowCatalog() { catalogCalls += 1; return TEST_CATALOG },
  }
  const store = createWorkbenchStore({ remote })
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }])

  await store.loadWorkflowCatalog('workspace-a')
  const state = store.getWorkspaceState('workspace-a')
  assert.equal(catalogCalls, 1)
  assert.equal(state.catalogStatus, 'ready')
  assert.equal(state.workflows[0].workflowId, 'remote-technical-rd')
  assert.throws(() => store.selectWorkflow('workspace-a', 'missing-page', 'unknown'), /workflow catalog/i)
})

test('switches to an independent page set when Workspace changes', () => {
  const store = createTwoWorkspaceStore()
  store.createPage('workspace-a')

  assert.equal(store.getWorkspaceState('workspace-a').pages.length, 1)
  assert.equal(store.getWorkspaceState('workspace-b').pages.length, 0)
})

test('keeps hidden normal expanded state per Workspace', () => {
  const store = createTwoWorkspaceStore()
  store.setPanelMode('workspace-a', 'expanded')
  store.setPanelMode('workspace-b', 'hidden')

  assert.equal(store.getWorkspaceState('workspace-a').panelMode, 'expanded')
  assert.equal(store.getWorkspaceState('workspace-b').panelMode, 'hidden')
  store.setPanelMode('workspace-a', 'normal')
  assert.equal(store.getWorkspaceState('workspace-a').panelMode, 'normal')
})

test('opening an empty Workspace creates one workflow chooser page', () => {
  const store = createTwoWorkspaceStore()
  store.openPanel('workspace-a')
  const state = store.getWorkspaceState('workspace-a')

  assert.equal(state.panelMode, 'normal')
  assert.equal(state.pages.length, 1)
  assert.equal(state.pages[0].view, 'chooser')
  assert.equal(state.activePageId, state.pages[0].pageId)
})

test('rejects task creation when no Workspace owns the session', () => {
  const store = createTwoWorkspaceStore()
  assert.throws(() => store.createPage(null), /known Workspace/i)
  assert.throws(() => store.createPage('workspace-unknown'), /known Workspace/i)
})

test('notifies subscribers and preserves page state across panel transitions', () => {
  const store = createTwoWorkspaceStore()
  let notifications = 0
  const dispose = store.subscribe(() => { notifications += 1 })
  const page = store.createPage('workspace-a')
  store.setPanelMode('workspace-a', 'expanded')
  store.setPanelMode('workspace-a', 'hidden')
  store.setPanelMode('workspace-a', 'normal')
  dispose()

  assert.equal(store.getWorkspaceState('workspace-a').pages[0].pageId, page.pageId)
  assert.equal(notifications, 4)
})

test('keeps material drafts isolated and applies Host-authoritative material evidence', async () => {
  const calls = []
  const remote = {
    async get(workspaceId) { return createV2Record(workspaceId, 1) },
    async addMaterial(payload) {
      calls.push(payload)
      const current = createV2Record(payload.workspaceId, 2)
      current.tasks['task-a'].inputRefs = [createMaterialReference()]
      return { committed: true, current }
    },
  }
  const store = createWorkbenchStore({ remote, workflowCatalog: TEST_CATALOG })
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }, { workspaceId: 'workspace-b' }])
  await Promise.all([store.hydrateWorkspace('workspace-a'), store.hydrateWorkspace('workspace-b')])

  store.setMaterialDraft('workspace-a', 'task-a', 'materials\\technical.md', true)
  assert.equal(store.getWorkspaceState('workspace-a').pageOperations['task-a'].materialPath, 'materials\\technical.md')
  assert.equal(store.getWorkspaceState('workspace-b').pageOperations['task-a'], undefined)

  await store.addMaterial('workspace-a', 'task-a')
  assert.equal(calls[0].confirmed, true)
  assert.equal(calls[0].expectedRevision, 1)
  assert.equal(store.getWorkspaceState('workspace-a').revision, 2)
  assert.equal(store.getWorkspaceState('workspace-a').pages[0].inputRefs[0].sha256, 'a'.repeat(64))
  assert.equal(store.getWorkspaceState('workspace-a').pageOperations['task-a'].materialPath, '')
  assert.equal(store.getWorkspaceState('workspace-a').pageOperations['task-a'].feedback, 'material-added')
})

test('retains one requestKey across a failed generation retry and clears it after success', async () => {
  const requestKeys = []
  let attempts = 0
  const remote = {
    async get(workspaceId) { return createV2Record(workspaceId, 1) },
    async createRun(payload) {
      attempts += 1
      requestKeys.push(payload.requestKey)
      if (attempts === 1) throw Object.assign(new Error('connection lost'), { code: 'transport-failed' })
      return { committed: true, current: createV2Record(payload.workspaceId, 2, { withEvidence: true }) }
    },
  }
  const store = createWorkbenchStore({
    remote,
    workflowCatalog: TEST_CATALOG,
    createRequestKey: () => 'request-stable',
  })
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
  await store.hydrateWorkspace('workspace-a')

  await assert.rejects(() => store.createRun('workspace-a', 'task-a'), /connection lost/i)
  assert.equal(store.getWorkspaceState('workspace-a').pageOperations['task-a'].requestKey, 'request-stable')
  await store.createRun('workspace-a', 'task-a')

  assert.deepEqual(requestKeys, ['request-stable', 'request-stable'])
  assert.equal(store.getWorkspaceState('workspace-a').pageOperations['task-a'].requestKey, null)
  assert.equal(store.getWorkspaceState('workspace-a').pages[0].activeRunId, 'run-a')
})

test('enforces review and two-phase writeback confirmations before calling the Host', async () => {
  const blockedRecord = createV2Record('workspace-a', 3, { withEvidence: true })
  blockedRecord.tasks['task-a'].runs['run-a'].result.contentStatus = 'blocked'
  const calls = { review: 0, prepare: 0, commit: 0 }
  const remote = {
    async get() { return blockedRecord },
    async reviewRun() { calls.review += 1 },
    async prepareWriteback() { calls.prepare += 1 },
    async commitWriteback() { calls.commit += 1 },
  }
  const store = createWorkbenchStore({ remote, workflowCatalog: TEST_CATALOG })
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
  await store.hydrateWorkspace('workspace-a')

  await assert.rejects(() => store.reviewRun('workspace-a', 'task-a', 'run-a', 'approved', ''), /blocked/i)
  await assert.rejects(() => store.reviewRun('workspace-a', 'task-a', 'run-a', 'changes-requested', '  '), /note/i)
  await assert.rejects(() => store.prepareWriteback('workspace-a', 'task-a', 'run-a'), /blocked|approved/i)
  assert.deepEqual(calls, { review: 0, prepare: 0, commit: 0 })
})

test('stores prepared absolute paths and hashes, then distinguishes successful writeback feedback', async () => {
  const approved = createV2Record('workspace-a', 3, { withEvidence: true })
  approved.tasks['task-a'].runs['run-a'].review = {
    status: 'approved', note: '', updatedAt: approved.updatedAt,
  }
  const manifest = {
    schemaVersion: 1,
    workspaceId: 'workspace-a',
    taskId: 'task-a',
    runId: 'run-a',
    artifactId: approved.tasks['task-a'].runs['run-a'].result.artifact.artifactId,
    relativeDirectory: 'oasis-output',
    absoluteTarget: 'D:\\workspace\\oasis-output',
    files: [
      {
        relativePath: 'oasis-output\\result.md', absolutePath: 'D:\\workspace\\oasis-output\\result.md',
        sizeBytes: 10, sha256: 'c'.repeat(64), mediaType: 'text/markdown',
      },
      {
        relativePath: 'oasis-output\\result.oasis.json', absolutePath: 'D:\\workspace\\oasis-output\\result.oasis.json',
        sizeBytes: 20, sha256: 'd'.repeat(64), mediaType: 'application/json',
      },
    ],
    expiresAt: '2026-08-25T01:12:03.000Z',
  }
  const committed = structuredClone(approved)
  committed.revision = 4
  const calls = []
  const remote = {
    async get() { return approved },
    async prepareWriteback(payload) { calls.push(['prepare', payload]); return { confirmationToken: 'token-a', manifest } },
    async commitWriteback(token) { calls.push(['commit', token]); return { committed: true, current: committed } },
  }
  const store = createWorkbenchStore({ remote, workflowCatalog: TEST_CATALOG })
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
  await store.hydrateWorkspace('workspace-a')
  store.setWritebackDraft('workspace-a', 'task-a', 'oasis-output', false)

  await store.prepareWriteback('workspace-a', 'task-a', 'run-a')
  let operation = store.getWorkspaceState('workspace-a').pageOperations['task-a']
  assert.equal(operation.writebackPlan.manifest.absoluteTarget, 'D:\\workspace\\oasis-output')
  assert.deepEqual(operation.writebackPlan.manifest.files.map((file) => file.sha256), ['c'.repeat(64), 'd'.repeat(64)])
  await assert.rejects(() => store.commitWriteback('workspace-a', 'task-a'), /confirm/i)

  store.setWritebackConfirmation('workspace-a', 'task-a', true)
  await store.commitWriteback('workspace-a', 'task-a')
  operation = store.getWorkspaceState('workspace-a').pageOperations['task-a']
  assert.deepEqual(calls.map(([kind]) => kind), ['prepare', 'commit'])
  assert.equal(operation.feedback, 'writeback-success')
  assert.equal(operation.writebackPlan, null)
})

test('distinguishes committed index warnings and discards the consumed writeback plan', async () => {
  const approved = createV2Record('workspace-a', 3, { withEvidence: true })
  approved.tasks['task-a'].runs['run-a'].review = {
    status: 'approved', note: '', updatedAt: approved.updatedAt,
  }
  const artifactId = approved.tasks['task-a'].runs['run-a'].result.artifact.artifactId
  const recoveryManifest = {
    schemaVersion: 1,
    workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-a', artifactId,
    relativeDirectory: 'oasis-output',
    files: [
      { relativePath: 'oasis-output\\result.md', sha256: 'c'.repeat(64), mediaType: 'text/markdown' },
      { relativePath: 'oasis-output\\result.oasis.json', sha256: 'd'.repeat(64), mediaType: 'application/json' },
    ],
  }
  const remote = {
    async get() { return approved },
    async prepareWriteback() {
      return {
        confirmationToken: 'token-used',
        manifest: {
          ...recoveryManifest,
          absoluteTarget: 'D:\\workspace\\oasis-output',
          files: recoveryManifest.files.map((file) => ({
            ...file,
            absolutePath: `D:\\workspace\\${file.relativePath}`,
            sizeBytes: 10,
          })),
          expiresAt: '2026-08-25T01:12:03.000Z',
        },
      }
    },
    async commitWriteback() {
      throw Object.assign(new Error('index update failed'), {
        code: 'WRITEBACK_COMMITTED_INDEX_FAILED', details: { manifest: recoveryManifest },
      })
    },
  }
  const store = createWorkbenchStore({ remote, workflowCatalog: TEST_CATALOG })
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
  await store.hydrateWorkspace('workspace-a')
  store.setWritebackDraft('workspace-a', 'task-a', 'oasis-output', false)
  await store.prepareWriteback('workspace-a', 'task-a', 'run-a')
  store.setWritebackConfirmation('workspace-a', 'task-a', true)

  await assert.rejects(() => store.commitWriteback('workspace-a', 'task-a'), /index update failed/i)
  const operation = store.getWorkspaceState('workspace-a').pageOperations['task-a']
  assert.equal(operation.feedback, 'index-warning')
  assert.equal(operation.writebackPlan, null)
  assert.equal(operation.writebackConfirmed, false)
  assert.deepEqual(operation.indexWarningManifest, recoveryManifest)
})

test('validates the dispose drain deadline', () => {
  assert.throws(() => createWorkbenchStore({ disposeDrainMs: -1 }), /disposeDrainMs/)
  assert.throws(() => createWorkbenchStore({ disposeDrainMs: 1.5 }), /disposeDrainMs/)
})

test('dispose finishes within its deadline when a save can settle only after abort', async () => {
  let replaceStarted = false
  let signal = null
  const scheduler = createManualScheduler()
  const remote = {
    async get(workspaceId) { return createV2Record(workspaceId, 1) },
    async replace(_workspaceId, _revision, _draft, nextSignal) {
      replaceStarted = true
      signal = nextSignal
      return await new Promise((_, reject) => {
        nextSignal.addEventListener('abort', () => reject(new Error('aborted by dispose')), { once: true })
      })
    },
  }
  const store = createWorkbenchStore({
    remote,
    workflowCatalog: TEST_CATALOG,
    saveDelayMs: 0,
    disposeDrainMs: 10,
    scheduler,
  })
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
  await store.hydrateWorkspace('workspace-a')
  store.setPanelMode('workspace-a', 'expanded')
  await Promise.resolve()
  assert.equal(replaceStarted, true)

  const disposal = store.dispose()
  assert.throws(() => store.setPanelMode('workspace-a', 'normal'), /closing|disposed/i)
  assert.deepEqual(scheduler.delays(), [10])
  scheduler.runNext()
  await disposal

  assert.equal(signal.aborted, true)
  assert.equal(store.peekWorkspaceState('workspace-a').workspaceId, null)
  assert.throws(() => store.getWorkspaceState('workspace-a'), /known Workspace/i)
})

test('dispose keeps a quick acknowledged draft drain and repeated calls share one promise', async () => {
  const scheduler = createManualScheduler()
  const calls = []
  const remote = {
    async get(workspaceId) { return createV2Record(workspaceId, 1) },
    async replace(workspaceId, expectedRevision, draft, signal) {
      calls.push({ workspaceId, expectedRevision, draft, signal })
      return { committed: true, current: createV2Record(workspaceId, expectedRevision + 1) }
    },
  }
  const store = createWorkbenchStore({
    remote,
    workflowCatalog: TEST_CATALOG,
    saveDelayMs: 400,
    disposeDrainMs: 25,
    scheduler,
  })
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
  await store.hydrateWorkspace('workspace-a')
  store.setPanelMode('workspace-a', 'expanded')

  const first = store.dispose()
  const second = store.dispose()
  assert.equal(first, second)
  assert.throws(() => store.syncWorkspaces([]), /closing|disposed/i)
  await first

  assert.equal(calls.length, 1)
  assert.equal(calls[0].draft.panelMode, 'expanded')
  assert.equal(calls[0].signal.aborted, true)
  assert.equal(scheduler.size(), 0)
  assert.throws(() => store.createPage('workspace-a'), /closing|disposed/i)
})

test('dispose preserves an action acknowledged before closing while hydration is still in flight', async () => {
  const scheduler = createManualScheduler()
  const hydrationGate = deferred()
  const replacements = []
  const remote = {
    async get() { return hydrationGate.promise },
    async replace(workspaceId, expectedRevision, draft) {
      replacements.push({ workspaceId, expectedRevision, draft })
      return { committed: true, current: createV2Record(workspaceId, expectedRevision + 1) }
    },
  }
  const store = createWorkbenchStore({
    remote,
    workflowCatalog: TEST_CATALOG,
    saveDelayMs: 400,
    disposeDrainMs: 25,
    scheduler,
  })
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
  const hydration = store.hydrateWorkspace('workspace-a')
  store.openPanel('workspace-a')

  const disposal = store.dispose()
  hydrationGate.resolve(createV2Record('workspace-a', 0))
  await hydration
  await disposal

  assert.equal(replacements.length, 1)
  assert.equal(replacements[0].draft.panelMode, 'normal')
  assert.equal(replacements[0].draft.taskOrder.length, 1)
  assert.equal(scheduler.size(), 0)
})

test('dispose uses the 1000 ms default deadline when a remote ignores abort forever', async () => {
  const scheduler = createManualScheduler()
  let signal = null
  const remote = {
    async get(workspaceId) { return createV2Record(workspaceId, 1) },
    async replace(_workspaceId, _revision, _draft, nextSignal) {
      signal = nextSignal
      return await new Promise(() => {})
    },
  }
  const store = createWorkbenchStore({ remote, workflowCatalog: TEST_CATALOG, saveDelayMs: 0, scheduler })
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
  await store.hydrateWorkspace('workspace-a')
  store.setPanelMode('workspace-a', 'expanded')
  await Promise.resolve()

  const disposal = store.dispose()
  assert.deepEqual(scheduler.delays(), [1000])
  scheduler.runNext()
  await disposal

  assert.equal(signal.aborted, true)
  assert.equal(store.peekWorkspaceState('workspace-a').workspaceId, null)
})

test('a remote completion after the dispose deadline cannot repopulate cleared state', async () => {
  const scheduler = createManualScheduler()
  const gate = deferred()
  let replaceDraft = null
  let notifications = 0
  const remote = {
    async get(workspaceId) { return createV2Record(workspaceId, 1) },
    async replace(_workspaceId, _revision, draft) {
      replaceDraft = draft
      return gate.promise
    },
  }
  const store = createWorkbenchStore({
    remote,
    workflowCatalog: TEST_CATALOG,
    saveDelayMs: 0,
    disposeDrainMs: 5,
    scheduler,
  })
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
  await store.hydrateWorkspace('workspace-a')
  store.subscribe(() => { notifications += 1 })
  store.setPanelMode('workspace-a', 'expanded')
  await Promise.resolve()
  const notificationsBeforeDispose = notifications

  const disposal = store.dispose()
  assert.deepEqual(scheduler.delays(), [5])
  scheduler.runNext()
  await disposal
  gate.resolve({ committed: true, current: createV2Record('workspace-a', 2) })
  await Promise.resolve()
  await Promise.resolve()

  assert.equal(replaceDraft.panelMode, 'expanded')
  assert.equal(store.peekWorkspaceState('workspace-a').workspaceId, null)
  assert.equal(notifications, notificationsBeforeDispose)
})
