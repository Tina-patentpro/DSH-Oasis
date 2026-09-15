import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeNativeComposerInput } from '../src/client/native-composer-input.js'
import { createConversationDraftBridge } from '../src/client/conversation-draft-bridge.js'

function fixture(patch = {}) {
  let input = { draft: '', draftRev: 0, phase: 'plain', attachmentIds: [], occurrences: [], ...patch }
  let sessionId = 'session-a'
  const writes = []
  const bridge = createConversationDraftBridge(() => ({
    status: 'ready', currentSessionId: sessionId,
    workspaceItems: [{ workspaceId: 'workspace-a', sessionIds: ['session-a'] }],
  }))
  const release = bridge.register({
    sessionId: 'session-a', workspaceId: 'workspace-a',
    read: () => normalizeNativeComposerInput(input),
    inputActions: { setDraft: text => writes.push(text), submit: () => assert.fail('must not submit') },
  })
  return { bridge, writes, release, input: () => input,
    update: patch => { input = { ...input, ...patch } },
    switchSession: () => { sessionId = 'session-b' },
  }
}
const artifact = { workspaceId: 'workspace-a', text: 'Synthetic reviewed artifact; not a model request.' }

test('empty native attachment state prepares text once without sending or mutating input', () => {
  const f = fixture()
  const original = structuredClone(f.input())
  assert.equal(f.bridge.unavailableReason('workspace-a'), null)
  const target = f.bridge.capture('workspace-a')
  f.bridge.insert(target, artifact)
  assert.deepEqual(f.writes, [artifact.text])
  assert.deepEqual(f.input(), original)
  assert.throws(() => f.bridge.insert(target, artifact))
  assert.equal(f.writes.length, 1)
})

for (const [name, patch] of [
  ['missing attachments', { attachmentIds: undefined, imageIds: [] }],
  ['null attachments', { attachmentIds: null, imageIds: [] }],
  ['string attachments', { attachmentIds: '', imageIds: [] }],
  ['array-like attachments', { attachmentIds: { length: 0 }, imageIds: [] }],
  ['existing attachment with empty legacy field', { attachmentIds: ['file-a'], imageIds: [] }],
  ['missing references', { occurrences: undefined, imageIds: [] }],
  ['string references', { occurrences: '', imageIds: [] }],
  ['array-like references', { occurrences: { length: 0 }, imageIds: [] }],
  ['existing references', { occurrences: [{ id: 'ref-a' }], imageIds: [] }],
  ['missing revision', { draftRev: undefined, imageIds: [] }],
  ['negative revision', { draftRev: -1, imageIds: [] }],
  ['unsafe revision', { draftRev: Number.MAX_SAFE_INTEGER + 1, imageIds: [] }],
  ['nonempty draft', { draft: 'User text', imageIds: [] }],
  ['submitting phase', { phase: 'submitting', imageIds: [] }],
]) test(`native normalization blocks ${name}`, () => {
  const f = fixture(patch)
  assert.notEqual(f.bridge.unavailableReason('workspace-a'), null)
  assert.throws(() => f.bridge.capture('workspace-a'))
  assert.deepEqual(f.writes, [])
})

for (const [name, change] of [
  ['draft revision', f => f.update({ draftRev: 1 })],
  ['user text', f => f.update({ draft: 'Late text' })],
  ['late attachment', f => f.update({ attachmentIds: ['late-file'] })],
  ['late reference', f => f.update({ occurrences: [{ id: 'late-ref' }] })],
  ['active session', f => f.switchSession()],
  ['released input', f => f.release()],
]) test(`native adaptation preserves the late ${name} guard`, () => {
  const f = fixture()
  const target = f.bridge.capture('workspace-a')
  change(f)
  assert.throws(() => f.bridge.insert(target, artifact))
  assert.deepEqual(f.writes, [])
})

test('native adaptation does not accept an artifact from a different workspace', () => {
  const f = fixture()
  const target = f.bridge.capture('workspace-a')
  assert.throws(() => f.bridge.insert(target, { ...artifact, workspaceId: 'workspace-b' }))
  assert.deepEqual(f.writes, [])
})
