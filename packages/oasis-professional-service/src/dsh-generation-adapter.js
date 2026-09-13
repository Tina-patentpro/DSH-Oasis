import { validateWorkflowForm } from './workflow-catalog.js'
import { claimsUpstreamSnapshotSchema } from './generation-contract.js'
import { normalizeLocalExecutionSummary } from './local-run-summary.js'

const MAX_TEXT = 100000
const MAX_BLOCKS = 1024
const MESSAGES = Object.freeze({
  INVALID_INPUT: '输入或模型配置不完整，请检查后重试。',
  MODEL_UNAVAILABLE: '模型不可用，请检查 DSH 模型与凭据设置。',
  MODEL_LIMITED: '模型额度或请求限制，请检查 DSH 设置及提供方状态。',
  INVALID_OUTPUT: '未取得完整有效的文字结果，不会保存为成功产物。',
  GENERATION_FAILED: '生成失败，请查看本次运行状态；不会自动重试。',
  ABORTED: '已停止本地等待，不代表提供方已取消或退款。',
  TIMED_OUT: '本地等待超时，提供方状态未确认；不会自动重试。',
})
function failure(code, started = false) {
  return { status: started && ['ABORTED', 'TIMED_OUT'].includes(code) ? 'unknown' : 'failed', code, message: MESSAGES[code] }
}
class AdapterFailure extends Error {
  constructor(code) { super(code); this.code = code }
}
function invalid(code) { throw new AdapterFailure(code) }
function providerCode(error) {
  try {
    const code = error?.code
    if (['NO_ADAPTER', 'MISSING_CREDENTIAL', 'INVALID_CREDENTIAL', 'AUTH'].includes(code)) return 'MODEL_UNAVAILABLE'
    if (['RATE_LIMIT', 'QUOTA_EXCEEDED', 'CONTEXT_WINDOW_EXCEEDED'].includes(code)) return 'MODEL_LIMITED'
    if (code === 'ABORTED') return 'ABORTED'
  } catch { /* Never expose an untrusted error getter. */ }
  return 'GENERATION_FAILED'
}
function record(value, keys) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) invalid('INVALID_INPUT')
  for (const key of Reflect.ownKeys(value)) {
    if (!keys.includes(key) || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value')) invalid('INVALID_INPUT')
  }
}
function nonempty(value, max) { return typeof value === 'string' && value.trim().length > 0 && value.length <= max }
function routeSnapshot(route) {
  record(route, ['provider', 'model', 'reasoningEffort', 'maxTokens'])
  if (!nonempty(route.provider, 256) || !nonempty(route.model, 256)
    || (route.reasoningEffort !== undefined && !nonempty(route.reasoningEffort, 64))
    || (route.maxTokens !== undefined && (!Number.isSafeInteger(route.maxTokens) || route.maxTokens <= 0))) invalid('INVALID_INPUT')
  return Object.freeze({ provider: route.provider, model: route.model,
    ...(route.reasoningEffort === undefined ? {} : { reasoningEffort: route.reasoningEffort }),
    ...(route.maxTokens === undefined ? {} : { maxTokens: route.maxTokens }) })
}
function snapshot(input) {
  record(input, ['runId', 'sessionId', 'formValues', 'instruction', 'route', 'signal', 'workflowVersion', 'upstreamSnapshot'])
  record(input.instruction, ['version', 'body'])
  if (!nonempty(input.runId, 256) || !nonempty(input.sessionId, 256)
    || !nonempty(input.instruction.version, 256) || !nonempty(input.instruction.body, 64000)
    || !(input.signal instanceof AbortSignal)) invalid('INVALID_INPUT')
  const version = input.workflowVersion ?? '1'
  const fields = validateWorkflowForm('patent-claims', version, input.formValues)
  if (version !== '2' && input.upstreamSnapshot !== undefined) invalid('INVALID_INPUT')
  const payload = version === '2' ? { upstream_snapshot: claimsUpstreamSnapshotSchema.parse(input.upstreamSnapshot), ...fields } : fields
  return Object.freeze({ sessionId: input.sessionId, system: input.instruction.body,
    text: JSON.stringify(payload),
    route: routeSnapshot(input.route), signal: input.signal })
}
function freezeTree(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeTree(child)
    Object.freeze(value)
  }
  return value
}

// Guard the native assembler's tolerant defaults; never buffer reasoning or replay data.
function textConsumer(BlockAssembler, summary) {
  const assembler = new BlockAssembler()
  const blocks = new Map()
  let size = 0
  let finished = false
  return {
    push(chunk) {
      if (finished || !chunk || typeof chunk !== 'object') invalid('INVALID_OUTPUT')
      if (chunk.type === 'finish') {
        finished = true
        const kind = chunk.reason?.kind
        Object.assign(summary, normalizeLocalExecutionSummary({ finishKind: kind }))
        if (kind === 'error') invalid(providerCode(chunk.reason.failure))
        if (kind === 'aborted') invalid('ABORTED')
        if (kind !== 'stop') invalid('INVALID_OUTPUT')
        assembler.push({ type: 'finish', reason: { kind: 'stop' } })
        return
      }
      if (chunk.type === 'usage') {
        const safe = normalizeLocalExecutionSummary({ usage: Object.getOwnPropertyDescriptor(chunk, 'usage')?.value })
        // The last usage event is a snapshot, not a delta; never sum repeated events.
        delete summary.usage
        Object.assign(summary, safe)
        return
      }
      const type = chunk.type
      if (!['block-start', 'block-end', 'text-delta', 'reasoning-delta'].includes(type)) invalid('INVALID_OUTPUT')
      const index = chunk.index
      if (!Number.isSafeInteger(index) || index < 0) invalid('INVALID_OUTPUT')
      const kind = type === 'block-start' ? chunk.blockType : type === 'block-end' ? chunk.block?.type
        : type === 'text-delta' ? 'text' : 'reasoning'
      if (!['text', 'reasoning'].includes(kind)) invalid('INVALID_OUTPUT')
      let block = blocks.get(index)
      if (block && (block.kind !== kind || block.closed || type === 'block-start')) invalid('INVALID_OUTPUT')
      if (!block) {
        if (blocks.size >= MAX_BLOCKS) invalid('INVALID_OUTPUT')
        block = { kind, chars: 0, closed: false }; blocks.set(index, block)
      }
      if (type === 'block-end') block.closed = true
      if (kind === 'reasoning') return
      if (type === 'block-start') {
        assembler.push({ type, index, blockType: 'text' }); return
      }
      const text = type === 'block-end' ? chunk.block.text : chunk.text
      if (typeof text !== 'string') invalid('INVALID_OUTPUT')
      const nextSize = type === 'block-end' ? size - block.chars + text.length : size + text.length
      if (nextSize > MAX_TEXT) invalid('INVALID_OUTPUT')
      block.chars = type === 'block-end' ? text.length : block.chars + text.length
      size = nextSize
      assembler.push(type === 'block-end' ? { type, index, block: { type: 'text', text } } : { type, index, text })
    },
    result() {
      if (!finished) invalid('INVALID_OUTPUT')
      const output = assembler.blocks()
      if (output.some(b => b.type !== 'text' || typeof b.text !== 'string')) invalid('INVALID_OUTPUT')
      const body = output.map(b => b.text).join('')
      if (!body.trim() || body.length > MAX_TEXT) invalid('INVALID_OUTPUT')
      return body
    },
  }
}

// Internal Host seam only. The caller owns authorization, durable admission and Workspace identity.
export function createDshGenerationAdapter({ llm, BlockAssembler, createUserMessage, timeoutMs = 120000 }) {
  return { async generate(input) {
    let request
    try {
      if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647) invalid('INVALID_INPUT')
      request = snapshot(input)
    } catch { return failure('INVALID_INPUT') }
    if (request.signal.aborted) return failure('ABORTED')
    let started = false
    let iterator
    let exhausted = false
    let stopped
    let rejectStop
    const summary = {}
    let failureStage = 'preparation'
    const controller = new AbortController()
    const stopPromise = new Promise((_, reject) => { rejectStop = reject })
    stopPromise.catch(() => {})
    const stop = code => {
      if (stopped) return
      stopped = code
      controller.abort()
      rejectStop(new AdapterFailure(code))
    }
    const onAbort = () => stop('ABORTED')
    request.signal.addEventListener('abort', onAbort, { once: true })
    const deadline = performance.now() + timeoutMs
    const timer = setTimeout(() => stop('TIMED_OUT'), timeoutMs)
    const check = () => {
      if (request.signal.aborted) stop('ABORTED')
      if (performance.now() >= deadline) stop('TIMED_OUT')
      if (stopped) invalid(stopped)
    }
    const wait = action => Promise.race([stopPromise, Promise.resolve().then(() => { check(); return action() })])
    try {
      const consumer = textConsumer(BlockAssembler, summary)
      const message = freezeTree(createUserMessage({ content: [{ type: 'text', text: request.text }] }))
      const prepared = await wait(() => {
        started = true
        return llm.prepareCall(request.route, controller.signal)
      })
      check()
      const config = routeSnapshot(prepared.config)
      if (config.provider !== request.route.provider || config.model !== request.route.model) invalid('GENERATION_FAILED')
      const options = Object.freeze({ ...config, system: request.system, sessionId: request.sessionId,
        messages: Object.freeze([message]), signal: controller.signal })
      iterator = prepared.stream(options)[Symbol.asyncIterator]()
      failureStage = 'stream'
      while (true) {
        const item = await wait(() => iterator.next())
        check()
        if (item.done === true) { exhausted = true; break }
        if (item.done !== false && item.done !== undefined) invalid('INVALID_OUTPUT')
        consumer.push(item.value)
      }
      const body = consumer.result()
      check()
      return { status: 'completed', body, model: { provider: config.provider, model: config.model },
        executionSummary: normalizeLocalExecutionSummary(summary) }
    } catch (error) {
      let code = stopped ?? 'GENERATION_FAILED'
      try {
        code = stopped ?? (error instanceof AdapterFailure ? error.code : providerCode(error))
      } catch { /* Error prototype access must not escape the safe result boundary either. */ }
      return { ...failure(code, started), executionSummary: normalizeLocalExecutionSummary({ ...summary, failureStage }) }
    } finally {
      clearTimeout(timer)
      request.signal.removeEventListener('abort', onAbort)
      if (!exhausted) {
        controller.abort()
        // A non-cooperative provider cannot hold local settlement or emit an unhandled rejection.
        if (iterator) void Promise.resolve().then(() => iterator.return?.()).catch(() => {})
      }
    }
  } }
}
