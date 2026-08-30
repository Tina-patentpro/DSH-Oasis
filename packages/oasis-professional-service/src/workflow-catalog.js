import { z } from 'zod'

import {
  workflowCatalogResponseSchema,
} from './workbench-contract.js'

const WORKFLOW_DEFINITIONS = [
  {
    workflowId: 'technical-rd',
    workflowVersion: '1',
    workType: 'technical-rd',
    title: '技术研发辅助',
    description: '以本地确定性演练方式完成问题拆解、候选方案和验证计划。',
    executionMode: 'local-mock',
    materialPolicy: {
      acceptedExtensions: ['.txt', '.md', '.pdf', '.docx', '.png', '.jpg', '.jpeg'],
      maxFiles: 64,
      maxFileBytes: 50 * 1024 * 1024,
      contentReadMode: 'metadata-only',
    },
    outputSections: ['problem-decomposition', 'candidate-solutions', 'risks', 'verification-plan', 'deliverables'],
    form: {
      fields: [
        {
          fieldId: 'objective', control: 'long-text', label: '研发目标',
          description: '说明需要解决的技术问题和期望改善。', required: true, maxChars: 8000,
        },
        {
          fieldId: 'currentState', control: 'long-text', label: '当前状态',
          description: '说明已有方案、技术基线和已知现象。', required: true, maxChars: 12000,
        },
        {
          fieldId: 'constraints', control: 'string-list', label: '约束条件',
          description: '列出不可突破的设备、时间或合规约束。', required: false, maxItems: 32, itemMaxChars: 500,
        },
        {
          fieldId: 'evidenceStatus', control: 'select', label: '证据状态',
          description: '标记输入信息的核验程度。', required: true,
          options: [
            { value: 'verified', label: '已核验' },
            { value: 'partial', label: '部分核验' },
            { value: 'unverified', label: '未核验' },
          ],
        },
        {
          fieldId: 'expectedDeliverable', control: 'long-text', label: '期望交付物',
          description: '补充希望输出的形式和侧重点。', required: false, maxChars: 4000,
        },
      ],
    },
  },
  {
    workflowId: 'cn-invention-patent',
    workflowVersion: '1',
    workType: 'cn-invention-patent',
    title: '中国发明专利撰写',
    description: '以本地确定性演练方式整理技术交底、创新点、风险和待确认事项。',
    executionMode: 'local-mock',
    materialPolicy: {
      acceptedExtensions: ['.txt', '.md', '.pdf', '.docx', '.png', '.jpg', '.jpeg'],
      maxFiles: 64,
      maxFileBytes: 50 * 1024 * 1024,
      contentReadMode: 'metadata-only',
    },
    outputSections: ['terminology', 'support-matrix', 'claim-strategy', 'claims-outline', 'specification-outline', 'questions'],
    form: {
      fields: [
        {
          fieldId: 'technicalDisclosure', control: 'long-text', label: '技术交底',
          description: '描述技术方案、步骤、结构和工作过程。', required: true, maxChars: 20000,
        },
        {
          fieldId: 'inventiveConcept', control: 'long-text', label: '发明构思',
          description: '说明区别于现有技术的核心技术手段。', required: true, maxChars: 8000,
        },
        {
          fieldId: 'knownPriorArt', control: 'long-text', label: '已知现有技术',
          description: '记录申请人已知的相关技术及其不足。', required: false, maxChars: 12000,
        },
        {
          fieldId: 'terms', control: 'string-list', label: '术语',
          description: '列出需要统一表述的专业术语。', required: false, maxItems: 64, itemMaxChars: 300,
        },
        {
          fieldId: 'unconfirmedFacts', control: 'string-list', label: '待确认事实',
          description: '列出尚未获得证据支持的技术事实。', required: false, maxItems: 64, itemMaxChars: 500,
        },
        {
          fieldId: 'desiredScope', control: 'long-text', label: '期望保护范围',
          description: '说明期望覆盖的主题和应用边界。', required: false, maxChars: 4000,
        },
      ],
    },
  },
]

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

function nonBlankText(fieldId, maxChars, required) {
  let schema = z.string().max(maxChars)
  if (required) {
    schema = schema.refine((value) => value.trim().length > 0, `${fieldId} must not be blank`)
  }
  return schema
}

function buildFormSchema(workflow) {
  const shape = {}
  for (const field of workflow.form.fields) {
    let fieldSchema
    if (field.control === 'short-text' || field.control === 'long-text') {
      fieldSchema = nonBlankText(field.fieldId, field.maxChars, field.required)
    } else if (field.control === 'string-list') {
      fieldSchema = z.array(
        z.string().min(1).max(field.itemMaxChars),
      ).max(field.maxItems)
    } else {
      fieldSchema = z.enum(field.options.map(({ value }) => value))
    }
    shape[field.fieldId] = field.required ? fieldSchema : fieldSchema.optional()
  }
  return z.object(shape).strict()
}

const catalog = deepFreeze(workflowCatalogResponseSchema.parse({
  schemaVersion: 1,
  workflows: WORKFLOW_DEFINITIONS,
}))

const definitionsByKey = new Map()
const formSchemasByKey = new Map()
for (const workflow of catalog.workflows) {
  const key = `${workflow.workflowId}@${workflow.workflowVersion}`
  definitionsByKey.set(key, workflow)
  formSchemasByKey.set(key, buildFormSchema(workflow))
}

export function getWorkflowCatalog(workType) {
  if (workType === undefined) return catalog
  const workflows = catalog.workflows.filter((workflow) => workflow.workType === workType)
  return deepFreeze({ schemaVersion: 1, workflows })
}

export function getWorkflowDefinition(workflowId, workflowVersion) {
  const workflow = definitionsByKey.get(`${workflowId}@${workflowVersion}`)
  if (!workflow) throw new Error(`Workflow version not found: ${workflowId}@${workflowVersion}`)
  return workflow
}

export function validateWorkflowForm(workflowId, workflowVersion, formValues) {
  getWorkflowDefinition(workflowId, workflowVersion)
  return formSchemasByKey.get(`${workflowId}@${workflowVersion}`).parse(formValues)
}
