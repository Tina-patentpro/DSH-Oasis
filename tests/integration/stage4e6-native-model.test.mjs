import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdir, mkdtemp, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { bindNativeModelRuntime, createNativeModelRuntime } from '../../packages/oasis-professional-service/src/native-model-runtime.js'
import { loadClaimsSkill } from '../../packages/oasis-professional-service/src/claims-skill-pin.js'
import { publicClaimsV2Output } from '../../packages/oasis-professional-service/src/claims-v2-result.js'
import { fixtureHarness } from '../../packages/oasis-professional-service/test/unified-generation-harness.mjs'
import * as oasisPlugin from '../../packages/oasis-professional-service/src/index.js'

const packages = new URL('../../.dsh-test/stage3-desktop-app/resources/app.asar.unpacked/node_modules/@deepseek-ai/', import.meta.url)
const { Context } = await import(new URL('cordis/lib/index.js', packages))
const native = await import(new URL('dsh-llm/lib/index.js', packages))
const tick = () => new Promise(r => setImmediate(r))

test('actual Host entry keeps RPC available without native services, then discovers them without a model call', async t => {
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  const records = new Map()
  let handler
  ctx.provide('tools', { register: () => () => {} })
  ctx.provide('storageDomain', { async open() { return {
    table: () => ({ get: id => records.get(id), put: async (id, value) => records.set(id, value) }), close: async () => {},
  } } })
  ctx.provide('connection', { rpc: { handle: (_channel, value) => { handler = value; return () => {} } } })
  ctx.provide('workspaceRegistry', { get: () => undefined, list: () => [] })
  ctx.provide('settings', { register: (_ns, _schema, options) => ({ get: () => ({ ...options.base, localModelEnabled: true }) }) })
  ctx.provide('credentials', { resolve: () => assert.fail('must not read credentials') })
  await ctx.plugin(oasisPlugin).await()
  assert.equal((await handler('workflow/catalog', {})).value.localGenerationEnabled, false)
  assert.equal((await handler('state/get', { workspaceId: 'workspace-a' })).ok, true)
  ctx.provide('llm', { prepareCall: () => assert.fail('no call on capability discovery') })
  ctx.provide('sessions', {})
  ctx.provide('sessionProjections', {})
  ctx.provide('agentDefaultModel', {})
  for (let i = 0; i < 20 && !(await handler('workflow/catalog', {})).value.localGenerationEnabled; i++) await tick()
  const catalog = (await handler('workflow/catalog', {})).value
  assert.equal(catalog.localGenerationEnabled, true)
  assert.equal(catalog.localGenerationKind, 'native-model')
})

test('fixed DSH real-path wiring uses a network-forbidden provider substitute, never a real model', { timeout: 15000 }, async t => {
  assert.equal(JSON.parse(await readFile(new URL('dsh-llm/package.json', packages), 'utf8')).version, '0.1.2-rc.1')
  const beforeFetch = globalThis.fetch
  globalThis.fetch = () => assert.fail('NETWORK FORBIDDEN in 4E-6')
  t.after(() => { globalThis.fetch = beforeFetch })
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  await ctx.plugin(native.LlmRuntime).await()
  const bundle = await loadClaimsSkill()
  let calls = 0
  class TestOnlyProvider extends native.LlmAdapter {
    async *stream(options) {
      calls++
      assert.equal(options.provider, 'stage4e6-test-only')
      assert.equal(options.model, 'text')
      assert.equal(options.system, bundle.instruction.body)
      assert.equal(options.tools, undefined)
      const { upstream_snapshot, ...fields } = JSON.parse(options.messages[0].content[0].text)
      assert.equal(upstream_snapshot.status, 'missing')
      assert.deepEqual(Object.keys(fields).sort(), ['claim_requirements_text', 'disclosure_text', 'drawings_text', 'user_input'])
      yield { type: 'text-delta', index: 0, text: JSON.stringify(publicClaimsV2Output(fields, upstream_snapshot)) }
      yield { type: 'finish', reason: { kind: 'stop' } }
    }
  }
  ctx.llm.registerAdapter(['stage4e6-test-only'], new TestOnlyProvider())
  const base = new URL('../../.dsh-test/stage4e6-native/', import.meta.url)
  await mkdir(base, { recursive: true })
  const root = await mkdtemp(fileURLToPath(new URL('run-', base)))
  const session = { id: 's', header: { cwd: root }, requestHeader: () => undefined }
  const workspace = { id: 'workspace-a', path: root, sessionIds: ['s'], async status() { return 'ok' } }
  const model = { provider: 'stage4e6-test-only', model: 'text' }
  ctx.provide('workspaceRegistry', { get: () => workspace, list: () => [workspace] })
  const disabled = bindNativeModelRuntime(ctx, native)
  assert.equal(disabled.enabled, false)
  disabled.dispose()
  assert.equal(createNativeModelRuntime({}, native, true), null)
  const runtime = bindNativeModelRuntime(ctx, native, true)
  assert.equal(runtime.enabled, false, 'missing services only disable generation')
  ctx.provide('sessions', { get: () => session })
  ctx.provide('sessionProjections', { stateOf: () => ({ pending: null }) })
  ctx.provide('agentDefaultModel', { currentSelection: () => model })
  for (let i = 0; i < 20 && !runtime.enabled; i++) await tick()
  assert.equal(runtime.enabled, true)
  t.after(() => runtime.dispose())
  const h = await fixtureHarness({ claimsV2: true, localGeneration: runtime, workspaceRegistry: ctx.workspaceRegistry })
  t.after(async () => { await h.service.closeLocalGeneration(); await h.repository.close() })
  const command = extra => h.command({ sessionId: 's', ...extra })
  await assert.rejects(h.service.createLocalRun(command()), { code: 'GENERATION_CONFIRMATION_REQUIRED' })
  const preview = await h.service.prepareLocalRun(command())
  assert.equal(calls, 0)
  await h.service.createLocalRun(command({ confirmation: { sha256: preview.sha256, confirmed: true } }))
  let run
  for (let i = 0; i < 200; i++) {
    run = h.state().tasks['task-a'].runs['run-1']
    if (run.status !== 'prepared') break
    await new Promise(r => setTimeout(r, 10))
  }
  assert.equal(run.status, 'completed')
  assert.equal(run.evidenceKind, 'native-model', 'code-path identity only: provider is a substitute')
  assert.equal(calls, 1)
  assert.throws(() => h.service.prepareConversationDraft(command({ runId: run.runId, artifactId: run.result.artifact.artifactId })), /审核/)
  await h.service.reviewRun(command({ runId: run.runId, status: 'approved', note: '' }))
  await h.service.editUnifiedResult(command({ runId: run.runId, artifactId: run.result.artifact.artifactId,
    body: run.result.artifact.body + '\n替身接线测试，未调用真实模型。', requestKey: 'edited' }))
  const edited = h.state().tasks['task-a'].runs[h.state().tasks['task-a'].activeRunId]
  assert.equal(edited.review.status, 'not-reviewed')
  await h.service.reviewRun(command({ runId: edited.runId, status: 'approved', note: '' }))
  const payload = command({ runId: edited.runId, artifactId: edited.result.artifact.artifactId, relativeDirectory: 'output' })
  const plan = await h.service.prepareWriteback(payload)
  await h.service.commitWriteback({ confirmationToken: plan.confirmationToken })
  assert.equal(await readFile(join(root, 'output', edited.result.artifact.suggestedFileName), 'utf8'), edited.result.artifact.body)
  await assert.rejects(h.service.prepareWriteback({ ...payload, expectedRevision: h.state().revision }), { code: 'WRITEBACK_TARGET_EXISTS' })
  const draft = h.service.prepareConversationDraft(command({ runId: edited.runId, artifactId: edited.result.artifact.artifactId }))
  assert.ok(draft.text.includes(edited.result.artifact.body))
  assert.match(draft.text, /原生模型生成/)
  assert.equal(calls, 1)
  await runtime.dispose()
  assert.equal(runtime.enabled, false)
  assert.equal(h.service.getWorkflowCatalog().localGenerationEnabled, false)
  t.diagnostic(JSON.stringify({ evidence: 'NATIVE_MODEL_PATH_TEST_SUBSTITUTE_ONLY', realCalls: 0,
    calls, skillVersion: bundle.provenance.skillVersion, assemblySha256: bundle.provenance.assemblySha256, root }))
})
