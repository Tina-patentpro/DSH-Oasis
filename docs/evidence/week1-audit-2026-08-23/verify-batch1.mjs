import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve('docs/evidence/week1-audit-2026-08-23')
const read = (name) => readFileSync(resolve(root, name), 'utf8')

const environment = read('environment.txt')
assert.match(environment, /0\.1\.1-rc\.2/)
assert.match(environment, /v22\.19\.0/)
assert.match(environment, /11\.19\.0/)
assert.match(environment, /where dsh[\s\S]*Could not find/)

const sourceHashes = read('source-hashes-before.txt').trim().split(/\r?\n/)
const profileHashes = read('profile-hashes-before.txt').trim().split(/\r?\n/)
assert.equal(sourceHashes.length, 28)
assert.equal(profileHashes.length, 113)

const commit = JSON.parse(read('official-master-commit.json'))
assert.equal(commit.sha, 'b150a551b8d465e31e418e1b2eaf5e79bbb7d28e')
for (const name of [
  'official-basic-index.md',
  'official-tool.md',
  'official-publish.md',
  'official-client-agents.md',
  'official-client-cookbook.md',
  'official-skills.md',
]) {
  assert.ok(statSync(resolve(root, name)).size > 500, `${name} must be non-empty`)
}

const pack = JSON.parse(read('npm-pack-dry-run-success.json'))
assert.equal(pack[0].entryCount, 7)
assert.equal(pack[0].name, 'oasis-professional-service')

const dependencies = JSON.parse(read('pnpm-list-depth0-verified.json'))[0].devDependencies
assert.equal(dependencies['@deepseek-ai/dsh-tools'].version, '0.1.1-rc.2')
assert.equal(dependencies['@deepseek-ai/dsh-client-ui-conversation'].version, '0.1.1-rc.2')
assert.equal(dependencies.react.version, '18.2.0')

assert.match(read('requirements-traceability.md'), /UNSUPPORTED/)
assert.match(read('contract-audit-batch1.md'), /P2-C01/)

console.log(JSON.stringify({
  sourceFiles: sourceHashes.length,
  profileFiles: profileHashes.length,
  officialCommit: commit.sha,
  packedFiles: pack[0].entryCount,
  batch: 'tasks-1-3',
  result: 'verified',
}))
