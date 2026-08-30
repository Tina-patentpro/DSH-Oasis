import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'

const auditScript = resolve('scripts/audit-week3-closure.mjs')

test('package audit reports only static package scope and explicit limitations', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oasis-package-audit-scope-'))
  try {
    const packageRoot = join(root, 'package')
    await mkdir(join(packageRoot, 'src'), { recursive: true })
    await mkdir(join(packageRoot, 'lib'), { recursive: true })
    await writeFile(join(packageRoot, 'package.json'), `${JSON.stringify({
      name: 'scope-probe',
      version: '0.0.0',
      private: true,
      scripts: {},
      files: ['src', 'lib', 'cordis.patch.yml'],
    }, null, 2)}\n`, 'utf8')
    await writeFile(join(packageRoot, 'cordis.patch.yml'), 'plugins: {}\n', 'utf8')
    await writeFile(join(packageRoot, 'src', 'index.js'), 'export const probe = true\n', 'utf8')
    await writeFile(join(packageRoot, 'lib', 'client.js'), 'export const probe = true\n', 'utf8')

    const tarball = join(root, 'scope-probe.tgz')
    const packed = spawnSync('tar.exe', [
      '-czf', tarball,
      '-C', root,
      'package/package.json',
      'package/cordis.patch.yml',
      'package/src/index.js',
      'package/lib/client.js',
    ], { encoding: 'utf8', windowsHide: true })
    assert.equal(packed.status, 0, packed.stderr)

    const output = join(root, 'report.json')
    const audited = spawnSync(process.execPath, [auditScript, tarball, output], {
      encoding: 'utf8',
      windowsHide: true,
    })
    const report = JSON.parse(await readFile(output, 'utf8'))
    assert.equal(audited.status, 0, audited.stderr || audited.stdout)
    assert.equal(report.scope, 'STATIC_PACKAGE_ONLY')
    assert.equal(report.semanticProof, false)
    assert.equal(report.result, 'CLEAN')
    assert.equal('status' in report, false)
    assert.equal(Array.isArray(report.limitations), true)
    assert.match(report.limitations.join('\n'), /path.*concurr|TOCTOU/i)
    assert.match(report.limitations.join('\n'), /Domain.*consisten|persistence/i)
    assert.match(report.limitations.join('\n'), /Host.*browser/i)
    assert.match(report.limitations.join('\n'), /professional|patent|legal/i)

    const checkIds = new Set(report.checks.map((item) => item.id))
    for (const id of [
      'package-root-allowlist',
      'no-private-or-test-entries',
      'content-private-key',
      'content-personal-absolute-path',
      'content-fixture-body',
      'host-owned-persistence-only',
      'no-install-lifecycle-script',
    ]) {
      assert.equal(checkIds.has(id), true, id)
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('package audit source contains no positive source-marker claims or V4.1 verdict words', async () => {
  const source = await readFile(auditScript, 'utf8')
  for (const removedId of [
    'materials-metadata-only',
    'writeback-new-path-only',
    'writeback-no-wide-cleanup',
    'writeback-token-ephemeral',
  ]) {
    assert.equal(source.includes(removedId), false, removedId)
  }
  assert.doesNotMatch(source, /['"](?:PASS|FAIL)['"]/)
})
