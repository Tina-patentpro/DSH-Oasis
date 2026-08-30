import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  lstat,
  mkdir,
  mkdtemp,
  open,
  realpath,
  rm,
  symlink,
  truncate,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import {
  createWorkspaceMaterialManager,
  validateWorkspaceRelativePath,
} from '../src/workspace-materials.js'

const NOW = '2026-08-26T01:02:03.000Z'
const POLICY = Object.freeze({
  acceptedExtensions: ['.txt', '.md', '.pdf', '.docx', '.png', '.jpg', '.jpeg'],
  maxFiles: 64,
  maxFileBytes: 50 * 1024 * 1024,
  contentReadMode: 'metadata-only',
})

async function createFixture(t, { status = 'ok', fileSystem } = {}) {
  const base = await mkdtemp(join(tmpdir(), 'oasis-materials-'))
  const workspaceRoot = join(base, 'workspace')
  await mkdir(workspaceRoot)
  t.after(() => rm(base, { recursive: true, force: true }))
  const workspace = {
    id: 'workspace-a',
    path: await realpath(workspaceRoot),
    async status() { return status },
  }
  const workspaceRegistry = {
    get(workspaceId) {
      return workspaceId === workspace.id ? workspace : undefined
    },
  }
  return {
    base,
    workspaceRoot,
    manager: createWorkspaceMaterialManager({
      workspaceRegistry,
      clock: () => NOW,
      fileSystem,
    }),
  }
}

async function expectCode(operation, code) {
  await assert.rejects(operation, (error) => {
    assert.equal(error.code, code)
    assert.equal(JSON.stringify(error).includes('C:\\'), false, 'errors must not expose absolute drive paths')
    return true
  })
}

test('normalizes only bounded relative Windows paths and rejects dangerous spellings', () => {
  assert.equal(validateWorkspaceRelativePath('materials/spec.md'), 'materials\\spec.md')
  assert.equal(validateWorkspaceRelativePath('材料\\交底.docx'), '材料\\交底.docx')

  for (const value of [
    '', '.', '..', 'a\\..\\b.md', 'a\\.\\b.md', 'a//b.md', 'a\\\\b.md',
    'C:\\absolute.md', 'C:drive-relative.md', '\\\\server\\share\\a.md', '/absolute.md',
    'a:b.md', 'a\0b.md', 'folder.\\a.md', 'folder \\a.md', 'a\\b.md.', 'a\\b.md ',
    'CON', 'CON .txt', 'nul.txt', 'AUX.md', 'com1.txt', 'LPT9.md',
    `${'a'.repeat(256)}\\file.md`,
  ]) {
    assert.throws(() => validateWorkspaceRelativePath(value), /material path/i, value)
  }
})

test('fails closed for unknown or currently missing Workspaces', async (t) => {
  const fixture = await createFixture(t)
  await expectCode(fixture.manager.inspect('workspace-unknown', 'a.md', POLICY), 'UNKNOWN_WORKSPACE')

  const missing = await createFixture(t, { status: 'missing-dir' })
  await expectCode(missing.manager.inspect('workspace-a', 'a.md', POLICY), 'WORKSPACE_MISSING')
})

test('rejects directories, unsupported extensions, oversized files, and junction traversal', async (t) => {
  const fixture = await createFixture(t)
  await mkdir(join(fixture.workspaceRoot, 'materials'))
  await writeFile(join(fixture.workspaceRoot, 'materials', 'bad.exe'), 'not executable input')
  await writeFile(join(fixture.workspaceRoot, 'materials', 'large.md'), '')
  await truncate(join(fixture.workspaceRoot, 'materials', 'large.md'), POLICY.maxFileBytes + 1)

  await expectCode(fixture.manager.inspect('workspace-a', 'materials', POLICY), 'MATERIAL_NOT_FILE')
  await expectCode(fixture.manager.inspect('workspace-a', 'materials\\bad.exe', POLICY), 'UNSUPPORTED_MATERIAL_TYPE')
  await expectCode(fixture.manager.inspect('workspace-a', 'materials\\large.md', POLICY), 'MATERIAL_TOO_LARGE')

  const outside = join(fixture.base, 'outside')
  await mkdir(outside)
  await writeFile(join(outside, 'secret.md'), 'outside')
  await symlink(outside, join(fixture.workspaceRoot, 'linked'), 'junction')
  await expectCode(fixture.manager.inspect('workspace-a', 'linked\\secret.md', POLICY), 'MATERIAL_REPARSE_POINT')
})

test('streams SHA-256 and returns only normalized metadata', async (t) => {
  let streamCalls = 0
  const fileSystem = {
    lstat,
    realpath,
    async open(...args) {
      const handle = await open(...args)
      return {
        stat: (...statArgs) => handle.stat(...statArgs),
        createReadStream(options) {
          streamCalls += 1
          return handle.createReadStream(options)
        },
        close: () => handle.close(),
      }
    },
  }
  const fixture = await createFixture(t, { fileSystem })
  const content = 'CONFIDENTIAL-SENTINEL-研发材料'
  const absolutePath = join(fixture.workspaceRoot, 'materials', 'spec.md')
  await mkdir(dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, content, 'utf8')

  const inspected = await fixture.manager.inspect('workspace-a', 'materials/spec.md', POLICY)
  assert.deepEqual(inspected, {
    relativePath: 'materials\\spec.md',
    displayName: 'spec.md',
    mediaType: 'text/markdown',
    sizeBytes: Buffer.byteLength(content),
    sha256: createHash('sha256').update(content).digest('hex'),
    observedAt: NOW,
  })
  assert.equal(streamCalls, 1)
  assert.equal(JSON.stringify(inspected).includes(content), false)

  const confirmed = await fixture.manager.confirm(
    'workspace-a', 'materials/spec.md', POLICY, 'ref-a', NOW,
  )
  assert.deepEqual(confirmed, {
    referenceId: 'ref-a',
    kind: 'project-file',
    ...inspected,
    confirmedAt: NOW,
  })
})

test('detects a file changing during streaming and never returns partial evidence', async (t) => {
  let statCalls = 0
  const fileSystem = {
    lstat,
    realpath,
    async open(...args) {
      const handle = await open(...args)
      return {
        async stat() {
          const value = await handle.stat()
          statCalls += 1
          return statCalls === 1 ? value : { ...value, size: value.size + 1 }
        },
        createReadStream: (options) => handle.createReadStream(options),
        close: () => handle.close(),
      }
    },
  }
  const fixture = await createFixture(t, { fileSystem })
  await writeFile(join(fixture.workspaceRoot, 'changing.md'), 'CONFIDENTIAL-SENTINEL')
  await expectCode(
    fixture.manager.inspect('workspace-a', 'changing.md', POLICY),
    'MATERIAL_CHANGED',
  )
})

test('bounds the hash stream when a file grows after its initial stat', async (t) => {
  const boundedPolicy = Object.freeze({ ...POLICY, maxFileBytes: 4 })
  let streamOptions
  let closed = false
  const fileSystem = {
    lstat,
    realpath,
    async open(...args) {
      const handle = await open(...args)
      return {
        stat: (...statArgs) => handle.stat(...statArgs),
        createReadStream(options) {
          streamOptions = options
          return (async function* growingStream() {
            yield Buffer.from('abc')
            yield Buffer.from('def')
          })()
        },
        async close() {
          closed = true
          await handle.close()
        },
      }
    },
  }
  const fixture = await createFixture(t, { fileSystem })
  await writeFile(join(fixture.workspaceRoot, 'growing.md'), 'a')

  await expectCode(
    fixture.manager.inspect('workspace-a', 'growing.md', boundedPolicy),
    'MATERIAL_TOO_LARGE',
  )
  assert.equal(streamOptions.end, boundedPolicy.maxFileBytes)
  assert.equal(closed, true)
})

test('rechecks confirmed evidence without mutating it and blocks legacy references', async (t) => {
  const fixture = await createFixture(t)
  const absolutePath = join(fixture.workspaceRoot, 'material.md')
  await writeFile(absolutePath, 'version one')
  const reference = await fixture.manager.confirm('workspace-a', 'material.md', POLICY, 'ref-a', NOW)
  const original = structuredClone(reference)

  const unchanged = await fixture.manager.recheck('workspace-a', reference, POLICY)
  assert.equal(unchanged.referenceId, reference.referenceId)
  assert.equal(unchanged.sha256, reference.sha256)
  assert.deepEqual(reference, original)

  await writeFile(absolutePath, 'version two')
  await expectCode(fixture.manager.recheck('workspace-a', reference, POLICY), 'MATERIAL_CHANGED')
  assert.deepEqual(reference, original)

  const refreshed = await fixture.manager.refresh('workspace-a', reference, POLICY)
  assert.equal(refreshed.referenceId, reference.referenceId)
  assert.equal(refreshed.confirmedAt, reference.confirmedAt)
  assert.notEqual(refreshed.sha256, reference.sha256)
  assert.equal((await fixture.manager.recheck('workspace-a', refreshed, POLICY)).sha256, refreshed.sha256)
  assert.deepEqual(reference, original)

  await expectCode(fixture.manager.recheckAll('workspace-a', [{
    referenceId: 'legacy-v1-1', kind: 'legacy-v1', legacyValue: { source: 'v1' },
  }], POLICY), 'LEGACY_MATERIAL_REQUIRES_RECONFIRMATION')
})
