import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const moduleUrl = new URL('../src/client/panel-host-coordinator.js', import.meta.url)
const implementation = existsSync(fileURLToPath(moduleUrl)) ? await import(moduleUrl) : {}
const createPanelHostCoordinator = implementation.createPanelHostCoordinator ?? (() => ({
  subscribe() { return () => {} },
  getSnapshot() { return { mode: 'missing', reasonCode: 'module-missing' } },
  expectBetterSidebar() {},
  attachBetterSidebar() { return () => {} },
  openBetterSidebar() { return false },
  reconcileExternalState() {},
  dispose() {},
}))

const DESCRIPTOR = Object.freeze({
  id: 'oasis-professional-service:workbench',
  title: '绿洲专业工作台',
  single: true,
  component() { return null },
})

function layoutRecorder(order) {
  return {
    releaseStandalone(reasonCode) { order.push(`release:${reasonCode}`) },
  }
}

test('switches through integrating and releasing while Better Sidebar owns the outer panel', () => {
  const order = []
  const opened = []
  let registered = null
  const service = {
    version: '0.18.0',
    features: ['targetedOpen', 'stateSubscription', 'tabMeta'],
    registerTab(descriptor) {
      order.push('register')
      registered = descriptor
      return () => order.push('unregister')
    },
    openTab(seed, scope) { opened.push({ seed, scope }) },
  }
  const coordinator = createPanelHostCoordinator({ layoutAdapter: layoutRecorder(order) })
  const modes = []
  coordinator.subscribe(() => modes.push(coordinator.getSnapshot().mode))

  assert.equal(coordinator.getSnapshot().mode, 'standalone')
  coordinator.expectBetterSidebar()
  assert.equal(coordinator.getSnapshot().mode, 'integrating')
  const detach = coordinator.attachBetterSidebar(service, DESCRIPTOR)
  assert.deepEqual(order.slice(0, 3), [
    'release:better-sidebar-expected',
    'release:better-sidebar-integrating',
    'register',
  ])
  assert.equal(coordinator.getSnapshot().mode, 'better-sidebar')
  assert.equal(coordinator.getSnapshot().serviceVersion, '0.18.0')
  assert.equal(registered, DESCRIPTOR)
  assert.equal(coordinator.openBetterSidebar('session-a'), true)
  assert.deepEqual(opened, [{
    seed: { type: DESCRIPTOR.id, path: '.oasis/professional-workbench' },
    scope: { sessionId: 'session-a' },
  }])

  detach()
  assert.equal(coordinator.getSnapshot().mode, 'integrating')
  assert.deepEqual(modes, ['integrating', 'better-sidebar', 'releasing', 'integrating'])
  assert.deepEqual(order, [
    'release:better-sidebar-expected',
    'release:better-sidebar-integrating',
    'register',
    'release:better-sidebar-open',
    'release:better-sidebar-releasing',
    'unregister',
  ])
})

test('fails closed for an invalid service or invalid registration disposer', () => {
  const coordinator = createPanelHostCoordinator({ layoutAdapter: layoutRecorder([]) })
  coordinator.expectBetterSidebar()

  coordinator.attachBetterSidebar({ registerTab() { return () => {} } }, DESCRIPTOR)
  assert.deepEqual(
    { mode: coordinator.getSnapshot().mode, reasonCode: coordinator.getSnapshot().reasonCode },
    { mode: 'blocked', reasonCode: 'better-sidebar-service-invalid' },
  )

  coordinator.attachBetterSidebar({ registerTab() { return null }, openTab() {} }, DESCRIPTOR)
  assert.deepEqual(
    { mode: coordinator.getSnapshot().mode, reasonCode: coordinator.getSnapshot().reasonCode },
    { mode: 'blocked', reasonCode: 'better-sidebar-registration-disposer-invalid' },
  )
  assert.equal(coordinator.openBetterSidebar('session-a'), false)
})

test('keeps the fixed Sidebar composition integrating without private DOM inspection', () => {
  const coordinator = createPanelHostCoordinator({ layoutAdapter: layoutRecorder([]) })
  assert.equal(coordinator.reconcileExternalState().mode, 'standalone')
  coordinator.expectBetterSidebar()
  assert.equal(coordinator.reconcileExternalState().mode, 'integrating')
})

test('does not fall back to an unscoped open when targetedOpen is unavailable', () => {
  const opened = []
  const coordinator = createPanelHostCoordinator({ layoutAdapter: layoutRecorder([]) })
  coordinator.expectBetterSidebar()
  coordinator.attachBetterSidebar({
    version: '0.18.0',
    features: ['stateSubscription'],
    registerTab() { return () => {} },
    openTab(...args) { opened.push(args) },
  }, DESCRIPTOR)

  assert.equal(coordinator.openBetterSidebar('session-a'), false)
  assert.deepEqual(opened, [])
  assert.equal(coordinator.getSnapshot().mode, 'better-sidebar')
})

test('unregisters an active public tab when native open throws and remains idempotent on dispose', () => {
  const order = []
  const service = {
    version: '0.18.0',
    features: ['targetedOpen'],
    registerTab() { return () => order.push('unregister') },
    openTab() { throw new Error('open failed') },
  }
  const coordinator = createPanelHostCoordinator({ layoutAdapter: layoutRecorder(order) })

  coordinator.expectBetterSidebar()
  coordinator.attachBetterSidebar(service, DESCRIPTOR)
  assert.equal(coordinator.openBetterSidebar('session-a'), false)
  assert.deepEqual(
    { mode: coordinator.getSnapshot().mode, reasonCode: coordinator.getSnapshot().reasonCode },
    { mode: 'blocked', reasonCode: 'better-sidebar-open-failed' },
  )
  assert.equal(order.filter((entry) => entry === 'unregister').length, 1)

  coordinator.dispose()
  coordinator.dispose()
  assert.equal(order.filter((entry) => entry === 'unregister').length, 1)
  assert.equal(order.at(-1), 'release:panel-host-coordinator-disposed')
})
