// DSH 0.2 publishes main-view ownership in the public Session catalog.
// Multiple owners or malformed catalog entries must never pick a project.
export function resolveMainViewSessionId(snapshot) {
  const byId = snapshot?.byId
  if (byId === null || typeof byId !== 'object' || Array.isArray(byId)) return undefined
  let currentSessionId = null
  for (const [id, row] of Object.entries(byId)) {
    if (id.length === 0 || row?.id !== id) return undefined
    const retainedBy = row.retainedBy
    if (retainedBy === null || typeof retainedBy !== 'object' || Array.isArray(retainedBy)) return undefined
    if (Object.values(retainedBy).some((count) => !Number.isSafeInteger(count) || count < 0)) return undefined
    if ((retainedBy.mainView ?? 0) === 0) continue
    if (currentSessionId !== null) return undefined
    currentSessionId = id
  }
  return currentSessionId
}

export function resolveWorkspaceId(currentSessionId, workspaceItems) {
  if (typeof currentSessionId !== 'string' || currentSessionId.length === 0) return null
  if (!Array.isArray(workspaceItems)) return null

  const matches = workspaceItems.filter((workspace) => (
    typeof workspace?.workspaceId === 'string'
    && Array.isArray(workspace.sessionIds)
    && workspace.sessionIds.includes(currentSessionId)
  ))

  return matches.length === 1 ? matches[0].workspaceId : null
}
