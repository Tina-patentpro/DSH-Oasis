import { createElement } from 'react'

import { createLayoutAdapter } from './client/layout-adapter.js'
import { OasisPanelPortal } from './client/OasisPanelPortal.js'
import { WorkbenchEntry } from './client/WorkbenchEntry.js'
import { createWorkbenchRemote } from './client/workbench-remote.js'
import { createWorkbenchStore } from './client/workbench-store.js'

export const inject = ['slots', 'connection']

const ENTRY_ID = 'oasis-professional-entry'
const PANEL_ID = 'oasis-professional-panel'

export function apply(ctx) {
  const slots = ctx.get?.('slots') ?? ctx.slots
  const connection = ctx.get?.('connection') ?? ctx.connection
  if (slots === undefined || connection === undefined) return () => {}

  const store = createWorkbenchStore({ remote: createWorkbenchRemote(connection) })
  const focusTargets = new Map()
  const layoutAdapter = createLayoutAdapter()
  const disposeEntry = slots.inject('conversation.input.right', () => slots.register(
    {
      name: 'conversation.input.right',
      id: ENTRY_ID,
      order: 80,
      label: 'Oasis professional workbench',
    },
    (props) => createElement(WorkbenchEntry, { ...props, store, focusTargets, layoutAdapter }),
  ))
  const disposePanel = slots.inject('shell.overlay', () => slots.register(
    {
      name: 'shell.overlay',
      id: PANEL_ID,
      order: 80,
      label: 'Oasis professional panel',
    },
    (props) => createElement(OasisPanelPortal, { ...props, store, focusTargets, layoutAdapter }),
  ))

  return () => {
    disposePanel()
    disposeEntry()
    layoutAdapter.dispose()
    store.dispose()
  }
}
