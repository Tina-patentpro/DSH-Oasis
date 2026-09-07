import { z } from 'zod'

export const CLAIMS_TEMPLATE_ID = 'patent-claims'
export const CLAIMS_SCHEMA_VERSION = '1'
export const generationSourceSchema = z.enum(['local-skill', 'oasis-api'])

export function hasPendingUnifiedRun(task) {
  return Object.values(task?.runs ?? {}).some(run => run.mode === 'unified-fixture' && run.status === 'prepared')
}
export const generationDraftSchema = z.object({
  inputSchemaVersion: z.literal(CLAIMS_SCHEMA_VERSION),
  source: generationSourceSchema,
}).strict()

export const CLAIMS_FIELDS = Object.freeze([
  ['claims', '权利要求书', 20000, true],
  ['technicalField', '技术领域', 12000, false],
  ['background', '背景技术', 12000, false],
  ['benefits', '有益效果', 12000, false],
  ['embodiments', '具体实施方式', 20000, false],
  ['drawings', '附图说明', 12000, false],
  ['instructions', '用户指令', 4000, false],
].map(([fieldId, label, maxChars, required]) => Object.freeze({
  fieldId, label, maxChars, required, control: 'long-text', description: '',
})))

// Drafts may be incomplete; execution validation remains in the Host catalog.
export const claimsDraftValuesSchema = z.object(Object.fromEntries(
  CLAIMS_FIELDS.map(f => [f.fieldId, z.string().max(f.maxChars)]),
)).strict()

export function generationUnavailableReason(source) {
  generationSourceSchema.parse(source)
  return source === 'local-skill'
    ? '本地 Skills 未启用：保密边界待确认'
    : '专业 API 未启用：服务绑定待核实'
}
