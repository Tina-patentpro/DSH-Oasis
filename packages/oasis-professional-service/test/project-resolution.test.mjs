import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveWorkspaceId } from '../src/client/project-resolution.js'

const workspaces = [
  { workspaceId: 'workspace-a', path: 'D:/same', sessionIds: ['session-a1', 'session-a2'] },
  { workspaceId: 'workspace-b', path: 'D:/same', sessionIds: ['session-b1'] },
]

test('maps the current session only through Workspace sessionIds membership', () => {
  assert.equal(resolveWorkspaceId('session-a2', workspaces), 'workspace-a')
  assert.equal(resolveWorkspaceId('session-b1', workspaces), 'workspace-b')
})

test('does not fall back to matching cwd or path', () => {
  assert.equal(resolveWorkspaceId('missing-session', workspaces, { cwd: 'D:/same' }), null)
  assert.equal(resolveWorkspaceId(undefined, workspaces, { cwd: 'D:/same' }), null)
})

test('fails closed for ambiguous or malformed Workspace membership', () => {
  const ambiguous = [
    { workspaceId: 'workspace-a', sessionIds: ['duplicate'] },
    { workspaceId: 'workspace-b', sessionIds: ['duplicate'] },
  ]
  assert.equal(resolveWorkspaceId('duplicate', ambiguous), null)
  assert.equal(resolveWorkspaceId('session-a1', [{ workspaceId: 'bad', sessionIds: null }]), null)
})
