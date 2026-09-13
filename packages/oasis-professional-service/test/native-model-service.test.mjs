import assert from 'node:assert/strict'
import test from 'node:test'
import { fixtureHarness } from './unified-generation-harness.mjs'
import { loadClaimsSkill } from '../src/claims-skill-pin.js'
import { publicClaimsV2Output } from '../src/claims-v2-result.js'
import { normalizeOasisRuntimeConfig } from '../src/oasis-runtime-config.js'
import { createWorkbenchStore } from '../src/client/workbench-store.js'
import { getWorkflowCatalog } from '../src/workflow-catalog.js'
import { createWorkbenchRemote } from '../src/client/workbench-remote.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PanelPages } from '../src/client/PanelPages.js'
import { UnifiedResultPanel } from '../src/client/UnifiedResultPanel.js'
import { parseStoredWorkbenchRecord } from '../src/workbench-domain.js'

const sessionId = 'session-a'

test('result-contract failure keeps bounded execution summary and legacy records remain unchanged', async () => {
  const h = await harness()
  try {
    let calls = 0
    const summary = { finishKind: 'stop', usage: { inputTokens: 12, outputTokens: 34 } }
    h.runtime.adapter.generate = async () => { calls++; return { status: 'completed', body: 'NOT_JSON_BODY_CANARY', executionSummary: summary } }
    const preview = await h.service.prepareLocalRun(h.command())
    await h.service.createLocalRun(h.command({ confirmation: { sha256: preview.sha256, confirmed: true } }))
    for (let i = 0; i < 100 && h.state().tasks['task-a'].runs['run-1'].status === 'prepared'; i++) await new Promise(r => setTimeout(r, 5))
    const record = h.state()
    const run = record.tasks['task-a'].runs['run-1']
    assert.equal(run.status, 'failed'); assert.equal(run.failureCode, 'INVALID_OUTPUT'); assert.equal(run.result, null)
    assert.deepEqual(run.executionSummary, { ...summary, failureStage: 'result-contract' })
    assert.equal(calls, 1)
    assert.ok(!JSON.stringify(record).includes('NOT_JSON_BODY_CANARY'))
    const render = value => renderToStaticMarkup(createElement(UnifiedResultPanel, {
      page: { pageId: 'task-a', activeRunId: 'run-1', runs: { 'run-1': value }, runOrder: ['run-1'] }, operation: {} }))
    assert.match(render(run), /结果格式不符合业务要求/)
    assert.match(render(run), /12/); assert.match(render(run), /34/)
    assert.doesNotMatch(render(run), /达到输出上限/)
    assert.match(render({ ...run, executionSummary: { failureStage: 'stream', finishKind: 'max-tokens' } }), /达到输出上限/)
    assert.match(render({ ...run, status: 'unknown', failureCode: 'TIMED_OUT', executionSummary: undefined }), /运行状态未确认/)
    const legacy = structuredClone(record)
    delete legacy.tasks['task-a'].runs['run-1'].executionSummary
    assert.deepEqual(parseStoredWorkbenchRecord('workspace-a', legacy), legacy)
    assert.match(render(legacy.tasks['task-a'].runs['run-1']), /未记录/)
    for (const invalid of [{ finishKind: 'RAW_SECRET' }, { failureStage: 'RAW_SECRET' },
      { usage: { inputTokens: -1 } }, { usage: { outputTokens: '12' } }, { usage: { totalTokens: Infinity } },
      { usage: { extra: 'RAW_SECRET' } }, { rawBody: 'RAW_SECRET' }]) {
      const bad = structuredClone(record)
      bad.tasks['task-a'].runs['run-1'].executionSummary = invalid
      assert.throws(() => parseStoredWorkbenchRecord('workspace-a', bad))
    }
  } finally { await h.service.closeLocalGeneration(); await h.repository.close() }
})
async function harness() {
  let calls = 0
  const context = { sessionId, route: { provider: 'test-provider', model: 'test-model' } }
  const runtime = { enabled: true, evidenceKind: 'native-model', loadClaimsV2Skill: loadClaimsSkill,
    resolveContext: () => structuredClone(context), adapter: { async generate(input) {
      calls++
      return { status: 'completed', body: JSON.stringify(publicClaimsV2Output(input.formValues)) }
    } } }
  const h = await fixtureHarness({ claimsV2: true, localGeneration: runtime })
  return { ...h, runtime, context, calls: () => calls, command: extra => h.command({ sessionId, ...extra }) }
}
test('real generation is default OFF and rejects non-boolean configuration', () => {
  assert.equal(normalizeOasisRuntimeConfig().localModelEnabled, false)
  assert.throws(() => normalizeOasisRuntimeConfig({ localModelEnabled: 'true' }))
})
test('same UI previews before confirmation and invalidates confirmation on input edits', async () => {
  const h = await harness()
  const handler = createWorkbenchRpcHandler(h.service)
  const remote = createWorkbenchRemote({ rpc: { call: (_channel, endpoint, payload) => handler(endpoint, payload) } })
  const store = createWorkbenchStore({ remote, getGenerationSession: () => sessionId,
    workflowCatalog: { ...getWorkflowCatalog(), localGenerationEnabled: true, localGenerationKind: 'native-model' }, saveDelayMs: 0 })
  try {
    store.syncWorkspaces([{ workspaceId: 'workspace-a' }]); await store.hydrateWorkspace('workspace-a')
    await store.createRun('workspace-a', 'task-a')
    assert.equal(h.calls(), 0)
    let state = store.getWorkspaceState('workspace-a')
    assert.ok(state.pageOperations['task-a'].localModelPreview)
    const html = renderToStaticMarkup(createElement(PanelPages, { state }))
    assert.match(html, /test-model/)
    assert.match(html, /确认并生成/)
    assert.match(html, /可能产生费用/)
    assert.match(html, /flow-2-6\/0\.2\.2/)
    assert.equal((html.match(/<textarea/g) ?? []).length, 1)
    store.updateFormValue('workspace-a', 'task-a', 'user_input', '追加起草要求')
    await store.whenSettled('workspace-a')
    assert.equal(store.getWorkspaceState('workspace-a').pageOperations['task-a'].localModelPreview, null)
    await assert.rejects(store.createRun('workspace-a', 'task-a', true), /确认/)
    assert.equal(h.calls(), 0)
    await store.createRun('workspace-a', 'task-a')
    await store.createRun('workspace-a', 'task-a', true)
    for (let i = 0; i < 100 && h.calls() === 0; i++) await new Promise(r => setTimeout(r, 5))
    assert.equal(h.calls(), 1)
  } finally { await store.dispose(); await h.service.closeLocalGeneration(); await h.repository.close() }
})

test('fresh revision cannot reuse an old input confirmation and unknown runs cannot be resent', async () => {
  const h = await harness()
  try {
    const preview = await h.service.prepareLocalRun(h.command())
    const draft = h.draft(); draft.tasks['task-a'].formValues.user_input = '新输入'
    await h.repository.replaceEditable('workspace-a', h.state().revision, draft)
    await assert.rejects(h.service.createLocalRun(h.command({ confirmation: { sha256: preview.sha256, confirmed: true } })), { code: 'GENERATION_CONFIRMATION_STALE' })
    assert.equal(h.calls(), 0)
    let calls = 0
    h.runtime.adapter.generate = async () => { calls++; return { status: 'unknown', code: 'TIMED_OUT' } }
    const fresh = await h.service.prepareLocalRun(h.command())
    const original = h.command({ confirmation: { sha256: fresh.sha256, confirmed: true } })
    await h.service.createLocalRun(original)
    for (let i = 0; i < 100 && h.state().tasks['task-a'].runs['run-1'].status === 'prepared'; i++) await new Promise(r => setTimeout(r, 5))
    assert.equal(h.state().tasks['task-a'].runs['run-1'].status, 'unknown')
    await h.service.createLocalRun({ ...original, expectedRevision: h.state().revision })
    const next = await h.service.prepareLocalRun(h.command())
    await assert.rejects(h.service.createLocalRun(h.command({ requestKey: 'different', confirmation: { sha256: next.sha256, confirmed: true } })), { code: 'WORKSPACE_GENERATION_ACTIVE' })
    await h.service.observeLocalRun(h.command({ runId: 'run-1' }))
    assert.equal(calls, 1)
  } finally { await h.service.closeLocalGeneration(); await h.repository.close() }
})

test('native model confirmation is invalidated by a configuration refresh', async () => {
  const h = await harness()
  const handler = createWorkbenchRpcHandler(h.service)
  const remote = createWorkbenchRemote({ rpc: { call: (_channel, endpoint, payload) => handler(endpoint, payload) } })
  const store = createWorkbenchStore({ remote, getGenerationSession: () => sessionId,
    workflowCatalog: { ...getWorkflowCatalog(), localGenerationEnabled: true, localGenerationKind: 'native-model' } })
  try {
    store.syncWorkspaces([{ workspaceId: 'workspace-a' }]); await store.hydrateWorkspace('workspace-a')
    await store.createRun('workspace-a', 'task-a')
    await store.refreshProfessionalConfiguration()
    assert.equal(store.getWorkspaceState('workspace-a').pageOperations['task-a'].localModelPreview, null)
    assert.equal(h.calls(), 0)
  } finally { await store.dispose(); await h.service.closeLocalGeneration(); await h.repository.close() }
})
test('real path requires matching explicit confirmation, never dispatches during preview', async () => {
  const h = await harness()
  try {
    await assert.rejects(h.service.createLocalRun(h.command()), { code: 'GENERATION_CONFIRMATION_REQUIRED' })
    const preview = await h.service.prepareLocalRun(h.command())
    assert.equal(preview.route.model, 'test-model')
    assert.equal(h.calls(), 0)
    h.context.route.model = 'changed'
    await assert.rejects(h.service.createLocalRun(h.command({ confirmation: { sha256: preview.sha256, confirmed: true } })), { code: 'GENERATION_CONFIRMATION_STALE' })
    assert.equal(h.calls(), 0)
    const fresh = await h.service.prepareLocalRun(h.command())
    await h.service.createLocalRun(h.command({ confirmation: { sha256: fresh.sha256, confirmed: true } }))
    for (let i = 0; i < 100 && h.state().tasks['task-a'].runs['run-1']?.status === 'prepared'; i++) await new Promise(r => setTimeout(r, 5))
    const run = h.state().tasks['task-a'].runs['run-1']
    assert.equal(run.status, 'completed')
    assert.equal(run.evidenceKind, 'native-model')
    assert.equal(run.contextSnapshot.skillProvenance.skillVersion, '0.2.2')
    assert.match(run.result.artifact.body, /原生模型/)
    assert.doesNotMatch(run.result.artifact.body, /结果为离线合成|公开替身\/合成验收/)
    assert.equal(h.calls(), 1)
  } finally { await h.service.closeLocalGeneration(); await h.repository.close() }
})
