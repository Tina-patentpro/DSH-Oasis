import test from 'node:test'
import assert from 'node:assert/strict'

const module = await import('../../patches/dsh-0.2.0-rc.2/draft-checkpoint.mjs').catch(e => {
  if (e.code === 'ERR_MODULE_NOT_FOUND') return {}
  throw e
})
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
function fixture({ delayed = false, writeFailure = false, workspace = 'w' } = {}) {
  assert.equal(typeof module.bindDraftCheckpoint, 'function', 'native structured checkpoint is missing')
  const changes = new Set(), notices = [], stored = new Map(), markers = new Map(), gate = deferred()
  let input = { draft: '', draftRev: 0, phase: 'plain', occurrences: [], attachmentIds: [] }, owner = workspace
  const attachments = new Map(), restored = [], releases = []
  const record = { schemaVersion: 1, workspaceId: 'w', sessionId: 's', generation: 'old', draft: 'hello @a.md ',
    occurrences: [{ occurrenceId: 1, source: 'file', ref: 'a.md', offset: 6, length: 5, label: 'a.md', clipboardText: '@a.md' }],
    attachments: [{ kind: 'image', file: new File(['image-bytes'], 'public.png', { type: 'image/png' }) }] }
  const key = JSON.stringify(['w','s']); stored.set(key, record); markers.set(key, 'old')
  const update = patch => { input = { ...input, ...patch, draftRev: patch.draftRev ?? input.draftRev + 1 }; for (const fn of changes) fn() }
  const shell = { state: { getSnapshot: () => input, subscribe(fn) { changes.add(fn); return () => changes.delete(fn) } },
    notify: (_level, message) => notices.push(message),
    restoreCheckpoint(draft, occurrences, ids, rev) { if (input.draftRev !== rev) return false; restored.push({ draft, occurrences, ids }); update({ draft, occurrences, attachmentIds: ids }); return true } }
  const conversation = { resolveDraftAttachments: ids => ids.map(id => attachments.get(id)).filter(Boolean),
    restoreCheckpointAttachments(records) { return records.map((r,i) => { const id = 'restored-'+i; attachments.set(id, { ...r, id }); return id }) },
    releaseDraftAttachment(id) { releases.push(id); attachments.delete(id) },
    createDrafts() { assert.fail('restoring must not upload') } }
  const store = { async get(k) { if (delayed) await gate.promise; return structuredClone(stored.get(k)) },
    async put(k,v) { if (writeFailure) throw Error('quota'); stored.set(k, structuredClone(v)) } }
  const fences = { get: k => markers.get(k), set: (k,v) => markers.set(k,v) }
  const handle = module.bindDraftCheckpoint({ sessionId: 's', workspaceId: 'w', shell, conversation,
    currentWorkspace: () => owner, store, fences })
  return { handle, input: () => input, update, notices, stored, markers, key, gate, record, attachments, restored, releases,
    move: id => { owner = id }, fences,
    reopen() { handle.dispose(); input = { ...input, draftRev: 0, attachmentIds: [], occurrences: [] }; return module.bindDraftCheckpoint({
      sessionId: 's', workspaceId: 'w', shell, conversation, currentWorkspace: () => owner, store, fences,
    }) } }
}

test('cold checkpoint restores exact text, structured references and File bytes without upload', async () => {
  const f = fixture(); await f.handle.ready
  assert.equal(f.input().draft, 'hello @a.md '); assert.equal(f.input().occurrences[0].ref, 'a.md')
  assert.equal(await f.attachments.get('restored-0').file.text(), 'image-bytes')
  assert.equal(f.restored.length, 1); f.handle.dispose()
})
test('asynchronous recovery never overwrites a user edit and retains the old checkpoint', async () => {
  const f = fixture({ delayed: true }); f.update({ draft: 'late user text' }); f.gate.resolve(); await f.handle.ready
  assert.equal(f.input().draft, 'late user text'); assert.equal(f.restored.length, 0)
  assert.equal(f.stored.get(f.key).generation, 'old'); assert.ok(f.notices.length); f.handle.dispose()
})
test('foreign workspace cannot restore or checkpoint another workspace attachments', async () => {
  const f = fixture({ delayed: true }); f.move('foreign'); f.gate.resolve(); await f.handle.ready
  assert.equal(f.restored.length, 0); assert.equal(f.stored.get(f.key).generation, 'old'); f.handle.dispose()
})
test('removed attachments and cleared references persist as an empty checkpoint', async () => {
  const f = fixture(); await f.handle.ready
  f.update({ draft: '', occurrences: [], attachmentIds: [] }); await f.handle.flush()
  const stored = f.stored.get(f.key); assert.equal(stored.draft, ''); assert.deepEqual(stored.attachments, [])
  assert.deepEqual(stored.occurrences, []); assert.equal(f.markers.get(f.key), stored.generation); f.handle.dispose()
})
test('quota failure invalidates the old checkpoint fence and shows a notice', async () => {
  const f = fixture({ writeFailure: true }); await f.handle.ready
  f.update({ draft: 'new draft' }); await f.handle.flush()
  assert.notEqual(f.markers.get(f.key), f.stored.get(f.key).generation); assert.ok(f.notices.length); f.handle.dispose()
})
test('persisted generation mismatch is refused before creating any attachment objects', async () => {
  const f = fixture({ delayed: true }); f.markers.set(f.key, 'uncommitted'); f.gate.resolve(); await f.handle.ready
  assert.equal(f.restored.length, 0); assert.equal(f.attachments.size, 0); assert.ok(f.notices.length); f.handle.dispose()
})
test('malformed occurrence cannot silently change the clipboard projection', async () => {
  const f = fixture({ delayed: true }); f.record.occurrences[0].offset = 0; f.gate.resolve(); await f.handle.ready
  assert.equal(f.restored.length, 0); assert.equal(f.attachments.size, 0); assert.ok(f.notices.length); f.handle.dispose()
})
test('disposed session drops a late load without restoring or writing', async () => {
  const f = fixture({ delayed: true }); f.handle.dispose(); f.gate.resolve(); await f.handle.ready
  assert.equal(f.restored.length, 0); assert.equal(f.stored.get(f.key).generation, 'old')
})

test('claimed/submitting state invalidates a plain checkpoint without inventing a resumed send', async () => {
  const f = fixture(); await f.handle.ready
  f.update({ phase: 'submitting' }); await f.handle.flush()
  assert.notEqual(f.markers.get(f.key), f.stored.get(f.key).generation)
  assert.equal(f.stored.get(f.key).draft, 'hello @a.md '); f.handle.dispose()
})
test('attachment changes are captured even when the native editor revision does not change', async () => {
  const f = fixture(); await f.handle.ready
  const rev = f.input().draftRev
  f.update({ attachmentIds: [], draftRev: rev }); await f.handle.flush()
  assert.equal(f.input().draftRev, rev); assert.deepEqual(f.stored.get(f.key).attachments, []); f.handle.dispose()
})
test('a generation failure is reported instead of throwing out of a native state subscriber', async t => {
  const f = fixture(); await f.handle.ready
  t.mock.method(crypto, 'randomUUID', () => { throw Error('random unavailable') })
  assert.doesNotThrow(() => f.update({ draft: 'keep live draft' }))
  await f.handle.flush(); assert.ok(f.notices.length); f.handle.dispose()
})

test('checkpoint bounds retain exactly 32 MiB but reject the next byte and more than 16 attachments', () => {
  assert.equal(typeof module.validateDraftCheckpoint, 'function')
  const base = { schemaVersion: 1, workspaceId: 'w', sessionId: 's', generation: 'v', draft: '', occurrences: [], attachments: [] }
  // JSON [] consumes two bytes. The zero-filled Blob stays bounded in this test.
  const exact = { ...base, attachments: [{ kind: 'file', file: new File([new Uint8Array(32 * 1024 * 1024 - 2)], 'public.bin') }] }
  assert.equal(module.validateDraftCheckpoint(exact,'w','s'), exact)
  assert.throws(() => module.validateDraftCheckpoint({ ...base, attachments: [{ kind: 'file', file: new File([new Uint8Array(32 * 1024 * 1024 - 1)], 'public.bin') }] },'w','s'))
  const files = Array.from({ length: 16 }, () => ({ kind: 'file', file: new File([], 'empty.bin') }))
  assert.doesNotThrow(() => module.validateDraftCheckpoint({ ...base, attachments: files },'w','s'))
  assert.throws(() => module.validateDraftCheckpoint({ ...base, attachments: [...files, files[0]] },'w','s'))
})

test('F-DR-A02: UUID failure after attachment-only removal cannot resurrect the committed image on cold bind', async t => {
  const f = fixture(); await f.handle.ready
  const original = crypto.randomUUID.bind(crypto); let failing = true
  t.mock.method(crypto,'randomUUID',() => { if (failing) throw Error('UUID unavailable'); return original() })
  f.update({ attachmentIds: [], draftRev: f.input().draftRev }); await f.handle.flush()
  assert.equal(f.input().attachmentIds.length,0); failing = false
  const next = f.reopen(); await next.ready
  assert.equal(f.input().attachmentIds.length,0,'removed image must not resurrect')
  assert.ok(f.notices.length); next.dispose()
})
test('a failed fence write falls back to an unusable IDB record before a later cold bind', async () => {
  const f = fixture(); await f.handle.ready
  const write = f.fences.set; f.fences.set = () => { throw Error('fence quota') }
  f.update({ attachmentIds: [], draftRev: f.input().draftRev }); await f.handle.flush()
  f.fences.set = write
  const next = f.reopen(); await next.ready
  assert.equal(f.input().attachmentIds.length,0,'writable IDB must invalidate stale recovery even if the fence store fails')
  next.dispose()
})
