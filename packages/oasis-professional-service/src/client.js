import { createElement } from 'react'

import { createLayoutAdapter } from './client/layout-adapter.js'
import { createOasisBetterSidebarDescriptor } from './client/OasisBetterSidebarTab.js'
import { createPanelHostCoordinator } from './client/panel-host-coordinator.js'
import { WorkbenchEntry } from './client/WorkbenchEntry.js'
import { WorkspaceContextBridge } from './client/WorkspaceContextBridge.js'
import { createWorkbenchRemote } from './client/workbench-remote.js'
import { createWorkbenchStore } from './client/workbench-store.js'
import { createProductSettings } from './client/product-settings.js'
import { OasisSettingsSection } from './client/OasisSettingsSection.js'
import { createConversationDraftBridge } from './client/conversation-draft-bridge.js'
import { resolveWorkspaceId } from './client/project-resolution.js'
export { createConversationDraftBridge } from './client/conversation-draft-bridge.js'

export const inject = ['slots', 'connection']

const ENTRY_ID = 'oasis-professional-entry'
const PANEL_ID = 'oasis-professional-panel'
const SETTINGS_ID = 'oasis-professional-settings'

export function apply(ctx, { markdownRenderer } = {}) {
  const slots = ctx.get?.('slots') ?? ctx.slots
  const connection = ctx.get?.('connection') ?? ctx.connection
  if (slots === undefined || connection === undefined) return () => {}

  const remote = createWorkbenchRemote(connection)
  const connectionSettings = createProductSettings({
    remote,
    onInvalidated: ({ reload }) => store.refreshProfessionalConfiguration(reload),
  })
  const focusTargets = new Map()
  const layoutAdapter = createLayoutAdapter()
  const coordinator = createPanelHostCoordinator({ layoutAdapter })
  const conversationDrafts = createConversationDraftBridge(() => coordinator.getSnapshot().workspaceContext)
  const store = createWorkbenchStore({ remote, connectionSettings, conversationDrafts, nativeFiles: coordinator,
    getGenerationSession(workspaceId) {
      const context = coordinator.getSnapshot().workspaceContext
      if (context?.status !== 'ready' || resolveWorkspaceId(context.currentSessionId, context.workspaceItems) !== workspaceId) {
        throw new Error('当前项目与会话不可用')
      }
      return context.currentSessionId
    },
  })
  const betterSidebarDescriptor = createOasisBetterSidebarDescriptor({
    markdownRenderer,
    coordinator,
    store,
    focusTargets,
    layoutAdapter,
  })
  const disposeEntry = slots.inject('conversation.input.right', () => slots.register(
    {
      name: 'conversation.input.right',
      id: ENTRY_ID,
      order: 80,
      label: 'Oasis professional workbench',
    },
    (props) => createElement(WorkbenchEntry, {
      ...props,
      store,
      focusTargets,
      layoutAdapter,
      coordinator,
    }),
  ))
  const disposeBridge = slots.inject('shell.overlay', () => slots.register(
    {
      name: 'shell.overlay',
      id: PANEL_ID,
      order: 80,
      label: 'Oasis professional panel',
    },
    (props) => createElement(WorkspaceContextBridge, {
      ...props,
      store,
      focusTargets,
      layoutAdapter,
      coordinator,
    }),
  ))
  const disposeSettingsSection = slots.inject('settings.section', () => slots.register(
    {
      name: 'settings.section',
      id: SETTINGS_ID,
      order: 80,
      label: '绿洲工作台',
    },
    (props) => createElement(OasisSettingsSection, {
      ...props,
      controller: connectionSettings,
      remote, coordinator,
    }),
  ))

  let betterSidebarFiber = null
  let settingsFiber = null
  if (typeof ctx.inject === 'function') {
    try {
      settingsFiber = ctx.inject(['configForms', 'remote.credentials'], (injectedCtx) => connectionSettings.bind({
        configForms: injectedCtx.get?.('configForms') ?? injectedCtx.configForms,
        remote: injectedCtx.get?.('remote') ?? injectedCtx.remote,
        connection,
      }))
    } catch {
      // Configuration is optional; local workflows remain available.
    }
    try {
      coordinator.expectBetterSidebar()
      betterSidebarFiber = ctx.inject(['betterSidebar'], (injectedCtx) => {
        const betterSidebar = injectedCtx.get?.('betterSidebar') ?? injectedCtx.betterSidebar
        return coordinator.attachBetterSidebar(betterSidebar, betterSidebarDescriptor, injectedCtx)
      })
      if (typeof betterSidebarFiber?.dispose !== 'function') {
        coordinator.block('better-sidebar-injection-disposer-invalid')
      }
    } catch {
      coordinator.block('better-sidebar-injection-failed')
    }
  } else {
    coordinator.reconcileExternalState()
  }

  return async () => {
    try {
      await disposeSettingsSection()
    } finally {
      try {
        await disposeBridge()
      } finally {
        try {
          await disposeEntry()
        } finally {
          try {
            await betterSidebarFiber?.dispose?.()
          } finally {
            try {
              coordinator.dispose()
            } finally {
              try {
                layoutAdapter.dispose()
              } finally {
                try {
                  await settingsFiber?.dispose?.()
                } finally {
                  connectionSettings.dispose()
                  conversationDrafts.dispose()
                  await store.dispose()
                }
              }
            }
          }
        }
      }
    }
  }
}
