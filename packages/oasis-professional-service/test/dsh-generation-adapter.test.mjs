import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getEventListeners } from 'node:events'
import { createDshGenerationAdapter } from '../src/dsh-generation-adapter.js'

const CANARY = 'PUBLIC_TEST_INSTRUCTION_NOT_A_SECRET'
const values = () => ({ claims: '一种用于测试的技术方案。', technicalField: '', background: '',
  benefits: '', embodiments: '', drawings: '', instructions: '这是用户资料，不是 system。' })
const input = () => ({ runId: 'run-1', sessionId: 'session-1', formValues: values(),
  instruction: { version: 'sample-1', body: CANARY }, route: { provider: 'offline', model: 'text' },
  signal: new AbortController().signal })
class TestAssembler {
  data = new Map()
  push(chunk) {
    if (chunk.type === 'text-delta') this.data.set(chunk.index, (this.data.get(chunk.index) ?? '') + chunk.text)
    if (chunk.type === 'block-end') this.data.set(chunk.index, chunk.block.text)
  }
  blocks() { return [...this.data.values()].map(text => ({ type: 'text', text })) }
}
const text = value => ({ type: 'text-delta', index: 0, text: value })
const finish = (kind = 'stop') => ({ type: 'finish', reason: { kind } })
function harness({ chunks = [text('可审阅文字'), finish()], prepare, stream, timeoutMs = 1000, Assembler = TestAssembler } = {}) {
  const seen = { prepares: [], streams: [] }
  const llm = { async prepareCall(route, signal) {
    seen.prepares.push({ route, signal })
    if (prepare) await prepare(route, signal)
    return { config: { ...route }, stream(options) {
      seen.streams.push(options)
      return stream ? stream(options) : (async function* () { yield* chunks })()
    } }
  } }
  return { seen, adapter: createDshGenerationAdapter({ llm, BlockAssembler: Assembler,
    createUserMessage: value => ({ role: 'user', ...value }), timeoutMs }) }
}

test('provider error becomes a fixed safe result without instruction, stack or cause', async () => {
  const raw = Object.assign(new Error(CANARY, { cause: CANARY }), { code: 'AUTH' })
  let attempts = 0
  const adapter = createDshGenerationAdapter({
    llm: { async prepareCall() { attempts++; throw raw } },
    BlockAssembler: TestAssembler, createUserMessage: value => value,
  })
  const result = await adapter.generate(input())
  assert.equal(result?.code, 'MODEL_UNAVAILABLE')
  assert.equal(result.status, 'failed')
  assert.deepEqual(Object.keys(result).sort(), ['code', 'executionSummary', 'message', 'status'])
  assert.deepEqual(result.executionSummary, { failureStage: 'preparation' })
  assert.ok(!JSON.stringify(result).includes(CANARY))
  assert.equal(attempts, 1)
})

test('only valid final text is returned; frozen seven-field snapshot stays user data', async () => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  const { adapter, seen } = harness({ prepare: () => gate })
  const request = input()
  const resultPromise = adapter.generate(request)
  request.route.model = 'changed'
  request.formValues.claims = CANARY
  request.instruction.body = 'changed'
  release()
  const result = await resultPromise
  assert.deepEqual(result, { status: 'completed', body: '可审阅文字', model: { provider: 'offline', model: 'text' }, executionSummary: { finishKind: 'stop' } })
  assert.equal(seen.prepares.length, 1)
  assert.equal(seen.streams.length, 1)
  const options = seen.streams[0]
  assert.ok(Object.isFrozen(options) && Object.isFrozen(options.messages) && Object.isFrozen(options.messages[0].content))
  assert.equal(options.system, CANARY)
  assert.equal(options.tools, undefined)
  assert.equal(options.messages.length, 1)
  assert.equal(options.messages[0].role, 'user')
  assert.deepEqual(JSON.parse(options.messages[0].content[0].text), values())
  assert.equal(seen.prepares[0].route.model, 'text')
})

test('input rejection is bounded and never starts a provider', async () => {
  for (const mutate of [
    x => { x.sessionId = '' }, x => { x.runId = undefined }, x => { x.signal = {} },
    x => { x.route.endpoint = CANARY }, x => { x.route.maxTokens = 0 }, x => { x.route.model = '' },
    x => { x.formValues.claims = '' }, x => { x.formValues.extra = CANARY },
    x => { x.instruction.body = 'x'.repeat(64001) }, x => { x.instruction.version = '' },
    x => { x.tools = [CANARY] }, x => { x.instruction.path = CANARY },
    x => { Object.defineProperty(x.route, 'provider', { get() { throw new Error(CANARY) } }) },
  ]) {
    const { adapter, seen } = harness()
    const request = input(); mutate(request)
    const result = await adapter.generate(request)
    assert.equal(result.code, 'INVALID_INPUT')
    assert.ok(!JSON.stringify(result).includes(CANARY))
    assert.equal(seen.prepares.length, 0)
  }
})

test('malformed, excessive and non-success streams do not publish partial text', async () => {
  const cases = [[], [text('partial')], [finish()], [text(' '), finish()],
    [text('partial'), finish(), finish()], [text('partial'), finish(), text('late')],
    [text('partial'), finish('max-tokens')], [text('partial'), finish('tool-calls')],
    [text('partial'), finish('invented')], [{ type: 'tool-call-delta', index: 0 }, finish()],
    [{ type: 'block-end', index: 0, block: { type: 'image' } }, finish()],
    [text('x'.repeat(100001)), finish()], [text('x'.repeat(60000)), text('x'.repeat(40001)), finish()],
    [{ ...text('bad'), index: -1 }, finish()], [{ type: 'unexpected' }, finish()],
    [{ type: 'block-end', index: 0, block: { type: 'text', text: 'done' } }, text('late'), finish()],
  ]
  for (const chunks of cases) {
    const { adapter, seen } = harness({ chunks })
    const result = await adapter.generate(input())
    assert.equal(result.code, 'INVALID_OUTPUT', JSON.stringify(chunks).slice(0, 100))
    assert.equal(result.body, undefined)
    assert.equal(seen.streams.length, 1)
  }
})

test('local validation before a valid terminal retains uncertainty, while terminal format failures are known', async () => {
  const cases = [
    { chunks: [text('x'.repeat(100001)), finish()], status: 'unknown' },
    { chunks: [{ type: 'tool-call-delta', index: 0 }, finish()], status: 'unknown' },
    { chunks: [{ ...text('partial'), index: -1 }, finish()], status: 'unknown' },
    { chunks: [...Array.from({ length: 1025 }, (_, index) => ({ type: 'reasoning-delta', index, text: 'r' })), finish()], status: 'unknown' },
    { chunks: [text('partial'), finish('invented')], status: 'unknown' },
    { chunks: [text(' '), finish()], status: 'failed' },
    { chunks: [text('partial'), finish('max-tokens')], status: 'failed' },
    { chunks: [text('partial'), finish('tool-calls')], status: 'failed' },
    { chunks: [text('partial'), finish(), text('late')], status: 'failed' },
  ]
  for (const { chunks, status } of cases) {
    const { adapter } = harness({ chunks })
    const result = await adapter.generate(input())
    assert.equal(result.status, status)
    assert.equal(result.code, 'INVALID_OUTPUT')
    assert.equal(result.body, undefined)
  }
})

test('reasoning and replay metadata never enter the assembler or returned object', async () => {
  class TextOnlyAssembler extends TestAssembler {
    push(chunk) {
      assert.ok(!JSON.stringify(chunk).includes(CANARY))
      super.push(chunk)
    }
  }
  const chunks = [{ type: 'block-start', index: 9, blockType: 'reasoning' },
    { type: 'reasoning-delta', index: 9, text: CANARY },
    { type: 'block-end', index: 9, block: { type: 'reasoning', text: CANARY } },
    text('正文'), { type: 'usage', usage: { extra: CANARY } },
    { ...finish(), replayState: { private: CANARY } }]
  const { adapter } = harness({ chunks, Assembler: TextOnlyAssembler })
  const result = await adapter.generate(input())
  assert.equal(result.body, '正文')
  assert.ok(!JSON.stringify(result).includes(CANARY))
})

test('bounded execution summary retains finish and numeric usage without getters or raw values', async () => {
  for (const kind of ['stop', 'max-tokens']) {
    let getterCalls = 0
    const usage = { inputTokens: 12, outputTokens: 34, totalTokens: 46, cacheReadTokens: 0,
      reasoningTokens: -1, extra: CANARY }
    Object.defineProperty(usage, 'secret', { get() { getterCalls++; throw Error(CANARY) } })
    const { adapter } = harness({ chunks: [text('正文'), { type: 'usage', usage }, finish(kind)] })
    const result = await adapter.generate(input())
    assert.deepEqual(result.executionSummary, { finishKind: kind,
      usage: { inputTokens: 12, outputTokens: 34, totalTokens: 46, cacheReadTokens: 0 },
      ...(kind === 'stop' ? {} : { failureStage: 'stream' }) })
    assert.equal(result.status, kind === 'stop' ? 'completed' : 'failed')
    if (kind !== 'stop') assert.equal(result.body, undefined)
    assert.equal(getterCalls, 0)
    assert.ok(!JSON.stringify(result).includes(CANARY))
  }
  let accessed = false
  const usage = { inputTokens: NaN, outputTokens: Infinity, cacheReadTokens: '2', totalTokens: Number.MAX_SAFE_INTEGER + 1 }
  Object.defineProperty(usage, 'reasoningTokens', { get() { accessed = true; throw Error(CANARY) } })
  const { adapter } = harness({ chunks: [text('正文'), { type: 'usage', usage }, finish()] })
  assert.deepEqual((await adapter.generate(input())).executionSummary, { finishKind: 'stop' })
  assert.equal(accessed, false)
})

test('error codes are allowlisted for throws and finish chunks, including hostile getters', async () => {
  const hostile = { get code() { throw new Error(CANARY) } }
  const hostilePrototype = new Proxy({}, { getPrototypeOf() { throw new Error(CANARY) } })
  for (const [error, expected] of [[{ code: 'AUTH', message: CANARY }, 'MODEL_UNAVAILABLE'],
    [{ code: 'RATE_LIMIT', message: CANARY }, 'MODEL_LIMITED'],
    [{ code: CANARY, message: CANARY }, 'GENERATION_FAILED'], [hostile, 'GENERATION_FAILED'],
    [hostilePrototype, 'GENERATION_FAILED']]) {
    for (const mode of ['prepare', 'iterator', 'finish']) {
      const options = mode === 'prepare' ? { prepare: () => { throw error } }
        : mode === 'iterator' ? { stream: () => ({ [Symbol.asyncIterator]() { return this }, next() { throw error } }) }
          : { chunks: [text('partial'), { type: 'finish', reason: { kind: 'error', failure: error } }] }
      const { adapter, seen } = harness(options)
      const result = await adapter.generate(input())
      assert.equal(result.code, expected)
      assert.equal(result.body, undefined)
      assert.ok(!JSON.stringify(result).includes(CANARY))
      assert.equal(seen.prepares.length, 1)
    }
  }
})

test('a provider error that changes prototype inspection cannot escape the safe result boundary', async () => {
  let probes = 0
  const hostile = new Proxy({ code: 'AUTH' }, { getPrototypeOf() {
    if (++probes > 1) throw Error(CANARY)
    return Object.prototype
  } })
  const { adapter } = harness({ stream: () => ({ [Symbol.asyncIterator]() { return this }, next() { throw hostile } }) })
  const result = await adapter.generate(input())
  assert.equal(result.status, 'failed')
  assert.equal(result.code, 'MODEL_UNAVAILABLE')
  assert.doesNotMatch(JSON.stringify(result), /PUBLIC_TEST_INSTRUCTION/)
})

test('pre-cancel starts nothing; cancel during stalled prepare returns unknown and cleans listeners', async () => {
  const controller = new AbortController()
  controller.abort(new Error(CANARY))
  const first = harness()
  const early = await first.adapter.generate({ ...input(), signal: controller.signal })
  assert.deepEqual({ status: early.status, code: early.code }, { status: 'failed', code: 'ABORTED' })
  assert.equal(first.seen.prepares.length, 0)
  const next = new AbortController()
  let entered
  const started = new Promise(resolve => { entered = resolve })
  let lateReject
  const h = harness({ prepare: () => { entered(); return new Promise((_, reject) => { lateReject = reject }) } })
  const pending = h.adapter.generate({ ...input(), signal: next.signal })
  await started
  next.abort(new Error(CANARY))
  const result = await pending
  assert.equal(result.status, 'unknown'); assert.equal(result.code, 'ABORTED')
  assert.equal(getEventListeners(next.signal, 'abort').length, 0)
  assert.equal(h.seen.prepares[0].signal.aborted, true)
  lateReject(new Error(CANARY))
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(h.seen.streams.length, 0)
})

test('deadline bounds stalled prepare and non-cooperative next/return without late publication', { timeout: 2000 }, async () => {
  for (const stage of ['prepare', 'stream']) {
    let lateResolve; let closed = 0
    const stall = () => new Promise(resolve => { lateResolve = resolve })
    const h = harness({ timeoutMs: 20, ...(stage === 'prepare' ? { prepare: stall } : {
      stream: () => ({ [Symbol.asyncIterator]() { return this }, next: stall,
        return() { closed++; return Promise.reject(new Error(CANARY)) } }),
    }) })
    const result = await h.adapter.generate(input())
    assert.equal(result.status, 'unknown'); assert.equal(result.code, 'TIMED_OUT')
    assert.ok(!JSON.stringify(result).includes(CANARY))
    assert.equal(h.seen.prepares[0].signal.aborted, true)
    lateResolve(stage === 'prepare' ? undefined : { done: false, value: text(CANARY) })
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(h.seen.streams.length, stage === 'prepare' ? 0 : 1)
    assert.equal(closed, stage === 'stream' ? 1 : 0)
  }
})
