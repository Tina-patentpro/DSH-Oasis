import { assertFast39Text as scalarText } from './m06-fast39-json.js'

// Pure deterministic rendering shared by initial validation and record reload.
function need(value) {
  if (!value) throw Object.assign(new Error('Fast39结果不符合冻结合同；未截断、补造或重新派发。'), { code: 'FAST39_RESULT_FIELDS_INVALID' })
}

function fenced(text) {
  scalarText(text)
  const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map(x => x[0].length))
  const fence = '`'.repeat(Math.max(3, longest + 1))
  return `${fence}text\n${text}\n${fence}`
}
export function renderM06Fast39Pending(report) {
  const missing = report.required_missing_input_lines
  need(missing.every(line => line.startsWith('未提供：') && !/[\r\n]/.test(line)))
  const lines = [`状态：${report.quality_status}`, '输入缺项：',
    ...(missing.length ? missing.map(line => '- ' + line) : ['未列出；不表示已无风险。'])]
  const groups = [
    ['原材料警示', report.input_warnings.map(w => scalarText(w.problem))], ['原材料限制', report.limitations],
    ['Outline原警示', report.outline_quality.warnings],
    ['Outline后续提示', report.outline_quality.fallback_hint ? [report.outline_quality.fallback_hint] : []],
    ['Outline错误', report.outline_error ? [report.outline_error] : []],
    ['编号提示', report.marker_warnings], ['依赖提示', report.dependency_warnings],
  ]
  for (const [label, values] of groups) {
    lines.push(label + '：', ...(values.length ? values.map(fenced) : ['未列出；不表示已无风险。']))
  }
  lines.push(`Outline原状态：${report.outline_quality.status}`, `依赖解析状态：${report.dependency_parse_status}`,
    '来源技术支持与专业接受：未评估；须人工复核。')
  return lines.join('\n')
}
function cell(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\r\n|\r|\n/g, '〈换行〉').replace(/[\u0001-\u001f\u007f]/g, c => `〈U+${c.charCodeAt(0).toString(16).padStart(4, '0')}〉`)
    .replace(/\\/g, '\\\\').replace(/[|`*_\[\]()#!~]/g, c => '\\' + c)
    .replace(/\bhttps?:/gi, s => '&#104;' + s.slice(1)).replace(/\bwww\./gi, 'www&#46;').replace(/@/g, '&#64;')
}
export function renderM06Fast39Output(outputs, report) {
  const rows = ['|权项／计划|特征|input_id|正文hash|原文短引|UTF16区间|处置|', '|---|---|---|---|---|---|---|']
  for (const d of report.feature_dispositions) {
    const sources = report.source_map.filter(s => s.planned_claim_id === d.planned_claim_id && s.feature_id === d.feature_id)
    const values = sources.length ? sources.map(s => [
      `${s.claim_id ?? '未映射'}／${s.planned_claim_id}`, s.feature_id, s.input_id, s.source_sha256,
      s.quote, `[${s.start_utf16},${s.end_utf16})`, `${d.action}／${d.locator_status}`,
    ]) : [[`${d.claim_id ?? '未映射'}／${d.planned_claim_id}`, d.feature_id, '未核', '未核', '未核', '未核', `${d.action}／${d.locator_status}`]]
    for (const row of values) rows.push('|' + row.map(cell).join('|') + '|')
  }
  // Only the display tree is lowered; the six received strings stay untouched.
  const tree = markdownLines(outputs.dependency_tree, (line, literal) => literal ? line : line.replace(/^( {0,3})## /, '$1### '))
  return `## 权利要求草稿\n${outputs.claims_text}\n\n${tree}\n\n## 材料缺项与未确认事项\n${renderM06Fast39Pending(report)}\n\n## 技术特征来源\n${rows.join('\n')}`
}
export function visibleFast39Sections(text) {
  const sections = []
  markdownLines(text, (line, literal) => {
    if (!literal) { const h = /^ {0,3}## ([^#].*?)\s*$/.exec(line); if (h) sections.push(h[1]) }
    return line
  })
  return sections
}
function markdownLines(text, visit) {
  const parts = text.split(/(\r\n|\r|\n)/)
  let fence = null
  for (let i = 0; i < parts.length; i += 2) {
    const line = parts[i]
    const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
    let literal = fence !== null
    if (match) {
      if (fence) {
        if (match[1][0] === fence[0] && match[1].length >= fence.length && /^[ \t]*$/.test(match[2])) fence = null
      } else if (match[1][0] !== '`' || !match[2].includes('`')) {
        fence = match[1]; literal = true
      }
    }
    parts[i] = visit(line, literal)
  }
  return parts.join('')
}

