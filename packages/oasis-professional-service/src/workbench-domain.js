import { createHash } from 'node:crypto'
import { unifiedInputSha256 } from './unified-fixture.js'
import { isUnifiedRun } from './generation-contract.js'

import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'

import {
  legacyWorkbenchRecordSchema,
  storedWorkbenchRecordSchema,
  workbenchEditableDraftSchema,
  workbenchRecordSchema,
  workbenchRecordV2Schema,
  workbenchRecordV3Schema,
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
    for (const executionId of task.remoteExecutionOrder) {
      const execution = task.remoteExecutions[executionId]
      const executionInputSha256 = computeOasisRemoteInputSha256({
        providerSnapshot: {
          ...(execution.environmentKind ? { environmentKind: execution.environmentKind } : {}),
          ...(execution.accountId !== undefined ? { accountId: execution.accountId } : {}),
          apiBaseOrigin: execution.apiBaseOrigin,
          apiId: execution.serviceSnapshot.apiId,
          apiEndpoint: execution.serviceSnapshot.apiEndpoint,
          apiProcess: execution.serviceSnapshot.apiProcess,
          folderId: execution.folderSnapshot.folderId,
          price: execution.priceSnapshot.price,
        },
        formValues: execution.formValues,
        inputRefs: execution.materialSnapshots,
        ...(execution.unifiedClaims ? { unifiedClaims: execution.unifiedClaims } : {}),
      })
      if (executionInputSha256 !== execution.inputSha) {
        throw new Error(`remote execution input integrity mismatch for task ${taskId} execution ${executionId}`)
      }
    }
    for (const runId of task.runOrder) {
      const run = task.runs[runId]
      const inputSha256 = isUnifiedRun(run) ? unifiedInputSha256(run) : run.mode === 'local-mock'
        ? computeCanonicalInputSha256({
            mockVersion: run.mockVersion,
            workflowId: run.workflowId,
            workflowVersion: run.workflowVersion,
            formValues: run.inputSnapshot.formValues,
            inputRefs: run.inputSnapshot.inputRefs,
          })
        : computeOasisRemoteInputSha256({
            providerSnapshot: run.providerSnapshot,
            formValues: run.inputSnapshot.formValues,
            inputRefs: run.inputSnapshot.inputRefs,
          })
      if (inputSha256 !== run.inputSnapshot.sha256) {
        throw new Error(`input integrity mismatch for task ${taskId} run ${runId}`)
      }

      if (isUnifiedRun(run) && run.status !== 'completed') continue

      const artifactSha256 = createHash('sha256')
        .update(run.result.artifact.body, 'utf8')
        .digest('hex')
      if (
        artifactSha256 !== run.result.artifact.sha256
        || run.result.artifact.artifactId !== `sha256:${artifactSha256}`
      ) {
        throw new Error(`artifact integrity mismatch for task ${taskId} run ${runId}`)
      }

      if (run.mode === 'local-mock') {
        const expectedResult = runLocalMock({
          mockVersion: run.mockVersion,
          workflowId: run.workflowId,
          workflowVersion: run.workflowVersion,
          inputSnapshot: run.inputSnapshot,
        })
        if (canonicalJson(expectedResult) !== canonicalJson(run.result)) {
          throw new Error(`result integrity mismatch for task ${taskId} run ${runId}`)
        }
      } else if (run.mode === 'oasis-api') {
        if (computeOasisRemoteResponseSha256(run.remoteResponse) !== run.remoteResponse.responseSha) {
          throw new Error(`response integrity mismatch for task ${taskId} run ${runId}`)
        }
      } else if (run.mode === 'oasis-legacy') {
        const responseSha256 = computeOasisRemoteResponseSha256({
          answerText: run.result.answerText,
          fileUrls: run.result.fileUrls,
        })
        if (responseSha256 !== run.result.responseSha) {
          throw new Error(`response integrity mismatch for task ${taskId} run ${runId}`)
        }
      }
    }
  }
  return record
}

function canonicalSha256(value) {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')
}

export function computeOasisRemoteInputSha256({ providerSnapshot, formValues, inputRefs, unifiedClaims }) {
  return canonicalSha256({ mode: unifiedClaims ? 'oasis-api-1' : 'oasis-legacy', providerSnapshot, formValues, inputRefs,
    ...(unifiedClaims ? { unifiedClaims } : {}) })
}

export function computeOasisRemoteResponseSha256({ answerText, fileUrls }) {
  return canonicalSha256({ answerText, fileUrls })
}

export function createEmptyWorkbenchRecord(workspaceId) {
  return parseWorkbenchRecord(workspaceId, {
    schemaVersion: 4,
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
  return parseDetached(workbenchRecordV2Schema, {
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

export function migrateWorkbenchRecordV2ToV3(input) {
  const previous = parseDetached(workbenchRecordV2Schema, input)
  return parseWorkbenchRecord(previous.workspaceId, {
    schemaVersion: 3,
    workspaceId: previous.workspaceId,
    revision: previous.revision,
    panelMode: previous.panelMode,
    activeTaskId: previous.activeTaskId,
    taskOrder: previous.taskOrder,
    tasks: Object.fromEntries(previous.taskOrder.map((taskId) => {
      const task = previous.tasks[taskId]
      return [taskId, {
        ...task,
        professionalDraft: null,
        remoteExecutionOrder: [],
        remoteExecutions: {},
      }]
    })),
    updatedAt: previous.updatedAt,
  })
}

export function parseStoredWorkbenchRecord(workspaceId, input) {
  if (input?.schemaVersion === 1) {
    return assertWorkspaceIdentity(
      workspaceId,
      migrateWorkbenchRecordV3ToV4(migrateWorkbenchRecordV2ToV3(migrateWorkbenchRecordV1ToV2(input))),
    )
  }
  if (input?.schemaVersion === 2) {
    return assertWorkspaceIdentity(workspaceId, migrateWorkbenchRecordV3ToV4(migrateWorkbenchRecordV2ToV3(input)))
  }
  if (input?.schemaVersion === 3) {
    return assertWorkspaceIdentity(workspaceId, migrateWorkbenchRecordV3ToV4(input))
  }
  if (input?.schemaVersion === 4) {
    return parseWorkbenchRecord(workspaceId, input)
  }
  throw new Error(`unsupported workbench schemaVersion: ${String(input?.schemaVersion)}`)
}

export function migrateWorkbenchRecordV3ToV4(input) {
  const previous = parseDetached(workbenchRecordV3Schema, input)
  return parseWorkbenchRecord(previous.workspaceId, {
    ...previous,
    schemaVersion: 4,
    tasks: Object.fromEntries(previous.taskOrder.map(id => [id, { ...previous.tasks[id], generation: null }])),
  })
}
