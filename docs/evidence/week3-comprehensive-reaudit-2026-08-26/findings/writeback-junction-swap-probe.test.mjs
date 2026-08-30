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
  symlink,
  unlink,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import test from 'node:test'

import { createWritebackManager } from '../../../../packages/oasis-professional-service/src/writeback-service.js'

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

test('rejects a target directory replaced by a junction after mkdir and before publication', async (t) => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'oasis-reaudit-junction-'))
  const workspaceRoot = join(tempRoot, 'workspace')
  const outsideRoot = join(tempRoot, 'outside')
  await mkdir(join(workspaceRoot, 'outputs'), { recursive: true })
  await mkdir(outsideRoot)
  const canonicalRoot = await realpath(workspaceRoot)
  t.after(async () => {
    const resolved = resolve(tempRoot)
    assert.equal(resolved.startsWith(resolve(tmpdir()) + sep), true)
    await rm(resolved, { recursive: true, force: true })
  })

  let swapped = false
  const manager = createWritebackManager({
    workspaceRegistry: {
      get(workspaceId) {
        if (workspaceId !== 'workspace-a') return undefined
        return { path: canonicalRoot, async status() { return 'ok' } }
      },
    },
    clock: () => '2026-08-26T09:00:00.000Z',
    idFactory: () => 'writeback-probe',
    tokenFactory: () => 'token-probe',
    stageIdFactory: () => 'stage-probe',
    fileSystem: {
      lstat,
      mkdir,
      open,
      readFile,
      realpath,
      rmdir,
      unlink,
      async link(source, target) {
        if (!swapped) {
          swapped = true
          const targetDirectory = dirname(target)
          await rmdir(targetDirectory)
          await symlink(outsideRoot, targetDirectory, process.platform === 'win32' ? 'junction' : 'dir')
        }
        return link(source, target)
      },
    },
  })

  const body = '## audit\n\nwriteback boundary probe\n'
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

  await assert.rejects(
    manager.publish(manager.consume(prepared.confirmationToken)),
    (error) => error?.code === 'WRITEBACK_REPARSE_POINT' || error?.code === 'WRITEBACK_TARGET_CHANGED',
  )
})
