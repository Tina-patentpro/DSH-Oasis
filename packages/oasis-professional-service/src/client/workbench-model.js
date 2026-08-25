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

function workflowTitle(workflowId) {
  if (workflowId === 'technical-rd') return '技术研发辅助'
  if (workflowId === 'cn-invention-patent') return '中国发明专利撰写'
  throw new Error(`unknown workflow: ${workflowId}`)
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
    run: task.run,
    preview: task.preview,
    review: task.review,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    view: task.workflowId === null ? 'chooser' : 'workspace',
  }
}

function pageToTask(page) {
  return {
    taskId: page.pageId,
    title: page.title,
    workType: page.workType,
    workflowId: page.workflowId,
    workflowVersion: page.workflowVersion,
    inputRefs: detached(page.inputRefs),
    formValues: detached(page.formValues),
    run: page.run,
    preview: page.preview,
    review: page.review,
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
  })
}

export function workspaceStateToDraft(state) {
  const tasks = {}
  for (const page of state.pages) tasks[page.pageId] = pageToTask(page)
  return deepFreeze({
    schemaVersion: 1,
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
    run: null,
    preview: null,
    review: 'not-reviewed',
    createdAt: timestamp,
    updatedAt: timestamp,
    view: 'chooser',
  }
  return { ...state, activePageId: pageId, pages: [...state.pages, page] }
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
    const title = workflowTitle(action.workflowId)
    if (!state.pages.some((page) => page.pageId === action.pageId)) throw new Error('unknown page')
    next = {
      ...state,
      activePageId: action.pageId,
      pages: state.pages.map((page) => page.pageId === action.pageId
        ? {
            ...page,
            title,
            workType: action.workflowId,
            workflowId: action.workflowId,
            workflowVersion: '1',
            updatedAt: env.now(),
            view: 'workspace',
          }
        : page),
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
  } else if (action.type === 'close-page') {
    const index = state.pages.findIndex((page) => page.pageId === action.pageId)
    if (index < 0) return state
    const pages = state.pages.filter((page) => page.pageId !== action.pageId)
    const fallback = pages[Math.min(index, pages.length - 1)]?.pageId ?? null
    next = {
      ...state,
      activePageId: state.activePageId === action.pageId ? fallback : state.activePageId,
      pages,
    }
  } else {
    throw new Error(`unknown workbench action: ${action.type}`)
  }

  return next === state ? state : deepFreeze(next)
}
