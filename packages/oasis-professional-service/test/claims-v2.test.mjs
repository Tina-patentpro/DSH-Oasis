import assert from 'node:assert/strict'
import test from 'node:test'
import { getWorkflowDefinition, getWorkflowCatalog } from '../src/workflow-catalog.js'
import { assembleClaimsV2, publicClaimsV2Output, missingUpstream } from '../src/claims-v2-result.js'
import { fixtureHarness } from './unified-generation-harness.mjs'
import { loadPublicClaimsV2Skill } from '../src/public-claims-v2-pin.js'
import { parseStoredWorkbenchRecord } from '../src/workbench-domain.js'
import { createHash } from 'node:crypto'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { UnifiedGenerationPage } from '../src/client/UnifiedGenerationPage.js'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const fields = { disclosure_text: '控制器按分段写入日志，校验后更新索引。', drawings_text: '', claim_requirements_text: '', user_input: '' }
const run = { runId: 'run-public-test', createdAt: '2026-09-08T01:02:03.000Z', inputSnapshot: { formValues: fields, upstreamSnapshot: missingUpstream } }
test('new catalog prefers four-tab claims v2 but keeps exact v1 history', () => {
  const v2 = getWorkflowDefinition('patent-claims', '2')
  assert.deepEqual(v2.form.fields.map(f => f.label), ['技术交底', '附图说明', '撰写要求', '用户指令'])
  assert.equal(getWorkflowDefinition('patent-claims', '1').form.fields.length, 7)
  assert.equal(getWorkflowCatalog().workflows.find(w => w.workflowId === 'patent-claims').workflowVersion, '2')
})
test('Host composes five sections, original input, missing upstream and bounded unique name', () => {
  const output = assembleClaimsV2(JSON.stringify(publicClaimsV2Output(fields)), run)
  for (const heading of ['文档信息', '核心结论', '核心结果', '下游读取区', '风险与待确认事项']) assert.ok(output.body.includes(`## ${heading}\n`))
  assert.ok(output.body.includes(fields.disclosure_text))
  assert.match(output.body, /上游累计材料缺失/)
  assert.match(output.fileName, /^claims_20260908090203_[a-f0-9]{8}\.md$/)
})
test('malformed, extra-field, oversized and unsupported replacement results fail closed', () => {
  const good = publicClaimsV2Output(fields)
  for (const raw of ['not-json', JSON.stringify({ ...good, secret: 'x' }), JSON.stringify({ ...good, warnings: undefined }),
    JSON.stringify({ ...good, draftMarkdown: '  \n ' }), JSON.stringify({ ...good, summary: '  ' }),
    JSON.stringify({ ...good, draftMarkdown: 'x'.repeat(100001) }), JSON.stringify({ ...good, snapshotUpdates: [{ contentId: 'x', operation: 'replace', contentMarkdown: 'x', sourceInputId: 'upstream', sourceLocator: 'x', contentOrigin: 'user_provided', revisionReason: 'x' }] })]) {
    assert.throws(() => assembleClaimsV2(raw, run), /INVALID_OUTPUT/)
  }
})

test('v2 page exposes the same four tabs and missing upstream for either source', () => {
  const workflow = getWorkflowDefinition('patent-claims', '2')
  for (const source of ['local-skill', 'oasis-api']) {
    const page = { pageId: 'p', title: 'Claims', workflowVersion: '2', formValues: fields, generation: { source }, runs: {}, runOrder: [], remoteExecutionOrder: [], remoteExecutions: {} }
    const html = renderToStaticMarkup(createElement(UnifiedGenerationPage, { page, workflow, workspaceId: 'w', syncStatus: 'ready', fixtureEnabled: true, operation: { activeOperation: null } }))
    assert.equal((html.match(/role="tab"/g) ?? []).length, 4)
    assert.equal((html.match(/<textarea/g) ?? []).length, 1)
    assert.match(html, /上游累计材料：未选择/)
    assert.match(html, /上游 Markdown 相对路径/)
    assert.match(html, /确认读取/)
    assert.doesNotMatch(html, /具体实施方式/)
  }
})

test('both synthetic sources use contract2, preserve input identity and edited review boundaries', async () => {
  const h = await fixtureHarness({ claimsV2: true, unifiedFixtureEnabled: true })
  try {
    for (const source of ['local-skill', 'oasis-api']) {
      const draft = h.draft(); draft.tasks['task-a'].generation.source = source
      await h.repository.replaceEditable('workspace-a', h.state().revision, draft)
      await h.service.createUnifiedRun(h.command({ requestKey: source }))
      const task = h.state().tasks['task-a']; const run = task.runs[task.activeRunId]
      assert.equal(run.status, 'completed')
      assert.equal(run.workflowVersion, '2')
      assert.equal(run.inputSchemaVersion, 'claims-disclosure-2')
      assert.deepEqual(run.inputSnapshot.upstreamSnapshot, missingUpstream)
      assert.match(run.result.artifact.suggestedFileName, /^claims_/)
      await h.service.reviewRun(h.command({ runId: run.runId, status: 'approved', note: '' }))
      const text = h.service.prepareConversationDraft(h.command({ runId: run.runId, artifactId: run.result.artifact.artifactId })).text
      assert.match(text, /## 下游读取区/)
      await h.service.editUnifiedResult(h.command({ runId: run.runId, artifactId: run.result.artifact.artifactId, body: '人工修订文稿', requestKey: `edit-${source}` }))
      const edited = h.state().tasks['task-a'].runs[h.state().tasks['task-a'].activeRunId]
      assert.equal(edited.review.status, 'not-reviewed')
      assert.equal(edited.inputSnapshot.sha256, run.inputSnapshot.sha256)
      assert.equal(edited.result.artifact.suggestedFileName, run.result.artifact.suggestedFileName)
      assert.throws(() => h.service.prepareConversationDraft(h.command({ runId: edited.runId, artifactId: edited.result.artifact.artifactId })), /审核/)
      assert.deepEqual(parseStoredWorkbenchRecord('workspace-a', h.state()), h.state())
      const corrupt = structuredClone(h.state()); corrupt.tasks['task-a'].runs[run.runId].inputSchemaVersion = '1'
      assert.throws(() => parseStoredWorkbenchRecord('workspace-a', corrupt))
    }
  } finally { await h.repository.close() }
})

test('local contract2 loads only pinned public resources and sanitizes invalid JSON without retry', async () => {
  const loaded = await loadPublicClaimsV2Skill()
  assert.equal(loaded.provenance.skillId, 'flow-2-6')
  assert.equal(loaded.provenance.skillVersion, 'public-4e2-1')
  let calls = 0; let valid = true
  const runtime = { enabled: true, evidenceKind: 'native-offline', loadClaimsV2Skill: loadPublicClaimsV2Skill,
    resolveContext: () => ({ sessionId: 's', route: { provider: 'offline', model: 'text' } }),
    adapter: { async generate(input) { calls++; assert.equal(input.instruction.body, loaded.instruction.body); assert.equal(input.workflowVersion, '2'); assert.deepEqual(input.upstreamSnapshot, missingUpstream)
      return { status: 'completed', body: valid ? JSON.stringify(publicClaimsV2Output(input.formValues)) : 'RAW_PRIVATE_LOOKING_ERROR' } } } }
  const h = await fixtureHarness({ claimsV2: true, localGeneration: runtime })
  try {
    for (const ok of [true, false]) {
      valid = ok
      await h.service.createLocalRun(h.command({ sessionId: 's', requestKey: String(ok) }))
      for (let n = 0; n < 30 && h.state().tasks['task-a'].runs[h.state().tasks['task-a'].activeRunId].status === 'prepared'; n++) await new Promise(r => setImmediate(r))
      const run = h.state().tasks['task-a'].runs[h.state().tasks['task-a'].activeRunId]
      assert.equal(run.status, ok ? 'completed' : 'failed')
      assert.equal(run.failureCode, ok ? null : 'INVALID_OUTPUT')
      assert.equal(run.contextSnapshot.skillProvenance.assemblySha256, createHash('sha256').update(loaded.instruction.body).digest('hex'))
      assert.ok(!JSON.stringify(h.state()).includes('PUBLIC_4E2_MAIN'))
      assert.ok(!JSON.stringify(h.state()).includes('RAW_PRIVATE_LOOKING_ERROR'))
    }
    assert.equal(calls, 2)
  } finally { await h.service.closeLocalGeneration(); await h.repository.close() }
})

test('contract2 native and API synthetic artifacts save without overwrite with versioned provenance', async () => {
  for (const mode of ['native', 'synthetic']) {
    const root = await mkdtemp(join(tmpdir(), 'oasis-claims-v2-'))
    const localGeneration = { enabled: true, evidenceKind: 'native-offline', loadClaimsV2Skill: loadPublicClaimsV2Skill,
      resolveContext: () => ({ sessionId: 's', route: { provider: 'offline', model: 'text' } }),
      adapter: { async generate(input) { return { status: 'completed', body: JSON.stringify(publicClaimsV2Output(input.formValues)) } } } }
    const h = await fixtureHarness({ claimsV2: true, unifiedFixtureEnabled: mode === 'synthetic', localGeneration: mode === 'native' ? localGeneration : undefined,
      workspaceRegistry: { get: () => ({ path: root, async status() { return 'ok' } }) } })
    try {
      if (mode === 'native') {
        await h.service.createLocalRun(h.command({ sessionId: 's' }))
        for (let n = 0; n < 30 && h.state().tasks['task-a'].runs[h.state().tasks['task-a'].activeRunId].status === 'prepared'; n++) await new Promise(r => setImmediate(r))
      } else {
        const draft = h.draft(); draft.tasks['task-a'].generation.source = 'oasis-api'
        await h.repository.replaceEditable('workspace-a', h.state().revision, draft)
        await h.service.createUnifiedRun(h.command())
      }
      const task = h.state().tasks['task-a']; const run = task.runs[task.activeRunId]
      assert.equal(run.status, 'completed')
      await h.service.reviewRun(h.command({ runId: run.runId, status: 'approved', note: '' }))
      const payload = h.command({ runId: run.runId, artifactId: run.result.artifact.artifactId, relativeDirectory: mode })
      const plan = await h.service.prepareWriteback(payload)
      await h.service.commitWriteback({ confirmationToken: plan.confirmationToken })
      assert.equal(await readFile(join(root, mode, run.result.artifact.suggestedFileName), 'utf8'), run.result.artifact.body)
      const metadata = JSON.parse(await readFile(join(root, mode, run.result.artifact.suggestedFileName.replace(/\.md$/, '.oasis.json')), 'utf8'))
      assert.equal(metadata.workflow.workflowVersion, '2')
      assert.equal(metadata.execution.inputSchemaVersion, 'claims-disclosure-2')
      assert.ok(!JSON.stringify(metadata).includes('PUBLIC_4E2_MAIN'))
      await assert.rejects(h.service.prepareWriteback({ ...payload, expectedRevision: h.state().revision }), e => e.code === 'WRITEBACK_TARGET_EXISTS')
    } finally { await h.service.closeLocalGeneration(); await h.repository.close() }
  }
})
