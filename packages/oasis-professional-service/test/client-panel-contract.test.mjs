import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { apply, inject } from '../src/client.js'
import { CODEX_PANEL_ICONS } from '../src/client/codex-icons.js'
import { WorkbenchEntry } from '../src/client/WorkbenchEntry.js'
import { createWorkbenchStore } from '../src/client/workbench-store.js'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

test('registers additive entry and panel host slots but never details', () => {
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
  dispose()
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

test('entry opens a visible normal panel directly through the shared store', () => {
  const store = createWorkbenchStore()
  const workspaces = { items: [{ workspaceId: 'workspace-a', sessionIds: ['session-a'] }] }
  const focusTargets = new Map()
  const button = WorkbenchEntry({
    sessionId: 'session-a',
    store,
    focusTargets,
    useWorkspaces: (selector) => selector(workspaces),
  })
  const trigger = { focus() {} }
  button.ref(trigger)
  button.props.onClick({ currentTarget: trigger })

  const state = store.getWorkspaceState('workspace-a')
  assert.equal(state.panelMode, 'normal')
  assert.equal(state.pages.length, 1)
  assert.equal(focusTargets.get('workspace-a'), trigger)
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
  })
  const entryB = WorkbenchEntry({
    sessionId: 'session-b', store, focusTargets, useWorkspaces: (selector) => selector(workspaces),
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
