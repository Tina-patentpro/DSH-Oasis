import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createWorkbenchRemote } from '../src/client/workbench-remote.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { createWorkbenchStore } from '../src/client/workbench-store.js'
import { PanelPages } from '../src/client/PanelPages.js'
import { PanelChrome } from '../src/client/PanelChrome.js'
import { getWorkflowCatalog } from '../src/workflow-catalog.js'
import { NOW } from './workbench-fixtures.mjs'
import { createEmptyWorkbenchRecord } from '../src/workbench-domain.js'

test('unified RPC is separate from legacy create, strictly validated and read-only for conversation preparation', async () => {
  const calls = []
  const reply = { workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-a', artifactId: 'sha256:' + 'a'.repeat(64), text: '固定正文' }
  const handler = createWorkbenchRpcHandler({
    prepareConversationDraft(p) { calls.push(p); return reply },
    createUnifiedRun() { throw Error('must not generate on read') },
  })
  const remote = createWorkbenchRemote({ rpc: { call: (channel, endpoint, payload) => handler(endpoint, payload) } })
  assert.equal(typeof remote.prepareConversationDraft, 'function')
  const payload = { ...reply, expectedRevision: 1 }; delete payload.text
  assert.deepEqual(await remote.prepareConversationDraft(payload), reply)
  const invalid = await handler('artifact/conversation-draft', { ...payload, skillBody: 'forbidden' })
  assert.equal(invalid.ok, false)
  assert.equal(calls.length, 1)
})

test('same page renders both sources through shared generation, review and save controls with explicit synthetic evidence', () => {
  const workflow = getWorkflowCatalog().workflows.find(w => w.workflowId === 'patent-claims')
  for (const source of ['local-skill', 'oasis-api']) {
    const run = { runId: 'run-a', mode: 'unified-fixture', status: 'completed', evidenceKind: 'synthetic', source,
      result: { contentStatus: 'warning', riskAssessment: 'not-assessed', questionAssessment: 'not-assessed',
        artifact: { artifactId: 'sha256:' + 'a'.repeat(64), body: '<script>danger</script>', suggestedFileName: 'claims.md' } },
      review: { status: 'not-reviewed', note: '' }, writebacks: [], completedAt: NOW }
    const page = { pageId: 'task-a', title: workflow.title, workflowId: workflow.workflowId, workflowVersion: '1', workType: workflow.workType,
      generation: { source, inputSchemaVersion: '1' }, formValues: Object.fromEntries(workflow.form.fields.map(f => [f.fieldId, f.fieldId === 'claims' ? '输入' : ''])),
      activeRunId: run.runId, runOrder: [run.runId], runs: { [run.runId]: run }, inputRefs: [], professionalDraft: null, remoteExecutionOrder: [], remoteExecutions: {}, view: 'workspace' }
    const state = { workspaceId: 'workspace-a', syncStatus: 'ready', pages: [page], activePageId: page.pageId, workflows: [workflow], pageOperations: {}, unifiedFixtureEnabled: true }
    const html = renderToStaticMarkup(createElement(PanelPages, { state, effectiveMode: 'embedded' }))
    assert.match(html, /生成合成样本/)
    assert.match(html, /审核此版本/)
    assert.match(html, /在对话中使用/)
    assert.match(html, /风险未评估/)
    assert.doesNotMatch(html, /<script>danger/)
    assert.match(html, /&lt;script&gt;danger/)
    assert.doesNotMatch(html, /观察当前页流水|提交专业服务/)
    run.review.status = 'approved'
    state.conversationUnavailableReason = null
    const ready = renderToStaticMarkup(createElement(PanelPages, { state, effectiveMode: 'embedded' }))
    const useButton = ready.match(/<button[^>]*>在对话中使用<\/button>/)?.[0]
    assert.ok(useButton)
    assert.doesNotMatch(useButton, /disabled/)
    state.conversationUnavailableReason = '当前对话已有草稿'
    const occupied = renderToStaticMarkup(createElement(PanelPages, { state, effectiveMode: 'embedded' }))
    assert.match(occupied.match(/<button[^>]*>在对话中使用<\/button>/)?.[0] ?? '', /disabled/)
    const rendered = []
    function NativeMarkdown(props) { rendered.push(props); return createElement('div', null, 'native result') }
    NativeMarkdown.resourcePolicyVersion = 1
    const rich = renderToStaticMarkup(createElement(PanelPages, { state, markdownRenderer: NativeMarkdown }))
    assert.match(rich, /native result/)
    assert.equal(rendered.length, 1)
    assert.equal(rendered[0].text, run.result.artifact.body)
    assert.equal(rendered[0].allowRemoteImages, false)
  }
})

test('store routes enabled unified generation once and does not retry after uncertain transport failure', async () => {
  let calls = 0
  let stored = createEmptyWorkbenchRecord('workspace-a')
  const remote = {
    async get() { return stored },
    async replace(workspaceId, expectedRevision, draft) {
      stored = { ...draft, workspaceId, revision: expectedRevision + 1, updatedAt: NOW,
        tasks: Object.fromEntries(draft.taskOrder.map(id => [id, { ...draft.tasks[id], inputRefs: [], runOrder: [], runs: {}, remoteExecutionOrder: [], remoteExecutions: {} }])) }
      return { committed: true, current: stored }
    },
    async createUnifiedRun() { calls += 1; throw new Error('uncertain transport result') },
    async createRun() { assert.fail('must not use old mock endpoint') },
  }
  const workflowCatalog = { ...getWorkflowCatalog(), unifiedFixtureEnabled: true }
  const store = createWorkbenchStore({ remote, workflowCatalog, clock: () => NOW, createId: () => 'task-a', saveDelayMs: 0 })
  try {
    store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
    await store.hydrateWorkspace('workspace-a')
    store.createPage('workspace-a'); store.selectWorkflow('workspace-a', 'task-a', 'patent-claims')
    assert.equal(store.getWorkspaceState('workspace-a').unifiedFixtureEnabled, true)
    assert.equal(typeof store.stopUnifiedRun, 'function')
    assert.equal(typeof store.editUnifiedResult, 'function')
    store.updateFormValue('workspace-a', 'task-a', 'claims', '输入')
    await store.whenSettled('workspace-a')
    await assert.rejects(store.createRun('workspace-a', 'task-a'), /uncertain/)
    await assert.rejects(store.createRun('workspace-a', 'task-a'), /锁定/)
    assert.throws(() => store.setGenerationSource('workspace-a', 'task-a', 'oasis-api'), /锁定/)
    assert.throws(() => store.closePage('workspace-a', 'task-a'), /锁定/)
    assert.equal(calls, 1)
    await store.observeUnifiedRun('workspace-a', 'task-a')
    assert.equal(store.getWorkspaceState('workspace-a').pageOperations['task-a'].generationUncertain, false)
  } finally { await store.dispose() }
  assert.equal(calls, 1)
})

test('pending synthetic task disables its close control instead of silently ignoring a click', () => {
  const page = { pageId: 'task-a', title: '合成任务', generation: { source: 'local-skill' }, runs: { a: { mode: 'unified-fixture', status: 'prepared' } }, remoteExecutionOrder: [] }
  const html = renderToStaticMarkup(createElement(PanelChrome, { state: {
    pages: [page], activePageId: page.pageId, effectiveMode: 'embedded', panelMode: 'hidden', syncStatus: 'ready', pageOperations: {},
  } }))
  assert.match(html, /aria-label="关闭任务页 合成任务"[^>]*disabled/)
})
