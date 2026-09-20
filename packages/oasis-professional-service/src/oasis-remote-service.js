import { createHash } from 'node:crypto'
import { OASIS_SETTINGS_NAMESPACE, normalizeOasisRuntimeConfig } from './oasis-runtime-config.js'
import { parseWorkspaceApiBindings, workspaceApiBindingCommandSchema, workspaceApiBindingSchema } from './oasis-workspace-binding.js'
import { CLAIMS_TEMPLATE_ID, CLAIMS_V2_SCHEMA_VERSION, hasPendingUnifiedRun } from './generation-contract.js'
import { prepareClaimsApiMapping } from './claims-api-document.js'

import { canonicalJson } from './local-mock-runner.js'
import {
  computeOasisRemoteInputSha256,
  computeOasisRemoteResponseSha256,
} from './workbench-domain.js'
import { isOasisRemoteExecutionUnresolved, oasisRunningWaterPageSchema, WORKBENCH_LIMITS } from './workbench-contract.js'
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

function accountIdFromUser(user) {
  if (!Number.isSafeInteger(user?.id) || user.id < 0) {
    throw remoteError('REMOTE_ACCOUNT_UNVERIFIED', 'Oasis authenticated account identity is unavailable')
  }
  return user.id
}

async function assertExecutionAccount(active, execution) {
  if (!Number.isSafeInteger(execution.accountId)) {
    throw remoteError('REMOTE_ACCOUNT_UNVERIFIED', 'Historical execution has no verified account identity; it will not be reassigned')
  }
  if (accountIdFromUser(await active.client.getUserDetail()) !== execution.accountId) {
    throw remoteError('REMOTE_ACCOUNT_MISMATCH', 'The active Oasis account does not match this execution')
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
  settings,
  workspaceRegistry,
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

  async function bindingWorkspace(workspaceId, expectedPath) {
    const workspace = workspaceRegistry?.get(workspaceId)
    if (!workspace) throw remoteError('UNKNOWN_WORKSPACE', 'Workspace is not registered')
    if (await workspace.status() !== 'ok') throw remoteError('WORKSPACE_MISSING', 'Workspace is unavailable')
    if (typeof workspace.path !== 'string' || workspaceRegistry.get(workspaceId) !== workspace
      || (expectedPath !== undefined && workspace.path !== expectedPath)) {
      throw remoteError('WORKSPACE_ROOT_CHANGED', 'Workspace registration changed; confirm again')
    }
    return workspace.path
  }

  function bindingSettings(expectedRevision) {
    const descriptor = settings?.describe({ redactSecrets: true }).find(item => item.ns === OASIS_SETTINGS_NAMESPACE)
    if (!descriptor || !Number.isSafeInteger(descriptor.revision)) {
      throw remoteError('SETTINGS_UNAVAILABLE', 'Native settings revision is unavailable')
    }
    if (expectedRevision !== undefined && descriptor.revision !== expectedRevision) {
      throw remoteError('SETTINGS_CONFLICT', 'Native settings changed; read and confirm again')
    }
    return { revision: descriptor.revision, bindings: parseWorkspaceApiBindings(descriptor.value.workspaceApiBindings), value: descriptor.value }
  }

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
    const result = await repository.mutate(workspaceId, current.revision, operation)
    if (result.committed !== true) {
      throw remoteError('REMOTE_STATE_CONFLICT', 'Execution checkpoint was not saved; refresh the existing operation before continuing')
    }
    return result
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

  function receiptsMatchInputs(execution, detail) {
    // Repository integrity already checks duplicate fields and material reference/hash identity.
    return execution.uploadedFiles.every(upload => detail.inputFields.some(field => (
      field.control === 'single-file' && field.fieldId === upload.fieldId
      && execution.formValues[field.fieldId] === upload.referenceId
    )))
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
        ...(currentExecution.accountId !== undefined ? { accountId: currentExecution.accountId } : {}),
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

  async function prepareClaimsMapping({ workspaceId, taskId, expectedRevision, expectedSettingsRevision }) {
      // Local preparation only: do not obtain a runtime (which resolves credentials).
      const workspacePath = await bindingWorkspace(workspaceId)
      const { revision, bindings, value } = bindingSettings(expectedSettingsRevision)
      const binding = bindings.find(item => item.workspaceId === workspaceId)
      if (!binding) throw remoteError('WORKSPACE_BINDING_REQUIRED', 'Confirm a Workspace API binding first')
      if (binding.workspacePath !== workspacePath) throw remoteError('WORKSPACE_ROOT_CHANGED', 'Workspace binding path changed; confirm again')
      const config = normalizeOasisRuntimeConfig(value)
      if (binding.environmentKind !== config.environmentKind || binding.apiBaseOrigin !== config.apiBaseUrl) {
        throw remoteError('REMOTE_ENVIRONMENT_MISMATCH', 'The bound API environment changed')
      }
      const record = repository.get(workspaceId)
      if (record.revision !== expectedRevision) throw remoteError('REVISION_CONFLICT', 'Refresh the task before preparing API input')
      const task = requireTask(record, taskId)
      if (task.workflowId !== CLAIMS_TEMPLATE_ID || task.workflowVersion !== '2'
        || task.generation?.inputSchemaVersion !== CLAIMS_V2_SCHEMA_VERSION || task.generation.source !== 'oasis-api') {
        throw remoteError('WORKFLOW_MISMATCH', 'A unified claims v2 API draft is required')
      }
      if (task.generation.upstream || task.inputRefs.length) {
        throw remoteError('UNSUPPORTED_MATERIAL', 'This API mapping cannot silently omit upstream or file materials')
      }
      if (Object.values(record.tasks).some(item => hasPendingUnifiedRun(item)
        || Object.values(item.remoteExecutions).some(isOasisRemoteExecutionUnresolved))) {
        throw remoteError('WORKSPACE_GENERATION_ACTIVE', 'The Workspace already has an unresolved generation')
      }
      const input = { inputSchemaVersion: task.generation.inputSchemaVersion, values: structuredClone(task.formValues) }
      let mapping
      try { mapping = prepareClaimsApiMapping(input) } catch {
        throw remoteError('INVALID_REMOTE_FORM', 'A complete, valid four-field claims draft is required')
      }
      const snapshot = { workspaceId, workspacePath, taskId, expectedRevision, expectedSettingsRevision: revision,
        workflowId: task.workflowId, workflowVersion: task.workflowVersion, source: 'oasis-api',
        binding: structuredClone(binding), ...input, mapping,
        allowedUploadOrigins: [...new Set([config.apiBaseUrl, ...config.downloadOrigins])].sort() }
      return { status: 'unverified', canSubmit: false,
        blockers: ['REMOTE_BINDING_UNVERIFIED', 'REMOTE_DOCUMENT_CONTRACT_UNVERIFIED', 'UNIFIED_API_EXECUTION_NOT_CONNECTED'],
        snapshot, preparationSha256: createHash('sha256').update(canonicalJson(snapshot), 'utf8').digest('hex') }
  }

  return Object.freeze({
    prepareClaimsMapping,

    async checkClaimsMapping(input) {
      if (input.remoteReadConfirmed !== true) throw remoteError('REMOTE_READ_CONFIRMATION_REQUIRED', 'Explicit metadata read confirmation is required')
      const prepared = await prepareClaimsMapping(input)
      if (prepared.preparationSha256 !== input.preparationSha256) {
        throw remoteError('API_PREPARATION_CHANGED', 'The displayed API preparation changed; prepare again')
      }
      const { binding } = prepared.snapshot
      let user, services, detail, folderValue
      try {
        const active = await runtime()
        if (active.apiBaseOrigin !== binding.apiBaseOrigin || active.environmentKind !== binding.environmentKind) {
          throw remoteError('REMOTE_ENVIRONMENT_MISMATCH', 'The prepared API environment changed')
        }
        if (typeof active.assertCurrent !== 'function') throw remoteError('REMOTE_DISABLED', 'Frozen runtime check is unavailable')
        user = await active.client.getUserDetail()
        if (accountIdFromUser(user) !== binding.accountId) {
          throw remoteError('REMOTE_ACCOUNT_MISMATCH', 'The prepared Oasis account changed')
        }
        services = await active.client.getCategoryCatalog()
        detail = detailWithoutRaw(await active.client.getApiDetail(binding.apiEndpoint))
        folderValue = await active.client.getFolderDetail(binding.folderId)
        await active.assertCurrent()
      } catch (error) {
        if (error instanceof WorkspaceMaterialError) throw error
        if (error?.code === 'REMOTE_RUNTIME_CHANGED') throw remoteError('REMOTE_RUNTIME_CHANGED', 'API configuration or credentials changed; prepare again')
        const safe = safeApiError(error, 'REMOTE_PREFLIGHT_FAILED', 'API metadata could not be verified; no upload or generation was requested')
        throw remoteError(safe.code, safe.message)
      }
      if (!services.some(item => item.apiId === binding.apiId && item.apiEndpoint === binding.apiEndpoint
        && item.apiProcess === binding.apiProcess) || detail.id !== binding.apiId || detail.name !== binding.apiEndpoint) {
        throw remoteError('REMOTE_SERVICE_MISMATCH', 'The prepared Oasis service changed')
      }
      if (detail.schemaHash !== binding.schemaHash) throw remoteError('REMOTE_SCHEMA_CHANGED', 'Service schema or price changed; confirm the binding again')
      const folder = safeFolder(folderValue, binding.folderId)
      const balance = safeBalance(user.balance)
      if (balance < detail.price) throw remoteError('INSUFFICIENT_BALANCE', 'Oasis balance is below the reference price')
      const current = await prepareClaimsMapping(input)
      if (current.preparationSha256 !== prepared.preparationSha256) {
        throw remoteError('API_PREPARATION_CHANGED', 'API preparation changed while checking metadata')
      }
      // Identity observation is not proof of TXT/omission semantics or permission to submit.
      return { status: 'unverified', canSubmit: false, preparationSha256: prepared.preparationSha256,
        blockers: ['REMOTE_DOCUMENT_CONTRACT_UNVERIFIED', 'UNIFIED_API_EXECUTION_NOT_CONNECTED'],
        observed: { accountId: binding.accountId, folderId: folder.id, apiId: detail.id,
          apiEndpoint: binding.apiEndpoint, apiProcess: binding.apiProcess, schemaHash: detail.schemaHash,
          price: detail.price, balance } }
    },

    async getWorkspaceBinding({ workspaceId }) {
      const workspacePath = await bindingWorkspace(workspaceId)
      const { revision, bindings } = bindingSettings()
      const binding = bindings.find(item => item.workspaceId === workspaceId) ?? null
      return { workspaceId, workspacePath, settingsRevision: revision, binding,
        status: binding ? 'unverified' : 'unbound' }
    },

    async bindWorkspace(input) {
      const parsed = workspaceApiBindingCommandSchema.safeParse(input)
      if (!parsed.success) throw remoteError('INVALID_WORKSPACE_BINDING', 'An explicit bounded Workspace binding is required')
      const { expectedSettingsRevision, confirmed: _confirmed, ...selection } = parsed.data
      await bindingWorkspace(selection.workspaceId, selection.workspacePath)
      const { bindings } = bindingSettings(expectedSettingsRevision)
      if (settings.writable !== true || typeof settings.update !== 'function') {
        throw remoteError('SETTINGS_UNAVAILABLE', 'Native settings are not writable')
      }
      const active = await runtime()
      if (active.environmentKind !== selection.environmentKind || active.apiBaseOrigin !== selection.apiBaseOrigin) {
        throw remoteError('REMOTE_ENVIRONMENT_MISMATCH', 'The displayed API environment changed')
      }
      if (typeof active.assertCurrent !== 'function') throw remoteError('REMOTE_DISABLED', 'Frozen runtime check is unavailable')
      const accountId = accountIdFromUser(await active.client.getUserDetail())
      if (accountId !== selection.accountId) throw remoteError('REMOTE_ACCOUNT_MISMATCH', 'The displayed Oasis account changed')
      const [services, detail, folderValue] = await Promise.all([
        active.client.getCategoryCatalog(),
        active.client.getApiDetail(selection.apiEndpoint).then(detailWithoutRaw),
        active.client.getFolderDetail(selection.folderId),
      ])
      if (!services.some(item => item.apiId === selection.apiId && item.apiEndpoint === selection.apiEndpoint
        && item.apiProcess === selection.apiProcess) || detail.id !== selection.apiId || detail.name !== selection.apiEndpoint) {
        throw remoteError('REMOTE_SERVICE_MISMATCH', 'The displayed Oasis service changed')
      }
      if (detail.schemaHash !== selection.schemaHash) throw remoteError('REMOTE_SCHEMA_CHANGED', 'The displayed service schema changed')
      const folder = safeFolder(folderValue, selection.folderId)
      const binding = workspaceApiBindingSchema.parse({ ...selection, folderName: folder.name, confirmedAt: clock() })
      const next = parseWorkspaceApiBindings([...bindings.filter(item => item.workspaceId !== selection.workspaceId), binding])
      await active.assertCurrent()
      await bindingWorkspace(selection.workspaceId, selection.workspacePath)
      try {
        await settings.update(OASIS_SETTINGS_NAMESPACE, { workspaceApiBindings: next }, expectedSettingsRevision)
      } catch (error) {
        if (error?.code !== 'SETTINGS_CONFLICT') throw error
        throw remoteError('SETTINGS_CONFLICT', 'Native settings changed; read and confirm again')
      }
      // This is not TXT/mapping acceptance or permission to generate.
      return { binding, status: 'unverified' }
    },

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
      const accountId = accountIdFromUser(user)
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
        accountId,
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
          accountId,
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
        let execution = requireExecution(requireTask(repository.get(workspaceId), taskId), executionId)
        if (['completed', 'failed'].includes(execution.status)) {
          return { committed: true, current: repository.get(workspaceId) }
        }
        if (execution.submittedAt === null && ['uploading', 'auth-required'].includes(execution.status)) {
          // No durable receipt checkpoint: restart/auth recovery cannot prove upload had no effect.
          return setExecution(workspaceId, taskId, executionId, {
            status: 'failed', safeError: { code: 'UPLOAD_OUTCOME_UNKNOWN',
              message: 'Previous upload outcome is unknown; this execution cannot retry the upload' },
          })
        }
        const active = await runtime()
        assertExecutionEnvironment(active, execution)
        await assertExecutionAccount(active, execution)
        const detail = detailWithoutRaw(await active.client.getApiDetail(execution.serviceSnapshot.apiEndpoint))
        if (detail.schemaHash !== execution.serviceSnapshot.schemaHash || detail.id !== execution.serviceSnapshot.apiId) {
          return setExecution(workspaceId, taskId, executionId, {
            status: 'failed',
            safeError: { code: 'REMOTE_SCHEMA_CHANGED', message: 'Oasis service schema changed before execution' },
          })
        }

        if (execution.submittedAt === null && !['submission-unknown', 'waiting-result', 'wait-stopped'].includes(execution.status)) {
          if (!receiptsMatchInputs(execution, detail)) {
            return setExecution(workspaceId, taskId, executionId, {
              status: 'failed', safeError: { code: 'REMOTE_UPLOAD_RECEIPT_INVALID',
                message: 'Saved upload receipts do not match the selected service inputs' },
            })
          }
          const task = requireTask(repository.get(workspaceId), taskId)
          const policy = workflowPolicy(task)
          for (const field of detail.inputFields.filter((item) => item.control === 'single-file')) {
            const referenceId = execution.formValues[field.fieldId]
            if (referenceId === undefined || referenceId === '') continue
            execution = requireExecution(requireTask(repository.get(workspaceId), taskId), executionId)
            if (execution.uploadedFiles.some((item) => item.fieldId === field.fieldId && item.referenceId === referenceId)) continue
            const reference = execution.materialSnapshots.find((item) => item.referenceId === referenceId)
            const upload = await materialManager.readForUpload(workspaceId, reference, policy)
            await setExecution(workspaceId, taskId, executionId, { status: 'uploading', safeError: null })
            let url
            try {
              url = await active.client.uploadFile(upload)
            } catch {
              return setExecution(workspaceId, taskId, executionId, {
                status: 'failed',
                safeError: { code: 'UPLOAD_OUTCOME_UNKNOWN', message: 'Oasis upload outcome is unknown; this execution cannot retry the upload' },
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
              next.tasks[taskId].remoteExecutions[executionId].status = 'prepared'
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
      await assertExecutionAccount(active, execution)
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
