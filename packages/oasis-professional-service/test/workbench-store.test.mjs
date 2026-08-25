import assert from 'node:assert/strict'
import test from 'node:test'

import { createWorkbenchStore } from '../src/client/workbench-store.js'

function createTwoWorkspaceStore() {
  const store = createWorkbenchStore()
  store.syncWorkspaces([
    { workspaceId: 'workspace-a' },
    { workspaceId: 'workspace-b' },
  ])
  return store
}

test('keeps pages when switching sessions inside one Workspace', () => {
  const store = createTwoWorkspaceStore()
  const page = store.createPage('workspace-a')
  store.selectWorkflow('workspace-a', page.pageId, 'technical-rd')

  assert.equal(store.getWorkspaceState('workspace-a').pages.length, 1)
  assert.equal(store.getWorkspaceState('workspace-a').pages[0].view, 'workspace')
})

test('switches to an independent page set when Workspace changes', () => {
  const store = createTwoWorkspaceStore()
  store.createPage('workspace-a')

  assert.equal(store.getWorkspaceState('workspace-a').pages.length, 1)
  assert.equal(store.getWorkspaceState('workspace-b').pages.length, 0)
})

test('keeps hidden normal expanded state per Workspace', () => {
  const store = createTwoWorkspaceStore()
  store.setPanelMode('workspace-a', 'expanded')
  store.setPanelMode('workspace-b', 'hidden')

  assert.equal(store.getWorkspaceState('workspace-a').panelMode, 'expanded')
  assert.equal(store.getWorkspaceState('workspace-b').panelMode, 'hidden')
  store.setPanelMode('workspace-a', 'normal')
  assert.equal(store.getWorkspaceState('workspace-a').panelMode, 'normal')
})

test('opening an empty Workspace creates one workflow chooser page', () => {
  const store = createTwoWorkspaceStore()
  store.openPanel('workspace-a')
  const state = store.getWorkspaceState('workspace-a')

  assert.equal(state.panelMode, 'normal')
  assert.equal(state.pages.length, 1)
  assert.equal(state.pages[0].view, 'chooser')
  assert.equal(state.activePageId, state.pages[0].pageId)
})

test('rejects task creation when no Workspace owns the session', () => {
  const store = createTwoWorkspaceStore()
  assert.throws(() => store.createPage(null), /known Workspace/i)
  assert.throws(() => store.createPage('workspace-unknown'), /known Workspace/i)
})

test('notifies subscribers and preserves page state across panel transitions', () => {
  const store = createTwoWorkspaceStore()
  let notifications = 0
  const dispose = store.subscribe(() => { notifications += 1 })
  const page = store.createPage('workspace-a')
  store.setPanelMode('workspace-a', 'expanded')
  store.setPanelMode('workspace-a', 'hidden')
  store.setPanelMode('workspace-a', 'normal')
  dispose()

  assert.equal(store.getWorkspaceState('workspace-a').pages[0].pageId, page.pageId)
  assert.equal(notifications, 4)
})
