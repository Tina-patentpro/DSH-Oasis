import assert from 'node:assert/strict'
import test from 'node:test'

import * as surfaceModule from '../src/client/OasisWorkbenchSurface.js'

const ensureEmbeddedWorkspaceHidden = surfaceModule.ensureEmbeddedWorkspaceHidden ?? (async () => false)

test('hydrates the current embedded workspace and persists standalone mode as hidden before fallback', async () => {
  const order = []
  const state = { panelMode: 'normal', syncStatus: 'ready' }
  const store = {
    syncWorkspaces(items) { order.push(`sync:${items[0].workspaceId}`) },
    async hydrateWorkspace(workspaceId) { order.push(`hydrate:${workspaceId}`) },
    async loadWorkflowCatalog(workspaceId) { order.push(`catalog:${workspaceId}`) },
    getWorkspaceState() { return state },
    setPanelMode(_workspaceId, panelMode) { state.panelMode = panelMode; order.push(`persist:${panelMode}`) },
    setLocalPanelMode() { order.push('unexpected-local') },
    async flushWorkspace(workspaceId) { order.push(`flush:${workspaceId}`) },
  }

  const result = await ensureEmbeddedWorkspaceHidden({
    store,
    workspaceId: 'workspace-a',
    workspaceItems: [{ workspaceId: 'workspace-a', sessionIds: ['session-a'] }],
  })

  assert.equal(result, true)
  assert.equal(state.panelMode, 'hidden')
  assert.deepEqual(order, [
    'sync:workspace-a',
    'hydrate:workspace-a',
    'catalog:workspace-a',
    'persist:hidden',
    'flush:workspace-a',
  ])
})

test('keeps fallback locally hidden when the authoritative workspace cannot be persisted', async () => {
  const order = []
  const state = { panelMode: 'normal', syncStatus: 'conflict' }
  const store = {
    syncWorkspaces() {},
    async hydrateWorkspace() {},
    async loadWorkflowCatalog() {},
    getWorkspaceState() { return state },
    setPanelMode() { order.push('unexpected-persist') },
    setLocalPanelMode(_workspaceId, mode) { state.panelMode = mode; order.push(`local:${mode}`) },
    async flushWorkspace() { order.push('unexpected-flush') },
  }

  assert.equal(await ensureEmbeddedWorkspaceHidden({
    store,
    workspaceId: 'workspace-a',
    workspaceItems: [{ workspaceId: 'workspace-a', sessionIds: ['session-a'] }],
  }), false)
  assert.equal(state.panelMode, 'hidden')
  assert.deepEqual(order, ['local:hidden'])
})
