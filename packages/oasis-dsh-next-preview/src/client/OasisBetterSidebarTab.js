import { createElement, useSyncExternalStore } from 'react'

import { OasisWorkbenchSurface } from './OasisWorkbenchSurface.js'
import { OASIS_BETTER_SIDEBAR_TAB_ID } from './panel-host-coordinator.js'
import { resolveWorkspaceBinding } from './WorkspaceContextBridge.js'

function EmbeddedStatus({ status, reasonCode }) {
  const messages = {
    pending: '正在关联当前 DSH 项目…',
    unbound: '当前会话尚未关联唯一的 DSH 项目。请先在中栏切换到一个有效项目。',
    blocked: '绿洲工作台已阻断：项目上下文或侧栏宿主不可安全使用。',
  }
  return createElement('section', {
    role: status === 'blocked' ? 'alert' : 'status',
    'data-oasis-embedded-state': status,
    'data-oasis-embedded-reason': reasonCode ?? undefined,
    style: {
      height: '100%',
      minHeight: 0,
      padding: 20,
      display: 'grid',
      alignContent: 'start',
      gap: 8,
      background: 'var(--dsw-alias-bg-base, #fff)',
      color: 'var(--dsw-alias-text-primary, #202123)',
    },
  },
  createElement('strong', null, '绿洲专业工作台'),
  createElement('span', {
    style: { color: 'var(--dsw-alias-text-secondary, #6b7280)', fontSize: 13, lineHeight: 1.5 },
  }, messages[status] ?? messages.blocked))
}

export function OasisBetterSidebarTab({
  scope,
  markdownRenderer,
  visible,
  coordinator,
  store,
  focusTargets,
  layoutAdapter,
}) {
  const hostSnapshot = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.getSnapshot,
    coordinator.getSnapshot,
  )
  const sessionId = scope?.sessionId
  if (hostSnapshot.mode !== 'better-sidebar') {
    const status = hostSnapshot.mode === 'blocked' ? 'blocked' : 'pending'
    return createElement(EmbeddedStatus, { status, reasonCode: hostSnapshot.reasonCode })
  }

  const binding = resolveWorkspaceBinding({
    context: hostSnapshot.workspaceContext,
    sessionId,
    visible: visible === true,
  })
  if (binding.status !== 'ready') {
    return createElement(EmbeddedStatus, {
      status: binding.status,
      reasonCode: binding.reasonCode,
    })
  }

  return createElement(OasisWorkbenchSurface, {
    markdownRenderer,
    coordinator,
    store,
    focusTargets,
    layoutAdapter,
    workspaceId: binding.workspaceId,
    workspaceItems: hostSnapshot.workspaceContext.workspaceItems,
    hostMode: 'embedded',
    visible: visible === true,
  })
}

export function createOasisBetterSidebarDescriptor({
  coordinator,
  markdownRenderer,
  store,
  focusTargets,
  layoutAdapter,
}) {
  return Object.freeze({
    id: OASIS_BETTER_SIDEBAR_TAB_ID,
    title: '绿洲专业工作台',
    order: 60,
    single: true,
    component: (props) => createElement(OasisBetterSidebarTab, {
      ...props,
      markdownRenderer,
      coordinator,
      store,
      focusTargets,
      layoutAdapter,
    }),
  })
}
