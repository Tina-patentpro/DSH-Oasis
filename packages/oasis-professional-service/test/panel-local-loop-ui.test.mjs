import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  WorkflowForm,
  validateWorkflowFormValues,
} from '../src/client/WorkflowForm.js'
import { MaterialReferences } from '../src/client/MaterialReferences.js'
import {
  RunPreview,
  generationDisabledReason,
  hasDraftDiverged,
} from '../src/client/RunPreview.js'
import { WritebackPanel } from '../src/client/WritebackPanel.js'
import { PanelPages } from '../src/client/PanelPages.js'
import { ProfessionalServicePanel } from '../src/client/ProfessionalServicePanel.js'
import {
  createMaterialReference,
  createRunSnapshot,
} from './workbench-fixtures.mjs'

const workflow = Object.freeze({
  workflowId: 'catalog-workflow',
  workflowVersion: '9',
  workType: 'technical-rd',
  title: '目录工作流',
  description: '从 Host schema 渲染。',
  executionMode: 'local-mock',
  materialPolicy: {
    acceptedExtensions: ['.md'], maxFiles: 8, maxFileBytes: 4096, contentReadMode: 'metadata-only',
  },
  outputSections: ['summary'],
  form: { fields: [
    { fieldId: 'name', control: 'short-text', label: '方案名称', description: '简短名称', required: true, maxChars: 12 },
    { fieldId: 'objective', control: 'long-text', label: '研发目标', description: '问题与目标', required: true, maxChars: 200 },
    { fieldId: 'constraints', control: 'string-list', label: '约束', description: '每行一项', required: false, maxItems: 3, itemMaxChars: 20 },
    {
      fieldId: 'evidence', control: 'select', label: '证据状态', description: '核验程度', required: true,
      options: [{ value: 'verified', label: '已核验' }, { value: 'partial', label: '部分核验' }],
    },
  ] },
})

function childrenOf(element) {
  const children = element?.props?.children
  return children === undefined ? [] : Array.isArray(children) ? children : [children]
}

function allNodes(root) {
  const nodes = []
  function visit(value) {
    if (Array.isArray(value)) return value.forEach(visit)
    if (value === null || value === undefined || typeof value === 'boolean') return
    nodes.push(value)
    if (typeof value === 'object') childrenOf(value).forEach(visit)
  }
  visit(root)
  return nodes
}

function textOf(root) {
  return allNodes(root).filter((value) => typeof value === 'string' || typeof value === 'number').join(' ')
}

function operation(overrides = {}) {
  return {
    materialPath: '', materialConfirmed: false, reviewNote: '', writebackDirectory: '',
    writebackConfirmed: false, writebackPlan: null, requestKey: null, activeOperation: null,
    error: null, errorCode: null, feedback: null, materialsChanged: false, indexWarningManifest: null,
    ...overrides,
  }
}

function page(overrides = {}) {
  return {
    pageId: 'task-a', title: '任务 A', workType: 'technical-rd', workflowId: workflow.workflowId,
    workflowVersion: workflow.workflowVersion, inputRefs: [],
    formValues: { name: '', objective: '', constraints: [], evidence: '' },
    professionalDraft: null, remoteExecutionOrder: [], remoteExecutions: {},
    activeRunId: null, runOrder: [], runs: {}, view: 'workspace',
    createdAt: '2026-08-25T01:02:03.000Z', updatedAt: '2026-08-25T01:02:03.000Z',
    ...overrides,
  }
}

test('validates and renders all four schema controls with accessible field errors', () => {
  const invalid = validateWorkflowFormValues(workflow, {
    name: '这是一个明显超过十二字符长度限制的方案名称', objective: ' ', constraints: ['一', '二', '三', '四'], evidence: 'unknown',
  })
  assert.equal(invalid.valid, false)
  assert.equal(invalid.firstInvalidFieldId, 'name')
  assert.deepEqual(Object.keys(invalid.errors), ['name', 'objective', 'constraints', 'evidence'])

  const changes = []
  const form = WorkflowForm({
    pageId: 'task-a', workflow,
    values: { name: '', objective: '', constraints: [], evidence: '' },
    validation: validateWorkflowFormValues(workflow, { name: '', objective: '', constraints: [], evidence: '' }),
    disabled: false,
    onChange: (fieldId, value) => changes.push([fieldId, value]),
  })
  const nodes = allNodes(form)
  assert.ok(nodes.find((node) => node?.type === 'input' && node.props?.['data-control'] === 'short-text'))
  assert.ok(nodes.find((node) => node?.type === 'textarea' && node.props?.['data-control'] === 'long-text'))
  const list = nodes.find((node) => node?.type === 'textarea' && node.props?.['data-control'] === 'string-list')
  assert.ok(list)
  list.props.onChange({ currentTarget: { value: '约束一\n约束二' } })
  assert.deepEqual(changes.at(-1), ['constraints', ['约束一', '约束二']])
  assert.ok(nodes.find((node) => node?.type === 'select' && node.props?.['data-control'] === 'select'))
  assert.ok(nodes.some((node) => node?.props?.['aria-invalid'] === true))
  assert.ok(nodes.some((node) => node?.props?.['data-first-error'] === true))
})

test('shows confirmed material metadata with accurate local hashing disclosure', () => {
  const refreshed = []
  const removed = []
  const materials = MaterialReferences({
    page: page({ inputRefs: [createMaterialReference()] }),
    workflow,
    operation: operation(),
    disabled: false,
    onMaterialDraft: () => {},
    onAdd: () => {},
    onRefresh: (referenceId) => refreshed.push(referenceId),
    onRemove: (referenceId, confirmed) => removed.push([referenceId, confirmed]),
    confirmRemove: () => true,
  })
  assert.match(textOf(materials), /aaaaaaaa…/)
  assert.match(textOf(materials), /128 B/)
  assert.match(textOf(materials), /文件在本机流式读取以计算哈希，正文不提取、不持久化且不用于生成/)
  const refresh = allNodes(materials).find((node) => node?.props?.['data-testid'] === 'oasis-material-refresh-ref-a')
  const remove = allNodes(materials).find((node) => node?.props?.['data-testid'] === 'oasis-material-remove-ref-a')
  refresh.props.onClick()
  remove.props.onClick()
  assert.deepEqual(refreshed, ['ref-a'])
  assert.deepEqual(removed, [['ref-a', true]])
})

test('disables generation for each unsafe state and keeps old snapshots immutable in the preview', () => {
  const basePage = page({
    formValues: { name: '泵组', objective: '降低振动', constraints: [], evidence: 'verified' },
    inputRefs: [createMaterialReference()],
  })
  const valid = validateWorkflowFormValues(workflow, basePage.formValues)
  assert.equal(generationDisabledReason({ syncStatus: 'saving', validation: valid, operation: operation() }), '正在保存草稿')
  assert.equal(generationDisabledReason({ syncStatus: 'ready', validation: { valid: false }, operation: operation() }), '请先修正表单错误')
  assert.equal(generationDisabledReason({ syncStatus: 'ready', validation: valid, operation: operation({ materialsChanged: true }) }), '材料已变化，请先刷新')
  assert.equal(generationDisabledReason({ syncStatus: 'ready', validation: valid, operation: operation({ activeOperation: 'run-create' }) }), '任务正在处理中')

  const run = createRunSnapshot({
    inputSnapshot: {
      formValues: { name: '旧泵组', objective: '旧目标', constraints: [], evidence: 'verified' },
      inputRefs: [createMaterialReference()], sha256: 'b'.repeat(64), capturedAt: '2026-08-25T01:02:03.000Z',
    },
    result: {
      ...createRunSnapshot().result,
      sections: [{ sectionId: 'summary', title: '摘要', body: '<img src=x onerror=alert(1)>纯文本' }],
    },
  })
  const withRun = page({ ...basePage, activeRunId: 'run-a', runOrder: ['run-a'], runs: { 'run-a': run } })
  assert.equal(hasDraftDiverged(withRun, run), true)
  const preview = RunPreview({
    page: withRun, operation: operation(), workflow, validation: valid, syncStatus: 'ready',
    onGenerate: () => {}, onActivateRun: () => {}, onReviewNote: () => {}, onReview: () => {},
  })
  assert.match(textOf(preview), /草稿已偏离此运行/)
  assert.match(textOf(preview), /<img src=x onerror=alert\(1\)>纯文本/)
  assert.equal(allNodes(preview).some((node) => node?.props && Object.hasOwn(node.props, 'dangerouslySetInnerHTML')), false)
})

test('blocks approval/writeback for blocked output and requires a second writeback confirmation', () => {
  const blocked = createRunSnapshot({
    result: { ...createRunSnapshot().result, contentStatus: 'blocked' },
  })
  const blockedPage = page({ activeRunId: 'run-a', runOrder: ['run-a'], runs: { 'run-a': blocked } })
  const blockedPreview = RunPreview({
    page: blockedPage, operation: operation(), workflow,
    validation: { valid: true, errors: {}, firstInvalidFieldId: null }, syncStatus: 'ready',
    onGenerate: () => {}, onActivateRun: () => {}, onReviewNote: () => {}, onReview: () => {},
  })
  assert.match(textOf(blockedPreview), /阻断结果不能批准或回写/)
  assert.equal(allNodes(blockedPreview).some((node) => node?.props?.['data-testid'] === 'oasis-review-approve'), false)

  const approved = createRunSnapshot({ review: {
    status: 'approved', note: '', updatedAt: '2026-08-25T01:02:03.000Z',
  } })
  const prepared = operation({
    writebackDirectory: 'oasis-output',
    writebackPlan: {
      confirmationToken: 'token',
      manifest: {
        absoluteTarget: 'D:\\workspace\\oasis-output',
        expiresAt: '2026-08-25T01:12:03.000Z',
        files: [
          { absolutePath: 'D:\\workspace\\oasis-output\\result.md', sha256: 'c'.repeat(64), mediaType: 'text/markdown' },
          { absolutePath: 'D:\\workspace\\oasis-output\\result.oasis.json', sha256: 'd'.repeat(64), mediaType: 'application/json' },
        ],
      },
    },
  })
  const panel = WritebackPanel({
    run: approved, operation: prepared, disabled: false,
    onDraft: () => {}, onPrepare: () => {}, onConfirm: () => {}, onCommit: () => {},
  })
  assert.match(textOf(panel), /D:\\workspace\\oasis-output/)
  assert.match(textOf(panel), /cccccccc…/)
  assert.match(textOf(panel), /dddddddd…/)
  const commit = allNodes(panel).find((node) => node?.props?.['data-testid'] === 'oasis-writeback-commit')
  assert.equal(commit.props.disabled, true)
  assert.match(textOf(panel), /不构成专业或法律结论/)
})

test('uses the remote catalog in the chooser and one business tree for normal/expanded layouts', async () => {
  const state = {
    workspaceId: 'workspace-a', revision: 1, syncStatus: 'ready', syncError: null, conflictCurrent: null,
    panelMode: 'normal', activePageId: 'task-a', pages: [page({
      title: '新任务', workType: null, workflowId: null, workflowVersion: null, view: 'chooser', formValues: {},
    })],
    catalogStatus: 'ready', catalogError: null, workflows: [workflow], pageOperations: {},
  }
  const chooser = PanelPages({
    state, effectiveMode: 'normal', onSelectWorkflow: () => {}, onRenamePage: () => {}, onReload: () => {},
  })
  const chooserComponent = allNodes(chooser).find((node) => typeof node?.type === 'function')
  const renderedChooser = chooserComponent.type(chooserComponent.props)
  assert.match(textOf(renderedChooser), /目录工作流/)
  assert.doesNotMatch(textOf(renderedChooser), /中国发明专利撰写/)
  assert.equal(allNodes(chooser).find((node) => node?.props?.['data-workspace-layout'])?.props?.['data-mode'], undefined)

  const source = await readFile(new URL('../src/client/PanelPages.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /technical-rd|cn-invention-patent/)
  assert.equal((source.match(/createElement\(WorkflowForm/g) ?? []).length, 1)
  assert.equal((source.match(/createElement\(RunPreview/g) ?? []).length, 1)
})

test('standalone panel keeps its border inside the declared 360px layout width', async () => {
  const source = await readFile(new URL('../src/client/OasisWorkbenchSurface.js', import.meta.url), 'utf8')

  assert.match(source, /boxSizing: 'border-box'/)
})

test('renders only Host-provided professional fields and requires both explicit confirmations', () => {
  const selected = []
  const updated = []
  const confirmations = []
  const servicePage = page({
    inputRefs: [createMaterialReference()],
    professionalDraft: {
      selectedApiEndpoint: 'claims-v1', selectedApiId: 132, schemaHash: 'b'.repeat(64),
      formValues: { User_input: '请撰写', file: 'ref-a' }, folderId: 8,
      updatedAt: '2026-08-25T01:02:03.000Z',
    },
  })
  const serviceOperation = operation({
    professionalDetail: {
      id: 132, name: 'claims-v1', apiType: 'Workflow', price: 3, modelName: '', executionMode: 'sync',
      inputFields: [
        { fieldId: 'User_input', label: '要求', description: '', type: 'paragraph', control: 'long-text' },
        { fieldId: 'file', label: '交底书', description: '', type: 'file', control: 'single-file' },
      ],
      outputFields: [], schemaHash: 'b'.repeat(64),
    },
    priceConfirmed: true,
    externalTransferConfirmed: false,
  })
  const state = {
    professionalStatus: 'ready',
    professionalBootstrap: {
      environmentKind: 'non-production', remoteEnabled: true, credentialConfigured: true, balance: 20,
      services: [{
        categoryId: 6, categoryName: '权利要求书生成', group: '专利撰写', description: '',
        apiId: 132, apiEndpoint: 'claims-v1', apiProcess: '整理,撰写', apiDescription: '',
      }],
      folders: [{ id: 8, name: '测试项目' }],
    },
  }
  const panel = ProfessionalServicePanel({
    state, page: servicePage, operation: serviceOperation,
    onSelectService: (value) => selected.push(value),
    onUpdateField: (fieldId, value) => updated.push([fieldId, value]),
    onConfirm: (value) => confirmations.push(value),
  })
  assert.match(textOf(panel), /非生产/)
  assert.match(textOf(panel), /参考价格：3/)
  const start = allNodes(panel).find((node) => node?.props?.['data-testid'] === 'oasis-professional-start')
  assert.equal(start.props.disabled, true)
  const file = allNodes(panel).find((node) => node?.props?.['data-testid'] === 'oasis-professional-field-file')
  assert.match(textOf(file), /technical\.md/)
  file.props.onChange({ currentTarget: { value: 'ref-a' } })
  assert.deepEqual(updated, [['file', 'ref-a']])
  const checkboxes = allNodes(panel).filter((node) => node?.type === 'input' && node.props?.type === 'checkbox')
  checkboxes[1].props.onChange({ currentTarget: { checked: true } })
  assert.deepEqual(confirmations, [{ priceConfirmed: true, externalTransferConfirmed: true }])
  assert.deepEqual(selected, [])
  assert.equal(allNodes(panel).some((node) => node?.props && Object.hasOwn(node.props, 'dangerouslySetInnerHTML')), false)
})
