export const OASIS_BETTER_SIDEBAR_TAB_ID = 'oasis-professional-service:workbench'

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
  let snapshot = Object.freeze({
    mode: 'standalone',
    reasonCode: null,
    serviceVersion: null,
    serviceFeatures: Object.freeze([]),
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

  function attachBetterSidebar(nextService, descriptor) {
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

    let detached = false
    currentDetach = () => {
      if (detached) return
      detached = true
      publish({ mode: 'releasing', reasonCode: null })
      layoutAdapter.releaseStandalone('better-sidebar-releasing')
      const registeredDisposer = registrationDisposer
      service = null
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
        path: '.oasis/professional-workbench',
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

  return Object.freeze({
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot() { return snapshot },
    expectBetterSidebar,
    attachBetterSidebar,
    openBetterSidebar,
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
