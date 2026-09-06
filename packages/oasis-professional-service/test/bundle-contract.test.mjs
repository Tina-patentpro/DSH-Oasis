import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packagePath = resolve(packageRoot, 'package.json')
const patchPath = resolve(packageRoot, 'cordis.patch.yml')
const hostPath = resolve(packageRoot, 'src/index.js')
const clientPath = resolve(packageRoot, 'src/client.js')

test('declares one installable DSH bundle with host and web client faces', () => {
  for (const path of [packagePath, patchPath, hostPath, clientPath]) {
    assert.equal(existsSync(path), true, `required bundle file missing: ${path}`)
  }
  if (![packagePath, patchPath, hostPath, clientPath].every(existsSync)) return

  const manifest = JSON.parse(readFileSync(packagePath, 'utf8'))
  assert.equal(manifest.name, 'oasis-professional-service')
  assert.equal(manifest.type, 'module')
  assert.equal(manifest.exports['.'], './src/index.js')
  assert.equal(manifest.exports['./client'], './lib/client.js')
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(manifest.dsh.client.platform, 'web')
  assert.deepEqual(manifest.dsh.client.inject, [
    '@deepseek-ai/dsh-client-connection',
    '@deepseek-ai/dsh-client-ui-conversation',
    '@deepseek-ai/dsh-client-ui-layout',
    '@deepseek-ai/dsh-client-ui-settings',
  ])

  const patch = readFileSync(patchPath, 'utf8')
  assert.match(patch, /id:\s+oasis-professional-service/)
  assert.match(patch, /name:\s+['"]?oasis-professional-service['"]?/)

  const client = readFileSync(clientPath, 'utf8')
  assert.match(client, /conversation\.input\.right/)
  assert.match(client, /oasis-professional-entry/)
})
