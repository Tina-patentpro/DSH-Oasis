export const LAYOUT_CONTRACT = 'dsh-0.1.1-rc.2'

const OWNER = 'oasis-professional-service'
const WIDTH_VARIABLE = '--oasis-right-rail-width'
const OWNER_ATTRIBUTE = 'data-oasis-layout-owner'
const CONTRACT_ATTRIBUTE = 'data-oasis-layout-contract'
const PORTAL_ATTRIBUTE = 'data-oasis-panel-portal'
const STYLE_ATTRIBUTE = 'data-oasis-layout-style'
const NARROW_BREAKPOINT = 1024
const MIN_CENTER_WIDTH = 520

const layoutCss = `
#root[${OWNER_ATTRIBUTE}="${OWNER}"] {
  margin-right: var(${WIDTH_VARIABLE}, 0px);
  width: calc(100% - var(${WIDTH_VARIABLE}, 0px));
  transition:
    margin-right var(--ds-transition-duration-slow, 180ms) var(--ds-ease-in-out, ease),
    width var(--ds-transition-duration-slow, 180ms) var(--ds-ease-in-out, ease);
}
[${PORTAL_ATTRIBUTE}] {
  position: fixed;
  inset: 0;
  z-index: 40;
  overflow: hidden;
  pointer-events: none;
}
[${PORTAL_ATTRIBUTE}] [data-oasis-panel] { pointer-events: auto; }
@media (prefers-reduced-motion: reduce) {
  #root[${OWNER_ATTRIBUTE}="${OWNER}"] { transition: none; }
}
`

function one(nodes, reason) {
  return nodes.length === 1 ? { ok: true, node: nodes[0] } : { ok: false, reason }
}

function directFrameChild(frame, node) {
  let current = node
  while (current?.parentElement && current.parentElement !== frame) current = current.parentElement
  return current?.parentElement === frame ? current : null
}

function validRect(rect) {
  return rect && Number.isFinite(rect.left) && Number.isFinite(rect.right)
    && rect.right > rect.left && (rect.width === undefined || rect.width > 0)
}

function validBoundaryRect(rect) {
  return rect && Number.isFinite(rect.left) && Number.isFinite(rect.right)
    && rect.right >= rect.left && (rect.width === undefined || rect.width >= 0)
}

export function detectDshLayout(document, window) {
  if (!document || !window) return { ok: false, reason: 'browser-dom-unavailable' }
  const root = document.getElementById?.('root')
  if (!root) return { ok: false, reason: 'root-missing' }

  const rootSlotResult = one([...root.querySelectorAll('[data-slot="root"]')], 'root-slot-not-unique')
  if (!rootSlotResult.ok) return rootSlotResult
  const overlayResult = one([...document.querySelectorAll('[data-shell-overlay]')], 'shell-overlay-not-unique')
  if (!overlayResult.ok) return overlayResult
  const frame = overlayResult.node.parentElement
  if (!frame || !rootSlotResult.node.contains(frame) || overlayResult.node.parentElement !== frame) {
    return { ok: false, reason: 'app-frame-relationship-invalid' }
  }
  const sidebarResult = one([...frame.querySelectorAll('[data-slot="sidebar"]')], 'sidebar-slot-not-unique')
  if (!sidebarResult.ok) return sidebarResult
  const conversationResult = one([...frame.querySelectorAll('[data-slot="conversation"]')], 'conversation-slot-not-unique')
  if (!conversationResult.ok) return conversationResult
  const sidebarColumn = directFrameChild(frame, sidebarResult.node)
  const conversationColumn = directFrameChild(frame, conversationResult.node)
  if (!sidebarColumn || !conversationColumn || sidebarColumn === conversationColumn) {
    return { ok: false, reason: 'frame-columns-invalid' }
  }
  if (window.getComputedStyle?.(frame)?.display !== 'grid') return { ok: false, reason: 'app-frame-not-grid' }

  const rootRect = root.getBoundingClientRect?.()
  const frameRect = frame.getBoundingClientRect?.()
  const sidebarRect = sidebarColumn.getBoundingClientRect?.()
  const conversationRect = conversationColumn.getBoundingClientRect?.()
  if (![rootRect, frameRect, conversationRect].every(validRect) || !validBoundaryRect(sidebarRect)) {
    return { ok: false, reason: 'layout-geometry-invalid' }
  }

  return {
    ok: true,
    contract: LAYOUT_CONTRACT,
    nodes: {
      root,
      rootSlot: rootSlotResult.node,
      frame,
      overlay: overlayResult.node,
      sidebarSlot: sidebarResult.node,
      sidebarColumn,
      conversationSlot: conversationResult.node,
      conversationColumn,
    },
    rects: { root: rootRect, frame: frameRect, sidebar: sidebarRect, conversation: conversationRect },
  }
}

export function resolveEffectiveMode({ requestedMode, viewportWidth, projectedCenterWidth }) {
  if (!['hidden', 'normal', 'expanded'].includes(requestedMode)) throw new Error(`invalid panel mode: ${requestedMode}`)
  if (requestedMode === 'hidden') return { requestedMode, effectiveMode: 'hidden', status: 'idle' }
  if (viewportWidth < NARROW_BREAKPOINT) {
    return { requestedMode, effectiveMode: 'expanded', status: 'narrow-expanded' }
  }
  if (requestedMode === 'normal' && projectedCenterWidth < MIN_CENTER_WIDTH) {
    return { requestedMode, effectiveMode: 'expanded', status: 'capacity-expanded' }
  }
  return { requestedMode, effectiveMode: requestedMode, status: 'active' }
}

function sameNodeContract(a, b) {
  return a?.ok && b?.ok
    && a.nodes.root === b.nodes.root
    && a.nodes.frame === b.nodes.frame
    && a.nodes.overlay === b.nodes.overlay
    && a.nodes.sidebarColumn === b.nodes.sidebarColumn
    && a.nodes.conversationColumn === b.nodes.conversationColumn
}

export function createLayoutAdapter({
  document = globalThis.document,
  window = globalThis.window,
  watch = true,
} = {}) {
  const listeners = new Set()
  let snapshot = Object.freeze({
    requestedMode: 'hidden',
    effectiveMode: 'hidden',
    status: 'idle',
    reasonCode: null,
    contract: null,
    panelLeft: null,
    panelWidth: 360,
  })
  let portalHost = null
  let styleElement = null
  let ownedRoot = null
  let ownsPush = false
  let disposed = false
  let applying = false
  let lastRequest = null
  let mutationObserver = null
  let resizeObserver = null
  let resizeListener = null
  let scheduledFrame = null
  let verificationTimer = null
  let guardedContract = null

  function publish(next) {
    const normalized = Object.freeze({ ...snapshot, ...next })
    if (JSON.stringify(normalized) === JSON.stringify(snapshot)) return snapshot
    snapshot = normalized
    for (const listener of [...listeners]) listener()
    return snapshot
  }

  function clearScheduled() {
    if (scheduledFrame !== null && window?.cancelAnimationFrame) window.cancelAnimationFrame(scheduledFrame)
    scheduledFrame = null
    if (verificationTimer !== null && window?.clearTimeout) window.clearTimeout(verificationTimer)
    verificationTimer = null
  }

  function stopGuards() {
    mutationObserver?.disconnect?.()
    resizeObserver?.disconnect?.()
    mutationObserver = null
    resizeObserver = null
    if (resizeListener && window?.removeEventListener) window.removeEventListener('resize', resizeListener)
    resizeListener = null
    guardedContract = null
    clearScheduled()
  }

  function clearPush() {
    if (ownedRoot?.getAttribute?.(OWNER_ATTRIBUTE) === OWNER) {
      ownedRoot.removeAttribute(OWNER_ATTRIBUTE)
      ownedRoot.removeAttribute(CONTRACT_ATTRIBUTE)
    }
    if (ownsPush) document?.documentElement?.style?.removeProperty?.(WIDTH_VARIABLE)
    ownedRoot = null
    ownsPush = false
  }

  function ensureStyle() {
    if (styleElement?.isConnected) return styleElement
    const existing = [...(document?.head?.querySelectorAll?.(`[${STYLE_ATTRIBUTE}]`) ?? [])]
    if (existing.length > 0) throw new Error('an Oasis layout style already exists without this adapter ownership')
    styleElement = document.createElement('style')
    styleElement.setAttribute(STYLE_ATTRIBUTE, '')
    styleElement.textContent = layoutCss
    document.head.appendChild(styleElement)
    return styleElement
  }

  function foreignLayoutReason(contract) {
    const owner = contract.nodes.root.getAttribute?.(OWNER_ATTRIBUTE)
    if (owner && owner !== OWNER) return 'foreign-oasis-layout-owner'
    const externalSidebar = document.querySelectorAll?.('[data-dsh-better-sidebar]') ?? []
    if (externalSidebar.length > 0) return 'better-sidebar-present'
    const foreignWidth = document.documentElement.style.getPropertyValue?.(WIDTH_VARIABLE) ?? ''
    if (foreignWidth && !ownsPush) return 'foreign-oasis-width-variable'
    return null
  }

  function fault(reasonCode, status = 'faulted') {
    stopGuards()
    clearPush()
    return publish({ effectiveMode: 'hidden', status, reasonCode, panelLeft: null })
  }

  function scheduleReapply(reasonCode) {
    if (!watch || scheduledFrame !== null || disposed || !window?.requestAnimationFrame) return
    scheduledFrame = window.requestAnimationFrame(() => {
      scheduledFrame = null
      if (!portalHost?.isConnected) {
        fault('portal-host-lost')
        return
      }
      const current = detectDshLayout(document, window)
      if (!sameNodeContract(guardedContract, current)) clearPush()
      if (!current.ok) {
        fault(current.reason, 'incompatible')
        return
      }
      if (lastRequest) apply({ ...lastRequest, reasonCode })
    })
  }

  function startGuards(contract) {
    if (!watch || disposed) return
    stopGuards()
    guardedContract = contract
    const MutationObserverClass = window?.MutationObserver
    if (typeof MutationObserverClass === 'function') {
      mutationObserver = new MutationObserverClass(() => scheduleReapply('dom-change'))
      mutationObserver.observe(contract.nodes.frame, { childList: true })
      mutationObserver.observe(document.body, { childList: true })
    }
    const ResizeObserverClass = window?.ResizeObserver
    if (typeof ResizeObserverClass === 'function') {
      resizeObserver = new ResizeObserverClass(() => scheduleReapply('geometry-change'))
      resizeObserver.observe(contract.nodes.root)
      resizeObserver.observe(contract.nodes.sidebarColumn)
      resizeObserver.observe(contract.nodes.conversationColumn)
    }
    if (window?.addEventListener) {
      resizeListener = () => scheduleReapply('viewport-change')
      window.addEventListener('resize', resizeListener)
    }
  }

  function scheduleNormalVerification(contract, panelElement, baselineSidebar) {
    if (!watch || !panelElement || !window?.setTimeout) return
    verificationTimer = window.setTimeout(() => {
      verificationTimer = null
      if (snapshot.effectiveMode !== 'normal') return
      const current = detectDshLayout(document, window)
      const panelRect = panelElement.getBoundingClientRect?.()
      if (!current.ok || !validRect(panelRect)) {
        fault('normal-post-check-missing')
        return
      }
      const rootDelta = Math.abs((current.rects.root.right ?? 0) - panelRect.left)
      const sidebarLeftDelta = Math.abs(current.rects.sidebar.left - baselineSidebar.left)
      const sidebarWidthDelta = Math.abs((current.rects.sidebar.width ?? current.rects.sidebar.right - current.rects.sidebar.left)
        - (baselineSidebar.width ?? baselineSidebar.right - baselineSidebar.left))
      const conversationOverlap = current.rects.conversation.right - panelRect.left
      const horizontalOverflow = Number(document.documentElement.scrollWidth ?? 0) > Number(document.documentElement.clientWidth ?? Infinity) + 2
      if (rootDelta > 2 || sidebarLeftDelta > 1 || sidebarWidthDelta > 1 || conversationOverlap > 2 || horizontalOverflow) {
        fault('normal-post-check-failed')
      }
    }, 260)
  }

  function apply({ requestedMode, panelWidth = 360, panelElement = null, reasonCode = null }) {
    if (disposed) return publish({ effectiveMode: 'hidden', status: 'faulted', reasonCode: 'adapter-disposed' })
    if (applying) return snapshot
    applying = true
    lastRequest = { requestedMode, panelWidth, panelElement }
    try {
      if (requestedMode === 'hidden') {
        stopGuards()
        clearPush()
        return publish({ requestedMode, effectiveMode: 'hidden', status: 'idle', reasonCode, panelLeft: null, panelWidth })
      }

      const contract = detectDshLayout(document, window)
      if (!contract.ok) return fault(contract.reason, 'incompatible')
      const conflict = foreignLayoutReason(contract)
      if (conflict) return fault(conflict, 'conflict')

      const projectedCenterWidth = contract.rects.conversation.right - contract.rects.conversation.left - panelWidth
      const resolved = resolveEffectiveMode({ requestedMode, viewportWidth: window.innerWidth, projectedCenterWidth })
      ensureStyle()
      if (resolved.effectiveMode === 'normal') {
        ownedRoot = contract.nodes.root
        ownedRoot.setAttribute(OWNER_ATTRIBUTE, OWNER)
        ownedRoot.setAttribute(CONTRACT_ATTRIBUTE, LAYOUT_CONTRACT)
        ownsPush = true
        document.documentElement.style.setProperty(WIDTH_VARIABLE, `${panelWidth}px`)
      } else {
        clearPush()
      }
      const next = publish({
        ...resolved,
        reasonCode,
        contract: LAYOUT_CONTRACT,
        panelLeft: resolved.effectiveMode === 'expanded' ? contract.rects.sidebar.right : null,
        panelWidth,
      })
      startGuards(contract)
      if (resolved.effectiveMode === 'normal') scheduleNormalVerification(contract, panelElement, contract.rects.sidebar)
      return next
    } catch (error) {
      clearPush()
      return publish({
        requestedMode,
        effectiveMode: 'hidden',
        status: 'faulted',
        reasonCode: error instanceof Error ? error.message : String(error),
        panelLeft: null,
        panelWidth,
      })
    } finally {
      applying = false
    }
  }

  function mountPortal() {
    if (disposed) throw new Error('layout adapter is disposed')
    if (!document?.body || !document?.head) throw new Error('browser DOM is unavailable')
    if (portalHost?.isConnected) return portalHost
    const existing = [...(document.querySelectorAll?.(`[${PORTAL_ATTRIBUTE}]`) ?? [])]
    if (existing.length > 0) throw new Error('an Oasis panel portal already exists without this adapter ownership')
    ensureStyle()
    portalHost = document.createElement('div')
    portalHost.setAttribute(PORTAL_ATTRIBUTE, '')
    document.body.appendChild(portalHost)
    return portalHost
  }

  function unmountPortal(host = portalHost) {
    stopGuards()
    clearPush()
    if (host && host === portalHost) {
      host.remove?.()
      portalHost = null
    }
  }

  function releaseStandalone(reasonCode = 'standalone-released') {
    if (disposed) return snapshot
    stopGuards()
    clearPush()
    portalHost?.remove?.()
    portalHost = null
    styleElement?.remove?.()
    styleElement = null
    lastRequest = null
    return publish({
      requestedMode: 'hidden',
      effectiveMode: 'hidden',
      status: 'idle',
      reasonCode,
      panelLeft: null,
    })
  }

  function dispose() {
    if (disposed) return
    releaseStandalone('adapter-disposed')
    listeners.clear()
    disposed = true
  }

  return Object.freeze({
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot() { return snapshot },
    apply,
    restore(reasonCode = 'restored') {
      stopGuards()
      clearPush()
      return publish({ effectiveMode: 'hidden', status: 'idle', reasonCode, panelLeft: null })
    },
    fault,
    mountPortal,
    unmountPortal,
    releaseStandalone,
    dispose,
  })
}
