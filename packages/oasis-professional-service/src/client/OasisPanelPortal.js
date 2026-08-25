import { createElement, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { OasisPanelBoundary } from './OasisPanelBoundary.js'
import { OasisPanelHost } from './OasisPanelHost.js'

export function OasisPanelPortal(props) {
  const { layoutAdapter } = props
  const [portalHost, setPortalHost] = useState(null)

  useLayoutEffect(() => {
    let host
    try {
      host = layoutAdapter.mountPortal()
      setPortalHost(host)
    } catch (error) {
      layoutAdapter.fault(`portal-mount-error:${error instanceof Error ? error.message : String(error)}`)
    }
    return () => {
      if (host) layoutAdapter.unmountPortal(host)
    }
  }, [layoutAdapter])

  if (portalHost === null) return null
  return createPortal(
    createElement(
      OasisPanelBoundary,
      { layoutAdapter },
      createElement(OasisPanelHost, props),
    ),
    portalHost,
  )
}
