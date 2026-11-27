export const OASIS_BETTER_SIDEBAR_TAB_ID = 'oasis-professional-service:workbench'
const nativeToolIds = ['editor', 'subagent', 'sidechat', 'browser']

const HOST_MODES = Object.freeze([
  'standalone',
  'integrating',
  'better-sidebar',
  'releasing',
  'blocked',
])

function pendingWorkspaceContext(generation = 0) {
  return Object.freeze({
    status: 'pending',
    reasonCode: 'workspace-bridge-pending',
    generation,
    currentSessionId: null,
    workspaceItems: Object.freeze([]),
  })
}

function validService(service) {
  return service !== null
    && typeof service === 'object'
    && typeof service.registerTab === 'function'
    && typeof service.openTab === 'function'
}

function validDescriptor(descriptor) {
  return descriptor !== null
    && typeof descriptor === 'object'
    && descriptor.id === OASIS_BETTER_SIDEBAR_TAB_ID
    && descriptor.single === true
    && typeof descriptor.component === 'function'
}

export function createPanelHostCoordinator({ layoutAdapter } = {}) {
  if (!layoutAdapter || typeof layoutAdapter.releaseStandalone !== 'function') {
    throw new TypeError('layoutAdapter.releaseStandalone is required')
  }

  const listeners = new Set()
  let disposed = false
  let expectsBetterSidebar = false
  let service = null
  let registrationDisposer = null
  let currentDetach = null
  let serviceContext = null
  let nativeDisposers = []
  let snapshot = Object.freeze({
    mode: 'standalone',
    reasonCode: null,
    serviceVersion: null,
    serviceFeatures: Object.freeze([]),
    nativeRevision: 0,
    workspaceContext: pendingWorkspaceContext(),
  })

  function publish(next) {
    if (disposed) return snapshot
    const normalized = Object.freeze({ ...snapshot, ...next })
    if (!HOST_MODES.includes(normalized.mode)) throw new Error(`invalid panel host mode: ${normalized.mode}`)
    const changed = Object.keys(normalized).some((key) => normalized[key] !== snapshot[key])
    if (!changed) return snapshot
    snapshot = normalized
    for (const listener of [...listeners]) listener()
    return snapshot
  }

  function block(reasonCode) {
    layoutAdapter.releaseStandalone(reasonCode)
    return publish({
      mode: 'blocked',
      reasonCode,
      serviceVersion: service === null ? null : snapshot.serviceVersion,
      serviceFeatures: service === null ? Object.freeze([]) : snapshot.serviceFeatures,
    })
  }

  function reconcileExternalState() {
    if (disposed) return snapshot
    if (service !== null && registrationDisposer !== null) {
      if (snapshot.mode === 'blocked') return snapshot
      return publish({ mode: 'better-sidebar', reasonCode: null })
    }
    if (snapshot.mode === 'blocked') return snapshot
    return publish({
      mode: expectsBetterSidebar ? 'integrating' : 'standalone',
      reasonCode: null,
      serviceVersion: null,
      serviceFeatures: Object.freeze([]),
    })
  }

  function expectBetterSidebar() {
    if (disposed) return snapshot
    expectsBetterSidebar = true
    layoutAdapter.releaseStandalone('better-sidebar-expected')
    if (snapshot.mode === 'blocked') return snapshot
    return reconcileExternalState()
  }

  function attachBetterSidebar(nextService, descriptor, context = null) {
    if (disposed) return () => {}
    if (!validService(nextService)) {
      block('better-sidebar-service-invalid')
      return () => {}
    }
    if (!validDescriptor(descriptor)) {
      block('better-sidebar-descriptor-invalid')
      return () => {}
    }
    expectsBetterSidebar = true
    if (service === nextService && currentDetach !== null) return currentDetach
    if (service !== null || registrationDisposer !== null) {
      block('better-sidebar-service-replaced-without-release')
      return currentDetach ?? (() => {})
    }

    publish({ mode: 'integrating', reasonCode: null })
    layoutAdapter.releaseStandalone('better-sidebar-integrating')

    let disposer
    try {
      disposer = nextService.registerTab(descriptor)
    } catch {
      block('better-sidebar-registration-failed')
      return () => {}
    }
    if (typeof disposer !== 'function') {
      block('better-sidebar-registration-disposer-invalid')
      return () => {}
    }

    service = nextService
    serviceContext = context
    registrationDisposer = disposer
    const features = Array.isArray(nextService.features)
      ? Object.freeze(nextService.features.filter((value) => typeof value === 'string'))
      : Object.freeze([])
    publish({
      mode: 'better-sidebar',
      reasonCode: null,
      serviceVersion: typeof nextService.version === 'string' ? nextService.version : 'unknown',
      serviceFeatures: features,
    })
    const changed = () => publish({ nativeRevision: snapshot.nativeRevision + 1 })
    for (const subscribe of [nextService.subscribe, features.includes('stateSubscription') ? nextService.subscribeState : null]) {
      if (typeof subscribe === 'function') {
        const cleanup = subscribe.call(nextService, changed)
        if (typeof cleanup === 'function') nativeDisposers.push(cleanup)
      }
    }

    let detached = false
    currentDetach = () => {
      if (detached) return
      detached = true
      publish({ mode: 'releasing', reasonCode: null })
      layoutAdapter.releaseStandalone('better-sidebar-releasing')
      const registeredDisposer = registrationDisposer
      for (const cleanup of nativeDisposers.splice(0)) { try { cleanup() } catch {} }
      service = null
      serviceContext = null
      registrationDisposer = null
      currentDetach = null
      try {
        registeredDisposer()
      } catch {
        publish({
          mode: 'blocked',
          reasonCode: 'better-sidebar-registration-dispose-failed',
          serviceVersion: null,
          serviceFeatures: Object.freeze([]),
        })
        return
      }
      reconcileExternalState()
    }
    return currentDetach
  }

  function openBetterSidebar(sessionId) {
    if (disposed || snapshot.mode !== 'better-sidebar' || !validService(service)) return false
    if (typeof sessionId !== 'string' || sessionId.length === 0) return false
    if (!snapshot.serviceFeatures.includes('targetedOpen')) return false
    layoutAdapter.releaseStandalone('better-sidebar-open')
    try {
      const seed = {
        type: OASIS_BETTER_SIDEBAR_TAB_ID,
      }
      service.openTab(seed, { sessionId })
      return true
    } catch {
      const detach = currentDetach
      detach?.()
      block('better-sidebar-open-failed')
      return false
    }
  }

  function nativeScope(workspaceId, type) {
    if (disposed || snapshot.mode !== 'better-sidebar' || !nativeToolIds.includes(type)
      || !snapshot.serviceFeatures.includes('targetedOpen')) return null
    const context = snapshot.workspaceContext
    if (context.status !== 'ready' || !context.currentSessionId) return null
    const owners = context.workspaceItems.filter(item => item.sessionIds?.includes(context.currentSessionId))
    if (owners.length !== 1 || owners[0].workspaceId !== workspaceId) return null
    try {
      const tab = service.getTabs?.().find(item => item.id === type && !item.hidden)
      if (!tab || service.isTabEnabled?.(type) !== true) return null
      const scope = { sessionId: context.currentSessionId }
      if (tab.available) {
        const view = service.getSnapshot?.()
        if (!serviceContext || view?.sessionId !== scope.sessionId || !view.state
          || tab.available(serviceContext, scope, view.state) !== true) return null
      }
      return scope
    } catch { return null }
  }

  function openNativeTool(workspaceId, type) {
    const scope = nativeScope(workspaceId, type)
    if (!scope) return false
    try { service.openTab({ type }, scope); return true } catch { return false }
  }

  function captureSavedFileTarget(workspaceId) {
    const scope = nativeScope(workspaceId, 'editor')
    if (!scope || !snapshot.serviceFeatures.includes('safeFilePreview')
      || !snapshot.serviceFeatures.includes('openFile') || typeof service?.openFile !== 'function') return null
    return Object.freeze({ workspaceId, scope, context: snapshot.workspaceContext, service })
  }

  function openSavedFile(target, file) {
    if (!target || target.context !== snapshot.workspaceContext || target.service !== service
      || file?.workspaceId !== target.workspaceId || file.kind !== 'current-file'
      || typeof file.absolutePath !== 'string' || !captureSavedFileTarget(target.workspaceId)) return false
    try { service.openFile(target.scope, file.absolutePath, undefined, { safePreview: true }); return true } catch { return false }
  }

  return Object.freeze({
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot() { return snapshot },
    expectBetterSidebar,
    attachBetterSidebar,
    openBetterSidebar,
    openNativeTool,
    captureSavedFileTarget,
    openSavedFile,
    nativeAvailability(workspaceId) {
      return Object.fromEntries(nativeToolIds.map(id => [id, nativeScope(workspaceId, id) !== null]))
    },
    reconcileExternalState,
    updateWorkspaceContext(context) {
      if (!context || typeof context !== 'object') throw new TypeError('workspace context is required')
      return publish({ workspaceContext: context })
    },
    clearWorkspaceContext() {
      return publish({ workspaceContext: pendingWorkspaceContext(snapshot.workspaceContext.generation + 1) })
    },
    block,
    dispose() {
      if (disposed) return
      currentDetach?.()
      layoutAdapter.releaseStandalone('panel-host-coordinator-disposed')
      listeners.clear()
      disposed = true
    },
  })
}
