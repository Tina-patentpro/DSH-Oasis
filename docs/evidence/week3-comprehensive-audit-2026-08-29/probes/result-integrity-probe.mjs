import {
  createCanonicalInputSnapshot,
  runLocalMock,
} from '../../../../packages/oasis-professional-service/src/local-mock-runner.js'
import { parseStoredWorkbenchRecord } from '../../../../packages/oasis-professional-service/src/workbench-domain.js'
import { createWorkbenchService } from '../../../../packages/oasis-professional-service/src/workbench-service.js'
import {
  createRunSnapshot,
  createV2Record,
  createV2Task,
  NOW,
} from '../../../../packages/oasis-professional-service/test/workbench-fixtures.mjs'

const formValues = {
  technicalDisclosure: '一种受控测试技术方案',
  inventiveConcept: '通过确定性控制关系实现目标',
  knownPriorArt: '',
  terms: [],
  unconfirmedFacts: ['关键参数尚未确认'],
  desiredScope: '',
}
const inputSnapshot = createCanonicalInputSnapshot({
  workflowId: 'cn-invention-patent',
  workflowVersion: '1',
  formValues,
  inputRefs: [],
  capturedAt: NOW,
})
const result = runLocalMock({
  workflowId: 'cn-invention-patent',
  workflowVersion: '1',
  inputSnapshot,
})
if (result.contentStatus !== 'blocked') throw new Error('probe requires a genuine blocked local-mock result')

const run = createRunSnapshot({
  workflowId: 'cn-invention-patent',
  workflowVersion: '1',
  inputSnapshot,
  result,
})
const task = createV2Task('task-a', {
  workType: 'cn-invention-patent',
  workflowId: 'cn-invention-patent',
  workflowVersion: '1',
  formValues,
  inputRefs: [],
  activeRunId: run.runId,
  runOrder: [run.runId],
  runs: { [run.runId]: run },
})
const baseline = createV2Record('workspace-a', 1, {
  activeTaskId: task.taskId,
  taskOrder: [task.taskId],
  tasks: { [task.taskId]: task },
})
parseStoredWorkbenchRecord('workspace-a', baseline)

const cases = [
  ['content-status-gate', (record) => { record.tasks['task-a'].runs['run-a'].result.contentStatus = 'warning' }],
  ['preview-section', (record) => { record.tasks['task-a'].runs['run-a'].result.sections[0].body = 'tampered preview' }],
  ['risk-list', (record) => { record.tasks['task-a'].runs['run-a'].result.risks = [] }],
  ['question-list', (record) => { record.tasks['task-a'].runs['run-a'].result.questions = [] }],
  ['disclaimer', (record) => { record.tasks['task-a'].runs['run-a'].result.disclaimer = 'tampered disclaimer' }],
]
const results = cases.map(([id, mutate]) => {
  const candidate = structuredClone(baseline)
  mutate(candidate)
  try {
    parseStoredWorkbenchRecord('workspace-a', candidate)
    return { id, accepted: true, error: null }
  } catch (error) {
    return { id, accepted: false, error: error instanceof Error ? error.message : String(error) }
  }
})
let authoritative = structuredClone(baseline)
authoritative.tasks['task-a'].runs['run-a'].result.contentStatus = 'warning'
const repository = {
  get() { return authoritative },
  replaceEditable() { throw new Error('not used by probe') },
  async mutate(_workspaceId, _expectedRevision, mutation) {
    authoritative = await mutation(authoritative)
    return { committed: true, current: authoritative }
  },
}
const service = createWorkbenchService({
  repository,
  materialManager: {
    confirm() { throw new Error('not used by probe') },
    refresh() { throw new Error('not used by probe') },
    recheckAll() { throw new Error('not used by probe') },
  },
  clock: () => NOW,
})
await service.reviewRun({
  workspaceId: 'workspace-a',
  taskId: 'task-a',
  runId: 'run-a',
  expectedRevision: 1,
  status: 'approved',
  note: '',
})
const report = {
  generatedAt: new Date().toISOString(),
  baselineContentStatus: result.contentStatus,
  artifactSha256: result.artifact.sha256,
  cases: results,
  tamperedBlockedRunApproved: authoritative.tasks['task-a'].runs['run-a'].review.status === 'approved',
  failClosed: results.every((item) => item.accepted === false),
}
console.log(JSON.stringify(report, null, 2))
if (!report.failClosed) process.exitCode = 1
