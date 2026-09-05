import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { apply, inject } from '../src/client.js'
import { CODEX_PANEL_ICONS } from '../src/client/codex-icons.js'
import { PanelChrome } from '../src/client/PanelChrome.js'
import { WorkbenchEntry } from '../src/client/WorkbenchEntry.js'
import { WorkspaceContextBridge } from '../src/client/WorkspaceContextBridge.js'
import { createPanelActions } from '../src/client/OasisPanelHost.js'
import { createWorkbenchStore } from '../src/client/workbench-store.js'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readPanelHostSnapshot = (coordinator) => coordinator?.getSnapshot?.() ?? { mode: 'standalone' }

function collectElements(value, collected = []) {
  if (Array.isArray(value)) {
    for (const child of value) collectElements(child, collected)
    return collected
  }
  if (value === null || typeof value !== 'object') return collected
  if (value.props) {
    collected.push(value)
    collectElements(value.props.children, collected)
  }
  return collected
}

test('registers additive entry and panel host slots but never details', async () => {
  const injectedSlots = []
  const registrations = []
  const disposals = []
  const ctx = {
    connection: { rpc: { call: async () => ({ ok: true, value: {} }) } },
    slots: {
      inject(name, callback) {
        injectedSlots.push(name)
        const dispose = callback()
        disposals.push(dispose)
        return dispose
      },
      register(options, component) {
        registrations.push({ options, component })
        return () => {}
      },
    },
  }

  const dispose = apply(ctx)
  assert.deepEqual(inject, ['slots', 'connection'])
  assert.deepEqual(injectedSlots.sort(), ['conversation.input.right', 'shell.overlay'])
  assert.equal(registrations.some(({ options }) => options.name === 'details'), false)
  assert.equal(registrations.every(({ options }) => options.id.startsWith('oasis-professional-')), true)
  const overlayRegistration = registrations.find(({ options }) => options.name === 'shell.overlay')
  assert.equal(overlayRegistration.component({}).type, WorkspaceContextBridge)
  const disposal = dispose()
  assert.equal(typeof disposal?.then, 'function')
  await disposal
  assert.equal(disposals.length, 2)
})

test('fails closed when the DSH Connection service is unavailable', () => {
  let registrations = 0
  const dispose = apply({
    slots: {
      inject() { registrations += 1 },
    },
  })
  assert.equal(registrations, 0)
  dispose()
})

test('registers the workbench through the public Better Sidebar tab service when available', async () => {
  const injected = []
  let descriptor = null
  let unregisterCount = 0
  const betterSidebar = {
    version: '0.15.2',
    features: ['targetedOpen', 'stateSubscription', 'tabMeta'],
    registerTab(value) {
      descriptor = value
      return () => { unregisterCount += 1 }
    },
    openTab() {},
  }
  const ctx = {
    betterSidebar,
    connection: { rpc: { call: async () => ({ ok: true, value: {} }) } },
    slots: {
      inject(_name, callback) { return callback() },
      register() { return () => {} },
    },
    inject(dependencies, callback) {
      injected.push(dependencies)
      callback(ctx)
      return { dispose: async () => {} }
    },
  }

  const dispose = apply(ctx)
  try {
    assert.deepEqual(injected, [['settingsScope', 'remote'], ['betterSidebar']])
    assert.equal(descriptor?.id, 'oasis-professional-service:workbench')
    assert.equal(descriptor?.single, true)
    assert.equal(typeof descriptor?.component, 'function')
  } finally {
    await dispose()
  }
  assert.equal(unregisterCount, 1)
})

test('entry opens a visible normal panel directly through the shared store', () => {
  const store = createWorkbenchStore()
  const workspaces = { items: [{ workspaceId: 'workspace-a', sessionIds: ['session-a'] }] }
  const focusTargets = new Map()
  const button = WorkbenchEntry({
    sessionId: 'session-a',
    store,
    focusTargets,
    useWorkspaces: (selector) => selector(workspaces),
    usePanelHostSnapshot: readPanelHostSnapshot,
  })
  const trigger = { focus() {} }
  button.ref(trigger)
  button.props.onClick({ currentTarget: trigger })

  const state = store.getWorkspaceState('workspace-a')
  assert.equal(state.panelMode, 'normal')
  assert.equal(state.pages.length, 1)
  assert.equal(focusTargets.get('workspace-a'), trigger)
})

test('entry opens the targeted native Better Sidebar tab without opening the standalone panel', () => {
  const store = createWorkbenchStore()
  const workspaces = { items: [{ workspaceId: 'workspace-a', sessionIds: ['session-a'] }] }
  const opened = []
  const coordinator = {
    getSnapshot: () => ({ mode: 'better-sidebar' }),
    openBetterSidebar(sessionId) { opened.push(sessionId); return true },
  }
  const button = WorkbenchEntry({
    sessionId: 'session-a',
    store,
    coordinator,
    focusTargets: new Map(),
    useWorkspaces: (selector) => selector(workspaces),
    usePanelHostSnapshot: readPanelHostSnapshot,
  })
  button.props.onClick({ currentTarget: { focus() {} } })

  assert.deepEqual(opened, ['session-a'])
  assert.equal(store.getWorkspaceState('workspace-a').panelMode, 'hidden')
  assert.equal(store.getWorkspaceState('workspace-a').pages.length, 0)
})

test('entry ref tracks the currently mounted trigger per workspace and removes stale nodes', () => {
  const store = createWorkbenchStore()
  const workspaces = { items: [
    { workspaceId: 'workspace-a', sessionIds: ['session-a'] },
    { workspaceId: 'workspace-b', sessionIds: ['session-b'] },
  ] }
  const focusTargets = new Map()
  const entryA = WorkbenchEntry({
    sessionId: 'session-a', store, focusTargets, useWorkspaces: (selector) => selector(workspaces),
    usePanelHostSnapshot: readPanelHostSnapshot,
  })
  const entryB = WorkbenchEntry({
    sessionId: 'session-b', store, focusTargets, useWorkspaces: (selector) => selector(workspaces),
    usePanelHostSnapshot: readPanelHostSnapshot,
  })
  const triggerA = { focus() {} }
  const triggerB = { focus() {} }
  entryA.ref(triggerA)
  entryB.ref(triggerB)
  assert.equal(focusTargets.get('workspace-a'), triggerA)
  assert.equal(focusTargets.get('workspace-b'), triggerB)
  entryA.ref(null)
  assert.equal(focusTargets.has('workspace-a'), false)
  assert.equal(focusTargets.get('workspace-b'), triggerB)
})

test('entry subscribes to host coordinator changes instead of caching its initial host mode', () => {
  const source = readFileSync(resolve(packageRoot, 'src/client/WorkbenchEntry.js'), 'utf8')
  assert.match(source, /useSyncExternalStore/)
  assert.match(source, /coordinator\.subscribe/)
})

test('client no longer uses a window CustomEvent as its open transport', () => {
  const source = readFileSync(resolve(packageRoot, 'src/client.js'), 'utf8')
  assert.doesNotMatch(source, /dispatchEvent|CustomEvent|oasis-professional-service:open/)
})

test('panel never opens or closes the occupied DSH details modal for geometry', () => {
  const source = readFileSync(resolve(packageRoot, 'src/client/OasisPanelHost.js'), 'utf8')
  assert.doesNotMatch(source, /openDetails|closeDetails/)
})

test('uses the approved Codex show hide expand and restore SVG paths', () => {
  assert.equal(CODEX_PANEL_ICONS.showHide.viewBox, '0 0 20 20')
  assert.match(CODEX_PANEL_ICONS.showHide.paths[0], /^M6\.83496 3\.99992/)
  assert.equal(CODEX_PANEL_ICONS.expand.paths[0], 'M4.33496 11C4.33496 10.6327 4.63273 10.335 5 10.335C5.36727 10.335 5.66504 10.6327 5.66504 11V14.335H9L9.13379 14.3486C9.43692 14.4106 9.66504 14.6786 9.66504 15C9.66504 15.3214 9.43692 15.5894 9.13379 15.6514L9 15.665H5C4.63273 15.665 4.33496 15.3673 4.33496 15V11ZM14.335 9V5.66504H11C10.6327 5.66504 10.335 5.36727 10.335 5C10.335 4.63273 10.6327 4.33496 11 4.33496H15L15.1338 4.34863C15.4369 4.41057 15.665 4.67857 15.665 5V9C15.665 9.36727 15.3673 9.66504 15 9.66504C14.6327 9.66504 14.335 9.36727 14.335 9Z')
  assert.equal(CODEX_PANEL_ICONS.restore.viewBox, '0 0 16 16')
  assert.equal(CODEX_PANEL_ICONS.restore.paths.length, 2)
})

test('embedded chrome leaves show, hide, expand, and restore controls to Better Sidebar', () => {
  const state = {
    effectiveMode: 'embedded',
    panelMode: 'hidden',
    syncStatus: 'ready',
    pageOperations: {},
    pages: [],
    activePageId: null,
  }
  const embedded = JSON.stringify(PanelChrome({ hostMode: 'embedded', state }))
  const standalone = JSON.stringify(PanelChrome({ hostMode: 'standalone', state: {
    ...state, effectiveMode: 'normal', panelMode: 'normal',
  } }))
  assert.doesNotMatch(embedded, /oasis-panel-(?:hide|expand|restore)/)
  assert.match(standalone, /oasis-panel-(?:hide|expand|restore)/)
})

test('Better Sidebar integration uses only its public service plus the fail-closed marker seam', () => {
  const coordinatorSource = readFileSync(resolve(packageRoot, 'src/client/panel-host-coordinator.js'), 'utf8')
  const tabSource = readFileSync(resolve(packageRoot, 'src/client/OasisBetterSidebarTab.js'), 'utf8')
  assert.match(coordinatorSource, /registerTab/)
  assert.match(coordinatorSource, /openTab/)
  assert.match(coordinatorSource, /\[data-dsh-better-sidebar\]/)
  assert.doesNotMatch(coordinatorSource, /--dsh-sidebar|data-dsh-panel-host|\.click\(|activateTab|updateTab/)
  assert.doesNotMatch(tabSource, /querySelector|#root|--dsh-sidebar|\.click\(/)
})

test('flushes drafts before task switch, confirmed history close, and panel hide', async () => {
  const order = []
  let confirmResult = false
  const state = {
    syncStatus: 'saving',
    pages: [{ pageId: 'task-a', title: '有历史任务', runOrder: ['run-a'] }],
  }
  const store = {
    getWorkspaceState: () => state,
    async flushWorkspace() { order.push('flush'); state.syncStatus = 'ready' },
    activatePage(_workspaceId, pageId) { order.push(`activate:${pageId}`) },
    closePage(_workspaceId, pageId) { order.push(`close:${pageId}`) },
    setPanelMode(_workspaceId, mode) { order.push(`mode:${mode}`) },
    setLocalPanelMode(_workspaceId, mode) { order.push(`local-mode:${mode}`) },
  }
  const focusTargets = new Map([['workspace-a', { focus: () => order.push('focus') }]])
  const actions = createPanelActions({
    store,
    workspaceId: 'workspace-a',
    focusTargets,
    confirmClose: () => confirmResult,
  })

  assert.equal(await actions.closePage('task-a'), false)
  assert.deepEqual(order, [])
  confirmResult = true
  assert.equal(await actions.closePage('task-a'), true)
  await actions.activatePage('task-b')
  await actions.hidePanel()
  assert.deepEqual(order, [
    'flush', 'close:task-a',
    'flush', 'activate:task-b',
    'flush', 'mode:hidden', 'focus',
  ])
})

test('blocks every close control while a task retains an unresolved remote execution', async () => {
  const order = []
  const page = {
    pageId: 'task-a',
    title: '待对账任务',
    runOrder: [],
    remoteExecutionOrder: ['execution-a'],
    remoteExecutions: {
      'execution-a': { status: 'wait-stopped' },
    },
  }
  const state = {
    effectiveMode: 'normal',
    panelMode: 'normal',
    syncStatus: 'ready',
    activePageId: 'task-a',
    pageOperations: { 'task-a': { activeOperation: null } },
    pages: [page],
  }
  const store = {
    getWorkspaceState: () => state,
    async flushWorkspace() { order.push('flush') },
    closePage() { order.push('close') },
  }
  const actions = createPanelActions({
    store,
    workspaceId: 'workspace-a',
    focusTargets: new Map(),
    confirmClose: () => true,
  })

  assert.equal(await actions.closePage('task-a'), false)
  assert.deepEqual(order, [])
  const closeButton = collectElements(PanelChrome({ state }))
    .find((element) => element.props?.['aria-label'] === '关闭任务页 待对账任务')
  assert.equal(closeButton?.props.disabled, true)
})

test('shared workbench surface loads persisted state and remote workflow catalog for each resolved Workspace', () => {
  const source = readFileSync(resolve(packageRoot, 'src/client/OasisWorkbenchSurface.js'), 'utf8')
  assert.match(source, /loadWorkflowCatalog\(workspaceId\)/)
  assert.match(source, /flushWorkspace\(workspaceId\)/)
  assert.match(source, /effectiveMode/)
})
