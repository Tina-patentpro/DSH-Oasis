import {
  createInitialWorkspaceState,
  recordToWorkspaceState,
  reduceWorkspaceState,
  workspaceStateToDraft,
} from './workbench-model.js'

export const EMPTY_WORKSPACE_STATE = createInitialWorkspaceState(null)

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
  clock = () => new Date().toISOString(),
} = {}) {
  const knownWorkspaceIds = new Set()
  const states = new Map()
  const runtimes = new Map()
  const listeners = new Set()
  const controller = new AbortController()
  const reducerEnvironment = { createId, now: clock }
  let disposed = false

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
        drainPromise: null,
        pendingActions: [],
        saveQueue: [],
      }
      runtimes.set(workspaceId, runtime)
    }
    return runtime
  }

  function publish() {
    if (disposed) return
    for (const listener of [...listeners]) listener()
  }

  function setState(workspaceId, next) {
    const current = states.get(workspaceId)
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
    return states.get(workspaceId) ?? createInitialWorkspaceState(
      workspaceId,
      remote === null ? 'ready' : 'idle',
    )
  }

  function ensureRecordIdentity(workspaceId, state) {
    if (state.workspaceId !== workspaceId) {
      throw new Error(`Workspace response identity mismatch: expected ${workspaceId}`)
    }
    return state
  }

  function drainWorkspace(workspaceId) {
    const runtime = runtimeFor(workspaceId)
    if (runtime.drainPromise || remote === null || disposed) return runtime.drainPromise

    runtime.drainPromise = (async () => {
      while (runtime.saveQueue.length > 0 && !disposed) {
        const current = getCurrent(workspaceId)
        if (current.syncStatus === 'conflict' || current.syncStatus === 'error') {
          runtime.saveQueue.length = 0
          break
        }

        const draft = runtime.saveQueue.shift()
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
              syncStatus: runtime.saveQueue.length > 0 ? 'saving' : 'ready',
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
            runtime.saveQueue.length = 0
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
          runtime.saveQueue.length = 0
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

  function persistReadyAction(workspaceId, action) {
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
      const runtime = runtimeFor(workspaceId)
      runtime.saveQueue.push(workspaceStateToDraft(saving))
      drainWorkspace(workspaceId)
    }
    return saving
  }

  async function hydrateWorkspace(workspaceId, { force = false } = {}) {
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
        let hydrated = ensureRecordIdentity(workspaceId, recordToWorkspaceState(record))
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
        runtime.saveQueue.push(workspaceStateToDraft(saving))
        drainWorkspace(workspaceId)
        return saving
      } catch (error) {
        if (disposed || controller.signal.aborted) return getCurrent(workspaceId)
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
      const nextIds = new Set(
        Array.isArray(workspaceItems)
          ? workspaceItems.map((item) => item?.workspaceId).filter((id) => typeof id === 'string')
          : [],
      )
      knownWorkspaceIds.clear()
      for (const id of nextIds) {
        knownWorkspaceIds.add(id)
        if (!states.has(id)) {
          states.set(id, createInitialWorkspaceState(id, remote === null ? 'ready' : 'idle'))
        }
      }
    },

    subscribe(listener) {
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

    async reloadWorkspace(workspaceId) {
      assertKnown(workspaceId)
      const runtime = runtimeFor(workspaceId)
      runtime.pendingActions.length = 0
      runtime.saveQueue.length = 0
      return hydrateWorkspace(workspaceId, { force: true })
    },

    async whenSettled(workspaceId) {
      assertKnown(workspaceId)
      const runtime = runtimeFor(workspaceId)
      while (runtime.hydrationPromise || runtime.drainPromise) {
        if (runtime.hydrationPromise) await runtime.hydrationPromise
        if (runtime.drainPromise) await runtime.drainPromise
      }
      return getCurrent(workspaceId)
    },

    setPanelMode(workspaceId, panelMode) {
      return dispatch(workspaceId, { type: 'set-panel-mode', panelMode })
    },

    setLocalPanelMode(workspaceId, panelMode) {
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
      return dispatch(workspaceId, { type: 'select-workflow', pageId, workflowId })
    },

    renamePage(workspaceId, pageId, title) {
      return dispatch(workspaceId, { type: 'rename-page', pageId, title })
    },

    activatePage(workspaceId, pageId) {
      return dispatch(workspaceId, { type: 'activate-page', pageId })
    },

    closePage(workspaceId, pageId) {
      return dispatch(workspaceId, { type: 'close-page', pageId })
    },

    dispose() {
      if (disposed) return
      disposed = true
      controller.abort()
      for (const runtime of runtimes.values()) {
        runtime.pendingActions.length = 0
        runtime.saveQueue.length = 0
      }
      listeners.clear()
    },
  }

  return Object.freeze(store)
}
