import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveConfig } from '@deepseek-ai/cordis'
import * as host from '../src/index.js'
import { registerOasisSettings } from '../src/oasis-runtime-config.js'
import { createProductSettings } from '../src/client/product-settings.js'

test('target Host uses plugin Config and native presentation, not removed namespace registration', () => {
  assert.ok(host.Config, 'Host must expose its Config to DSH 0.2 settings projection')
  assert.equal(host.Config.meta.volatile, true)
  const config = resolveConfig(host, {})
  assert.equal(typeof config.get, 'function')
  let release = 0, cleanup
  const fiber = {}
  const scope = registerOasisSettings({ fiber,
    settings: { configure(policy, owner) { assert.deepEqual(policy, { auto: false }); assert.equal(owner, fiber); return () => { release++ } } },
    effect(fn) { cleanup = fn() },
  }, config)
  assert.deepEqual(scope.get().workspaceApiBindings, [])
  assert.deepEqual(scope.get().websiteProjectLinks, [])
  cleanup()
  assert.equal(release, 1)
})

test('product settings share ConfigForms owner without disposing the shared form', async () => {
  let listener, unsubscribe = 0, gets = 0
  const form = {
    getSnapshot: () => ({ status: 'ready', mode: 'host', writable: true, value: {} }),
    subscribe(fn) { listener = fn; return () => { unsubscribe++ } },
    dispose() { assert.fail('consumer must not dispose provider-owned form') },
  }
  const controller = createProductSettings({ remote: { accountStatus: async () => ({ authenticated: true, available: true, writable: true, accountId: 1, revision: 'r1', retryAfterSeconds: 0 }) } })
  controller.bind({ configForms: { get(id) { gets++; assert.equal(id, 'oasis-professional-service'); return form } },
    remote: { $host: { isLoopback: true } }, connection: { isLoopback: true, generation: { getSnapshot: () => 1, subscribe: () => () => {} } },
  })
  await controller.refresh()
  assert.equal(gets, 1)
  assert.equal(controller.getSnapshot().settingsStatus, 'ready')
  assert.equal(controller.getSnapshot().canSubmit, true)
  listener()
  controller.dispose()
  assert.equal(unsubscribe, 1)
})

test('the installed generation entry owns the suite setting instead of the package-name entry', async () => {
  const namespace = 'oasis-professional-service-m06-native-generation'
  let saved = {}, listener
  const form = {
    getSnapshot: () => ({ status: 'ready', mode: 'host', writable: true, value: saved }),
    subscribe(fn) { listener = fn; return () => {} },
    async set(key, value) { saved = { ...saved, [key]: value }; listener(); return true },
  }
  const absent = { getSnapshot: () => ({ status: 'unavailable' }), subscribe: () => () => {} }
  const controller = createProductSettings({ remote: {
    getV340Catalog: async () => ({ settingsNamespace: namespace }),
    accountStatus: async () => ({ authenticated: false, available: false, writable: false,
      accountId: null, revision: null, retryAfterSeconds: 0 }),
  } })
  try {
    controller.bind({ configForms: { get: id => id === namespace ? form : absent },
      remote: { $host: { isLoopback: true } },
      connection: { isLoopback: true, generation: { getSnapshot: () => 1, subscribe: () => () => {} } } })
    await controller.refresh()
    assert.equal(controller.getSnapshot().localSkillSuite, 'oasis')
    assert.equal(await controller.saveLocalSkillSuite('patent-disclosure'), true)
    assert.deepEqual(saved, { localSkillSuite: 'patent-disclosure' })
  } finally { controller.dispose() }
})

test('a protected installed profile stores the suite through the managed Host preference', async () => {
  let suite = 'oasis'
  const protectedForm = {
    getSnapshot: () => ({ status: 'ready', mode: 'host', writable: true, value: {} }),
    subscribe: () => () => {},
    set: async () => { assert.fail('protected configuration must not be edited') },
  }
  const controller = createProductSettings({ remote: {
    getV340Catalog: async () => ({ managedSkillSuite: true, settingsNamespace: 'oasis-professional-service-m06-native-generation' }),
    getLocalSkillSuite: async () => ({ suite }),
    setLocalSkillSuite: async next => ({ suite: suite = next }),
    accountStatus: async () => ({ authenticated: false, available: false, writable: false,
      accountId: null, revision: null, retryAfterSeconds: 0 }),
  } })
  try {
    controller.bind({ configForms: { get: () => protectedForm }, remote: { $host: { isLoopback: true } },
      connection: { isLoopback: true, generation: { getSnapshot: () => 1, subscribe: () => () => {} } } })
    await controller.refresh()
    assert.equal(await controller.saveLocalSkillSuite('patent-disclosure'), true)
    await controller.refresh()
    assert.equal(controller.getSnapshot().localSkillSuite, 'patent-disclosure')
  } finally { controller.dispose() }
})
