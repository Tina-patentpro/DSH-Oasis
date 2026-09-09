import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { fixtureHarness } from './unified-generation-harness.mjs'
import { assembleClaimsV2, publicClaimsV2Output } from '../src/claims-v2-result.js'
import { createNativeOfflineRuntime } from '../src/native-offline-runtime.js'
import { loadPublicClaimsV2Skill } from '../src/public-claims-v2-pin.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'

const uid = '01234567-89ab-4def-8012-3456789abcde'
const fileName = 'disclosure_20260909080000_01234567.md'
const upstream = `# 技术交底\n\n## 文档信息\n\n- node_id: Flow-1-5\n- workflow_run_uid: ${uid}\n- generated_at: 2026-09-09T08:00:00+08:00\n- filename: ${fileName}\n\n## 核心结论\n\n分段保存。\n\n## 核心结果\n\n完整技术交底。\n\n## 下游读取区\n\nT1: 断电导致记录失效。\nT2: 先校验后更新索引。\nT3: 尚待测量。\n\n## 风险与待确认事项\n\nwarning_id: W-01\n尚未进行断电试验。\n`
const fields = { disclosure_text: '补充：日志采用分段存储。', drawings_text: '', claim_requirements_text: '', user_input: '' }

test('explicit Workspace file is confirmed, frozen into either source, and changes require reconfirmation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'claims-upstream-'))
  await writeFile(join(root, fileName), upstream)
  const h = await fixtureHarness({ claimsV2: true, unifiedFixtureEnabled: true,
    workspaceRegistry: { get: id => id === 'workspace-a' ? { path: root, async status() { return 'ok' } } : undefined } })
  try {
    assert.equal(typeof h.service.selectClaimsUpstream, 'function', 'missing exact upstream selection')
    await h.service.selectClaimsUpstream(h.command({ relativePath: fileName, confirmed: true }))
    assert.equal(h.state().tasks['task-a'].generation.upstream.sha256, createHash('sha256').update(upstream).digest('hex'))
    for (const source of ['local-skill', 'oasis-api']) {
      const draft = h.draft(); draft.tasks['task-a'].generation.source = source
      await h.repository.replaceEditable('workspace-a', h.state().revision, draft)
      await h.service.createUnifiedRun(h.command({ requestKey: source }))
      const task = h.state().tasks['task-a'], run = task.runs[task.activeRunId]
      assert.equal(run.status, 'completed')
      assert.equal(run.inputSnapshot.upstreamSnapshot.body, upstream)
      assert.equal(run.inputSnapshot.upstreamSnapshot.status, 'accepted')
      assert.equal(run.compositionVersion, '2')
      assert.match(run.workflowRunUid, /^[a-f0-9-]{36}$/)
      assert.ok(run.result.artifact.body.includes('尚未进行断电试验。'))
      assert.ok(run.result.artifact.body.includes('T2: 先校验后更新索引。'))
      assert.ok(run.result.artifact.suggestedFileName.endsWith(run.workflowRunUid.replaceAll('-', '').slice(0,8) + '.md'))
    }
    await writeFile(join(root, fileName), upstream + '改变')
    await assert.rejects(h.service.createUnifiedRun(h.command()), e => e.code === 'MATERIAL_CHANGED')
    await assert.rejects(h.service.selectClaimsUpstream(h.command({ relativePath: '../outside.md', confirmed: true })))
    await h.service.selectClaimsUpstream(h.command({ relativePath: null, confirmed: true }))
    assert.equal(h.state().tasks['task-a'].generation.upstream, undefined)
  } finally { await h.repository.close() }
})

test('actual offline provider accepts a frozen upstream without using any external model', async () => {
  let provider
  const runtime = createNativeOfflineRuntime({ llm: { listProviders: () => [], registerAdapter: (_, p) => { provider = p; return () => {} } },
    sessions: {}, workspaceRegistry: {}, sessionProjections: {}, agentDefaultModel: {} },
  { LlmAdapter: class {}, BlockAssembler: class {}, createUserMessage: x => x })
  const { inspectClaimsUpstream } = await import('../src/claims-upstream.js')
  const snapshot = inspectClaimsUpstream(upstream, fileName, createHash('sha256').update(upstream).digest('hex'))
  const chunks = []
  for await (const c of provider.stream({ provider: 'oasis-offline', model: 'text', signal: new AbortController().signal,
    messages: [{ content: [{ text: JSON.stringify({ upstream_snapshot: snapshot, ...fields }) }] }] })) chunks.push(c)
  assert.equal(JSON.parse(chunks[0].text).draftMarkdown, publicClaimsV2Output(fields).draftMarkdown)
  assert.ok(!JSON.parse(chunks[0].text).warnings[0].problem.includes('上游累计材料缺失'), 'received upstream cannot be reported missing')
  runtime.dispose()
})

test('bounded upstream rejects overflow and foreign projects; RPC cannot inject body; valid model echo remains a G-SKILL counterexample', async () => {
  const root = await mkdtemp(join(tmpdir(), 'claims-upstream-guards-'))
  await writeFile(join(root, 'large.md'), 'a'.repeat(65537))
  const localGeneration = { enabled: true, evidenceKind: 'native-offline', loadClaimsV2Skill: loadPublicClaimsV2Skill,
    resolveContext: () => ({ sessionId: 's', route: { provider: 'offline', model: 'text' } }),
    adapter: { async generate(input) { return { status: 'completed', body: JSON.stringify({ ...publicClaimsV2Output(input.formValues), draftMarkdown: 'PUBLIC_4E2_MAIN' }) } } } }
  const h = await fixtureHarness({ claimsV2: true, localGeneration,
    workspaceRegistry: { get: id => id === 'workspace-a' ? { path: root, async status() { return 'ok' } } : undefined } })
  try {
    await assert.rejects(h.service.selectClaimsUpstream(h.command({ relativePath: 'large.md', confirmed: true })), e => e.code === 'MATERIAL_TOO_LARGE')
    const { createClaimsUpstreamService } = await import('../src/claims-upstream.js')
    const unavailableWorkspace = createClaimsUpstreamService({ repository: h.repository, workspaceRegistry: { get: () => undefined } })
    await assert.rejects(unavailableWorkspace.capture('foreign-project', { generation: { upstream: {
      kind: 'project-file', relativePath: fileName, displayName: fileName, mediaType: 'text/markdown',
      sizeBytes: 1, sha256: 'a'.repeat(64),
    } } }), e => e.code === 'UNKNOWN_WORKSPACE')
    await assert.rejects(h.service.selectClaimsUpstream(h.command({ relativePath: fileName, confirmed: false })), e => e.code === 'UPSTREAM_CONFIRMATION_REQUIRED')
    const rpc = createWorkbenchRpcHandler(h.service)
    const base = { workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: h.state().revision, relativePath: 'anything.md', confirmed: true }
    assert.equal((await rpc('task/select-upstream', { ...base, body: 'forged' })).ok, false)
    await h.service.createLocalRun(h.command({ sessionId: 's' }))
    for (let n=0; n<100 && h.state().tasks['task-a'].runs[h.state().tasks['task-a'].activeRunId].status === 'prepared'; n++) await new Promise(r => setImmediate(r))
    const task = h.state().tasks['task-a'], run = task.runs[task.activeRunId]
    assert.equal(run.status, 'completed')
    assert.ok(run.result.artifact.body.includes('PUBLIC_4E2_MAIN'), 'honest residual risk: schema is not secrecy protection')
  } finally { await h.service.closeLocalGeneration(); await h.repository.close() }
})

test('cumulative composition preserves upstream warnings and rejects implicit or ambiguous replacements', async () => {
  const { inspectClaimsUpstream } = await import('../src/claims-upstream.js')
  const snapshot = inspectClaimsUpstream(upstream, fileName, createHash('sha256').update(upstream).digest('hex'))
  const run = { runId: 'run-1', workflowRunUid: uid, compositionVersion: '2', createdAt: '2026-09-09T00:00:00.000Z',
    inputSnapshot: { formValues: fields, upstreamSnapshot: snapshot } }
  const output = publicClaimsV2Output(fields)
  const composed = assembleClaimsV2(JSON.stringify(output), run)
  assert.ok(composed.body.includes(upstream))
  assert.ok(composed.body.includes('warning_id: W-01'))
  assert.equal(composed.fileName, 'claims_20260909080000_01234567.md')
  output.snapshotUpdates = [{ contentId: 'T2', operation: 'replace', contentMarkdown: 'T2: 双重校验后更新索引。', sourceInputId: 'upstream_md_file', sourceLocator: 'T2: 先校验后更新索引。', contentOrigin: 'model_completed', revisionReason: '按用户要求修订' }]
  output.modelCompletions = [{ contentId: 'T2', contentOrigin: 'model_completed', completionBasis: '用户补充', assumptions: '待确认', confidence: '低', affectedSection: 'T2', humanConfirmationStatus: 'pending' }]
  assert.throws(() => assembleClaimsV2(JSON.stringify(output), run), /INVALID_OUTPUT/)
  const explicit = structuredClone(run); explicit.inputSnapshot.formValues.user_input = '替换：T2'
  const result = assembleClaimsV2(JSON.stringify(output), explicit)
  assert.ok(result.body.includes('T2: 双重校验后更新索引。'))
  assert.ok(result.body.includes(upstream), 'original revision must survive replacement')
  const bad = inspectClaimsUpstream('格式不完整，但材料不可丢失。', 'broken.md', 'a'.repeat(64))
  assert.equal(bad.status, 'warning')
  assert.match(assembleClaimsV2(JSON.stringify(publicClaimsV2Output(fields)), { ...run, inputSnapshot: { formValues: fields, upstreamSnapshot: bad } }).body, /格式不完整，但材料不可丢失/)
})
