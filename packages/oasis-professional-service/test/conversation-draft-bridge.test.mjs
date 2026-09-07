import test from 'node:test'
import assert from 'node:assert/strict'
import * as client from '../src/client.js'

test('public composer receives a fixed text draft only, without sending or overwriting user text', () => {
  assert.equal(typeof client.createConversationDraftBridge, 'function')
  let currentSessionId = 'session-a'
  const context = () => ({ status: 'ready', currentSessionId, workspaceItems: [{ workspaceId: 'workspace-a', sessionIds: ['session-a'] }] })
  const bridge = client.createConversationDraftBridge(context)
  assert.equal(typeof bridge.subscribe, 'function')
  let notifications = 0
  const unsubscribe = bridge.subscribe(() => { notifications += 1 })
  let input = { draft: '', draftRev: 0, phase: 'plain', occurrences: [], imageIds: [] }
  const calls = []
  const inputActions = { setDraft(text) { calls.push(text); input = { ...input, draft: text, draftRev: 1 } }, submit() { assert.fail('must not send') } }
  const release = bridge.register({ workspaceId: 'workspace-a', sessionId: 'session-a', read: () => input, inputActions })
  assert.equal(typeof bridge.unavailableReason, 'function')
  assert.equal(bridge.unavailableReason('workspace-a'), null)
  const target = bridge.capture('workspace-a')
  bridge.insert(target, { workspaceId: 'workspace-a', text: '固定审核正文' })
  assert.deepEqual(calls, ['固定审核正文'])
  assert.throws(() => bridge.capture('workspace-a'), /草稿/)
  assert.match(bridge.unavailableReason('workspace-a'), /草稿/)
  input = { ...input, draft: '', draftRev: 2 }
  const previous = bridge.capture('workspace-a')
  currentSessionId = 'session-b'
  assert.throws(() => bridge.insert(previous, { workspaceId: 'workspace-a', text: '不要写入新会话' }), /会话/)
  currentSessionId = 'session-a'
  input = { ...input, draft: '用户晚到输入', draftRev: 3 }
  assert.throws(() => bridge.insert(previous, { workspaceId: 'workspace-a', text: '不要覆盖' }), /草稿/)
  release()
  assert.throws(() => bridge.capture('workspace-a'), /不可用/)
  assert.equal(calls.length, 1)
  assert.ok(notifications >= 2)
  unsubscribe()
})
