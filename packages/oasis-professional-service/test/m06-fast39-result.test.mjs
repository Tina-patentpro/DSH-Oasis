import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { prepareV340Inputs } from '../src/v340-document.js'
import { prepareM06WorkareaConstrainedCalibration } from '../src/m06-workarea-material-packet.js'

const api = await import('../src/m06-fast39-result.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url?.endsWith('/m06-fast39-result.js')) return {}
  throw error
})
const examples = JSON.parse(await readFile(new URL('../../../docs/business-baseline/fast39-result-contract-candidate-4/examples.json', import.meta.url)))
const hash = text => createHash('sha256').update(text).digest('hex')
const clone = value => structuredClone(value)
const fields = Object.fromEntries(['technical_field', 'background_art_TD', 'technical_solutions', 'beneficial_effects_TD', 'embodiments_TD', 'drawings_explain_TD'].map(k => [k, '']))
function localInputs(values = { disclosure_text: '构件甲\r\n😀', user_input: '手动要求' }) {
  const prepared = prepareV340Inputs('Flow-2-6', values)
  const proposal = prepareM06WorkareaConstrainedCalibration(prepared)
  return { prepared, packetText: new TextDecoder().decode(proposal.document.bytes), User_input: proposal.apiTextInputs.User_input,
    directFields: clone(fields), documentCount: 1 }
}
function validate(outputs = clone(examples.structured_result.outputs), registry = clone(examples.source_registry_internal)) {
  return api.validateM06Fast39Outputs(outputs, { registry })
}
function mutateReport(change) {
  const outputs = clone(examples.structured_result.outputs)
  const report = JSON.parse(outputs.quality_report)
  change(report)
  outputs.quality_report = JSON.stringify(report)
  return outputs
}

// Catches a UTF-16 key sort, integer-key object reordering, duplicate-key JSON.parse,
// source status promotion, forged final locators and warning-only substring checks.
test('C4 canonical JSON sorts scalar keys and preserves raw strings', () => {
  assert.equal(typeof api.fast39CanonicalJson, 'function')
  assert.equal(api.fast39CanonicalJson({ '\u{10000}': 1, '\ue000': 2, '2': '二', '10': '十', x: '甲\r\n😀' }),
    '{"10":"十","2":"二","x":"甲\\r\\n😀","\ue000":2,"\u{10000}":1}')
  for (const value of [NaN, 1.5, { x: undefined }, { x: '\ud800' }, { x: '\0' }]) {
    assert.throws(() => api.fast39CanonicalJson(value), { code: 'FAST39_RESULT_FIELDS_INVALID' })
  }
})

test('report JSON parser rejects duplicate escaped keys and noninteger number tokens', () => {
  assert.equal(typeof api.parseFast39Json, 'function')
  assert.deepEqual(api.parseFast39Json('{"x":[1,true,null,"😀"]}'), { x: [1, true, null, '😀'] })
  for (const text of ['{"x":1,"\\u0078":2}', '{"x":1.0}', '{"x":1e0}', '{"x":"\\ud800"}', '{"x":"\\u0000"}', '\ufeff{}', '{"x":1,}']) {
    assert.throws(() => api.parseFast39Json(text), { code: 'FAST39_RESULT_FIELDS_INVALID' })
  }
  const own = api.parseFast39Json('{"__proto__":{"polluted":true}}')
  assert.equal(Object.hasOwn(own, '__proto__'), true)
  assert.equal({}.polluted, undefined)
})

test('local registry derives eight original receipts and separates manual wrapper identity', () => {
  assert.equal(typeof api.buildM06Fast39Registry, 'function')
  const input = localInputs(), before = clone(input), registry = api.buildM06Fast39Registry(input)
  assert.deepEqual(input, before)
  assert.deepEqual(registry.entries.map(e => e.input_id), ['upstream_md_file', 'disclosure_file', 'disclosure_text', 'drawings_file', 'drawings_text', 'claim_requirements_file', 'claim_requirements_text', 'user_input'])
  assert.deepEqual(registry.entries[0], { input_id: 'upstream_md_file', role: 'technical_material', status: 'not_provided', text: '', source_sha256: null, receipt_sha256: null, filename: null,
    original_receipt: { status: 'not_provided', sha256: 'none', filename: 'not_provided', content_origin: 'none' } })
  assert.equal(registry.entries[2].text, '构件甲\r\n😀')
  assert.equal(registry.entries[2].source_sha256, hash('构件甲\r\n😀'))
  assert.deepEqual(registry.entries[2].original_receipt, input.prepared.receipts.disclosure_text)
  assert.equal(registry.entries[7].status, 'unverified')
  assert.equal(registry.entries[7].text, null)
  assert.equal(registry.entries[7].source_sha256, null)
  assert.equal(registry.entries[7].receipt_sha256, hash('手动要求'))
  assert.equal(registry.actual_user_input_sha256, hash(input.User_input))
  assert.notEqual(registry.actual_user_input_sha256, registry.entries[7].receipt_sha256)
  assert.deepEqual(registry.input_warnings, input.prepared.warnings)
  assert.equal(registry.receipt_mapping_version, 'flow26-receipt-map-1')
})

test('registry refuses changed packet, missing direct field, mixed input or extra document', () => {
  assert.equal(typeof api.buildM06Fast39Registry, 'function')
  for (const change of [x => { x.packetText += '\n' }, x => { delete x.directFields.technical_field }, x => { x.directFields.technical_field = ' ' },
    x => { x.documentCount = 2 }, x => { x.User_input += '\n' }, x => { x.prepared.receipts.disclosure_text.sha256 = 'a'.repeat(64) }]) {
    const x = clone(localInputs()); change(x)
    assert.throws(() => api.buildM06Fast39Registry(x))
  }
})

test('warning receipts retain bodies without becoming usable technical sources', () => {
  assert.equal(typeof api.buildM06Fast39Registry, 'function')
  const body = '# 前序材料\n未核实的原材料'
  const input = localInputs({ disclosure_text: '构件甲', upstream_md_file: { filename: 'previous.md', body, sha256: hash(body) }, claim_requirements_text: '希望范围广' })
  const result = api.buildM06Fast39Registry(input)
  const upstream = result.entries[0]
  assert.equal(upstream.status, 'unverified')
  assert.equal(upstream.text, body)
  assert.deepEqual(upstream.original_receipt, input.prepared.receipts.upstream_md_file)
  assert.equal(result.entries[6].role, 'output_requirement')
})

test('frozen C4 example is validated without rewriting the six strings or claiming acceptance', () => {
  assert.equal(typeof api.validateM06Fast39Outputs, 'function')
  const outputs = clone(examples.structured_result.outputs), before = clone(outputs)
  const view = validate(outputs)
  assert.deepEqual(outputs, before)
  assert.equal(view.quality_status, 'partial')
  assert.equal(view.support_review_status, 'not_assessed')
  assert.equal(view.anchor_assurance, 'workflow_branch_client_self_consistency_only')
  assert.equal(view.coverage_basis, 'reported_outline_anchor')
  assert.deepEqual(view, examples.quality_report)
})

test('unknown report fields, duplicate JSON keys and forged assurance fail closed', () => {
  assert.equal(typeof api.validateM06Fast39Outputs, 'function')
  for (const change of [r => { r.extra = true }, r => { r.support_review_status = 'accepted' }, r => { r.anchor_assurance = 'independent' }]) {
    assert.throws(() => validate(mutateReport(change)), { code: 'FAST39_RESULT_FIELDS_INVALID' })
  }
  const x = clone(examples.structured_result.outputs); x.quality_report = x.quality_report.replace('"claim_count":1', '"claim_count":1,"claim_count":2')
  assert.throws(() => validate(x), { code: 'FAST39_RESULT_FIELDS_INVALID' })
})

test('all original warning groups must survive exact pending and output reconstruction', () => {
  assert.equal(typeof api.validateM06Fast39Outputs, 'function')
  const original = examples.structured_result.outputs
  for (const text of ['未提供：前序材料', '合成材料仅供Schema复核。', '合成提示：仍须人工复核。']) {
    for (const field of ['output', 'pending_confirmation']) {
      const x = clone(original); x[field] = x[field].replace(text, '已无风险')
      assert.throws(() => validate(x), { code: 'FAST39_RESULT_FIELDS_INVALID' })
    }
  }
  const registry = clone(examples.source_registry_internal); registry.limitations.push('原始限制不能被删')
  assert.throws(() => validate(clone(original), registry), { code: 'FAST39_BINDING_MISMATCH' })
})

test('source and final locators cannot be forged even when strings remain bounded', () => {
  assert.equal(typeof api.validateM06Fast39Outputs, 'function')
  for (const change of [r => { r.feature_dispositions[0].output_start_utf16 = 9 }, r => { r.feature_dispositions[0].output_end_utf16 = 14 },
    r => { r.source_map[0].input_id = 'claim_requirements_text' }, r => { r.source_map[0].end_utf16 = 999999 },
    r => { r.feature_coverage.status = 'incomplete' }, r => { r.source_registry_sha256 = 'a'.repeat(64) }]) {
    assert.throws(() => validate(mutateReport(change)))
  }
})

test('counts, plan IDs and dependency graph cannot admit a fabricated or cyclic claim', () => {
  assert.equal(typeof api.validateM06Fast39Outputs, 'function')
  for (const change of [r => { r.claim_count = 2 }, r => { r.claim_id_map[0].final_claim_id = '2' },
    r => { r.claim_id_map.push(clone(r.claim_id_map[0])) }, r => { r.dependency_edges = [{ parent: '1', child: '1' }] },
    r => { r.feature_dispositions[0].planned_claim_id = 'plan:parallel:1' }]) {
    assert.throws(() => validate(mutateReport(change)), { code: 'FAST39_RESULT_FIELDS_INVALID' })
  }
})

test('output budgets count UTF16, UTF8 and escaped JSON without truncating received data', () => {
  assert.equal(typeof api.validateM06Fast39Outputs, 'function')
  for (const text of ['😀'.repeat(50001), '汉'.repeat(90000)]) {
    const x = clone(examples.structured_result.outputs); x.claims_text = text
    assert.throws(() => validate(x), { code: 'FAST39_RESULT_TOO_LARGE' })
    assert.equal(x.claims_text, text)
  }
  for (const text of ['\ud800', 'a\0b']) {
    const x = clone(examples.structured_result.outputs); x.claims_text = text
    assert.throws(() => validate(x), { code: 'FAST39_RESULT_FIELDS_INVALID' })
  }
  let deep = {}; for (let i = 0; i < 9; i++) deep = { x: deep }
  assert.throws(() => api.parseFast39Json(JSON.stringify(deep)), { code: 'FAST39_RESULT_TOO_LARGE' })
})

test('warning renderer fences hostile Markdown and escapes all source table cells', () => {
  assert.equal(typeof api.renderM06Fast39Pending, 'function')
  assert.equal(typeof api.renderM06Fast39Output, 'function')
  const r = clone(examples.quality_report)
  r.limitations = ['```\n## 伪标题\n<script>danger()</script>\n```']
  const pending = api.renderM06Fast39Pending(r)
  assert.ok(pending.includes('````text\n```\n## 伪标题\n<script>danger()</script>\n```\n````'))
  const original = examples.structured_result.outputs
  const output = api.renderM06Fast39Output({ ...original, pending_confirmation: pending }, r)
  assert.ok(output.includes(pending))
  assert.equal(api.visibleFast39Sections(output).length, 3)
  assert.deepEqual(api.visibleFast39Sections(output), ['权利要求草稿', '材料缺项与未确认事项', '技术特征来源'])
})

// Synthetic client input, never a workflow execution or public technical fact.
// Renderers build attack inputs only; acceptance expectations below are literal.
function threePlans() {
  const registry = clone(examples.source_registry_internal)
  const entry = registry.entries[2]
  Object.assign(entry, { text: '构件甲构件乙😀', source_sha256: hash('构件甲构件乙😀'), receipt_sha256: hash('构件甲构件乙😀') })
  entry.original_receipt.sha256 = entry.source_sha256
  const q = clone(examples.quality_report)
  const plans = [
    { planned_claim_id: 'plan:core', role: 'core_root', original_id: null, feature_ids: ['same-feature'] },
    { planned_claim_id: 'plan:parallel:1', role: 'parallel_root', original_id: 'original-parallel', feature_ids: ['same-feature'] },
    { planned_claim_id: 'plan:cluster:1', role: 'dependent_cluster', original_id: 'original-cluster', feature_ids: ['emoji'] },
  ]
  const sources = plans.map((p, i) => ({ planned_claim_id: p.planned_claim_id, feature_id: p.feature_ids[0], input_id: 'disclosure_text',
    source_sha256: entry.source_sha256, start_utf16: [0, 3, 6][i], end_utf16: [3, 6, 8][i], quote: ['构件甲', '构件乙', '😀'][i] }))
  Object.assign(q.outline_anchor.basis, { planned_claims: plans, critical_feature_targets: plans.slice(0, 2).map(p => ({ planned_claim_id: p.planned_claim_id, feature_id: p.feature_ids[0] })), outline_source_map: sources })
  q.claim_id_map = plans.map((p, i) => ({ planned_claim_id: p.planned_claim_id, final_claim_id: String(i + 1), reason: '合成计划' }))
  q.source_map = sources.map((s, i) => ({ ...s, claim_id: String(i + 1) }))
  q.feature_dispositions = plans.map((p, i) => ({ planned_claim_id: p.planned_claim_id, feature_id: p.feature_ids[0], claim_id: String(i + 1), action: 'kept',
    output_quote: sources[i].quote, output_start_utf16: [3, 11, 29][i], output_end_utf16: [6, 14, 31][i], locator_status: 'verified', reason: '合成精确定位' }))
  q.claim_count = 3; q.dependency_edges = [{ parent: '1', child: '3' }]
  const outputs = { ...clone(examples.structured_result.outputs), claims_text: '1. 构件甲。\n2. 构件乙。\n3. 根据权利要求1，包含😀。', dependency_tree: '### 权利要求依赖树\n权利要求1、2（独立）；3从属于1' }
  return { registry, q, outputs }
}
function encode(fixture) {
  const { q, registry, outputs } = fixture
  q.outline_anchor.sha256 = hash(api.fast39CanonicalJson(q.outline_anchor.basis))
  q.source_registry_sha256 = hash(api.fast39CanonicalJson(registry))
  outputs.quality_status = q.quality_status
  outputs.pending_confirmation = api.renderM06Fast39Pending(q)
  outputs.output = api.renderM06Fast39Output(outputs, q)
  outputs.quality_report = JSON.stringify(q)
  return outputs
}

test('same feature IDs in different plans stay distinct and non-BMP locators use UTF16', () => {
  const f = threePlans(), q = validate(encode(f), f.registry)
  assert.equal(q.claim_count, 3)
  assert.equal(q.feature_coverage.status, 'complete')
  assert.equal(q.feature_dispositions[2].output_start_utf16, 29)
  assert.equal(q.feature_dispositions[2].output_end_utf16, 31)
})

test('self-consistent malformed source tuples cannot be hidden behind a newly computed hash', () => {
  for (const change of [s => { s.start_utf16 = 7 }, s => { s.end_utf16 = 7 }, s => { s.end_utf16 = 9 },
    s => { s.source_sha256 = hash('other') }, s => { s.input_id = 'user_input' }, s => { s.quote = '别的原文' }]) {
    const f = threePlans(); change(f.q.outline_anchor.basis.outline_source_map[2]); f.q.source_map[2] = { ...f.q.outline_anchor.basis.outline_source_map[2], claim_id: '3' }
    assert.throws(() => validate(encode(f), f.registry), { code: 'FAST39_RESULT_FIELDS_INVALID' })
  }
})

test('warning source cannot support claims after report and registry hashes are recomputed', () => {
  const f = threePlans(), entry = f.registry.entries[2]
  entry.original_receipt.status = 'warning'; entry.status = 'unverified'
  assert.throws(() => validate(encode(f), f.registry), { code: 'FAST39_RESULT_FIELDS_INVALID' })
})

test('root-to-dependent downgrade, missing parent and two-node cycles are rejected', () => {
  for (const edges of [[{ parent: '1', child: '2' }, { parent: '1', child: '3' }], [], [{ parent: '1', child: '3' }, { parent: '3', child: '1' }], [{ parent: '4', child: '3' }]]) {
    const f = threePlans(); f.q.dependency_edges = edges
    assert.throws(() => validate(encode(f), f.registry), { code: 'FAST39_RESULT_FIELDS_INVALID' })
  }
})

test('unique locator cannot be forged from the first of two exact matches', () => {
  const f = threePlans(); f.outputs.claims_text = f.outputs.claims_text.replace('构件甲。', '构件甲、构件甲。')
  assert.throws(() => validate(encode(f), f.registry), { code: 'FAST39_RESULT_FIELDS_INVALID' })
  Object.assign(f.q.feature_dispositions[0], { locator_status: 'unverified', output_start_utf16: null, output_end_utf16: null })
  f.q.feature_dispositions[1].output_start_utf16 += 4; f.q.feature_dispositions[1].output_end_utf16 += 4
  f.q.feature_dispositions[2].output_start_utf16 += 4; f.q.feature_dispositions[2].output_end_utf16 += 4
  f.q.feature_coverage = { status: 'unverified', missing_core_targets: [], unverified_core_targets: [{ planned_claim_id: 'plan:core', feature_id: 'same-feature' }] }
  f.q.quality_status = 'insufficient'
  assert.equal(validate(encode(f), f.registry).quality_status, 'insufficient')
  f.q.quality_status = 'partial'
  assert.throws(() => validate(encode(f), f.registry), { code: 'FAST39_RESULT_FIELDS_INVALID' })
})

test('empty claims are a no-supported-claim content error rather than a completed draft', () => {
  const x = clone(examples.structured_result.outputs); x.claims_text = ''
  assert.throws(() => validate(x), { code: 'FAST39_NO_SUPPORTED_CLAIM' })
})

test('every emitted plan needs a supported feature, including dependent clusters', () => {
  const f = threePlans()
  f.q.outline_anchor.basis.planned_claims[2].feature_ids = []
  f.q.outline_anchor.basis.outline_source_map.pop(); f.q.source_map.pop(); f.q.feature_dispositions.pop()
  assert.throws(() => validate(encode(f), f.registry), { code: 'FAST39_NO_SUPPORTED_CLAIM' })
})

test('all-original warning objects and safe literal groups participate in report validation', () => {
  for (const key of ['marker_warnings', 'dependency_warnings']) {
    const f = threePlans(); f.q[key] = ['原始\n```\n## 不得解释成章节\n~~~']
    const encoded = encode(f)
    assert.equal(validate(encoded, f.registry).quality_status, 'partial')
    const changed = clone(encoded); changed.pending_confirmation = changed.pending_confirmation.replace('不得解释成章节', '静默删去警示')
    assert.throws(() => validate(changed, f.registry), { code: 'FAST39_RESULT_FIELDS_INVALID' })
  }
  const f = threePlans(); f.q.input_warnings[0].status = 'other'
  assert.throws(() => validate(encode(f), f.registry), { code: 'FAST39_BINDING_MISMATCH' })
})

test('bounded JSON rejects container depth, array and key overflow before schema validation', () => {
  assert.throws(() => api.parseFast39Json(JSON.stringify(Array(1025).fill(0))), { code: 'FAST39_RESULT_TOO_LARGE' })
  assert.throws(() => api.parseFast39Json(JSON.stringify(Object.fromEntries(Array.from({ length: 257 }, (_, i) => ['k' + i, 0])))), { code: 'FAST39_RESULT_TOO_LARGE' })
  let v = 0; for (let i = 0; i < 9; i++) v = { x: v }
  assert.deepEqual(api.parseFast39Json(JSON.stringify(v)), v) // containers root0..8
  assert.throws(() => api.parseFast39Json(JSON.stringify({ x: v })), { code: 'FAST39_RESULT_TOO_LARGE' })
})

test('target and source collections compare full tuples without inventing an array order requirement', () => {
  const f = threePlans()
  f.q.outline_anchor.basis.critical_feature_targets.reverse()
  f.q.source_map.reverse()
  assert.equal(validate(encode(f), f.registry).feature_coverage.status, 'complete')
  f.q.outline_anchor.basis.critical_feature_targets.push(clone(f.q.outline_anchor.basis.critical_feature_targets[0]))
  assert.throws(() => validate(encode(f), f.registry), { code: 'FAST39_RESULT_FIELDS_INVALID' })
})

test('invalid backtick fence info cannot hide an extra visible section from validation', () => {
  const x = clone(examples.structured_result.outputs)
  x.claims_text += '\n```bad`info\n## 额外章节\n```'
  x.output = api.renderM06Fast39Output(x, examples.quality_report)
  assert.throws(() => validate(x), { code: 'FAST39_RESULT_FIELDS_INVALID' })
})

test('display lowering preserves literal tree contents and original newline bytes inside code fences', () => {
  const x = clone(examples.structured_result.outputs)
  x.dependency_tree = '## 依赖树\r\n```text\r\n## 图中原文\r\n```'
  const result = api.renderM06Fast39Output(x, examples.quality_report)
  assert.ok(result.includes('### 依赖树\r\n```text\r\n## 图中原文\r\n```'))
  assert.equal(x.dependency_tree, '## 依赖树\r\n```text\r\n## 图中原文\r\n```')
})
