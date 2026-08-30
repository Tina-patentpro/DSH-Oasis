import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'

import { collectTree, sha256 } from '../../scripts/baseline-capture-core.mjs'

const verifierPaths = [
  'scripts/verify-week1-supplement.mjs',
  'scripts/verify-week2-persistence.mjs',
  'scripts/verify-week3-local-loop.mjs',
]

test('all Week verifiers default to the whole real Profile and reuse the no-follow baseline core', async () => {
  for (const path of verifierPaths) {
    const source = await readFile(resolve(path), 'utf8')
    assert.match(source, /OASIS_REAL_DSH_PROFILE \?\? join\(process\.env\.USERPROFILE \?\? '', '\.dsh'\)/, path)
    assert.match(source, /baseline-capture-core\.mjs/, path)
    assert.match(source, /\bcollectTree\b/, path)
    assert.match(source, /\bwriteBaselineTsv\b/, path)
    assert.doesNotMatch(source, /\.dsh[\\/]profiles[\\/]web/, path)
  }

  const week1 = await readFile(resolve(verifierPaths[0]), 'utf8')
  assert.doesNotMatch(week1, /function hashTree|protected Profile contains a link/)
})

test('the shared traversal records a link and hashes target text without visiting its contents', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'oasis-profile-contract-'))
  try {
    const profile = join(root, '.dsh')
    const target = join(root, 'external-target')
    await mkdir(profile)
    await mkdir(target)
    await writeFile(join(target, 'must-not-appear.txt'), 'external bytes', 'utf8')
    try {
      await symlink(target, join(profile, 'linked'), process.platform === 'win32' ? 'junction' : 'dir')
    } catch (error) {
      t.skip(`link creation unavailable: ${error.message}`)
      return
    }

    const rows = await collectTree(profile, profile)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].path, 'linked')
    assert.equal(rows[0].kind, 'link')
    assert.notEqual(rows[0].target, '')
    assert.equal(rows[0].sha256, sha256(rows[0].target))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('the remediation closing baseline gates on the confirmed Task 6 Profile and records earlier drift separately', async () => {
  const source = await readFile(resolve(
    'docs/evidence/week3-reaudit-remediation-2026-08-27/baseline/capture-remediation-baseline.mjs',
  ), 'utf8')

  assert.match(source, /profile-confirmed\.tsv/)
  assert.match(source, /task6ProfileEqual/)
  assert.match(source, /remediationStartProfileEqual/)
  assert.doesNotMatch(source, /summary\.profileContentSha256 !== beforeSummary\.profileContentSha256/)
})
