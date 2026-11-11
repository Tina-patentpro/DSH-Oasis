import { createElement, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'

import { isOasisRemoteExecutionUnresolved } from '../workbench-contract.js'
import { hasPendingUnifiedRun } from '../generation-contract.js'
import { PanelChrome } from './PanelChrome.js'
import { PanelPages } from './PanelPages.js'
import { WebsiteImportDialog } from './WebsiteImportDialog.js'
import {selectV340Entry} from './v340-zero-preview.js'

const noConfiguration = Object.freeze({ canSubmit: true })
const getNoConfiguration = () => noConfiguration
const noSubscribe = () => () => {}
const zero = () => 0

// Keep the original business aliases local to our panel, paired with the
// installed DSH label/surface tokens. Do not define aliases on the host root.
const scopedThemeStyle = {
  '--dsw-alias-text-primary': 'var(--dsw-alias-label-primary, #202123)',
  '--dsw-alias-text-secondary': 'var(--dsw-alias-label-secondary, #66706b)',
  '--dsw-alias-bg-subtle': 'var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base, #f5f7f5))',
}

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
      if (hasPendingUnifiedRun(page) || (page.generation && (store.getWorkspaceState(workspaceId).pageOperations?.[pageId]?.activeOperation
        || store.getWorkspaceState(workspaceId).pageOperations?.[pageId]?.generationUncertain))) return false
      if (page.remoteExecutionOrder?.some((executionId) => (
        isOasisRemoteExecutionUnresolved(page.remoteExecutions?.[executionId])
      ))) return false
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
  if(current.v340Catalog?.nativeZeroGeneration===true||current.v340Catalog?.nativeBusinessRecovery){store.setLocalPanelMode(workspaceId,'hidden');return true}
  if(typeof store.loadProfessionalBootstrap==='function')await store.loadProfessionalBootstrap(workspaceId).catch(()=>null)
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
  if(store.getWorkspaceState(workspaceId).v340Catalog?.nextOffline!==true&&store.getWorkspaceState(workspaceId).v340Catalog?.nativeZeroGeneration!==true&&!store.getWorkspaceState(workspaceId).v340Catalog?.nativeBusinessRecovery&&typeof store.loadProfessionalBootstrap==='function')await store.loadProfessionalBootstrap(workspaceId).catch(()=>null)
  return true
}

function sectionStyle(hostMode, layout, effectiveMode) {
  if (hostMode === 'embedded') {
    return {
      ...scopedThemeStyle,
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
    ...scopedThemeStyle,
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
  markdownRenderer,
  coordinator,
  focusTargets,
  layoutAdapter,
  workspaceId,
  workspaceItems,
  hostMode = 'standalone',
  visible = true,
}) {
  const [center, setCenter] = useState(false)
  const [importWorkspace, setImportWorkspace] = useState(null)
  const [previewWorkspace,setPreviewWorkspace]=useState(null)
  const state = useSyncExternalStore(
    store.subscribe,
    () => store.peekWorkspaceState(workspaceId),
    () => store.peekWorkspaceState(workspaceId),
  )
  const panelRef = useRef(null)
  const nativeZeroGeneration=state.v340Catalog?.nativeZeroGeneration===true
  const nativeRecovery=!!state.v340Catalog?.nativeBusinessRecovery
  useEffect(()=>{setPreviewWorkspace(null)},[workspaceId,state.v340Catalog])
  useSyncExternalStore(store.conversationDrafts?.subscribe ?? noSubscribe,
    store.conversationDrafts?.getSnapshot ?? zero, store.conversationDrafts?.getSnapshot ?? zero)
  const conversationUnavailableReason = store.conversationDrafts?.unavailableReason(workspaceId) ?? (store.conversationDrafts ? null : '当前对话输入接口不可用')
  const configuration = useSyncExternalStore(
    store.connectionSettings?.subscribe ?? noSubscribe,
    store.connectionSettings?.getSnapshot ?? getNoConfiguration,
    store.connectionSettings?.getSnapshot ?? getNoConfiguration,
  )
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
  !nativeZeroGeneration && !nativeRecovery && importWorkspace === workspaceId && store.websiteImportRemote && store.connectionSettings ? createElement(WebsiteImportDialog, {
    key: workspaceId, workspaceId, remote: store.websiteImportRemote, accountController: store.connectionSettings,
    onClose: () => setImportWorkspace(null),
    onOpenFiles: coordinator?.nativeAvailability(workspaceId)?.editor ? () => { setImportWorkspace(null); coordinator.openNativeTool(workspaceId, 'editor') } : undefined,
  }) : null,
  createElement(PanelChrome, {
    hostMode,
    state: {
      ...state,
      pages:state.pages.filter(page=>!state.closedV340Tabs?.includes(page.pageId)),
      effectiveMode,
      layoutStatus: hostMode === 'embedded' ? 'better-sidebar-owned' : layout.status,
    },
    titleRef,
    onOpenFunctionCenter: () => {setPreviewWorkspace(null);setCenter(true)},
    showFunctionCenter: center || state.pages.find(page => page.pageId === state.activePageId)?.view === 'chooser',
    onActivatePage: (pageId) => { setCenter(false); void actions.activatePage(pageId).catch(() => {}) },
    onClosePage: (pageId) => { void actions.closePage(pageId).catch(() => {}) },
    onCreatePage: nativeRecovery?undefined:() => { setCenter(false); store.createPage(workspaceId) },
    onHide: () => { if (hostMode === 'standalone') {if(nativeZeroGeneration)store.setLocalPanelMode(workspaceId,'hidden');else void actions.hidePanel().catch(() => {})} },
    onToggleExpanded: () => {
      if (hostMode === 'standalone' && !nativeZeroGeneration && !nativeRecovery) {
        store.setPanelMode(workspaceId, state.panelMode === 'expanded' ? 'normal' : 'expanded')
      }
    },
  }),
  createElement(PanelPages, {
    zeroPreview:previewWorkspace===workspaceId,
    onCloseZeroPreview:()=>{setPreviewWorkspace(null);setCenter(true)},
    prepareZeroPreview:(command,signal)=>store.prepareV340ZeroPreview(workspaceId,command,signal),
    v340Actions:{
      retryCatalog:()=>store.loadV340Catalog(workspaceId),
      create:nodeId=>{try{void Promise.resolve(selectV340Entry({catalog:state.v340Catalog,nodeId,
        openPreview:()=>setPreviewWorkspace(workspaceId),createTask:id=>store.createV340Task(workspaceId,id)})).then(()=>setCenter(false)).catch(()=>{})}catch{}},
      resume:async pageId=>{await store.activatePage(workspaceId,pageId);setCenter(false)},
      discardLocal:(pageId,expected)=>store.discardV340LocalDrafts(workspaceId,pageId,expected),
      saveDraft:(pageId,draft)=>store.saveV340Draft(workspaceId,pageId,draft),
      runOffline:pageId=>store.runV340Offline(workspaceId,pageId),
      previewSaved:(pageId,target,writebackId)=>store.previewV340SavedFile(workspaceId,pageId,target,writebackId),
      prepareCandidate:pageId=>store.prepareV340Candidate(workspaceId,pageId),
      confirmCandidate:pageId=>store.confirmV340Candidate(workspaceId,pageId),
      cancelCandidate:pageId=>store.cancelV340Candidate(workspaceId,pageId),
      reconcileCandidate:pageId=>store.reconcileV340Candidate(workspaceId,pageId),
      saveEditDraft:(pageId,target,body)=>store.saveV340ResultDraft(workspaceId,pageId,target,body),
      edit:(pageId,target)=>store.editV340Result(workspaceId,pageId,target),
      review:(pageId,target,confirmation)=>store.reviewV340Result(workspaceId,pageId,target,confirmation),
      selectVersion:(pageId,runId,versionId)=>store.selectV340Version(workspaceId,pageId,runId,versionId),
      prepareSave:(pageId,target)=>store.prepareV340Save(workspaceId,pageId,target),
      confirmSave:(pageId,value)=>store.setV340SaveConfirmation(workspaceId,pageId,value),
      commitSave:pageId=>store.commitV340Save(workspaceId,pageId),
      useReference:(pageId,target)=>store.useV340InConversation(workspaceId,pageId,target),
      openSaved:(pageId,target,writebackId)=>store.openV340SavedFile(workspaceId,pageId,target,writebackId),
      observe:(pageId,runId)=>store.v340Action(workspaceId,pageId,'run/observe',{runId}),
      stop:(pageId,runId)=>store.v340Action(workspaceId,pageId,'run/stop',{runId}),
    },
    onImport: !state.v340Catalog?.nextOffline && store.websiteImportRemote && store.connectionSettings ? () => setImportWorkspace(workspaceId) : undefined,
    markdownRenderer,
    savedFileUnavailableReason: coordinator?.captureSavedFileTarget(workspaceId) ? null : '安全文件预览不可用',
    onOpenSavedFile: (pageId, runId, writebackId) => store.openSavedFile(workspaceId, pageId, runId, writebackId),
    showFunctionCenter: center,
    nativeAvailability: coordinator?.nativeAvailability(workspaceId) ?? {},
    onOpenNative: type => coordinator?.openNativeTool(workspaceId, type) === true,
    state: { ...state, localSkillSuite: configuration.localSkillSuite,
      professionalConfigurationBlocked: !configuration.canSubmit, conversationUnavailableReason },
    effectiveMode,
    onSelectWorkflow: (pageId, workflowId) => {
      if (!pageId||store.getWorkspaceState(workspaceId).pages.find(page => page.pageId === pageId)?.workflowId) {
        store.createPage(workspaceId)
        pageId = store.getWorkspaceState(workspaceId).activePageId
      }
      store.selectWorkflow(workspaceId, pageId, workflowId)
      setCenter(false)
    },
    onRenamePage: (pageId, title) => store.renamePage(workspaceId, pageId, title),
    onReload: () => store.reloadWorkspace(workspaceId),
    onUpdateForm: (pageId, fieldId, value) => store.updateFormValue(workspaceId, pageId, fieldId, value),
    onSetGenerationSource: (pageId, source) => store.setGenerationSource(workspaceId, pageId, source),
    onSelectClaimsUpstream: (pageId, path) => store.selectClaimsUpstream(workspaceId, pageId, path),
    onObserveUnified: pageId => { void store.observeUnifiedRun(workspaceId, pageId).catch(() => {}) },
    onStopUnified: (pageId, runId) => { void store.stopUnifiedRun(workspaceId, pageId, runId).catch(() => {}) },
    onEditResult: (pageId, runId, body) => store.editUnifiedResult(workspaceId, pageId, runId, body),
    onUpdateResultEditDraft: (pageId, runId, body) => store.updateResultEditDraft(workspaceId, pageId, runId, body),
    onDiscardResultEditDraft: (pageId, runId, expectedDraft) => store.discardResultEditDraft(workspaceId, pageId, runId, expectedDraft),
    onUseInConversation: (pageId, runId) => store.useInConversation(workspaceId, pageId, runId),
    onMaterialDraft: (pageId, path, confirmed) => store.setMaterialDraft(workspaceId, pageId, path, confirmed),
    onAddMaterial: (pageId) => { void store.addMaterial(workspaceId, pageId).catch(() => {}) },
    onRefreshMaterial: (pageId, referenceId) => {
      void store.refreshMaterial(workspaceId, pageId, referenceId).catch(() => {})
    },
    onRemoveMaterial: (pageId, referenceId, confirmed) => {
      if (confirmed) void store.removeMaterial(workspaceId, pageId, referenceId, true).catch(() => {})
    },
    onGenerate: (pageId, confirmed = false) => { void store.createRun(workspaceId, pageId, confirmed).catch(() => {}) },
    onActivateRun: (pageId, runId) => store.activateRun(workspaceId, pageId, runId),
    onReviewNote: (pageId, note) => store.setReviewNote(workspaceId, pageId, note),
    onReview: (pageId, runId, status, note, confirmation) => {
      const pending = store.reviewRun(workspaceId, pageId, runId, status, note, confirmation)
      if (confirmation) return pending
      void pending.catch(() => {})
    },
    onWritebackDraft: (pageId, directory, confirmed) => {
      store.setWritebackDraft(workspaceId, pageId, directory, confirmed)
    },
    onPrepareWriteback: (pageId, runId) => {
      void store.prepareWriteback(workspaceId, pageId, runId).catch(() => {})
    },
    onWritebackConfirm: (pageId, confirmed) => store.setWritebackConfirmation(workspaceId, pageId, confirmed),
    onCommitWriteback: (pageId) => { void store.commitWriteback(workspaceId, pageId).catch(() => {}) },
    onSelectProfessionalService: (pageId, apiEndpoint) => {
      void store.selectProfessionalService(workspaceId, pageId, apiEndpoint).catch(() => {})
    },
    onUpdateProfessionalField: (pageId, fieldId, value) => {
      store.updateProfessionalFormValue(workspaceId, pageId, fieldId, value)
    },
    onSelectProfessionalFolder: (pageId, folderId) => {
      store.setProfessionalFolder(workspaceId, pageId, folderId)
    },
    onProfessionalConfirm: (pageId, value) => {
      store.setProfessionalConfirmations(workspaceId, pageId, value)
    },
    onStartProfessional: (pageId) => {
      void store.startProfessional(workspaceId, pageId).catch(() => {})
    },
    onContinueProfessional: (pageId, executionId) => {
      void store.continueProfessional(workspaceId, pageId, executionId).catch(() => {})
    },
    onStopProfessional: (pageId, executionId) => {
      void store.stopProfessional(workspaceId, pageId, executionId).catch(() => {})
    },
    onObserveRunningWater: (pageId, runId) => {
      void store.observeRunningWater(workspaceId, pageId, runId).catch(() => {})
    },
  }))
}
