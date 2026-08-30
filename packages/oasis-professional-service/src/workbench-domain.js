import { createHash } from 'node:crypto'

import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'

import {
  legacyWorkbenchRecordSchema,
  storedWorkbenchRecordSchema,
  workbenchEditableDraftSchema,
  workbenchRecordSchema,
  workbenchTaskSchema,
} from './workbench-contract.js'
import {
  canonicalJson,
  computeCanonicalInputSha256,
  runLocalMock,
} from './local-mock-runner.js'

export {
  workbenchEditableDraftSchema,
  workbenchRecordSchema,
  workbenchTaskSchema,
} from './workbench-contract.js'

export const EMPTY_UPDATED_AT = '1970-01-01T00:00:00.000Z'

export const oasisWorkbenchDomainSpec = defineDomain({
  name: 'oasis_workbench',
  version: 1,
  tables: {
    workspaces: domainTable(storedWorkbenchRecordSchema),
  },
})

function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function parseDetached(schema, input) {
  return deepFreeze(structuredClone(schema.parse(input)))
}

function assertWorkspaceIdentity(workspaceId, record) {
  if (record.workspaceId !== workspaceId) {
    throw new Error(`workspaceId does not match storage key: expected ${workspaceId}`)
  }
  return record
}

function assertRunIntegrity(record) {
  for (const taskId of record.taskOrder) {
    const task = record.tasks[taskId]
    for (const runId of task.runOrder) {
      const run = task.runs[runId]
      const inputSha256 = computeCanonicalInputSha256({
        mockVersion: run.mockVersion,
        workflowId: run.workflowId,
        workflowVersion: run.workflowVersion,
        formValues: run.inputSnapshot.formValues,
        inputRefs: run.inputSnapshot.inputRefs,
      })
      if (inputSha256 !== run.inputSnapshot.sha256) {
        throw new Error(`input integrity mismatch for task ${taskId} run ${runId}`)
      }

      const artifactSha256 = createHash('sha256')
        .update(run.result.artifact.body, 'utf8')
        .digest('hex')
      if (
        artifactSha256 !== run.result.artifact.sha256
        || run.result.artifact.artifactId !== `sha256:${artifactSha256}`
      ) {
        throw new Error(`artifact integrity mismatch for task ${taskId} run ${runId}`)
      }

      const expectedResult = runLocalMock({
        mockVersion: run.mockVersion,
        workflowId: run.workflowId,
        workflowVersion: run.workflowVersion,
        inputSnapshot: run.inputSnapshot,
      })
      if (canonicalJson(expectedResult) !== canonicalJson(run.result)) {
        throw new Error(`result integrity mismatch for task ${taskId} run ${runId}`)
      }
    }
  }
  return record
}

export function createEmptyWorkbenchRecord(workspaceId) {
  return parseWorkbenchRecord(workspaceId, {
    schemaVersion: 2,
    workspaceId,
    revision: 0,
    panelMode: 'hidden',
    activeTaskId: null,
    taskOrder: [],
    tasks: {},
    updatedAt: EMPTY_UPDATED_AT,
  })
}

export function parseWorkbenchEditableDraft(input) {
  return parseDetached(workbenchEditableDraftSchema, input)
}

export const parseWorkbenchDraft = parseWorkbenchEditableDraft

export function parseWorkbenchRecord(workspaceId, input) {
  const record = structuredClone(workbenchRecordSchema.parse(input))
  assertWorkspaceIdentity(workspaceId, record)
  assertRunIntegrity(record)
  return deepFreeze(record)
}

export function migrateWorkbenchRecordV1ToV2(input) {
  const legacy = parseDetached(legacyWorkbenchRecordSchema, input)
  return parseWorkbenchRecord(legacy.workspaceId, {
    schemaVersion: 2,
    workspaceId: legacy.workspaceId,
    revision: legacy.revision,
    panelMode: legacy.panelMode,
    activeTaskId: legacy.activeTaskId,
    taskOrder: legacy.taskOrder,
    tasks: Object.fromEntries(legacy.taskOrder.map((taskId) => {
      const task = legacy.tasks[taskId]
      return [taskId, {
        taskId: task.taskId,
        title: task.title,
        workType: task.workType,
        workflowId: task.workflowId,
        workflowVersion: task.workflowVersion,
        formValues: task.formValues,
        inputRefs: task.inputRefs.map((legacyValue, index) => ({
          referenceId: `legacy-v1-${index + 1}`,
          kind: 'legacy-v1',
          legacyValue,
        })),
        activeRunId: null,
        runOrder: [],
        runs: {},
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      }]
    })),
    updatedAt: legacy.updatedAt,
  })
}

export function parseStoredWorkbenchRecord(workspaceId, input) {
  if (input?.schemaVersion === 1) {
    return assertWorkspaceIdentity(workspaceId, migrateWorkbenchRecordV1ToV2(input))
  }
  if (input?.schemaVersion === 2) {
    return parseWorkbenchRecord(workspaceId, input)
  }
  throw new Error(`unsupported workbench schemaVersion: ${String(input?.schemaVersion)}`)
}
