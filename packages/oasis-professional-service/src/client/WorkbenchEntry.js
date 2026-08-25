import { createElement } from 'react'

import { resolveWorkspaceId } from './project-resolution.js'

export function WorkbenchEntry({ sessionId, store, focusTargets, useWorkspaces }) {
  const workspaceItems = useWorkspaces((snapshot) => snapshot.items)
  const workspaceId = resolveWorkspaceId(sessionId, workspaceItems)
  let mountedTarget = null

  function registerFocusTarget(node) {
    if (workspaceId === null) return
    if (node === null) {
      if (mountedTarget !== null && focusTargets.get(workspaceId) === mountedTarget) {
        focusTargets.delete(workspaceId)
      }
      mountedTarget = null
      return
    }
    mountedTarget = node
    focusTargets.set(workspaceId, node)
  }

  function openWorkbench(event) {
    if (workspaceId === null) return
    store.syncWorkspaces(workspaceItems)
    focusTargets.set(workspaceId, event.currentTarget)
    store.openPanel(workspaceId)
  }

  return createElement('button', {
    type: 'button',
    ref: registerFocusTarget,
    'data-testid': 'oasis-workbench-entry',
    disabled: workspaceId === null,
    title: workspaceId === null ? '当前会话尚未关联项目' : '打开技术研发与中国发明专利工作台',
    'aria-label': workspaceId === null ? '当前会话尚未关联项目' : '打开技术研发与中国发明专利工作台',
    onClick: openWorkbench,
    style: {
      border: '1px solid var(--dsw-alias-border-l2, #d9d9dc)',
      borderRadius: 8,
      background: 'var(--dsw-alias-bg-base, #fff)',
      color: 'var(--dsw-alias-text-primary, #202123)',
      padding: '5px 9px',
      fontSize: 12,
      cursor: workspaceId === null ? 'not-allowed' : 'pointer',
      opacity: workspaceId === null ? 0.5 : 1,
    },
  }, '研发 / 专利')
}
