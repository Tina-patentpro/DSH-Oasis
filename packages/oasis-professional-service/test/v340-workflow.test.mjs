import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

const catalog = await import('../src/v340-catalog.js').catch(() => ({}))
const doc = await import('../src/v340-document.js').catch(() => ({}))
const hash = body => createHash('sha256').update(body).digest('hex')
const uid = '12345678-1234-4234-8234-123456789abc'
const nextUid = '87654321-1234-4234-8234-123456789abc'
const time = '2026-10-20T16:01:02.000Z'
const nodes = ['Flow-1-1','Flow-1-2','Flow-1-3','Flow-1-4','Flow-1-5','Flow-2-6','Flow-2-7','Flow-3-8','Flow-3-9','Flow-3-10','Flow-4-11','Flow-4-12','Flow-5-13','Flow-6-14']
const result = (patch = {}) => ({ summary: '公开合成结果，专业质量未评估。', core_result_markdown: '合成技术内容，不用于申报。',
  updates: [], tables: {}, terms_master: [], warnings: [], model_completions: [], ...patch })
const content = (patch = {}) => ({ content_id: 'feature-a', content_markdown: '单向阀结构', content_origin: 'model_completed',
  source_input_id: 'none', source_locator: 'none', source_hash: 'none', trust_status: 'hypothesis_to_verify',
  last_updated_flow: 'Flow-1-1', revision_reason: '公开替身补齐', ...patch })
const completion = { content_id: 'feature-a', content_origin: 'model_completed', completion_basis: '公开假设', assumptions: '未实测', confidence: 'low', affected_section: '结构', human_confirmation_status: 'pending' }

const m06Prefix = 'host-Flow-2-6-m06-limited-'
const m06Build = (prepared, output = result(), workflowRunUid = nextUid) => doc.assembleV340Document({
  nodeId: 'Flow-2-6', workflowRunUid, generatedAt: time, prepared, output,
})
const m06Upstream = (change = () => {}) => {
  const parent = doc.assembleV340Document({ nodeId: 'Flow-1-5', workflowRunUid: uid, generatedAt: time,
    prepared: doc.prepareV340Inputs('Flow-1-5', { user_input: '运行指令，参数不得作为已证事实' }), output: result() })
  const snapshot = structuredClone(parent.snapshot)
  change(snapshot)
  const body = parent.body.replace(JSON.stringify(parent.snapshot, null, 2), JSON.stringify(snapshot, null, 2))
    .replace(JSON.stringify(parent.snapshot.warnings, null, 2), JSON.stringify(snapshot.warnings, null, 2))
  return { filename: parent.fileName, body, sha256: hash(body) }
}

test('M06 R1 instruction audit and source gate', () => {
  const prepared = doc.prepareV340Inputs('Flow-2-6', { user_input: '公开合成运行指令', disclosure_text: '公开技术材料' })
  const before = JSON.stringify(prepared)
  const built = m06Build(prepared)
  const instruction = built.snapshot.contents.find(x => x.source_input_id === 'user_input')
  assert.equal(instruction.trust_status, 'excluded_from_formal_text')
  assert.equal(instruction.content_markdown, prepared.values.user_input)
  assert.equal(instruction.source_hash, prepared.receipts.user_input.sha256)
  assert.equal(instruction.revision_reason, '运行指令，仅审计；不作为技术事实依据')
  assert.equal(JSON.stringify(prepared), before)
  for (const origin of ['user_text', 'workflow_analysis', 'model_completed']) {
    const update = content({ content_origin: origin, source_input_id: 'user_input', source_locator: prepared.values.user_input,
      source_hash: prepared.receipts.user_input.sha256, trust_status: origin === 'user_text' ? 'source_fact' : 'hypothesis_to_verify', last_updated_flow: 'Flow-2-6' })
    assert.throws(() => m06Build(prepared, result({ updates: [update], model_completions: origin === 'model_completed' ? [completion] : [] })), /V340_INVALID_DOCUMENT/)
  }
  const same = doc.prepareV340Inputs('Flow-2-6', { user_input: '相同正文', disclosure_text: '相同正文' })
  assert.doesNotThrow(() => m06Build(same, result({ updates: [content({ content_origin: 'user_text', trust_status: 'source_fact',
    source_input_id: 'disclosure_text', source_hash: hash('相同正文'), source_locator: '相同正文', last_updated_flow: 'Flow-2-6' })] })))
  const blank = doc.prepareV340Inputs('Flow-2-6', { user_input: ' \n ' })
  assert.equal(blank.receipts.user_input.status, 'accepted')
  assert.equal(blank.values.user_input, ' \n ')
  assert.equal(m06Build(blank).snapshot.contents.some(x => x.source_input_id === 'user_input'), false)
  const absent = doc.prepareV340Inputs('Flow-2-6', { user_input: '' })
  assert.equal(absent.receipts.user_input.status, 'not_provided')
  assert.equal(m06Build(absent).snapshot.contents.some(x => x.source_input_id === 'user_input'), false)
  const other = doc.assembleV340Document({ nodeId: 'Flow-1-1', workflowRunUid: uid, generatedAt: time,
    prepared: doc.prepareV340Inputs('Flow-1-1', { user_input: '其它节点旧合同' }), output: result() })
  assert.equal(other.snapshot.contents.find(x => x.source_input_id === 'user_input').trust_status, 'source_fact')
})

test('M06 R1 legacy instruction classification is read only', () => {
  assert.equal(typeof doc.collectM06InstructionSources, 'function')
  assert.equal(doc.collectM06InstructionSources(doc.prepareV340Inputs('Flow-2-6', {})).upstreamClassification, 'absent')
  const raw = { filename: 'unparsed.md', body: '公开结构异常原文', sha256: hash('公开结构异常原文') }
  const unparsed = doc.prepareV340Inputs('Flow-2-6', { upstream_md_file: raw })
  assert.equal(doc.collectM06InstructionSources(unparsed).upstreamClassification, 'unparsed')
  assert.ok(m06Build(unparsed).body.includes(raw.body))
  const file = m06Upstream()
  const prepared = doc.prepareV340Inputs('Flow-2-6', { upstream_md_file: file, disclosure_text: '有提供的材料' })
  const before = JSON.stringify(prepared)
  const classified = doc.collectM06InstructionSources(prepared)
  const instruction = prepared.upstream.snapshot.contents.find(x => x.source_input_id === 'user_input')
  assert.equal(classified.upstreamClassification, 'parsed')
  assert.deepEqual(classified.providedMaterialInputIds, ['upstream_md_file', 'disclosure_text'])
  assert.deepEqual(classified.instructionAuditContentIds, [instruction.content_id])
  assert.deepEqual(classified.ambiguousReferenceIds, [])
  assert.ok(classified.otherUpstreamContentIds.length > 0)
  assert.equal(instruction.trust_status, 'source_fact', 'legacy input remains unchanged')
  assert.throws(() => m06Build(prepared, result({ updates: [content({ content_origin: 'workflow_analysis', trust_status: 'reasoned_inference',
    source_input_id: instruction.content_id, last_updated_flow: 'Flow-2-6' })] })), /V340_INVALID_DOCUMENT/)
  assert.equal(JSON.stringify(prepared), before)
  for (const mode of ['duplicate', 'cross-role', 'material-collision']) {
    const badFile = m06Upstream(s => {
      const first = s.contents.find(x => x.source_input_id === 'user_input')
      if (mode === 'material-collision') first.content_id = 'disclosure_text'
      else s.contents.push({ ...first, ...(mode === 'cross-role' ? { source_input_id: 'disclosure_text' } : {}) })
    })
    const bad = doc.prepareV340Inputs('Flow-2-6', { upstream_md_file: badFile, disclosure_text: '实际材料' })
    const policy = doc.collectM06InstructionSources(bad)
    const forbidden = bad.upstream.snapshot.contents.find(x => x.source_input_id === 'user_input').content_id
    assert.deepEqual(policy.ambiguousReferenceIds, [forbidden])
    assert.deepEqual(policy.instructionAuditContentIds, [])
    assert.throws(() => m06Build(bad, result({ updates: [content({ content_origin: 'workflow_analysis', trust_status: 'reasoned_inference',
      source_input_id: forbidden, last_updated_flow: 'Flow-2-6' })] })), /V340_INVALID_DOCUMENT/)
  }
})

test('M06 R1 current limitation survives inherited warning and reopen', () => {
  const prepared = doc.prepareV340Inputs('Flow-2-6', {})
  const built = m06Build(prepared)
  const limited = built.snapshot.warnings.find(x => x.warning_id === m06Prefix + nextUid)
  assert.ok(limited, 'each new M06 result needs its own warning')
  assert.equal(limited.status, 'open')
  assert.equal(limited.problem, '本版本仅核对已识别的指令来源；正文与表格、依据的一致性尚未核对，未执行结构删除。')
  assert.equal(limited.affected_content, '本节点正文、结构表和来源')
  assert.equal(limited.current_handling, '保留原输入、结构记录和历史，仅形成受限稿')
  assert.equal(limited.model_completion, '未评估')
  assert.equal(limited.deliverable_impact, '不能据此认定完整同步、结构删除或专业审阅已完成')
  assert.equal(limited.recommended_action, '核对当前正文、相关表格与依据；完整变更另行处理')
  assert.deepEqual(m06Build(prepared), built, 'fixed complete assembly parameters are deterministic')
  const reopened = doc.inspectV340Document({ filename: built.fileName, body: built.body, sha256: built.sha256 }, 'Flow-2-6')
  assert.equal(reopened.status, 'accepted')
  assert.deepEqual(reopened.snapshot, built.snapshot)
  assert.throws(() => m06Build(prepared, result({ warnings: [{ ...limited, warning_id: m06Prefix + uid }] })), /V340_INVALID_DOCUMENT/)
  for (const status of ['open', 'confirmed', 'resolved', 'accepted']) {
    const file = m06Upstream(s => s.warnings.push({ ...limited, status }))
    const input = doc.prepareV340Inputs('Flow-2-6', { upstream_md_file: file })
    assert.equal(input.upstream.snapshot.input_history.some(x => x.workflow_run_uid === nextUid), false)
    const before = JSON.stringify(input)
    assert.throws(() => m06Build(input), /V340_INVALID_DOCUMENT/)
    assert.equal(JSON.stringify(input), before)
    const parent = structuredClone(built)
    parent.snapshot.warnings.push({ ...limited, warning_id: m06Prefix + uid, status })
    const old = JSON.stringify(parent)
    assert.throws(() => doc.reviseV340Document(parent, { workflowRunUid: uid, generatedAt: time, body: '核心修订' }), /V340_INVALID_DOCUMENT/)
    assert.equal(JSON.stringify(parent), old)
  }
  for (const status of ['resolved', 'accepted']) {
    const history = { ...limited, warning_id: m06Prefix + uid, status }
    const input = doc.prepareV340Inputs('Flow-2-6', { upstream_md_file: m06Upstream(s => s.warnings.push(history)) })
    const next = m06Build(input)
    assert.deepEqual(next.snapshot.warnings.find(w => w.warning_id === history.warning_id), history)
    assert.equal(next.snapshot.warnings.find(w => w.warning_id === m06Prefix + nextUid).status, 'open')
  }
})

test('M06 R1 edit remains unsynchronized', () => {
  const built = m06Build(doc.prepareV340Inputs('Flow-2-6', { disclosure_text: '公开技术材料' }), result({
    tables: { T4: [{ row_id: 'matrix-1', data: { feature: '公开必要特征' } }] }, terms_master: [{ term: '公开术语' }],
  }))
  const before = JSON.stringify(built)
  const revised = doc.reviseV340Document(built, { workflowRunUid: uid, generatedAt: time, body: '删去正文文字，不表示撤回事实' })
  assert.equal(revised.snapshot.deliverable_status, 'not_recommended_for_filing')
  assert.deepEqual(revised.snapshot.tables, built.snapshot.tables)
  assert.deepEqual(revised.snapshot.terms_master, built.snapshot.terms_master)
  assert.deepEqual(revised.snapshot.contents.slice(0, built.snapshot.contents.length), built.snapshot.contents)
  assert.ok(revised.snapshot.warnings.some(x => x.warning_id === m06Prefix + uid && x.status === 'open'))
  assert.equal(revised.snapshot.manual_edit_manifest.at(-1).source_file_sha256, built.sha256)
  assert.equal(JSON.stringify(built), before)
  assert.deepEqual(doc.reviseV340Document(built, { workflowRunUid: uid, generatedAt: time, body: '删去正文文字，不表示撤回事实' }), revised)
})

test('M06 R1 exact limits retain every warning and document byte', () => {
  const minimalWarning = n => ({ warning_id: `w-${n}`, first_flow: 'Flow-1-5', inherited_from: 'none',
    problem: 'x', affected_content: 'x', current_handling: 'x', model_completion: 'x', deliverable_impact: 'x', recommended_action: 'x', status: 'open' })
  const empty = m06Upstream(s => { s.warnings = [] })
  const added = m06Build(doc.prepareV340Inputs('Flow-2-6', { upstream_md_file: empty })).snapshot.warnings.length
  const fullFile = m06Upstream(s => { s.warnings = Array.from({ length: 1024 - added }, (_, i) => minimalWarning(i)) })
  const full = doc.prepareV340Inputs('Flow-2-6', { upstream_md_file: fullFile })
  assert.equal(full.upstream.status, 'accepted', 'threshold fixture is canonical, with no accidental duplicate raw input')
  const before = JSON.stringify(full)
  const built = m06Build(full)
  assert.equal(built.snapshot.warnings.length, 1024)
  const extraFile = m06Upstream(s => { s.warnings = Array.from({ length: 1025 - added }, (_, i) => minimalWarning(i)) })
  assert.throws(() => m06Build(doc.prepareV340Inputs('Flow-2-6', { upstream_md_file: extraFile })))
  assert.equal(JSON.stringify(full), before)
  assert.throws(() => doc.reviseV340Document(built, { workflowRunUid: uid, generatedAt: time, body: '警示无容量时仍保留旧版' }))
  assert.equal(built.snapshot.warnings.length, 1024)
  const prepared = doc.prepareV340Inputs('Flow-2-6', {})
  const base = result({ tables: { T4: [{ row_id: 'capacity', data: { note: '' } }] } })
  const overhead = Buffer.byteLength(m06Build(prepared, base).body)
  const exact = structuredClone(base)
  exact.tables.T4[0].data.note = 'x'.repeat(1048576 - overhead)
  assert.equal(Buffer.byteLength(m06Build(prepared, exact).body), 1048576)
  exact.tables.T4[0].data.note += 'x'
  assert.throws(() => m06Build(prepared, exact))
})

test('M06 R1 material-backed explicit replacement remains available', () => {
  const old = content({ content_origin: 'workflow_analysis', source_input_id: 'none', trust_status: 'reasoned_inference', last_updated_flow: 'Flow-1-5' })
  const file = m06Upstream(s => s.contents.push(old))
  const update = content({ content_markdown: '公开补充技术', content_origin: 'user_text', trust_status: 'source_fact',
    source_input_id: 'disclosure_text', source_locator: '公开补充技术', source_hash: hash('公开补充技术'), last_updated_flow: 'Flow-2-6' })
  const values = { upstream_md_file: file, disclosure_text: '公开补充技术' }
  assert.throws(() => m06Build(doc.prepareV340Inputs('Flow-2-6', values), result({ updates: [update] })), /V340_INVALID_DOCUMENT/)
  const built = m06Build(doc.prepareV340Inputs('Flow-2-6', { ...values, user_input: '替换：feature-a' }), result({ updates: [update] }))
  assert.equal(built.snapshot.contents.find(x => x.content_id === 'feature-a').content_markdown, '公开补充技术')
  assert.ok(built.snapshot.revisions.some(x => x.content_id === 'feature-a'))
  const tableFile = m06Upstream(s => { s.tables.T4 = { status: 'generated', rows: [{ row_id: 'r1', data: { feature: '旧结构' } }] } })
  const tableOutput = result({ tables: { T4: [{ row_id: 'r1', data: { feature: '补充结构' } }] } })
  for (const instruction of ['', '替换：r1']) {
    assert.throws(() => m06Build(doc.prepareV340Inputs('Flow-2-6', { upstream_md_file: tableFile, user_input: instruction }), tableOutput))
  }
  const table = m06Build(doc.prepareV340Inputs('Flow-2-6', { upstream_md_file: tableFile, user_input: '替换：T4/r1' }), tableOutput)
  assert.equal(table.snapshot.revisions.at(-1).before.data.feature, '旧结构')
  assert.equal(table.snapshot.revisions.at(-1).after.data.feature, '补充结构')
  const unchanged = m06Build(doc.prepareV340Inputs('Flow-2-6', { upstream_md_file: tableFile }), result({ tables: { T4: [{ row_id: 'r1', data: { feature: '旧结构' } }] } }))
  assert.equal(unchanged.snapshot.revisions.length, 0)
})

test('M06 R1 structural acceptance does not certify an unsupported core statement', () => {
  const prepared = doc.prepareV340Inputs('Flow-2-6', { user_input: '希望补充一个不存在的99秒测量事实' })
  const before = JSON.stringify(prepared)
  const output = result({ core_result_markdown: '公开反例：本设备已经实测99秒。此处无任何实测依据。' })
  assert.deepEqual(Object.keys(doc.parseV340ModelOutput(output)), ['summary', 'core_result_markdown', 'updates', 'tables', 'terms_master', 'warnings', 'model_completions'])
  assert.equal(Object.keys(prepared.receipts).length, 8)
  assert.deepEqual(Object.keys(prepared.values), ['user_input'])
  const built = m06Build(prepared, output)
  assert.ok(built.body.includes('已经实测99秒'))
  assert.equal(built.snapshot.contents.some(c => c.trust_status === 'confirmed_fact'), false)
  assert.ok(built.snapshot.warnings.some(w => w.warning_id.startsWith(m06Prefix) && w.status === 'open' && w.model_completion === '未评估'))
  assert.equal(built.snapshot.deliverable_status, 'ready_with_warnings')
  for (const field of ['providedMaterialInputIds', 'instructionAuditContentIds', 'otherUpstreamContentIds', 'ambiguousReferenceIds', 'upstreamClassification']) {
    assert.equal(Object.hasOwn(built.snapshot, field), false)
  }
  assert.equal(JSON.stringify(prepared), before)
})

test('catalog exposes 14 distinct contracts without claiming executable source bindings', async () => {
  assert.equal(typeof catalog.getV340Catalog, 'function', 'versioned catalog must exist')
  const all = catalog.getV340Catalog()
  assert.deepEqual(all.nodes.map(n => n.nodeId), nodes)
  assert.equal(all.businessVersion, 'V3.4.0')
  assert.equal(all.nodes[0].upstreamNodeId, null)
  assert.equal(all.nodes[6].upstreamNodeId, 'Flow-2-6')
  assert.deepEqual(all.nodes[0].inputs.map(x => x.id), ['research_request_file','research_request_text','research_scope_config','user_input'])
  assert.equal(all.nodes.at(-1).inputs.filter(x => /^comparison_doc_\d_file$/.test(x.id)).length, 5)
  for (const node of all.nodes) {
    assert.equal(node.sources['local-skill'].enabled, false)
    assert.equal(node.sources['oasis-api'].enabled, false)
  }
  assert.throws(() => catalog.getV340Node('../Flow-1-1'))
  const loaded = await catalog.loadV340Instruction('Flow-2-7')
  assert.match(loaded.body, /说明书初稿/)
  assert.match(loaded.body, /user_input/)
  assert.match(loaded.sha256, /^[a-f0-9]{64}$/)
  assert.throws(() => catalog.verifyV340Pack(Buffer.from('{}')), /V340_RESOURCE_UNAVAILABLE/)
})

test('missing expected inputs warn while all IDs receive explicit receipts', () => {
  assert.equal(typeof doc.prepareV340Inputs, 'function', 'input preparation must exist')
  const prepared = doc.prepareV340Inputs('Flow-1-1', { research_request_text: '泵阀技术背景', user_input: '关注结构' })
  assert.equal(prepared.receipts.research_request_file.status, 'not_provided')
  assert.equal(prepared.receipts.research_request_text.sha256, hash('泵阀技术背景'))
  assert.equal(prepared.receipts.user_input.content_origin, 'user_text')
  assert.ok(prepared.warnings.length)
  assert.throws(() => doc.prepareV340Inputs('Flow-1-1', { research_request_file: ['a','b'] }))
  assert.throws(() => doc.prepareV340Inputs('Flow-1-1', { user_input: { body: '模型生成指令' } }))
  assert.throws(() => doc.prepareV340Inputs('Flow-1-1', { unknown: '隐藏材料' }))
  assert.throws(() => doc.prepareV340Inputs('Flow-1-1', { research_request_file: { filename: 'a.md', body: '资料', sha256: 'a'.repeat(64) } }))
})

test('host names one Markdown with Shanghai seconds and UUID; model completions stay unconfirmed', () => {
  const prepared = doc.prepareV340Inputs('Flow-1-1', {})
  const made = doc.assembleV340Document({ nodeId: 'Flow-1-1', workflowRunUid: uid, generatedAt: time, prepared,
    output: result({ updates: [content()], model_completions: [completion] }) })
  assert.equal(made.fileName, 'tech_landscape_20261021000102_12345678.md')
  assert.equal(made.sha256, hash(made.body))
  assert.equal(made.snapshot.workflow_status, 'completed_with_warnings')
  assert.equal(made.snapshot.deliverable_status, 'model_completed_pending_confirmation')
  assert.equal(made.snapshot.contents[0].trust_status, 'hypothesis_to_verify')
  const headers = made.body.split('\n').filter(l => /^## /.test(l))
  assert.deepEqual(headers, ['## 文档信息','## 核心结论','## 核心结果','## 下游读取区','## 风险与待确认事项'])
  assert.throws(() => doc.assembleV340Document({ nodeId: 'Flow-1-1', workflowRunUid: uid, generatedAt: time, prepared,
    output: result({ updates: [content({ trust_status: 'confirmed_fact' })], model_completions: [completion] }) }))
  assert.throws(() => doc.assembleV340Document({ nodeId: 'Flow-1-1', workflowRunUid: uid, generatedAt: time, prepared, output: result({ updates: [content()] }) }))
})

test('all 14 adjacent handoffs preserve content, open warnings, utility model and T1–T6 without nesting documents', () => {
  let previous, final
  for (const [index, nodeId] of nodes.entries()) {
    const values = previous ? { upstream_md_file: { filename: previous.fileName, body: previous.body, sha256: previous.sha256 } } : {}
    if (nodeId === 'Flow-1-4') values.application_type = 'utility_model'
    const prepared = doc.prepareV340Inputs(nodeId, values)
    const patch = index === 0 ? { updates: [content()], model_completions: [completion],
      tables: { T1: [{ row_id: 'tp-1', data: { tp_id: 'tp-1', problem: '公开缺陷' } }] } } : {}
    previous = doc.assembleV340Document({ nodeId, workflowRunUid: `${String(index + 1).padStart(8,'0')}-1234-4234-8234-123456789abc`, generatedAt: time, prepared, output: result(patch) })
    assert.equal(previous.snapshot.contents[0].content_markdown, '单向阀结构')
    assert.equal(previous.snapshot.tables.T1.rows[0].data.tp_id, 'tp-1')
    assert.equal(previous.snapshot.model_completions.length, 1)
    assert.ok(previous.snapshot.warnings.length)
    if (index >= 3) assert.equal(previous.snapshot.application_type, 'utility_model')
    assert.equal(previous.body.split('```oasis-v340').length, 2)
    final = previous
  }
  assert.ok(final.body.length < 180000)
  assert.equal(final.snapshot.tables.T6.status, 'missing')
  assert.equal(final.snapshot.node_id, 'Flow-6-14')
})

test('wrong predecessor, renamed file and edited bytes preserve the supplied body with warnings', () => {
  const first = doc.assembleV340Document({ nodeId: 'Flow-1-1', workflowRunUid: uid, generatedAt: time,
    prepared: doc.prepareV340Inputs('Flow-1-1', {}), output: result() })
  const renamed = { filename: 'edited.md', body: first.body + '\n人工补充：尺寸待核实。', sha256: hash(first.body + '\n人工补充：尺寸待核实。') }
  const prepared = doc.prepareV340Inputs('Flow-1-3', { upstream_md_file: renamed })
  assert.equal(prepared.receipts.upstream_md_file.status, 'warning')
  const next = doc.assembleV340Document({ nodeId: 'Flow-1-3', workflowRunUid: nextUid, generatedAt: time, prepared, output: result() })
  assert.ok(next.snapshot.contents.some(x => x.content_markdown.includes('人工补充：尺寸待核实。')))
  assert.ok(next.snapshot.manual_edit_manifest.length)
})

test('stable content cannot be silently replaced; explicit user directive records old and new bytes', () => {
  const first = doc.assembleV340Document({ nodeId: 'Flow-1-1', workflowRunUid: uid, generatedAt: time,
    prepared: doc.prepareV340Inputs('Flow-1-1', {}), output: result({ updates: [content()], model_completions: [completion] }) })
  const values = { upstream_md_file: { filename: first.fileName, body: first.body, sha256: first.sha256 } }
  const command = { nodeId: 'Flow-1-2', workflowRunUid: nextUid, generatedAt: time,
    output: result({ updates: [content({ content_markdown: '新结构', last_updated_flow: 'Flow-1-2' })], model_completions: [completion] }) }
  assert.throws(() => doc.assembleV340Document({ ...command, prepared: doc.prepareV340Inputs('Flow-1-2', values) }))
  const updated = doc.assembleV340Document({ ...command, prepared: doc.prepareV340Inputs('Flow-1-2', { ...values, user_input: '替换：feature-a' }) })
  assert.equal(updated.snapshot.contents[0].content_markdown, '新结构')
  assert.equal(updated.snapshot.revisions[0].before.content_markdown, '单向阀结构')
})

test('input/source injection, oversized text and fake source locators fail before producing a document', () => {
  assert.throws(() => doc.prepareV340Inputs('Flow-1-1', { research_request_text: 'a'.repeat(300001) }))
  assert.throws(() => doc.prepareV340Inputs('Flow-1-4', { application_type: 'fictional' }))
  const prepared = doc.prepareV340Inputs('Flow-1-1', { research_request_text: '原始文本' })
  assert.throws(() => doc.assembleV340Document({ nodeId: 'Flow-1-1', workflowRunUid: uid, generatedAt: time, prepared,
    output: result({ updates: [content({ content_origin: 'user_text', source_input_id: 'research_request_text', source_hash: hash('原始文本'), source_locator: '不存在的定位', trust_status: 'source_fact' })] }) }))
})

test('every node retains its full generated result and actual input bytes in the next cumulative snapshot', () => {
  const first = doc.assembleV340Document({ nodeId:'Flow-1-1',workflowRunUid:uid,generatedAt:time,
    prepared:doc.prepareV340Inputs('Flow-1-1',{research_request_text:'  原始材料\n第二行  '}),
    output:result({core_result_markdown:'该节点全部正文\n\n## 内嵌标题\n不应丢失'}) })
  const next = doc.assembleV340Document({ nodeId:'Flow-1-2',workflowRunUid:'87654321-1234-4234-8234-123456789abc',generatedAt:time,
    prepared:doc.prepareV340Inputs('Flow-1-2',{upstream_md_file:{filename:first.fileName,body:first.body,sha256:first.sha256}}),output:result() })
  assert.ok(next.snapshot.contents.some(x=>x.content_markdown==='该节点全部正文\n\n## 内嵌标题\n不应丢失'))
  assert.ok(next.snapshot.contents.some(x=>x.content_markdown==='  原始材料\n第二行  '))
  assert.ok(next.snapshot.warnings.some(x=>x.warning_id.includes('missing-table-T2')))
  assert.equal(next.snapshot.tables.T2.status,'missing')
  assert.equal(next.snapshot.tables.T6.status,'not_yet_generated')
})

test('changing only the visible core result is detected as a manual edit, not replaced with the old structured data', () => {
  const first = doc.assembleV340Document({nodeId:'Flow-1-1',workflowRunUid:uid,generatedAt:time,prepared:doc.prepareV340Inputs('Flow-1-1',{}),output:result()})
  const changed = first.body.replace('合成技术内容，不用于申报。','人工改写的新内容。')
  const upstream = doc.inspectV340Document({filename:first.fileName,body:changed,sha256:hash(changed)},'Flow-1-1')
  assert.equal(upstream.status,'warning')
  assert.ok(upstream.issues.includes('manual-edit'))
})

test('model cannot manufacture upstream provenance or collide with Host-retained content IDs', () => {
  const prepared = doc.prepareV340Inputs('Flow-1-1',{})
  const command = {nodeId:'Flow-1-1',workflowRunUid:uid,generatedAt:time,prepared}
  assert.throws(()=>doc.assembleV340Document({...command,output:result({updates:[content({content_origin:'upstream_snapshot'})]})}))
  assert.throws(()=>doc.assembleV340Document({...command,output:result({updates:[content({content_id:`host/${uid}/core`})],
    model_completions:[{...completion,content_id:`host/${uid}/core`}]})}))
})

test('literal fences in user/model prose do not masquerade as the authoritative downstream snapshot', () => {
  const first = doc.assembleV340Document({nodeId:'Flow-1-1',workflowRunUid:uid,generatedAt:time,
    prepared:doc.prepareV340Inputs('Flow-1-1',{}),output:result({core_result_markdown:'资料中的代码示例\n```oasis-v340\n{}\n```'})})
  const input = {filename:first.fileName,body:first.body,sha256:first.sha256}
  assert.equal(doc.inspectV340Document(input,'Flow-1-1').status,'accepted')
  assert.throws(()=>doc.assembleV340Document({nodeId:'Flow-1-2',workflowRunUid:uid,generatedAt:time,
    prepared:doc.prepareV340Inputs('Flow-1-2',{upstream_md_file:input}),output:result()}))
})
