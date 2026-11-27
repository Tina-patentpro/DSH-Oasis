import { createHash } from 'node:crypto'
import { z } from 'zod'
import { PATENT_DISCLOSURE_CLAIMS_ID } from './local-skill-suites.js'
import { claimsV2DraftValuesSchema, missingUpstreamSchema, claimsUpstreamSnapshotSchema } from './generation-contract.js'

export const missingUpstream = Object.freeze({ status: 'missing', reason: 'not-connected' })
const nonblank = value => value.trim().length > 0
const text = z.string().min(1).max(12000).refine(nonblank)
const short = z.string().min(1).max(512).refine(nonblank)
const warning = z.object({ warningId: short, inheritedFrom: z.string().max(512), problem: text, affectedContent: text,
  currentHandling: text, modelCompletion: text, deliverableImpact: text, recommendedAction: text, status: z.literal('open') }).strict()
const outputSchema = z.object({ summary: text, draftMarkdown: z.string().min(1).max(30000).refine(nonblank), featureMatrixMarkdown: text,
  fallbackMarkdown: text, supportMatrixMarkdown: text,
  snapshotUpdates: z.array(z.object({ contentId: short, operation: z.enum(['add', 'replace']), contentMarkdown: text,
    sourceInputId: short, sourceLocator: text, contentOrigin: z.enum(['user_provided', 'model_completed']), revisionReason: text }).strict()).max(32),
  warnings: z.array(warning).max(64),
  modelCompletions: z.array(z.object({ contentId: short, contentOrigin: z.literal('model_completed'), completionBasis: text,
    assumptions: text, confidence: short, affectedSection: text, humanConfirmationStatus: z.literal('pending') }).strict()).max(32),
  workflowStatus: z.enum(['completed', 'completed_with_warnings']),
  deliverableStatus: z.enum(['ready', 'ready_with_warnings', 'model_completed_pending_confirmation', 'not_recommended_for_filing']),
}).strict()

export const getClaimsV2OutputSchema = () => z.toJSONSchema(outputSchema)

// Host-owned composition; no file discovery, prior-document replacement or model-chosen filenames.
export function assembleClaimsV2(raw, run) {
  if (run.compositionVersion === '2') return assembleCumulative(raw, run)
  try {
    if (typeof raw !== 'string' || raw.length > 100000) throw Error()
    const output = outputSchema.parse(JSON.parse(raw))
    const fields = claimsV2DraftValuesSchema.parse(run.inputSnapshot.formValues)
    missingUpstreamSchema.parse(run.inputSnapshot.upstreamSnapshot)
    const ids = new Set()
    for (const update of output.snapshotUpdates) {
      if (ids.has(update.contentId) || update.operation !== 'add' || !Object.hasOwn(fields, update.sourceInputId)
        || !fields[update.sourceInputId].trim() || !fields[update.sourceInputId].includes(update.sourceLocator)) throw Error()
      ids.add(update.contentId)
    }
    const warningIds = new Set()
    for (const item of output.warnings) {
      if (warningIds.has(item.warningId) || item.inheritedFrom) throw Error()
      warningIds.add(item.warningId)
    }
    const completionIds = new Set()
    for (const item of output.modelCompletions) {
      if (completionIds.has(item.contentId)) throw Error()
      completionIds.add(item.contentId)
    }
    for (const update of output.snapshotUpdates) {
      if (update.contentOrigin === 'model_completed' && !completionIds.has(update.contentId)) throw Error()
    }
    if (output.warnings.length && output.workflowStatus !== 'completed_with_warnings') throw Error()
    if (output.modelCompletions.length && !['model_completed_pending_confirmation', 'not_recommended_for_filing'].includes(output.deliverableStatus)) throw Error()
    const date = new Date(run.createdAt)
    if (!Number.isFinite(date.getTime()) || typeof run.runId !== 'string' || !run.runId) throw Error()
    const stamp = new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 19).replace(/[-T:]/g, '')
    const uid = createHash('sha256').update(run.runId).digest('hex').slice(0, 8)
    const fileName = `claims_${stamp}_${uid}.md`
    const json = value => JSON.stringify(value, null, 2)
    const body = `# 权利要求书累计文稿\n\n## 文档信息\n\n- 节点：flow-2-6\n- 输出合同：claims-cumulative-2\n- 时间：${date.toISOString()}（文件名为上海时间）\n- run_uid8：${uid}\n- 上游累计材料缺失：尚未接入；文件正文未读取。\n- 当前仅为公开离线样本，不是私有 Skill 业务验收。\n\n## 核心结论\n\n${output.summary}\n\n模型建议状态：${output.workflowStatus} / ${output.deliverableStatus}（未经核实，不代表人工审核）。\n\n## 核心结果\n\n${output.draftMarkdown}\n\n### 特征矩阵\n\n${output.featureMatrixMarkdown}\n\n### 从属回退\n\n${output.fallbackMarkdown}\n\n### T4 与初检\n\n${output.supportMatrixMarkdown}\n\n## 下游读取区\n\n本区保留实际输入和模型建议；未合并不存在的上游累计文档。结构数据在人工编辑后不再具有原响应校验含义。\n\n${json({ input: { upstream_snapshot: missingUpstream, ...fields }, snapshotUpdates: output.snapshotUpdates })}\n\n## 风险与待确认事项\n\nHost 提示：上游累计材料缺失；本样本风险及问题未评估，不能据此申报。\n\n${json({ warnings: output.warnings, modelCompletions: output.modelCompletions })}\n`
    if (body.length > 100000) throw Error()
    return { body, fileName }
  } catch { throw Object.assign(new Error('INVALID_OUTPUT'), { code: 'INVALID_OUTPUT' }) }
}

function assembleCumulative(raw, run) {
  try {
    if (typeof raw !== 'string' || raw.length > 100000) throw Error()
    const output = outputSchema.parse(JSON.parse(raw))
    const fields = claimsV2DraftValuesSchema.parse(run.inputSnapshot.formValues)
    const upstream = claimsUpstreamSnapshotSchema.parse(run.inputSnapshot.upstreamSnapshot)
    const uid = z.string().uuid().parse(run.workflowRunUid).toLowerCase()
    const date = new Date(run.createdAt)
    if (!Number.isFinite(date.getTime())) throw Error()
    const localTime = new Date(date.getTime() + 8 * 3600000).toISOString().slice(0,19)
    const stamp = localTime.replace(/[-T:]/g, ''), uid8 = uid.replaceAll('-', '').slice(0,8)
    const fileName = `claims_${stamp}_${uid8}.md`
    const original = upstream.status === 'missing' ? '' : upstream.body
    let effective = original
    const ids = new Set(), replacements = []
    for (const item of output.snapshotUpdates) {
      const source = item.sourceInputId === 'upstream_md_file' ? original : fields[item.sourceInputId]
      if (ids.has(item.contentId) || !source || !source.includes(item.sourceLocator)) throw Error()
      ids.add(item.contentId)
      if (item.operation === 'replace') {
        if (upstream.status !== 'accepted' || item.sourceInputId !== 'upstream_md_file'
          || !fields.user_input.split(/\r?\n/).some(line => line.trim() === `替换：${item.contentId}`)
          || source.split(item.sourceLocator).length !== 2) throw Error()
        const start = source.indexOf(item.sourceLocator), end = start + item.sourceLocator.length
        if (replacements.some(r => start < r.end && end > r.start)) throw Error()
        replacements.push({ start, end, text: item.contentMarkdown })
      }
    }
    for (const item of replacements.sort((a,b) => b.start - a.start)) effective = effective.slice(0,item.start) + item.text + effective.slice(item.end)
    const completionIds = new Set()
    for (const item of output.modelCompletions) {
      if (completionIds.has(item.contentId) || !output.snapshotUpdates.some(u => u.contentId === item.contentId && u.contentOrigin === 'model_completed')) throw Error()
      completionIds.add(item.contentId)
    }
    for (const item of output.snapshotUpdates) if (item.contentOrigin === 'model_completed' && !completionIds.has(item.contentId)) throw Error()
    const warningIds = new Set()
    for (const item of output.warnings) {
      if (warningIds.has(item.warningId) || item.inheritedFrom && item.inheritedFrom !== upstream.workflowRunUid) throw Error()
      warningIds.add(item.warningId)
    }
    if (output.warnings.length && output.workflowStatus !== 'completed_with_warnings') throw Error()
    if (completionIds.size && !['model_completed_pending_confirmation', 'not_recommended_for_filing'].includes(output.deliverableStatus)) throw Error()
    const fence = value => { const ticks = '`'.repeat(Math.max(3, ...[...value.matchAll(/`+/g)].map(m => m[0].length + 1))); return `${ticks}text\n${value}\n${ticks}` }
    const risk = original.replaceAll('\r\n','\n').split(/^## 风险与待确认事项\n/m).slice(1).join('\n## 风险与待确认事项\n')
    const provenance = run.contextSnapshot?.skillProvenance
    const thirdParty = provenance?.skillId === PATENT_DISCLOSURE_CLAIMS_ID
    const realSkill = thirdParty ? '中国专利 Skill（第三方）' : '正式内置 Skill'
    const inputInfo = Object.fromEntries(Object.entries(fields).map(([id,body]) => [id, { status: body.trim() ? 'accepted' : 'not_provided', sha256: createHash('sha256').update(body).digest('hex'), source: '用户文本' }]))
    const info = {
      node_id: 'Flow-2-6', business_version: thirdParty ? provenance.skillVersion
        : ['0.2.1', '0.2.2'].includes(provenance?.skillVersion) ? provenance.skillVersion : '0.2.0', composition_version: '2',
      skill_id: provenance?.skillId ?? 'none', skill_version: provenance?.skillVersion ?? 'none',
      evidence_kind: run.evidenceKind ?? 'synthetic', input_schema: 'claims-disclosure-2', output_schema: 'claims-cumulative-2',
      execution_contract: provenance?.executionContractVersion ?? 'synthetic',
      workflow_run_uid: uid, run_uid8: uid8, generated_at: `${localTime}+08:00`, filename: fileName,
      upstream_run_uid: upstream.workflowRunUid ?? 'none', upstream_filename: upstream.relativePath?.split(/[\\/]/).at(-1) ?? 'none',
      upstream_file_sha256: upstream.sha256 ?? 'none', input_sha256: run.inputSnapshot.sha256 ?? 'not_provided',
      workflow_status: 'completed_with_warnings', deliverable_status: 'not_recommended_for_filing',
    }
    const json = value => fence(JSON.stringify(value, null, 2))
    const body = `# 权利要求书累计文稿\n\n## 文档信息\n\n${Object.entries(info).map(([k,v]) => `- ${k}: ${v}`).join('\n')}\n\n${run.evidenceKind === 'native-model' ? `${realSkill} ${provenance.skillId}/${provenance.skillVersion} 经 DSH 原生模型生成；待人工专业审核。` : run.evidenceKind === 'native-offline' && provenance?.skillId === 'flow-2-6' && ['0.2.0', '0.2.1', '0.2.2'].includes(provenance?.skillVersion) ? `正式内置 Skill flow-2-6/${provenance.skillVersion} 已加载；结果为离线合成，未调用真实模型；专业质量未评估。` : '公开替身/合成验收，未运行私有 flow-2-6/0.2.0；专业质量未评估。'}\n\n${json(inputInfo)}\n\n## 核心结论\n\n${output.summary}\n\n模型建议：${output.workflowStatus} / ${output.deliverableStatus}（不是人工审核）。\n\n## 核心结果\n\n${output.draftMarkdown}\n\n### 特征矩阵\n\n${output.featureMatrixMarkdown}\n\n### 从属回退\n\n${output.fallbackMarkdown}\n\n### T4 与初检\n\n${output.supportMatrixMarkdown}\n\n## 下游读取区\n\n### 上游实际原文（固定基线）\n\n${original ? fence(original) : '上游累计材料缺失；未提供文件。'}\n\n### 当前有效上游内容\n\n${replacements.length ? fence(effective) : '与本文件上方完整固定基线一致；未替换。'}\n\n### 本次实际输入\n\n${json(fields)}\n\n### 本节点当前结果\n\n${json({ claims: output.draftMarkdown, featureMatrix: output.featureMatrixMarkdown, fallback: output.fallbackMarkdown, T4: output.supportMatrixMarkdown, T5: 'not_yet_generated', T6: 'not_yet_generated' })}\n\n### 更新与补齐登记\n\n${json({ snapshotUpdates: output.snapshotUpdates, modelCompletions: output.modelCompletions })}\n\n## 风险与待确认事项\n\n### Host 提示\n\n${upstream.status === 'missing' ? '上游累计材料缺失。' : upstream.status === 'warning' ? upstream.issues.join('；') : '上游身份字段已核对；内容真实性与人工修改原因未核验。'}\n${run.evidenceKind === 'native-model' ? '模型生成不等于专业审核通过；未经专业审核不建议申报。' : '公开验收，专业质量未评估，不可用于申报。'}\n\n### 继承警示（不由模型删除或关闭）\n\n${risk ? fence(risk) : original ? '无法单独解析警示；完整上游原文已保留，不能视为无风险。' : '未提供上游，继承风险未评估。'}\n\n### 本次模型警示与补齐\n\n${json({ warnings: output.warnings, modelCompletions: output.modelCompletions })}\n`
    if (body.length > 100000 || Buffer.byteLength(body, 'utf8') > 256 * 1024) throw Error()
    return { body, fileName }
  } catch { throw Object.assign(new Error('INVALID_OUTPUT'), { code: 'INVALID_OUTPUT' }) }
}

// Explicitly public synthetic business data, shared by the two isolated test sources.
export function publicClaimsV2Output(fields, upstream = missingUpstream) {
  claimsV2DraftValuesSchema.parse(fields)
  return { summary: '公开样本：仅验证合同 2 的文字交付链路。', draftMarkdown: `1. 公开合成权利要求样本：${fields.disclosure_text}`,
    featureMatrixMarkdown: '公开样本；逐特征专业分析未评估。', fallbackMarkdown: '公开样本；从属回退未评估。',
    supportMatrixMarkdown: '公开样本；说明书尚未生成；T4 专业检查未评估。', snapshotUpdates: [],
    warnings: [{ warningId: 'public-unassessed', inheritedFrom: '', problem: upstream.status === 'missing' ? '上游累计材料缺失，专业质量未评估。' : '上游文件已读取，专业质量未评估。', affectedContent: '全部输出',
      currentHandling: '仅供隔离验收', modelCompletion: '未评估', deliverableImpact: '不可用于申报', recommendedAction: '另行专业核验', status: 'open' }],
    modelCompletions: [], workflowStatus: 'completed_with_warnings', deliverableStatus: 'not_recommended_for_filing' }
}
