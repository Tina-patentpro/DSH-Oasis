import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'))

test('does not expose stale week-one or week-two phase labels in current runtime metadata', () => {
  const hostEntry = readFileSync(resolve(packageRoot, 'src/index.js'), 'utf8')
  const status = readFileSync(resolve(packageRoot, 'src/status.js'), 'utf8')
  const patch = readFileSync(resolve(packageRoot, 'cordis.patch.yml'), 'utf8')
  const stalePhase = /week[- ](?:one|two)|week-[12]/i
  assert.doesNotMatch(hostEntry, stalePhase)
  assert.doesNotMatch(status, stalePhase)
  assert.doesNotMatch(patch, stalePhase)
})

test('pins the verified development dependency versions', () => {
  assert.deepEqual(manifest.devDependencies, {
    '@deepseek-ai/cordis': '4.0.1',
    '@deepseek-ai/dsh-client-connection': '0.1.1-rc.2',
    '@deepseek-ai/dsh-client-ui-conversation': '0.1.1-rc.2',
    '@deepseek-ai/dsh-client-ui-layout': '0.1.1-rc.2',
    '@deepseek-ai/dsh-credentials': '0.1.1-rc.2',
    '@deepseek-ai/dsh-settings': '0.1.1-rc.2',
    '@deepseek-ai/dsh-storage-domain': '0.1.1-rc.2',
    '@deepseek-ai/dsh-tools': '0.1.1-rc.2',
    '@deepseek-ai/dsh-workspace': '0.1.1-rc.2',
    '@deepseek-ai/schemastery': '3.18.1',
    react: '18.2.0',
    'react-dom': '18.2.0',
    tsdown: '0.22.14',
    zod: '4.4.3',
  })
})

test('declares the Portal runtime as matched React peer dependencies', () => {
  assert.equal(manifest.peerDependencies.react, '18.2.0')
  assert.equal(manifest.peerDependencies['react-dom'], '18.2.0')
})

test('declares direct Host peers for settings, credentials, and their schema runtime', () => {
  assert.equal(manifest.peerDependencies['@deepseek-ai/dsh-credentials'], '0.1.1-rc.2')
  assert.equal(manifest.peerDependencies['@deepseek-ai/dsh-settings'], '0.1.1-rc.2')
  assert.equal(manifest.peerDependencies['@deepseek-ai/schemastery'], '3.18.1')
})

test('keeps the distribution whitelist free of tests and local state', () => {
  assert.deepEqual(manifest.files, ['src', 'lib', 'docs/api/oasis-professional-service-baseline.json', 'cordis.patch.yml'])
  assert.equal(manifest.files.some((entry) => /test|node_modules|\.dsh-test|pnpm-lock/.test(entry)), false)
})

test('declares repeatable verification scripts', () => {
  assert.equal(manifest.scripts.build, 'tsdown --config tsdown.config.mjs')
  assert.equal(manifest.scripts.test, 'node --test test/*.test.mjs')
  assert.equal(manifest.scripts['test:unit'], 'node --test test/*.test.mjs')
  assert.equal(manifest.scripts['test:integration'], 'node --test test/host-runtime.integration.test.mjs')
  assert.equal(manifest.scripts.verify, 'tsdown --config tsdown.config.mjs && node --test test/*.test.mjs && npm pack --dry-run --json')
})
