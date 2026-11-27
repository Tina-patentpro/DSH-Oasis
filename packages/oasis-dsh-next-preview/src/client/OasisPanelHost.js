import { createElement } from 'react'

import { OasisWorkbenchSurface } from './OasisWorkbenchSurface.js'
import { resolveWorkspaceId } from './project-resolution.js'

export { createPanelActions } from './OasisWorkbenchSurface.js'

export function OasisPanelHost({
  store,
  focusTargets,
  layoutAdapter,
  useSessions,
  useWorkspaces,
}) {
  const currentSessionId = useSessions((snapshot) => snapshot.current)
  const workspaceItems = useWorkspaces((snapshot) => snapshot.items)
  const workspaceId = resolveWorkspaceId(currentSessionId, workspaceItems)

  return createElement(OasisWorkbenchSurface, {
    store,
    focusTargets,
    layoutAdapter,
    workspaceId,
    workspaceItems,
    hostMode: 'standalone',
    visible: true,
  })
}
