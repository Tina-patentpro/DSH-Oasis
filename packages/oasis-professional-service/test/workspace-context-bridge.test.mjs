import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const moduleUrl = new URL('../src/client/WorkspaceContextBridge.js', import.meta.url)
const implementation = existsSync(fileURLToPath(moduleUrl)) ? await import(moduleUrl) : {}
const createWorkspaceContextSnapshot = implementation.createWorkspaceContextSnapshot
  ?? (() => Object.freeze({ status: 'missing', generation: -1 }))
const resolveWorkspaceBinding = implementation.resolveWorkspaceBinding
  ?? (() => Object.freeze({ status: 'missing', workspaceId: null }))
const resolveMainViewSessionId = implementation.resolveMainViewSessionId ?? (() => undefined)

function sessionCatalog(byId, phase = 'ready') {
  return { ids: Object.keys(byId), byId, phase, projectionsBySession: {} }
}

test('resolves only the unique public main-view Session, not a retained Sidebar Session', () => {
  const catalog = sessionCatalog({
    'session-a': { id: 'session-a', retainedBy: { mainView: 1 } },
    'session-b': { id: 'session-b', retainedBy: { betterSidebar: 2 } },
  })
  assert.equal(resolveMainViewSessionId(catalog), 'session-a')
  assert.equal(resolveWorkspaceBinding({
    context: createWorkspaceContextSnapshot({
      currentSessionId: resolveMainViewSessionId(catalog),
      workspaceItems: [{ workspaceId: 'workspace-a', sessionIds: ['session-a'] }],
      generation: 1,
    }), sessionId: 'session-a', visible: true,
  }).status, 'ready')
})

test('follows native main-view retention changes without using legacy current', () => {
  const catalog = sessionCatalog({
    'session-a': { id: 'session-a', retainedBy: { betterSidebar: 1 } },
    'session-b': { id: 'session-b', retainedBy: { mainView: 1 } },
  })
  catalog.current = 'session-a'
  assert.equal(resolveMainViewSessionId(catalog), 'session-b')
})

test('an absent main view never binds to a Sidebar-only or legacy selection', () => {
  const catalog = sessionCatalog({
    'session-a': { id: 'session-a', retainedBy: { betterSidebar: 1 } },
  })
  catalog.current = 'session-a'
  assert.equal(resolveMainViewSessionId(catalog), null)
  assert.equal(resolveMainViewSessionId(sessionCatalog({}, 'pending')), null)
})

test('ambiguous main-view retention blocks instead of choosing the first Session', () => {
  const currentSessionId = resolveMainViewSessionId(sessionCatalog({
    'session-a': { id: 'session-a', retainedBy: { mainView: 1 } },
    'session-b': { id: 'session-b', retainedBy: { mainView: 1 } },
  }))
  assert.equal(currentSessionId, undefined)
  assert.equal(createWorkspaceContextSnapshot({ currentSessionId,
    workspaceItems: [{ workspaceId: 'workspace-a', sessionIds: ['session-a', 'session-b'] }],
    generation: 1,
  }).status, 'blocked')
})

test('malformed public retention or row identity blocks the workspace context', () => {
  for (const catalog of [
    {},
    sessionCatalog({ 'session-a': { id: 'session-other', retainedBy: { mainView: 1 } } }),
    sessionCatalog({ 'session-a': { id: 'session-a', retainedBy: { mainView: -1 } } }),
    sessionCatalog({ 'session-a': { id: 'session-a', retainedBy: { mainView: '1' } } }),
  ]) {
    assert.equal(createWorkspaceContextSnapshot({
      currentSessionId: resolveMainViewSessionId(catalog), workspaceItems: [], generation: 1,
    }).status, 'blocked')
  }
})

test('projects one detached frozen workspace generation without paths or stale mutable input', () => {
  const source = [{
    workspaceId: 'workspace-a',
    sessionIds: ['session-a'],
    cwd: 'D:\\must-not-cross-the-client-bridge',
  }]
  const snapshot = createWorkspaceContextSnapshot({
    currentSessionId: 'session-a',
    workspaceItems: source,
    generation: 4,
  })
  source[0].sessionIds[0] = 'session-mutated'

  assert.deepEqual(snapshot, {
    status: 'ready',
    reasonCode: null,
    generation: 4,
    currentSessionId: 'session-a',
    workspaceItems: [{ workspaceId: 'workspace-a', sessionIds: ['session-a'] }],
  })
  assert.equal(Object.isFrozen(snapshot), true)
  assert.equal(Object.isFrozen(snapshot.workspaceItems), true)
  assert.equal(Object.isFrozen(snapshot.workspaceItems[0].sessionIds), true)
  assert.equal(JSON.stringify(snapshot).includes('must-not-cross'), false)
})

test('renders pending or unbound instead of resolving a previous workspace generation', () => {
  const oldGeneration = createWorkspaceContextSnapshot({
    currentSessionId: 'session-a',
    workspaceItems: [{ workspaceId: 'workspace-a', sessionIds: ['session-a'] }],
    generation: 2,
  })
  assert.deepEqual(resolveWorkspaceBinding({
    context: oldGeneration,
    sessionId: 'session-b',
    visible: true,
  }), {
    status: 'pending',
    reasonCode: 'workspace-generation-not-current',
    workspaceId: null,
    generation: 2,
  })

  const currentGeneration = createWorkspaceContextSnapshot({
    currentSessionId: 'session-b',
    workspaceItems: [{ workspaceId: 'workspace-a', sessionIds: ['session-a'] }],
    generation: 3,
  })
  assert.deepEqual(resolveWorkspaceBinding({
    context: currentGeneration,
    sessionId: 'session-b',
    visible: true,
  }), {
    status: 'unbound',
    reasonCode: 'workspace-not-resolved',
    workspaceId: null,
    generation: 3,
  })
})

test('blocks malformed workspace hook payloads instead of guessing a project', () => {
  const snapshot = createWorkspaceContextSnapshot({
    currentSessionId: 'session-a',
    workspaceItems: [{ workspaceId: 'workspace-a', sessionIds: 'session-a' }],
    generation: 1,
  })
  assert.equal(snapshot.status, 'blocked')
  assert.equal(snapshot.reasonCode, 'workspace-context-invalid')
  assert.equal(resolveWorkspaceBinding({ context: snapshot, sessionId: 'session-a', visible: true }).status, 'blocked')
})
