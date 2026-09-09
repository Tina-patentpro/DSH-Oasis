import { lstatSync, realpathSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Development-only admission, not a user-facing generation setting or a production provider.
export function isUnifiedFixtureEnvironment(env = process.env) {
  if (env.OASIS_UNIFIED_FIXTURE !== '1' || !env.DSH_HOME) return false
  const expected = fileURLToPath(new URL('../../../.dsh-test/stage2-desktop', import.meta.url))
  try {
    const normalized = path => resolve(path).toLocaleLowerCase('en-US')
    if (normalized(env.DSH_HOME) !== normalized(expected)) return false
    for (const path of [expected, dirname(expected)]) {
      if (lstatSync(path).isSymbolicLink() || normalized(realpathSync(path)) !== normalized(path)) return false
    }
    return lstatSync(expected).isDirectory()
  } catch { return false }
}

export function isNativeOfflineEnvironment(env = process.env) {
  return env.OASIS_NATIVE_OFFLINE === '1' && isUnifiedFixtureEnvironment({ ...env, OASIS_UNIFIED_FIXTURE: '1' })
}
