import { createConnectionFixture } from './connection-fixture.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createWorkbenchService } from '../src/workbench-service.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { createWorkbenchRemote } from '../src/client/workbench-remote.js'
import { createRunSnapshot } from './workbench-fixtures.mjs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { UnifiedResultPanel } from '../src/client/UnifiedResultPanel.js'

test('saved versions expose current-file opening with a capability gate, distinct from reviewed conversation use', () => {
  const run = createRunSnapshot({ review: { status: 'approved' } })
  run.writebacks = [{ writebackId: 'wb-a', files: [{ relativePath: 'output\\claims.md', mediaType: 'text/markdown' }] }]
  const page = { pageId: 'p', activeRunId: run.runId, runOrder: [run.runId], runs: { [run.runId]: run } }
  const props = { page, operation: { writebackDirectory: '' }, savedFileUnavailableReason: '安全文件预览不可用' }
  const blocked = renderToStaticMarkup(createElement(UnifiedResultPanel, props))
  assert.match(blocked, /<button[^>]*disabled[^>]*>打开当前文件<\/button>/)
  const ready = renderToStaticMarkup(createElement(UnifiedResultPanel, { ...props, savedFileUnavailableReason: null }))
  assert.doesNotMatch(ready.match(/<button[^>]*>打开当前文件<\/button>/)?.[0] ?? 'disabled', /disabled/)
  assert.match(ready, /不沿用审核结论/)
})

test('saved-file open resolves only an owned persisted Markdown record, without changing or reapproving current files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oasis-saved-open-'))
  try {
    await mkdir(join(root, 'output'))
    await writeFile(join(root, 'output', 'claims.md'), 'changed current file', 'utf8')
    const run = createRunSnapshot({ review: { status: 'approved' } })
    run.writebacks = [{ writebackId: 'wb-a', artifactId: run.result.artifact.artifactId,
      files: [{ relativePath: 'output\\claims.md', mediaType: 'text/markdown', sha256: run.result.artifact.sha256 }] }]
    const current = { revision: 1, tasks: { 'task-a': { runs: { 'run-a': run } } } }
    const service = createWorkbenchService({
      repository: { get(id) { if(id !== 'a') throw Error('unknown workspace'); return current },
        mutate() { assert.fail('opening must not mutate Domain') }, replaceEditable() { assert.fail('opening must not replace Domain') } },
      workspaceRegistry: { get(id) { return id === 'a' ? { path: root, status: async () => 'ok' } : undefined } },
    })
    const handler = createWorkbenchRpcHandler(service)
    const remote = createWorkbenchRemote(createConnectionFixture(handler))
    const payload = { workspaceId: 'a', taskId: 'task-a', runId: 'run-a', writebackId: 'wb-a', artifactId: run.result.artifact.artifactId, expectedRevision: 1 }
    assert.equal(typeof remote.resolveSavedFile, 'function')
    const result = await remote.resolveSavedFile(payload)
    assert.equal(result.absolutePath, join(root, 'output', 'claims.md'))
    assert.equal(result.kind, 'current-file')
    for (const invalid of [{ taskId: 'other' }, { writebackId: 'other' }, { artifactId: 'sha256:' + '0'.repeat(64) }, { expectedRevision: 2 }]) {
      await assert.rejects(() => remote.resolveSavedFile({ ...payload, ...invalid }))
    }
    assert.equal((await handler('artifact/saved-file', { ...payload, absolutePath: 'C:/outside.md' })).ok, false)
    run.writebacks[0].files[0].relativePath = '..\\outside.md'
    await assert.rejects(() => remote.resolveSavedFile(payload))
  } finally { await rm(root, { recursive: true, force: true }) }
})
