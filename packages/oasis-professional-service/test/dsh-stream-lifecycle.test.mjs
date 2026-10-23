import assert from 'node:assert/strict'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import { LlmRuntime, LlmAdapter, LlmError, BlockAssembler, createUserMessage } from '@deepseek-ai/dsh-llm'
import { createDshGenerationAdapter } from '../src/dsh-generation-adapter.js'
import { loadClaimsSkill } from '../src/claims-skill-pin.js'
import { fixtureHarness } from './unified-generation-harness.mjs'
import { openOasisWorkbenchRepository } from '../src/workbench-repository.js'
import { createLocalGenerationService } from '../src/local-generation-service.js'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const route = { provider: 'stage1-substitute', model: 'text' }
const text = value => ({ type: 'text-delta', index: 0, text: value })
const tick = () => new Promise(resolve => setImmediate(resolve))
const pending = () => new Promise(() => {})
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const request = signal => ({ runId: 'run-1', sessionId: 'session-a',
  formValues: { claims: '公开合成技术方案', technicalField: '', background: '', benefits: '',
    embodiments: '', drawings: '', instructions: '' },
  instruction: { version: 'stage1-public', body: 'PUBLIC_SYNTHETIC_INSTRUCTION' }, route,
  signal: signal ?? new AbortController().signal })

async function nativeHarness(t, { resolve, stream, timeoutMs = 1000 }) {
  t.mock.method(globalThis, 'fetch', () => assert.fail('No network allowed in stream lifecycle tests'))
  const ctx = new Context()
  ctx.provide('workspaceRegistry', { get: () => undefined })
  t.after(() => ctx.fiber.dispose())
  await ctx.plugin(LlmRuntime).await()
  const calls = { prepare: 0, stream: 0 }
  class Provider extends LlmAdapter {
    async resolveModel(provider, model, signal) {
      calls.prepare++
      assert.equal(provider, route.provider)
      assert.equal(model, route.model)
      if (resolve) await resolve(signal)
      return { provider, id: model, name: model }
    }
    stream(options) {
      calls.stream++
      assert.equal(options.provider, route.provider)
      assert.equal(options.model, route.model)
      return stream(options)
    }
  }
  const dispose = ctx.llm.registerAdapter([route.provider], new Provider())
  t.after(dispose)
  return { calls, adapter: createDshGenerationAdapter({ llm: ctx.llm, BlockAssembler, createUserMessage, timeoutMs }) }
}

async function serviceHarness(t, native) {
  const runtime = { enabled: true, evidenceKind: 'native-model', loadClaimsV2Skill: loadClaimsSkill,
    resolveContext: () => ({ sessionId: 'session-a', route: { ...route } }), adapter: native.adapter }
  const h = await fixtureHarness({ claimsV2: true, localGeneration: runtime })
  t.after(async () => { await h.service.closeLocalGeneration(); await h.repository.close() })
  return { ...h, runtime, command: extra => h.command({ sessionId: 'session-a', ...extra }),
    async admit() {
      const preview = await h.service.prepareLocalRun(h.command({ sessionId: 'session-a' }))
      const command = h.command({ sessionId: 'session-a', confirmation: { confirmed: true, sha256: preview.sha256 } })
      await h.service.createLocalRun(command)
      return command
    },
  }
}

async function settled(h) {
  for (let i = 0; i < 200 && h.state().tasks['task-a'].runs['run-1'].status === 'prepared'; i++) await delay(2)
  const run = h.state().tasks['task-a'].runs['run-1']
  assert.notEqual(run.status, 'prepared', 'local settlement must finish within the test bound')
  return run
}

for (const mode of ['before-first-packet', 'after-partial-text', 'truncated-without-finish', 'local-text-limit']) {
  test(`native ${mode} transport uncertainty keeps the durable lock after reopen`, async t => {
    const native = await nativeHarness(t, { stream: async function* () {
      if (mode === 'local-text-limit') {
        yield text('x'.repeat(100001))
        assert.fail('Local rejection must not consume a later provider terminal')
      }
      if (mode !== 'before-first-packet') yield text('DISCONNECT_PARTIAL_CANARY')
      if (mode !== 'truncated-without-finish') throw Object.assign(new Error('PUBLIC_CONNECTION_DETAIL'), { code: 'ECONNRESET' })
    } })
    const h = await serviceHarness(t, native)
    const admitted = await h.admit()
    const run = await settled(h)
    assert.equal(run.status, 'unknown')
    assert.equal(run.result, null)
    if (mode === 'local-text-limit') {
      assert.equal(run.failureCode, 'INVALID_OUTPUT')
      assert.equal(run.executionSummary.finishKind, undefined)
    }
    assert.doesNotMatch(JSON.stringify(run), /DISCONNECT_PARTIAL_CANARY|PUBLIC_CONNECTION_DETAIL/)
    const stored = JSON.parse(JSON.stringify(h.state()))
    const repository = await openOasisWorkbenchRepository({ async open() { return {
      table: () => ({ get: id => id === 'workspace-a' ? stored : undefined,
        put: () => assert.fail('No mutation after reopened uncertainty') }), close: async () => {},
    } } })
    t.after(() => repository.close())
    const restarted = createLocalGenerationService({ repository, runtime: h.runtime,
      clock: () => new Date().toISOString(), runIdFactory: () => assert.fail('No second run') })
    t.after(() => restarted.closeLocalGeneration())
    await restarted.observeLocalRun({ workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-1' })
    await restarted.createLocalRun({ ...admitted, expectedRevision: stored.revision })
    const preview = await restarted.prepareLocalRun({ ...admitted, expectedRevision: stored.revision })
    await assert.rejects(restarted.createLocalRun({ ...admitted, expectedRevision: stored.revision,
      requestKey: 'second-after-disconnect', confirmation: { confirmed: true, sha256: preview.sha256 } }),
    { code: 'WORKSPACE_GENERATION_ACTIVE' })
    assert.deepEqual(native.calls, { prepare: 1, stream: 1 })
    assert.deepEqual(repository.get('workspace-a'), stored)
  })
}

for (const code of ['AUTH', 'QUOTA_EXCEEDED']) {
  test(`native explicit ${code} rejection stays a known failure`, async t => {
    const native = await nativeHarness(t, { stream: async function* () { throw new LlmError('PUBLIC_REJECTION', code) } })
    const result = await native.adapter.generate(request())
    assert.equal(result.status, 'failed')
    assert.equal(result.code, code === 'AUTH' ? 'MODEL_UNAVAILABLE' : 'MODEL_LIMITED')
    assert.equal(result.body, undefined)
  })
}

// These catch the ordinary-failure mapping that would incorrectly unlock an unresolved native call.
for (const stage of ['preparation', 'stream']) {
  test(`native TIMEOUT during ${stage} remains unknown with no partial body or replay`, async t => {
    const timeout = () => { throw new LlmError('PUBLIC_TIMEOUT_DETAIL', 'TIMEOUT') }
    const h = await nativeHarness(t, {
      ...(stage === 'preparation' ? { resolve: timeout } : {}),
      stream: async function* () { yield text('PARTIAL_BODY_CANARY'); timeout() },
    })
    const result = await h.adapter.generate(request())
    assert.equal(result.status, 'unknown')
    assert.equal(result.code, 'TIMED_OUT')
    assert.deepEqual(result.executionSummary, { failureStage: stage,
      ...(stage === 'stream' ? { finishKind: 'error' } : {}) })
    assert.equal(result.body, undefined)
    assert.doesNotMatch(JSON.stringify(result), /PUBLIC_TIMEOUT_DETAIL|PARTIAL_BODY_CANARY/)
    assert.deepEqual(h.calls, { prepare: 1, stream: stage === 'stream' ? 1 : 0 })
  })
}

test('native timeout persists as unresolved and blocks both replay and a fresh request', async t => {
  const native = await nativeHarness(t, { stream: async function* () {
    throw new LlmError('PUBLIC_TIMEOUT_DETAIL', 'TIMEOUT')
  } })
  const h = await serviceHarness(t, native)
  const admitted = await h.admit()
  const run = await settled(h)
  assert.equal(run.status, 'unknown')
  assert.equal(run.failureCode, 'TIMED_OUT')
  assert.equal(run.result, null)
  assert.equal(run.review.status, 'not-reviewed')
  assert.deepEqual(run.writebacks, [])
  const draft = h.draft()
  draft.tasks['task-a'].formValues.disclosure_text = '不允许覆盖未决输入'
  await assert.rejects(h.repository.replaceEditable('workspace-a', h.state().revision, draft), /locked/)
  await h.service.createLocalRun({ ...admitted, expectedRevision: h.state().revision })
  const next = await h.service.prepareLocalRun(h.command())
  await assert.rejects(h.service.createLocalRun(h.command({ requestKey: 'new-request',
    confirmation: { confirmed: true, sha256: next.sha256 } })), { code: 'WORKSPACE_GENERATION_ACTIVE' })
  await h.service.observeLocalRun(h.command({ runId: 'run-1' }))
  assert.deepEqual(native.calls, { prepare: 1, stream: 1 })
})

for (const mode of ['first-packet-stall', 'continuous-reasoning', 'partial-text-stall']) {
  test(`${mode} respects the total deadline and persists no successful artifact`, { timeout: 3000 }, async t => {
    let emitted = 0
    const native = await nativeHarness(t, { timeoutMs: 50, stream: async function* ({ signal }) {
      if (mode === 'continuous-reasoning') {
        while (!signal.aborted) {
          emitted++
          yield { type: 'reasoning-delta', index: 1, text: 'REASONING_BODY_CANARY' }
          await delay(2)
        }
        return
      }
      if (mode === 'partial-text-stall') {
        emitted++
        yield text('PARTIAL_BODY_CANARY')
        yield { type: 'usage', usage: { inputTokens: 10, outputTokens: 3 } }
      }
      await pending()
    } })
    const h = await serviceHarness(t, native)
    const start = performance.now()
    await h.admit()
    const run = await settled(h)
    assert.ok(performance.now() - start < 1500, 'reasoning activity must not extend the local deadline')
    assert.equal(run.status, 'unknown')
    assert.equal(run.failureCode, 'TIMED_OUT')
    assert.equal(run.executionSummary.failureStage, 'stream')
    assert.equal(run.executionSummary.finishKind, undefined)
    if (mode === 'partial-text-stall') assert.deepEqual(run.executionSummary.usage, { inputTokens: 10, outputTokens: 3 })
    else assert.equal(run.executionSummary.usage, undefined)
    assert.equal(run.result, null)
    assert.deepEqual(run.writebacks, [])
    assert.equal(run.review.status, 'not-reviewed')
    assert.doesNotMatch(JSON.stringify(h.state()), /PARTIAL_BODY_CANARY|REASONING_BODY_CANARY/)
    assert.equal(emitted === 0, mode === 'first-packet-stall')
    assert.deepEqual(native.calls, { prepare: 1, stream: 1 })
    t.diagnostic(JSON.stringify({ scenario: mode, status: run.status, failureCode: run.failureCode,
      summary: run.executionSummary, chunksEmitted: emitted, realCalls: 0 }))
  })
}

test('stop and duplicate stop keep the original project unknown after late success or rejection', { timeout: 3000 }, async t => {
  for (const lateKind of ['success', 'rejection']) {
    let release, reject, entered
    const started = new Promise(resolve => { entered = resolve })
    const native = await nativeHarness(t, { stream: () => ({
      [Symbol.asyncIterator]() { return this },
      next() { entered(); return new Promise((resolve, fail) => { release = resolve; reject = fail }) },
      return: pending,
    }) })
    const h = await serviceHarness(t, native)
    const projectB = structuredClone(h.state())
    projectB.workspaceId = 'workspace-b'
    h.records.set('workspace-b', projectB)
    await h.admit()
    await started
    await h.service.stopLocalRun(h.command({ runId: 'run-1' }))
    assert.equal(h.state().tasks['task-a'].runs['run-1'].failureCode, 'ABORTED')
    await h.service.closeLocalGeneration()
    const stopped = structuredClone(h.state())
    await h.service.stopLocalRun(h.command({ runId: 'run-1' }))
    if (lateKind === 'success') release({ done: false, value: text('LATE_BODY_CANARY') })
    else reject(new LlmError('LATE_ERROR_CANARY', 'TIMEOUT'))
    await tick(); await tick()
    assert.deepEqual(h.state(), stopped)
    assert.deepEqual(h.repository.get('workspace-b'), projectB)
    assert.equal(stopped.tasks['task-a'].runs['run-1'].status, 'unknown')
    assert.equal(stopped.tasks['task-a'].runs['run-1'].result, null)
    assert.deepEqual(native.calls, { prepare: 1, stream: 1 })
  }
})

test('deadline ignores a non-cooperative late response and closes waiting without replay', { timeout: 3000 }, async t => {
  let release
  const native = await nativeHarness(t, { timeoutMs: 30, stream: () => ({
    [Symbol.asyncIterator]() { return this },
    next: () => new Promise(resolve => { release = resolve }),
    return: pending,
  }) })
  const h = await serviceHarness(t, native)
  await h.admit()
  await settled(h)
  const before = structuredClone(h.state())
  release({ done: false, value: text('LATE_BODY_CANARY') })
  await tick(); await tick()
  await h.service.closeLocalGeneration()
  assert.deepEqual(h.state(), before)
  assert.equal(before.tasks['task-a'].runs['run-1'].failureCode, 'TIMED_OUT')
  assert.deepEqual(native.calls, { prepare: 1, stream: 1 })
})

test('serialized timeout reopens with the same summary, input hash and unresolved lock', async t => {
  const native = await nativeHarness(t, { stream: async function* () {
    throw new LlmError('PUBLIC_TIMEOUT_DETAIL', 'TIMEOUT')
  } })
  const h = await serviceHarness(t, native)
  const admitted = await h.admit()
  await settled(h)
  await h.service.closeLocalGeneration()
  const before = structuredClone(h.state())
  const root = await mkdtemp(join(tmpdir(), 'oasis-stage1-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const file = join(root, 'workspaces.json')
  await writeFile(file, JSON.stringify(before), { flag: 'wx' })
  // Only the Domain backend is a substitute; parsing, repository and generation service are real.
  const stored = JSON.parse(await readFile(file, 'utf8'))
  const repository = await openOasisWorkbenchRepository({ async open() { return {
    table: () => ({ get: id => id === 'workspace-a' ? stored : undefined,
      put: () => assert.fail('Observation/replay must not mutate a settled unknown run') }),
    close: async () => {},
  } } })
  t.after(() => repository.close())
  const restarted = createLocalGenerationService({ repository, runtime: h.runtime,
    clock: () => new Date().toISOString(), runIdFactory: () => assert.fail('No new run') })
  t.after(() => restarted.closeLocalGeneration())
  assert.deepEqual(repository.get('workspace-a'), before)
  await restarted.observeLocalRun({ workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-1' })
  await restarted.createLocalRun({ ...admitted, expectedRevision: before.revision })
  const command = { ...admitted, expectedRevision: before.revision, requestKey: 'new-after-reopen' }
  const preview = await restarted.prepareLocalRun(command)
  await assert.rejects(restarted.createLocalRun({ ...command,
    confirmation: { confirmed: true, sha256: preview.sha256 } }), { code: 'WORKSPACE_GENERATION_ACTIVE' })
  assert.deepEqual(repository.get('workspace-a'), before)
  assert.deepEqual(native.calls, { prepare: 1, stream: 1 })
})
