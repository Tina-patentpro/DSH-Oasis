import assert from 'node:assert/strict'
import test from 'node:test'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { isNativeOfflineEnvironment } from '../src/unified-fixture-environment.js'
import * as module from '../src/native-offline-runtime.js'

test('offline composition requires exact isolated Home and explicit flag', () => {
  assert.equal(isNativeOfflineEnvironment({}), false)
  assert.equal(isNativeOfflineEnvironment({ OASIS_NATIVE_OFFLINE: '1', DSH_HOME: resolve(process.env.USERPROFILE ?? process.env.HOME, '.dsh') }), false)
})
test('approved isolated Home admits only the explicit native offline flag', { skip: !existsSync(new URL('../../../.dsh-test/stage2-desktop', import.meta.url)) }, () => {
  const DSH_HOME = fileURLToPath(new URL('../../../.dsh-test/stage2-desktop', import.meta.url))
  assert.equal(isNativeOfflineEnvironment({ DSH_HOME, OASIS_NATIVE_OFFLINE: '1' }), true)
  assert.equal(isNativeOfflineEnvironment({ DSH_HOME, OASIS_UNIFIED_FIXTURE: '1' }), false)
  assert.equal(isNativeOfflineEnvironment({ DSH_HOME, OASIS_NATIVE_OFFLINE: 'true' }), false)
})
test('absent native services do not advertise an enabled local runtime', () => {
  assert.equal(typeof module.createNativeOfflineRuntime, 'function')
  assert.equal(module.createNativeOfflineRuntime({}, {}), null)
})
test('isolated Host declares native services before accessing Cordis context', { skip: !existsSync(new URL('../../../.dsh-test/stage2-desktop', import.meta.url)) }, async () => {
  const before = { DSH_HOME: process.env.DSH_HOME, OASIS_NATIVE_OFFLINE: process.env.OASIS_NATIVE_OFFLINE }
  try {
    process.env.DSH_HOME = fileURLToPath(new URL('../../../.dsh-test/stage2-desktop', import.meta.url))
    process.env.OASIS_NATIVE_OFFLINE = '1'
    const host = await import('../src/index.js?stage4c-native-inject')
    for (const service of ['llm', 'sessions', 'sessionProjections', 'agentDefaultModel']) assert.ok(host.inject.includes(service), service)
  } finally {
    for (const [key, value] of Object.entries(before)) { if (value === undefined) delete process.env[key]; else process.env[key] = value }
  }
})
