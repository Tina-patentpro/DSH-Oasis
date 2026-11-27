import { z } from 'zod'
import { hasPendingV340Run } from './v340-runtime-contract.js'

export const CLAIMS_TEMPLATE_ID = 'patent-claims'
export const CLAIMS_SCHEMA_VERSION = '1'
export const CLAIMS_V2_SCHEMA_VERSION = 'claims-disclosure-2'
export const claimsInputVersion = version => version === '2' ? CLAIMS_V2_SCHEMA_VERSION : CLAIMS_SCHEMA_VERSION
export const generationSourceSchema = z.enum(['local-skill', 'oasis-api'])
export const claimsUpstreamReferenceSchema = z.object({
  kind: z.literal('project-file'), relativePath: z.string().min(1).max(1024), displayName: z.string().min(1).max(255),
  mediaType: z.literal('text/markdown'), sizeBytes: z.number().int().positive().max(65536), sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict()

export function hasPendingUnifiedRun(task) {
  return hasPendingV340Run(task) || Object.values(task?.runs ?? {}).some(run => isUnifiedRun(run)
    && (run.status === 'prepared' || run.mode === 'dsh-local' && run.status === 'unknown'))
}
export function isUnifiedRun(run) { return ['unified-fixture', 'dsh-local', 'oasis-api'].includes(run?.mode) }
export const generationDraftSchema = z.object({
  inputSchemaVersion: z.enum([CLAIMS_SCHEMA_VERSION, CLAIMS_V2_SCHEMA_VERSION]),
  source: generationSourceSchema,
  upstream: claimsUpstreamReferenceSchema.optional(),
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

export const CLAIMS_V2_FIELDS = Object.freeze([
  ['disclosure_text', '技术交底', 20000, true],
  ['drawings_text', '附图说明', 12000, false],
  ['claim_requirements_text', '撰写要求', 8000, false],
  ['user_input', '用户指令', 4000, false],
].map(([fieldId, label, maxChars, required]) => Object.freeze({ fieldId, label, maxChars, required, control: 'long-text', description: '' })))
export const claimsV2DraftValuesSchema = z.object(Object.fromEntries(
  CLAIMS_V2_FIELDS.map(f => [f.fieldId, z.string().max(f.maxChars)]),
)).strict()
export const missingUpstreamSchema = z.object({ status: z.literal('missing'), reason: z.literal('not-connected') }).strict()
export const claimsUpstreamSnapshotSchema = z.union([missingUpstreamSchema, z.object({
  status: z.enum(['accepted', 'warning']), body: z.string().min(1).max(24000), relativePath: z.string().min(1).max(1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/), sourceNode: z.literal('Flow-1-5').nullable(),
  workflowRunUid: z.string().uuid().nullable(), generatedAt: z.string().max(64).nullable(),
  issues: z.array(z.string().max(128)).max(8),
}).strict()])

export function generationUnavailableReason(source) {
  generationSourceSchema.parse(source)
  return source === 'local-skill'
    ? 'DSH 模型服务暂不可用：请检查当前项目会话及 DSH 模型设置'
    : '专业 API 未启用：服务绑定待核实'
}
