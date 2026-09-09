import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdir, mkdtemp, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createNativeOfflineRuntime } from '../../packages/oasis-professional-service/src/native-offline-runtime.js'
import { loadClaimsSkill } from '../../packages/oasis-professional-service/src/claims-skill-pin.js'
import { fixtureHarness } from '../../packages/oasis-professional-service/test/unified-generation-harness.mjs'

const packages = new URL('../../.dsh-test/stage3-desktop-app/resources/app.asar.unpacked/node_modules/@deepseek-ai/', import.meta.url)
const { Context } = await import(new URL('cordis/lib/index.js', packages))
const native = await import(new URL('dsh-llm/lib/index.js', packages))

test('formal resources reach one fixed native llm call and the common review/save/draft lifecycle offline', { timeout: 15000 }, async t => {
  assert.equal(JSON.parse(await readFile(new URL('dsh-llm/package.json', packages), 'utf8')).version, '0.1.2-rc.1')
  const bundle = await loadClaimsSkill()
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  await ctx.plugin(native.LlmRuntime).await()
  const beforeFetch = globalThis.fetch
  globalThis.fetch = () => assert.fail('No network allowed for formal offline assembly')
  t.after(() => { globalThis.fetch = beforeFetch })
  let calls = 0
  const llm = {
    listProviders: () => ctx.llm.listProviders(),
    prepareCall: (...args) => ctx.llm.prepareCall(...args),
    registerAdapter(ids, adapter) {
      const stream = adapter.stream.bind(adapter)
      const check = options => {
        // The actual native dispatcher calls this method; retain no instruction text in diagnostics.
        calls++
        assert.equal(options.system, bundle.instruction.body)
        assert.equal(options.provider, 'oasis-offline')
        assert.equal(options.tools, undefined)
        const fields = JSON.parse(options.messages[0].content[0].text)
        assert.deepEqual(Object.keys(fields).sort(), ['upstream_snapshot', 'disclosure_text', 'drawings_text', 'claim_requirements_text', 'user_input'].sort())
        assert.equal(fields.upstream_snapshot.status, 'missing')
      }
      // Keep the original async stream; assertions run immediately before it without replacing its output.
      adapter.stream = async function* (options) { check(options); yield* stream(options) }
      return ctx.llm.registerAdapter(ids, adapter)
    },
  }
  const runtime = createNativeOfflineRuntime({ llm, sessions: {}, workspaceRegistry: {}, sessionProjections: {}, agentDefaultModel: {} }, native)
  t.after(runtime.dispose)
  // This harness supplies identity only; actual Desktop Workspace/model resolution is checked separately.
  runtime.resolveContext = () => ({ sessionId: 'formal-offline-session', route: { provider: 'oasis-offline', model: 'text' } })
  const base = new URL('../../.dsh-test/stage4e5-native/', import.meta.url)
  await mkdir(base, { recursive: true })
  const root = await mkdtemp(fileURLToPath(new URL('run-', base)))
  const h = await fixtureHarness({ claimsV2: true, localGeneration: runtime,
    workspaceRegistry: { get: () => ({ path: root, async status() { return 'ok' } }) } })
  t.after(async () => { await h.service.closeLocalGeneration(); await h.repository.close() })
  await h.service.createLocalRun(h.command({ sessionId: 'formal-offline-session' }))
  let run
  for (let n = 0; n < 200; n++) {
    run = h.state().tasks['task-a'].runs[h.state().tasks['task-a'].activeRunId]
    if (run.status !== 'prepared') break
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  assert.equal(run.status, 'completed')
  assert.equal(calls, 1)
  assert.equal(run.contextSnapshot.skillProvenance.skillVersion, '0.2.0')
  assert.equal(run.contextSnapshot.instructionSha256, bundle.provenance.assemblySha256)
  assert.match(run.result.artifact.body, /正式内置 Skill flow-2-6\/0\.2\.0 已加载/)
  assert.throws(() => h.service.prepareConversationDraft(h.command({ runId: run.runId, artifactId: run.result.artifact.artifactId })), /审核/)
  await h.service.reviewRun(h.command({ runId: run.runId, status: 'approved', note: '' }))
  await h.service.editUnifiedResult(h.command({ runId: run.runId, artifactId: run.result.artifact.artifactId,
    body: run.result.artifact.body + '\n人工修订：离线装配验收，不代表起草质量。\n', requestKey: 'formal-edit' }))
  const edited = h.state().tasks['task-a'].runs[h.state().tasks['task-a'].activeRunId]
  assert.equal(edited.review.status, 'not-reviewed')
  assert.throws(() => h.service.prepareConversationDraft(h.command({ runId: edited.runId, artifactId: edited.result.artifact.artifactId })), /审核/)
  await h.service.reviewRun(h.command({ runId: edited.runId, status: 'approved', note: '' }))
  const payload = h.command({ runId: edited.runId, artifactId: edited.result.artifact.artifactId, relativeDirectory: 'formal-output' })
  const plan = await h.service.prepareWriteback(payload)
  await h.service.commitWriteback({ confirmationToken: plan.confirmationToken })
  assert.equal(await readFile(join(root, 'formal-output', edited.result.artifact.suggestedFileName), 'utf8'), edited.result.artifact.body)
  await assert.rejects(h.service.prepareWriteback({ ...payload, expectedRevision: h.state().revision }), e => e.code === 'WRITEBACK_TARGET_EXISTS')
  const draft = h.service.prepareConversationDraft(h.command({ runId: edited.runId, artifactId: edited.result.artifact.artifactId }))
  assert.ok(draft.text.includes(edited.result.artifact.body))
  assert.ok(draft.text.includes(edited.runId))
  assert.equal(calls, 1)
  t.diagnostic(JSON.stringify({ evidence: 'FORMAL_RESOURCE_NATIVE_OFFLINE_NOT_REAL_MODEL', calls,
    skillId: bundle.provenance.skillId, version: bundle.provenance.skillVersion,
    assemblySha256: bundle.provenance.assemblySha256, reviewedEditedSavedDraft: true, root }))
})
