import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { createNativeOfflineRuntime } from '../src/native-offline-runtime.js'
import { assembleClaimsV2, publicClaimsV2Output, missingUpstream } from '../src/claims-v2-result.js'

const sha = value => createHash('sha256').update(value).digest('hex')
const ctx = { llm: { listProviders: () => [], registerAdapter: () => () => {} },
  sessions: {}, workspaceRegistry: {}, sessionProjections: {}, agentDefaultModel: {} }
const native = { LlmAdapter: class {}, BlockAssembler: class {}, createUserMessage: value => value }

test('isolated native runtime assembles the formal flow-2-6 0.2.0 resources', async () => {
  const runtime = createNativeOfflineRuntime(ctx, native)
  try {
    const bundle = await runtime.loadClaimsV2Skill()
    assert.equal(bundle.provenance.skillVersion, '0.2.0')
    assert.equal(bundle.provenance.skillId, 'flow-2-6')
    assert.equal(bundle.provenance.manifestSha256, '63254666e5e1af582b2251423a003686cc2f112f655b35ed088900fbb5cdaaa1')
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
