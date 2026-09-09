// Native-service integration with the unconnected Host adapter; no private Skill or real provider.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdir, mkdtemp, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createDshGenerationAdapter } from '../../packages/oasis-professional-service/src/dsh-generation-adapter.js'
import { createNativeOfflineRuntime } from '../../packages/oasis-professional-service/src/native-offline-runtime.js'

const root = new URL('../../', import.meta.url)
const packages = new URL('.dsh-test/stage3-desktop-app/resources/app.asar.unpacked/node_modules/@deepseek-ai/', root)
const native = name => import(new URL(`${name}/lib/index.js`, packages))
const { Context } = await native('cordis')
const { LlmRuntime, LlmAdapter, LlmError, BlockAssembler, createUserMessage } = await native('dsh-llm')
const { SessionStore } = await native('dsh-session')
const { default: JsonlPersistence } = await native('dsh-session-persistence-jsonl')
const checkpoint = await native('dsh-session-checkpoint-policy')
const { sessionLogZipEntries } = await native('dsh-session-log-export')
const CANARY = 'OASIS_STAGE4A_PUBLIC_SAMPLE_NOT_A_PRIVATE_SKILL'
const OUTPUT = '可审阅的离线文字样本。'

test('4C uses native model projection and the product offline runtime without Session writes', async t => {
  const { default: Projections } = await native('dsh-session-projection')
  const { installModelSelectionProjection } = await import(new URL('dsh-api-session-controller/lib/types/model-selection-projection.js', packages))
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  await ctx.plugin(SessionStore).await()
  await ctx.plugin(LlmRuntime).await()
  await ctx.plugin(Projections).await()
  installModelSelectionProjection(ctx)
  const cwd = fileURLToPath(root)
  const session = ctx.sessions.create('stage4c-parent', { meta: { cwd } })
  session.append('model/selection', { provider: 'oasis-offline', model: 'text' })
  const workspace = { id: 'stage4c-workspace', path: cwd, sessionIds: [session.id] }
  const runtime = createNativeOfflineRuntime({ llm: ctx.llm, sessions: ctx.sessions, sessionProjections: ctx.sessionProjections,
    workspaceRegistry: { get: () => workspace, list: () => [workspace] }, agentDefaultModel: { currentSelection() { assert.fail('pending selection must win') } },
  }, { LlmAdapter, BlockAssembler, createUserMessage })
  t.after(() => runtime.dispose())
  assert.deepEqual((await ctx.llm.listModels('oasis-offline')).map(model => model.id), ['text', 'slow', 'error'])
  const before = session.snapshotEvents()
  const resolved = runtime.resolveContext({ workspaceId: workspace.id, sessionId: session.id })
  assert.deepEqual(resolved.route, { provider: 'oasis-offline', model: 'text' })
  const result = await runtime.adapter.generate({ runId: 'stage4c-run', ...resolved, instruction: runtime.instruction,
    formValues: { claims: '公开样本输入', technicalField: '', background: '', benefits: '', embodiments: '', drawings: '', instructions: '' },
    signal: new AbortController().signal })
  assert.equal(result.status, 'completed')
  assert.match(result.body, /公开样本输入/)
  assert.ok(!JSON.stringify(result).includes(runtime.instruction.body))
  assert.deepEqual(session.snapshotEvents(), before)
  session.append('model/selection', { provider: 'not-offline', model: 'real' })
  assert.throws(() => runtime.resolveContext({ workspaceId: workspace.id, sessionId: session.id }), error => error.code === 'GENERATION_CONTEXT_UNAVAILABLE')
  t.diagnostic('4C native projection + offline runtime success; Workspace registry is a test double, Desktop ownership remains separate')
})

test('native single call does not append its system to the live session or persisted export', { timeout: 15000 }, async t => {
  const base = new URL('.dsh-test/stage4a-native-llm/', root)
  await mkdir(base, { recursive: true })
  const runRoot = await mkdtemp(fileURLToPath(new URL('run-', base)))
  const ctx = new Context()
  t.after(async () => { await ctx.fiber.dispose() })
  const originalFetch = globalThis.fetch
  globalThis.fetch = () => { throw new Error('Real fetch forbidden in stage4A') }
  t.after(() => { globalThis.fetch = originalFetch })
  await ctx.plugin(SessionStore).await()
  await ctx.plugin(LlmRuntime).await()
  await ctx.plugin(JsonlPersistence, { root: runRoot, compression: 'none' }).await()
  await ctx.plugin(checkpoint).await()
  assert.ok(ctx.llm && ctx.sessions && ctx.sessionPersistence)
  const session = ctx.sessions.create('stage4a-parent', { meta: { cwd: runRoot } })
  session.append('user/message', createUserMessage({ content: [{ type: 'text', text: '公开输入' }] }), { surfaceOp: 'append' })
  const eventsBefore = session.snapshotEvents()
  const emitted = []
  ctx.on('session/event', (...args) => { emitted.push(args) })
  const calls = []
  class OfflineAdapter extends LlmAdapter {
    async *stream(options) {
      calls.push(options)
      assert.equal(options.system, CANARY)
      assert.equal(options.sessionId, session.id)
      assert.equal(options.tools, undefined)
      yield { type: 'text-delta', index: 0, text: OUTPUT }
      yield { type: 'finish', reason: { kind: 'stop' } }
    }
  }
  const registration = ctx.llm.registerAdapter(['stage4a-offline'], new OfflineAdapter())
  const signal = new AbortController().signal
  const prepared = await ctx.llm.prepareCall({ provider: 'stage4a-offline', model: 'text-only' }, signal)
  const options = Object.freeze({ ...prepared.config, sessionId: session.id, signal, system: CANARY,
    messages: Object.freeze([createUserMessage({ content: [{ type: 'text', text: '公开输入' }] })]) })
  const assembler = new BlockAssembler()
  const finishes = []
  for await (const chunk of prepared.stream(options)) {
    if (chunk.type === 'finish') finishes.push(chunk.reason.kind)
    assembler.push(chunk)
  }
  assert.deepEqual(finishes, ['stop'])
  assert.equal(assembler.blocks().filter(b => b.type === 'text').map(b => b.text).join(''), OUTPUT)
  assert.equal(calls.length, 1)
  assert.throws(() => prepared.stream(options), /only be dispatched once/)
  assert.deepEqual(session.snapshotEvents(), eventsBefore)
  assert.equal(emitted.length, 0)
  const adapter = createDshGenerationAdapter({ llm: ctx.llm, BlockAssembler, createUserMessage })
  const request = { runId: 'stage4b-public-run', sessionId: session.id, signal,
    route: { provider: 'stage4a-offline', model: 'text-only' },
    instruction: { version: 'public-sample-1', body: CANARY },
    formValues: { claims: '一种公开测试技术方案。', technicalField: '', background: '',
      benefits: '', embodiments: '', drawings: '', instructions: '' } }
  assert.deepEqual(await adapter.generate(request), { status: 'completed', body: OUTPUT,
    model: { provider: 'stage4a-offline', model: 'text-only' } })
  assert.equal(calls.length, 2)
  assert.deepEqual(session.snapshotEvents(), eventsBefore)
  assert.equal(emitted.length, 0)
  await ctx.sessions.flush(session)
  const raw = await ctx.sessionPersistence.readRaw(session.id)
  assert.ok(raw)
  assert.ok(!raw.content.includes(CANARY))
  const exports = []
  for await (const entry of sessionLogZipEntries({}, raw, session.id, false)) exports.push(entry)
  assert.equal(exports[0].content, raw.content)
  assert.ok(!exports[0].content.includes(CANARY))

  // Positive detection control: ordinary recorded system text remains exportable.
  const control = ctx.sessions.create('stage4a-control', { meta: { cwd: runRoot } })
  control.append('request/header', { header: { config: prepared.config, system: CANARY }, reason: 'initial' })
  await ctx.sessions.flush(control)
  const ordinary = await ctx.sessionPersistence.readRaw(control.id)
  assert.ok(ordinary.content.includes(CANARY))
  const ordinaryEntries = []
  for await (const entry of sessionLogZipEntries({}, ordinary, control.id, false)) ordinaryEntries.push(entry)
  assert.ok(ordinaryEntries[0].content.includes(CANARY))

  // A prepared call must stay bound to the original adapter generation.
  const frozen = await ctx.llm.prepareCall(prepared.config, signal)
  registration()
  let replacementCalls = 0
  class ErrorAdapter extends LlmAdapter {
    async *stream() {
      replacementCalls += 1
      throw new LlmError(`public test error includes ${CANARY}`, 'AUTH')
    }
  }
  ctx.llm.registerAdapter(['stage4a-offline'], new ErrorAdapter())
  for await (const chunk of frozen.stream(options)) assert.notEqual(chunk.type === 'finish' && chunk.reason.kind, 'error')
  assert.equal(calls.length, 3)
  assert.equal(replacementCalls, 0)

  // Native failure text is NOT sanitized. This is an exposure control, not privacy PASS.
  const failures = []
  const failing = await ctx.llm.prepareCall(prepared.config, signal)
  for await (const chunk of failing.stream(options)) failures.push(chunk)
  assert.equal(replacementCalls, 1)
  assert.equal(failures.length, 1)
  assert.equal(failures[0].reason.kind, 'error')
  assert.equal(failures[0].reason.failure.code, 'AUTH')
  assert.ok(failures[0].reason.failure.message.includes(CANARY))
  const safeFailure = await adapter.generate(request)
  assert.equal(safeFailure.status, 'failed')
  assert.equal(safeFailure.code, 'MODEL_UNAVAILABLE')
  assert.deepEqual(Object.keys(safeFailure).sort(), ['code', 'message', 'status'])
  assert.ok(!JSON.stringify(safeFailure).includes(CANARY))
  assert.equal(replacementCalls, 2)
  assert.deepEqual(session.snapshotEvents(), eventsBefore)
  await ctx.sessions.flush(session)
  const afterAdapter = await ctx.sessionPersistence.readRaw(session.id)
  assert.equal(afterAdapter.content, raw.content)
  for await (const entry of sessionLogZipEntries({}, afterAdapter, session.id, false)) {
    assert.ok(!entry.content.includes(CANARY))
  }
  t.diagnostic(JSON.stringify({ proof: 'NATIVE_SERVICES_OFFLINE_NOT_DESKTOP', runRoot, calls: calls.length,
    sessionEventsUnchanged: true, persistedExportContainsCanary: false, controlDetectsCanary: true,
    preparedAdapterGenerationPinned: true, rawErrorCanExposeInstruction: true, errorCalls: replacementCalls,
    productAdapterSuccess: true, productAdapterSafeError: true }))
  for (const name of ['dsh-llm', 'dsh-session', 'dsh-session-persistence-jsonl', 'dsh-session-log-export']) {
    const bytes = await readFile(new URL(`${name}/lib/index.js`, packages))
    const pkg = JSON.parse(await readFile(new URL(`${name}/package.json`, packages), 'utf8'))
    assert.equal(pkg.version, '0.1.2-rc.1')
    t.diagnostic(`${name}@${pkg.version} sha256=${createHash('sha256').update(bytes).digest('hex')}`)
  }
})
