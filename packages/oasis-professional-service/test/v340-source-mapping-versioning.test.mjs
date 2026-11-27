import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp, copyFile, rm, symlink } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { verifyV340SourceMapping } from '../../../scripts/check-v340-source-mapping.mjs'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const manifestPath = 'docs/business-baseline/v340-source-mapping.json'
const originalBytes = await readFile(resolve(root, manifestPath))
const frozen = JSON.parse(originalBytes)
const snapshotPath = 'docs/business-baseline/v340-source-mapping-20261023/oasis-api-contract.js.txt'
const currentPath = 'packages/oasis-professional-service/src/oasis-api-contract.js'
const historicalHash = '8b56d9374c508304bef84d6f2bf5b7257b633230af5a118532e8e031653f785f'
const currentHash = '16e993ef1dbd7d3ee1152a89a18bce4e47ac0bccc292735940f539ffb6bcabe7'
async function fixture(t) {
  await mkdir(resolve(root, '.local'), { recursive: true })
  const dir = await mkdtemp(resolve(root, '.local/v340-mapping-version-test-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  for (const path of [...frozen.evidence.map(e => e.path), ...frozen.legacyReference.resources.map(e => e.path), snapshotPath]) {
    await mkdir(dirname(resolve(dir, path)), { recursive: true })
    await copyFile(resolve(root, path), resolve(dir, path))
  }
  await writeFile(resolve(dir, 'mapping.json'), originalBytes)
  return dir
}
const verify = repoRoot => verifyV340SourceMapping({ repoRoot, manifestPath: 'mapping.json' })

test('historical mapping and current API review are reported separately without rewriting the frozen manifest', async t => {
  const dir = await fixture(t)
  const result = await verify(dir)
  assert.equal(result.verificationScope, 'historical-mapping-and-reviewed-current-api-source')
  assert.deepEqual(result.apiContractEvidence, {
    historical: { path: currentPath, readPath: snapshotPath, sha256: historicalHash, checkedAt: '2026-10-23' },
    current: { path: currentPath, sha256: currentHash, reviewedAt: '2026-11-27',
      reviewPath: 'docs/evidence/2026-11-27-v340-mapping-repair/api-contract-comparison.md',
      scope: 'static-normalization-review-only' },
  })
  assert.equal(result.dispatchEnabled, false)
  assert.equal(result.realCallVerified, false)
  assert.equal(result.gaps.length, 114)
  assert.equal(frozen.evidence.find(e => e.id === 'api-contract').sha256, historicalHash)
  assert.deepEqual(await readFile(resolve(dir, 'mapping.json')), originalBytes)
  assert.equal(createHash('sha256').update(await readFile(resolve(root, manifestPath))).digest('hex'),
    createHash('sha256').update(originalBytes).digest('hex'))
})

for (const [name, target, source] of [
  ['tampered historical bytes', snapshotPath, null],
  ['current bytes substituted for history', snapshotPath, currentPath],
  ['unreviewed current revision', currentPath, null],
  ['runtime silently rolled back to old contract', currentPath, snapshotPath],
]) test(`versioned mapping refuses ${name}`, async t => {
  const dir = await fixture(t)
  if (source) await copyFile(resolve(dir, source), resolve(dir, target))
  else await writeFile(resolve(dir, target), 'unreviewed replacement')
  await assert.rejects(verify(dir), { code: 'MAPPING_RESOURCE_DRIFT' })
})

for (const target of [snapshotPath, currentPath]) test(`versioned mapping refuses a symlink at ${target}`, async t => {
  const dir = await fixture(t)
  await rm(resolve(dir, target))
  await symlink(resolve(root, target), resolve(dir, target))
  await assert.rejects(verify(dir), { code: 'MAPPING_PATH' })
})

test('new review cannot replace the historical evidence pin or date in the manifest', async t => {
  const dir = await fixture(t)
  const changed = structuredClone(frozen)
  Object.assign(changed.evidence.find(e => e.id === 'api-contract'), { sha256: currentHash, checkedAt: '2026-11-27' })
  await writeFile(resolve(dir, 'mapping.json'), JSON.stringify(changed))
  await assert.rejects(verify(dir), { code: 'MAPPING_INVALID' })
})
