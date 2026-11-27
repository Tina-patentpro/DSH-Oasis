import { lstatSync, realpathSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Development-only admission, not a user-facing generation setting or a production provider.
export function isUnifiedFixtureEnvironment(env = process.env) {
  if (env.OASIS_UNIFIED_FIXTURE !== '1' || !env.DSH_HOME) return false
  // This isolated candidate is not a portable fixture-enabled release.
  if (process.platform === 'win32') return false
  const expected = fileURLToPath(new URL('../../../.dsh-test/mac-dev/home', import.meta.url))
  try {
    if (env.DSH_HOME !== resolve(env.DSH_HOME) || resolve(env.DSH_HOME) !== resolve(expected)) return false
    for (const path of [expected, dirname(expected), dirname(dirname(expected))]) {
      if (lstatSync(path).isSymbolicLink() || resolve(realpathSync(path)) !== resolve(path)) return false
    }
    return lstatSync(expected).isDirectory()
  } catch { return false }
}

export function isNativeOfflineEnvironment(env = process.env) {
  return env.OASIS_NATIVE_OFFLINE === '1' && isUnifiedFixtureEnvironment({ ...env, OASIS_UNIFIED_FIXTURE: '1' })
}
