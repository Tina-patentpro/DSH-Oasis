import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(here, '../../../..')
const outputRoot = resolve(here, '../week1-profile-web')
mkdirSync(outputRoot, { recursive: true })
const result = spawnSync(process.execPath, ['scripts/verify-week1-supplement.mjs'], {
  cwd: repositoryRoot,
  env: {
    ...process.env,
    OASIS_EVIDENCE_ROOT: outputRoot,
    OASIS_REAL_DSH_PROFILE: 'C:\\Users\\TinaD\\.dsh\\profiles\\web',
    OASIS_BROWSER_EXECUTABLE: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  },
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  timeout: 10 * 60 * 1000,
})
writeFileSync(resolve(here, 'week1-profile-web-verifier.txt'), `${result.stdout ?? ''}${result.stderr ?? ''}`, 'utf8')
writeFileSync(resolve(here, 'week1-profile-web-summary.json'), `${JSON.stringify({
  outputRoot,
  status: result.status,
  signal: result.signal,
  error: result.error ? { name: result.error.name, message: result.error.message, code: result.error.code } : null,
}, null, 2)}\n`, 'utf8')
if (result.status !== 0) process.exitCode = 1
