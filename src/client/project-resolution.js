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
