import { z } from 'zod'

// C4-R1 client schemas. Native M06 seven-field output is a different contract.
// Conditional/cross-field rules are enforced by m06-fast39-result.js, not erased
// through a JSON-schema converter that cannot represent them.
export const FAST39_INPUT_IDS = Object.freeze([
  'upstream_md_file', 'disclosure_file', 'disclosure_text', 'drawings_file',
  'drawings_text', 'claim_requirements_file', 'claim_requirements_text', 'user_input',
])
export const FAST39_DIRECT_FIELDS = Object.freeze([
  'technical_field', 'background_art_TD', 'technical_solutions',
  'beneficial_effects_TD', 'embodiments_TD', 'drawings_explain_TD',
])
export const FAST39_OUTPUT_IDS = Object.freeze([
  'output', 'claims_text', 'dependency_tree', 'pending_confirmation', 'quality_report', 'quality_status',
])
import { FAST39_LIMITS, assertFast39Json, parseFast39Json } from './m06-fast39-json.js'
export { FAST39_LIMITS } from './m06-fast39-json.js'

const text = (min, max) => z.string().refine(s => {
  const length = Array.from(s).length
  return length >= min && length <= max
}, `text must contain ${min}..${max} Unicode scalar values`)
const hash = z.string().regex(/^[a-f0-9]{64}$/)
const id = text(1, 256)
const claimId = z.string().regex(/^[1-9][0-9]{0,3}$/)
const planId = z.string().regex(/^plan:(core|parallel:[1-9][0-9]*|cluster:[1-9][0-9]*)$/)
const coordinate = z.number().int().min(0).max(1048576)
const outputCoordinate = z.number().int().min(0).max(100000)
const status = z.enum(['ok', 'partial', 'insufficient'])
const stringList = z.array(text(1, 8000)).max(256)
const warningList = z.array(text(0, 8000)).max(256)
const inputWarnings = z.array(z.record(z.string(), z.unknown())).max(256)
const target = z.object({ planned_claim_id: planId, feature_id: id }).strict()
const outlineQuality = z.object({ fallback_hint: text(0, 8000), status, warnings: stringList }).strict()
const sourceShape = {
  planned_claim_id: planId, feature_id: id, input_id: z.enum(FAST39_INPUT_IDS),
  source_sha256: hash, start_utf16: coordinate, end_utf16: coordinate, quote: text(1, 4096),
}
const plannedClaim = z.object({ planned_claim_id: planId,
  role: z.enum(['core_root', 'parallel_root', 'dependent_cluster']), original_id: id.nullable(),
  feature_ids: z.array(id).max(256),
}).strict()
const anchorBasis = z.object({
  planned_claims: z.array(plannedClaim).min(1).max(128),
  critical_feature_targets: z.array(target).max(512),
  outline_source_map: z.array(z.object(sourceShape).strict()).max(1024),
  outline_quality: outlineQuality, outline_error: text(0, 8000),
}).strict()
const disposition = z.object({ planned_claim_id: planId, feature_id: id,
  claim_id: claimId.nullable(), action: z.enum(['kept', 'rephrased', 'blocked_missing_support']),
  output_quote: text(0, 4096), output_start_utf16: outputCoordinate.nullable(), output_end_utf16: outputCoordinate.nullable(),
  locator_status: z.enum(['verified', 'unverified', 'not_applicable']), reason: text(1, 2000),
}).strict()

export const fast39QualityReportSchema = z.object({
  outline_quality: outlineQuality, outline_error: text(0, 8000),
  marker_warnings: warningList, dependency_warnings: warningList, dependency_parse_status: id,
  dependency_edges: z.array(z.object({ parent: claimId, child: claimId }).strict()).max(1024),
  claim_count: z.number().int().min(1).max(9999), quality_status: status,
  acceptance: z.literal('draft_requires_review_not_professional_acceptance'),
  contract_version: z.literal('flow26-quality-3'), source_trace_version: z.literal('flow26-source-trace-3'),
  source_status: z.enum(['mapped', 'unverified']),
  outline_anchor: z.object({ basis: anchorBasis, sha256: hash }).strict(),
  source_map: z.array(z.object({ ...sourceShape, claim_id: claimId.nullable() }).strict()).max(1024),
  claim_id_map: z.array(z.object({ planned_claim_id: planId, final_claim_id: claimId.nullable(), reason: text(1, 2000) }).strict()).min(1).max(128),
  feature_dispositions: z.array(disposition).max(1024),
  feature_coverage: z.object({ status: z.enum(['complete', 'incomplete', 'unverified']),
    missing_core_targets: z.array(target).max(512), unverified_core_targets: z.array(target).max(512),
  }).strict(),
  input_warnings: inputWarnings, limitations: stringList, required_missing_input_lines: stringList,
  support_review_status: z.literal('not_assessed'), source_registry_sha256: hash,
  receipt_mapping_version: z.literal('flow26-receipt-map-1'),
  anchor_assurance: z.literal('workflow_branch_client_self_consistency_only'),
  coverage_basis: z.literal('reported_outline_anchor'),
}).strict()

export const fast39OutputsSchema = z.object({
  output: z.string().min(1), claims_text: z.string().min(1), dependency_tree: z.string().min(1),
  pending_confirmation: z.string().min(1), quality_report: z.string().min(1), quality_status: status,
}).strict()

const originalReceipt = z.object({ status: z.enum(['accepted', 'warning', 'not_provided']),
  sha256: z.union([hash, z.literal('none')]), filename: text(1, 1000), content_origin: id,
}).strict()
export const fast39RegistrySchema = z.object({
  version: z.literal('flow26-source-trace-3'), source_mode: z.literal('packet2'),
  entries: z.array(z.object({ input_id: z.enum(FAST39_INPUT_IDS),
    role: z.enum(['technical_material', 'output_requirement', 'manual_instruction']),
    status: z.enum(['provided', 'not_provided', 'unverified']), text: text(0, 1048576).nullable(),
    source_sha256: hash.nullable(), receipt_sha256: hash.nullable(), filename: text(1, 1000).nullable(),
    original_receipt: originalReceipt,
  }).strict()).length(8),
  packet_text_sha256: hash, original_input_hash_claim: hash.nullable(), actual_user_input_sha256: hash,
  input_warnings: inputWarnings, limitations: stringList, required_missing_input_lines: stringList,
  receipt_mapping_version: z.literal('flow26-receipt-map-1'),
}).strict()

const encoder = new TextEncoder()
const uuid = z.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/)
export const fast39ProviderReceiptSchema = z.object({
  hash_version: z.literal('provider-http-content-bytes-1'), sha256: hash,
  byte_length: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  http_status: z.number().int().min(200).max(299), body_retention: z.literal('hash_only'),
}).strict()
export const fast39NormalHeaderSchema = z.object({ contract_version: z.literal('flow26-fast-result-3'),
  request_key: text(1, 256), workflow_run_id: uuid, provider_status: z.literal('succeeded'),
  provider_response_receipt: fast39ProviderReceiptSchema,
}).strict()
const contentCodes = ['FAST39_SCOPE_MISMATCH', 'FAST39_RESULT_FIELDS_INVALID', 'FAST39_RESULT_TOO_LARGE',
  'FAST39_BINDING_MISMATCH', 'FAST39_NO_SUPPORTED_CLAIM', 'FAST39_INPUT_RECEIPT_INVALID']
const executionRows = {
  failed: ['failed', 'FAST39_PROVIDER_FAILED'], stopped: ['failed', 'FAST39_PROVIDER_STOPPED'],
  running: ['pending', 'FAST39_PROVIDER_PENDING'], unknown: ['unknown', 'FAST39_PROVIDER_STATUS_UNKNOWN'],
}
export const fast39ErrorBodySchema = z.object({
  contract_version: z.literal('flow26-fast-result-3'), request_key: text(1, 256), workflow_run_id: uuid.nullable(),
  phase: z.enum(['execution', 'correlation', 'content']),
  provider_status: z.enum(['succeeded', 'failed', 'stopped', 'running', 'unknown']),
  execution_outcome: z.enum(['succeeded', 'failed', 'pending', 'unknown', 'uncorrelated']),
  code: z.enum([...contentCodes, 'FAST39_PROVIDER_FAILED', 'FAST39_PROVIDER_STOPPED', 'FAST39_PROVIDER_PENDING',
    'FAST39_PROVIDER_STATUS_UNKNOWN', 'FAST39_RUN_ID_INVALID']), response_received: z.literal(true),
  retention: z.enum(['enhanced_fragment_preserved', 'hash_only_not_persisted']),
  provider_response_receipt: fast39ProviderReceiptSchema,
}).strict().superRefine((value, ctx) => {
  const row = executionRows[value.provider_status]
  const valid = value.phase === 'correlation'
    ? value.workflow_run_id === null && value.execution_outcome === 'uncorrelated' && value.code === 'FAST39_RUN_ID_INVALID'
    : value.workflow_run_id !== null && (value.phase === 'content'
      ? value.provider_status === 'succeeded' && value.execution_outcome === 'succeeded' && contentCodes.includes(value.code)
      : row && value.execution_outcome === row[0] && value.code === row[1])
  if (!valid) ctx.addIssue({ code: 'custom', message: 'Fast39 phase/provider/outcome/code conflict' })
})
const receivedText = z.string().max(FAST39_LIMITS.outputUtf16).refine(s => s.isWellFormed() && !s.includes('\0')
  && encoder.encode(s).byteLength <= FAST39_LIMITS.outputBytes)
export const fast39ReceivedOutputsSchema = z.object(Object.fromEntries(FAST39_OUTPUT_IDS.map(key => [key, receivedText.optional()]))).strict()
export const fast39NormalBodySchema = fast39NormalHeaderSchema.extend({ outputs: fast39OutputsSchema }).strict().superRefine((value, ctx) => {
  try {
    assertFast39Json(value)
    if (Object.values(value.outputs).some(s => !receivedText.safeParse(s).success)) throw new Error()
    const q = fast39QualityReportSchema.parse(parseFast39Json(value.outputs.quality_report))
    if (q.quality_status !== value.outputs.quality_status) throw new Error()
  } catch { ctx.addIssue({ code: 'custom', message: 'Fast39 bounded outputs/report shape invalid' }) }
})
const fragment = z.union([
  z.object({ structured_result: fast39NormalBodySchema }).strict(),
  z.object({ structured_result_error: fast39ErrorBodySchema }).strict(),
])
export const fast39EvidenceSchema = z.object({
  version: z.literal('flow26-fast-evidence-3'), frozen_delivery_sha256: hash,
  original_enqueue_fact: z.enum(['queued', 'not_queued', 'unknown']),
  validation: z.object({ shape: z.enum(['valid', 'invalid', 'not_assessed']),
    source: z.enum(['mapped', 'unverified', 'not_assessed']), support: z.literal('not_assessed'),
    capacity: z.enum(['within_budget', 'rejected']),
    anchor: z.literal('reported_self_consistent_original_outline_not_independently_available'),
    provider_receipt: z.literal('backend_reported_bytes_not_recomputed_by_client'),
  }).strict(), fragment, received_outputs: fast39ReceivedOutputsSchema.optional(),
}).strict().superRefine((value, ctx) => {
  try {
    assertFast39Json(value)
    if (encoder.encode(JSON.stringify(value)).byteLength > FAST39_LIMITS.evidenceBytes) throw new Error()
    const normal = value.fragment.structured_result
    if (normal) {
      const q = parseFast39Json(normal.outputs.quality_report)
      if (Object.hasOwn(value, 'received_outputs') || value.validation.shape !== 'valid'
        || value.validation.capacity !== 'within_budget' || value.validation.source !== q.source_status) throw new Error()
    } else if (value.fragment.structured_result_error.retention === 'hash_only_not_persisted' && Object.hasOwn(value, 'received_outputs')) throw new Error()
  } catch { ctx.addIssue({ code: 'custom', message: 'Fast39 evidence ownership/shape/capacity conflict' }) }
})

export function fast39EvidenceStatus(evidence) {
  const error = evidence.fragment.structured_result_error
  return !error ? 'completed' : error.phase === 'content' || (error.phase === 'execution' && error.execution_outcome === 'failed')
    ? 'failed' : 'submission-unknown'
}
