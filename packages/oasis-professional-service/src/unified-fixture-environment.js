import { lstatSync, realpathSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Development-only admission, not a user-facing generation setting or a production provider.
export function isUnifiedFixtureEnvironment(env = process.env) {
  if (env.OASIS_UNIFIED_FIXTURE !== '1' || !env.DSH_HOME) return false
  // This isolated candidate is not a portable fixture-enabled release.
  const expected = process.platform === 'win32'
    ? String.raw`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\home`
    : fileURLToPath(new URL('../../../.dsh-test/mac-dev/home', import.meta.url))
  try {
    const normalized = path => process.platform === 'win32' ? resolve(path).toLocaleLowerCase('en-US') : resolve(path)
    if (process.platform !== 'win32' && env.DSH_HOME !== resolve(env.DSH_HOME)) return false
    if (normalized(env.DSH_HOME) !== normalized(expected)) return false
    for (const path of [expected, dirname(expected), dirname(dirname(expected))]) {
      if (lstatSync(path).isSymbolicLink() || normalized(realpathSync(path)) !== normalized(path)) return false
    }
    return lstatSync(expected).isDirectory()
  } catch { return false }
}

export function isNativeOfflineEnvironment(env = process.env) {
  return env.OASIS_NATIVE_OFFLINE === '1' && isUnifiedFixtureEnvironment({ ...env, OASIS_UNIFIED_FIXTURE: '1' })
}
