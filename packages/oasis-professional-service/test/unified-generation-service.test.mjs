import { createConnectionFixture } from './connection-fixture.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, rm, realpath } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseStoredWorkbenchRecord } from '../src/workbench-domain.js'
import { NOW } from './workbench-fixtures.mjs'
import { fixtureHarness } from './unified-generation-harness.mjs'
import { createWorkbenchStore } from '../src/client/workbench-store.js'
import { createWorkbenchRemote } from '../src/client/workbench-remote.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { createConversationDraftBridge } from '../src/client/conversation-draft-bridge.js'


test('late conversation preparation cannot insert after the selected version changes', async () => {
  const h = await fixtureHarness({ unifiedFixtureEnabled: true })
  let release, entered
  const started = new Promise(resolve => { entered = resolve })
  let inserted = 0
  const handler = createWorkbenchRpcHandler(h.service)
  const remote = createWorkbenchRemote(createConnectionFixture(async (endpoint, payload) => {
    const response = await handler(endpoint, payload)
    if (endpoint === 'artifact/conversation-draft') { entered(); await new Promise(resolve => { release = resolve }) }
    return response
  }))
  const store = createWorkbenchStore({ remote, saveDelayMs: 60000, clock: () => NOW,
    conversationDrafts: { capture: () => ({}), insert() { inserted += 1 } },
  })
  try {
    store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
    await store.hydrateWorkspace('workspace-a'); await store.loadWorkflowCatalog('workspace-a')
    await store.createRun('workspace-a', 'task-a')
    const first = store.getWorkspaceState('workspace-a').pages[0].activeRunId
    await store.reviewRun('workspace-a', 'task-a', first, 'approved', '')
    await store.editUnifiedResult('workspace-a', 'task-a', first, '另一个固定版本')
    const second = store.getWorkspaceState('workspace-a').pages[0].activeRunId
    store.activateRun('workspace-a', 'task-a', first)
    const pending = store.useInConversation('workspace-a', 'task-a', first)
    await started
    store.activateRun('workspace-a', 'task-a', second)
    release()
    await assert.rejects(pending, /变化/)
    assert.equal(inserted, 0)
  } finally { await store.dispose(); await h.repository.close() }
})

test('a generation response preserves an unsaved sibling draft instead of replacing it', async () => {
  let release, entered
  const started = new Promise(resolve => { entered = resolve })
  const h = await fixtureHarness({ unifiedFixtureEnabled: true, unifiedFixtureRunner: async () => {
    entered(); return new Promise(resolve => { release = resolve })
  } })
  const handler = createWorkbenchRpcHandler(h.service)
  const remote = createWorkbenchRemote(createConnectionFixture(handler))
  const store = createWorkbenchStore({ remote, saveDelayMs: 60000, clock: () => NOW, createId: () => 'task-b' })
  try {
    store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
    await store.hydrateWorkspace('workspace-a'); await store.loadWorkflowCatalog('workspace-a')
    store.createPage('workspace-a'); store.selectWorkflow('workspace-a', 'task-b', 'patent-claims')
    await store.whenSettled('workspace-a')
    const pending = store.createRun('workspace-a', 'task-a')
    await started
    store.updateFormValue('workspace-a', 'task-b', 'disclosure_text', '必须保留的未保存材料')
    release('已经生成的合成正文')
    await pending.catch(error => { assert.match(error.message, /conflict/i) })
    const state = store.getWorkspaceState('workspace-a')
    assert.equal(state.pages.find(page => page.pageId === 'task-b').formValues.disclosure_text, '必须保留的未保存材料')
    assert.equal(state.syncStatus, 'conflict')
    assert.equal(h.state().tasks['task-a'].runs[h.state().tasks['task-a'].activeRunId].status, 'completed')
  } finally { await store.dispose(); await h.repository.close() }
})

test('fixture capability is off by default and real generation is never a fallback', async () => {
  const h = await fixtureHarness()
  try {
    assert.equal(typeof h.service.createUnifiedRun, 'function')
    assert.equal(h.service.getWorkflowCatalog().unifiedFixtureEnabled, false)
    await assert.rejects(h.service.createUnifiedRun(h.command()), e => e.code === 'GENERATION_NOT_ENABLED')
    assert.equal(h.state().tasks['task-a'].runOrder.length, 0)
  } finally { await h.repository.close() }
})

test('two synthetic sources retain independent evidence but share review, edit and content-addressed artifacts', async () => {
  const h = await fixtureHarness({ unifiedFixtureEnabled: true })
  try {
    assert.equal(typeof h.service.createUnifiedRun, 'function')
    for (const source of ['local-skill', 'oasis-api']) {
      const draft = h.draft()
      draft.tasks['task-a'].generation.source = source
      await h.repository.replaceEditable('workspace-a', h.state().revision, draft)
      const cmd = h.command()
      const created = await h.service.createUnifiedRun(cmd)
      assert.equal(created.committed, true)
      const task = h.state().tasks['task-a']
      const run = task.runs[task.activeRunId]
      assert.equal(run.mode, 'unified-fixture')
      assert.equal(run.evidenceKind, 'synthetic')
      assert.equal(run.source, source)
      assert.equal(run.status, 'completed')
      assert.equal(run.result.riskAssessment, 'not-assessed')
      assert.equal(run.result.questionAssessment, 'not-assessed')
      assert.match(run.result.artifact.body, /合成验收/)
      assert.equal(run.review.status, 'not-reviewed')
      const count = task.runOrder.length
      await h.service.createUnifiedRun({ ...cmd, expectedRevision: h.state().revision })
      assert.equal(h.state().tasks['task-a'].runOrder.length, count)
      assert.throws(() => h.service.prepareConversationDraft({ ...cmd, runId: run.runId, artifactId: run.result.artifact.artifactId, expectedRevision: h.state().revision }), e => e.code === 'WRITEBACK_REVIEW_REQUIRED')
      await h.service.reviewRun({ ...cmd, expectedRevision: h.state().revision, runId: run.runId, status: 'approved', note: '' })
      const approved = h.state().tasks['task-a'].runs[run.runId]
      const prepared = h.service.prepareConversationDraft({ ...cmd, expectedRevision: h.state().revision, runId: run.runId, artifactId: run.result.artifact.artifactId })
      assert.match(prepared.text, /仅作为资料/)
      assert.ok(prepared.text.includes(run.result.artifact.body))
      await assert.rejects(h.service.editUnifiedResult(h.command({ runId: run.runId, artifactId: 'sha256:' + '0'.repeat(64), body: '修改正文' })), e => e.code === 'WRITEBACK_ARTIFACT_MISMATCH')
      await h.service.editUnifiedResult(h.command({ runId: run.runId, artifactId: run.result.artifact.artifactId, body: '人工修订文字' }))
      const after = h.state().tasks['task-a']
      const edited = after.runs[after.activeRunId]
      assert.equal(edited.parentRunId, run.runId)
      assert.equal(edited.review.status, 'not-reviewed')
      assert.equal(edited.source, source)
      assert.deepEqual(after.runs[run.runId], approved)
      const tampered = structuredClone(h.state())
      tampered.tasks['task-a'].runs[edited.runId].result.artifact.body += '篡改'
      assert.throws(() => parseStoredWorkbenchRecord('workspace-a', tampered), /integrity/)
    }
    assert.throws(() => h.service.prepareConversationDraft({ workspaceId: 'workspace-b', taskId: 'task-a', expectedRevision: 0, runId: 'run-1', artifactId: 'sha256:' + '0'.repeat(64) }), e => e.code === 'TASK_NOT_FOUND')
  } finally { await h.repository.close() }
})

test('prepared run is durable and locks input, stops without rerunning and ignores late results', async () => {
  let finish
  let entered
  const started = new Promise(resolve => { entered = resolve })
  let calls = 0
  const h = await fixtureHarness({ unifiedFixtureEnabled: true, unifiedFixtureRunner: async () => {
    calls += 1; entered(); return new Promise(resolve => { finish = resolve })
  } })
  try {
    assert.equal(typeof h.service.createUnifiedRun, 'function')
    const cmd = h.command()
    const pending = h.service.createUnifiedRun(cmd)
    await started
    const task = h.state().tasks['task-a']
    assert.equal(task.runs[task.activeRunId].status, 'prepared')
    assert.equal(task.runs[task.activeRunId].result, null)
    const draft = h.draft(); draft.tasks['task-a'].generation.source = 'oasis-api'
    await assert.rejects(h.repository.replaceEditable('workspace-a', h.state().revision, draft), /locked/)
    const duplicate = await h.service.createUnifiedRun({ ...cmd, expectedRevision: h.state().revision })
    assert.equal(duplicate.current.tasks['task-a'].runOrder.length, 1)
    await assert.rejects(h.service.createUnifiedRun(h.command({ requestKey: 'different' })), e => e.code === 'WORKSPACE_GENERATION_ACTIVE')
    await h.service.stopUnifiedRun({ ...h.command(), runId: task.activeRunId })
    finish('晚到合成结果')
    await pending
    assert.equal(calls, 1)
    assert.equal(h.state().tasks['task-a'].runs[task.activeRunId].status, 'stopped')
    assert.equal(h.state().tasks['task-a'].runs[task.activeRunId].result, null)
    await h.service.createUnifiedRun({ ...cmd, expectedRevision: h.state().revision })
    assert.equal(calls, 1)
  } finally { await h.repository.close() }
})

test('both sources use existing no-overwrite Markdown publication with synthetic provenance', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'oasis-unified-')))
  const h = await fixtureHarness({ unifiedFixtureEnabled: true,
    workspaceRegistry: { get: id => id === 'workspace-a' ? { path: root, async status() { return 'ok' } } : null },
  })
  try {
    assert.equal(typeof h.service.createUnifiedRun, 'function')
    for (const source of ['local-skill', 'oasis-api']) {
      const draft = h.draft(); draft.tasks['task-a'].generation.source = source
      await h.repository.replaceEditable('workspace-a', h.state().revision, draft)
      await h.service.createUnifiedRun(h.command())
      const task = h.state().tasks['task-a']; const run = task.runs[task.activeRunId]
      await h.service.reviewRun({ ...h.command(), runId: run.runId, status: 'approved', note: '' })
      const payload = { ...h.command(), runId: run.runId, artifactId: run.result.artifact.artifactId, relativeDirectory: source }
      const plan = await h.service.prepareWriteback(payload)
      await h.service.commitWriteback({ confirmationToken: plan.confirmationToken })
      const md = await readFile(join(root, source, run.result.artifact.suggestedFileName), 'utf8')
      assert.equal(md, run.result.artifact.body)
      const metadata = JSON.parse(await readFile(join(root, source, 'patent-claims.oasis.json'), 'utf8'))
      assert.equal(metadata.execution.evidenceKind, 'synthetic')
      assert.equal(metadata.execution.source, source)
      await assert.rejects(h.service.prepareWriteback({ ...payload, expectedRevision: h.state().revision }), e => e.code === 'WRITEBACK_TARGET_EXISTS')
    }
  } finally { await h.repository.close() }
})

test('store to RPC to Host closes the two-source synthetic loop and prepares native input without sending', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'oasis-unified-open-')))
  const h = await fixtureHarness({ unifiedFixtureEnabled: true,
    workspaceRegistry: { get: id => id === 'workspace-a' ? { path: root, async status() { return 'ok' } } : null },
  })
  const handler = createWorkbenchRpcHandler(h.service)
  const remote = createWorkbenchRemote(createConnectionFixture(handler))
  const drafts = createConversationDraftBridge(() => ({ status: 'ready', currentSessionId: 'session-a', workspaceItems: [{ workspaceId: 'workspace-a', sessionIds: ['session-a'] }] }))
  let text = ''
  drafts.register({ workspaceId: 'workspace-a', sessionId: 'session-a', read: () => ({ draft: text, draftRev: 0, phase: 'plain', imageIds: [], occurrences: [] }), inputActions: {
    setDraft(value) { text = value }, submit() { assert.fail('must not send') },
  } })
  const opened = []
  const nativeFiles = {
    captureSavedFileTarget: workspaceId => ({ workspaceId }),
    openSavedFile(target, file) { assert.equal(target.workspaceId, file.workspaceId); opened.push(file); return true },
  }
  const store = createWorkbenchStore({ remote, nativeFiles, conversationDrafts: drafts, saveDelayMs: 0, clock: () => NOW })
  try {
    store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
    await store.hydrateWorkspace('workspace-a'); await store.loadWorkflowCatalog('workspace-a')
    for (const source of ['local-skill', 'oasis-api']) {
      store.setGenerationSource('workspace-a', 'task-a', source)
      await store.createRun('workspace-a', 'task-a')
      const page = store.getWorkspaceState('workspace-a').pages[0]
      const run = page.runs[page.activeRunId]
      assert.equal(run.source, source)
      await store.reviewRun('workspace-a', 'task-a', run.runId, 'approved', '')
      store.setWritebackDraft('workspace-a', 'task-a', source, false)
      await store.prepareWriteback('workspace-a', 'task-a', run.runId)
      store.setWritebackConfirmation('workspace-a', 'task-a', true)
      await store.commitWriteback('workspace-a', 'task-a')
      const saved = store.getWorkspaceState('workspace-a').pages[0].runs[run.runId]
      assert.equal(await store.openSavedFile('workspace-a', 'task-a', run.runId, saved.writebacks[0].writebackId), true)
      assert.equal(await readFile(opened.at(-1).absolutePath, 'utf8'), run.result.artifact.body)
      assert.equal(opened.at(-1).kind, 'current-file')
      text = ''
      assert.equal(await store.useInConversation('workspace-a', 'task-a', run.runId), true)
      assert.ok(text.includes(run.result.artifact.body))
      await assert.rejects(store.useInConversation('workspace-a', 'task-a', run.runId), /草稿/)
    }
    assert.equal(opened.length, 2)
  } finally { await store.dispose(); drafts.dispose(); await h.repository.close(); await rm(root, { recursive: true }) }
})
