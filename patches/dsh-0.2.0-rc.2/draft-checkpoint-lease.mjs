// Public same-origin browser lease; no business payload, upload or transmission.
export function createLeasedDraftCheckpoint(bind) {
  return function bindWithLease(options) {
    const {workspaceId,sessionId,shell,currentWorkspace} = options
    const locks = Object.hasOwn(options,'leaseManager') ? options.leaseManager : globalThis.navigator?.locks
    const fingerprint = () => {
      const s = shell.state.getSnapshot()
      return JSON.stringify([s.phase,s.draftRev,s.draft,s.occurrences,s.attachmentIds])
    }
    const initial = fingerprint(), key = 'dsh.native-draft-checkpoint.' + JSON.stringify([workspaceId,sessionId])
    let stopped = false, handle, resolveReady, release
    const ready = new Promise(resolve => { resolveReady = resolve })
    const hold = new Promise(resolve => { release = resolve })
    const notice = message => { if (!stopped) { try { shell.notify('error',message) } catch {} } }
    const fail = () => notice('当前窗口未取得草稿恢复写入权；自动恢复已暂停，请保留原材料并在原窗口核对。')
    let request
    if (!locks || typeof locks.request !== 'function') { fail(); resolveReady(); request = Promise.resolve() }
    else request = Promise.resolve().then(() => locks.request(key,{mode:'exclusive',ifAvailable:true},async lock => {
      if (!lock) { fail(); resolveReady(); return }
      if (stopped || currentWorkspace() !== workspaceId || fingerprint() !== initial) { fail(); resolveReady(); return }
      try {
        handle = bind(options)
        await handle.ready
        resolveReady()
        await hold
        try { await handle.flush() }
        catch {
          // An uncertain drain must not admit another cooperating writer.
          // Destruction of the owning document lets the browser reclaim this lease.
          await new Promise(() => {})
        }
      } finally { handle?.dispose() }
    })).catch(() => { fail(); resolveReady() })
    const closed = request.then(() => { resolveReady() })
    return Object.freeze({ready,closed,
      async flush() { await ready; if (handle) await handle.flush() },
      dispose() { if (stopped) return; stopped = true; handle?.dispose(); release() },
    })
  }
}
