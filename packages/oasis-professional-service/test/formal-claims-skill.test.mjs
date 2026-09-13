import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { loadClaimsSkill } from '../src/claims-skill-pin.js'
import { createUnifiedResult } from '../src/unified-fixture.js'
import { createNativeOfflineRuntime } from '../src/native-offline-runtime.js'
import { assembleClaimsV2, publicClaimsV2Output, missingUpstream } from '../src/claims-v2-result.js'

const sha = value => createHash('sha256').update(value).digest('hex')
const ctx = { llm: { listProviders: () => [], registerAdapter: () => () => {} },
  sessions: {}, workspaceRegistry: {}, sessionProjections: {}, agentDefaultModel: {} }
const native = { LlmAdapter: class {}, BlockAssembler: class {}, createUserMessage: value => value }

test('0.2.2 published response example satisfies the real cumulative contract and preserves strict rejection', async () => {
  const bundle = await loadClaimsSkill()
  assert.equal(bundle.provenance.skillVersion, '0.2.2')
  const template = await readFile(new URL('../src/builtin-skills/flow-2-6/0.2.2/assets/claims-output-template.md', import.meta.url), 'utf8')
  const examples = [...template.matchAll(/```json\n([\s\S]*?)\n```/g)].map(m => JSON.parse(m[1]))
  assert.equal(examples.length, 2)
  const [fields, output] = examples
  const run = { runId: 'contract-example', workflowVersion: '2', compositionVersion: '2', createdAt: '2026-09-12T01:00:00Z',
    workflowRunUid: '4cc54710-2b34-4dbd-a97c-fbe1b3d5b9ce', evidenceKind: 'native-model',
    contextSnapshot: { skillProvenance: bundle.provenance }, inputSnapshot: { formValues: fields, upstreamSnapshot: missingUpstream } }
  const make = value => createUnifiedResult(JSON.stringify(value), run)
  assert.match(make(output).artifact.body, /business_version: 0\.2\.2/)
  const reject = mutate => { const value = structuredClone(output); mutate(value); assert.throws(() => make(value), /INVALID_OUTPUT/) }
  reject(o => { o.snapshotUpdates[0].sourceLocator = '第三段' })
  reject(o => { o.snapshotUpdates[0].contentOrigin = '用户提供' })
  reject(o => { o.warnings[0].inheritedFrom = 'none' })
  reject(o => { o.summary = ' ' })
  reject(o => { o.summary = '字'.repeat(12001) })
  reject(o => { o.extra = true })
  reject(o => { o.snapshotUpdates = Array.from({ length: 33 }, (_, i) => ({ ...o.snapshotUpdates[0], contentId: `c-${i}` })) })
  const boundary = structuredClone(output); boundary.summary = '字'.repeat(12000); make(boundary)
  const completion = structuredClone(output)
  completion.snapshotUpdates[0].contentOrigin = 'model_completed'
  assert.throws(() => make(completion), /INVALID_OUTPUT/)
  completion.modelCompletions = [{ contentId: completion.snapshotUpdates[0].contentId, contentOrigin: 'model_completed',
    completionBasis: '合成测试依据', assumptions: '仅测试登记关系', confidence: '待确认', affectedSection: '权项1', humanConfirmationStatus: 'pending' }]
  make(completion)
  completion.modelCompletions[0].contentId = 'orphan'
  assert.throws(() => make(completion), /INVALID_OUTPUT/)
})

test('isolated native runtime assembles the formal flow-2-6 0.2.2 resources', async () => {
  const runtime = createNativeOfflineRuntime(ctx, native)
  try {
    const bundle = await runtime.loadClaimsV2Skill()
    assert.equal(bundle.provenance.skillVersion, '0.2.2')
    assert.equal(bundle.provenance.skillId, 'flow-2-6')
    assert.equal(bundle.provenance.manifestSha256, 'f81d427db60ab671dcd552a24794f68c1a323d2dd1b440510bb26f9bfe23d706')
    assert.equal(bundle.provenance.resources.length, 4)
    assert.equal(bundle.provenance.assemblySha256, sha(bundle.instruction.body))
    assert.ok(bundle.instruction.body.includes('权项特征矩阵'))
    assert.ok(bundle.instruction.body.includes('draftMarkdown'))
    assert.equal(runtime.evidenceKind, 'native-offline')
  } finally { runtime.dispose() }
})

test('new formal offline artifacts disclose assembly without claiming actual model quality', () => {
  const fields = { disclosure_text: '控制器按分段写入日志，校验后更新索引。', drawings_text: '', claim_requirements_text: '', user_input: '' }
  const run = { runId: 'formal-offline', createdAt: '2026-09-09T01:02:03.000Z', compositionVersion: '2',
    workflowRunUid: '4cc54710-2b34-4dbd-a97c-fbe1b3d5b9ce', evidenceKind: 'native-offline',
    contextSnapshot: { skillProvenance: { skillId: 'flow-2-6', skillVersion: '0.2.0', executionContractVersion: 'single-call-cumulative-1' } },
    inputSnapshot: { formValues: fields, upstreamSnapshot: missingUpstream } }
  const formal = assembleClaimsV2(JSON.stringify(publicClaimsV2Output(fields)), run)
  assert.match(formal.body, /正式内置 Skill flow-2-6\/0\.2\.0 已加载/)
  assert.match(formal.body, /未调用真实模型/)
  assert.doesNotMatch(formal.body, /未运行私有 flow-2-6/)
  const legacy = structuredClone(run)
  legacy.contextSnapshot.skillProvenance.skillVersion = 'public-4e2-1'
  assert.match(assembleClaimsV2(JSON.stringify(publicClaimsV2Output(fields)), legacy).body, /公开替身\/合成验收，未运行私有 flow-2-6\/0\.2\.0/)
})
