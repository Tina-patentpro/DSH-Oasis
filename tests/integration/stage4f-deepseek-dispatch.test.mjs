import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { createDshGenerationAdapter } from '../../packages/oasis-professional-service/src/dsh-generation-adapter.js'
import { loadClaimsSkill } from '../../packages/oasis-professional-service/src/claims-skill-pin.js'
import { publicClaimsV2Output } from '../../packages/oasis-professional-service/src/claims-v2-result.js'
import { fixtureHarness } from '../../packages/oasis-professional-service/test/unified-generation-harness.mjs'

const packages = new URL('../../.dsh-test/stage3-desktop-app/resources/app.asar.unpacked/node_modules/@deepseek-ai/', import.meta.url)
const { Context } = await import(new URL('cordis/lib/index.js', packages))
const native = await import(new URL('dsh-llm/lib/index.js', packages))
const deepseek = await import(new URL('dsh-llm-deepseek/lib/index.js', packages))
const checkpoint = await import(new URL('dsh-session-checkpoint-policy/lib/index.js', packages))
const { DeepSeekLlmApiExtensionRegistry } = await import(new URL('dsh-deepseek-llm-api-extensions/lib/index.js', packages))
const fields = JSON.parse(await readFile(new URL('../../docs/fixtures/stage4f1-claims-synthetic-input.json', import.meta.url), 'utf8'))

// Fixed native code; all transport and credential access are explicit in-memory substitutes.
// No live Profile, file service, real credential, or original fetch is used.
test('fixed native DeepSeek path: prepare, checkpoint, credential, extension, HTTP and SSE', { timeout: 10000 }, async t => {
  for (const name of ['dsh-llm', 'dsh-llm-deepseek']) {
    assert.equal(JSON.parse(await readFile(new URL(`${name}/package.json`, packages), 'utf8')).version, '0.1.2-rc.1')
  }
  for (const mode of ['success', 'checkpoint-stall', 'credential-stall', 'extension-stall', 'transport-stall']) {
    await t.test(mode, async t => {
      const ctx = new Context()
      t.after(() => ctx.fiber.dispose())
      await ctx.plugin(native.LlmRuntime).await()
      await ctx.plugin(DeepSeekLlmApiExtensionRegistry).await()
      const events = []
      const pending = []
      const stall = () => new Promise((_, reject) => pending.push(reject))
      const session = { id: 'offline-dispatch-session' }
      ctx.provide('sessions', { get: () => session, flush: async () => {
        events.push('checkpoint'); if (mode === 'checkpoint-stall') await stall()
      } })
      // Only the native model-stream middleware is relevant; no tool/agent is executed.
      checkpoint.apply(ctx)
      ctx.deepseekLlmApiExtensions.register('offline_probe', { prepare: async () => {
        events.push('extension'); if (mode === 'extension-stall') await stall()
        return { value: { synthetic: true } }
      } })
      const connection = deepseek.resolveAdapterOptions({ baseURL: 'https://offline.invalid', maxTokens: 16384, retryPolicy: { mode: 'normal', maxRetries: 0 } })
      const provider = new deepseek.DeepSeekAdapter({
        options: () => connection,
        resolveApiKey: async () => { events.push('credential'); if (mode === 'credential-stall') await stall(); return 'PUBLIC_OFFLINE_PLACEHOLDER' },
        resolveUserId: () => 'offline-test',
        resolveFiles: () => Object.freeze({}),
        prepareExtensions: request => ctx.deepseekLlmApiExtensions.prepare(request),
      })
      ctx.llm.registerAdapter(['deepseek-official'], provider)
      const bundle = await loadClaimsSkill()
      const originalFetch = globalThis.fetch
      let fetches = 0
      globalThis.fetch = async (url, options) => {
        fetches++; events.push('http-substitute')
        assert.equal(url, 'https://offline.invalid/chat/completions')
        assert.equal(options.method, 'POST')
        const payload = JSON.parse(options.body)
        assert.equal(payload.model, 'deepseek-v4-flash')
        assert.equal(payload.max_tokens, 16384)
        assert.equal(payload.stream, true)
        assert.equal(payload.tools, undefined)
        assert.equal(payload.messages.length, 2)
        assert.equal(payload.messages[0].content, bundle.instruction.body)
        const { upstream_snapshot, ...actualFields } = JSON.parse(payload.messages[1].content)
        assert.equal(upstream_snapshot.status, 'missing')
        assert.deepEqual(actualFields, fields)
        if (mode === 'transport-stall') return stall()
        return new Response('data: '+JSON.stringify({ id:'offline', choices:[{ index:0, delta:{content:'离线传输替身正文'}, finish_reason:null }] })+'\n\n'
          +'data: '+JSON.stringify({ id:'offline', choices:[{ index:0, delta:{}, finish_reason:'stop' }] })+'\n\n'
          +'data: [DONE]\n\n', {headers:{'content-type':'text/event-stream'}})
      }
      t.after(() => { globalThis.fetch = originalFetch })
      const adapter = createDshGenerationAdapter({llm:ctx.llm, BlockAssembler:native.BlockAssembler, createUserMessage:native.createUserMessage, timeoutMs:mode==='success'?3000:150})
      const result = await adapter.generate({runId:'offline', sessionId:session.id, workflowVersion:'2', formValues:fields,
        upstreamSnapshot:{status:'missing',reason:'not-connected'}, instruction:bundle.instruction,
        route:{provider:'deepseek-official',model:'deepseek-v4-flash',reasoningEffort:'high'},signal:new AbortController().signal})
      // Release deliberately stalled substitutes so native iterator teardown can finish.
      for (const reject of pending) reject(Object.assign(new Error('OFFLINE_ABORT'), {code:'ABORTED'}))
      await new Promise(resolve => setTimeout(resolve, 20))
      if(mode==='success') {
        assert.equal(result.status,'completed'); assert.equal(result.body,'离线传输替身正文')
        assert.deepEqual(events,['checkpoint','credential','extension','http-substitute'])
        assert.equal(fetches,1)
      } else {
        assert.equal(result.status,'unknown'); assert.equal(result.code,'TIMED_OUT'); assert.equal(result.body,undefined)
        assert.equal(fetches,mode==='transport-stall'?1:0)
      }
      t.diagnostic(JSON.stringify({mode,events,fetches,realNetworkCalls:0,result:result.status}))
    })
  }
})

test('fixed native reasoning/text/usage reaches the unified result boundary', { timeout: 10000 }, async t => {
  // Identical valid JSON in both cases isolates the terminal reason from schema parsing.
  // This is synthetic transport evidence, not a recovered response or model quality test.
  const body = JSON.stringify(publicClaimsV2Output(fields))
  const reasoningCanary = 'OFFLINE_REASONING_NOT_AN_ARTIFACT'
  for (const finishReason of ['stop', 'length']) {
    await t.test(finishReason, async t => {
      const ctx = new Context()
      t.after(() => ctx.fiber.dispose())
      await ctx.plugin(native.LlmRuntime).await()
      await ctx.plugin(DeepSeekLlmApiExtensionRegistry).await()
      const sessionId = 'offline-dispatch-session'
      ctx.provide('sessions', { get: () => ({ id: sessionId }), flush: async () => {} })
      checkpoint.apply(ctx)
      const connection = deepseek.resolveAdapterOptions({ baseURL: 'https://offline.invalid', maxTokens: 16384,
        retryPolicy: { mode: 'normal', maxRetries: 0 } })
      ctx.llm.registerAdapter(['deepseek-official'], new deepseek.DeepSeekAdapter({
        options: () => connection, resolveApiKey: async () => 'PUBLIC_OFFLINE_PLACEHOLDER',
        resolveUserId: () => 'offline-test', resolveFiles: () => Object.freeze({}),
        prepareExtensions: request => ctx.deepseekLlmApiExtensions.prepare(request),
      }))
      let fetches = 0
      const originalFetch = globalThis.fetch
      t.after(() => { globalThis.fetch = originalFetch })
      globalThis.fetch = async (url, options) => {
        fetches++
        assert.equal(url, 'https://offline.invalid/chat/completions')
        assert.equal(options.method, 'POST')
        const payload = JSON.parse(options.body)
        assert.equal(payload.model, 'deepseek-v4-flash')
        assert.equal(payload.max_tokens, 16384)
        assert.equal(payload.stream, true)
        assert.equal(payload.tools, undefined)
        const { upstream_snapshot, ...actualFields } = JSON.parse(payload.messages[1].content)
        assert.equal(upstream_snapshot.status, 'missing')
        assert.deepEqual(actualFields, fields)
        const choice = (delta, reason = null) => ({ id: 'offline', choices: [{ index: 0, delta, finish_reason: reason }] })
        const chunks = [choice({ reasoning_content: reasoningCanary }),
          choice({ content: body.slice(0, 127) }), choice({ content: body.slice(127) }),
          { ...choice({}, finishReason), usage: { prompt_tokens: 1000, completion_tokens: 2000, total_tokens: 3000,
            prompt_cache_hit_tokens: 200, completion_tokens_details: { reasoning_tokens: 1500 } } }]
        return new Response(chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join('') + 'data: [DONE]\n\n',
          { headers: { 'content-type': 'text/event-stream' } })
      }
      // Inspect only synthetic native metadata here; no production instrumentation is installed.
      const observed = []
      const llm = { async prepareCall(...args) {
        const prepared = await ctx.llm.prepareCall(...args)
        return { config: prepared.config, async *stream(options) {
          for await (const chunk of prepared.stream(options)) {
            observed.push({ type: chunk.type, index: chunk.index, blockType: chunk.blockType,
              ...(chunk.type === 'usage' ? { usage: chunk.usage } : {}),
              ...(chunk.type === 'finish' ? { reason: chunk.reason.kind } : {}) })
            yield chunk
          }
        } }
      } }
      const adapter = createDshGenerationAdapter({ llm, BlockAssembler: native.BlockAssembler,
        createUserMessage: native.createUserMessage, timeoutMs: 3000 })
      const route = { provider: 'deepseek-official', model: 'deepseek-v4-flash', reasoningEffort: 'high' }
      const h = await fixtureHarness({ claimsV2: true, localGeneration: { enabled: true, evidenceKind: 'native-model',
        loadClaimsV2Skill: loadClaimsSkill, resolveContext: () => ({ sessionId, route: { ...route } }), adapter } })
      t.after(async () => { await h.service.closeLocalGeneration(); await h.repository.close() })
      const draft = h.draft()
      draft.tasks['task-a'].formValues = structuredClone(fields)
      await h.repository.replaceEditable('workspace-a', h.state().revision, draft)
      const preview = await h.service.prepareLocalRun(h.command({ sessionId }))
      assert.equal(fetches, 0)
      await h.service.createLocalRun(h.command({ sessionId, confirmation: { sha256: preview.sha256, confirmed: true } }))
      for (let i = 0; i < 200 && h.state().tasks['task-a'].runs['run-1'].status === 'prepared'; i++) {
        await new Promise(resolve => setTimeout(resolve, 5))
      }
      const run = h.state().tasks['task-a'].runs['run-1']
      assert.equal(fetches, 1)
      assert.deepEqual(observed.map(chunk => chunk.type), ['block-start', 'reasoning-delta', 'block-start',
        'text-delta', 'text-delta', 'block-end', 'block-end', 'usage', 'finish'])
      assert.equal(observed[0].blockType, 'reasoning')
      assert.equal(observed[0].index, 0)
      assert.equal(observed[2].blockType, 'text')
      assert.equal(observed[2].index, 1)
      assert.deepEqual(observed[7].usage, { inputTokens: 800, outputTokens: 2000, totalTokens: 3000,
        cacheReadTokens: 200, reasoningTokens: 1500 })
      assert.equal(observed[8].reason, finishReason === 'stop' ? 'stop' : 'max-tokens')
      assert.deepEqual(run.executionSummary, { finishKind: observed[8].reason, usage: observed[7].usage,
        ...(finishReason === 'stop' ? {} : { failureStage: 'stream' }) })
      if (finishReason === 'stop') {
        assert.equal(run.status, 'completed')
        assert.equal(run.evidenceKind, 'native-model')
        assert.equal(run.contextSnapshot.skillProvenance.skillVersion, '0.2.1')
        assert.ok(run.result.artifact.body.includes(publicClaimsV2Output(fields).draftMarkdown))
        assert.doesNotMatch(run.result.artifact.body, /OFFLINE_REASONING_NOT_AN_ARTIFACT/)
      } else {
        assert.equal(run.status, 'failed')
        assert.equal(run.failureCode, 'INVALID_OUTPUT')
        assert.equal(run.result, null)
      }
      t.diagnostic(JSON.stringify({ finishReason, nativeFinish: observed[8].reason, nativeUsage: observed[7].usage,
        status: run.status, resultPresent: run.result !== null, fetches, realNetworkCalls: 0 }))
    })
  }
})
