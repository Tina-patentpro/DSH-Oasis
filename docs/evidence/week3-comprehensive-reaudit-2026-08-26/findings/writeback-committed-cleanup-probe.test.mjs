import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  lstat,
  link,
  mkdir,
  mkdtemp,
  open,
  readFile,
  realpath,
  rm,
  rmdir,
  stat,
  unlink,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import test from 'node:test'

import { createWritebackManager } from '../../../../packages/oasis-professional-service/src/writeback-service.js'

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

test('committed cleanup failure exposes a recovery record for files already published', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'oasis-reaudit-cleanup-'))
  const workspaceRoot = join(tempRoot, 'workspace')
  await mkdir(join(workspaceRoot, 'outputs'), { recursive: true })
  const canonicalRoot = await realpath(workspaceRoot)
  t.after(async () => {
    const resolved = resolve(tempRoot)
    assert.equal(resolved.startsWith(resolve(tmpdir()) + sep), true)
    await rm(resolved, { recursive: true, force: true })
  })

  const manager = createWritebackManager({
    workspaceRegistry: {
      get(workspaceId) {
        if (workspaceId !== 'workspace-a') return undefined
        return { path: canonicalRoot, async status() { return 'ok' } }
      },
    },
    clock: () => '2026-08-26T09:00:00.000Z',
    idFactory: () => 'writeback-cleanup-probe',
    tokenFactory: () => 'token-cleanup-probe',
    stageIdFactory: () => 'stage-cleanup-probe',
    fileSystem: {
      lstat,
      link,
      mkdir,
      open,
      readFile,
      realpath,
      unlink,
      async rmdir(path) {
        if (String(path).includes('.oasis-staging-')) {
          throw Object.assign(new Error('simulated staging directory cleanup failure'), { code: 'EBUSY' })
        }
        return rmdir(path)
      },
    },
  })

  const body = '## audit\n\ncommitted cleanup recovery probe\n'
  const hash = sha256(body)
  const prepared = await manager.prepare({
    workspaceId: 'workspace-a',
    taskId: 'task-a',
    runId: 'run-a',
    expectedRevision: 1,
    workflowId: 'technical-rd',
    workflowVersion: '1',
    mode: 'local-mock',
    mockVersion: '1',
    inputSha256: 'b'.repeat(64),
    artifact: {
      artifactId: `sha256:${hash}`,
      suggestedFileName: 'technical-rd-v1-local-mock.md',
      mediaType: 'text/markdown',
      body,
      sha256: hash,
    },
    reviewStatus: 'approved',
    relativeDirectory: 'outputs\\run-a',
  })

  let observedError
  try {
    await manager.publish(manager.consume(prepared.confirmationToken))
  } catch (error) {
    observedError = error
  }
  assert.equal(observedError?.code, 'WRITEBACK_COMMITTED_CLEANUP_FAILED')
  await stat(join(canonicalRoot, 'outputs', 'run-a', 'technical-rd-v1-local-mock.md'))
  assert.ok(
    observedError?.details?.writebackRecord || observedError?.details?.manifest,
    'a committed writeback failure must expose a recovery record or manifest',
  )
})
