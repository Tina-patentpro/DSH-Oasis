import assert from 'node:assert/strict'
import test from 'node:test'
import { createWorkbenchStore } from '../src/client/workbench-store.js'

const module = await import('../src/client/oasis-connection-settings.js').catch((error) => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
  return {}
})
const tick = () => new Promise((resolve) => setImmediate(resolve))
const deferred = () => {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

function fixture(options = {}) {
  assert.equal(typeof module.createOasisConnectionSettings, 'function', 'D1 configuration controller must exist')
  const calls = []
  const listeners = new Set()
  const generationListeners = new Set()
  const events = new Map()
  let generation = { id: 1, host: { name: 'synthetic-host' } }
  let state = {
    status: 'ready', mode: 'host', writable: true,
    value: { environmentKind: 'non-production', apiBaseUrl: 'http://127.0.0.1:1234', credentialRef: 'OASIS_USER_JWT', downloadOrigins: [] },
  }
  const scope = {
    getSnapshot: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    async set(field, value) {
      calls.push(['settings', field, value])
      if (options.saveError) throw new Error('synthetic private error')
      state = { ...state, value: { ...state.value, [field]: value } }
      for (const fn of listeners) fn()
    },
  }
  const credentials = {
    async describe(refs) {
      calls.push(['describe', refs])
      return options.describe?.() ?? { ok: true, value: { OASIS_USER_JWT: { configured: true, writable: true } } }
    },
    async set(ref, value) {
      calls.push(['credential', ref, value])
      return options.set?.() ?? { ok: true, value: undefined }
    },
  }
  const controller = module.createOasisConnectionSettings({ onInvalidated: options.onInvalidated })
  const detach = controller.bind({
    settingsScope: { bind(spec) { assert.deepEqual(spec, { namespace: 'oasis-professional-service' }); return scope } },
    connection: {
      isLoopback: true,
      generation: { getSnapshot: () => generation, subscribe(fn) { generationListeners.add(fn); return () => generationListeners.delete(fn) } },
    },
    remote: { $host: { isLoopback: true }, credentials, $on(name, fn) { events.set(name, fn); return () => events.delete(name) } },
  })
  return {
    controller, calls, detach, listeners, generationListeners, events,
    change(patch) { state = { ...state, ...patch }; for (const fn of listeners) fn() },
    connect(next) { generation = next === undefined ? undefined : { id: (generation?.id ?? 1) + 1, host: next }; for (const fn of generationListeners) fn() },
  }
}

test('settings and JWT are separate public writes; production and non-origin inputs never reach the Host', async () => {
  const f = fixture()
  await tick()
  assert.equal(f.controller.getSnapshot().canSubmit, true)
  assert.equal(await f.controller.saveApiBaseUrl('https://lzhxpy.oasisintwrite.com'), false)
  assert.equal(await f.controller.saveApiBaseUrl('https://test.invalid/path?token=x'), false)
  assert.equal(f.calls.filter((x) => x[0] === 'settings').length, 0)
  assert.equal(await f.controller.saveApiBaseUrl('http://127.0.0.1:4321/'), true)
  assert.equal(await f.controller.saveDownloadOrigins('https://files.invalid/\nhttps://files.invalid'), true)
  assert.deepEqual(f.calls.filter((x) => x[0] === 'settings'), [
    ['settings', 'apiBaseUrl', 'http://127.0.0.1:4321'], ['settings', 'downloadOrigins', ['https://files.invalid']],
  ])
  assert.equal(f.calls.some((x) => x[0] === 'credential'), false)
  assert.equal(f.controller.getSnapshot().restartRequired, true)
  assert.equal(f.controller.getSnapshot().canSubmit, false)
  f.connect(undefined)
  f.connect({ name: 'reconnected' })
  await tick()
  assert.equal(f.controller.getSnapshot().restartRequired, true, 'a reconnect must not claim a Host restart')
  f.controller.dispose()
})

test('a failed credential update is not success even when an old credential remains configured; no secret in state', async () => {
  const f = fixture({ set: () => ({ ok: false, error: { message: 'synthetic-jwt-must-not-echo' } }) })
  await tick()
  assert.equal(await f.controller.updateCredential('synthetic-jwt-must-not-echo'), false)
  assert.equal(f.controller.getSnapshot().credentialConfigured, true)
  assert.match(f.controller.getSnapshot().error, /凭据更新失败/)
  assert.doesNotMatch(JSON.stringify(f.controller.getSnapshot()), /synthetic-jwt-must-not-echo/)
  assert.equal(f.controller.getSnapshot().notice, null)
  f.controller.dispose()
})

test('empty JWT never deletes or writes; duplicate pending writes are rejected and successful update refreshes metadata', async () => {
  const pending = deferred()
  const invalidations = []
  const f = fixture({ set: () => pending.promise, onInvalidated: (value) => invalidations.push(value) })
  await tick()
  assert.equal(await f.controller.updateCredential('  '), false)
  const first = f.controller.updateCredential('synthetic-token')
  assert.equal(await f.controller.updateCredential('another-synthetic-token'), false)
  assert.equal(f.calls.filter((x) => x[0] === 'credential').length, 1)
  pending.resolve({ ok: true, value: undefined })
  assert.equal(await first, true)
  assert.ok(invalidations.some((x) => x.reload === true))
  assert.match(f.controller.getSnapshot().notice, /凭据已更新/)
  assert.doesNotMatch(JSON.stringify(f.controller.getSnapshot()), /synthetic-token/)
  f.controller.dispose()
})

test('disconnect ignores late credential reads, blocks writes, and reconnect refreshes; detach removes subscriptions', async () => {
  const pending = deferred()
  let count = 0
  const f = fixture({ describe: () => ++count === 1 ? pending.promise : { ok: true, value: { OASIS_USER_JWT: { configured: false, writable: true } } } })
  f.connect(undefined)
  pending.resolve({ ok: true, value: { OASIS_USER_JWT: { configured: true, writable: true } } })
  await tick()
  assert.equal(f.controller.getSnapshot().connected, false)
  assert.equal(f.controller.getSnapshot().credentialConfigured, false)
  assert.equal(await f.controller.saveApiBaseUrl('http://127.0.0.1:4321'), false)
  f.connect({ name: 'next-host' })
  await tick()
  assert.equal(f.controller.getSnapshot().credentialConfigured, false)
  f.detach()
  assert.equal(f.listeners.size + f.generationListeners.size + f.events.size, 0)
  assert.equal(f.controller.getSnapshot().canSubmit, false)
  f.controller.dispose()
})

test('readonly/mismatched configuration and save failures remain fail-closed with safe errors', async () => {
  const f = fixture({ saveError: true })
  await tick()
  assert.equal(await f.controller.saveDownloadOrigins('https://files.invalid'), false)
  assert.match(f.controller.getSnapshot().error, /保存失败/)
  assert.doesNotMatch(JSON.stringify(f.controller.getSnapshot()), /synthetic private error/)
  f.change({ writable: false })
  const before = f.calls.length
  assert.equal(await f.controller.saveApiBaseUrl(''), false)
  assert.equal(f.calls.length, before)
  f.change({ value: { environmentKind: 'non-production', credentialRef: 'OTHER_REF', apiBaseUrl: '', downloadOrigins: [] } })
  assert.equal(f.controller.getSnapshot().canSubmit, false)
  assert.equal(f.controller.getSnapshot().settingsWritable, false)
  f.controller.dispose()
})

test('unavailable settings do not prevent local Workspace task creation', async () => {
  assert.equal(typeof module.createOasisConnectionSettings, 'function')
  const settings = module.createOasisConnectionSettings()
  const store = createWorkbenchStore({ connectionSettings: settings, createId: () => 'local-task' })
  assert.equal(store.connectionSettings, settings)
  store.syncWorkspaces([{ workspaceId: 'a' }])
  store.openPanel('a')
  assert.equal(store.getWorkspaceState('a').pages.length, 1)
  assert.equal(settings.getSnapshot().canSubmit, false)
  await store.dispose()
  settings.dispose()
})

test('configuration refresh rejects old bootstrap responses without overwriting Workspace drafts', async () => {
  const old = deferred()
  let calls = 0
  const store = createWorkbenchStore({ remote: { getProfessionalBootstrap: () => ++calls === 1 ? old.promise : Promise.resolve({ credentialConfigured: false }) } })
  store.syncWorkspaces([{ workspaceId: 'a' }])
  const first = store.loadProfessionalBootstrap('a')
  assert.equal(typeof store.refreshProfessionalConfiguration, 'function')
  await store.refreshProfessionalConfiguration(true)
  old.resolve({ credentialConfigured: true })
  await first
  assert.equal(store.getWorkspaceState('a').professionalBootstrap.credentialConfigured, false)
  assert.equal(calls, 2)
  await store.dispose()
})

test('external setting changes require a Host restart rather than enabling submission against old runtime settings', async () => {
  const f = fixture()
  await tick()
  f.change({ value: { environmentKind: 'non-production', apiBaseUrl: 'http://127.0.0.1:5678', credentialRef: 'OASIS_USER_JWT', downloadOrigins: [] } })
  await f.controller.refresh()
  assert.equal(f.controller.getSnapshot().restartRequired, true)
  assert.equal(f.controller.getSnapshot().canSubmit, false)
  f.controller.dispose()
})

test('configuration invalidation clears confirmations, preserves local task drafts, and blocks remote submission', async () => {
  const settings = module.createOasisConnectionSettings()
  const store = createWorkbenchStore({ connectionSettings: settings, createId: () => 'local-task' })
  store.syncWorkspaces([{ workspaceId: 'a' }])
  store.openPanel('a')
  const page = store.getWorkspaceState('a').pages[0]
  store.renamePage('a', page.pageId, '本地草稿')
  store.setProfessionalConfirmations('a', page.pageId, { priceConfirmed: true, externalTransferConfirmed: true })
  await store.refreshProfessionalConfiguration()
  const state = store.getWorkspaceState('a')
  assert.equal(state.pages[0].title, '本地草稿')
  assert.equal(state.pageOperations[page.pageId].priceConfirmed, false)
  assert.equal(state.pageOperations[page.pageId].externalTransferConfirmed, false)
  await assert.rejects(store.startProfessional('a', page.pageId), /连接配置/)
  await assert.rejects(store.continueProfessional('a', page.pageId, 'unused'), /连接配置/)
  await store.dispose()
  settings.dispose()
})
