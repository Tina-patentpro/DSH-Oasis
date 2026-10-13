import { fileURLToPath } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'
import * as host from '../src/index.js'
import { resolve } from 'node:path'

test('fixture gate requires explicit flag and the existing isolated DSH home, never the real profile', () => {
  assert.equal(typeof host.isUnifiedFixtureEnvironment, 'function')
  const home = (process.platform === 'win32' ? String.raw`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\home` : fileURLToPath(new URL('../../../.dsh-test/mac-dev/home', import.meta.url)))
  assert.equal(host.isUnifiedFixtureEnvironment({ DSH_HOME: home }), false)
  assert.equal(host.isUnifiedFixtureEnvironment({ OASIS_UNIFIED_FIXTURE: '1', DSH_HOME: home }), true)
  assert.equal(host.isUnifiedFixtureEnvironment({ OASIS_UNIFIED_FIXTURE: '1', DSH_HOME: resolve(process.env.USERPROFILE ?? process.env.HOME, '.dsh') }), false)
  assert.equal(host.isUnifiedFixtureEnvironment({ OASIS_UNIFIED_FIXTURE: '1' }), false)
  assert.equal(host.isUnifiedFixtureEnvironment({ OASIS_UNIFIED_FIXTURE: '1', DSH_HOME: resolve('../../../home') }), false)
})
