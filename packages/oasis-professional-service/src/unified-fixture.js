import { createHash } from 'node:crypto'
import { canonicalJson } from './local-mock-runner.js'
import { claimsDraftValuesSchema, generationSourceSchema } from './generation-contract.js'
import { assembleClaimsV2, publicClaimsV2Output } from './claims-v2-result.js'

export function unifiedInputSha256(run) {
  if (run.mode === 'dsh-local') return createHash('sha256').update(canonicalJson({
    mode: run.mode, evidenceKind: run.evidenceKind, executionVersion: run.executionVersion,
    workflowId: run.workflowId, workflowVersion: run.workflowVersion,
    source: run.source, inputSchemaVersion: run.inputSchemaVersion, contextSnapshot: run.contextSnapshot,
    ...(run.compositionVersion ? { compositionVersion: run.compositionVersion } : {}),
    formValues: run.inputSnapshot.formValues, inputRefs: run.inputSnapshot.inputRefs,
    ...(run.workflowVersion === '2' ? { upstreamSnapshot: run.inputSnapshot.upstreamSnapshot } : {}),
  }), 'utf8').digest('hex')
  return createHash('sha256').update(canonicalJson({
    mode: run.mode, evidenceKind: run.evidenceKind, fixtureVersion: run.fixtureVersion,
    workflowId: run.workflowId, workflowVersion: run.workflowVersion,
    source: run.source, inputSchemaVersion: run.inputSchemaVersion,
    ...(run.compositionVersion ? { compositionVersion: run.compositionVersion } : {}),
    formValues: run.inputSnapshot.formValues, inputRefs: run.inputSnapshot.inputRefs,
    ...(run.workflowVersion === '2' ? { upstreamSnapshot: run.inputSnapshot.upstreamSnapshot } : {}),
  }), 'utf8').digest('hex')
}

export function createUnifiedResult(body, run) {
  let fileName = 'patent-claims.md'
  if (run?.workflowVersion === '2') ({ body, fileName } = assembleClaimsV2(body, run))
  if (typeof body !== 'string' || !body.trim() || body.length > 100000) throw new Error('Invalid bounded text result')
  const sha256 = createHash('sha256').update(body, 'utf8').digest('hex')
  return { contentStatus: 'warning', riskAssessment: 'not-assessed', questionAssessment: 'not-assessed',
    artifact: { artifactId: `sha256:${sha256}`, sha256, mediaType: 'text/markdown', suggestedFileName: fileName, body } }
}

export function runUnifiedFixture({ source, inputSnapshot, workflowVersion }) {
  generationSourceSchema.parse(source)
  if (workflowVersion === '2') return JSON.stringify(publicClaimsV2Output(inputSnapshot.formValues, inputSnapshot.upstreamSnapshot))
  const fields = claimsDraftValuesSchema.parse(inputSnapshot.formValues)
  const label = source === 'local-skill' ? '本地 Skills' : '专业 API'
  return `# 权利要求书（合成验收）\n\n> ${label} 路径的离线样本，未调用真实模型、Skill 或 API。\n\n${fields.claims}\n\n## 待人工复核\n\n此样本仅验证输入、结果与操作链路，不构成专业生成结果。风险及待确认问题未评估。\n`
}
