import { createElement, useSyncExternalStore } from 'react'

import { resolveWorkspaceId } from './project-resolution.js'
import { ConversationInputRegistration } from './ConversationInputRegistration.js'

const STANDALONE_HOST_SNAPSHOT = Object.freeze({ mode: 'standalone' })
const subscribeStandaloneHost = () => () => {}
const getStandaloneHostSnapshot = () => STANDALONE_HOST_SNAPSHOT

export function openStandaloneWorkbench({store,workspaceId}) {
  // Resolve the trusted Host mode before openPanel can enqueue a persisted action.
  if(store.websiteImportRemote===null||store.peekWorkspaceState?.(workspaceId)?.v340CatalogStatus==='ready')return store.openPanel(workspaceId)
  return store.loadV340Catalog(workspaceId).then(()=>store.openPanel(workspaceId))
}

function useLivePanelHostSnapshot(coordinator) {
  return useSyncExternalStore(
    coordinator === null ? subscribeStandaloneHost : coordinator.subscribe,
    coordinator === null ? getStandaloneHostSnapshot : coordinator.getSnapshot,
    coordinator === null ? getStandaloneHostSnapshot : coordinator.getSnapshot,
  )
}

export function WorkbenchEntry({
  sessionId,
  store,
  focusTargets,
  useWorkspaces,
  useInput,
  inputActions,
  coordinator = null,
  usePanelHostSnapshot = useLivePanelHostSnapshot,
}) {
  const workspaceItems = useWorkspaces((snapshot) => snapshot.items)
  const workspaceId = resolveWorkspaceId(sessionId, workspaceItems)
  const hostSnapshot = usePanelHostSnapshot(coordinator)
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
    if (
      coordinator?.getSnapshot?.().mode === 'better-sidebar'
      && !coordinator.getSnapshot().serviceFeatures?.includes('targetedOpen')
    ) return
    store.syncWorkspaces(workspaceItems)
    focusTargets.set(workspaceId, event.currentTarget)
    if (coordinator?.getSnapshot?.().mode === 'better-sidebar') {
      coordinator.openBetterSidebar(sessionId)
      return
    }
    if (coordinator && coordinator.getSnapshot().mode !== 'standalone') return
    void Promise.resolve(openStandaloneWorkbench({store,workspaceId})).catch(() => {})
  }

  const hostMode = hostSnapshot.mode
  const targetedOpenUnavailable = hostMode === 'better-sidebar'
    && !hostSnapshot.serviceFeatures?.includes('targetedOpen')
  const hostUnavailable = targetedOpenUnavailable || ['integrating', 'releasing', 'blocked'].includes(hostMode)
  const disabled = workspaceId === null || hostUnavailable
  const unavailableTitle = targetedOpenUnavailable
    ? '当前侧栏版本不支持按会话打开绿洲工作台'
    : hostMode === 'blocked'
      ? '侧栏宿主冲突，绿洲工作台已安全阻断'
      : '绿洲工作台正在切换侧栏宿主'

  return createElement('button', {
    type: 'button',
    ref: registerFocusTarget,
    'data-testid': 'oasis-workbench-entry',
    disabled,
    'data-oasis-host-mode': hostMode,
    'data-oasis-host-version': hostSnapshot.serviceVersion ?? undefined,
    title: workspaceId === null
      ? '当前会话尚未关联项目'
      : hostUnavailable ? unavailableTitle : '打开技术研发与中国发明专利工作台',
    'aria-label': workspaceId === null
      ? '当前会话尚未关联项目'
      : hostUnavailable ? unavailableTitle : '打开技术研发与中国发明专利工作台',
    onClick: openWorkbench,
    style: {
      border: '1px solid var(--dsw-alias-border-l2, #d9d9dc)',
      borderRadius: 8,
      background: 'var(--dsw-alias-bg-base, #fff)',
      color: 'var(--dsw-alias-label-primary, #202123)',
      padding: '5px 9px',
      fontSize: 12,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    },
  }, '研发 / 专利', createElement(ConversationInputRegistration, {
    bridge: store.conversationDrafts, workspaceId, sessionId, useInput, inputActions,
  }))
}
