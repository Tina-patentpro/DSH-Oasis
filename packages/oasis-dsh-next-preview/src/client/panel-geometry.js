export function calculatePanelGeometry(mode, { frame, sidebar }) {
  if (mode === 'hidden') return null
  if (!frame || !sidebar) return null

  const frameWidth = Math.max(0, Math.round(frame.right - frame.left))
  if (mode === 'normal') {
    const width = Math.min(360, frameWidth)
    return { left: Math.max(0, frameWidth - width), width }
  }

  const anchor = sidebar.right
  return {
    left: Math.max(0, Math.round(anchor - frame.left)),
    width: Math.max(0, Math.round(frame.right - anchor)),
  }
}

export function observePanelGeometry(panelElement, mode, onGeometry) {
  const overlay = panelElement?.closest?.('[data-shell-overlay]')
  const frame = overlay?.parentElement
  const sidebar = frame?.firstElementChild
  if (!overlay || !frame || !sidebar) {
    onGeometry(null)
    return () => {}
  }

  const update = () => onGeometry(calculatePanelGeometry(mode, {
    frame: frame.getBoundingClientRect(),
    sidebar: sidebar.getBoundingClientRect(),
  }))
  update()

  const ResizeObserverClass = panelElement.ownerDocument?.defaultView?.ResizeObserver
  if (typeof ResizeObserverClass !== 'function') return () => {}
  const observer = new ResizeObserverClass(update)
  observer.observe(frame)
  observer.observe(sidebar)
  return () => observer.disconnect()
}
