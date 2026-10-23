import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdir, mkdtemp, copyFile, realpath, rm, stat } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
const manifestPath = 'docs/business-baseline/v340-source-mapping.json'
const frozen = JSON.parse(await readFile(resolve(repoRoot, manifestPath)))
async function fixture(t) {
  const dir = await realpath(await mkdtemp(resolve(tmpdir(), 'v340-read-admission-')))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const root = resolve(dir, 'repo')
  const paths = [...frozen.evidence.map(e => e.path), ...frozen.legacyReference.resources.map(e => e.path), manifestPath,
    'scripts/check-v340-source-mapping.mjs', 'packages/oasis-professional-service/test/v340-source-mapping.test.mjs']
  for (const path of paths) {
    await mkdir(dirname(resolve(root, path)), { recursive: true })
    await copyFile(resolve(repoRoot, path), resolve(root, path))
  }
  return root
}
async function probe(t, mode) {
  const root = await fixture(t)
  const child = spawnSync(process.execPath, [fileURLToPath(new URL('./helpers/v340-mapping-read-probe.mjs', import.meta.url)), root, mode],
    { encoding: 'utf8', timeout: 15000 })
  assert.equal(child.status, 0, child.stderr)
  assert.equal(child.stderr, '')
  return JSON.parse(child.stdout)
}
test('unchanged pinned paths remain readable and every opened handle closes', async t => {
  const got = await probe(t, 'control')
  assert.equal(got.accepted, true)
  assert.equal(got.value.nodeCount, 14)
  assert.equal(got.value.dispatchEnabled, false)
  assert.equal(got.value.realCallVerified, false)
  assert.deepEqual(got.readOutside, [])
  assert.equal(got.opened, got.closed)
  assert.equal(got.leakedBeforeCleanup, 0)
})
for (const mode of ['resource-parent-link', 'manifest-parent-link', 'resource-parent-aba', 'manifest-parent-aba',
  'resource-file-copy', 'resource-directory-copy', 'after-open-parent-link', 'after-open-file-copy', 'resource-final-link']) {
  test(`read admission rejects ${mode} without reading redirected bytes`, async t => {
    const got = await probe(t, mode)
    assert.equal(got.changed, true, 'the real filesystem replacement must occur')
    assert.equal(got.accepted, false, 'changed admitted identity must fail before content is read')
    assert.equal(got.code, 'MAPPING_PATH')
    assert.deepEqual(got.readOutside, [])
    assert.deepEqual(got.openedOutside, [], 'kernel path admission must not open the redirected outside file')
    assert.equal(got.opened, got.closed)
    assert.equal(got.leakedBeforeCleanup, 0)
  })
}
test('all original 46 mapping regressions run in a copy without a pre-existing .local directory', async t => {
  const root = await fixture(t)
  await assert.rejects(stat(resolve(root, '.local')), { code: 'ENOENT' })
  const childEnv = { ...process.env }
  delete childEnv.NODE_TEST_CONTEXT
  const child = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'packages/oasis-professional-service/test/v340-source-mapping.test.mjs'],
    { cwd: root, env: childEnv, encoding: 'utf8', timeout: 15000 })
  assert.equal(child.status, 0, child.stdout + child.stderr)
  assert.match(child.stdout, /# tests 46\b/)
  assert.match(child.stdout, /# pass 46\b/)
  assert.match(child.stdout, /# fail 0\b/)
  assert.equal(child.stderr, '')
})
test('a file growing after stat is rejected without an unbounded content read', async t => {
  const got = await probe(t, 'growth-after-stat')
  assert.equal(got.changed, true)
  assert.equal(got.accepted, false)
  assert.equal(got.code, 'MAPPING_INVALID')
  assert.ok(got.targetReadBytes <= 2 * 1024 * 1024 + 1, 'actual reads must obey the original 2 MiB limit')
  assert.equal(got.leakedBeforeCleanup, 0)
})
test('an unsupported secure-read platform fails closed instead of using a path-only fallback', async t => {
  const got = await probe(t, 'unsupported-platform')
  assert.equal(got.accepted, false)
  assert.equal(got.code, 'MAPPING_READ_UNSUPPORTED')
  assert.equal(got.reads, 0)
  assert.equal(got.opened, 0)
})
