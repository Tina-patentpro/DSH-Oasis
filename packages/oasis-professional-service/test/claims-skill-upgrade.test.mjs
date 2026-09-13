import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { loadBuiltinSkill } from '../src/builtin-skill-loader.js'
import { loadClaimsSkill } from '../src/claims-skill-pin.js'
import { publicClaimsV2Output, assembleClaimsV2, missingUpstream } from '../src/claims-v2-result.js'
import { parseStoredWorkbenchRecord } from '../src/workbench-domain.js'
import { fixtureHarness } from './unified-generation-harness.mjs'
import { dshLocalRunSnapshotSchema } from '../src/workbench-contract.js'

const oldSkill = () => loadBuiltinSkill({
  root: fileURLToPath(new URL('../src/builtin-skills/flow-2-6/0.2.0/', import.meta.url)),
  manifestSha256: '63254666e5e1af582b2251423a003686cc2f112f655b35ed088900fbb5cdaaa1',
  expected: { skillId: 'flow-2-6', skillVersion: '0.2.0', inputSchemaVersion: 'claims-disclosure-2',
    outputSchemaVersion: 'claims-cumulative-2', executionContractVersion: 'single-call-cumulative-1' },
})
const sessionId = 'session-a'
const previousSkill = () => loadBuiltinSkill({
  root: fileURLToPath(new URL('../src/builtin-skills/flow-2-6/0.2.1/', import.meta.url)),
  manifestSha256: 'd472b4b7a7b74d5223e95513dd1175927e8b9766e392d47a4910c8ce4f0c8dbf',
  expected: { skillId: 'flow-2-6', skillVersion: '0.2.1', inputSchemaVersion: 'claims-disclosure-2',
    outputSchemaVersion: 'claims-cumulative-2', executionContractVersion: 'single-call-cumulative-1' },
})
const fields = { disclosure_text: '控制器按分段写日志，校验通过后更新索引。', drawings_text: '', claim_requirements_text: '', user_input: '' }

test('upgraded formal runtime persists current provenance and reloads old records without rewriting artifacts', async () => {
  const legacy = await oldSkill()
  assert.equal(legacy.provenance.assemblySha256, '163422ff13f4cf4b92b47ba6b696ca49fa22f2bbfa0edb3299ad7924faf7660d')
  const current = await loadClaimsSkill()
  const previous = await previousSkill()
  assert.equal(previous.provenance.assemblySha256, '2bb420ecee36acfa199d47b00d87671265f6602efc48eb1b2c425da604ff7846')
  assert.equal(current.provenance.skillVersion, '0.2.2')
  let selected = legacy
  const runtime = { enabled: true, evidenceKind: 'native-offline', loadClaimsV2Skill: () => selected,
    resolveContext: () => ({ sessionId, route: { provider: 'offline-only', model: 'text' } }),
    adapter: { async generate(input) { return { status: 'completed', body: JSON.stringify(publicClaimsV2Output(input.formValues)) } } } }
  const h = await fixtureHarness({ claimsV2: true, localGeneration: runtime })
  try {
    for (const bundle of [legacy, previous, current]) {
      selected = bundle
      await h.service.createLocalRun(h.command({ sessionId }))
      for (let i = 0; i < 100 && Object.values(h.state().tasks['task-a'].runs).some(r => r.status === 'prepared'); i++) await new Promise(r => setTimeout(r, 5))
    }
    const oldRun = h.state().tasks['task-a'].runs['run-1']
    const previousRun = h.state().tasks['task-a'].runs['run-2']
    const newRun = h.state().tasks['task-a'].runs['run-3']
    assert.equal(previousRun.status, 'completed')
    assert.match(previousRun.result.artifact.body, /flow-2-6\/0\.2\.1 已加载/)
    assert.equal(dshLocalRunSnapshotSchema.safeParse({ ...previousRun, evidenceKind: 'native-model' }).success, true)
    assert.equal(oldRun.status, 'completed'); assert.equal(newRun.status, 'completed')
    assert.match(oldRun.result.artifact.body, /flow-2-6\/0\.2\.0 已加载/)
    assert.match(newRun.result.artifact.body, /flow-2-6\/0\.2\.2 已加载/)
    // Historical native-model records remain legal; they are not dispatched again.
    assert.equal(dshLocalRunSnapshotSchema.safeParse({ ...oldRun, evidenceKind: 'native-model' }).success, true)
    assert.equal(dshLocalRunSnapshotSchema.safeParse({ ...newRun, evidenceKind: 'native-model' }).success, true)
    const stored = JSON.stringify(h.state())
    assert.equal(JSON.stringify(parseStoredWorkbenchRecord('workspace-a', JSON.parse(stored))), stored)
  } finally { await h.service.closeLocalGeneration(); await h.repository.close() }
})

test('cumulative artifact labels use the run resource version rather than the current Host version', () => {
  for (const version of ['0.2.0', '0.2.1', '0.2.2']) {
    const run = { runId: 'version-test', createdAt: '2026-09-09T01:02:03.000Z', compositionVersion: '2',
      workflowRunUid: '4cc54710-2b34-4dbd-a97c-fbe1b3d5b9ce', evidenceKind: 'native-model',
      contextSnapshot: { skillProvenance: { skillId: 'flow-2-6', skillVersion: version, executionContractVersion: 'single-call-cumulative-1' } },
      inputSnapshot: { formValues: fields, upstreamSnapshot: missingUpstream } }
    const { body } = assembleClaimsV2(JSON.stringify(publicClaimsV2Output(fields)), run)
    assert.ok(body.includes(`flow-2-6/${version} 经 DSH 原生模型生成`))
    assert.ok(body.includes(`business_version: ${version}`))
  }
})

test('changing formal resources invalidates a prepared real-model confirmation without dispatch', async () => {
  const legacy = await oldSkill(), current = await loadClaimsSkill()
  let selected = current, calls = 0
  const runtime = { enabled: true, evidenceKind: 'native-model', loadClaimsV2Skill: () => selected,
    resolveContext: () => ({ sessionId, route: { provider: 'offline-only', model: 'text' } }),
    adapter: { async generate() { calls++; return { status: 'unknown', code: 'TIMED_OUT' } } } }
  const h = await fixtureHarness({ claimsV2: true, localGeneration: runtime })
  try {
    const preview = await h.service.prepareLocalRun(h.command({ sessionId }))
    // Simulate a changed resource snapshot while keeping model, version, input and evidence kind fixed.
    selected = structuredClone(current)
    selected.instruction.body += '\nTEST_ONLY_CHANGED_RESOURCE'
    selected.provenance.assemblySha256 = createHash('sha256').update(selected.instruction.body).digest('hex')
    const fresh = await h.service.prepareLocalRun(h.command({ sessionId }))
    assert.notEqual(fresh.sha256, preview.sha256)
    await assert.rejects(h.service.createLocalRun(h.command({ sessionId, confirmation: { confirmed: true, sha256: preview.sha256 } })), { code: 'GENERATION_CONFIRMATION_STALE' })
    assert.equal(calls, 0)
    selected = legacy
    await assert.rejects(h.service.prepareLocalRun(h.command({ sessionId })), { code: 'BUILTIN_SKILL_UNAVAILABLE' })
    selected = await previousSkill()
    await assert.rejects(h.service.prepareLocalRun(h.command({ sessionId })), { code: 'BUILTIN_SKILL_UNAVAILABLE' })
    assert.equal(calls, 0, 'old versions stay readable but are not selected for a new real call')
  } finally { await h.service.closeLocalGeneration(); await h.repository.close() }
})
