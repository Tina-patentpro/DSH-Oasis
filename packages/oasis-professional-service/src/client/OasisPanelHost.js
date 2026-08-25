import { createElement, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'

import { PanelChrome } from './PanelChrome.js'
import { PanelPages } from './PanelPages.js'
import { resolveWorkspaceId } from './project-resolution.js'

const reducedMotionCss = `
  [data-oasis-panel] { transition: left 180ms ease, width 180ms ease; }
  @media (prefers-reduced-motion: reduce) { [data-oasis-panel] { transition: none; } }
`

export function OasisPanelHost({ store, focusTargets, layoutAdapter, useSessions, useWorkspaces }) {
  const currentSessionId = useSessions((snapshot) => snapshot.current)
  const workspaceItems = useWorkspaces((snapshot) => snapshot.items)
  const workspaceId = resolveWorkspaceId(currentSessionId, workspaceItems)
  const state = useSyncExternalStore(
    store.subscribe,
    () => store.peekWorkspaceState(workspaceId),
    () => store.peekWorkspaceState(workspaceId),
  )
  const panelRef = useRef(null)
  const titleRef = useRef(null)
  const layout = useSyncExternalStore(
    layoutAdapter.subscribe,
    layoutAdapter.getSnapshot,
    layoutAdapter.getSnapshot,
  )

  useEffect(() => {
    store.syncWorkspaces(workspaceItems)
    if (workspaceId !== null) void store.hydrateWorkspace(workspaceId)
  }, [store, workspaceId, workspaceItems])

  useLayoutEffect(() => {
    layoutAdapter.apply({
      requestedMode: workspaceId === null ? 'hidden' : state.panelMode,
      panelWidth: 360,
      panelElement: panelRef.current,
    })
  }, [layoutAdapter, state.panelMode, workspaceId])

  useEffect(() => {
    if (layout.effectiveMode !== 'hidden') titleRef.current?.focus()
  }, [layout.effectiveMode, workspaceId])

  const layoutBlocked = state.panelMode !== 'hidden'
    && layout.requestedMode === state.panelMode
    && layout.effectiveMode === 'hidden'
    && ['incompatible', 'conflict', 'faulted'].includes(layout.status)
  if (workspaceId === null || state.panelMode === 'hidden' || layoutBlocked) return null

  const effectiveMode = layout.requestedMode === state.panelMode ? layout.effectiveMode : state.panelMode
  const resolvedGeometry = effectiveMode === 'normal'
    ? { right: 0, width: 360 }
    : { left: layout.panelLeft ?? 72, right: 0 }

  function hidePanel() {
    if (['ready', 'saving'].includes(state.syncStatus)) {
      store.setPanelMode(workspaceId, 'hidden')
    } else {
      store.setLocalPanelMode(workspaceId, 'hidden')
    }
    focusTargets.get(workspaceId)?.focus?.()
  }

  return createElement('section', {
    ref: panelRef,
    'data-oasis-panel': true,
    'data-testid': 'oasis-panel',
    'data-mode': effectiveMode,
    'data-requested-mode': state.panelMode,
    'data-layout-status': layout.status,
    'data-workspace-id': workspaceId,
    'aria-label': '绿洲专业工作台',
    style: {
      position: 'fixed',
      top: 0,
      bottom: 0,
      zIndex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      overflow: 'hidden',
      borderLeft: '1px solid var(--dsw-alias-border-l2, #dedee1)',
      boxShadow: '-10px 0 28px rgba(0, 0, 0, 0.08)',
      background: 'var(--dsw-alias-bg-base, #fff)',
      color: 'var(--dsw-alias-text-primary, #202123)',
      ...resolvedGeometry,
    },
  },
  createElement('style', null, reducedMotionCss),
  createElement(PanelChrome, {
    state: { ...state, effectiveMode, layoutStatus: layout.status },
    titleRef,
    onActivatePage: (pageId) => store.activatePage(workspaceId, pageId),
    onClosePage: (pageId) => store.closePage(workspaceId, pageId),
    onCreatePage: () => store.createPage(workspaceId),
    onHide: hidePanel,
    onToggleExpanded: () => store.setPanelMode(
      workspaceId,
      state.panelMode === 'expanded' ? 'normal' : 'expanded',
    ),
  }),
  createElement(PanelPages, {
    state,
    onSelectWorkflow: (pageId, workflowId) => store.selectWorkflow(workspaceId, pageId, workflowId),
    onRenamePage: (pageId, title) => store.renamePage(workspaceId, pageId, title),
    onReload: () => store.reloadWorkspace(workspaceId),
  }))
}
