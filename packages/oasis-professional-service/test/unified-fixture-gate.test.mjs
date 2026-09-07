import test from 'node:test'
import assert from 'node:assert/strict'
import * as host from '../src/index.js'
import { resolve } from 'node:path'

test('fixture gate requires explicit flag and the existing isolated DSH home, never the real profile', () => {
  assert.equal(typeof host.isUnifiedFixtureEnvironment, 'function')
  const home = resolve('../../.dsh-test/stage2-desktop')
  assert.equal(host.isUnifiedFixtureEnvironment({ DSH_HOME: home }), false)
  assert.equal(host.isUnifiedFixtureEnvironment({ OASIS_UNIFIED_FIXTURE: '1', DSH_HOME: home }), true)
  assert.equal(host.isUnifiedFixtureEnvironment({ OASIS_UNIFIED_FIXTURE: '1', DSH_HOME: resolve(process.env.USERPROFILE, '.dsh') }), false)
  assert.equal(host.isUnifiedFixtureEnvironment({ OASIS_UNIFIED_FIXTURE: '1' }), false)
})
