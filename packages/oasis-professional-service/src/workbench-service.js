import { createHash, randomUUID } from 'node:crypto'

import { WORKBENCH_LIMITS } from './workbench-contract.js'
import {
  createCanonicalInputSnapshot,
  runLocalMock,
} from './local-mock-runner.js'
import {
  getWorkflowCatalog,
  getWorkflowDefinition,
  validateWorkflowForm,
} from './workflow-catalog.js'
import {
  createWorkspaceMaterialManager,
  validateWorkspaceRelativePath,
  WorkspaceMaterialError,
} from './workspace-materials.js'
import { createWritebackManager } from './writeback-service.js'
import { createUnifiedGenerationService } from './unified-generation-service.js'

function serviceError(code, message, details = {}) {
  return new WorkspaceMaterialError(code, message, details)
}

function requireTask(record, taskId) {
  const task = record.tasks[taskId]
  if (!task) throw serviceError('TASK_NOT_FOUND', 'Workbench task was not found', { taskId })
  return task
}

function workflowForTask(task) {
  if (task.workType === null || task.workflowId === null || task.workflowVersion === null) {
    throw serviceError('WORKFLOW_NOT_SELECTED', 'A complete workflow must be selected before adding materials')
  }
  let workflow
  try {
    workflow = getWorkflowDefinition(task.workflowId, task.workflowVersion)
  } catch {
    throw serviceError('WORKFLOW_NOT_FOUND', 'Selected workflow version is unavailable')
  }
  if (workflow.workType !== task.workType) {
    throw serviceError('WORKFLOW_MISMATCH', 'Selected workflow does not match the task work type')
  }
  return workflow
}

function materialPolicyForTask(task) {
  return workflowForTask(task).materialPolicy
}

function referenceIndex(task, referenceId) {
  const index = task.inputRefs.findIndex((reference) => reference.referenceId === referenceId)
  if (index === -1) {
    throw serviceError('MATERIAL_REFERENCE_NOT_FOUND', 'Material reference was not found', { referenceId })
  }
  return index
}

function requireRun(task, runId) {
  const run = task.runs[runId]
  if (!run) throw serviceError('RUN_NOT_FOUND', 'Workbench run was not found', { runId })
  return run
}

function validateAuthoritativeForm(task) {
  try {
    return validateWorkflowForm(task.workflowId, task.workflowVersion, task.formValues)
  } catch (error) {
    throw serviceError('INVALID_WORKFLOW_FORM', 'Authoritative workflow form is invalid', {
      issues: Array.isArray(error?.issues)
        ? error.issues.map(({ path, message }) => ({ path, message }))
        : [],
    })
  }
}

export function createWorkbenchService({
  repository,
  workspaceRegistry,
  materialManager,
  clock = () => new Date().toISOString(),
  idFactory = () => `material-${randomUUID()}`,
  runIdFactory = () => `run-${randomUUID()}`,
  localMockRunner = runLocalMock,
  writebackManager,
  unifiedFixtureEnabled = false,
  unifiedFixtureRunner,
} = {}) {
  if (!repository || typeof repository.get !== 'function') {
    throw new TypeError('repository.get is required')
  }
  if (typeof repository.replaceEditable !== 'function') {
    throw new TypeError('repository.replaceEditable is required')
  }
  if (typeof repository.mutate !== 'function') {
    throw new TypeError('repository.mutate is required')
  }
  if (typeof clock !== 'function') throw new TypeError('clock is required')
  if (typeof idFactory !== 'function') throw new TypeError('idFactory is required')
  if (typeof runIdFactory !== 'function') throw new TypeError('runIdFactory is required')
  if (typeof localMockRunner !== 'function') throw new TypeError('localMockRunner is required')
  const materials = materialManager ?? createWorkspaceMaterialManager({ workspaceRegistry, clock })
  for (const method of ['confirm', 'recheckAll', 'refresh']) {
    if (typeof materials?.[method] !== 'function') throw new TypeError(`materialManager.${method} is required`)
  }
  const writebacks = writebackManager ?? (
    workspaceRegistry ? createWritebackManager({ workspaceRegistry, clock }) : undefined
  )
  if (writebacks !== undefined) {
    for (const method of ['consume', 'prepare', 'publish']) {
      if (typeof writebacks?.[method] !== 'function') throw new TypeError(`writebackManager.${method} is required`)
    }
  }

  function requireWritebackManager() {
    if (!writebacks) throw new TypeError('workspaceRegistry or writebackManager is required for writeback')
    return writebacks
  }

  function assertWritebackRun(run, artifactId) {
    if (!run.result || run.status !== 'completed') throw serviceError('RUN_NOT_COMPLETED', '请选择已完成的文字结果')
    if (run.result.artifact.artifactId !== artifactId) {
      throw serviceError('WRITEBACK_ARTIFACT_MISMATCH', 'Writeback artifact does not belong to the selected run')
    }
    if (run.result.contentStatus === 'blocked') {
      throw serviceError('WRITEBACK_RUN_BLOCKED', 'Blocked run cannot be written back')
    }
    if (run.review.status !== 'approved') {
      throw serviceError('WRITEBACK_REVIEW_REQUIRED', 'Writeback requires an approved run')
    }
    if (run.writebacks.length >= WORKBENCH_LIMITS.maxWritebacksPerRun) {
      throw serviceError('WRITEBACK_LIMIT_REACHED', 'Run writeback limit has been reached')
    }
  }

  function assertPlanMatchesRun(plan, workspaceId, taskId, run) {
    if (
      plan.workspaceId !== workspaceId
      || plan.taskId !== taskId
      || plan.runId !== run.runId
      || plan.artifactId !== run.result.artifact.artifactId
    ) {
      throw serviceError('WRITEBACK_PLAN_STALE', 'Writeback plan no longer matches authoritative state')
    }
    assertWritebackRun(run, plan.artifactId)
  }

  function recoveryManifest(plan, record) {
    return {
      schemaVersion: 1,
      workspaceId: plan.workspaceId,
      taskId: plan.taskId,
      runId: plan.runId,
      artifactId: record.artifactId,
      relativeDirectory: record.relativeDirectory,
      files: record.files.map((file) => ({ ...file })),
    }
  }

  return Object.freeze({
    ...createUnifiedGenerationService({ repository, enabled: unifiedFixtureEnabled, clock, runIdFactory, runner: unifiedFixtureRunner }),
    getState(workspaceId) {
      return repository.get(workspaceId)
    },
    replaceState(workspaceId, expectedRevision, state) {
      return repository.replaceEditable(workspaceId, expectedRevision, state)
    },
    getWorkflowCatalog(workType) {
      return { ...getWorkflowCatalog(workType), unifiedFixtureEnabled: unifiedFixtureEnabled === true }
    },
    addMaterial({ workspaceId, taskId, expectedRevision, relativePath, confirmed }) {
      if (confirmed !== true) {
        throw serviceError('MATERIAL_CONFIRMATION_REQUIRED', 'Explicit material confirmation is required')
      }
      const normalizedPath = validateWorkspaceRelativePath(relativePath)
      return repository.mutate(workspaceId, expectedRevision, async (current) => {
        const task = requireTask(current, taskId)
        const policy = materialPolicyForTask(task)
        if (task.inputRefs.length >= Math.min(policy.maxFiles, WORKBENCH_LIMITS.maxInputRefsPerTask)) {
          throw serviceError('MATERIAL_LIMIT_REACHED', 'Task material limit has been reached')
        }
        if (task.inputRefs.some((reference) => (
          reference.kind === 'project-file'
          && reference.relativePath.toLocaleLowerCase('en-US') === normalizedPath.toLocaleLowerCase('en-US')
        ))) {
          throw serviceError('MATERIAL_ALREADY_ADDED', 'Material path is already registered')
        }
        const confirmedAt = clock()
        const reference = await materials.confirm(
          workspaceId,
          normalizedPath,
          policy,
          idFactory(),
          confirmedAt,
        )
        const next = structuredClone(current)
        next.tasks[taskId].inputRefs.push(reference)
        next.tasks[taskId].updatedAt = confirmedAt
        return next
      })
    },
    refreshMaterial({ workspaceId, taskId, referenceId, expectedRevision }) {
      return repository.mutate(workspaceId, expectedRevision, async (current) => {
        const task = requireTask(current, taskId)
        const index = referenceIndex(task, referenceId)
        const policy = materialPolicyForTask(task)
        const reference = await materials.refresh(workspaceId, task.inputRefs[index], policy)
        const next = structuredClone(current)
        next.tasks[taskId].inputRefs[index] = reference
        next.tasks[taskId].updatedAt = clock()
        return next
      })
    },
    removeMaterial({ workspaceId, taskId, referenceId, expectedRevision }) {
      return repository.mutate(workspaceId, expectedRevision, (current) => {
        const task = requireTask(current, taskId)
        const index = referenceIndex(task, referenceId)
        const next = structuredClone(current)
        next.tasks[taskId].inputRefs.splice(index, 1)
        next.tasks[taskId].updatedAt = clock()
        return next
      })
    },
    recheckTaskMaterials(workspaceId, taskId) {
      const current = repository.get(workspaceId)
      const task = requireTask(current, taskId)
      return materials.recheckAll(workspaceId, task.inputRefs, materialPolicyForTask(task))
    },
    createRun({ workspaceId, taskId, expectedRevision, requestKey }) {
      return repository.mutate(workspaceId, expectedRevision, async (current) => {
        const task = requireTask(current, taskId)
        const workflow = workflowForTask(task)
        if (workflow.executionMode !== 'local-mock') {
          throw serviceError('GENERATION_NOT_ENABLED', '统一模板生成尚未启用；不能使用旧演练入口')
        }
        const formValues = validateAuthoritativeForm(task)
        const inputRefs = await materials.recheckAll(workspaceId, task.inputRefs, workflow.materialPolicy)
        const now = clock()
        const inputSnapshot = createCanonicalInputSnapshot({
          workflowId: workflow.workflowId,
          workflowVersion: workflow.workflowVersion,
          formValues,
          inputRefs,
          capturedAt: now,
        })
        const existing = Object.values(task.runs).find((run) => run.requestKey === requestKey)
        if (existing) {
          if (existing.inputSnapshot.sha256 !== inputSnapshot.sha256) {
            throw serviceError(
              'IDEMPOTENCY_CONFLICT',
              'Request key is already bound to a different authoritative input snapshot',
              { requestKey, runId: existing.runId },
            )
          }
          return current
        }
        if (task.runOrder.length >= WORKBENCH_LIMITS.maxRunsPerTask) {
          throw serviceError('RUN_LIMIT_REACHED', 'Task run limit has been reached')
        }

        const result = localMockRunner({
          workflowId: workflow.workflowId,
          workflowVersion: workflow.workflowVersion,
          inputSnapshot,
        })
        const runId = runIdFactory()
        const run = {
          runId,
          requestKey,
          mode: 'local-mock',
          mockVersion: '1',
          status: 'completed',
          workflowId: workflow.workflowId,
          workflowVersion: workflow.workflowVersion,
          inputSnapshot,
          result,
          review: {
            status: 'not-reviewed',
            note: '',
            updatedAt: now,
          },
          writebacks: [],
          createdAt: now,
          completedAt: now,
        }
        const next = structuredClone(current)
        next.tasks[taskId].runs[runId] = run
        next.tasks[taskId].runOrder.push(runId)
        next.tasks[taskId].activeRunId = runId
        next.tasks[taskId].updatedAt = now
        return next
      })
    },
    reviewRun({ workspaceId, taskId, runId, expectedRevision, status, note }) {
      if (!['changes-requested', 'approved'].includes(status)) {
        throw serviceError('INVALID_REVIEW_STATUS', 'Review status is not supported')
      }
      if (typeof note !== 'string' || note.length > WORKBENCH_LIMITS.maxReviewNoteChars) {
        throw serviceError('INVALID_REVIEW_NOTE', 'Review note exceeds its configured limit')
      }
      if (status === 'changes-requested' && note.trim().length === 0) {
        throw serviceError('REVIEW_NOTE_REQUIRED', 'Requested changes require a review note')
      }
      return repository.mutate(workspaceId, expectedRevision, (current) => {
        const task = requireTask(current, taskId)
        const run = requireRun(task, runId)
        if (!run.result || run.status !== 'completed') throw serviceError('RUN_NOT_COMPLETED', '请选择已完成的文字结果')
        if (status === 'approved' && run.result.contentStatus === 'blocked') {
          throw serviceError('RUN_BLOCKED', 'Blocked run cannot be approved', { runId })
        }
        const next = structuredClone(current)
        next.tasks[taskId].runs[runId].review = {
          status,
          note,
          updatedAt: clock(),
        }
        return next
      })
    },
    async prepareWriteback({
      workspaceId,
      taskId,
      runId,
      artifactId,
      expectedRevision,
      relativeDirectory,
    }) {
      const current = repository.get(workspaceId)
      if (current.revision !== expectedRevision) {
        throw serviceError('WRITEBACK_REVISION_CONFLICT', 'Workbench revision changed before writeback preparation', {
          currentRevision: current.revision,
        })
      }
      const task = requireTask(current, taskId)
      const run = requireRun(task, runId)
      assertWritebackRun(run, artifactId)
      const remote = run.mode === 'oasis-legacy'
        ? {
            executionId: run.executionId,
            requestKeySha256: createHash('sha256').update(run.requestKey).digest('hex'),
            provider: {
              apiBaseOrigin: run.providerSnapshot.apiBaseOrigin,
              apiId: run.providerSnapshot.apiId,
              apiEndpoint: run.providerSnapshot.apiEndpoint,
              apiProcess: run.providerSnapshot.apiProcess,
              folderId: run.providerSnapshot.folderId,
            },
            files: {
              status: run.result.fileStatus,
              urls: [...run.result.fileUrls],
            },
          }
        : undefined
      return requireWritebackManager().prepare({
        workspaceId,
        taskId,
        runId,
        expectedRevision,
        workflowId: run.workflowId,
        workflowVersion: run.workflowVersion,
        mode: run.mode,
        mockVersion: run.mockVersion,
        ...(run.mode === 'unified-fixture' ? { unified: { source: run.source, evidenceKind: run.evidenceKind,
          fixtureVersion: run.fixtureVersion, inputSchemaVersion: run.inputSchemaVersion, parentRunId: run.parentRunId } } : {}),
        inputSha256: run.inputSnapshot.sha256,
        artifact: run.result.artifact,
        reviewStatus: run.review.status,
        relativeDirectory,
        ...(remote ? { remote } : {}),
      })
    },
    async resolveSavedFile({ workspaceId, taskId, runId, artifactId, writebackId, expectedRevision }) {
      const current = repository.get(workspaceId)
      if (current.revision !== expectedRevision) throw serviceError('REVISION_CONFLICT', '请先刷新任务状态')
      const run = requireRun(requireTask(current, taskId), runId)
      if (run.status !== 'completed' || !run.result || run.result.artifact.artifactId !== artifactId
        || run.review.status !== 'approved' || run.result.contentStatus === 'blocked') {
        throw serviceError('WRITEBACK_ARTIFACT_MISMATCH', '请选择已审核并保存的文字版本')
      }
      const record = run.writebacks.find(item => item.writebackId === writebackId && item.artifactId === artifactId)
      const file = record?.files.find(item => item.mediaType === 'text/markdown')
      if (!file) throw serviceError('WRITEBACK_NOT_FOUND', '未找到所选版本的已保存文件')
      const absolutePath = await requireWritebackManager().resolveSavedFile(workspaceId, file.relativePath)
      if (repository.get(workspaceId).revision !== expectedRevision) throw serviceError('REVISION_CONFLICT', '任务状态已变化')
      return { workspaceId, taskId, runId, artifactId, writebackId, absolutePath, kind: 'current-file' }
    },
    async commitWriteback({ confirmationToken }) {
      const manager = requireWritebackManager()
      const plan = manager.consume(confirmationToken)
      let publishedRecord
      try {
        return await repository.mutate(plan.workspaceId, plan.expectedRevision, async (current) => {
          const task = requireTask(current, plan.taskId)
          const run = requireRun(task, plan.runId)
          assertPlanMatchesRun(plan, plan.workspaceId, plan.taskId, run)
          const record = await manager.publish(plan)
          publishedRecord = record
          const next = structuredClone(current)
          next.tasks[plan.taskId].runs[plan.runId].writebacks.push(record)
          next.tasks[plan.taskId].updatedAt = record.committedAt
          return next
        })
      } catch (error) {
        if (!publishedRecord) throw error
        throw serviceError(
          'WRITEBACK_COMMITTED_INDEX_FAILED',
          'Writeback files were committed but the Domain index update failed',
          { manifest: recoveryManifest(plan, publishedRecord) },
        )
      }
    },
  })
}
