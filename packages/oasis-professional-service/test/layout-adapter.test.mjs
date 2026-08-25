import assert from 'node:assert/strict'
import test from 'node:test'

import {
  LAYOUT_CONTRACT,
  createLayoutAdapter,
  detectDshLayout,
  resolveEffectiveMode,
} from '../src/client/layout-adapter.js'

class FakeStyle {
  constructor() {
    this.values = new Map()
  }
  getPropertyValue(name) { return this.values.get(name)?.value ?? '' }
  getPropertyPriority(name) { return this.values.get(name)?.priority ?? '' }
  setProperty(name, value, priority = '') { this.values.set(name, { value: String(value), priority }) }
  removeProperty(name) {
    const value = this.getPropertyValue(name)
    this.values.delete(name)
    return value
  }
}

class FakeElement {
  constructor(tagName, rect = { left: 0, right: 0, width: 0, height: 0 }) {
    this.tagName = tagName.toUpperCase()
    this.rect = rect
    this.attributes = new Map()
    this.children = []
    this.parentElement = null
    this.style = new FakeStyle()
    this.isConnected = true
    this.textContent = ''
  }
  appendChild(child) {
    child.parentElement = this
    child.isConnected = true
    this.children.push(child)
    return child
  }
  remove() {
    if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((child) => child !== this)
    this.parentElement = null
    this.isConnected = false
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)) }
  getAttribute(name) { return this.attributes.get(name) ?? null }
  hasAttribute(name) { return this.attributes.has(name) }
  removeAttribute(name) { this.attributes.delete(name) }
  getBoundingClientRect() { return { ...this.rect } }
  contains(target) {
    return target === this || this.children.some((child) => child.contains(target))
  }
  querySelectorAll(selector) {
    const matches = []
    const visit = (node) => {
      for (const child of node.children) {
        if (matchesSelector(child, selector)) matches.push(child)
        visit(child)
      }
    }
    visit(this)
    return matches
  }
}

function matchesSelector(node, selector) {
  if (selector === '[data-shell-overlay]') return node.hasAttribute('data-shell-overlay')
  if (selector === '[data-dsh-better-sidebar]') return node.hasAttribute('data-dsh-better-sidebar')
  const slot = selector.match(/^\[data-slot="(.+)"\]$/)?.[1]
  if (slot) return node.getAttribute('data-slot') === slot
  const attr = selector.match(/^\[([^=\]]+)\]$/)?.[1]
  if (attr) return node.hasAttribute(attr)
  return false
}

function createFixture({ viewportWidth = 1600, conversationWidth = 960, sidebarWidth = 280 } = {}) {
  const documentElement = new FakeElement('html', { left: 0, right: viewportWidth, width: viewportWidth, height: 900 })
  const head = documentElement.appendChild(new FakeElement('head'))
  const body = documentElement.appendChild(new FakeElement('body'))
  const root = body.appendChild(new FakeElement('div', { left: 0, right: viewportWidth, width: viewportWidth, height: 900 }))
  root.id = 'root'
  const rootSlot = root.appendChild(new FakeElement('div', root.rect))
  rootSlot.setAttribute('data-slot', 'root')
  const frame = rootSlot.appendChild(new FakeElement('div', root.rect))
  frame.computedDisplay = 'grid'
  const sidebarColumn = frame.appendChild(new FakeElement('div', { left: 0, right: sidebarWidth, width: sidebarWidth, height: 900 }))
  const sidebarSlot = sidebarColumn.appendChild(new FakeElement('div', sidebarColumn.rect))
  sidebarSlot.setAttribute('data-slot', 'sidebar')
  const conversationColumn = frame.appendChild(new FakeElement('div', { left: sidebarWidth, right: sidebarWidth + conversationWidth, width: conversationWidth, height: 900 }))
  const conversationSlot = conversationColumn.appendChild(new FakeElement('div', conversationColumn.rect))
  conversationSlot.setAttribute('data-slot', 'conversation')
  const detailsColumn = frame.appendChild(new FakeElement('div', { left: 1240, right: 1600, width: 360, height: 900 }))
  const detailsSlot = detailsColumn.appendChild(new FakeElement('div', detailsColumn.rect))
  detailsSlot.setAttribute('data-slot', 'details')
  const overlay = frame.appendChild(new FakeElement('div', frame.rect))
  overlay.setAttribute('data-shell-overlay', '')

  const document = {
    documentElement,
    head,
    body,
    createElement: (tag) => new FakeElement(tag),
    getElementById: (id) => id === 'root' ? root : null,
    querySelectorAll(selector) {
      const matches = []
      if (matchesSelector(documentElement, selector)) matches.push(documentElement)
      matches.push(...documentElement.querySelectorAll(selector))
      return matches
    },
  }
  const window = {
    innerWidth: viewportWidth,
    document,
    getComputedStyle: (element) => ({ display: element.computedDisplay ?? 'block' }),
  }
  return { document, window, root, rootSlot, frame, sidebarSlot, conversationSlot, overlay }
}

test('detects the current DSH rc.2 frame without hash classes or positional selectors', () => {
  const fixture = createFixture()
  const result = detectDshLayout(fixture.document, fixture.window)
  assert.equal(result.ok, true, result.reason)
  assert.equal(result.contract, LAYOUT_CONTRACT)
  assert.equal(result.nodes.root, fixture.root)
  assert.equal(result.nodes.frame, fixture.frame)
  assert.equal(result.nodes.sidebarSlot, fixture.sidebarSlot)
  assert.equal(result.nodes.conversationSlot, fixture.conversationSlot)
})

test('rejects duplicate or structurally unrelated DSH anchors', () => {
  const duplicate = createFixture()
  duplicate.frame.appendChild(new FakeElement('div')).setAttribute('data-shell-overlay', '')
  assert.equal(detectDshLayout(duplicate.document, duplicate.window).ok, false)

  const unrelated = createFixture()
  unrelated.overlay.remove()
  unrelated.document.body.appendChild(unrelated.overlay)
  assert.equal(detectDshLayout(unrelated.document, unrelated.window).ok, false)
})

test('accepts the current DSH narrow layout when the native sidebar track collapses to zero', () => {
  const fixture = createFixture({ viewportWidth: 900, conversationWidth: 900, sidebarWidth: 0 })
  const result = detectDshLayout(fixture.document, fixture.window)
  assert.equal(result.ok, true, result.reason)
  assert.equal(result.rects.sidebar.width, 0)
  const adapter = createLayoutAdapter({ document: fixture.document, window: fixture.window, watch: false })
  const snapshot = adapter.apply({ requestedMode: 'normal', panelWidth: 360 })
  assert.equal(snapshot.requestedMode, 'normal')
  assert.equal(snapshot.effectiveMode, 'expanded')
  assert.equal(snapshot.panelLeft, 0)
})

test('resolves requested and effective modes without overwriting the request', () => {
  assert.deepEqual(resolveEffectiveMode({ requestedMode: 'normal', viewportWidth: 1023, projectedCenterWidth: 800 }), {
    requestedMode: 'normal', effectiveMode: 'expanded', status: 'narrow-expanded',
  })
  assert.deepEqual(resolveEffectiveMode({ requestedMode: 'normal', viewportWidth: 1600, projectedCenterWidth: 519 }), {
    requestedMode: 'normal', effectiveMode: 'expanded', status: 'capacity-expanded',
  })
  assert.deepEqual(resolveEffectiveMode({ requestedMode: 'normal', viewportWidth: 1600, projectedCenterWidth: 600 }), {
    requestedMode: 'normal', effectiveMode: 'normal', status: 'active',
  })
  assert.equal(resolveEffectiveMode({ requestedMode: 'expanded', viewportWidth: 1600, projectedCenterWidth: 600 }).effectiveMode, 'expanded')
  assert.equal(resolveEffectiveMode({ requestedMode: 'hidden', viewportWidth: 1600, projectedCenterWidth: 600 }).effectiveMode, 'hidden')
})

test('normal owns one namespaced push and expanded or hidden clears it', () => {
  const fixture = createFixture()
  const adapter = createLayoutAdapter({ document: fixture.document, window: fixture.window, watch: false })
  const portal = adapter.mountPortal()
  assert.equal(portal.getAttribute('data-oasis-panel-portal'), '')

  assert.equal(adapter.apply({ requestedMode: 'normal', panelWidth: 360 }).effectiveMode, 'normal')
  assert.equal(fixture.root.getAttribute('data-oasis-layout-owner'), 'oasis-professional-service')
  assert.equal(fixture.document.documentElement.style.getPropertyValue('--oasis-right-rail-width'), '360px')
  assert.equal(fixture.document.head.querySelectorAll('[data-oasis-layout-style]').length, 1)

  assert.equal(adapter.apply({ requestedMode: 'expanded', panelWidth: 360 }).effectiveMode, 'expanded')
  assert.equal(fixture.root.hasAttribute('data-oasis-layout-owner'), false)
  assert.equal(fixture.document.documentElement.style.getPropertyValue('--oasis-right-rail-width'), '')

  adapter.apply({ requestedMode: 'normal', panelWidth: 360 })
  assert.equal(adapter.apply({ requestedMode: 'hidden', panelWidth: 360 }).effectiveMode, 'hidden')
  assert.equal(fixture.root.hasAttribute('data-oasis-layout-owner'), false)
  assert.equal(fixture.document.documentElement.style.getPropertyValue('--oasis-right-rail-width'), '')
})

test('foreign layout ownership fails closed without overwriting it', () => {
  const fixture = createFixture()
  fixture.root.setAttribute('data-oasis-layout-owner', 'another-plugin')
  fixture.document.documentElement.style.setProperty('--oasis-right-rail-width', '222px')
  const adapter = createLayoutAdapter({ document: fixture.document, window: fixture.window, watch: false })
  const result = adapter.apply({ requestedMode: 'normal', panelWidth: 360 })
  assert.equal(result.effectiveMode, 'hidden')
  assert.equal(result.status, 'conflict')
  assert.equal(fixture.root.getAttribute('data-oasis-layout-owner'), 'another-plugin')
  assert.equal(fixture.document.documentElement.style.getPropertyValue('--oasis-right-rail-width'), '222px')
})

test('dispose is idempotent and restores every owned artifact', () => {
  const fixture = createFixture()
  const adapter = createLayoutAdapter({ document: fixture.document, window: fixture.window, watch: false })
  const portal = adapter.mountPortal()
  adapter.apply({ requestedMode: 'normal', panelWidth: 360 })
  adapter.dispose()
  adapter.dispose()
  assert.equal(portal.isConnected, false)
  assert.equal(fixture.root.hasAttribute('data-oasis-layout-owner'), false)
  assert.equal(fixture.document.documentElement.style.getPropertyValue('--oasis-right-rail-width'), '')
  assert.equal(fixture.document.head.querySelectorAll('[data-oasis-layout-style]').length, 0)
})

test('explicit runtime fault and Portal unmount both restore the owned DSH layout', () => {
  const faultFixture = createFixture()
  const faultAdapter = createLayoutAdapter({ document: faultFixture.document, window: faultFixture.window, watch: false })
  faultAdapter.mountPortal()
  faultAdapter.apply({ requestedMode: 'normal', panelWidth: 360 })
  const faulted = faultAdapter.fault('synthetic-runtime-fault')
  assert.equal(faulted.effectiveMode, 'hidden')
  assert.equal(faulted.status, 'faulted')
  assert.equal(faultFixture.root.hasAttribute('data-oasis-layout-owner'), false)
  assert.equal(faultFixture.document.documentElement.style.getPropertyValue('--oasis-right-rail-width'), '')

  const unmountFixture = createFixture()
  const unmountAdapter = createLayoutAdapter({ document: unmountFixture.document, window: unmountFixture.window, watch: false })
  const portal = unmountAdapter.mountPortal()
  unmountAdapter.apply({ requestedMode: 'normal', panelWidth: 360 })
  unmountAdapter.unmountPortal(portal)
  assert.equal(portal.isConnected, false)
  assert.equal(unmountFixture.root.hasAttribute('data-oasis-layout-owner'), false)
  assert.equal(unmountFixture.document.documentElement.style.getPropertyValue('--oasis-right-rail-width'), '')
})

test('a CSS write failure restores the layout and reports a fault', () => {
  const fixture = createFixture()
  const original = fixture.document.documentElement.style.setProperty.bind(fixture.document.documentElement.style)
  fixture.document.documentElement.style.setProperty = (name, value, priority) => {
    original(name, value, priority)
    throw new Error('synthetic write failure')
  }
  const adapter = createLayoutAdapter({ document: fixture.document, window: fixture.window, watch: false })
  const result = adapter.apply({ requestedMode: 'normal', panelWidth: 360 })
  assert.equal(result.effectiveMode, 'hidden')
  assert.equal(result.status, 'faulted')
  assert.equal(fixture.root.hasAttribute('data-oasis-layout-owner'), false)
  assert.equal(fixture.document.documentElement.style.getPropertyValue('--oasis-right-rail-width'), '')
})
