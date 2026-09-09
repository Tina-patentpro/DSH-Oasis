import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { loadBuiltinSkill } from '../../packages/oasis-professional-service/src/builtin-skill-loader.js'
import { createDshGenerationAdapter } from '../../packages/oasis-professional-service/src/dsh-generation-adapter.js'
import { publicSkillFixture, PUBLIC_MARKERS } from '../../packages/oasis-professional-service/test/builtin-skill-fixture.mjs'
import { fixtureHarness } from '../../packages/oasis-professional-service/test/unified-generation-harness.mjs'

const packages = new URL('../../.dsh-test/stage3-desktop-app/resources/app.asar.unpacked/node_modules/@deepseek-ai/', import.meta.url)
const native = name => import(new URL(`${name}/lib/index.js`, packages))
const { Context } = await native('cordis')
const { LlmRuntime, LlmAdapter, BlockAssembler, createUserMessage } = await native('dsh-llm')
const { SessionStore } = await native('dsh-session')
const { default: Persistence } = await native('dsh-session-persistence-jsonl')
const checkpoint = await native('dsh-session-checkpoint-policy')
const { sessionLogZipEntries } = await native('dsh-session-log-export')

test('public built-in resources reach one native call and unified artifact, not raw sessions/exports', { timeout: 15000 }, async t => {
  const f = await publicSkillFixture()
  const loaded = await loadBuiltinSkill(f.options)
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  const base = new URL('../../.dsh-test/stage4e-native/', import.meta.url)
  await mkdir(base, { recursive: true })
  const runRoot = await mkdtemp(fileURLToPath(new URL('run-', base)))
  const fetchBefore = globalThis.fetch
  globalThis.fetch = () => assert.fail('Network forbidden in public resource probe')
  t.after(() => { globalThis.fetch = fetchBefore })
  await ctx.plugin(SessionStore).await()
  await ctx.plugin(LlmRuntime).await()
  await ctx.plugin(Persistence, { root: runRoot, compression: 'none' }).await()
  await ctx.plugin(checkpoint).await()
  const session = ctx.sessions.create('stage4e-public', { meta: { cwd: runRoot } })
  // Seed the isolated in-process log with public input; no real conversation or Agent is running.
  session.append('user/message', createUserMessage({ content: [{ type: 'text', text: '公开替身输入' }] }), { surfaceOp: 'append' })
  const eventsBefore = session.snapshotEvents()
  const route = { provider: 'stage4e-offline', model: 'text' }
  let calls = 0
  let echo = false
  let error = false
  class PublicProvider extends LlmAdapter {
    async *stream(options) {
      calls++
      assert.equal(options.provider, route.provider)
      assert.equal(options.model, route.model)
      assert.equal(options.sessionId, session.id)
      assert.equal(options.system, loaded.instruction.body)
      assert.equal(options.tools, undefined)
      assert.equal(options.messages.length, 1)
      for (const marker of PUBLIC_MARKERS) assert.ok(options.system.includes(marker))
      if (error) throw new Error(PUBLIC_MARKERS.join('|'))
      yield { type: 'text-delta', index: 0, text: echo ? PUBLIC_MARKERS.join('|') : '# 公开替身产物\n\n一次离线调用返回的文字。' }
      yield { type: 'finish', reason: { kind: 'stop' } }
    }
  }
  const dispose = ctx.llm.registerAdapter([route.provider], new PublicProvider())
  t.after(dispose)
  const adapter = createDshGenerationAdapter({ llm: ctx.llm, BlockAssembler, createUserMessage })
  const runtime = { enabled: true, evidenceKind: 'native-offline', instruction: loaded.instruction,
    resolveContext: () => ({ sessionId: session.id, route }), adapter }
  const h = await fixtureHarness({ localGeneration: runtime })
  t.after(async () => { await h.service.closeLocalGeneration(); await h.repository.close() })
  const admission = await h.service.createLocalRun(h.command({ sessionId: session.id }))
  const id = admission.current.tasks['task-a'].activeRunId
  for (let n = 0; n < 100 && h.state().tasks['task-a'].runs[id].status === 'prepared'; n++) await new Promise(resolve => setTimeout(resolve, 10))
  const run = h.state().tasks['task-a'].runs[id]
  assert.equal(run.status, 'completed')
  assert.equal(calls, 1)
  assert.equal(run.contextSnapshot.instructionVersion, loaded.instruction.version)
  assert.equal(run.contextSnapshot.instructionSha256, loaded.provenance.assemblySha256)
  for (const marker of PUBLIC_MARKERS) assert.ok(!JSON.stringify(h.state()).includes(marker))
  await h.service.reviewRun(h.command({ runId: id, status: 'approved', note: '' }))
  const draft = h.service.prepareConversationDraft(h.command({ runId: id, artifactId: run.result.artifact.artifactId }))
  assert.ok(draft.text.includes('公开替身产物'))
  for (const marker of PUBLIC_MARKERS) assert.ok(!draft.text.includes(marker))
  assert.deepEqual(session.snapshotEvents(), eventsBefore)
  await ctx.sessions.flush(session)
  const raw = await ctx.sessionPersistence.readRaw(session.id)
  assert.ok(raw?.content.length)
  for (const marker of PUBLIC_MARKERS) assert.ok(!raw.content.includes(marker))
  const entries = []
  for await (const entry of sessionLogZipEntries({}, raw, session.id, false)) entries.push(entry)
  assert.equal(entries.length, 1)
  assert.equal(entries[0].content, raw.content)

  // A broken resource fails before dispatch, never invokes a fallback model.
  await writeFile(join(f.root, 'references/drafting-rules.md'), 'tampered public resource')
  await assert.rejects(loadBuiltinSkill(f.options), e => e.code === 'BUILTIN_SKILL_UNAVAILABLE')
  assert.equal(calls, 1)

  const request = { runId: 'public-direct', sessionId: session.id, route, instruction: loaded.instruction,
    formValues: { claims: '公开输入' }, signal: new AbortController().signal }
  error = true
  const failed = await adapter.generate(request)
  assert.equal(failed.status, 'failed')
  for (const marker of PUBLIC_MARKERS) assert.ok(!JSON.stringify(failed).includes(marker))

  // Honest residual-risk control: model text can repeat instructions; loading is not DRM.
  error = false; echo = true
  const echoed = await adapter.generate(request)
  assert.equal(echoed.status, 'completed')
  for (const marker of PUBLIC_MARKERS) assert.ok(echoed.body.includes(marker))
  assert.equal(calls, 3)
  assert.deepEqual(session.snapshotEvents(), eventsBefore)
  await ctx.sessions.flush(session)
  assert.equal((await ctx.sessionPersistence.readRaw(session.id)).content, raw.content)
  for (const name of ['dsh-llm', 'dsh-session', 'dsh-session-persistence-jsonl', 'dsh-session-log-export']) {
    assert.equal(JSON.parse(await readFile(new URL(`${name}/package.json`, packages), 'utf8')).version, '0.1.2-rc.1')
  }
  t.diagnostic(JSON.stringify({ proof: 'PUBLIC_NATIVE_SERVICES_NOT_DESKTOP', calls, resourceCount: 4,
    validBusinessCalls: 1, rawErrorSanitized: true, sessionUnchanged: true, nativeExportContainsMarker: false,
    modelEchoCanExposeInstruction: true, privateResourcesLoaded: false, contracts: f.options.expected, runRoot }))
})
