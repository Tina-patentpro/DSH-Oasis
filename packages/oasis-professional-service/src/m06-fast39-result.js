import { assertFast39Text as scalarText, assertFast39Json as checkJson, fast39CanonicalJson, parseFast39Json } from './m06-fast39-json.js'
export { fast39CanonicalJson, parseFast39Json } from './m06-fast39-json.js'
import { createHash } from 'node:crypto'
import { parseWorkbenchRecord } from './workbench-domain.js'
import { WORKBENCH_LIMITS } from './workbench-contract.js'
import { V340_LIMITS } from './v340-runtime-contract.js'
import { prepareV340Inputs } from './v340-document.js'
import { prepareM06WorkareaConstrainedCalibration } from './m06-workarea-material-packet.js'
import {
  FAST39_INPUT_IDS, FAST39_DIRECT_FIELDS, FAST39_LIMITS,
  FAST39_OUTPUT_IDS, fast39RegistrySchema, fast39OutputsSchema, fast39QualityReportSchema,
  fast39NormalHeaderSchema, fast39NormalBodySchema, fast39ErrorBodySchema,
  fast39EvidenceSchema, fast39EvidenceStatus,
} from './m06-fast39-contract.js'

const digest = text => createHash('sha256').update(text, 'utf8').digest('hex')
function fail(code = 'FAST39_RESULT_FIELDS_INVALID') {
  throw Object.assign(new Error('Fast39结果不符合冻结合同；未截断、补造或重新派发。'), { code })
}
function need(value, code) { if (!value) fail(code) }
const same = (a, b) => fast39CanonicalJson(a) === fast39CanonicalJson(b)
const sameSet = (a, b) => {
  const aa = a.map(fast39CanonicalJson), bb = b.map(fast39CanonicalJson)
  return new Set(aa).size === aa.length && new Set(bb).size === bb.length && same(aa.sort(), bb.sort())
}

function shape(schema, value, code = 'FAST39_RESULT_FIELDS_INVALID') {
  const result = schema.safeParse(value); need(result.success, code); return result.data
}
function role(id) {
  return id === 'user_input' ? 'manual_instruction' : id.startsWith('claim_requirements_') ? 'output_requirement' : 'technical_material'
}
export function validateM06Fast39Registry(value) {
  checkJson(value)
  const reg = shape(fast39RegistrySchema, value, 'FAST39_INPUT_RECEIPT_INVALID')
  for (const [index, entry] of reg.entries.entries()) {
    const r = entry.original_receipt, manual = entry.input_id === 'user_input'
    need(entry.input_id === FAST39_INPUT_IDS[index] && entry.role === role(entry.input_id), 'FAST39_INPUT_RECEIPT_INVALID')
    if (r.status === 'not_provided') {
      need(r.sha256 === 'none' && r.filename === 'not_provided' && r.content_origin === 'none'
        && entry.status === 'not_provided' && entry.text === (manual ? null : '')
        && entry.filename === null && entry.source_sha256 === null && entry.receipt_sha256 === null, 'FAST39_INPUT_RECEIPT_INVALID')
    } else {
      need(/^[a-f0-9]{64}$/.test(r.sha256) && entry.receipt_sha256 === r.sha256, 'FAST39_INPUT_RECEIPT_INVALID')
      need(entry.status === (!manual && r.status === 'accepted' ? 'provided' : 'unverified'), 'FAST39_INPUT_RECEIPT_INVALID')
      if (manual) need(entry.text === null && entry.source_sha256 === null && entry.filename === null, 'FAST39_INPUT_RECEIPT_INVALID')
      else {
        need(typeof entry.text === 'string' && digest(entry.text) === entry.source_sha256, 'FAST39_INPUT_RECEIPT_INVALID')
        if (r.status === 'accepted') need(entry.source_sha256 === r.sha256, 'FAST39_INPUT_RECEIPT_INVALID')
        need(entry.filename === (entry.input_id.endsWith('_file') ? r.filename : null), 'FAST39_INPUT_RECEIPT_INVALID')
        need(entry.input_id === 'upstream_md_file' ? Buffer.byteLength(entry.text, 'utf8') <= 1048576 : entry.text.length <= 300000,
          'FAST39_RESULT_TOO_LARGE')
      }
    }
  }
  return reg
}

export function buildM06Fast39Registry({ prepared, packetText, User_input, directFields, documentCount }) {
  need(documentCount === 1 && directFields && same(Object.keys(directFields).sort(), [...FAST39_DIRECT_FIELDS].sort())
    && Object.values(directFields).every(v => v === ''), 'FAST39_SCOPE_MISMATCH')
  need(prepared?.nodeId === 'Flow-2-6', 'FAST39_SCOPE_MISMATCH')
  let fresh, proposal
  try {
    fresh = prepareV340Inputs('Flow-2-6', prepared.values)
    need(same(fresh, prepared), 'FAST39_INPUT_RECEIPT_INVALID')
    proposal = prepareM06WorkareaConstrainedCalibration(fresh)
  } catch (error) {
    if (error?.code?.startsWith('FAST39_')) throw error
    fail(error?.code === 'M06_PACKET_TOO_LARGE' ? 'FAST39_RESULT_TOO_LARGE' : 'FAST39_INPUT_RECEIPT_INVALID')
  }
  need(packetText === new TextDecoder().decode(proposal.document.bytes) && User_input === proposal.apiTextInputs.User_input,
    'FAST39_SCOPE_MISMATCH')
  const packet = parseFast39Json(packetText, FAST39_LIMITS.packetBytes)
  const entries = FAST39_INPUT_IDS.map(id => {
    const r = fresh.receipts[id], manual = id === 'user_input', absent = r.status === 'not_provided'
    const raw = fresh.values[id], text = manual ? null : absent ? '' : typeof raw === 'string' ? raw : raw.body
    return { input_id: id, role: role(id), status: absent ? 'not_provided' : !manual && r.status === 'accepted' ? 'provided' : 'unverified',
      text, source_sha256: manual || absent ? null : digest(text), receipt_sha256: absent ? null : r.sha256,
      filename: !absent && id.endsWith('_file') ? r.filename : null, original_receipt: structuredClone(r) }
  })
  return validateM06Fast39Registry({ version: 'flow26-source-trace-3', source_mode: 'packet2', entries,
    packet_text_sha256: digest(packetText), original_input_hash_claim: packet.inputHash,
    actual_user_input_sha256: digest(User_input), input_warnings: structuredClone(packet.inputWarnings),
    limitations: structuredClone(packet.limitations), required_missing_input_lines: structuredClone(packet.semanticContract.requiredMissingInputLines),
    receipt_mapping_version: 'flow26-receipt-map-1' })
}

import { renderM06Fast39Pending, renderM06Fast39Output, visibleFast39Sections } from './m06-fast39-render.js'
export { renderM06Fast39Pending, renderM06Fast39Output, visibleFast39Sections } from './m06-fast39-render.js'

const tuple = v => JSON.stringify([v.planned_claim_id, v.feature_id])
function unique(values) { return new Set(values).size === values.length }
function sourceValid(s, entries) {
  const e = entries.get(s.input_id)
  need(e && e.role === 'technical_material' && e.status === 'provided' && e.source_sha256 === s.source_sha256)
  const a = s.start_utf16, b = s.end_utf16, raw = e.text
  need(a >= 0 && a < b && b <= raw.length && b <= FAST39_LIMITS.sourceCoordinate
    && raw.slice(a, b).isWellFormed() && raw.slice(a, b) === s.quote)
}
function claimSegments(text) {
  need(text === text.trim() && !text.includes('\r'))
  const starts = [...text.matchAll(/^([1-9][0-9]{0,3})\. /gm)]
  need(starts.length && starts[0].index === 0, 'FAST39_NO_SUPPORTED_CLAIM')
  return starts.map((m, index) => {
    need(m[1] === String(index + 1))
    const bodyStart = m.index + m[0].length
    const end = (index + 1 < starts.length ? starts[index + 1].index : text.length)
    const body = text.slice(bodyStart, end).trimEnd()
    need(body.trim().length > 0 && !/^\s*[0-9]+[.、．]/m.test(body))
    return { id: m[1], body, bodyStart }
  })
}

// This client view proves reported self-consistency against caller-owned frozen
// materials. It does not attest the original Outline, provider bytes or support.
export function validateM06Fast39Outputs(value, { registry }) {
  checkJson(value)
  for (const v of Object.values(value)) if (typeof v === 'string') {
    need(v.length <= FAST39_LIMITS.outputUtf16 && Buffer.byteLength(v, 'utf8') <= FAST39_LIMITS.outputBytes, 'FAST39_RESULT_TOO_LARGE')
  }
  if (typeof value.claims_text === 'string') need(value.claims_text.trim().length > 0, 'FAST39_NO_SUPPORTED_CLAIM')
  const outputs = shape(fast39OutputsSchema, value)
  const q = shape(fast39QualityReportSchema, parseFast39Json(outputs.quality_report))
  const reg = validateM06Fast39Registry(registry), basis = q.outline_anchor.basis
  need(q.source_registry_sha256 === digest(fast39CanonicalJson(reg)), 'FAST39_BINDING_MISMATCH')
  need(q.outline_anchor.sha256 === digest(fast39CanonicalJson(basis)), 'FAST39_BINDING_MISMATCH')
  need(same(q.input_warnings, reg.input_warnings) && same(q.limitations, reg.limitations)
    && same(q.required_missing_input_lines, reg.required_missing_input_lines), 'FAST39_BINDING_MISMATCH')
  need(same(q.outline_quality, basis.outline_quality) && q.outline_error === basis.outline_error)
  const plans = basis.planned_claims, planIds = plans.map(p => p.planned_claim_id)
  need(unique(planIds) && planIds.filter(id => id === 'plan:core').length === 1)
  const targets = []
  for (const p of plans) {
    const expected = p.planned_claim_id === 'plan:core' ? 'core_root' : p.planned_claim_id.startsWith('plan:parallel:') ? 'parallel_root' : 'dependent_cluster'
    need(p.role === expected && unique(p.feature_ids) && (expected === 'dependent_cluster' || p.feature_ids.length > 0))
    if (p.role !== 'dependent_cluster') for (const feature_id of p.feature_ids) targets.push({ planned_claim_id: p.planned_claim_id, feature_id })
  }
  need(sameSet(basis.critical_feature_targets, targets))
  const allFeatures = plans.flatMap(p => p.feature_ids.map(feature_id => ({ planned_claim_id: p.planned_claim_id, feature_id })))
  const featureSet = new Set(allFeatures.map(tuple))
  const entries = new Map(reg.entries.map(e => [e.input_id, e]))
  for (const s of basis.outline_source_map) { need(featureSet.has(tuple(s))); sourceValid(s, entries) }
  need(unique(basis.outline_source_map.map(fast39CanonicalJson)))
  need(same(q.claim_id_map.map(m => m.planned_claim_id), planIds))
  const segments = claimSegments(outputs.claims_text), byClaim = new Map(segments.map(s => [s.id, s]))
  const mappings = new Map(q.claim_id_map.map(m => [m.planned_claim_id, m.final_claim_id]))
  const emitted = q.claim_id_map.filter(m => m.final_claim_id !== null)
  need(q.claim_count === segments.length && emitted.length === segments.length
    && emitted.every((m, i) => m.final_claim_id === String(i + 1)))
  need(same(q.feature_dispositions.map(d => ({ planned_claim_id: d.planned_claim_id, feature_id: d.feature_id })), allFeatures))
  const expectedSources = basis.outline_source_map.map(s => ({ ...s, claim_id: mappings.get(s.planned_claim_id) }))
  need(sameSet(q.source_map, expectedSources))
  const supported = new Set(basis.outline_source_map.map(tuple)), missing = [], unverified = []
  let anyBlocked = false, anyUnverified = false
  const targetSet = new Set(targets.map(tuple))
  for (const d of q.feature_dispositions) {
    const key = tuple(d)
    if (d.action === 'blocked_missing_support') {
      need(d.claim_id === null && d.output_quote === '' && d.output_start_utf16 === null
        && d.output_end_utf16 === null && d.locator_status === 'not_applicable')
      anyBlocked = true
      if (targetSet.has(key)) missing.push({ planned_claim_id: d.planned_claim_id, feature_id: d.feature_id })
      continue
    }
    need(d.claim_id !== null && d.claim_id === mappings.get(d.planned_claim_id) && supported.has(key) && d.output_quote.length > 0)
    const segment = byClaim.get(d.claim_id); need(segment)
    const first = segment.body.indexOf(d.output_quote)
    const single = first !== -1 && segment.body.indexOf(d.output_quote, first + 1) === -1
    if (single) {
      need(d.locator_status === 'verified' && d.output_start_utf16 === segment.bodyStart + first
        && d.output_end_utf16 === segment.bodyStart + first + d.output_quote.length)
    } else {
      need(d.locator_status === 'unverified' && d.output_start_utf16 === null && d.output_end_utf16 === null)
      anyUnverified = true
      if (targetSet.has(key)) unverified.push({ planned_claim_id: d.planned_claim_id, feature_id: d.feature_id })
    }
  }
  for (const m of emitted) need(q.feature_dispositions.some(d => d.planned_claim_id === m.planned_claim_id
    && d.action !== 'blocked_missing_support' && supported.has(tuple(d))), 'FAST39_NO_SUPPORTED_CLAIM')
  const expectedCoverage = { status: anyBlocked ? 'incomplete' : anyUnverified ? 'unverified' : 'complete',
    missing_core_targets: missing, unverified_core_targets: unverified }
  need(q.feature_coverage.status === expectedCoverage.status
    && sameSet(q.feature_coverage.missing_core_targets, missing) && sameSet(q.feature_coverage.unverified_core_targets, unverified))
  const graph = new Map(segments.map(s => [s.id, []])), parents = new Set()
  need(unique(q.dependency_edges.map(e => JSON.stringify([e.parent, e.child]))))
  for (const edge of q.dependency_edges) {
    need(byClaim.has(edge.parent) && byClaim.has(edge.child) && edge.parent !== edge.child)
    graph.get(edge.parent).push(edge.child); parents.add(edge.child)
  }
  const visited = new Set(), visiting = new Set()
  function visit(id) {
    need(!visiting.has(id)); if (visited.has(id)) return
    visiting.add(id); for (const child of graph.get(id)) visit(child); visiting.delete(id); visited.add(id)
  }
  for (const id of graph.keys()) visit(id)
  for (const p of plans) {
    const id = mappings.get(p.planned_claim_id)
    if (id !== null) need(parents.has(id) === (p.role === 'dependent_cluster'))
  }
  const rank = { ok: 0, partial: 1, insufficient: 2 }
  let minimum = rank[q.outline_quality.status]
  if (expectedCoverage.status !== 'complete' || q.source_status === 'unverified' || q.dependency_parse_status !== 'ok') minimum = 2
  else if (q.outline_error || q.outline_quality.fallback_hint || q.outline_quality.warnings.length || q.marker_warnings.length
    || q.dependency_warnings.length || q.input_warnings.length || q.limitations.length || q.required_missing_input_lines.length) minimum = Math.max(minimum, 1)
  need(rank[q.quality_status] >= minimum && outputs.quality_status === q.quality_status)
  need(outputs.pending_confirmation === renderM06Fast39Pending(q) && outputs.output === renderM06Fast39Output(outputs, q))
  need(same(visibleFast39Sections(outputs.output), ['权利要求草稿', '材料缺项与未确认事项', '技术特征来源']))
  return q
}

function contentError(normal, code, retention = 'enhanced_fragment_preserved') {
  return { contract_version: normal.contract_version, request_key: normal.request_key,
    workflow_run_id: normal.workflow_run_id, phase: 'content', provider_status: 'succeeded', execution_outcome: 'succeeded',
    code, response_received: true, retention, provider_response_receipt: structuredClone(normal.provider_response_receipt) }
}
export function shrinkM06Fast39Evidence(value) {
  const evidence = structuredClone(value)
  const normal = evidence.fragment.structured_result
  evidence.fragment = { structured_result_error: normal
    ? contentError(normal, 'FAST39_RESULT_TOO_LARGE', 'hash_only_not_persisted')
    : { ...evidence.fragment.structured_result_error, retention: 'hash_only_not_persisted' } }
  delete evidence.received_outputs
  evidence.validation.capacity = 'rejected'
  return shape(fast39EvidenceSchema, evidence)
}

// Receives an already returned fragment. No HTTP, provider-byte rehash, retry,
// enqueue or finance operation is performed here. Context is owned by the caller.
export function inspectM06Fast39Fragment({ fragment, requestKey, frozenDeliverySha256, originalEnqueueFact,
  registry, expectedWorkflowRunId }) {
  need(typeof frozenDeliverySha256 === 'string' && /^[a-f0-9]{64}$/.test(frozenDeliverySha256)
    && typeof requestKey === 'string' && requestKey.length > 0 && requestKey.length <= 256
    && ['queued', 'not_queued', 'unknown'].includes(originalEnqueueFact), 'FAST39_BINDING_MISMATCH')
  if (fragment === undefined) return { status: 'submission-unknown', code: 'FAST39_RESPONSE_UNAVAILABLE', evidence: null }
  need(fragment && typeof fragment === 'object' && !Array.isArray(fragment)
    && Object.keys(fragment).length === 1 && ['structured_result', 'structured_result_error'].includes(Object.keys(fragment)[0]))
  const normal = fragment.structured_result
  const header = normal ? shape(fast39NormalHeaderSchema, Object.fromEntries(
    ['contract_version', 'request_key', 'workflow_run_id', 'provider_status', 'provider_response_receipt'].map(k => [k, normal[k]])))
    : shape(fast39ErrorBodySchema, fragment.structured_result_error)
  need(header.request_key === requestKey && (expectedWorkflowRunId === undefined
    || header.workflow_run_id === expectedWorkflowRunId), 'FAST39_BINDING_MISMATCH')
  const evidence = { version: 'flow26-fast-evidence-3', frozen_delivery_sha256: frozenDeliverySha256,
    original_enqueue_fact: originalEnqueueFact, validation: { shape: 'not_assessed', source: 'not_assessed', support: 'not_assessed',
      capacity: 'within_budget', anchor: 'reported_self_consistent_original_outline_not_independently_available',
      provider_receipt: 'backend_reported_bytes_not_recomputed_by_client' }, fragment: structuredClone(fragment) }
  if (normal) {
    try {
      checkJson(normal)
      const q = validateM06Fast39Outputs(normal.outputs, { registry })
      shape(fast39NormalBodySchema, normal)
      evidence.validation.shape = 'valid'; evidence.validation.source = q.source_status
      if (!fast39EvidenceSchema.safeParse(evidence).success) return inspection(shrinkM06Fast39Evidence(evidence))
    } catch (error) {
      const codes = ['FAST39_SCOPE_MISMATCH', 'FAST39_RESULT_FIELDS_INVALID', 'FAST39_RESULT_TOO_LARGE',
        'FAST39_BINDING_MISMATCH', 'FAST39_NO_SUPPORTED_CLAIM', 'FAST39_INPUT_RECEIPT_INVALID']
      const code = codes.includes(error?.code) ? error.code : 'FAST39_RESULT_FIELDS_INVALID'
      evidence.fragment = { structured_result_error: contentError(header, code) }
      evidence.validation.shape = 'invalid'
      if (code === 'FAST39_RESULT_TOO_LARGE') evidence.validation.capacity = 'rejected'
      if (normal.outputs && typeof normal.outputs === 'object' && !Array.isArray(normal.outputs)) {
        evidence.received_outputs = Object.fromEntries(FAST39_OUTPUT_IDS.filter(k => Object.hasOwn(normal.outputs, k)
          && typeof normal.outputs[k] === 'string').map(k => [k, normal.outputs[k]]))
      }
      if (!fast39EvidenceSchema.safeParse(evidence).success) return inspection(shrinkM06Fast39Evidence(evidence))
    }
  }
  return inspection(shape(fast39EvidenceSchema, evidence))
}
function inspection(evidence) {
  return { status: fast39EvidenceStatus(evidence), code: evidence.fragment.structured_result_error?.code ?? null, evidence }
}

// Check the full prospective stored record, including legacy body duplication,
// JSON escapes, revision digits and all already present v340 state.
export function assertM06Fast39RecordCapacity(record) {
  const bytes = value => Buffer.byteLength(JSON.stringify(value), 'utf8')
  const legacy = { ...record, tasks: Object.fromEntries(Object.entries(record.tasks).map(([id, task]) => {
    const { v340, ...rest } = task; return [id, rest]
  })) }
  need(bytes(legacy) <= WORKBENCH_LIMITS.maxDraftBytes && bytes(record) <= V340_LIMITS.recordBytes, 'FAST39_RESULT_TOO_LARGE')
  for (const task of Object.values(record.tasks)) for (const run of Object.values(task.runs)) {
    if (run.result?.answerText !== undefined) need(Buffer.byteLength(run.result.answerText, 'utf8') <= WORKBENCH_LIMITS.maxJsonStringBytes, 'FAST39_RESULT_TOO_LARGE')
    if (run.result?.artifact) need(Buffer.byteLength(run.result.artifact.body, 'utf8') <= WORKBENCH_LIMITS.maxArtifactBytes, 'FAST39_RESULT_TOO_LARGE')
  }
  return parseWorkbenchRecord(record.workspaceId, record)
}
