import { workbenchRecordSchema } from '../workbench-contract.js'

const PANEL_MODES = new Set(['hidden', 'normal', 'expanded'])

function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function detached(value) {
  return structuredClone(value)
}

function assertRecord(record) {
  const parsed = workbenchRecordSchema.safeParse(record)
  if (!parsed.success) throw new TypeError(`invalid workbench record: ${parsed.error.message}`)
}

function taskToPage(task) {
  return {
    pageId: task.taskId,
    title: task.title,
    workType: task.workType,
    workflowId: task.workflowId,
    workflowVersion: task.workflowVersion,
    inputRefs: detached(task.inputRefs),
    formValues: detached(task.formValues),
    professionalDraft: detached(task.professionalDraft),
    activeRunId: task.activeRunId,
    runOrder: detached(task.runOrder),
    runs: detached(task.runs),
    remoteExecutionOrder: detached(task.remoteExecutionOrder),
    remoteExecutions: detached(task.remoteExecutions),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    view: task.workflowId === null ? 'chooser' : 'workspace',
  }
}

function pageToEditableTask(page) {
  return {
    taskId: page.pageId,
    title: page.title,
    workType: page.workType,
    workflowId: page.workflowId,
    workflowVersion: page.workflowVersion,
    formValues: detached(page.formValues),
    professionalDraft: detached(page.professionalDraft),
    activeRunId: page.activeRunId,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  }
}

export function createInitialWorkspaceState(workspaceId, syncStatus = 'idle') {
  return deepFreeze({
    workspaceId,
    revision: 0,
    syncStatus,
    syncError: null,
    conflictCurrent: null,
    panelMode: 'hidden',
    activePageId: null,
    pages: [],
    catalogStatus: 'idle',
    catalogError: null,
    workflows: [],
    pageOperations: {},
  })
}

export function recordToWorkspaceState(record) {
  assertRecord(record)
  return deepFreeze({
    workspaceId: record.workspaceId,
    revision: record.revision,
    syncStatus: 'ready',
    syncError: null,
    conflictCurrent: null,
    panelMode: record.panelMode,
    activePageId: record.activeTaskId,
    pages: record.taskOrder.map((taskId) => taskToPage(record.tasks[taskId])),
    catalogStatus: 'idle',
    catalogError: null,
    workflows: [],
    pageOperations: {},
  })
}

export function workspaceStateToDraft(state) {
  const tasks = {}
  for (const page of state.pages) tasks[page.pageId] = pageToEditableTask(page)
  return deepFreeze({
    schemaVersion: 3,
    panelMode: state.panelMode,
    activeTaskId: state.activePageId,
    taskOrder: state.pages.map((page) => page.pageId),
    tasks,
  })
}

function createPage(state, env) {
  const pageId = env.createId()
  if (typeof pageId !== 'string' || pageId.length === 0) throw new Error('createId must return a task id')
  if (state.pages.some((page) => page.pageId === pageId)) throw new Error('createId returned a duplicate task id')
  const timestamp = env.now()
  const page = {
    pageId,
    title: '新任务',
    workType: null,
    workflowId: null,
    workflowVersion: null,
    inputRefs: [],
    formValues: {},
    professionalDraft: null,
    activeRunId: null,
    runOrder: [],
    runs: {},
    remoteExecutionOrder: [],
    remoteExecutions: {},
    createdAt: timestamp,
    updatedAt: timestamp,
    view: 'chooser',
  }
  return { ...state, activePageId: pageId, pages: [...state.pages, page] }
}

function initialFormValues(workflow) {
  if (!workflow || typeof workflow !== 'object' || !Array.isArray(workflow.form?.fields)) {
    throw new TypeError('select-workflow requires a workflow catalog definition')
  }
  const values = {}
  for (const field of workflow.form.fields) {
    values[field.fieldId] = field.control === 'string-list' ? [] : ''
  }
  return values
}

export function reduceWorkspaceState(state, action, env) {
  let next
  if (action.type === 'set-panel-mode') {
    if (!PANEL_MODES.has(action.panelMode)) throw new Error(`invalid panel mode: ${action.panelMode}`)
    next = state.panelMode === action.panelMode ? state : { ...state, panelMode: action.panelMode }
  } else if (action.type === 'open-panel') {
    next = state.pages.length === 0 ? createPage(state, env) : state
    if (next.panelMode !== 'normal') next = { ...next, panelMode: 'normal' }
  } else if (action.type === 'create-page') {
    next = createPage(state, env)
  } else if (action.type === 'select-workflow') {
    const workflow = action.workflow
    const formValues = initialFormValues(workflow)
    if (!state.pages.some((page) => page.pageId === action.pageId)) throw new Error('unknown page')
    next = {
      ...state,
      activePageId: action.pageId,
      pages: state.pages.map((page) => page.pageId === action.pageId
        ? {
            ...page,
            title: workflow.title,
            workType: workflow.workType,
            workflowId: workflow.workflowId,
            workflowVersion: workflow.workflowVersion,
            formValues,
            updatedAt: env.now(),
            view: 'workspace',
          }
        : page),
    }
  } else if (action.type === 'update-form-value') {
    const page = state.pages.find((item) => item.pageId === action.pageId)
    if (!page) throw new Error('unknown page')
    if (page.workflowId === null || !Object.hasOwn(page.formValues, action.fieldId)) {
      throw new Error('unknown workflow form field')
    }
    next = {
      ...state,
      pages: state.pages.map((item) => item.pageId === action.pageId
        ? {
            ...item,
            formValues: { ...item.formValues, [action.fieldId]: detached(action.value) },
            updatedAt: env.now(),
          }
        : item),
    }
  } else if (action.type === 'rename-page') {
    const title = String(action.title).trim()
    if (title.length === 0 || title.length > 200) throw new Error('task title must contain 1 to 200 characters')
    if (!state.pages.some((page) => page.pageId === action.pageId)) throw new Error('unknown page')
    next = {
      ...state,
      pages: state.pages.map((page) => page.pageId === action.pageId
        ? { ...page, title, updatedAt: env.now() }
        : page),
    }
  } else if (action.type === 'activate-page') {
    if (!state.pages.some((page) => page.pageId === action.pageId)) throw new Error('unknown page')
    next = state.activePageId === action.pageId ? state : { ...state, activePageId: action.pageId }
  } else if (action.type === 'activate-run') {
    const page = state.pages.find((item) => item.pageId === action.pageId)
    if (!page) throw new Error('unknown page')
    if (!Object.hasOwn(page.runs, action.runId)) throw new Error('unknown run')
    next = page.activeRunId === action.runId ? state : {
      ...state,
      pages: state.pages.map((item) => item.pageId === action.pageId
        ? { ...item, activeRunId: action.runId, updatedAt: env.now() }
        : item),
    }
  } else if (action.type === 'close-page') {
    const index = state.pages.findIndex((page) => page.pageId === action.pageId)
    if (index < 0) return state
    const pages = state.pages.filter((page) => page.pageId !== action.pageId)
    const fallback = pages[Math.min(index, pages.length - 1)]?.pageId ?? null
    const pageOperations = { ...state.pageOperations }
    delete pageOperations[action.pageId]
    next = {
      ...state,
      activePageId: state.activePageId === action.pageId ? fallback : state.activePageId,
      pages,
      pageOperations,
    }
  } else {
    throw new Error(`unknown workbench action: ${action.type}`)
  }

  return next === state ? state : deepFreeze(next)
}
