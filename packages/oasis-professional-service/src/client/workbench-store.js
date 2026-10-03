import {
  createInitialWorkspaceState,
  recordToWorkspaceState,
  reduceWorkspaceState,
  workspaceStateToDraft,
} from './workbench-model.js'
import { isOasisRemoteExecutionUnresolved } from '../workbench-contract.js'
import { generationUnavailableReason, hasPendingUnifiedRun } from '../generation-contract.js'

export const EMPTY_WORKSPACE_STATE = createInitialWorkspaceState(null)

const EMPTY_PAGE_OPERATION = Object.freeze({
  materialPath: '',
  materialConfirmed: false,
  reviewNote: '',
  writebackDirectory: '',
  writebackConfirmed: false,
  writebackPlan: null,
  requestKey: null,
  localModelPreview: null,
  activeOperation: null,
  error: null,
  errorCode: null,
  feedback: null,
  materialsChanged: false,
  indexWarningManifest: null,
  professionalDetail: null,
  priceConfirmed: false,
  externalTransferConfirmed: false,
  runningWaterStatus: 'idle',
  runningWaterObservation: null,
})

function defaultCreateId() {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('crypto.randomUUID is required to create an Oasis task')
  }
  return globalThis.crypto.randomUUID()
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

export function createWorkbenchStore({
  remote = null,
  connectionSettings = null,
  conversationDrafts = null,
  getGenerationSession = null,
  nativeFiles = null,
  createId = defaultCreateId,
  createRequestKey = defaultCreateId,
  clock = () => new Date().toISOString(),
  workflowCatalog = null,
  saveDelayMs = 400,
  disposeDrainMs = 1000,
  scheduler = globalThis,
} = {}) {
  if (!Number.isInteger(saveDelayMs) || saveDelayMs < 0) {
    throw new TypeError('saveDelayMs must be a non-negative integer')
  }
  if (typeof createRequestKey !== 'function') throw new TypeError('createRequestKey must be a function')
  if (!Number.isSafeInteger(disposeDrainMs) || disposeDrainMs < 0) {
    throw new TypeError('disposeDrainMs must be a non-negative safe integer')
  }
  if (typeof scheduler?.setTimeout !== 'function' || typeof scheduler?.clearTimeout !== 'function') {
    throw new TypeError('scheduler must provide setTimeout and clearTimeout')
  }
  const knownWorkspaceIds = new Set()
  const states = new Map()
  const runtimes = new Map()
  const listeners = new Set()
  const controller = new AbortController()
  const pendingObservations = new Map()
  const reducerEnvironment = { createId, now: clock }
  let closing = false
  let disposed = false
  let disposePromise
  let professionalConfigurationGeneration = 0

  function assertProfessionalConfiguration(generation = professionalConfigurationGeneration) {
    if (generation !== professionalConfigurationGeneration
      || (connectionSettings !== null && !connectionSettings.getSnapshot().canSubmit)) {
      throw new Error('连接配置已变更或尚未就绪；请刷新目录并重新确认后再提交。')
    }
  }

  function assertOpen() {
    if (closing || disposed) throw new Error(disposed ? 'workbench store is disposed' : 'workbench store is closing')
  }

  function assertKnown(workspaceId) {
    if (typeof workspaceId !== 'string' || !knownWorkspaceIds.has(workspaceId)) {
      throw new Error('action requires a known Workspace')
    }
  }

  function runtimeFor(workspaceId) {
    let runtime = runtimes.get(workspaceId)
    if (!runtime) {
      runtime = {
        hydrationPromise: null,
        catalogPromise: null,
        professionalPromise: null,
        professionalGeneration: 0,
        drainPromise: null,
        pendingActions: [],
        pendingDraft: null,
        saveTimer: null,
        saveGeneration: 0,
        editGeneration: 0,
      }
      runtimes.set(workspaceId, runtime)
    }
    return runtime
  }

  function publish() {
    if (closing || disposed) return
    for (const listener of [...listeners]) listener()
  }

  function setState(workspaceId, next) {
    const current = states.get(workspaceId)
    if (disposed) return current ?? EMPTY_WORKSPACE_STATE
    if (current === next) return current
    const frozen = Object.isFrozen(next) ? next : Object.freeze(next)
    states.set(workspaceId, frozen)
    for (const entry of pendingObservations.values()) {
      if (entry.workspaceId === workspaceId && !frozen.pages.some((page) => page.pageId === entry.pageId)) {
        invalidateObservation(entry)
      }
    }
    publish()
    return frozen
  }

  function stateWith(current, changes) {
    return Object.freeze({ ...current, ...changes })
  }

  function getCurrent(workspaceId) {
    return states.get(workspaceId) ?? initialState(workspaceId)
  }

  function initialState(workspaceId) {
    const state = createInitialWorkspaceState(workspaceId, remote === null ? 'ready' : 'idle')
    if (workflowCatalog === null) return state
    return stateWith(state, {
      catalogStatus: 'ready',
      catalogError: null,
      workflows: workflowCatalog.workflows,
      unifiedFixtureEnabled: workflowCatalog.unifiedFixtureEnabled === true,
      apiExecutionAvailable: workflowCatalog.apiExecutionAvailable === true,
      localGenerationEnabled: workflowCatalog.localGenerationEnabled === true,
      localGenerationKind: workflowCatalog.localGenerationKind ?? null,
    })
  }

  function preserveClientState(recordState, current) {
    return stateWith(recordState, {
      catalogStatus: current.catalogStatus,
      catalogError: current.catalogError,
      workflows: current.workflows,
      unifiedFixtureEnabled: current.unifiedFixtureEnabled === true,
      apiExecutionAvailable: current.apiExecutionAvailable === true,
      localGenerationEnabled: current.localGenerationEnabled === true,
      localGenerationKind: current.localGenerationKind ?? null,
      professionalStatus: current.professionalStatus,
      professionalError: current.professionalError,
      professionalBootstrap: current.professionalBootstrap,
      pageOperations: current.pageOperations,
    })
  }

  function pageFor(workspaceId, pageId) {
    const page = getCurrent(workspaceId).pages.find((item) => item.pageId === pageId)
    if (!page) throw new Error('unknown page')
    return page
  }

  function assertInputEditable(workspaceId, pageId) {
    const page = pageFor(workspaceId, pageId)
    if (operationFor(getCurrent(workspaceId), pageId).activeOperation !== null
      || operationFor(getCurrent(workspaceId), pageId).generationUncertain || hasPendingUnifiedRun(page)
      || page.remoteExecutionOrder.some(id => isOasisRemoteExecutionUnresolved(page.remoteExecutions[id]))) {
      throw new Error('任务处理中或结果未确认，输入与来源已锁定')
    }
  }

  function invalidateInputConfirmations(workspaceId, pageId) {
    updatePageOperation(workspaceId, pageId, {
      priceConfirmed: false, externalTransferConfirmed: false, requestKey: null,
      localModelPreview: null, apiPreview: null,
      writebackConfirmed: false, writebackPlan: null, error: null, errorCode: null, feedback: null,
    })
  }

  function operationFor(state, pageId) {
    return state.pageOperations[pageId] ?? EMPTY_PAGE_OPERATION
  }

  function updatePageOperation(workspaceId, pageId, changes) {
    assertOpen()
    assertKnown(workspaceId)
    pageFor(workspaceId, pageId)
    const current = getCurrent(workspaceId)
    const operation = Object.freeze({ ...operationFor(current, pageId), ...changes })
    return setState(workspaceId, stateWith(current, {
      pageOperations: Object.freeze({ ...current.pageOperations, [pageId]: operation }),
    }))
  }

  function observationIsCurrent(entry) {
    return !closing && !disposed && !entry.controller.signal.aborted
      && pendingObservations.get(entry.key) === entry
      && knownWorkspaceIds.has(entry.workspaceId)
      && states.get(entry.workspaceId)?.pages.some((page) => page.pageId === entry.pageId)
  }

  function invalidateObservation(entry) {
    if (pendingObservations.get(entry.key) !== entry) return
    pendingObservations.delete(entry.key)
    entry.controller.abort()
    const current = states.get(entry.workspaceId)
    const operation = current?.pageOperations[entry.pageId]
    if (operation?.activeOperation !== 'running-water-observe') return
    const pageOperations = { ...current.pageOperations }
    if (current.pages.some((page) => page.pageId === entry.pageId)) {
      pageOperations[entry.pageId] = Object.freeze({
        ...operation, activeOperation: null, runningWaterStatus: 'idle', runningWaterObservation: null,
      })
    } else {
      delete pageOperations[entry.pageId]
    }
    setState(entry.workspaceId, stateWith(current, { pageOperations: Object.freeze(pageOperations) }))
  }

  function operationErrorFeedback(error) {
    const code = typeof error?.code === 'string' ? error.code : null
    if (['WRITEBACK_COMMITTED_INDEX_FAILED', 'WRITEBACK_PARTIAL_PUBLISH'].includes(code)) return 'index-warning'
    if (code === 'MATERIAL_CHANGED') return 'material-changed'
    if (code?.includes('CONFLICT') || code === 'revision-conflict') return 'conflict'
    return 'operation-error'
  }

  function ensureRecordIdentity(workspaceId, state) {
    if (state.workspaceId !== workspaceId) {
      throw new Error(`Workspace response identity mismatch: expected ${workspaceId}`)
    }
    return state
  }

  function clearScheduledSave(runtime) {
    runtime.saveGeneration += 1
    if (runtime.saveTimer !== null) {
      scheduler.clearTimeout(runtime.saveTimer)
      runtime.saveTimer = null
    }
  }

  function drainWorkspace(workspaceId) {
    const runtime = runtimeFor(workspaceId)
    if (runtime.drainPromise || remote === null || disposed) return runtime.drainPromise

    runtime.drainPromise = (async () => {
      while (runtime.pendingDraft !== null && !disposed) {
        const current = getCurrent(workspaceId)
        if (current.syncStatus === 'conflict' || current.syncStatus === 'error') {
          runtime.pendingDraft = null
          break
        }

        const draft = runtime.pendingDraft
        runtime.pendingDraft = null
        try {
          const result = await remote.replace(
            workspaceId,
            getCurrent(workspaceId).revision,
            draft,
            controller.signal,
          )
          if (disposed) break

          if (result?.committed === true) {
            const committed = ensureRecordIdentity(
              workspaceId,
              recordToWorkspaceState(result.current),
            )
            const latest = getCurrent(workspaceId)
            setState(workspaceId, stateWith(latest, {
              revision: committed.revision,
              syncStatus: latest.syncStatus === 'conflict' ? 'conflict' : runtime.pendingDraft !== null ? 'saving' : 'ready',
              syncError: null,
              conflictCurrent: latest.syncStatus === 'conflict'
                ? (latest.conflictCurrent?.revision > committed.revision ? latest.conflictCurrent : committed) : null,
            }))
            continue
          }

          if (result?.committed === false && result.reason === 'revision-conflict') {
            const conflictCurrent = ensureRecordIdentity(
              workspaceId,
              recordToWorkspaceState(result.current),
            )
            runtime.pendingDraft = null
            clearScheduledSave(runtime)
            setState(workspaceId, stateWith(getCurrent(workspaceId), {
              syncStatus: 'conflict',
              syncError: null,
              conflictCurrent,
            }))
            break
          }

          throw new Error('Malformed Oasis workbench replacement result')
        } catch (error) {
          if (disposed || controller.signal.aborted) break
          runtime.pendingDraft = null
          clearScheduledSave(runtime)
          setState(workspaceId, stateWith(getCurrent(workspaceId), {
            syncStatus: 'error',
            syncError: errorMessage(error),
            conflictCurrent: null,
          }))
          break
        }
      }
    })().finally(() => {
      runtime.drainPromise = null
    })
    return runtime.drainPromise
  }

  function scheduleWorkspaceSave(workspaceId, draft) {
    if (closing || disposed) return
    const runtime = runtimeFor(workspaceId)
    runtime.pendingDraft = draft
    clearScheduledSave(runtime)
    const generation = runtime.saveGeneration
    const startDrain = () => {
      if (disposed || generation !== runtime.saveGeneration) return
      runtime.saveTimer = null
      void drainWorkspace(workspaceId)
    }
    if (saveDelayMs === 0) {
      queueMicrotask(startDrain)
    } else {
      runtime.saveTimer = scheduler.setTimeout(startDrain, saveDelayMs)
    }
  }

  async function flushWorkspaceInternal(workspaceId) {
    assertKnown(workspaceId)
    const runtime = runtimeFor(workspaceId)
    clearScheduledSave(runtime)
    while (runtime.hydrationPromise) await runtime.hydrationPromise
    if (runtime.pendingDraft !== null) drainWorkspace(workspaceId)
    while (runtime.drainPromise) await runtime.drainPromise
    return getCurrent(workspaceId)
  }

  async function flushWorkspace(workspaceId) {
    assertOpen()
    return flushWorkspaceInternal(workspaceId)
  }

  function applyAuthoritativeReplacement(workspaceId, result) {
    if (result?.committed === true) {
      const current = getCurrent(workspaceId)
      const authoritative = preserveClientState(
        ensureRecordIdentity(workspaceId, recordToWorkspaceState(result.current)),
        current,
      )
      if (current.syncStatus === 'conflict' || current.revision > authoritative.revision) {
        preserveDraftConflict(workspaceId, authoritative)
      }
      setState(workspaceId, authoritative)
      return authoritative
    }
    if (result?.committed === false && result.reason === 'revision-conflict') {
      const conflictCurrent = ensureRecordIdentity(
        workspaceId,
        recordToWorkspaceState(result.current),
      )
      setState(workspaceId, stateWith(getCurrent(workspaceId), {
        syncStatus: 'conflict', syncError: null, conflictCurrent,
      }))
      const error = new Error('Workspace revision conflict')
      error.code = 'revision-conflict'
      throw error
    }
    throw new Error('Malformed Oasis workbench mutation result')
  }

  function preserveDraftConflict(workspaceId, authoritative) {
    const runtime = runtimeFor(workspaceId)
    clearScheduledSave(runtime)
    runtime.pendingDraft = null
    const current = getCurrent(workspaceId)
    setState(workspaceId, stateWith(current, {
      syncStatus: 'conflict', syncError: null,
      conflictCurrent: current.conflictCurrent?.revision > authoritative.revision ? current.conflictCurrent : authoritative,
    }))
    const error = new Error('Workspace revision conflict; local draft retained')
    error.code = 'revision-conflict'
    throw error
  }

  async function runPageOperation(workspaceId, pageId, operationName, operation, onSuccess) {
    assertOpen()
    assertKnown(workspaceId)
    pageFor(workspaceId, pageId)
    if (remote === null || typeof operation !== 'function') {
      throw new Error(`${operationName} requires the Oasis Host`)
    }
    const existing = operationFor(getCurrent(workspaceId), pageId)
    if (existing.activeOperation !== null) throw new Error('another page operation is already in progress')
    updatePageOperation(workspaceId, pageId, {
      activeOperation: operationName, error: null, errorCode: null, feedback: null, indexWarningManifest: null,
    })
    try {
      await flushWorkspace(workspaceId)
      const current = getCurrent(workspaceId)
      if (current.syncStatus !== 'ready') {
        throw new Error(`Workspace is not ready for ${operationName}`)
      }
      const editGeneration = runtimeFor(workspaceId).editGeneration
      const result = await operation(current)
      if (closing || disposed || controller.signal.aborted) return getCurrent(workspaceId)
      if (runtimeFor(workspaceId).editGeneration !== editGeneration && result?.current) {
        preserveDraftConflict(workspaceId, ensureRecordIdentity(workspaceId, recordToWorkspaceState(result.current)))
      }
      const applied = applyAuthoritativeReplacement(workspaceId, result)
      updatePageOperation(workspaceId, pageId, {
        activeOperation: null,
        error: null,
        errorCode: null,
        ...(onSuccess ? onSuccess(applied) : {}),
      })
      return applied
    } catch (error) {
      if (!closing && !disposed && getCurrent(workspaceId).pages.some((page) => page.pageId === pageId)) {
        const feedback = operationErrorFeedback(error)
        const discardWritebackPlan = feedback === 'index-warning' || operationName === 'writeback-commit'
        updatePageOperation(workspaceId, pageId, {
          activeOperation: null,
          error: errorMessage(error),
          errorCode: typeof error?.code === 'string' ? error.code : null,
          feedback,
          materialsChanged: feedback === 'material-changed'
            ? true
            : operationFor(getCurrent(workspaceId), pageId).materialsChanged,
          writebackPlan: discardWritebackPlan
            ? null
            : operationFor(getCurrent(workspaceId), pageId).writebackPlan,
          writebackConfirmed: discardWritebackPlan
            ? false
            : operationFor(getCurrent(workspaceId), pageId).writebackConfirmed,
          indexWarningManifest: feedback === 'index-warning' ? error?.details?.manifest ?? null : null,
        })
      }
      throw error
    }
  }

  function persistReadyAction(workspaceId, action) {
    assertOpen()
    const current = getCurrent(workspaceId)
    const next = reduceWorkspaceState(current, action, reducerEnvironment)
    if (next === current) return current
    runtimeFor(workspaceId).editGeneration += 1
    const saving = stateWith(next, {
      syncStatus: remote === null ? 'ready' : 'saving',
      syncError: null,
      conflictCurrent: null,
    })
    setState(workspaceId, saving)
    if (remote !== null) {
      scheduleWorkspaceSave(workspaceId, workspaceStateToDraft(saving))
    }
    return saving
  }

  async function hydrateWorkspace(workspaceId, { force = false } = {}) {
    assertOpen()
    assertKnown(workspaceId)
    if (remote === null) {
      const current = getCurrent(workspaceId)
      if (current.syncStatus === 'idle') {
        return setState(workspaceId, stateWith(current, { syncStatus: 'ready' }))
      }
      return current
    }

    const runtime = runtimeFor(workspaceId)
    if (runtime.hydrationPromise) return runtime.hydrationPromise
    const current = getCurrent(workspaceId)
    if (!force && !['idle', 'loading'].includes(current.syncStatus)) return current

    setState(workspaceId, stateWith(current, {
      syncStatus: 'loading',
      syncError: null,
      conflictCurrent: null,
    }))

    runtime.hydrationPromise = (async () => {
      try {
        const record = await remote.get(workspaceId, controller.signal)
        if (disposed) return getCurrent(workspaceId)
        let hydrated = preserveClientState(
          ensureRecordIdentity(workspaceId, recordToWorkspaceState(record)),
          getCurrent(workspaceId),
        )
        const pendingActions = runtime.pendingActions.splice(0)
        for (const action of pendingActions) {
          hydrated = reduceWorkspaceState(hydrated, action, reducerEnvironment)
        }
        if (pendingActions.length === 0) {
          setState(workspaceId, hydrated)
          return hydrated
        }

        const saving = stateWith(hydrated, { syncStatus: 'saving' })
        setState(workspaceId, saving)
        const draft = workspaceStateToDraft(saving)
        if (closing) {
          runtime.pendingDraft = draft
        } else {
          scheduleWorkspaceSave(workspaceId, draft)
        }
        return saving
      } catch (error) {
        if (closing || disposed || controller.signal.aborted) return getCurrent(workspaceId)
        runtime.pendingActions.length = 0
        return setState(workspaceId, stateWith(getCurrent(workspaceId), {
          syncStatus: 'error',
          syncError: errorMessage(error),
          conflictCurrent: null,
        }))
      } finally {
        runtime.hydrationPromise = null
      }
    })()
    return runtime.hydrationPromise
  }

  function dispatch(workspaceId, action) {
    assertOpen()
    assertKnown(workspaceId)
    const current = getCurrent(workspaceId)
    if (remote === null || ['ready', 'saving'].includes(current.syncStatus)) {
      return persistReadyAction(workspaceId, action)
    }

    if (['idle', 'loading'].includes(current.syncStatus)) {
      const runtime = runtimeFor(workspaceId)
      runtime.pendingActions.push(action)
      if (action.type === 'open-panel' && current.panelMode !== 'normal') {
        setState(workspaceId, stateWith(current, { panelMode: 'normal', syncStatus: 'loading' }))
      }
      void hydrateWorkspace(workspaceId)
      return getCurrent(workspaceId)
    }

    if (action.type === 'open-panel' && ['conflict', 'error'].includes(current.syncStatus)) {
      return setState(workspaceId, stateWith(current, { panelMode: 'normal' }))
    }
    throw new Error(`Workspace is not writable while syncStatus is ${current.syncStatus}`)
  }

  function pageCreatedBy(action, before, after) {
    if (!['create-page', 'open-panel'].includes(action.type)) return undefined
    return after.pages.find((page) => !before.pages.some((item) => item.pageId === page.pageId))
  }

  const store = {
    websiteImportRemote: remote,
    connectionSettings,
    conversationDrafts,

    async refreshProfessionalConfiguration(reload = false) {
      if (closing || disposed) return
      professionalConfigurationGeneration += 1
      for (const entry of pendingObservations.values()) invalidateObservation(entry)
      const workspaceIds = [...knownWorkspaceIds]
      for (const workspaceId of workspaceIds) {
        const runtime = runtimeFor(workspaceId)
        runtime.professionalGeneration += 1
        runtime.professionalPromise = null
        const current = getCurrent(workspaceId)
        const pageOperations = Object.fromEntries(Object.entries(current.pageOperations).map(([pageId, operation]) => [
          pageId, Object.freeze({ ...operation, professionalDetail: null, localModelPreview: null, apiPreview: null,
            priceConfirmed: false, externalTransferConfirmed: false,
            runningWaterStatus: 'idle', runningWaterObservation: null }),
        ]))
        setState(workspaceId, stateWith(current, {
          professionalStatus: 'idle', professionalBootstrap: null, professionalError: null,
          pageOperations: Object.freeze(pageOperations),
        }))
      }
      if (reload) await Promise.all(workspaceIds.map((workspaceId) => store.loadProfessionalBootstrap(workspaceId).catch(() => null)))
    },

    syncWorkspaces(workspaceItems) {
      assertOpen()
      const nextIds = new Set(
        Array.isArray(workspaceItems)
          ? workspaceItems.map((item) => item?.workspaceId).filter((id) => typeof id === 'string')
          : [],
      )
      knownWorkspaceIds.clear()
      for (const id of nextIds) {
        knownWorkspaceIds.add(id)
        if (!states.has(id)) {
          states.set(id, initialState(id))
        }
      }
      for (const entry of pendingObservations.values()) {
        if (!nextIds.has(entry.workspaceId)) invalidateObservation(entry)
      }
    },

    subscribe(listener) {
      if (closing || disposed) return () => {}
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    peekWorkspaceState(workspaceId) {
      return states.get(workspaceId) ?? EMPTY_WORKSPACE_STATE
    },

    getWorkspaceState(workspaceId) {
      assertKnown(workspaceId)
      return getCurrent(workspaceId)
    },

    hydrateWorkspace,

    async loadWorkflowCatalog(workspaceId) {
      assertOpen()
      assertKnown(workspaceId)
      const current = getCurrent(workspaceId)
      if (current.catalogStatus === 'ready') return current.workflows
      if (remote === null || typeof remote.getWorkflowCatalog !== 'function') {
        throw new Error('workflow catalog is unavailable')
      }
      const runtime = runtimeFor(workspaceId)
      if (runtime.catalogPromise) return runtime.catalogPromise
      setState(workspaceId, stateWith(current, { catalogStatus: 'loading', catalogError: null }))
      runtime.catalogPromise = (async () => {
        try {
          const response = await remote.getWorkflowCatalog(undefined, controller.signal)
          if (closing || disposed) return []
          const workflows = Array.isArray(response?.workflows) ? response.workflows : null
          if (workflows === null) throw new Error('Malformed workflow catalog response')
          setState(workspaceId, stateWith(getCurrent(workspaceId), {
            catalogStatus: 'ready', catalogError: null, workflows,
            unifiedFixtureEnabled: response.unifiedFixtureEnabled === true,
            apiExecutionAvailable: response.apiExecutionAvailable === true,
            localGenerationEnabled: response.localGenerationEnabled === true,
            localGenerationKind: response.localGenerationKind ?? null,
          }))
          return workflows
        } catch (error) {
          if (!closing && !disposed && !controller.signal.aborted) {
            setState(workspaceId, stateWith(getCurrent(workspaceId), {
            catalogStatus: 'error', catalogError: errorMessage(error), workflows: [],
            unifiedFixtureEnabled: false,
            apiExecutionAvailable: false,
            localGenerationEnabled: false,
            localGenerationKind: null,
            }))
          }
          throw error
        } finally {
          runtime.catalogPromise = null
        }
      })()
      return runtime.catalogPromise
    },

    async loadProfessionalBootstrap(workspaceId) {
      assertOpen()
      assertKnown(workspaceId)
      const current = getCurrent(workspaceId)
      if (current.professionalStatus === 'ready') return current.professionalBootstrap
      if (remote === null || typeof remote.getProfessionalBootstrap !== 'function') {
        return setState(workspaceId, stateWith(current, {
          professionalStatus: 'unavailable', professionalError: null, professionalBootstrap: null,
        })).professionalBootstrap
      }
      const runtime = runtimeFor(workspaceId)
      if (runtime.professionalPromise) return runtime.professionalPromise
      const generation = ++runtime.professionalGeneration
      const isCurrent = () => !closing && !disposed && knownWorkspaceIds.has(workspaceId)
        && runtimes.get(workspaceId) === runtime && runtime.professionalGeneration === generation
      setState(workspaceId, stateWith(current, { professionalStatus: 'loading', professionalError: null }))
      runtime.professionalPromise = (async () => {
        try {
          const bootstrap = await remote.getProfessionalBootstrap(controller.signal)
          if (!isCurrent()) return null
          setState(workspaceId, stateWith(getCurrent(workspaceId), {
            professionalStatus: 'ready', professionalError: null, professionalBootstrap: bootstrap,
          }))
          return bootstrap
        } catch (error) {
          if (isCurrent() && !controller.signal.aborted) {
            setState(workspaceId, stateWith(getCurrent(workspaceId), {
              professionalStatus: 'error', professionalError: errorMessage(error), professionalBootstrap: null,
            }))
          }
          throw error
        } finally {
          if (runtime.professionalGeneration === generation) runtime.professionalPromise = null
        }
      })()
      return runtime.professionalPromise
    },

    async reloadWorkspace(workspaceId) {
      assertOpen()
      assertKnown(workspaceId)
      const runtime = runtimeFor(workspaceId)
      runtime.pendingActions.length = 0
      runtime.pendingDraft = null
      clearScheduledSave(runtime)
      return hydrateWorkspace(workspaceId, { force: true })
    },

    async whenSettled(workspaceId) {
      assertOpen()
      assertKnown(workspaceId)
      const runtime = runtimeFor(workspaceId)
      while (runtime.hydrationPromise) await runtime.hydrationPromise
      return flushWorkspace(workspaceId)
    },

    flushWorkspace,

    setPanelMode(workspaceId, panelMode) {
      return dispatch(workspaceId, { type: 'set-panel-mode', panelMode })
    },

    setLocalPanelMode(workspaceId, panelMode) {
      assertOpen()
      assertKnown(workspaceId)
      if (!['hidden', 'normal'].includes(panelMode)) throw new Error('local panel mode must be hidden or normal')
      const current = getCurrent(workspaceId)
      return setState(workspaceId, stateWith(current, { panelMode }))
    },

    openPanel(workspaceId) {
      const before = getCurrent(workspaceId)
      const action = { type: 'open-panel' }
      const after = dispatch(workspaceId, action)
      return pageCreatedBy(action, before, after)
    },

    createPage(workspaceId) {
      const before = getCurrent(workspaceId)
      const action = { type: 'create-page' }
      const after = dispatch(workspaceId, action)
      return pageCreatedBy(action, before, after)
    },

    selectWorkflow(workspaceId, pageId, workflowId) {
      assertKnown(workspaceId)
      const current = getCurrent(workspaceId)
      if (current.catalogStatus !== 'ready') throw new Error('workflow catalog is not ready')
      const workflow = current.workflows.find((item) => item.workflowId === workflowId)
      if (!workflow) throw new Error(`workflow catalog does not contain ${workflowId}`)
      dispatch(workspaceId, { type: 'select-workflow', pageId, workflow, defaultGenerationSource: 'local-skill' })
      return getCurrent(workspaceId)
    },

    updateFormValue(workspaceId, pageId, fieldId, value) {
      assertInputEditable(workspaceId, pageId)
      dispatch(workspaceId, { type: 'update-form-value', pageId, fieldId, value })
      invalidateInputConfirmations(workspaceId, pageId)
      return getCurrent(workspaceId)
    },

    setGenerationSource(workspaceId, pageId, source) {
      assertInputEditable(workspaceId, pageId)
      const previous = pageFor(workspaceId, pageId).generation?.source
      dispatch(workspaceId, { type: 'set-generation-source', pageId, source })
      if (source !== previous) invalidateInputConfirmations(workspaceId, pageId)
      return getCurrent(workspaceId)
    },
    async selectClaimsUpstream(workspaceId, pageId, relativePath) {
      assertInputEditable(workspaceId, pageId)
      invalidateInputConfirmations(workspaceId, pageId)
      return runPageOperation(workspaceId, pageId, 'upstream-select', current => remote.selectClaimsUpstream({
        workspaceId, taskId: pageId, expectedRevision: current.revision, relativePath, confirmed: true,
      }, controller.signal), () => ({ feedback: relativePath === null ? '已取消上游文稿' : '已确认上游文稿', error: null }))
    },

    async selectProfessionalService(workspaceId, pageId, apiEndpoint) {
      assertOpen()
      assertKnown(workspaceId)
      assertProfessionalConfiguration()
      const configurationGeneration = professionalConfigurationGeneration
      pageFor(workspaceId, pageId)
      const bootstrap = getCurrent(workspaceId).professionalBootstrap
      if (!bootstrap?.remoteEnabled || !bootstrap.credentialConfigured) {
        throw new Error('Professional service runtime is not ready')
      }
      const service = bootstrap.services.find((item) => item.apiEndpoint === apiEndpoint)
      if (!service) throw new Error('unknown professional service')
      const existingFolderId = pageFor(workspaceId, pageId).professionalDraft?.folderId
      const folderId = bootstrap.folders.some((item) => item.id === existingFolderId)
        ? existingFolderId
        : bootstrap.folders[0]?.id
      if (!Number.isSafeInteger(folderId)) throw new Error('Professional service requires an available project folder')
      const detail = await remote.getProfessionalDetail(apiEndpoint, controller.signal)
      assertProfessionalConfiguration(configurationGeneration)
      if (detail.id !== service.apiId || detail.name !== service.apiEndpoint) {
        throw new Error('Professional service detail mismatch')
      }
      const next = dispatch(workspaceId, { type: 'select-professional-service', pageId, detail, folderId })
      updatePageOperation(workspaceId, pageId, {
        professionalDetail: detail, priceConfirmed: false, externalTransferConfirmed: false,
        error: null, errorCode: null, feedback: null,
      })
      return next
    },

    updateProfessionalFormValue(workspaceId, pageId, fieldId, value) {
      const next = dispatch(workspaceId, { type: 'update-professional-form-value', pageId, fieldId, value })
      updatePageOperation(workspaceId, pageId, { priceConfirmed: false, externalTransferConfirmed: false })
      return next
    },

    setProfessionalFolder(workspaceId, pageId, folderId) {
      const next = dispatch(workspaceId, { type: 'set-professional-folder', pageId, folderId })
      updatePageOperation(workspaceId, pageId, { priceConfirmed: false })
      return next
    },

    setProfessionalConfirmations(workspaceId, pageId, { priceConfirmed, externalTransferConfirmed }) {
      return updatePageOperation(workspaceId, pageId, {
        priceConfirmed: priceConfirmed === true,
        externalTransferConfirmed: externalTransferConfirmed === true,
        error: null, errorCode: null,
      })
    },

    async startProfessional(workspaceId, pageId) {
      assertOpen()
      assertKnown(workspaceId)
      assertProfessionalConfiguration()
      const configurationGeneration = professionalConfigurationGeneration
      const page = pageFor(workspaceId, pageId)
      if (!page.professionalDraft) throw new Error('A professional service must be selected first')
      const operation = operationFor(getCurrent(workspaceId), pageId)
      if (operation.priceConfirmed !== true) throw new Error('Price confirmation is required')
      if (operation.externalTransferConfirmed !== true) throw new Error('External material transfer confirmation is required')
      if (operation.activeOperation !== null) throw new Error('another page operation is already in progress')
      const requestKey = operation.requestKey ?? createRequestKey()
      updatePageOperation(workspaceId, pageId, {
        requestKey, activeOperation: 'professional-run', error: null, errorCode: null, feedback: null,
      })
      try {
        await flushWorkspace(workspaceId)
        assertProfessionalConfiguration(configurationGeneration)
        const current = getCurrent(workspaceId)
        if (current.syncStatus !== 'ready') throw new Error('Workspace is not ready for professional execution')
        const prepared = await remote.startProfessional({
          workspaceId, taskId: pageId, expectedRevision: current.revision, requestKey,
          priceConfirmed: true, externalTransferConfirmed: true,
        }, controller.signal)
        applyAuthoritativeReplacement(workspaceId, prepared)
        const authoritativePage = pageFor(workspaceId, pageId)
        const execution = Object.values(authoritativePage.remoteExecutions).find((item) => item.requestKey === requestKey)
        if (!execution) throw new Error('Prepared professional execution is missing')
        assertProfessionalConfiguration(configurationGeneration)
        const result = await remote.continueProfessional({
          workspaceId, taskId: pageId, executionId: execution.executionId,
        }, controller.signal)
        const applied = applyAuthoritativeReplacement(workspaceId, result)
        const finalExecution = pageFor(workspaceId, pageId).remoteExecutions[execution.executionId]
        updatePageOperation(workspaceId, pageId, {
          activeOperation: null,
          requestKey: ['completed', 'failed'].includes(finalExecution.status) ? null : requestKey,
          priceConfirmed: false,
          externalTransferConfirmed: false,
          feedback: finalExecution.status === 'completed' ? 'professional-completed' : finalExecution.status,
        })
        return applied
      } catch (error) {
        if (!closing && !disposed) {
          updatePageOperation(workspaceId, pageId, {
            activeOperation: null,
            error: errorMessage(error),
            errorCode: typeof error?.code === 'string' ? error.code : null,
            feedback: operationErrorFeedback(error),
          })
        }
        throw error
      }
    },

    async continueProfessional(workspaceId, pageId, executionId) {
      assertProfessionalConfiguration()
      const configurationGeneration = professionalConfigurationGeneration
      return runPageOperation(
        workspaceId,
        pageId,
        'professional-continue',
        () => {
          assertProfessionalConfiguration(configurationGeneration)
          return remote.continueProfessional({ workspaceId, taskId: pageId, executionId }, controller.signal)
        },
        (applied) => {
          const execution = applied.pages.find((item) => item.pageId === pageId)?.remoteExecutions[executionId]
          return {
            requestKey: execution && ['completed', 'failed'].includes(execution.status) ? null : operationFor(applied, pageId).requestKey,
            feedback: execution?.status === 'completed' ? 'professional-completed' : execution?.status ?? null,
          }
        },
      )
    },

    async stopProfessional(workspaceId, pageId, executionId) {
      assertOpen()
      assertKnown(workspaceId)
      pageFor(workspaceId, pageId)
      if (remote === null || typeof remote.stopProfessional !== 'function') throw new Error('Professional service requires the Oasis Host')
      return remote.stopProfessional({ workspaceId, taskId: pageId, executionId }, controller.signal)
    },

    async observeRunningWater(workspaceId, pageId, runId) {
      assertOpen()
      assertKnown(workspaceId)
      pageFor(workspaceId, pageId)
      if (remote === null || typeof remote.observeRunningWater !== 'function') {
        throw new Error('Running-water observation requires the Oasis Host')
      }
      const existing = operationFor(getCurrent(workspaceId), pageId)
      if (existing.activeOperation !== null || existing.runningWaterStatus === 'loading') {
        throw new Error('another page operation is already in progress')
      }
      const entry = {
        key: JSON.stringify([workspaceId, pageId]), workspaceId, pageId, controller: new AbortController(),
      }
      pendingObservations.set(entry.key, entry)
      updatePageOperation(workspaceId, pageId, {
        activeOperation: 'running-water-observe',
        runningWaterStatus: 'loading', runningWaterObservation: null,
        error: null, errorCode: null,
      })
      try {
        if (!observationIsCurrent(entry)) return undefined
        const observation = await remote.observeRunningWater(
          { workspaceId, taskId: pageId, runId },
          entry.controller.signal,
        )
        if (observationIsCurrent(entry)) {
          updatePageOperation(workspaceId, pageId, {
            activeOperation: null,
            runningWaterStatus: 'ready', runningWaterObservation: observation,
          })
        }
        return observation
      } catch (error) {
        if (observationIsCurrent(entry)) {
          updatePageOperation(workspaceId, pageId, {
            activeOperation: null,
            runningWaterStatus: 'error', runningWaterObservation: null,
            error: errorMessage(error), errorCode: typeof error?.code === 'string' ? error.code : null,
          })
        }
        throw error
      } finally {
        if (pendingObservations.get(entry.key) === entry) pendingObservations.delete(entry.key)
      }
    },

    setMaterialDraft(workspaceId, pageId, materialPath, confirmed) {
      return updatePageOperation(workspaceId, pageId, {
        materialPath: String(materialPath), materialConfirmed: confirmed === true,
        error: null, errorCode: null, feedback: null,
      })
    },

    async addMaterial(workspaceId, pageId) {
      const operation = operationFor(getCurrent(workspaceId), pageId)
      if (operation.materialConfirmed !== true) throw new Error('Material confirmation is required')
      if (operation.materialPath.trim().length === 0) throw new Error('Material path is required')
      return runPageOperation(
        workspaceId,
        pageId,
        'material-add',
        (current) => remote.addMaterial({
          workspaceId,
          taskId: pageId,
          expectedRevision: current.revision,
          relativePath: operation.materialPath.trim(),
          confirmed: true,
        }, controller.signal),
        () => ({
          materialPath: '', materialConfirmed: false, materialsChanged: false, feedback: 'material-added',
        }),
      )
    },

    async refreshMaterial(workspaceId, pageId, referenceId) {
      return runPageOperation(
        workspaceId,
        pageId,
        'material-refresh',
        (current) => remote.refreshMaterial({
          workspaceId, taskId: pageId, referenceId, expectedRevision: current.revision,
        }, controller.signal),
        () => ({
          materialsChanged: false,
          externalTransferConfirmed: false,
          feedback: 'material-refreshed',
        }),
      )
    },

    async removeMaterial(workspaceId, pageId, referenceId, confirmed) {
      if (confirmed !== true) throw new Error('Material removal confirmation is required')
      return runPageOperation(
        workspaceId,
        pageId,
        'material-remove',
        (current) => remote.removeMaterial({
          workspaceId, taskId: pageId, referenceId, expectedRevision: current.revision,
        }, controller.signal),
        () => ({
          materialsChanged: false,
          externalTransferConfirmed: false,
          feedback: 'material-removed',
        }),
      )
    },

    async createRun(workspaceId, pageId, confirmed = false) {
      const page = pageFor(workspaceId, pageId)
      if (page.generation) {
        if (page.generation.source === 'oasis-api' && !getCurrent(workspaceId).unifiedFixtureEnabled
          && getCurrent(workspaceId).apiExecutionAvailable) return store.createApiRun(workspaceId, pageId, confirmed)
        const local = getCurrent(workspaceId).localGenerationEnabled && page.generation.source === 'local-skill'
        if (!local && !getCurrent(workspaceId).unifiedFixtureEnabled) throw new Error(generationUnavailableReason(page.generation.source))
        assertInputEditable(workspaceId, pageId)
        const real = local && getCurrent(workspaceId).localGenerationKind === 'native-model'
        if (real && !confirmed) {
          updatePageOperation(workspaceId, pageId, { activeOperation: 'model-preview', localModelPreview: null, error: null })
          try {
            await flushWorkspace(workspaceId)
            const current = getCurrent(workspaceId)
            if (current.syncStatus !== 'ready') throw new Error('请先保存材料再确认')
            const generation = runtimeFor(workspaceId).editGeneration
            const configurationGeneration = professionalConfigurationGeneration
            const sessionId = getGenerationSession?.(workspaceId)
            const preview = await remote.prepareLocalRun({ workspaceId, taskId: pageId, sessionId, expectedRevision: current.revision }, controller.signal)
            if (closing || disposed) return
            if (professionalConfigurationGeneration !== configurationGeneration
              || runtimeFor(workspaceId).editGeneration !== generation || getCurrent(workspaceId).revision !== current.revision
              || getGenerationSession?.(workspaceId) !== sessionId) throw new Error('材料或会话已变更，请重新确认')
            updatePageOperation(workspaceId, pageId, { localModelPreview: preview })
            return getCurrent(workspaceId)
          } catch (error) {
            if (!closing && !disposed) updatePageOperation(workspaceId, pageId, { error: errorMessage(error) })
            throw error
          } finally {
            if (!closing && !disposed) updatePageOperation(workspaceId, pageId, { activeOperation: null })
          }
        }
        const preview = real ? operationFor(getCurrent(workspaceId), pageId).localModelPreview : null
        if (real && (!preview || preview.expectedRevision !== getCurrent(workspaceId).revision
          || preview.sessionId !== getGenerationSession?.(workspaceId))) throw new Error('请重新确认当前模型与材料')
        const requestKey = createRequestKey()
        updatePageOperation(workspaceId, pageId, { requestKey })
        try {
          return await runPageOperation(workspaceId, pageId, 'run-create', current => {
            const payload = { workspaceId, taskId: pageId, expectedRevision: current.revision, requestKey }
            return local ? remote.createLocalRun({ ...payload, sessionId: getGenerationSession?.(workspaceId),
              ...(real ? { confirmation: { sha256: preview.sha256, confirmed: true } } : {}) }, controller.signal)
              : remote.createUnifiedRun(payload, controller.signal)
          }, () => ({ requestKey: null, localModelPreview: null, feedback: local ? 'run-prepared' : 'run-completed', generationUncertain: false }))
        } catch (error) {
          const notStarted = real && ['GENERATION_CONFIRMATION_REQUIRED', 'GENERATION_CONFIRMATION_STALE',
            'GENERATION_CONTEXT_UNAVAILABLE', 'GENERATION_NOT_ENABLED', 'BUILTIN_SKILL_UNAVAILABLE'].includes(error?.code)
          if (!closing && !disposed) updatePageOperation(workspaceId, pageId, { generationUncertain: !notStarted, localModelPreview: null })
          throw error
        }
      }
      if (page.workflowId === null) throw new Error('A workflow must be selected before generation')
      const operation = operationFor(getCurrent(workspaceId), pageId)
      const requestKey = operation.requestKey ?? createRequestKey()
      if (typeof requestKey !== 'string' || requestKey.length === 0) {
        throw new Error('createRequestKey must return a non-empty string')
      }
      updatePageOperation(workspaceId, pageId, { requestKey })
      return runPageOperation(
        workspaceId,
        pageId,
        'run-create',
        (current) => remote.createRun({
          workspaceId, taskId: pageId, expectedRevision: current.revision, requestKey,
        }, controller.signal),
        () => ({ requestKey: null, materialsChanged: false, feedback: 'run-completed' }),
      )
    },

    async createApiRun(workspaceId, pageId, confirmed = false) {
      assertOpen(); assertKnown(workspaceId); assertInputEditable(workspaceId, pageId); assertProfessionalConfiguration()
      const page = pageFor(workspaceId, pageId)
      if (!getCurrent(workspaceId).apiExecutionAvailable || page.workflowVersion !== '2' || page.generation?.source !== 'oasis-api') throw new Error('当前任务不支持专业 API 执行')
      const configurationGeneration = professionalConfigurationGeneration
      const sessionId = getGenerationSession?.(workspaceId)
      if (!confirmed) {
        updatePageOperation(workspaceId, pageId, { activeOperation: 'api-preview', apiPreview: null, error: null, errorCode: null })
        try {
          await flushWorkspace(workspaceId)
          const current = getCurrent(workspaceId), generation = runtimeFor(workspaceId).editGeneration
          if (current.syncStatus !== 'ready') throw new Error('请先保存材料再确认')
          const binding = await remote.getWorkspaceBinding({ workspaceId }, controller.signal)
          assertProfessionalConfiguration(configurationGeneration)
          const payload = { workspaceId, taskId: pageId, expectedRevision: current.revision, expectedSettingsRevision: binding.settingsRevision }
          const prepared = await remote.prepareClaimsApi({ ...payload, remoteReadConfirmed: true }, controller.signal)
          const preview = await remote.previewClaimsApi({ ...payload, preparationSha256: prepared.preparationSha256, remoteReadConfirmed: true }, controller.signal)
          if (closing || disposed) return
          assertProfessionalConfiguration(configurationGeneration)
          if (runtimeFor(workspaceId).editGeneration !== generation || getCurrent(workspaceId).revision !== current.revision
            || getGenerationSession?.(workspaceId) !== sessionId) throw new Error('材料或当前项目已变更，请重新确认')
          updatePageOperation(workspaceId, pageId, { apiPreview: preview, apiSessionId: sessionId })
          return getCurrent(workspaceId)
        } catch (error) {
          if (!closing && !disposed) updatePageOperation(workspaceId, pageId, { error: errorMessage(error), errorCode: error?.code ?? null, apiPreview: null })
          throw error
        } finally { if (!closing && !disposed) updatePageOperation(workspaceId, pageId, { activeOperation: null }) }
      }
      const operation = operationFor(getCurrent(workspaceId), pageId), preview = operation.apiPreview
      if (!preview || preview.expectedRevision !== getCurrent(workspaceId).revision || Date.parse(preview.expiresAt) <= Date.now()
        || sessionId !== operation.apiSessionId) throw new Error('请重新核对 API 与材料，再明确确认')
      const requestKey = createRequestKey()
      let admitted = false
      try {
        return await runPageOperation(workspaceId, pageId, 'api-create', async current => {
          assertProfessionalConfiguration(configurationGeneration)
          if (current.revision !== preview.expectedRevision || getGenerationSession?.(workspaceId) !== sessionId) throw new Error('确认范围已改变')
          admitted = true
          const started = await remote.startClaimsApi({ workspaceId, taskId: pageId, expectedRevision: current.revision,
            expectedSettingsRevision: preview.expectedSettingsRevision, confirmationToken: preview.confirmationToken, requestKey,
            priceConfirmed: true, externalTransferConfirmed: true }, controller.signal)
          applyAuthoritativeReplacement(workspaceId, started)
          if (!started.committed) return started
          const execution = Object.values(started.current.tasks[pageId].remoteExecutions).find(e => e.requestKey === requestKey)
          if (!execution) throw new Error('API 执行检查点未确认；请查看原运行')
          assertProfessionalConfiguration(configurationGeneration)
          return remote.continueProfessional({ workspaceId, taskId: pageId, executionId: execution.executionId }, controller.signal)
        }, () => ({ apiPreview: null, requestKey: null, generationUncertain: false, feedback: 'run-observed' }))
      } catch (error) {
        if (!closing && !disposed) updatePageOperation(workspaceId, pageId, { apiPreview: null, generationUncertain: admitted })
        throw error
      }
    },

    setReviewNote(workspaceId, pageId, note) {
      return updatePageOperation(workspaceId, pageId, {
        reviewNote: String(note), error: null, errorCode: null, feedback: null,
      })
    },

    async observeUnifiedRun(workspaceId, pageId) {
      return runPageOperation(workspaceId, pageId, 'run-observe', async current => {
        const page = pageFor(workspaceId, pageId)
        const api = Object.values(page.remoteExecutions).find(e => e.unifiedClaims && isOasisRemoteExecutionUnresolved(e))
        if (api?.submittedAt === null && ['uploading', 'auth-required'].includes(api.status)) {
          // The Host only closes an orphan upload intent here; it never reads credentials or dispatches an upload.
          return remote.continueProfessional({ workspaceId, taskId: pageId, executionId: api.executionId }, controller.signal)
        }
        if (api?.submittedAt) {
          assertProfessionalConfiguration()
          return remote.continueProfessional({ workspaceId, taskId: pageId, executionId: api.executionId }, controller.signal)
        }
        const pending = Object.values(page.runs).find(run => run.mode === 'dsh-local' && ['prepared', 'unknown'].includes(run.status))
        return pending ? remote.observeLocalRun({ workspaceId, taskId: pageId, runId: pending.runId, expectedRevision: current.revision }, controller.signal)
          : { committed: true, current: await remote.get(workspaceId, controller.signal) }
      }, () => ({ generationUncertain: false, requestKey: null, feedback: 'run-observed' }))
    },
    async stopUnifiedRun(workspaceId, pageId, runId) {
      if (pageFor(workspaceId, pageId).remoteExecutions[runId]?.unifiedClaims) {
        return runPageOperation(workspaceId, pageId, 'api-stop', async () => {
          await remote.stopProfessional({ workspaceId, taskId: pageId, executionId: runId }, controller.signal)
          return { committed: true, current: await remote.get(workspaceId, controller.signal) }
        }, () => ({ generationUncertain: false, apiPreview: null }))
      }
      return runPageOperation(workspaceId, pageId, 'run-stop', current => remote.stopUnifiedRun({
        workspaceId, taskId: pageId, runId, expectedRevision: current.revision,
      }, controller.signal), () => ({ generationUncertain: false, requestKey: null, feedback: 'run-stopped' }))
    },
    async editUnifiedResult(workspaceId, pageId, runId, body) {
      assertInputEditable(workspaceId, pageId)
      const run = pageFor(workspaceId, pageId).runs[runId]
      if (!run || run.status !== 'completed') throw new Error('请选择已完成版本')
      const requestKey = createRequestKey()
      return runPageOperation(workspaceId, pageId, 'result-edit', current => remote.editUnifiedResult({
        workspaceId, taskId: pageId, runId, artifactId: run.result.artifact.artifactId,
        expectedRevision: current.revision, requestKey, body,
      }, controller.signal), () => ({ feedback: 'result-edited', writebackPlan: null, writebackConfirmed: false, reviewNote: '' }))
    },
    async useInConversation(workspaceId, pageId, runId) {
      if (!conversationDrafts) throw new Error('当前对话输入接口不可用')
      const target = conversationDrafts.capture(workspaceId)
      const run = pageFor(workspaceId, pageId).runs[runId]
      if (!run?.result || run.review.status !== 'approved') throw new Error('请先审核所选版本')
      await flushWorkspace(workspaceId)
      const current = getCurrent(workspaceId)
      const result = await remote.prepareConversationDraft({ workspaceId, taskId: pageId, runId,
        artifactId: run.result.artifact.artifactId, expectedRevision: current.revision }, controller.signal)
      if (closing || disposed) return false
      const latest = getCurrent(workspaceId)
      const page = latest.pages.find(item => item.pageId === pageId)
      if (latest.syncStatus !== 'ready' || latest.revision !== current.revision || latest.activePageId !== pageId
        || page?.activeRunId !== runId || page.runs[runId]?.review.status !== 'approved') {
        throw new Error('当前任务或审核版本已变化，请重新准备对话资料')
      }
      conversationDrafts.insert(target, result)
      updatePageOperation(workspaceId, pageId, { feedback: 'conversation-draft-ready' })
      return true
    },
    async openSavedFile(workspaceId, pageId, runId, writebackId) {
      const target = nativeFiles?.captureSavedFileTarget(workspaceId)
      if (!target) throw new Error('安全文件预览不可用')
      const run = pageFor(workspaceId, pageId).runs[runId]
      if (!run?.result || run.review.status !== 'approved' || !run.writebacks.some(item => item.writebackId === writebackId)) {
        throw new Error('请选择已审核并保存的版本')
      }
      await flushWorkspace(workspaceId)
      const current = getCurrent(workspaceId)
      const result = await remote.resolveSavedFile({ workspaceId, taskId: pageId, runId, writebackId,
        artifactId: run.result.artifact.artifactId, expectedRevision: current.revision }, controller.signal)
      if (closing || disposed) return false
      const latest = getCurrent(workspaceId)
      const page = latest.pages.find(item => item.pageId === pageId)
      if (latest.revision !== current.revision || latest.activePageId !== pageId || page?.activeRunId !== runId
        || !nativeFiles.openSavedFile(target, result)) throw new Error('当前任务或项目已变化，请重新打开文件')
      return true
    },

    async reviewRun(workspaceId, pageId, runId, status, note) {
      const page = pageFor(workspaceId, pageId)
      const run = page.runs[runId]
      if (!run) throw new Error('unknown run')
      const reviewNote = String(note)
      if (status === 'approved' && run.result.contentStatus === 'blocked') {
        throw new Error('Blocked results cannot be approved')
      }
      if (status === 'changes-requested' && reviewNote.trim().length === 0) {
        throw new Error('Changes-requested review requires a note')
      }
      return runPageOperation(
        workspaceId,
        pageId,
        'run-review',
        (current) => remote.reviewRun({
          workspaceId, taskId: pageId, runId, expectedRevision: current.revision, status, note: reviewNote,
        }, controller.signal),
        () => ({ feedback: status === 'approved' ? 'review-approved' : 'review-changes-requested' }),
      )
    },

    setWritebackDraft(workspaceId, pageId, relativeDirectory, confirmed) {
      return updatePageOperation(workspaceId, pageId, {
        writebackDirectory: String(relativeDirectory),
        writebackConfirmed: confirmed === true,
        writebackPlan: null,
        error: null,
        errorCode: null,
        feedback: null,
      })
    },

    setWritebackConfirmation(workspaceId, pageId, confirmed) {
      return updatePageOperation(workspaceId, pageId, {
        writebackConfirmed: confirmed === true,
        error: null,
        errorCode: null,
      })
    },

    async prepareWriteback(workspaceId, pageId, runId) {
      const page = pageFor(workspaceId, pageId)
      const run = page.runs[runId]
      if (!run) throw new Error('unknown run')
      if (run.result.contentStatus === 'blocked') throw new Error('Blocked results cannot be written back')
      if (run.review.status !== 'approved') throw new Error('An approved run is required before writeback')
      const operation = operationFor(getCurrent(workspaceId), pageId)
      const relativeDirectory = '.'
      if (operation.activeOperation !== null) throw new Error('another page operation is already in progress')
      updatePageOperation(workspaceId, pageId, {
        activeOperation: 'writeback-prepare', error: null, errorCode: null, feedback: null,
        writebackPlan: null, writebackConfirmed: false,
      })
      try {
        await flushWorkspace(workspaceId)
        const current = getCurrent(workspaceId)
        if (current.syncStatus !== 'ready') throw new Error('Workspace is not ready for writeback preparation')
        const prepared = await remote.prepareWriteback({
          workspaceId,
          taskId: pageId,
          runId,
          artifactId: run.result.artifact.artifactId,
          expectedRevision: current.revision,
          relativeDirectory,
        }, controller.signal)
        if (closing || disposed || controller.signal.aborted) return prepared
        updatePageOperation(workspaceId, pageId, {
          activeOperation: null,
          writebackPlan: prepared,
          writebackConfirmed: false,
          feedback: 'writeback-prepared',
        })
        return prepared
      } catch (error) {
        if (!closing && !disposed) {
          updatePageOperation(workspaceId, pageId, {
            activeOperation: null,
            error: errorMessage(error),
            errorCode: typeof error?.code === 'string' ? error.code : null,
            feedback: operationErrorFeedback(error),
          })
        }
        throw error
      }
    },

    async commitWriteback(workspaceId, pageId) {
      const operation = operationFor(getCurrent(workspaceId), pageId)
      if (!operation.writebackPlan) throw new Error('Writeback must be prepared before commit')
      if (operation.writebackConfirmed !== true) throw new Error('Writeback confirmation is required')
      const confirmationToken = operation.writebackPlan.confirmationToken
      return runPageOperation(
        workspaceId,
        pageId,
        'writeback-commit',
        () => remote.commitWriteback(confirmationToken, controller.signal),
        () => ({
          writebackPlan: null,
          writebackConfirmed: false,
          feedback: 'writeback-success',
        }),
      )
    },

    renamePage(workspaceId, pageId, title) {
      return dispatch(workspaceId, { type: 'rename-page', pageId, title })
    },

    activatePage(workspaceId, pageId) {
      return dispatch(workspaceId, { type: 'activate-page', pageId })
    },

    activateRun(workspaceId, pageId, runId) {
      return dispatch(workspaceId, { type: 'activate-run', pageId, runId })
    },

    closePage(workspaceId, pageId) {
      if (pageFor(workspaceId, pageId).generation) assertInputEditable(workspaceId, pageId)
      return dispatch(workspaceId, { type: 'close-page', pageId })
    },

    dispose() {
      if (disposePromise) return disposePromise
      closing = true
      for (const entry of pendingObservations.values()) invalidateObservation(entry)
      const drains = Promise.all(
        [...knownWorkspaceIds].map((workspaceId) => flushWorkspaceInternal(workspaceId)),
      )
      const bestEffortDrains = drains.catch(() => undefined)
      let deadlineTimer = null
      const deadline = new Promise((resolveDeadline) => {
        deadlineTimer = scheduler.setTimeout(resolveDeadline, disposeDrainMs)
      })
      disposePromise = (async () => {
        try {
          await Promise.race([bestEffortDrains, deadline])
        } finally {
          if (deadlineTimer !== null) scheduler.clearTimeout(deadlineTimer)
          deadlineTimer = null
          controller.abort()
          disposed = true
          for (const runtime of runtimes.values()) {
            runtime.pendingActions.length = 0
            runtime.pendingDraft = null
            clearScheduledSave(runtime)
            runtime.hydrationPromise = null
            runtime.catalogPromise = null
            runtime.professionalPromise = null
            runtime.drainPromise = null
          }
          knownWorkspaceIds.clear()
          states.clear()
          runtimes.clear()
          listeners.clear()
        }
      })()
      return disposePromise
    },
  }

  return Object.freeze(store)
}
