import { resolveWorkspaceId } from './project-resolution.js'

export function createConversationDraftBridge(getContext) {
  const entries = new Map()
  const consumed = new WeakSet()
  const listeners = new Set()
  let revision = 0
  function notify() { revision += 1; for (const listener of listeners) listener() }
  function current(workspaceId) {
    const context = getContext()
    if (context?.status !== 'ready' || resolveWorkspaceId(context.currentSessionId, context.workspaceItems) !== workspaceId) {
      throw new Error('当前会话与项目已变化')
    }
    const entry = entries.get(context.currentSessionId)
    if (!entry || entry.workspaceId !== workspaceId) throw new Error('当前对话输入接口不可用')
    return entry
  }
  function empty(entry) {
    const input = entry.read()
    if (input?.phase !== 'plain' || input.draft !== '' || input.imageIds?.length !== 0 || input.occurrences?.length !== 0) {
      throw new Error('当前对话已有草稿或正在提交；不会覆盖')
    }
    return input
  }
  return Object.freeze({
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    getSnapshot() { return revision },
    notify,
    unavailableReason(workspaceId) {
      try { empty(current(workspaceId)); return null } catch (error) { return error.message }
    },
    register(entry) {
      if (typeof entry?.inputActions?.setDraft !== 'function' || typeof entry.read !== 'function') return () => {}
      entries.set(entry.sessionId, entry)
      notify()
      return () => { if (entries.get(entry.sessionId) === entry) { entries.delete(entry.sessionId); notify() } }
    },
    capture(workspaceId) {
      const entry = current(workspaceId)
      return Object.freeze({ entry, workspaceId, draftRev: empty(entry).draftRev })
    },
    insert(target, result) {
      if (consumed.has(target)) throw new Error('此草稿已准备，不会重复插入')
      const entry = current(target.workspaceId)
      if (entry !== target.entry) throw new Error('会话输入接口已切换')
      if (empty(entry).draftRev !== target.draftRev) throw new Error('对话草稿已变化')
      if (result.workspaceId !== target.workspaceId || typeof result.text !== 'string' || !result.text || result.text.length > 150000) {
        throw new Error('结果资料与目标项目不匹配')
      }
      consumed.add(target)
      entry.inputActions.setDraft(result.text)
    },
    dispose() { entries.clear(); listeners.clear() },
  })
}
