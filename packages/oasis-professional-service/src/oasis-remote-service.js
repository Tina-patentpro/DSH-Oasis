import { createHash } from 'node:crypto'

import { canonicalJson } from './local-mock-runner.js'
import {
  computeOasisRemoteInputSha256,
  computeOasisRemoteResponseSha256,
} from './workbench-domain.js'
import { oasisRunningWaterPageSchema, WORKBENCH_LIMITS } from './workbench-contract.js'
import { getWorkflowDefinition } from './workflow-catalog.js'
import { WorkspaceMaterialError } from './workspace-materials.js'

function remoteError(code, message, details = {}) {
  return new WorkspaceMaterialError(code, message, details)
}

function requireTask(record, taskId) {
  const task = record.tasks[taskId]
  if (!task) throw remoteError('TASK_NOT_FOUND', 'Workbench task was not found', { taskId })
  return task
}

function requireExecution(task, executionId) {
  const execution = task.remoteExecutions[executionId]
  if (!execution) throw remoteError('REMOTE_EXECUTION_NOT_FOUND', 'Remote execution was not found', { executionId })
  return execution
}

function assertExecutionEnvironment(active, execution, run) {
  if (active.apiBaseOrigin !== execution.apiBaseOrigin
    || (active.environmentKind ?? 'non-production') !== (execution.environmentKind ?? 'non-production')
    || (run && run.providerSnapshot.apiBaseOrigin !== execution.apiBaseOrigin)) {
    throw remoteError('REMOTE_ENVIRONMENT_MISMATCH', 'The active Oasis environment does not match this execution')
  }
}

function resultIdentityError(execution, result) {
  if (result?.key !== execution.requestKey) {
    return { code: 'REMOTE_KEY_MISMATCH', message: 'Oasis result key does not match the original request' }
  }
  if (result.recordId !== undefined && result.recordId !== null
    && (!Number.isSafeInteger(result.recordId) || result.recordId < 0)) {
    return { code: 'REMOTE_RECORD_ID_INVALID', message: 'Oasis result record id is invalid' }
  }
  if (execution.recordIdSource === 'create' && Number.isSafeInteger(result.recordId)
    && result.recordId !== execution.recordId) {
    return { code: 'REMOTE_RECORD_ID_MISMATCH', message: 'Oasis result record id conflicts with the create response' }
  }
  return null
}

function safeFolder(value, expectedId) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw remoteError('INVALID_REMOTE_FOLDER', 'Oasis folder response is invalid')
  }
  const id = Number.isSafeInteger(value.id) ? value.id : value.folder_id
  const name = typeof value.name === 'string' && value.name.trim().length > 0
    ? value.name
    : value.folder_name
  if (!Number.isSafeInteger(id) || id < 0 || typeof name !== 'string' || name.trim().length === 0) {
    throw remoteError('INVALID_REMOTE_FOLDER', 'Oasis folder response is invalid')
  }
  if (expectedId !== undefined && id !== expectedId) {
    throw remoteError('REMOTE_FOLDER_MISMATCH', 'Oasis folder detail does not match the selected folder')
  }
  return { id, name }
}

function safeBalance(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw remoteError('INVALID_REMOTE_BALANCE', 'Oasis balance is unavailable')
  }
  return value
}

function detailWithoutRaw(detail) {
  const safe = {
    id: detail.id,
    name: detail.name,
    apiType: detail.apiType,
    price: detail.price,
    modelName: detail.modelName,
    executionMode: detail.executionMode,
    inputFields: structuredClone(detail.inputFields),
    outputFields: structuredClone(detail.outputFields),
  }
  return {
    ...safe,
    schemaHash: createHash('sha256').update(canonicalJson(safe), 'utf8').digest('hex'),
  }
}

function workflowPolicy(task) {
  if (task.workflowId === null || task.workflowVersion === null) {
    throw remoteError('WORKFLOW_NOT_SELECTED', 'A local workflow policy must be selected before remote execution')
  }
  const workflow = getWorkflowDefinition(task.workflowId, task.workflowVersion)
  if (workflow.workType !== task.workType) {
    throw remoteError('WORKFLOW_MISMATCH', 'Selected workflow does not match the task work type')
  }
  return workflow.materialPolicy
}

function safeApiError(error, fallbackCode, fallbackMessage) {
  const code = typeof error?.code === 'string' ? error.code : fallbackCode
  if (code === 'AUTH_REQUIRED') return { code: 'AUTH_REQUIRED', message: 'Oasis authentication is required' }
  return { code: fallbackCode, message: fallbackMessage }
}

function remoteArtifact(answerText, fileUrls) {
  const links = fileUrls.length === 0
    ? ''
    : `\n\n## 远程文件（未下载、未验证）\n\n${fileUrls.map((url) => `- ${url}`).join('\n')}\n`
  const body = `# 绿洲专业服务结果\n\n${answerText}${links}`
  const sha256 = createHash('sha256').update(body, 'utf8').digest('hex')
  return {
    artifactId: `sha256:${sha256}`,
    suggestedFileName: 'oasis-result.md',
    mediaType: 'text/markdown',
    body,
    sha256,
  }
}

export function createOasisRemoteService({
  repository,
  materialManager,
  getRuntime,
  clock = () => new Date().toISOString(),
  executionIdFactory,
  runIdFactory,
  pollLimit = 10,
  pollIntervalMs = 2000,
  sleep = (delay, signal) => new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, delay)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  }),
} = {}) {
  if (!repository || typeof repository.get !== 'function' || typeof repository.mutate !== 'function') {
    throw new TypeError('repository get/mutate boundary is required')
  }
  for (const method of ['recheckAll', 'readForUpload']) {
    if (typeof materialManager?.[method] !== 'function') throw new TypeError(`materialManager.${method} is required`)
  }
  if (typeof getRuntime !== 'function') throw new TypeError('getRuntime is required')
  if (typeof clock !== 'function') throw new TypeError('clock is required')
  if (typeof executionIdFactory !== 'function') throw new TypeError('executionIdFactory is required')
  if (typeof runIdFactory !== 'function') throw new TypeError('runIdFactory is required')
  if (!Number.isSafeInteger(pollLimit) || pollLimit < 1 || pollLimit > 100) throw new TypeError('pollLimit must be between 1 and 100')
  if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < 0) throw new TypeError('pollIntervalMs must be non-negative')
  if (typeof sleep !== 'function') throw new TypeError('sleep is required')
  const continuationJobs = new Map()
  const waitControllers = new Map()

  function executionKey(workspaceId, taskId, executionId) {
    return JSON.stringify([workspaceId, taskId, executionId])
  }

  async function runtime({ requireCredential = true } = {}) {
    const value = await getRuntime()
    if (!value || typeof value !== 'object') throw remoteError('REMOTE_DISABLED', 'Oasis non-production runtime is unavailable')
    if (value.enabled !== true) throw remoteError('REMOTE_DISABLED', 'Oasis non-production runtime is disabled')
    if (requireCredential && value.credentialConfigured !== true) {
      throw remoteError('AUTH_REQUIRED', 'Oasis authentication is required')
    }
    if (requireCredential && !value.client) throw remoteError('REMOTE_DISABLED', 'Oasis API client is unavailable')
    return value
  }

  async function getServiceDetail(apiEndpoint) {
    if (typeof apiEndpoint !== 'string' || apiEndpoint.length === 0) {
      throw remoteError('INVALID_REMOTE_SERVICE', 'A professional service endpoint is required')
    }
    const active = await runtime()
    const detail = detailWithoutRaw(await active.client.getApiDetail(apiEndpoint))
    if (detail.name !== apiEndpoint) {
      throw remoteError('REMOTE_SERVICE_MISMATCH', 'Oasis service detail does not match the selected endpoint')
    }
    return detail
  }

  async function mutateLatest(workspaceId, taskId, operation) {
    const current = repository.get(workspaceId)
    requireTask(current, taskId)
    return repository.mutate(workspaceId, current.revision, operation)
  }

  async function setExecution(workspaceId, taskId, executionId, patch) {
    return mutateLatest(workspaceId, taskId, (current) => {
      const execution = requireExecution(requireTask(current, taskId), executionId)
      const next = structuredClone(current)
      Object.assign(next.tasks[taskId].remoteExecutions[executionId], patch, { updatedAt: clock() })
      return next
    })
  }

  function selectedMaterialSnapshots(task, detail, formValues) {
    const selected = []
    for (const field of detail.inputFields) {
      const value = formValues[field.fieldId]
      if (field.control === 'single-file') {
        if (value === undefined || value === '') continue
        if (typeof value !== 'string') throw remoteError('INVALID_REMOTE_FORM', `File field ${field.fieldId} must select one material`)
        const reference = task.inputRefs.find((item) => item.referenceId === value)
        if (!reference || reference.kind !== 'project-file') {
          throw remoteError('REMOTE_MATERIAL_NOT_FOUND', `File field ${field.fieldId} does not reference a confirmed material`)
        }
        if (!selected.some((item) => item.referenceId === reference.referenceId)) selected.push(reference)
      } else if (typeof value !== 'string') {
        throw remoteError('INVALID_REMOTE_FORM', `Text field ${field.fieldId} must be a string`)
      }
    }
    return selected
  }

  function createInputs(execution, detail) {
    const inputs = {}
    for (const field of detail.inputFields) {
      const value = execution.formValues[field.fieldId]
      if (field.control === 'single-file') {
        if (value === undefined || value === '') continue
        const upload = execution.uploadedFiles.find((item) => item.fieldId === field.fieldId && item.referenceId === value)
        if (!upload) throw remoteError('REMOTE_UPLOAD_MISSING', `File field ${field.fieldId} has not been uploaded`)
        inputs[field.fieldId] = { type: 'document', transfer_method: 'remote_url', url: upload.url }
      } else if (value !== undefined) {
        inputs[field.fieldId] = value
      }
    }
    return inputs
  }

  async function complete(workspaceId, taskId, executionId, result, source) {
    const execution = requireExecution(requireTask(repository.get(workspaceId), taskId), executionId)
    const identityError = resultIdentityError(execution, result)
    if (identityError) {
      return setExecution(workspaceId, taskId, executionId, {
        status: 'failed',
        safeError: identityError,
      })
    }
    return mutateLatest(workspaceId, taskId, (current) => {
      const task = requireTask(current, taskId)
      const currentExecution = requireExecution(task, executionId)
      if (currentExecution.status === 'completed') return current
      if (task.runOrder.length >= WORKBENCH_LIMITS.maxRunsPerTask) {
        throw remoteError('RUN_LIMIT_REACHED', 'Task run limit has been reached')
      }
      const completedAt = clock()
      const answerText = typeof result.answerText === 'string' ? result.answerText : ''
      const fileUrls = Array.isArray(result.fileUrls) ? [...result.fileUrls] : []
      const runId = runIdFactory()
      const providerSnapshot = {
        ...(currentExecution.environmentKind ? { environmentKind: currentExecution.environmentKind } : {}),
        apiBaseOrigin: currentExecution.apiBaseOrigin,
        apiId: currentExecution.serviceSnapshot.apiId,
        apiEndpoint: currentExecution.serviceSnapshot.apiEndpoint,
        apiProcess: currentExecution.serviceSnapshot.apiProcess,
        folderId: currentExecution.folderSnapshot.folderId,
        price: currentExecution.priceSnapshot.price,
      }
      const run = {
        runId,
        requestKey: currentExecution.requestKey,
        mode: 'oasis-legacy',
        status: 'completed',
        executionId,
        providerSnapshot,
        inputSnapshot: {
          formValues: structuredClone(currentExecution.formValues),
          inputRefs: structuredClone(currentExecution.materialSnapshots),
          sha256: currentExecution.inputSha,
          capturedAt: execution.createdAt,
        },
        result: {
          answerText,
          fileUrls,
          fileStatus: 'undownloaded-unverified',
          responseSha: computeOasisRemoteResponseSha256({ answerText, fileUrls }),
          artifact: remoteArtifact(answerText, fileUrls),
        },
        review: { status: 'not-reviewed', note: '', updatedAt: completedAt },
        writebacks: [],
        createdAt: execution.createdAt,
        completedAt,
      }
      const next = structuredClone(current)
      Object.assign(next.tasks[taskId].remoteExecutions[executionId], {
        status: 'completed',
        ...(source === 'create' && Number.isSafeInteger(result.recordId)
          ? { recordId: result.recordId, recordIdSource: 'create' } : {}),
        safeError: null, updatedAt: completedAt, completedAt,
      })
      next.tasks[taskId].runs[runId] = run
      next.tasks[taskId].runOrder.push(runId)
      next.tasks[taskId].activeRunId = runId
      next.tasks[taskId].updatedAt = completedAt
      return next
    })
  }

  async function poll(workspaceId, taskId, executionId, client) {
    const controller = new AbortController()
    const key = executionKey(workspaceId, taskId, executionId)
    waitControllers.set(key, controller)
    try {
      for (let attempt = 0; attempt < pollLimit; attempt += 1) {
        const execution = requireExecution(requireTask(repository.get(workspaceId), taskId), executionId)
        let progress
        try {
          progress = await client.queryProcess(execution.requestKey, { signal: controller.signal })
        } catch (error) {
          if (error?.name === 'AbortError') {
            return setExecution(workspaceId, taskId, executionId, {
              status: 'wait-stopped',
              safeError: { code: 'WAIT_STOPPED', message: 'Local result waiting was stopped' },
            })
          }
          const safe = safeApiError(error, 'POLL_FAILED', 'Oasis result query failed')
          return setExecution(workspaceId, taskId, executionId, {
            status: safe.code === 'AUTH_REQUIRED' ? 'auth-required' : 'wait-stopped',
            safeError: safe,
          })
        }
        if (progress.status === 'completed' && progress.result !== null) {
          return complete(workspaceId, taskId, executionId, progress.result, 'query')
        }
        await setExecution(workspaceId, taskId, executionId, { status: 'waiting-result', safeError: null })
        if (attempt + 1 < pollLimit) await sleep(pollIntervalMs, controller.signal)
      }
      return setExecution(workspaceId, taskId, executionId, {
        status: 'wait-stopped',
        safeError: { code: 'WAIT_LIMIT_REACHED', message: 'Local result waiting reached its bounded limit' },
      })
    } catch (error) {
      if (error?.name === 'AbortError') {
        return setExecution(workspaceId, taskId, executionId, {
          status: 'wait-stopped',
          safeError: { code: 'WAIT_STOPPED', message: 'Local result waiting was stopped' },
        })
      }
      throw error
    } finally {
      waitControllers.delete(key)
    }
  }

  return Object.freeze({
    async getBootstrap() {
      const active = await getRuntime()
      if (!active || active.enabled !== true) {
        return {
          environmentKind: active?.environmentKind ?? 'non-production', remoteEnabled: false,
          credentialConfigured: false, balance: null, services: [], folders: [],
        }
      }
      if (active.credentialConfigured !== true || !active.client) {
        return {
          environmentKind: active.environmentKind ?? 'non-production', remoteEnabled: true,
          credentialConfigured: false, balance: null, services: [], folders: [],
        }
      }
      const [user, services, folderPage] = await Promise.all([
        active.client.getUserDetail(),
        active.client.getCategoryCatalog(),
        active.client.getFolderList(),
      ])
      return {
        environmentKind: active.environmentKind ?? 'non-production',
        remoteEnabled: true,
        credentialConfigured: true,
        balance: safeBalance(user.balance),
        services: structuredClone(services),
        folders: folderPage.items.map((item) => safeFolder(item)),
      }
    },

    getServiceDetail,

    async start({
      workspaceId,
      taskId,
      expectedRevision,
      requestKey,
      priceConfirmed,
      externalTransferConfirmed,
    }) {
      if (priceConfirmed !== true) throw remoteError('PRICE_CONFIRMATION_REQUIRED', 'Explicit price confirmation is required')
      if (externalTransferConfirmed !== true) {
        throw remoteError('EXTERNAL_TRANSFER_CONFIRMATION_REQUIRED', 'Explicit material transfer confirmation is required')
      }
      const before = repository.get(workspaceId)
      if (before.revision !== expectedRevision) {
        return { committed: false, reason: 'revision-conflict', current: before }
      }
      const task = requireTask(before, taskId)
      const draft = task.professionalDraft
      if (!draft) throw remoteError('PROFESSIONAL_DRAFT_REQUIRED', 'A professional service draft is required')
      if (typeof requestKey !== 'string' || requestKey.length === 0) {
        throw remoteError('REMOTE_REQUEST_KEY_REQUIRED', 'A remote request key is required')
      }
      const active = await runtime()
      const [services, detail, folderValue, user] = await Promise.all([
        active.client.getCategoryCatalog(),
        active.client.getApiDetail(draft.selectedApiEndpoint).then(detailWithoutRaw),
        active.client.getFolderDetail(draft.folderId),
        active.client.getUserDetail(),
      ])
      const selected = services.find((item) => (
        item.apiId === draft.selectedApiId && item.apiEndpoint === draft.selectedApiEndpoint
      ))
      if (!selected || detail.id !== selected.apiId || detail.name !== selected.apiEndpoint) {
        throw remoteError('REMOTE_SERVICE_MISMATCH', 'Selected Oasis service is no longer available')
      }
      if (detail.schemaHash !== draft.schemaHash) {
        throw remoteError('REMOTE_SCHEMA_CHANGED', 'Oasis service schema changed and requires reconfirmation')
      }
      const folder = safeFolder(folderValue, draft.folderId)
      const balance = safeBalance(user.balance)
      if (balance < detail.price) throw remoteError('INSUFFICIENT_BALANCE', 'Oasis balance is below the reference price')
      const selectedReferences = selectedMaterialSnapshots(task, detail, draft.formValues)
      const materialSnapshots = await materialManager.recheckAll(
        workspaceId,
        selectedReferences,
        workflowPolicy(task),
      )
      const providerSnapshot = {
        ...(active.environmentKind === 'production' ? { environmentKind: 'production' } : {}),
        apiBaseOrigin: active.apiBaseOrigin,
        apiId: selected.apiId,
        apiEndpoint: selected.apiEndpoint,
        apiProcess: selected.apiProcess,
        folderId: folder.id,
        price: detail.price,
      }
      const inputSha = computeOasisRemoteInputSha256({
        providerSnapshot,
        formValues: draft.formValues,
        inputRefs: materialSnapshots,
      })
      return repository.mutate(workspaceId, expectedRevision, (current) => {
        const currentTask = requireTask(current, taskId)
        const duplicate = Object.values(currentTask.remoteExecutions).find((item) => item.requestKey === requestKey)
        if (duplicate) {
          if (duplicate.inputSha !== inputSha) {
            throw remoteError('IDEMPOTENCY_CONFLICT', 'Remote request key is bound to another input snapshot')
          }
          return current
        }
        if (currentTask.remoteExecutionOrder.length >= WORKBENCH_LIMITS.maxRemoteExecutionsPerTask) {
          throw remoteError('REMOTE_EXECUTION_LIMIT_REACHED', 'Remote execution limit has been reached')
        }
        const now = clock()
        const executionId = executionIdFactory()
        const next = structuredClone(current)
        next.tasks[taskId].remoteExecutionOrder.push(executionId)
        next.tasks[taskId].remoteExecutions[executionId] = {
          ...(active.environmentKind === 'production' ? { environmentKind: 'production' } : {}),
          executionId,
          recordId: null,
          recordIdSource: null,
          requestKey,
          status: 'prepared',
          inputSha,
          formValues: structuredClone(draft.formValues),
          apiBaseOrigin: active.apiBaseOrigin,
          serviceSnapshot: {
            apiId: selected.apiId,
            apiEndpoint: selected.apiEndpoint,
            apiProcess: selected.apiProcess,
            schemaHash: detail.schemaHash,
          },
          folderSnapshot: { folderId: folder.id, folderName: folder.name },
          priceSnapshot: { price: detail.price, balance },
          materialSnapshots: structuredClone(materialSnapshots),
          uploadedFiles: [],
          safeError: null,
          createdAt: now,
          updatedAt: now,
          submittedAt: null,
          completedAt: null,
        }
        next.tasks[taskId].updatedAt = now
        return next
      })
    },

    continue({ workspaceId, taskId, executionId }) {
      const key = executionKey(workspaceId, taskId, executionId)
      const existing = continuationJobs.get(key)
      if (existing) return existing
      const operation = (async () => {
        const active = await runtime()
        let execution = requireExecution(requireTask(repository.get(workspaceId), taskId), executionId)
        if (['completed', 'failed'].includes(execution.status)) {
          return { committed: true, current: repository.get(workspaceId) }
        }
        assertExecutionEnvironment(active, execution)
        const detail = detailWithoutRaw(await active.client.getApiDetail(execution.serviceSnapshot.apiEndpoint))
        if (detail.schemaHash !== execution.serviceSnapshot.schemaHash || detail.id !== execution.serviceSnapshot.apiId) {
          return setExecution(workspaceId, taskId, executionId, {
            status: 'failed',
            safeError: { code: 'REMOTE_SCHEMA_CHANGED', message: 'Oasis service schema changed before execution' },
          })
        }

        if (execution.submittedAt === null && !['submission-unknown', 'waiting-result', 'wait-stopped'].includes(execution.status)) {
          const task = requireTask(repository.get(workspaceId), taskId)
          const policy = workflowPolicy(task)
          for (const field of detail.inputFields.filter((item) => item.control === 'single-file')) {
            const referenceId = execution.formValues[field.fieldId]
            if (referenceId === undefined || referenceId === '') continue
            execution = requireExecution(requireTask(repository.get(workspaceId), taskId), executionId)
            if (execution.uploadedFiles.some((item) => item.fieldId === field.fieldId && item.referenceId === referenceId)) continue
            await setExecution(workspaceId, taskId, executionId, { status: 'uploading', safeError: null })
            const reference = execution.materialSnapshots.find((item) => item.referenceId === referenceId)
            const upload = await materialManager.readForUpload(workspaceId, reference, policy)
            let url
            try {
              url = await active.client.uploadFile(upload)
            } catch (error) {
              const safe = safeApiError(error, 'UPLOAD_OUTCOME_UNKNOWN', 'Oasis upload outcome is unknown; this execution cannot retry the upload')
              return setExecution(workspaceId, taskId, executionId, {
                status: safe.code === 'AUTH_REQUIRED' ? 'auth-required' : 'failed',
                safeError: safe,
              })
            }
            await mutateLatest(workspaceId, taskId, (current) => {
              const next = structuredClone(current)
              next.tasks[taskId].remoteExecutions[executionId].uploadedFiles.push({
                fieldId: field.fieldId,
                referenceId,
                url,
                sha256: upload.sha256,
                uploadedAt: clock(),
              })
              next.tasks[taskId].remoteExecutions[executionId].updatedAt = clock()
              return next
            })
          }
          await setExecution(workspaceId, taskId, executionId, { status: 'ready-to-submit', safeError: null })
          execution = requireExecution(requireTask(repository.get(workspaceId), taskId), executionId)
          const inputs = createInputs(execution, detail)
          await setExecution(workspaceId, taskId, executionId, {
            status: 'submitting', safeError: null, submittedAt: clock(),
          })
          let created
          try {
            created = await active.client.createWorkflow({
              id: execution.serviceSnapshot.apiId,
              key: execution.requestKey,
              inputs,
              apiProcess: execution.serviceSnapshot.apiProcess,
              folderId: execution.folderSnapshot.folderId,
            })
          } catch (error) {
            if (error?.code === 'AUTH_REQUIRED') {
              return setExecution(workspaceId, taskId, executionId, {
                // Authentication failure cannot prove that the attempted create had no effect.
                status: 'auth-required',
                safeError: { code: 'AUTH_REQUIRED', message: 'Oasis authentication is required' },
              })
            }
            await setExecution(workspaceId, taskId, executionId, {
              status: 'submission-unknown',
              safeError: { code: 'SUBMISSION_UNKNOWN', message: 'Oasis submission outcome is unknown; only reconciliation is allowed' },
            })
            return poll(workspaceId, taskId, executionId, active.client)
          }
          if (created.resolved === true) return complete(workspaceId, taskId, executionId, created.result, 'create')
          const identityError = resultIdentityError(execution, created.receipt)
          if (identityError) return setExecution(workspaceId, taskId, executionId, { status: 'failed', safeError: identityError })
          const recordId = created.receipt.recordId
          if (Number.isSafeInteger(recordId)) {
            await setExecution(workspaceId, taskId, executionId, { recordId, recordIdSource: 'create' })
          }
          await setExecution(workspaceId, taskId, executionId, { status: 'waiting-result', safeError: null })
        }
        return poll(workspaceId, taskId, executionId, active.client)
      })()
      const shared = operation.finally(() => {
        if (continuationJobs.get(key) === shared) continuationJobs.delete(key)
      })
      continuationJobs.set(key, shared)
      return shared
    },

    async stop({ workspaceId, taskId, executionId }) {
      requireExecution(requireTask(repository.get(workspaceId), taskId), executionId)
      const key = executionKey(workspaceId, taskId, executionId)
      waitControllers.get(key)?.abort()
      return { stopped: waitControllers.has(key) }
    },

    async observeRunningWater({ workspaceId, taskId, runId }) {
      const task = requireTask(repository.get(workspaceId), taskId)
      const run = task.runs[runId]
      if (!run || run.mode !== 'oasis-legacy' || run.status !== 'completed') {
        throw remoteError('REMOTE_RUN_NOT_FOUND', 'A completed remote run is required for running-water observation')
      }
      const execution = requireExecution(task, run.executionId)
      const observedAt = clock()
      if (!Number.isSafeInteger(execution.recordId) || execution.recordIdSource !== 'create') {
        return {
          status: 'unverifiable', runId, recordId: null, scope: 'current-page',
          associationStatus: 'unverified',
          total: null, item: null, observedAt,
        }
      }
      const active = await runtime()
      assertExecutionEnvironment(active, execution, run)
      const parsed = oasisRunningWaterPageSchema.safeParse(await active.client.getRunningWater())
      if (!parsed.success) throw remoteError('INVALID_RUNNING_WATER_RESPONSE', 'Oasis running-water page contains invalid fields')
      const page = parsed.data
      const matches = page.items.filter((item) => item.linkId === execution.recordId)
      if (matches.length > 1) throw remoteError('RUNNING_WATER_AMBIGUOUS', 'The current page contains multiple candidates for this record id')
      const match = matches[0]
      return {
        status: match ? 'observed' : 'not-observed',
        associationStatus: 'unverified',
        runId,
        recordId: execution.recordId,
        scope: 'current-page',
        total: page.total,
        item: match
          ? {
              id: match.id,
              linkId: match.linkId,
              type: match.type,
              money: match.money,
              balance: match.balance,
              createTime: typeof match.createTime === 'string' ? match.createTime : null,
            }
          : null,
        observedAt,
      }
    },
  })
}
