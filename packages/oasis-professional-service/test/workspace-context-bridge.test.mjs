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
