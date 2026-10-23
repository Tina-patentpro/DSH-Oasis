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
