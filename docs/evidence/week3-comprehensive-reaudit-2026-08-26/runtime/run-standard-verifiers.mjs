import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(here, '../../../..')
const evidenceRoot = resolve(here, '..')
const commonEnvironment = {
  ...process.env,
  OASIS_REAL_DSH_PROFILE: 'C:\\Users\\TinaD\\.dsh',
  OASIS_BROWSER_EXECUTABLE: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
}
const verifiers = [
  ['week1', 'scripts/verify-week1-supplement.mjs'],
  ['week2', 'scripts/verify-week2-persistence.mjs'],
  ['week3', 'scripts/verify-week3-local-loop.mjs'],
]
const summary = []

for (const [name, script] of verifiers) {
  const outputRoot = resolve(evidenceRoot, name)
  mkdirSync(outputRoot, { recursive: true })
  const startedAt = new Date().toISOString()
  const result = spawnSync(process.execPath, [script], {
    cwd: repositoryRoot,
    env: { ...commonEnvironment, OASIS_EVIDENCE_ROOT: outputRoot },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 10 * 60 * 1000,
  })
  writeFileSync(resolve(here, `${name}-verifier.txt`), `${result.stdout ?? ''}${result.stderr ?? ''}`, 'utf8')
  summary.push({
    name,
    script,
    outputRoot,
    startedAt,
    finishedAt: new Date().toISOString(),
    status: result.status,
    signal: result.signal,
    error: result.error ? { name: result.error.name, message: result.error.message, code: result.error.code } : null,
  })
}

writeFileSync(resolve(here, 'standard-verifiers-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
if (summary.some((entry) => entry.status !== 0)) process.exitCode = 1
