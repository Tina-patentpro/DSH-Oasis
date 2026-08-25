import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'

import {
  captureFilesystemBaseline,
  collectTree,
  compareRows,
  sha256,
} from '../../scripts/baseline-capture-core.mjs'

async function withTemp(callback) {
  const root = await mkdtemp(join(tmpdir(), 'oasis-baseline-'))
  try {
    await callback(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test('hashes file content and link target text without traversing the target', async (t) => {
  await withTemp(async (root) => {
    const product = join(root, 'product')
    const target = join(root, 'target')
    const link = join(product, 'linked')
    await mkdir(product)
    await mkdir(target)
    await writeFile(join(product, 'plain.txt'), 'plain', 'utf8')
    await writeFile(join(target, 'secret.txt'), 'must-not-be-traversed', 'utf8')
    try {
      await symlink(target, link, process.platform === 'win32' ? 'junction' : 'dir')
    } catch (error) {
      t.skip(`link creation unavailable: ${error.message}`)
      return
    }

    const rows = await collectTree(product, root)
    assert.deepEqual(rows.map(({ path, kind }) => ({ path, kind })), [
      { path: 'product\\linked', kind: 'link' },
      { path: 'product\\plain.txt', kind: 'file' },
    ])
    const linkRow = rows[0]
    assert.notEqual(linkRow.target, '')
    assert.equal(linkRow.sha256, sha256(linkRow.target))
    assert.equal(rows.some((row) => row.path.includes('secret.txt')), false)
  })
})

test('writes reproducible content hashes and freshness metadata', async () => {
  await withTemp(async (root) => {
    const product = join(root, 'product')
    const profile = join(root, 'profile')
    const output = join(root, 'evidence')
    await mkdir(product)
    await mkdir(profile)
    await writeFile(join(product, 'source.js'), 'source', 'utf8')
    await writeFile(join(profile, 'config.json'), '{}', 'utf8')

    const result = await captureFilesystemBaseline({
      projectRoot: root,
      profileRoot: profile,
      outputRoot: output,
      label: 'before',
      productRoots: ['product'],
      command: 'node capture.mjs before',
    })

    assert.match(result.summary.generatedAt, /^\d{4}-\d{2}-\d{2}T/)
    assert.equal(result.summary.command, 'node capture.mjs before')
    assert.equal(result.summary.productRootsSha256, sha256(JSON.stringify(['product'])))
    assert.match(result.summary.productContentSha256, /^[A-F0-9]{64}$/)
    assert.match(result.summary.profileContentSha256, /^[A-F0-9]{64}$/)
    assert.equal(result.summary.linkPolicy, 'lstat plus readlink target text; link targets are not traversed')
    assert.match(await readFile(join(output, 'summary-before.json'), 'utf8'), /productContentSha256/)
  })
})

test('baseline comparison fails closed except for exact allowlisted paths', () => {
  const before = [
    { path: 'src\\same.js', kind: 'file', size: 1, sha256: 'A', target: '' },
    { path: 'src\\changed.js', kind: 'file', size: 1, sha256: 'B', target: '' },
  ]
  const after = [
    { path: 'src\\same.js', kind: 'file', size: 1, sha256: 'A', target: '' },
    { path: 'src\\changed.js', kind: 'file', size: 2, sha256: 'C', target: '' },
    { path: 'src\\added.js', kind: 'file', size: 1, sha256: 'D', target: '' },
  ]

  const blocked = compareRows(before, after, ['src\\changed.js'])
  assert.equal(blocked.ok, false)
  assert.deepEqual(blocked.unexpected.map((entry) => entry.path), ['src\\added.js'])
  assert.deepEqual(blocked.allowed.map((entry) => entry.path), ['src\\changed.js'])

  const allowed = compareRows(before, after, ['src\\changed.js', 'src\\added.js'])
  assert.equal(allowed.ok, true)
  assert.equal(allowed.unexpected.length, 0)
})

test('both historical wrappers use the shared no-follow core and cover build outputs', async () => {
  const projectRoot = resolve('.')
  const implementation = await readFile(resolve(
    projectRoot,
    'docs/evidence/week2-implementation-2026-08-25/baseline/capture-baseline.mjs',
  ), 'utf8')
  const audit = await readFile(resolve(
    projectRoot,
    'docs/evidence/week2-audit-2026-08-25/capture-audit-baseline.mjs',
  ), 'utf8')

  for (const source of [implementation, audit]) {
    assert.match(source, /baseline-capture-core\.mjs/)
    assert.match(source, /packages\/oasis-professional-service\/lib/)
  }
  assert.match(implementation, /capture-baseline\.mjs/)
})
