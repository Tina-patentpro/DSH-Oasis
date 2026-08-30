import { createElement, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'

import { PanelChrome } from './PanelChrome.js'
import { PanelPages } from './PanelPages.js'

const reducedMotionCss = `
  [data-oasis-panel] { transition: left 180ms ease, width 180ms ease; }
  @media (prefers-reduced-motion: reduce) { [data-oasis-panel] { transition: none; } }
  @media (max-width: 760px) {
    [data-oasis-panel] [data-workspace-layout] { grid-template-columns: minmax(0, 1fr) !important; }
  }
`

export function createPanelActions({
  store,
  workspaceId,
  focusTargets,
  confirmClose = (message) => globalThis.confirm?.(message) === true,
}) {
  return Object.freeze({
    async activatePage(pageId) {
      await store.flushWorkspace(workspaceId)
      store.activatePage(workspaceId, pageId)
    },
    async closePage(pageId) {
      const page = store.getWorkspaceState(workspaceId).pages.find((item) => item.pageId === pageId)
      if (!page) return false
      if (page.runOrder.length > 0 && !confirmClose(
        `任务“${page.title}”包含 ${page.runOrder.length} 个运行记录。确认关闭此任务页？`,
      )) return false
      await store.flushWorkspace(workspaceId)
      store.closePage(workspaceId, pageId)
      return true
    },
    async hidePanel() {
      await store.flushWorkspace(workspaceId)
      const current = store.getWorkspaceState(workspaceId)
      if (['ready', 'saving'].includes(current.syncStatus)) {
        store.setPanelMode(workspaceId, 'hidden')
      } else {
        store.setLocalPanelMode(workspaceId, 'hidden')
      }
      focusTargets.get(workspaceId)?.focus?.()
    },
  })
}

export async function ensureEmbeddedWorkspaceHidden({ store, workspaceId, workspaceItems }) {
  store.syncWorkspaces(workspaceItems)
  await Promise.all([
    store.hydrateWorkspace(workspaceId),
    store.loadWorkflowCatalog(workspaceId),
  ])
  const current = store.getWorkspaceState(workspaceId)
  if (current.panelMode === 'hidden') return true
  if (['ready', 'saving'].includes(current.syncStatus)) {
    store.setPanelMode(workspaceId, 'hidden')
    await store.flushWorkspace(workspaceId)
    return true
  }
  store.setLocalPanelMode(workspaceId, 'hidden')
  return false
}

async function hydrateSurface({ store, workspaceId, workspaceItems, hostMode }) {
  if (hostMode === 'embedded') {
    return ensureEmbeddedWorkspaceHidden({ store, workspaceId, workspaceItems })
  }
  store.syncWorkspaces(workspaceItems)
  await Promise.all([
    store.hydrateWorkspace(workspaceId),
    store.loadWorkflowCatalog(workspaceId),
  ])
  return true
}

function sectionStyle(hostMode, layout, effectiveMode) {
  if (hostMode === 'embedded') {
    return {
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: 0,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--dsw-alias-bg-base, #fff)',
      color: 'var(--dsw-alias-text-primary, #202123)',
    }
  }
  const resolvedGeometry = effectiveMode === 'normal'
    ? { right: 0, width: 360 }
    : { left: layout.panelLeft ?? 72, right: 0 }
  return {
    position: 'fixed',
    top: 0,
    bottom: 0,
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
    borderLeft: '1px solid var(--dsw-alias-border-l2, #dedee1)',
    boxShadow: '-10px 0 28px rgba(0, 0, 0, 0.08)',
    background: 'var(--dsw-alias-bg-base, #fff)',
    color: 'var(--dsw-alias-text-primary, #202123)',
    ...resolvedGeometry,
  }
}

export function OasisWorkbenchSurface({
  store,
  focusTargets,
  layoutAdapter,
  workspaceId,
  workspaceItems,
  hostMode = 'standalone',
  visible = true,
}) {
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
    if (workspaceId !== null) {
      void hydrateSurface({ store, workspaceId, workspaceItems, hostMode }).catch(() => {
        if (hostMode === 'embedded') {
          try { store.setLocalPanelMode(workspaceId, 'hidden') } catch {}
        }
      })
    } else {
      store.syncWorkspaces(workspaceItems)
    }
  }, [hostMode, store, workspaceId, workspaceItems])

  useEffect(() => () => {
    if (workspaceId !== null) void store.flushWorkspace(workspaceId).catch(() => {})
  }, [store, workspaceId])

  useLayoutEffect(() => {
    if (hostMode === 'embedded') {
      layoutAdapter.releaseStandalone('embedded-surface-active')
      return
    }
    layoutAdapter.apply({
      requestedMode: workspaceId === null ? 'hidden' : state.panelMode,
      panelWidth: 360,
      panelElement: panelRef.current,
    })
  }, [hostMode, layoutAdapter, state.panelMode, workspaceId])

  useEffect(() => {
    if ((hostMode === 'embedded' && visible) || layout.effectiveMode !== 'hidden') {
      titleRef.current?.focus()
    }
  }, [hostMode, layout.effectiveMode, visible, workspaceId])

  const layoutBlocked = hostMode === 'standalone'
    && state.panelMode !== 'hidden'
    && layout.requestedMode === state.panelMode
    && layout.effectiveMode === 'hidden'
    && ['incompatible', 'conflict', 'faulted'].includes(layout.status)
  if (
    workspaceId === null
    || (hostMode === 'standalone' && state.panelMode === 'hidden')
    || layoutBlocked
  ) return null

  const effectiveMode = hostMode === 'embedded'
    ? 'embedded'
    : layout.requestedMode === state.panelMode ? layout.effectiveMode : state.panelMode
  const actions = createPanelActions({ store, workspaceId, focusTargets })

  return createElement('section', {
    ref: panelRef,
    'data-oasis-panel': true,
    'data-testid': hostMode === 'embedded' ? 'oasis-embedded-workbench' : 'oasis-panel',
    'data-host-mode': hostMode,
    'data-mode': effectiveMode,
    'data-requested-mode': state.panelMode,
    'data-layout-status': hostMode === 'embedded' ? 'better-sidebar-owned' : layout.status,
    'data-workspace-id': workspaceId,
    'data-visible': visible ? 'true' : 'false',
    'aria-label': '绿洲专业工作台',
    style: sectionStyle(hostMode, layout, effectiveMode),
  },
  createElement('style', null, reducedMotionCss),
  createElement(PanelChrome, {
    hostMode,
    state: {
      ...state,
      effectiveMode,
      layoutStatus: hostMode === 'embedded' ? 'better-sidebar-owned' : layout.status,
    },
    titleRef,
    onActivatePage: (pageId) => { void actions.activatePage(pageId).catch(() => {}) },
    onClosePage: (pageId) => { void actions.closePage(pageId).catch(() => {}) },
    onCreatePage: () => store.createPage(workspaceId),
    onHide: () => { if (hostMode === 'standalone') void actions.hidePanel().catch(() => {}) },
    onToggleExpanded: () => {
      if (hostMode === 'standalone') {
        store.setPanelMode(workspaceId, state.panelMode === 'expanded' ? 'normal' : 'expanded')
      }
    },
  }),
  createElement(PanelPages, {
    state,
    effectiveMode,
    onSelectWorkflow: (pageId, workflowId) => store.selectWorkflow(workspaceId, pageId, workflowId),
    onRenamePage: (pageId, title) => store.renamePage(workspaceId, pageId, title),
    onReload: () => store.reloadWorkspace(workspaceId),
    onUpdateForm: (pageId, fieldId, value) => store.updateFormValue(workspaceId, pageId, fieldId, value),
    onMaterialDraft: (pageId, path, confirmed) => store.setMaterialDraft(workspaceId, pageId, path, confirmed),
    onAddMaterial: (pageId) => { void store.addMaterial(workspaceId, pageId).catch(() => {}) },
    onRefreshMaterial: (pageId, referenceId) => {
      void store.refreshMaterial(workspaceId, pageId, referenceId).catch(() => {})
    },
    onRemoveMaterial: (pageId, referenceId, confirmed) => {
      if (confirmed) void store.removeMaterial(workspaceId, pageId, referenceId, true).catch(() => {})
    },
    onGenerate: (pageId) => { void store.createRun(workspaceId, pageId).catch(() => {}) },
    onActivateRun: (pageId, runId) => store.activateRun(workspaceId, pageId, runId),
    onReviewNote: (pageId, note) => store.setReviewNote(workspaceId, pageId, note),
    onReview: (pageId, runId, status, note) => {
      void store.reviewRun(workspaceId, pageId, runId, status, note).catch(() => {})
    },
    onWritebackDraft: (pageId, directory, confirmed) => {
      store.setWritebackDraft(workspaceId, pageId, directory, confirmed)
    },
    onPrepareWriteback: (pageId, runId) => {
      void store.prepareWriteback(workspaceId, pageId, runId).catch(() => {})
    },
    onWritebackConfirm: (pageId, confirmed) => store.setWritebackConfirmation(workspaceId, pageId, confirmed),
    onCommitWriteback: (pageId) => { void store.commitWriteback(workspaceId, pageId).catch(() => {}) },
  }))
}
