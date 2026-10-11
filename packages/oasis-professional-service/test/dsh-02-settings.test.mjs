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
