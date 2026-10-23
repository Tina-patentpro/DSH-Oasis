import { z } from 'zod'
import { getV340Node, getV340Catalog, v340Hash, freezeV340 } from './v340-catalog.js'
import { v340DocumentBodySchema } from './v340-runtime-contract.js'

const text = z.string().min(1).max(300000).refine(v => v.trim().length > 0)
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,127}$/)
const sha = z.string().regex(/^[a-f0-9]{64}$/)
const jsonValue = z.json()
const safeRecord = z.record(z.string().max(128), jsonValue).refine(v => Object.keys(v).length <= 64)
const origins = z.enum(['upstream_snapshot','user_file','user_text','workflow_analysis','model_completed','human_confirmed'])
const contentSchema = z.object({ content_id: id, content_markdown: text, content_origin: origins,
  source_input_id: id, source_locator: text, source_hash: z.union([sha,z.literal('none')]),
  trust_status: z.enum(['source_fact','confirmed_fact','reasoned_inference','hypothesis_to_verify','excluded_from_formal_text']),
  last_updated_flow: z.string().max(32), revision_reason: text }).strict()
// Host-retained upstream prose may be a full document; model updates keep their original limit.
const retainedContentSchema=contentSchema.extend({content_markdown:v340DocumentBodySchema.refine(v=>v.trim().length>0)})
const warningSchema = z.object({ warning_id: id, first_flow: z.string().max(32), inherited_from: z.string().max(128),
  problem: text, affected_content: text, current_handling: text, model_completion: text,
  deliverable_impact: text, recommended_action: text, status: z.enum(['open','confirmed','resolved','accepted']) }).strict()
const completionSchema = z.object({ content_id: id, content_origin: z.literal('model_completed'), completion_basis: text,
  assumptions: text, confidence: z.string().min(1).max(128), affected_section: text, human_confirmation_status: z.literal('pending') }).strict()
const rowSchema = z.object({ row_id: id, data: safeRecord }).strict()
const tableNames = ['T1','T2','T3','T4','T5','T6']
const tablesSchema = z.object(Object.fromEntries(tableNames.map(t => [t, z.object({
  status: z.enum(['generated','not_yet_generated','missing']), rows: z.array(rowSchema).max(500),
}).strict()]))).strict()
const outputSchema = z.object({ summary: text, core_result_markdown: text,
  updates: z.array(contentSchema).max(256),
  tables: z.object(Object.fromEntries(tableNames.map(t => [t,z.array(rowSchema).max(500).optional()]))).strict(),
  terms_master: z.array(safeRecord).max(500), warnings: z.array(warningSchema).max(128),
  model_completions: z.array(completionSchema).max(256) }).strict()
const snapshotSchema = z.object({ schema_version: z.literal('oasis-v340-1'), node_id: z.string().max(32),
  workflow_run_uid: z.string().uuid(), generated_at: z.string().max(64), filename: z.string().max(200),
  upstream_run_uid: z.string().max(64), upstream_filename: z.string().max(255), upstream_file_sha256: z.union([sha,z.literal('none')]),
  application_type: z.enum(['invention','utility_model','undetermined']), terms_master: z.array(safeRecord).max(1000),
  tables: tablesSchema, contents: z.array(retainedContentSchema).max(1024), warnings: z.array(warningSchema).max(1024),
  model_completions: z.array(completionSchema).max(1024), manual_edit_manifest: z.array(safeRecord).max(256),
  revisions: z.array(safeRecord).max(256), input_history: z.array(safeRecord).max(256),
  current_result: z.object({ summary: text, core_result_markdown: v340DocumentBodySchema.refine(v=>v.trim().length>0) }).strict(),
  workflow_status: z.enum(['completed','completed_with_warnings']),
  deliverable_status: z.enum(['ready','ready_with_warnings','model_completed_pending_confirmation','not_recommended_for_filing']),
}).strict()
const fail = () => { throw new Error('V340_INVALID_DOCUMENT') }
const copy = value => structuredClone(value)
const stamp = time => {
  if (typeof time !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(time)) fail()
  const date = new Date(time)
  if (!Number.isFinite(date.getTime())) fail()
  return new Date(date.getTime() + 8 * 3600000).toISOString().slice(0,19)
}
const warning = (node, code, problem) => ({ warning_id: `host-${node}-${code}`, first_flow: node, inherited_from: 'none',
  problem, affected_content: '本次输入及下游累计快照', current_handling: '保留实际材料并继续输出', model_completion: '未评估',
  deliverable_impact: '需人工核对', recommended_action: '核对实际输入及其来源', status: 'open' })
const fence = body => {
  const ticks = '`'.repeat(Math.max(3,...[...body.matchAll(/`+/g)].map(m => m[0].length + 1)))
  return `${ticks}text\n${body}\n${ticks}`
}
const fileSchema = z.object({ filename: z.string().min(1).max(255).refine(v => !/[\\/\0\r\n]/.test(v)),
  body: z.string().max(300000), sha256: sha }).strict()
// Historical upstream inputs may be empty and retain a structure warning; outputs and edits remain nonempty.
const documentFileSchema=fileSchema.extend({body:v340DocumentBodySchema.or(z.literal(''))})

function snapshotBlocks(body) {
  const blocks = []
  let fenceChar = null, fenceLength = 0, capture = null
  for (const line of body.split('\n')) {
    if (!fenceChar) {
      const start = /^(`{3,}|~{3,})(.*)$/.exec(line)
      if (start) { fenceChar = start[1][0]; fenceLength = start[1].length; capture = start[2] === 'oasis-v340' ? [] : null }
    } else {
      const end = /^([`~]+)[ \t]*$/.exec(line)
      if (end && [...end[1]].every(c => c === fenceChar) && end[1].length >= fenceLength) {
        if (capture) blocks.push(capture.join('\n'))
        fenceChar = null; capture = null
      } else if (capture) capture.push(line)
    }
  }
  return blocks
}

// Input files are complete, Host-read UTF-8 snapshots, never URLs or metadata placeholders.
export function inspectV340Document(file, expectedNodeId) {
  const { filename, body, sha256 } = documentFileSchema.parse(file)
  if (v340Hash(body) !== sha256 || body.includes('\0')) fail()
  const blocks = snapshotBlocks(body)
  let snapshot = null
  const issues = []
  try {
    if (blocks.length !== 1) fail()
    snapshot = snapshotSchema.parse(JSON.parse(blocks[0]))
    const source = getV340Node(snapshot.node_id)
    const actualStamp = stamp(snapshot.generated_at).replace(/[-T:]/g,'')
    const canonicalName=`${source.filenamePrefix}_${actualStamp}_${snapshot.workflow_run_uid.replaceAll('-','').slice(0,8)}.md`
    // The approved body is immutable. API root writeback adds this exact physical-file alias.
    if (snapshot.node_id !== expectedNodeId || snapshot.filename !== canonicalName
      || ![canonicalName,canonicalName.replace(/\.md$/,'_OIW.md')].includes(filename)) issues.push('identity')
    const canonical = render(snapshot, snapshot.current_result.summary, snapshot.current_result.core_result_markdown)
    if (canonical !== body) issues.push('manual-edit')
  } catch { snapshot = null; issues.push('structure') }
  return { filename, body, sha256, snapshot, issues, status: issues.length ? 'warning' : 'accepted' }
}

export function prepareV340Inputs(nodeId, values) {
  const node = getV340Node(nodeId)
  if (!values || typeof values !== 'object' || Array.isArray(values) || Object.keys(values).some(k => !node.inputs.some(x => x.id === k))) fail()
  const receipts = {}, warnings = [], kept = {}
  let upstream = null, bytes = 0
  for (const input of node.inputs) {
    const value = values[input.id]
    if (value === undefined || value === '') {
      receipts[input.id] = { status: 'not_provided', sha256: 'none', content_origin: 'none', filename: 'not_provided' }
      if (input.importance === 'expected') warnings.push(warning(nodeId, `missing-${input.id}`, `未提供：${input.id}`))
      continue
    }
    let body, filename = '文本输入', origin = 'user_text', status = 'accepted'
    if (input.id.endsWith('_file')) {
      const file = (input.id==='upstream_md_file'?documentFileSchema:fileSchema).parse(value)
      if (v340Hash(file.body) !== file.sha256 || file.body.includes('\0')) fail()
      body = file.body; filename = file.filename; origin = input.id === 'upstream_md_file' ? 'upstream_snapshot' : 'user_file'
      if (input.id === 'upstream_md_file') {
        upstream = inspectV340Document(file, node.upstreamNodeId)
        status = upstream.status
        for (const issue of upstream.issues) warnings.push(warning(nodeId, `upstream-${issue}`, '前序文件身份、格式或人工修改尚待核对；实际文件完整保留。'))
      }
    } else if (input.channel === '配置') {
      if (input.id === 'application_type') z.enum(['invention','utility_model','undetermined']).parse(value)
      else if(input.id==='max_fetch'){if(!Number.isSafeInteger(value)||value<=0)fail()}
      else if (!value || typeof value !== 'object' || Array.isArray(value)) fail()
      body = JSON.stringify(jsonValue.parse(value)); origin = 'configuration'; filename = '配置值'
    } else {
      if (typeof value !== 'string' || value.length > 300000 || value.includes('\0')) fail()
      body = value
    }
    bytes += Buffer.byteLength(body)
    if (bytes > 2 * 1024 * 1024) fail()
    kept[input.id] = copy(value)
    receipts[input.id] = { status, sha256: v340Hash(body), filename, content_origin: origin }
  }
  const inputHash = v340Hash(JSON.stringify({ nodeId, receipts }))
  return freezeV340({ nodeId, values: kept, receipts, warnings, upstream, inputHash })
}

function render(snapshot, summary, core) {
  const metadata = ['node_id','workflow_run_uid','generated_at','filename','upstream_run_uid','upstream_filename','upstream_file_sha256','workflow_status','deliverable_status']
    .map(k => `- ${k}: ${snapshot[k]}`).join('\n')
  return `# V3.4.0累计文稿\n\n## 文档信息\n\n- business_version: V3.4.0\n${metadata}\n\n## 核心结论\n\n${summary}\n\n## 核心结果\n\n${fence(core)}\n\n## 下游读取区\n\n\`\`\`oasis-v340\n${JSON.stringify(snapshot,null,2)}\n\`\`\`\n\n## 风险与待确认事项\n\n${fence(JSON.stringify(snapshot.warnings,null,2))}\n`
}

// Human edits change the core prose, never the inherited evidence or structured technical tables.
export function reviseV340Document(parent,{workflowRunUid,generatedAt,body}){
  const core=v340DocumentBodySchema.refine(v=>v.trim().length>0).parse(body)
  const uid=z.string().uuid().parse(workflowRunUid).toLowerCase(),snapshot=snapshotSchema.parse(copy(parent.snapshot))
  const local=stamp(generatedAt),node=getV340Node(snapshot.node_id)
  const oldUid=snapshot.workflow_run_uid
  snapshot.workflow_run_uid=uid;snapshot.generated_at=`${local}+08:00`
  snapshot.filename=`${node.filenamePrefix}_${local.replace(/[-T:]/g,'')}_${uid.replaceAll('-','').slice(0,8)}.md`
  snapshot.manual_edit_manifest.push({source_run_uid:oldUid,source_file_sha256:parent.sha256,revision_uid:uid,
    edited_section:'核心结果',before_sha256:v340Hash(snapshot.current_result.core_result_markdown),after_sha256:v340Hash(core),reason:'人工编辑；技术事实、表和来源仍需独立核对'})
  snapshot.current_result.core_result_markdown=core
  snapshot.contents.push({content_id:`host/${uid}/${node.nodeId}/core`,content_markdown:core,content_origin:'user_text',
    source_input_id:'manual_edit',source_locator:'人工修订核心正文',source_hash:v340Hash(core),trust_status:'hypothesis_to_verify',
    last_updated_flow:node.nodeId,revision_reason:'保留原正文和人工修订；不自动确认技术事实'})
  snapshot.warnings.push({...warning(node.nodeId,`manual-${uid}`,'核心正文经人工修改；累计表、来源和技术语义需要重新核对。'),inherited_from:oldUid})
  snapshot.workflow_status='completed_with_warnings';snapshot.deliverable_status='not_recommended_for_filing'
  const validated=snapshotSchema.parse(snapshot),document=render(validated,validated.current_result.summary,core)
  v340DocumentBodySchema.parse(document)
  return freezeV340({body:document,fileName:validated.filename,sha256:v340Hash(document),snapshot:validated})
}

export function assembleV340Document({ nodeId, workflowRunUid, generatedAt, prepared, output }) {
  const node = getV340Node(nodeId)
  const input = prepareV340Inputs(nodeId, prepared.values)
  if (prepared.nodeId !== nodeId || prepared.inputHash !== input.inputHash) fail()
  const uid = z.string().uuid().parse(workflowRunUid).toLowerCase(), local = stamp(generatedAt)
  const model = outputSchema.parse(output)
  const previous = input.upstream?.snapshot
  if (previous && previous.input_history.some(entry => entry.workflow_run_uid === uid)) fail()
  const snapshot = previous ? copy(previous) : { application_type: 'undetermined', terms_master: [],
    tables: Object.fromEntries(tableNames.map(t => [t,{ status: 'not_yet_generated', rows: [] }])),
    contents: [], warnings: [], model_completions: [], manual_edit_manifest: [], revisions: [], input_history: [] }
  Object.assign(snapshot, { schema_version: 'oasis-v340-1', node_id: nodeId, workflow_run_uid: uid,
    generated_at: `${local}+08:00`, filename: `${node.filenamePrefix}_${local.replace(/[-T:]/g,'')}_${uid.replaceAll('-','').slice(0,8)}.md`,
    upstream_run_uid: previous?.workflow_run_uid ?? 'none', upstream_filename: input.upstream?.filename ?? 'none',
    upstream_file_sha256: input.upstream?.sha256 ?? 'none' })
  if (input.upstream?.issues.length) {
    const legacyId = `host/upstream/${input.upstream.sha256.slice(0,24)}`
    snapshot.contents.push({ content_id: legacyId, content_markdown: input.upstream.body, content_origin: 'upstream_snapshot',
      source_input_id: 'upstream_md_file', source_locator: input.upstream.filename, source_hash: input.upstream.sha256,
      trust_status: 'hypothesis_to_verify', last_updated_flow: nodeId, revision_reason: '保留实际人工版本，不能以旧结构快照覆盖实际正文' })
    snapshot.manual_edit_manifest.push({ node_id: nodeId, source_hash: input.upstream.sha256, reason: '实际文件与结构化合同或身份不一致，待人工确认' })
  }
  if (input.values.application_type) snapshot.application_type = input.values.application_type
  const directives = new Set((input.values.user_input ?? '').split(/\r?\n/).map(v => v.trim()))
  const replace = (list, item, key, prefix = '') => {
    const at = list.findIndex(old => old[key] === item[key])
    if (at < 0) { list.push(copy(item)); return }
    if (JSON.stringify(list[at]) === JSON.stringify(item)) return
    if (!directives.has(`替换：${prefix}${item[key]}`)) fail()
    snapshot.revisions.push({ node_id: nodeId, content_id: `${prefix}${item[key]}`, before: copy(list[at]), after: copy(item), reason: '用户明确替换指令；未自动确认技术事实' })
    list[at] = copy(item)
  }
  const completionIds = new Set()
  for (const entry of model.model_completions) {
    if (completionIds.has(entry.content_id) || !model.updates.some(x => x.content_id === entry.content_id && x.content_origin === 'model_completed')) fail()
    completionIds.add(entry.content_id)
  }
  const newIds = new Set()
  for (const entry of model.updates) {
    if (newIds.has(entry.content_id) || entry.content_id.startsWith('host/') || entry.last_updated_flow !== nodeId
      || ['human_confirmed','upstream_snapshot'].includes(entry.content_origin) || entry.trust_status === 'confirmed_fact') fail()
    newIds.add(entry.content_id)
    if (entry.content_origin === 'model_completed' && !completionIds.has(entry.content_id)) fail()
    if (['user_file','user_text'].includes(entry.content_origin)) {
      const source = input.values[entry.source_input_id], receipt = input.receipts[entry.source_input_id]
      const body = typeof source === 'string' ? source : source?.body
      if (!body || !receipt || receipt.content_origin !== entry.content_origin || receipt.sha256 !== entry.source_hash || !body.includes(entry.source_locator)) fail()
    } else if (entry.trust_status === 'source_fact') fail()
    replace(snapshot.contents, entry, 'content_id')
  }
  for (const completion of model.model_completions) {
    // Each generation retains its completion assessment, including older assessments.
    if (!snapshot.model_completions.some(old => JSON.stringify(old) === JSON.stringify(completion))) snapshot.model_completions.push(copy(completion))
  }
  for (const t of tableNames) if (model.tables[t]) {
    const seen = new Set()
    for (const row of model.tables[t]) {
      if (seen.has(row.row_id)) fail()
      seen.add(row.row_id); replace(snapshot.tables[t].rows, row, 'row_id', `${t}/`)
    }
    if (snapshot.tables[t].rows.length) snapshot.tables[t].status = 'generated'
  }
  for (const term of model.terms_master) if (!snapshot.terms_master.some(old => JSON.stringify(old) === JSON.stringify(term))) snapshot.terms_master.push(copy(term))
  const warningIds = new Set(snapshot.warnings.map(x => x.warning_id))
  const hostWarnings = [...input.warnings, warning(nodeId,'professional-review','仅核对结构、来源和累计传递；技术语义及专业质量尚待人工审核。')]
  const index = getV340Catalog().nodes.findIndex(n => n.nodeId === nodeId)
  for (const [i,t] of tableNames.entries()) if (index >= [0,1,1,5,8,10][i] && !snapshot.tables[t].rows.length) {
    snapshot.tables[t].status = 'missing'
    hostWarnings.push(warning(nodeId,`missing-table-${t}`,`${t}已到生产节点但未取得表内容；未伪装为尚未生产或验证通过。`))
  }
  for (const entry of [...hostWarnings, ...model.warnings]) {
    if (model.warnings.includes(entry) && (entry.status !== 'open' || entry.first_flow !== nodeId || entry.inherited_from !== 'none' || warningIds.has(entry.warning_id))) fail()
    if (!warningIds.has(entry.warning_id)) { snapshot.warnings.push(copy(entry)); warningIds.add(entry.warning_id) }
  }
  // Retain actual inputs and every node's complete prose independently of model-proposed updates.
  // Downstream cannot lose them by returning an empty update list.
  const retain = (contentId, body, origin, sourceInput, sourceHash, sourceLocator) => {
    if (!body.trim()) return
    snapshot.contents.push({ content_id:contentId, content_markdown:body, content_origin:origin,
      source_input_id:sourceInput,source_locator:sourceLocator,source_hash:sourceHash,
      trust_status:origin === 'user_file' || origin === 'user_text' ? 'source_fact' : 'reasoned_inference',
      last_updated_flow:nodeId,revision_reason:'Host逐字保留实际输入/节点正文；技术语义未自动确认' })
  }
  for (const [key,value] of Object.entries(input.values)) if (key !== 'upstream_md_file') {
    const receipt = input.receipts[key]
    const body = typeof value === 'string' ? value : key.endsWith('_file') ? value.body : JSON.stringify(value)
    retain(`host/${uid}/${nodeId}/input-${key}`,body,receipt.content_origin === 'configuration' ? 'user_text' : receipt.content_origin,
      key,receipt.sha256,receipt.filename)
  }
  retain(`host/${uid}/${nodeId}/core`,model.core_result_markdown,'workflow_analysis','none','none','本节点核心结果')
  retain(`host/${uid}/${nodeId}/summary`,model.summary,'workflow_analysis','none','none','本节点核心结论')
  snapshot.current_result = { summary:model.summary,core_result_markdown:model.core_result_markdown }
  snapshot.input_history.push({ node_id: nodeId, workflow_run_uid: uid, input_sha256: input.inputHash, inputs: copy(input.receipts) })
  const open = snapshot.warnings.some(x => x.status === 'open')
  snapshot.workflow_status = open ? 'completed_with_warnings' : 'completed'
  snapshot.deliverable_status = snapshot.model_completions.length ? 'model_completed_pending_confirmation' : open ? 'ready_with_warnings' : 'ready'
  const validated = snapshotSchema.parse(snapshot)
  const body = render(validated, model.summary, model.core_result_markdown)
  if (!v340DocumentBodySchema.safeParse(body).success) fail()
  return freezeV340({ body, fileName: validated.filename, sha256: v340Hash(body), snapshot: validated })
}
