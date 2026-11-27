import { createHash } from 'node:crypto'

export const LOCAL_MOCK_VERSION = '1'
export const LOCAL_MOCK_VERSIONS = Object.freeze(['1'])
export const LOCAL_MOCK_DISCLAIMER = '本结果为本地确定性 local-mock 演练草稿，仅重组用户输入和材料元数据；材料哈希在本机通过流式读取计算，正文未提取、未持久化且未用于生成。本结果不构成技术、专利或法律专业结论，必须由具备相应资质的人员复核。'

const REQUIRED_HEADINGS = Object.freeze([
  '文档信息',
  '核心结论',
  '核心结果',
  '下游读取区',
  '来源与附件',
  '质量状态',
  '风险与待确认事项',
  '辅助文档',
])
const PREVIEW_TEXT_CHARS = 2000
const PREVIEW_LIST_ITEMS = 16
const PREVIEW_LIST_ITEM_CHARS = 400
const RESULT_ITEM_LIMIT = 64
const TRUNCATION_MARKER = '…（已按本地演练预览上限截断；完整输入仍保留在 input snapshot）'

function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function canonicalValue(value, seen) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Canonical JSON only accepts finite numbers')
    return JSON.stringify(value)
  }
  if (typeof value !== 'object') throw new TypeError('Canonical JSON only accepts JSON values')
  if (seen.has(value)) throw new TypeError('Canonical JSON does not accept cyclic values')
  seen.add(value)
  try {
    if (Array.isArray(value)) return `[${value.map((item) => canonicalValue(item, seen)).join(',')}]`
    const entries = Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalValue(value[key], seen)}`
    ))
    return `{${entries.join(',')}}`
  } finally {
    seen.delete(value)
  }
}

export function canonicalJson(value) {
  return canonicalValue(value, new WeakSet())
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function stableMaterialEvidence(reference) {
  const {
    referenceId,
    kind,
    relativePath,
    displayName,
    mediaType,
    sizeBytes,
    sha256: materialSha256,
    confirmedAt,
  } = reference
  return {
    referenceId,
    kind,
    relativePath,
    displayName,
    mediaType,
    sizeBytes,
    sha256: materialSha256,
    confirmedAt,
  }
}

function assertLocalMockVersion(mockVersion) {
  if (!LOCAL_MOCK_VERSIONS.includes(mockVersion)) {
    throw new TypeError(`Unsupported local mock version: ${String(mockVersion)}`)
  }
  return mockVersion
}

function inputHashPayload({
  mockVersion = LOCAL_MOCK_VERSION,
  workflowId,
  workflowVersion,
  formValues,
  inputRefs,
}) {
  return {
    mockVersion: assertLocalMockVersion(mockVersion),
    workflowId,
    workflowVersion,
    formValues,
    inputRefs: inputRefs.map(stableMaterialEvidence),
  }
}

export function computeCanonicalInputSha256(input) {
  return sha256(canonicalJson(inputHashPayload(input)))
}

export function createCanonicalInputSnapshot({
  mockVersion = LOCAL_MOCK_VERSION,
  workflowId,
  workflowVersion,
  formValues,
  inputRefs,
  capturedAt,
}) {
  if (typeof workflowId !== 'string' || typeof workflowVersion !== 'string') {
    throw new TypeError('workflow identity is required')
  }
  if (!formValues || typeof formValues !== 'object' || Array.isArray(formValues)) {
    throw new TypeError('formValues must be an object')
  }
  if (!Array.isArray(inputRefs)) throw new TypeError('inputRefs must be an array')
  if (typeof capturedAt !== 'string') throw new TypeError('capturedAt is required')

  const detached = {
    formValues: structuredClone(formValues),
    inputRefs: structuredClone(inputRefs),
    capturedAt,
  }
  return deepFreeze({
    ...detached,
    sha256: computeCanonicalInputSha256({ mockVersion, workflowId, workflowVersion, ...detached }),
  })
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function previewText(value, maxChars = PREVIEW_TEXT_CHARS) {
  const text = String(value)
  return text.length <= maxChars ? text : `${text.slice(0, maxChars)}${TRUNCATION_MARKER}`
}

function safeCodeBlock(value, maxChars = PREVIEW_TEXT_CHARS) {
  const normalized = escapeHtml(previewText(value, maxChars)).replace(/\r\n?/g, '\n')
  return normalized.split('\n').map((line) => `    ${line}`).join('\n')
}

function safeListBlock(values, emptyText = '未提供') {
  if (!Array.isArray(values) || values.length === 0) return safeCodeBlock(emptyText)
  const visible = values.slice(0, PREVIEW_LIST_ITEMS).map((value, index) => (
    safeCodeBlock(`${index + 1}. ${value}`, PREVIEW_LIST_ITEM_CHARS)
  ))
  if (values.length > PREVIEW_LIST_ITEMS) visible.push(safeCodeBlock(TRUNCATION_MARKER))
  return visible.join('\n')
}

function section(sectionId, title, body) {
  return { sectionId, title, body }
}

function technicalResult(formValues) {
  const risks = [
    '本地 mock 未提取、未持久化或理解材料正文，所有技术判断均需人工复核。',
  ]
  const questions = []
  if (formValues.evidenceStatus !== 'verified') {
    risks.push(`当前证据状态为 ${formValues.evidenceStatus}，关键事实尚未全部核验。`)
    questions.push('哪些关键事实、参数或实验结果仍需补充核验？')
  }
  if (!formValues.expectedDeliverable) questions.push('需要确认最终交付物的格式和验收标准。')

  return {
    contentStatus: 'warning',
    sections: [
      section('problem-decomposition', '问题分解', `研发目标：${formValues.objective}\n当前状态：${formValues.currentState}`),
      section('candidate-solutions', '候选方案空间', '仅给出待评估方向：参数优化、控制逻辑调整、结构或流程替代；不补写外部事实。'),
      section('risks', '风险', risks.join('\n')),
      section('verification-plan', '验证计划', '确认基线与指标；逐项验证约束；记录数据、偏差和复核结论。'),
      section('deliverables', '交付清单', formValues.expectedDeliverable || '待确认交付物及验收标准。'),
    ],
    risks,
    questions,
    coreMarkdown: [
      '### 问题分解',
      safeCodeBlock(`研发目标：${formValues.objective}\n当前状态：${formValues.currentState}`),
      '### 候选方案空间',
      safeCodeBlock('参数优化；控制逻辑调整；结构或流程替代。以上仅为待评估方向。'),
      '### 风险',
      safeListBlock(risks),
      '### 验证计划',
      safeCodeBlock('确认基线与指标；逐项验证约束；记录数据、偏差和复核结论。'),
      '### 交付清单',
      safeCodeBlock(formValues.expectedDeliverable || '待确认交付物及验收标准。'),
      '### 约束条件',
      safeListBlock(formValues.constraints),
    ].join('\n\n'),
  }
}

function patentResult(formValues) {
  const unconfirmedFacts = formValues.unconfirmedFacts ?? []
  const risks = [
    '本地 mock 不提供授权前景、侵权或有效性判断，权利要求及说明书必须由专业人员复核。',
  ]
  const questions = [...unconfirmedFacts]
  if (unconfirmedFacts.length > 0) risks.push('存在尚未确认的事实，当前草稿禁止批准或写回。')
  if (!formValues.knownPriorArt && questions.length < RESULT_ITEM_LIMIT) {
    questions.push('需要补充申请人已知的现有技术及其不足。')
  }
  if (!formValues.desiredScope && questions.length < RESULT_ITEM_LIMIT) {
    questions.push('需要确认拟保护主题及范围偏好。')
  }

  const terminology = formValues.terms?.length > 0 ? formValues.terms : ['待补充术语及定义']
  return {
    contentStatus: unconfirmedFacts.length > 0 ? 'blocked' : 'warning',
    sections: [
      section('terminology', '术语表', terminology.join('\n')),
      section('support-matrix', '支持关系矩阵', '逐项核对发明构思、技术交底段落和拟保护技术特征；缺口标记为待确认。'),
      section('claim-strategy', '权利要求策略骨架', `围绕发明构思组织独立权利要求：${formValues.inventiveConcept}`),
      section('claims-outline', '权利要求书骨架', '独立权利要求：主题、必要技术特征、关系；从属权利要求：参数、结构、步骤和备选限定。'),
      section('specification-outline', '说明书骨架', '技术领域、背景技术、发明内容、附图说明、具体实施方式。'),
      section('questions', '问题清单', questions.length > 0 ? questions.join('\n') : '无阻断问题，仍需人工专业复核。'),
    ],
    risks,
    questions,
    coreMarkdown: [
      '### 术语表',
      safeListBlock(terminology),
      '### 支持关系矩阵',
      safeCodeBlock(`发明构思：${formValues.inventiveConcept}\n技术交底：${formValues.technicalDisclosure}\n已知现有技术：${formValues.knownPriorArt || '未提供'}`),
      '### 权利要求策略骨架',
      safeCodeBlock(`围绕以下发明构思组织独立权利要求，并用从属权利要求承接备选限定：${formValues.inventiveConcept}`),
      '### 权利要求书骨架',
      safeCodeBlock('独立权利要求：主题、必要技术特征、技术特征关系。\n从属权利要求：参数、结构、步骤和备选限定。'),
      '### 说明书骨架',
      safeCodeBlock('技术领域；背景技术；发明内容；附图说明；具体实施方式。'),
      '### 问题清单',
      safeListBlock(questions, '无阻断问题，仍需人工专业复核。'),
      '### 期望保护范围',
      safeCodeBlock(formValues.desiredScope || '待确认拟保护主题及范围偏好。'),
    ].join('\n\n'),
  }
}

function materialMarkdown(inputRefs) {
  if (inputRefs.length === 0) return safeCodeBlock('未登记材料。')
  const visible = inputRefs.slice(0, PREVIEW_LIST_ITEMS).map((reference, index) => safeCodeBlock([
    `${index + 1}. ${reference.displayName}`,
    `relative_path: ${reference.relativePath}`,
    `media_type: ${reference.mediaType}`,
    `size_bytes: ${reference.sizeBytes}`,
    `sha256: ${reference.sha256}`,
  ].join('\n')))
  if (inputRefs.length > PREVIEW_LIST_ITEMS) visible.push(safeCodeBlock(TRUNCATION_MARKER))
  return visible.join('\n\n')
}

function buildArtifactBody({ mockVersion, workflowId, workflowVersion, inputSnapshot, domainResult }) {
  const statusText = domainResult.contentStatus === 'blocked'
    ? '存在未确认事实，当前结果被阻断。'
    : '结构化演练已完成，但只能作为待人工复核的 warning 草稿。'
  const values = inputSnapshot.formValues
  const overview = workflowId === 'technical-rd'
    ? `研发目标：${values.objective}\n证据状态：${values.evidenceStatus}`
    : `发明构思：${values.inventiveConcept}\n待确认事实数：${values.unconfirmedFacts?.length ?? 0}`

  const sectionBodies = [
    [REQUIRED_HEADINGS[0], [
      `- workflow: \`${workflowId}@${workflowVersion}\``,
      `- mode: \`local-mock\``,
      `- mock_version: \`${mockVersion}\``,
      `- input_sha256: \`${inputSnapshot.sha256}\``,
      '',
      LOCAL_MOCK_DISCLAIMER,
    ].join('\n')],
    [REQUIRED_HEADINGS[1], `${statusText}\n\n${safeCodeBlock(overview)}`],
    [REQUIRED_HEADINGS[2], domainResult.coreMarkdown],
    [REQUIRED_HEADINGS[3], [
      `- content_status: \`${domainResult.contentStatus}\``,
      `- workflow: \`${workflowId}@${workflowVersion}\``,
      `- input_sha256: \`${inputSnapshot.sha256}\``,
      '- downstream_action: 人工复核后决定是否批准导出此 mock 草稿。',
    ].join('\n')],
    [REQUIRED_HEADINGS[4], `${materialMarkdown(inputSnapshot.inputRefs)}\n\n仅使用上述文件名、类型、大小和哈希；哈希在本机通过流式读取计算，正文未提取、未持久化且未用于生成。`],
    [REQUIRED_HEADINGS[5], `- content_status: \`${domainResult.contentStatus}\`\n- review_status: \`not-reviewed\`\n\n${LOCAL_MOCK_DISCLAIMER}`],
    [REQUIRED_HEADINGS[6], [
      '### 风险',
      safeListBlock(domainResult.risks, '无额外风险；仍需人工复核。'),
      '### 待确认事项',
      safeListBlock(domainResult.questions, '无阻断问题；仍需人工复核。'),
    ].join('\n\n')],
    [REQUIRED_HEADINGS[7], '无。Week 3 `local-mock` 不生成独立辅助文件。'],
  ]
  return `${sectionBodies.map(([heading, body]) => `## ${heading}\n\n${body}`).join('\n\n')}\n`
}

function runLocalMockV1({ workflowId, workflowVersion, inputSnapshot }) {
  if (!inputSnapshot || typeof inputSnapshot !== 'object') throw new TypeError('inputSnapshot is required')
  const expectedHash = computeCanonicalInputSha256({
    mockVersion: '1',
    workflowId,
    workflowVersion,
    ...inputSnapshot,
  })
  if (inputSnapshot.sha256 !== expectedHash) throw new TypeError('inputSnapshot sha256 does not match its canonical input')

  let domainResult
  let suggestedFileName
  if (workflowId === 'technical-rd' && workflowVersion === '1') {
    domainResult = technicalResult(inputSnapshot.formValues)
    suggestedFileName = 'technical-rd-v1-local-mock.md'
  } else if (workflowId === 'cn-invention-patent' && workflowVersion === '1') {
    domainResult = patentResult(inputSnapshot.formValues)
    suggestedFileName = 'cn-invention-patent-v1-local-mock.md'
  } else {
    throw new TypeError(`Unsupported local mock workflow: ${workflowId}@${workflowVersion}`)
  }

  const body = buildArtifactBody({
    mockVersion: '1',
    workflowId,
    workflowVersion,
    inputSnapshot,
    domainResult,
  })
  const artifactSha256 = sha256(body)
  return deepFreeze({
    contentStatus: domainResult.contentStatus,
    sections: domainResult.sections,
    risks: domainResult.risks,
    questions: domainResult.questions,
    disclaimer: LOCAL_MOCK_DISCLAIMER,
    artifact: {
      artifactId: `sha256:${artifactSha256}`,
      suggestedFileName,
      mediaType: 'text/markdown',
      body,
      sha256: artifactSha256,
    },
  })
}

const LOCAL_MOCK_RUNNERS = Object.freeze({
  1: Object.freeze(runLocalMockV1),
})

export function runLocalMock({
  mockVersion = LOCAL_MOCK_VERSION,
  workflowId,
  workflowVersion,
  inputSnapshot,
}) {
  const runner = LOCAL_MOCK_RUNNERS[assertLocalMockVersion(mockVersion)]
  return runner({ workflowId, workflowVersion, inputSnapshot })
}
