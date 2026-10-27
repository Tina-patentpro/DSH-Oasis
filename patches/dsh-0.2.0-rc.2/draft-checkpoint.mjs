// Generic native composer checkpoint. No business data, receipt reuse, upload or submit.
export const draftCheckpointRevision = 'draft-checkpoint-1'
const MAX_BYTES = 32 * 1024 * 1024
const MAX_ATTACHMENTS = 16

export function validateDraftCheckpoint(value, workspaceId, sessionId) {
  if (!value || value.schemaVersion !== 1 || value.workspaceId !== workspaceId || value.sessionId !== sessionId
    || typeof value.generation !== 'string' || !value.generation || typeof value.draft !== 'string' || value.draft.length > 500000
    || !Array.isArray(value.occurrences) || value.occurrences.length > 1000
    || !Array.isArray(value.attachments) || value.attachments.length > MAX_ATTACHMENTS) throw Error('invalid draft checkpoint')
  let cursor = 0, bytes = new TextEncoder().encode(value.draft + JSON.stringify(value.occurrences)).byteLength
  if (bytes > MAX_BYTES) throw Error('draft checkpoint exceeds 32 MiB')
  for (const o of value.occurrences) {
    if (!o || !Number.isSafeInteger(o.offset) || !Number.isSafeInteger(o.length) || o.offset < cursor || o.length < 1
      || typeof o.source !== 'string' || !o.source || typeof o.ref !== 'string' || !o.ref
      || typeof o.label !== 'string' || typeof o.clipboardText !== 'string' || o.clipboardText.length !== o.length
      || value.draft.slice(o.offset, o.offset + o.length) !== o.clipboardText) throw Error('invalid draft reference')
    cursor = o.offset + o.length
  }
  for (const a of value.attachments) {
    if (!a || !['file','image'].includes(a.kind) || !(a.file instanceof Blob) || typeof a.file.name !== 'string'
      || !Number.isFinite(a.file.lastModified) || (a.kind === 'image' && !['image/png','image/jpeg','image/gif','image/webp'].includes(a.file.type))) throw Error('invalid draft attachment')
    bytes += a.file.size
    if (bytes > MAX_BYTES) throw Error('draft checkpoint exceeds 32 MiB')
  }
  return value
}

export function createDraftCheckpointStore(indexedDB = globalThis.indexedDB) {
  async function transaction(mode, operation) {
    if (!indexedDB) throw Error('IndexedDB unavailable')
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('dsh.native-draft-checkpoints', 1)
      let rejected = false
      request.onupgradeneeded = () => request.result.createObjectStore('drafts')
      request.onblocked = () => { rejected = true; reject(Error('draft database blocked')) }
      request.onerror = () => reject(request.error)
      request.onsuccess = () => { if (rejected) request.result.close(); else resolve(request.result) }
    })
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('drafts', mode), request = operation(tx.objectStore('drafts'))
        tx.oncomplete = () => resolve(request.result)
        tx.onerror = tx.onabort = () => reject(tx.error ?? Error('draft transaction failed'))
      })
    } finally { db.close() }
  }
  return { get: key => transaction('readonly', table => table.get(key)),
    put: (key, value) => transaction('readwrite', table => table.put(value, key)) }
}

export function bindDraftCheckpoint({ sessionId, workspaceId, shell, conversation, currentWorkspace,
  store = createDraftCheckpointStore(), fences = {
    get: key => localStorage.getItem('dsh.native-draft-fence.' + key),
    set: (key, value) => localStorage.setItem('dsh.native-draft-fence.' + key, value),
  } }) {
  const key = JSON.stringify([workspaceId, sessionId]), initial = shell.state.getSnapshot()
  let disposed = false, loading = true, conflicted = false, restoring = false, changed = false, queue = Promise.resolve(), last
  const ownerMatches = () => !disposed && currentWorkspace() === workspaceId
  const notice = message => { if (!disposed) shell.notify('error', message) }
  const fingerprint = input => JSON.stringify([input.phase, input.draftRev, input.draft, input.occurrences, input.attachmentIds])
  function persist() {
    if (!ownerMatches() || loading || conflicted || restoring) return
    const input = shell.state.getSnapshot(), fingerprintNow = fingerprint(input)
    if (fingerprintNow === last) return
    last = fingerprintNow
    // A synchronous fence changes BEFORE the asynchronous transaction. On write
    // failure/crash the older stored checkpoint cannot silently regain validity.
    let fenceInvalidated = false
    try {
      // Invalidate the committed generation BEFORE any fallible UUID/clone work.
      // Empty is reserved: a valid stored generation is always nonempty.
      fences.set(key, '')
      fenceInvalidated = true
      const generation = crypto.randomUUID()
      fences.set(key, generation)
      // In-flight/claimed admission is not a resumable plain draft. Invalidate
      // the previous checkpoint without inventing a resumed command or send.
      if (input.phase !== 'plain') return
      const resolved = conversation.resolveDraftAttachments(input.attachmentIds)
      if (resolved.length !== input.attachmentIds.length) throw Error('attachment unavailable')
      const record = validateDraftCheckpoint({ schemaVersion: 1, workspaceId, sessionId, generation,
        draft: input.draft, occurrences: structuredClone(input.occurrences),
        attachments: resolved.map(a => ({ kind: a.kind, file: a.file })) }, workspaceId, sessionId)
      queue = queue.then(() => store.put(key, record)).catch(() => notice('草稿附件变更未能保存；请保留原材料，重启恢复已暂停。'))
    } catch {
      conflicted = true
      if (!fenceInvalidated) {
        // A quota/permission failure in localStorage need not mean IDB is
        // unavailable. Serialize a tombstone after older writes so a stale
        // image cannot regain validity when the fence store becomes writable.
        queue = queue.then(() => store.put(key, { schemaVersion: 0 })).catch(() => {
          notice('草稿的两处恢复存储均无法更新，重启可能回到旧快照；请保留原材料。')
        })
      }
      notice('草稿附件变更未能保存；请保留原材料并核对恢复状态。')
    }
  }
  const unsubscribe = shell.state.subscribe(() => {
    if (restoring) return
    if (loading) { changed = true; return }
    persist()
  })
  const ready = (async () => {
    try {
      const saved = await store.get(key)
      if (!ownerMatches()) return
      if (!saved) { if (fences.get(key)) notice('附件恢复快照尚未提交；未推测或重新上传附件。'); return }
      validateDraftCheckpoint(saved, workspaceId, sessionId)
      if (fences.get(key) !== saved.generation) throw Error('uncommitted checkpoint')
      const input = shell.state.getSnapshot()
      if (changed || input.draftRev !== initial.draftRev || input.phase !== 'plain' || input.attachmentIds.length
        || input.occurrences.length || (input.draft !== '' && input.draft !== saved.draft)) {
        conflicted = true
        notice('当前草稿已变化，未覆盖；原附件恢复快照保留。')
        return
      }
      restoring = true
      const ids = conversation.restoreCheckpointAttachments(saved.attachments)
      try {
        if (!shell.restoreCheckpoint(saved.draft, saved.occurrences, ids, input.draftRev)) throw Error('draft changed')
      } catch (error) { for (const id of ids) conversation.releaseDraftAttachment(id); throw error }
      finally { restoring = false }
      last = fingerprint(shell.state.getSnapshot())
    } catch {
      conflicted = true
      notice('附件恢复快照不可用；未插入、推测归属或重新上传附件。')
    } finally {
      loading = false
      // Do not overwrite a historical checkpoint after a late load conflict.
      if (!conflicted && ownerMatches() && !last) persist()
    }
  })()
  return Object.freeze({ ready, async flush() { await ready; await queue },
    dispose() { disposed = true; unsubscribe() } })
}

const residentCheckpoints = new WeakMap()
export function bindResidentDraftCheckpoint(binding, shell, conversation, workspaces) {
  if (!binding || residentCheckpoints.has(binding) || !workspaces?.list) return
  residentCheckpoints.set(binding, true)
  binding.ctx.effect(() => {
    let handle, stopped = false
    const currentWorkspace = () => {
      const state = workspaces.list.getSnapshot()
      if (state.phase !== 'ready') return null
      const owners = state.items.filter(row => row.sessionIds?.includes(binding.sessionId))
      return owners.length === 1 ? owners[0].workspaceId : null
    }
    const start = () => {
      if (stopped || handle) return
      const workspaceId = currentWorkspace()
      if (workspaceId) handle = bindDraftCheckpoint({ sessionId: binding.sessionId, workspaceId,
        shell, conversation, currentWorkspace })
    }
    const off = workspaces.list.subscribe(start)
    start()
    return () => { stopped = true; off(); handle?.dispose(); residentCheckpoints.delete(binding) }
  }, 'native draft checkpoint')
}
