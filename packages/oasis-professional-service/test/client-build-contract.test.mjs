import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packagePath = resolve(packageRoot, 'package.json')
const configPath = resolve(packageRoot, 'tsdown.config.mjs')
const bundlePath = resolve(packageRoot, 'lib/client.js')

test('builds the browser face as a DSH lazy-CJS module', () => {
  const manifest = JSON.parse(readFileSync(packagePath, 'utf8'))
  assert.equal(manifest.exports['./client'], './lib/client.js')
  assert.equal(manifest.scripts.build, 'tsdown --config tsdown.config.mjs')
  assert.equal(manifest.scripts.test, 'node --test test/*.test.mjs')
  assert.equal(manifest.scripts.verify, 'tsdown --config tsdown.config.mjs && node --test test/*.test.mjs && npm pack --dry-run --json')
  assert.equal(existsSync(configPath), true, 'client build config must exist')
  assert.equal(existsSync(bundlePath), true, 'built DSH client bundle must exist')
  if (!existsSync(bundlePath)) return

  const bundle = readFileSync(bundlePath, 'utf8')
  assert.match(bundle, /window\.__ModuleLoader__\.load\(\{\s*id:\s*["']oasis-professional-service["']/)
  assert.match(bundle, /require\(["']react["']\)/)
  assert.match(bundle, /require\(["']react-dom["']\)/)
  assert.match(bundle, /require\(["']@deepseek-ai\/dsh-client-ui-primitives["']\)/)
  assert.doesNotMatch(bundle, /function renderSettled\(/, 'must use the host renderer, not bundle a private copy')
  assert.match(bundle, /return module\.exports/)
})

test('cleans stale browser artifacts before each build', () => {
  const config = readFileSync(configPath, 'utf8')
  assert.match(config, /clean:\s*true/)
  assert.doesNotMatch(config, /clean:\s*false/)
})
