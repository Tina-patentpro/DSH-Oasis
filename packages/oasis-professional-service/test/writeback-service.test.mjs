import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  lstat,
  link,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  rmdir,
  stat,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, relative, resolve, sep } from 'node:path'
import test from 'node:test'

import { createWritebackManager } from '../src/writeback-service.js'

const START = Date.parse('2026-08-26T03:04:05.000Z')

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function artifact(body = '## 文档信息\n\n本地演练\n') {
  const hash = sha256(body)
  return {
    artifactId: `sha256:${hash}`,
    suggestedFileName: '技术研发任务__technical-rd-v1.md',
    mediaType: 'text/markdown',
    body,
    sha256: hash,
  }
}

function prepareInput(overrides = {}) {
  return {
    workspaceId: 'workspace-a',
    taskId: 'task-a',
    runId: 'run-a',
    workflowId: 'technical-rd',
    workflowVersion: '1',
    mode: 'local-mock',
    mockVersion: '1',
    inputSha256: 'b'.repeat(64),
    artifact: artifact(),
    reviewStatus: 'approved',
    relativeDirectory: 'outputs\\run-a',
    ...overrides,
  }
}

async function createHarness(t, options = {}) {
  const tempRoot = await mkdtemp(join(tmpdir(), 'oasis-writeback-'))
  const workspaceRoot = join(tempRoot, 'workspace')
  await mkdir(join(workspaceRoot, 'outputs'), { recursive: true })
  const canonicalRoot = await realpath(workspaceRoot)
  t.after(async () => {
    const resolved = resolve(tempRoot)
    assert.equal(resolved.startsWith(resolve(tmpdir()) + sep), true)
    await rm(resolved, { recursive: true, force: true })
  })
  let now = START
  let sequence = 0
  const workspaceRegistry = {
    get(workspaceId) {
      if (workspaceId !== 'workspace-a') return undefined
      return { path: canonicalRoot, async status() { return 'ok' } }
    },
  }
  const manager = createWritebackManager({
    workspaceRegistry,
    clock: () => new Date(now).toISOString(),
    idFactory: () => `writeback-${++sequence}`,
    tokenFactory: () => `token-${++sequence}`,
    ...options,
  })
  return {
    tempRoot,
    workspaceRoot: canonicalRoot,
    workspaceRegistry,
    manager,
    advance(milliseconds) { now += milliseconds },
  }
}

async function expectCode(operation, code) {
  await assert.rejects(operation, (error) => {
    assert.equal(error.code, code)
    return true
  })
}

function nativeFileSystem(overrides = {}) {
  return {
    lstat,
    link,
    mkdir,
    open,
    readFile,
    realpath,
    rename,
    rmdir,
    unlink,
    ...overrides,
  }
}

test('prepare returns a two-file transient manifest without creating the target', async (t) => {
  const { manager, workspaceRoot } = await createHarness(t)
  const value = await manager.prepare(prepareInput())

  assert.match(value.confirmationToken, /^token-/)
  assert.deepEqual(Object.keys(value.manifest), [
    'schemaVersion', 'workspaceId', 'taskId', 'runId', 'artifactId',
    'relativeDirectory', 'absoluteTarget', 'files', 'expiresAt',
  ])
  assert.equal(value.manifest.schemaVersion, 1)
  assert.equal(value.manifest.relativeDirectory, 'outputs\\run-a')
  assert.equal(value.manifest.absoluteTarget, join(workspaceRoot, 'outputs', 'run-a'))
  assert.equal(value.manifest.files.length, 2)
  assert.deepEqual(value.manifest.files.map((file) => file.mediaType), [
    'text/markdown', 'application/json',
  ])
  assert.deepEqual(value.manifest.files.map((file) => basename(file.absolutePath)), [
    '技术研发任务__technical-rd-v1.md',
    '技术研发任务__technical-rd-v1.oasis.json',
  ])
  assert.equal(value.manifest.files[0].sha256, prepareInput().artifact.sha256)
  assert.equal(value.manifest.expiresAt, '2026-08-26T03:14:05.000Z')
  await assert.rejects(stat(value.manifest.absoluteTarget), { code: 'ENOENT' })
  assert.deepEqual(await readdir(join(workspaceRoot, 'outputs')), [])
})

test('project root publication preserves existing files, rejects collisions and reads saved Markdown', async t => {
  const { manager, workspaceRoot } = await createHarness(t)
  await writeFile(join(workspaceRoot, 'existing.txt'), 'preserve')
  const prepared = await manager.prepare(prepareInput({ relativeDirectory: '.', outputFileName: '权利要求书_20260922-143000_v1_OIW.md' }))
  assert.equal(prepared.manifest.absoluteTarget, workspaceRoot)
  assert.equal(prepared.manifest.files[0].relativePath, '权利要求书_20260922-143000_v1_OIW.md')
  const record = await manager.publish(manager.consume(prepared.confirmationToken))
  assert.equal(record.relativeDirectory, '.')
  assert.equal(await readFile(join(workspaceRoot, record.files[0].relativePath), 'utf8'), artifact().body)
  assert.equal(await manager.resolveSavedFile('workspace-a', record.files[0].relativePath), join(workspaceRoot, record.files[0].relativePath))
  await expectCode(manager.prepare(prepareInput({ relativeDirectory: '.', outputFileName: record.files[0].relativePath })), 'WRITEBACK_TARGET_EXISTS')
  assert.equal(await readFile(join(workspaceRoot, 'existing.txt'), 'utf8'), 'preserve')
})

test('project root partial failure preserves evidence and consumes confirmation', async t => {
  const { manager, workspaceRoot } = await createHarness(t, { fileSystem: nativeFileSystem({ open: async (path, flags) => {
    if (path.endsWith('.oasis.json')) throw Object.assign(Error('disk failed'), { code: 'EIO' })
    return open(path, flags)
  } }) })
  const prepared = await manager.prepare(prepareInput({ relativeDirectory: '.' }))
  const plan = manager.consume(prepared.confirmationToken)
  await assert.rejects(() => manager.publish(plan), error => error.code === 'WRITEBACK_PARTIAL_PUBLISH' && error.details.createdFiles.length === 1)
  assert.equal(await readFile(join(workspaceRoot, artifact().suggestedFileName), 'utf8'), artifact().body)
  await expectCode(manager.publish(plan), 'WRITEBACK_PLAN_USED')
})

test('root publication refuses late collisions and root changes without overwriting adjacent bytes', async t => {
  const { manager, workspaceRoot, workspaceRegistry } = await createHarness(t)
  const input = prepareInput({ relativeDirectory: '.' })
  const first = await manager.prepare(input)
  await writeFile(first.manifest.files[1].absolutePath, 'existing-metadata')
  await expectCode(manager.publish(manager.consume(first.confirmationToken)), 'WRITEBACK_TARGET_EXISTS')
  await assert.rejects(readFile(first.manifest.files[0].absolutePath), { code: 'ENOENT' })
  assert.equal(await readFile(first.manifest.files[1].absolutePath, 'utf8'), 'existing-metadata')
  const second = await manager.prepare({ ...input, outputFileName: 'other.md' })
  workspaceRegistry.get = () => ({ path: join(workspaceRoot, 'outputs'), status: async () => 'ok' })
  await expectCode(manager.publish(manager.consume(second.confirmationToken)), 'WORKSPACE_ROOT_CHANGED')
  await assert.rejects(readFile(second.manifest.files[0].absolutePath), { code: 'ENOENT' })
})

test('output filename cannot escape project root or inject a subdirectory', async t => {
  const { manager } = await createHarness(t)
  for (const name of ['../outside.md', '..\\outside.md', 'nested/file.md', 'nested\\file.md']) {
    await expectCode(manager.prepare(prepareInput({ relativeDirectory: '.', outputFileName: name })), 'WRITEBACK_ARTIFACT_INVALID')
  }
})

test('prepare rejects unsafe, missing, redirecting, existing, and overlong targets before writing', async (t) => {
  const { manager, workspaceRoot, tempRoot } = await createHarness(t)
  const invalidPaths = [
    '', '..\\escape', 'C:\\absolute', '\\\\server\\share', '/absolute',
    'outputs\\CON', 'outputs\\bad.', 'outputs\\bad ', 'outputs\\a:b',
  ]
  for (const relativeDirectory of invalidPaths) {
    await expectCode(manager.prepare(prepareInput({ relativeDirectory })), 'INVALID_WRITEBACK_PATH')
  }

  await expectCode(
    manager.prepare(prepareInput({ relativeDirectory: 'missing\\run-a' })),
    'WRITEBACK_PARENT_MISSING',
  )
  await mkdir(join(workspaceRoot, 'outputs', 'existing'))
  await expectCode(
    manager.prepare(prepareInput({ relativeDirectory: 'outputs\\existing' })),
    'WRITEBACK_TARGET_EXISTS',
  )
  const outside = join(tempRoot, 'outside')
  await mkdir(outside)
  try {
    await symlink(outside, join(workspaceRoot, 'redirect'), process.platform === 'win32' ? 'junction' : 'dir')
    await expectCode(
      manager.prepare(prepareInput({ relativeDirectory: 'redirect\\run-a' })),
      'WRITEBACK_REPARSE_POINT',
    )
  } catch (error) {
    if (!['EPERM', 'EACCES'].includes(error?.code)) throw error
  }
  await expectCode(
    manager.prepare(prepareInput({ relativeDirectory: `outputs\\${'a'.repeat(220)}` })),
    'WRITEBACK_PATH_TOO_LONG',
  )
  assert.deepEqual(await readdir(join(workspaceRoot, 'outputs')), ['existing'])
})

test('confirmation tokens are bounded, single-use, expire after ten minutes, and do not survive restart', async (t) => {
  const harness = await createHarness(t, { maxTokens: 2 })
  const first = await harness.manager.prepare(prepareInput({ relativeDirectory: 'outputs\\first' }))
  const second = await harness.manager.prepare(prepareInput({ relativeDirectory: 'outputs\\second' }))
  await expectCode(
    harness.manager.prepare(prepareInput({ relativeDirectory: 'outputs\\third' })),
    'WRITEBACK_TOKEN_CAPACITY',
  )

  const plan = harness.manager.consume(first.confirmationToken)
  assert.equal(plan.relativeDirectory, 'outputs\\first')
  await expectCode(
    Promise.resolve().then(() => harness.manager.consume(first.confirmationToken)),
    'WRITEBACK_TOKEN_USED',
  )

  const restarted = createWritebackManager({
    workspaceRegistry: harness.workspaceRegistry,
    clock: () => new Date(START).toISOString(),
  })
  await expectCode(
    Promise.resolve().then(() => restarted.consume(second.confirmationToken)),
    'WRITEBACK_TOKEN_INVALID',
  )

  harness.advance(10 * 60 * 1000 + 1)
  await expectCode(
    Promise.resolve().then(() => harness.manager.consume(second.confirmationToken)),
    'WRITEBACK_TOKEN_EXPIRED',
  )
  const afterExpiry = await harness.manager.prepare(prepareInput({ relativeDirectory: 'outputs\\third' }))
  assert.match(afterExpiry.confirmationToken, /^token-/)
})

test('prepare never embeds token, absolute paths, artifact body, or pricing data in the planned metadata', async (t) => {
  const { manager, workspaceRoot } = await createHarness(t)
  const value = await manager.prepare(prepareInput())
  const plan = manager.consume(value.confirmationToken)
  const serialized = JSON.stringify(plan.metadata)
  assert.equal(serialized.includes(value.confirmationToken), false)
  assert.equal(serialized.includes(workspaceRoot), false)
  assert.equal(serialized.includes(prepareInput().artifact.body), false)
  assert.equal(serialized.toLowerCase().includes('pricing'), false)
  assert.equal(plan.metadata.artifact.sha256, prepareInput().artifact.sha256)
  assert.equal(plan.metadata.input.sha256, 'b'.repeat(64))
  assert.equal(plan.metadata.review.status, 'approved')
})

test('prepare creates mode-aware remote metadata without a raw request key or pricing', async (t) => {
  const { manager } = await createHarness(t)
  const remoteArtifact = artifact('# 绿洲专业服务结果\n\n远程草稿\n')
  const value = await manager.prepare(prepareInput({
    runId: 'remote-run-a',
    workflowId: undefined,
    workflowVersion: undefined,
    mode: 'oasis-legacy',
    mockVersion: undefined,
    artifact: remoteArtifact,
    relativeDirectory: 'outputs\\remote-run-a',
    remote: {
      executionId: 'execution-a',
      requestKeySha256: 'e'.repeat(64),
      provider: {
        apiBaseOrigin: 'https://oasis-staging.example',
        apiId: 132,
        apiEndpoint: 'claims-v1',
        apiProcess: '整理,撰写',
        folderId: 8,
        price: 999,
        extra: 'AUDIT_SECRET',
      },
      files: {
        status: 'undownloaded-unverified',
        urls: ['https://files-staging.example/result/claims.docx'],
      },
    },
  }))
  const plan = manager.consume(value.confirmationToken)
  assert.equal(plan.metadata.execution.mode, 'oasis-legacy')
  assert.equal(plan.metadata.execution.executionId, 'execution-a')
  assert.equal(plan.metadata.execution.requestKeySha256, 'e'.repeat(64))
  assert.equal(Object.hasOwn(plan.metadata, 'workflow'), false)
  assert.deepEqual(plan.metadata.provider, {
    apiBaseOrigin: 'https://oasis-staging.example',
    apiId: 132,
    apiEndpoint: 'claims-v1',
    apiProcess: '整理,撰写',
    folderId: 8,
  })
  assert.deepEqual(plan.metadata.remoteFiles, {
    status: 'undownloaded-unverified',
    urls: ['https://files-staging.example/result/claims.docx'],
  })
  const serialized = JSON.stringify(plan.metadata)
  assert.equal(serialized.includes('remote-request-a'), false)
  assert.equal(serialized.toLowerCase().includes('price'), false)
  assert.equal(serialized.includes('AUDIT_SECRET'), false)
})

test('F1 rejects unsafe file URLs before creating a writeback target', async (t) => {
  const { manager, workspaceRoot } = await createHarness(t)
  for (const url of [
    'https://audit-user:AUDIT_SECRET@files-staging.example/result.docx',
    'https://files-staging.example/result.docx?token=AUDIT_SECRET',
    'https://files-staging.example/result.docx#AUDIT_SECRET',
  ]) {
    await assert.rejects(manager.prepare(prepareInput({ mode: 'oasis-legacy', remote: {
      executionId: 'execution-a', requestKeySha256: 'e'.repeat(64),
      provider: { apiBaseOrigin: 'https://oasis-staging.example', apiId: 132, apiEndpoint: 'claims-v1', apiProcess: '', folderId: 8 },
      files: { status: 'undownloaded-unverified', urls: [url] },
    } })), error => error.code === 'WRITEBACK_SOURCE_INVALID' && !String(error).includes('AUDIT_SECRET'))
    await assert.rejects(stat(join(workspaceRoot, 'outputs/run-a')), { code: 'ENOENT' })
  }
})

test('remote writeback metadata rejects the production provider origin', async (t) => {
  const { manager } = await createHarness(t)
  await expectCode(manager.prepare(prepareInput({
    runId: 'remote-run-a',
    workflowId: undefined,
    workflowVersion: undefined,
    mode: 'oasis-legacy',
    mockVersion: undefined,
    relativeDirectory: 'outputs\\production-origin',
    remote: {
      executionId: 'execution-a',
      requestKeySha256: 'e'.repeat(64),
      provider: {
        apiBaseOrigin: 'https://lzhxpy.oasisintwrite.com',
        apiId: 132, apiEndpoint: 'claims-v1', apiProcess: '整理,撰写', folderId: 8,
      },
      files: { status: 'undownloaded-unverified', urls: [] },
    },
  })), 'WRITEBACK_SOURCE_INVALID')
})

test('explicit production writeback retains its environment marker', async (t) => {
  const { manager } = await createHarness(t)
  const value = await manager.prepare(prepareInput({
    runId: 'remote-run-a', workflowId: undefined, workflowVersion: undefined,
    mode: 'oasis-legacy', mockVersion: undefined, relativeDirectory: 'outputs\\online',
    remote: { executionId: 'execution-a', requestKeySha256: 'e'.repeat(64),
      provider: { environmentKind: 'production', apiBaseOrigin: 'https://lzhxpy.oasisintwrite.com',
        apiId: 132, apiEndpoint: 'claims-v1', apiProcess: '', folderId: 8 },
      files: { status: 'undownloaded-unverified', urls: ['https://lzhxpy.oasisintwrite.com/a.txt'] },
    },
  }))
  assert.equal(manager.consume(value.confirmationToken).metadata.provider.environmentKind, 'production')
})

test('publish fsyncs two verified files and commits with exactly one final rename', async (t) => {
  let committed = false
  const renameCalls = []
  const baseFileSystem = nativeFileSystem()
  const fileSystem = Object.fromEntries(Object.entries(baseFileSystem).map(([method, operation]) => [
    method,
    async (...args) => {
      assert.equal(committed, false, `filesystem.${method} must not run after the final rename`)
      if (method === 'rename') {
        renameCalls.push(args)
        const value = await operation(...args)
        committed = true
        return value
      }
      return operation(...args)
    },
  ]))
  const { manager, workspaceRoot } = await createHarness(t, {
    fileSystem,
    clock() {
      assert.equal(committed, false, 'clock must not run after the final rename')
      return new Date(START).toISOString()
    },
  })
  const prepared = await manager.prepare(prepareInput())
  const record = await manager.publish(manager.consume(prepared.confirmationToken))

  assert.deepEqual(Object.keys(record), [
    'writebackId', 'artifactId', 'relativeDirectory', 'files', 'reviewStatus', 'committedAt',
  ])
  assert.equal(record.relativeDirectory, 'outputs\\run-a')
  assert.equal(record.reviewStatus, 'approved')
  assert.equal(record.committedAt, '2026-08-26T03:04:05.000Z')
  assert.equal(record.files.length, 2)
  assert.equal(JSON.stringify(record).includes(workspaceRoot), false)
  assert.equal(JSON.stringify(record).includes(prepared.confirmationToken), false)

  const target = join(workspaceRoot, 'outputs', 'run-a')
  const mainPath = join(target, '技术研发任务__technical-rd-v1.md')
  const metadataPath = join(target, '技术研发任务__technical-rd-v1.oasis.json')
  assert.equal(await readFile(mainPath, 'utf8'), prepareInput().artifact.body)
  const metadataText = await readFile(metadataPath, 'utf8')
  assert.equal(sha256(metadataText), record.files[1].sha256)
  const metadata = JSON.parse(metadataText)
  assert.equal(metadata.artifact.sha256, prepareInput().artifact.sha256)
  assert.equal(JSON.stringify(metadata).includes(workspaceRoot), false)
  assert.equal(JSON.stringify(metadata).includes(prepared.confirmationToken), false)
  assert.equal(JSON.stringify(metadata).includes(prepareInput().artifact.body), false)
  assert.equal(renameCalls.length, 1)
  assert.equal(renameCalls[0][1], target)
  assert.match(basename(renameCalls[0][0]), /^\.run-a\.oasis-staging-/)
  assert.equal((await stat(mainPath)).isFile(), true)
  assert.deepEqual(await readdir(join(workspaceRoot, 'outputs')), ['run-a'])
})

test('publish rechecks prepare assumptions and preserves a target created in between', async (t) => {
  const { manager, workspaceRoot } = await createHarness(t)
  const neighbor = join(workspaceRoot, 'outputs', 'neighbor.txt')
  await writeFile(neighbor, 'protected neighbor', 'utf8')
  const beforeHash = sha256(await readFile(neighbor))
  const prepared = await manager.prepare(prepareInput())
  const target = prepared.manifest.absoluteTarget
  await mkdir(target)
  await writeFile(join(target, 'sentinel.txt'), 'existing target', 'utf8')

  await expectCode(
    manager.publish(manager.consume(prepared.confirmationToken)),
    'WRITEBACK_TARGET_EXISTS',
  )
  assert.equal(await readFile(join(target, 'sentinel.txt'), 'utf8'), 'existing target')
  assert.equal(sha256(await readFile(neighbor)), beforeHash)
})

test('a target created at the final rename is preserved and reported as existing', async (t) => {
  let finalTarget
  const { manager, workspaceRoot } = await createHarness(t, {
    fileSystem: nativeFileSystem({
      async rename(source, target) {
        finalTarget = target
        await mkdir(target)
        await writeFile(join(target, 'sentinel.txt'), 'racing owner', 'utf8')
        return rename(source, target)
      },
    }),
  })
  const prepared = await manager.prepare(prepareInput())

  await expectCode(
    manager.publish(manager.consume(prepared.confirmationToken)),
    'WRITEBACK_TARGET_EXISTS',
  )
  assert.equal(finalTarget, prepared.manifest.absoluteTarget)
  assert.equal(await readFile(join(finalTarget, 'sentinel.txt'), 'utf8'), 'racing owner')
  assert.deepEqual(await readdir(join(workspaceRoot, 'outputs')), ['run-a'])
})

test('serializes concurrent plans for one target so at most one can publish', async (t) => {
  const { manager, workspaceRoot } = await createHarness(t)
  const first = await manager.prepare(prepareInput())
  const second = await manager.prepare(prepareInput())
  const results = await Promise.allSettled([
    manager.publish(manager.consume(first.confirmationToken)),
    manager.publish(manager.consume(second.confirmationToken)),
  ])
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  const rejected = results.find((result) => result.status === 'rejected')
  assert.equal(rejected.reason.code, 'WRITEBACK_TARGET_EXISTS')
  assert.deepEqual(await readdir(join(workspaceRoot, 'outputs')), ['run-a'])
})

test('staging and final-rename failures clean only operation-owned paths and preserve adjacent bytes', async (t) => {
  const cases = [
    {
      name: 'main staging write',
      expectedCode: 'WRITEBACK_STAGING_FAILED',
      override: {
        async open(path, flags) {
          if (flags === 'wx' && path.endsWith('.md')) throw Object.assign(new Error('main write fault'), { code: 'EIO' })
          return open(path, flags)
        },
      },
    },
    {
      name: 'metadata staging write',
      expectedCode: 'WRITEBACK_STAGING_FAILED',
      override: {
        async open(path, flags) {
          if (flags === 'wx' && path.endsWith('.oasis.json')) {
            throw Object.assign(new Error('metadata write fault'), { code: 'EIO' })
          }
          return open(path, flags)
        },
      },
    },
    {
      name: 'directory rename',
      expectedCode: 'WRITEBACK_PUBLISH_FAILED',
      override: {
        async rename() {
          throw Object.assign(new Error('rename fault'), { code: 'EIO' })
        },
      },
    },
  ]

  for (const fault of cases) {
    await t.test(fault.name, async (inner) => {
      const { manager, workspaceRoot } = await createHarness(inner, {
        fileSystem: nativeFileSystem(fault.override),
      })
      const neighbor = join(workspaceRoot, 'outputs', 'neighbor.txt')
      await writeFile(neighbor, 'protected neighbor', 'utf8')
      const beforeHash = sha256(await readFile(neighbor))
      const prepared = await manager.prepare(prepareInput())
      await expectCode(
        manager.publish(manager.consume(prepared.confirmationToken)),
        fault.expectedCode,
      )
      assert.equal(sha256(await readFile(neighbor)), beforeHash)
      assert.deepEqual(await readdir(join(workspaceRoot, 'outputs')), ['neighbor.txt'])
    })
  }
})

test('writeback source has no post-commit cleanup branch or hard-link publication', async () => {
  const source = await readFile(new URL('../src/writeback-service.js', import.meta.url), 'utf8')
  assert.equal(source.includes('WRITEBACK_COMMITTED_CLEANUP_FAILED'), false)
  assert.equal(source.includes('fileSystem.link'), false)
})
