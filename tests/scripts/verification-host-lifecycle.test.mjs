import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'

const projectRoot = resolve(import.meta.dirname, '../..')
const verifiers = [
  'scripts/verify-week1-supplement.mjs',
  'scripts/verify-week2-persistence.mjs',
  'scripts/verify-week3-local-loop.mjs',
]

test('all long-running DSH verifiers stop the owned Host with a bounded portable lifecycle', async () => {
  for (const relativePath of verifiers) {
    const source = await readFile(resolve(projectRoot, relativePath), 'utf8')
    assert.doesNotMatch(source, /taskkill\.exe/i, `${relativePath} must not rely on sandbox-blocked taskkill`)
    assert.match(source, /child\.kill\('SIGTERM'\)/, `${relativePath} must terminate its directly owned child`)
    assert.match(source, /Promise\.race\(/, `${relativePath} must bound the process-exit wait`)
    assert.match(source, /assertPortClosed\(port\)/, `${relativePath} must prove the Host port closed`)
  }
})
