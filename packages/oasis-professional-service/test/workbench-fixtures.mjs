import {
  createCanonicalInputSnapshot,
  runLocalMock,
} from '../src/local-mock-runner.js'

export const NOW = '2026-08-25T01:02:03.000Z'
export const EMPTY_TIME = '1970-01-01T00:00:00.000Z'

export function createLegacyTask(taskId = 'task-a', overrides = {}) {
  return {
    taskId,
    title: '技术研发任务',
    workType: 'technical-rd',
    workflowId: 'technical-rd',
    workflowVersion: '1',
    inputRefs: [],
    formValues: {},
    run: null,
    preview: null,
    review: 'not-reviewed',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function createLegacyRecord(workspaceId = 'workspace-a', revision = 1, overrides = {}) {
  const task = createLegacyTask()
  return {
    schemaVersion: 1,
    workspaceId,
    revision,
    panelMode: 'normal',
    activeTaskId: task.taskId,
    taskOrder: [task.taskId],
    tasks: { [task.taskId]: task },
    updatedAt: revision === 0 ? EMPTY_TIME : NOW,
    ...overrides,
  }
}

export function createMaterialReference(overrides = {}) {
  return {
    referenceId: 'ref-a',
    kind: 'project-file',
    relativePath: 'materials\\technical.md',
    displayName: 'technical.md',
    mediaType: 'text/markdown',
    sizeBytes: 128,
    sha256: 'a'.repeat(64),
    observedAt: NOW,
    confirmedAt: NOW,
    ...overrides,
  }
}

const DEFAULT_RUN_INPUT_SNAPSHOT = createCanonicalInputSnapshot({
  mockVersion: '1',
  workflowId: 'technical-rd',
  workflowVersion: '1',
  formValues: {
    objective: '降低能耗',
    currentState: '已有能耗基线',
    evidenceStatus: 'verified',
    expectedDeliverable: '技术验证计划',
    constraints: ['不改变核心设备'],
  },
  inputRefs: [createMaterialReference()],
  capturedAt: NOW,
})
const DEFAULT_RUN_RESULT = runLocalMock({
  mockVersion: '1',
  workflowId: 'technical-rd',
  workflowVersion: '1',
  inputSnapshot: DEFAULT_RUN_INPUT_SNAPSHOT,
})

export const RUN_INPUT_SHA256 = DEFAULT_RUN_INPUT_SNAPSHOT.sha256
export const RUN_ARTIFACT_BODY = DEFAULT_RUN_RESULT.artifact.body
export const RUN_ARTIFACT_SHA256 = DEFAULT_RUN_RESULT.artifact.sha256

export function createRunSnapshot(overrides = {}) {
  return {
    runId: 'run-a',
    requestKey: 'request-a',
    mode: 'local-mock',
    mockVersion: '1',
    status: 'completed',
    workflowId: 'technical-rd',
    workflowVersion: '1',
    inputSnapshot: structuredClone(DEFAULT_RUN_INPUT_SNAPSHOT),
    result: structuredClone(DEFAULT_RUN_RESULT),
    review: {
      status: 'not-reviewed',
      note: '',
      updatedAt: NOW,
    },
    writebacks: [],
    createdAt: NOW,
    completedAt: NOW,
    ...overrides,
  }
}

export function createV2Task(taskId = 'task-a', { withEvidence = false, ...overrides } = {}) {
  const run = createRunSnapshot()
  return {
    taskId,
    title: '技术研发任务',
    workType: 'technical-rd',
    workflowId: 'technical-rd',
    workflowVersion: '1',
    formValues: {},
    inputRefs: withEvidence ? [createMaterialReference()] : [],
    activeRunId: withEvidence ? run.runId : null,
    runOrder: withEvidence ? [run.runId] : [],
    runs: withEvidence ? { [run.runId]: run } : {},
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export function createV2Record(workspaceId = 'workspace-a', revision = 1, {
  empty = false,
  withEvidence = false,
  ...overrides
} = {}) {
  if (empty) {
    return {
      schemaVersion: 2,
      workspaceId,
      revision,
      panelMode: 'hidden',
      activeTaskId: null,
      taskOrder: [],
      tasks: {},
      updatedAt: revision === 0 ? EMPTY_TIME : NOW,
      ...overrides,
    }
  }
  const task = createV2Task('task-a', { withEvidence })
  return {
    schemaVersion: 2,
    workspaceId,
    revision,
    panelMode: 'normal',
    activeTaskId: task.taskId,
    taskOrder: [task.taskId],
    tasks: { [task.taskId]: task },
    updatedAt: revision === 0 ? EMPTY_TIME : NOW,
    ...overrides,
  }
}

export function taskToEditable(task) {
  return {
    taskId: task.taskId,
    title: task.title,
    workType: task.workType,
    workflowId: task.workflowId,
    workflowVersion: task.workflowVersion,
    formValues: structuredClone(task.formValues),
    activeRunId: task.activeRunId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }
}

export function recordToEditableDraft(record) {
  return {
    schemaVersion: 2,
    panelMode: record.panelMode,
    activeTaskId: record.activeTaskId,
    taskOrder: [...record.taskOrder],
    tasks: Object.fromEntries(record.taskOrder.map((taskId) => [
      taskId,
      taskToEditable(record.tasks[taskId]),
    ])),
  }
}

export function createEditableDraft(taskId = 'task-a', overrides = {}) {
  const record = createV2Record('workspace-a', 0, {
    tasks: { [taskId]: createV2Task(taskId) },
    taskOrder: [taskId],
    activeTaskId: taskId,
  })
  return { ...recordToEditableDraft(record), ...overrides }
}
