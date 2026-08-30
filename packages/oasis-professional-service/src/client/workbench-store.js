import {
  createInitialWorkspaceState,
  recordToWorkspaceState,
  reduceWorkspaceState,
  workspaceStateToDraft,
} from './workbench-model.js'

export const EMPTY_WORKSPACE_STATE = createInitialWorkspaceState(null)

const EMPTY_PAGE_OPERATION = Object.freeze({
  materialPath: '',
  materialConfirmed: false,
  reviewNote: '',
  writebackDirectory: '',
  writebackConfirmed: false,
  writebackPlan: null,
  requestKey: null,
  activeOperation: null,
  error: null,
  errorCode: null,
  feedback: null,
  materialsChanged: false,
  indexWarningManifest: null,
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
  const reducerEnvironment = { createId, now: clock }
  let closing = false
  let disposed = false
  let disposePromise

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
        drainPromise: null,
        pendingActions: [],
        pendingDraft: null,
        saveTimer: null,
        saveGeneration: 0,
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
    })
  }

  function preserveClientState(recordState, current) {
    return stateWith(recordState, {
      catalogStatus: current.catalogStatus,
      catalogError: current.catalogError,
      workflows: current.workflows,
      pageOperations: current.pageOperations,
    })
  }

  function pageFor(workspaceId, pageId) {
    const page = getCurrent(workspaceId).pages.find((item) => item.pageId === pageId)
    if (!page) throw new Error('unknown page')
    return page
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

  function operationErrorFeedback(error) {
    const code = typeof error?.code === 'string' ? error.code : null
    if (code === 'WRITEBACK_COMMITTED_INDEX_FAILED') return 'index-warning'
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
              syncStatus: runtime.pendingDraft !== null ? 'saving' : 'ready',
              syncError: null,
              conflictCurrent: null,
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
      const result = await operation(current)
      if (closing || disposed || controller.signal.aborted) return getCurrent(workspaceId)
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
          }))
          return workflows
        } catch (error) {
          if (!closing && !disposed && !controller.signal.aborted) {
            setState(workspaceId, stateWith(getCurrent(workspaceId), {
              catalogStatus: 'error', catalogError: errorMessage(error), workflows: [],
            }))
          }
          throw error
        } finally {
          runtime.catalogPromise = null
        }
      })()
      return runtime.catalogPromise
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
      return dispatch(workspaceId, { type: 'select-workflow', pageId, workflow })
    },

    updateFormValue(workspaceId, pageId, fieldId, value) {
      return dispatch(workspaceId, { type: 'update-form-value', pageId, fieldId, value })
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
        () => ({ materialsChanged: false, feedback: 'material-refreshed' }),
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
        () => ({ materialsChanged: false, feedback: 'material-removed' }),
      )
    },

    async createRun(workspaceId, pageId) {
      const page = pageFor(workspaceId, pageId)
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

    setReviewNote(workspaceId, pageId, note) {
      return updatePageOperation(workspaceId, pageId, {
        reviewNote: String(note), error: null, errorCode: null, feedback: null,
      })
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
      const relativeDirectory = operation.writebackDirectory.trim()
      if (relativeDirectory.length === 0) throw new Error('Writeback directory is required')
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
      return dispatch(workspaceId, { type: 'close-page', pageId })
    },

    dispose() {
      if (disposePromise) return disposePromise
      closing = true
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
