import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const modulePath = resolve(packageRoot, 'src/status.js')

test('creates the immutable week-three local professional loop status contract', async () => {
  assert.equal(existsSync(modulePath), true, 'status module must exist')
  if (!existsSync(modulePath)) return

  const { createPluginStatus } = await import(pathToFileURL(modulePath))
  const status = createPluginStatus()

  assert.deepEqual(status, {
    schemaVersion: '1.0.0',
    plugin: 'oasis-professional-service',
    phase: 'week-3',
    capabilityLevel: 'local-professional-loop',
    localFirst: true,
    externalSystems: 'not-invoked',
    supportedWorkTypes: [
      'technical-rd',
      'cn-invention-patent',
    ],
  })
  assert.equal(Object.isFrozen(status), true)
  assert.equal(Object.isFrozen(status.supportedWorkTypes), true)
  assert.equal('benchmarkDomains' in status, false)
})
