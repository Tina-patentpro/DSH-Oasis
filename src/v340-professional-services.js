export const PATENT_DRAWING_DESCRIPTION_TOOL_ID = 'patent-drawing-description'

// The production catalogue entry and execution detail have distinct identities.
const services = Object.freeze({
  'Flow-1-1': Object.freeze({
    categoryId: 16, catalogId: 220, detailId: 25, endpoint: '技术背景研究报告-Pro', apiType: 'LLM', executionMode: 'async',
  }),
  'Flow-1-2': Object.freeze({
    categoryId: 19, catalogId: 218, detailId: 42, endpoint: 'F-1-2-Triz分析-Pro', executionMode: 'async',
  }),
  'Flow-1-5': Object.freeze({
    categoryId: 4, catalogId: 223, detailId: 41, endpoint: 'F-1-5-技术交底书完善-Basic', executionMode: 'async',
  }),
  'Flow-2-6': Object.freeze({
    categoryId: 6, catalogId: 215, detailId: 46, endpoint: 'F-2-6-权利要求书生成-Basic', executionMode: 'async',
  }),
  'Flow-2-7': Object.freeze({ categoryId: 13, catalogId: 222, detailId: 32, endpoint: 'F-2-7-说明书生成-Basic' }),
  'Flow-5-13': Object.freeze({ categoryId: 12, catalogId: 221, detailId: 43, endpoint: 'F-5-13-申请文件检查-Basic' }),
  'Flow-6-14': Object.freeze({ categoryId: 7, catalogId: 213, detailId: 20, endpoint: 'F-6-14-审查意见答复-Basic' }),
  [PATENT_DRAWING_DESCRIPTION_TOOL_ID]: Object.freeze({
    categoryId: 18, catalogId: 167, detailId: 34, endpoint: '专利附图说明生成', executionMode: 'sync',
  }),
})

export function v340ProfessionalService(nodeId) {
  return Object.hasOwn(services, nodeId) ? services[nodeId] : undefined
}

export function professionalServiceForTask(task) {
  if (task.v340) return v340ProfessionalService(task.v340.nodeId)
  if (task.workflowId === PATENT_DRAWING_DESCRIPTION_TOOL_ID
    && task.workflowVersion === '1' && task.workType === 'cn-invention-patent') {
    return services[PATENT_DRAWING_DESCRIPTION_TOOL_ID]
  }
}

export function v340ProfessionalServiceForEndpoint(endpoint) {
  return Object.values(services).find(service => service.endpoint === endpoint)
}

export function matchesV340ProfessionalCatalog(service, entry) {
  return !!service && entry.categoryId === service.categoryId
    && entry.apiId === service.catalogId && entry.apiEndpoint === service.endpoint
}

export function matchesV340ProfessionalDetail(service, detail) {
  return !!service && detail.id === service.detailId && detail.name === service.endpoint
    && detail.apiType === (service.apiType ?? 'Workflow')
    && (service.executionMode === undefined || detail.executionMode === service.executionMode)
}

export const v340ProfessionalMaterialPolicy = Object.freeze({
  acceptedExtensions: Object.freeze([
    '.txt', '.md', '.markdown', '.pdf', '.html', '.xlsx', '.xls', '.doc', '.docx', '.csv', '.eml', '.msg',
    '.pptx', '.ppt', '.xml', '.json', '.epub', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg',
  ]),
  maxFiles: 64,
  maxFileBytes: 10 * 1024 * 1024,
  contentReadMode: 'metadata-only',
})
