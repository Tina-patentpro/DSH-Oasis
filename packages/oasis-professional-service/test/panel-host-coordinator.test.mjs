import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const moduleUrl = new URL('../src/client/panel-host-coordinator.js', import.meta.url)
const implementation = existsSync(fileURLToPath(moduleUrl)) ? await import(moduleUrl) : {}
const createPanelHostCoordinator = implementation.createPanelHostCoordinator ?? (() => ({
  subscribe() { return () => {} },
  getSnapshot() { return { mode: 'missing', reasonCode: 'module-missing' } },
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
    version: '0.15.2',
    features: ['targetedOpen', 'stateSubscription', 'tabMeta'],
    registerTab(descriptor) {
      order.push('register')
      registered = descriptor
      return () => order.push('unregister')
    },
    openTab(seed, scope) { opened.push({ seed, scope }) },
  }
  const coordinator = createPanelHostCoordinator({
    layoutAdapter: layoutRecorder(order),
    hasBetterSidebarMarker: () => false,
  })
  const modes = []
  coordinator.subscribe(() => modes.push(coordinator.getSnapshot().mode))

  assert.equal(coordinator.getSnapshot().mode, 'standalone')
  const detach = coordinator.attachBetterSidebar(service, DESCRIPTOR)
  assert.deepEqual(order.slice(0, 2), ['release:better-sidebar-integrating', 'register'])
  assert.equal(coordinator.getSnapshot().mode, 'better-sidebar')
  assert.equal(coordinator.getSnapshot().serviceVersion, '0.15.2')
  assert.equal(registered, DESCRIPTOR)
  assert.equal(coordinator.openBetterSidebar('session-a'), true)
  assert.deepEqual(opened, [{
    seed: { type: DESCRIPTOR.id, path: '.oasis/professional-workbench' },
    scope: { sessionId: 'session-a' },
  }])

  detach()
  assert.equal(coordinator.getSnapshot().mode, 'standalone')
  assert.deepEqual(modes, ['integrating', 'better-sidebar', 'releasing', 'standalone'])
  assert.deepEqual(order, [
    'release:better-sidebar-integrating',
    'register',
    'release:better-sidebar-open',
    'release:better-sidebar-releasing',
    'unregister',
  ])
})

test('fails closed for an invalid service, invalid registration disposer, or marker without service', () => {
  let markerPresent = false
  const coordinator = createPanelHostCoordinator({
    layoutAdapter: layoutRecorder([]),
    hasBetterSidebarMarker: () => markerPresent,
  })

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

  markerPresent = true
  coordinator.reconcileExternalState()
  assert.equal(coordinator.getSnapshot().mode, 'blocked')
  assert.equal(coordinator.getSnapshot().reasonCode, 'better-sidebar-marker-without-service')
  markerPresent = false
  coordinator.reconcileExternalState()
  assert.equal(coordinator.getSnapshot().mode, 'standalone')
})

test('unregisters an active public tab when native open throws and remains idempotent on dispose', () => {
  const order = []
  const service = {
    version: '0.15.2',
    features: ['targetedOpen'],
    registerTab() { return () => order.push('unregister') },
    openTab() { throw new Error('open failed') },
  }
  const coordinator = createPanelHostCoordinator({
    layoutAdapter: layoutRecorder(order),
    hasBetterSidebarMarker: () => false,
  })

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
