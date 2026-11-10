import { createHash, randomUUID } from 'node:crypto'
import { createWorkspaceOperationGuard } from './workspace-operation-guard.js'
import { OASIS_SETTINGS_NAMESPACE, normalizeOasisRuntimeConfig } from './oasis-runtime-config.js'
import { parseWorkspaceApiBindings, workspaceApiBindingCommandSchema, workspaceApiBindingSchema } from './oasis-workspace-binding.js'
import { parseWebsiteProjectLinks } from './website-import-contract.js'
import { OASIS_PRODUCT_ORIGIN } from './oasis-account-contract.js'
import { FAST_SERVICE, matchesReleasedFastContract } from './oasis-fast-contract.js'
import { CLAIMS_TEMPLATE_ID, CLAIMS_V2_SCHEMA_VERSION, hasPendingUnifiedRun } from './generation-contract.js'
import { prepareClaimsApiMapping, prepareClaimsApiDocument, buildClaimsApiDocumentInputs } from './claims-api-document.js'
import { claimsApiSnapshotSchema, claimsApiPreviewSchema } from './claims-api-execution-contract.js'
import { createUnifiedResult, unifiedInputSha256 } from './unified-fixture.js'

import { canonicalJson } from './local-mock-runner.js'
import {
  computeOasisRemoteInputSha256,
  computeOasisRemoteResponseSha256,
} from './workbench-domain.js'
import { isOasisRemoteExecutionUnresolved, oasisRunningWaterPageSchema, WORKBENCH_LIMITS } from './workbench-contract.js'
import { getWorkflowDefinition } from './workflow-catalog.js'
import { WorkspaceMaterialError } from './workspace-materials.js'
import { buildM06Fast39Registry, inspectM06Fast39Fragment, shrinkM06Fast39Evidence, assertM06Fast39RecordCapacity } from './m06-fast39-result.js'
import { FAST39_DIRECT_FIELDS, fast39EvidenceStatus } from './m06-fast39-contract.js'

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

async function accountIdFromUser(user, active) {
  const identity = active?.accountIdentity
  if (identity !== undefined) {
    if (active.environmentKind !== 'production' || active.apiBaseOrigin !== OASIS_PRODUCT_ORIGIN
      || identity?.origin !== active.apiBaseOrigin || !Number.isSafeInteger(identity?.accountId) || identity.accountId <= 0
      || typeof identity.revision !== 'string' || !identity.revision.length || identity.revision.length > 100
      || typeof active.assertCurrent !== 'function') {
      throw remoteError('REMOTE_ACCOUNT_UNVERIFIED', 'Captured login identity is unavailable')
    }
    // The detail request must still belong to the grant that supplied this identity.
    try { await active.assertCurrent() } catch {
      throw remoteError('REMOTE_RUNTIME_CHANGED', 'Captured login is no longer current; confirm again')
    }
  }
  if (!user || typeof user !== 'object' || Array.isArray(user)) {
    throw remoteError('REMOTE_ACCOUNT_UNVERIFIED', 'Oasis authenticated account identity is unavailable')
  }
  if (!Object.hasOwn(user, 'id') && identity) return identity.accountId
  if (!Object.hasOwn(user, 'id') || !Number.isSafeInteger(user.id) || user.id < 0) {
    throw remoteError('REMOTE_ACCOUNT_UNVERIFIED', 'Oasis authenticated account identity is unavailable')
  }
  if (identity && user.id !== identity.accountId) throw remoteError('REMOTE_ACCOUNT_MISMATCH', 'Detail identity conflicts with the captured login')
  return user.id
}

async function assertExecutionAccount(active, execution) {
  if (!Number.isSafeInteger(execution.accountId)) {
    throw remoteError('REMOTE_ACCOUNT_UNVERIFIED', 'Historical execution has no verified account identity; it will not be reassigned')
  }
  if (await accountIdFromUser(await active.client.getUserDetail(), active) !== execution.accountId) {
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

function safeFolder(value, expectedId, expectedOwner) {
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
  if (expectedOwner !== undefined && value.owner_id !== expectedOwner) {
    throw remoteError('REMOTE_FOLDER_MISMATCH', 'Oasis folder ownership does not match the authenticated account')
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

function claimsDetail(detail, environmentKind) {
  if (environmentKind === 'production' && !matchesReleasedFastContract(detail)) {
    throw remoteError('REMOTE_SCHEMA_CHANGED', 'Fast service contract changed; a reviewed release mapping is required')
  }
  return detailWithoutRaw(detail)
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
  resolveConfig = normalizeOasisRuntimeConfig,
  repository,
  materialManager,
  getRuntime,
  settings,
  settingsNamespace = OASIS_SETTINGS_NAMESPACE,
  workspaceRegistry,
  fast39Delivery,
  workspaceOperations = createWorkspaceOperationGuard(),
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
  const claimsConfirmations = new Map()
  const claimsAdmissions = new Map()
  const linkedClaimsBindings = new Map()
  // Optional receive-only captured context, not a setting or an activation flag.
  // No current application composition supplies it. Detach it from caller edits.
  const capturedFast39 = fast39Delivery == null ? null : structuredClone(fast39Delivery)

  function assertFast39Snapshot(current, taskId, executionId) {
    const d = capturedFast39, task = requireTask(current, taskId), e = requireExecution(task, executionId)
    const match = d && current.workspaceId === d.workspaceId && taskId === d.taskId && executionId === d.executionId
      && task.workType === 'cn-invention-patent' && task.workflowId === d.workflowId && task.workflowVersion === d.workflowVersion
      && !e.unifiedClaims && e.submittedAt !== null && e.requestKey === d.requestKey && e.inputSha === d.inputSha
      && e.apiBaseOrigin === d.apiBaseOrigin && e.environmentKind === d.environmentKind && e.accountId === d.accountId
      && e.folderSnapshot.folderId === d.folderId && e.serviceSnapshot.apiId === d.apiId
      && Number.isSafeInteger(d.catalogEntryId) && e.serviceSnapshot.catalogEntryId === d.catalogEntryId
      && e.serviceSnapshot.apiEndpoint === d.apiEndpoint && e.serviceSnapshot.apiProcess === d.apiProcess
      && e.serviceSnapshot.schemaHash === d.schemaHash && typeof d.packetText === 'string'
    if (!match) throw remoteError('FAST39_BINDING_MISMATCH', '当前任务与原专业服务及材料记录不一致，结果未写入。')
    const keys = Object.keys(e.formValues), material = e.materialSnapshots[0], upload = e.uploadedFiles[0]
    if (keys.length !== 8 || FAST39_DIRECT_FIELDS.some(k => !Object.hasOwn(e.formValues, k) || e.formValues[k] !== '')
      || e.formValues.User_input !== d.User_input || e.materialSnapshots.length !== 1 || e.uploadedFiles.length !== 1
      || e.formValues.Technical_Disclosure_file !== material?.referenceId
      || material?.sha256 !== createHash('sha256').update(d.packetText, 'utf8').digest('hex')
      || upload?.fieldId !== 'Technical_Disclosure_file' || upload?.referenceId !== material.referenceId || upload?.sha256 !== material.sha256) {
      throw remoteError('FAST39_BINDING_MISMATCH', '原提交材料或来源范围不一致，结果未写入。')
    }
    return e
  }

  function fast39FailureCandidate(current, taskId, executionId, inspected, result) {
    const next = structuredClone(current), now = clock(), e = next.tasks[taskId].remoteExecutions[executionId]
    Object.assign(e, { status: inspected.status, safeError: { code: inspected.code,
      message: inspected.code === 'FAST39_RESULT_TOO_LARGE' ? '结果超过可保存容量，已保留可容纳的收据；请人工处理，不要重复生成。'
        : '专业服务结果仍需人工核对；已保留原提交及可用收据，不会自动重新生成。' }, updatedAt: now,
    ...(inspected.evidence ? { fast39Result: inspected.evidence } : {}),
    ...(Number.isSafeInteger(result.recordId) ? { recordId: result.recordId, recordIdSource: 'create' } : {}) })
    next.tasks[taskId].updatedAt = now
    return next
  }

  function fitFast39Candidate(current, candidate, taskId, executionId, inspected, result) {
    const check = value => assertM06Fast39RecordCapacity({ ...value, schemaVersion: 4, revision: current.revision + 1, updatedAt: clock() })
    try { check(candidate); return candidate } catch (error) {
      if (error?.code !== 'FAST39_RESULT_TOO_LARGE') throw error
      if (inspected.evidence) {
        const evidence = shrinkM06Fast39Evidence(inspected.evidence)
        const small = fast39FailureCandidate(current, taskId, executionId, { evidence,
          status: fast39EvidenceStatus(evidence), code: evidence.fragment.structured_result_error.code }, result)
        try { check(small); return small } catch (smallError) {
          if (smallError?.code !== 'FAST39_RESULT_TOO_LARGE') throw smallError
        }
      }
      throw remoteError('FAST39_RESULT_PERSISTENCE_FAILED', '剩余空间不足，结果未能保存，原提交记录保持；请人工处理，不要重复生成。')
    }
  }

  function linkedScope(workspaceId, state) {
    const link = parseWebsiteProjectLinks(state.value.websiteProjectLinks).find(item => item.workspaceId === workspaceId)
    if (!link) throw remoteError('WORKSPACE_BINDING_REQUIRED', '请先在功能中心使用“从网站导入”关联网站项目；本地 Skills 不受影响。')
    if (link.apiBaseOrigin !== OASIS_PRODUCT_ORIGIN || resolveConfig(state.value).apiBaseUrl !== OASIS_PRODUCT_ORIGIN) {
      throw remoteError('REMOTE_ENVIRONMENT_MISMATCH', 'The linked website origin changed')
    }
    return { link, key: canonicalJson({ revision: state.revision, link }) }
  }

  function claimsBinding(workspaceId, state) {
    if (resolveConfig(state.value).environmentKind !== 'production') return state.bindings.find(item => item.workspaceId === workspaceId)
    const scope = linkedScope(workspaceId, state), cached = linkedClaimsBindings.get(workspaceId)
    if (!cached || cached.key !== scope.key) throw remoteError('API_SERVICE_MAPPING_REQUIRED', '请点击“核对服务与材料”读取并核验 Fast 服务；无需填写项目绑定表单。')
    return cached.binding
  }

  function pruneConfirmations() {
    for (const [token, entry] of claimsConfirmations) if (entry.expires <= Date.now()) claimsConfirmations.delete(token)
    if (claimsConfirmations.size >= 256) throw remoteError('API_CONFIRMATION_LIMIT', 'Too many pending confirmations; wait and prepare again')
  }

  function assertCatalogIdentity(services, snapshot, environmentKind) {
    const catalogEntryId = snapshot.catalogEntryId
    if (environmentKind === 'production' && !Number.isSafeInteger(catalogEntryId)) {
      throw remoteError('REMOTE_SERVICE_MISMATCH', 'Fresh catalog identity is required before transfer')
    }
    const matches = services.filter(item => item.apiEndpoint === snapshot.apiEndpoint)
    if (matches.length !== 1 || matches[0].apiId !== (catalogEntryId ?? snapshot.apiId)
      || matches[0].apiProcess !== snapshot.apiProcess) {
      throw remoteError('REMOTE_SERVICE_MISMATCH', 'The confirmed catalog identity or process changed')
    }
  }

  function assertClaimsDetail(detail) {
    const fields = new Map(detail.inputFields.map(field => [field.fieldId, field.control]))
    const optional = ['technical_field', 'background_art_TD', 'technical_solutions', 'beneficial_effects_TD', 'embodiments_TD', 'drawings_explain_TD', 'User_input']
    if (detail.apiType !== 'Workflow' || detail.executionMode !== 'sync'
      || fields.get('Technical_Disclosure_file') !== 'single-file'
      || ['drawings_explain_TD', 'User_input'].some(id => !['short-text', 'long-text'].includes(fields.get(id)))
      || detail.inputFields.some(field => field.fieldId !== 'Technical_Disclosure_file'
        && (!optional.includes(field.fieldId) || !['short-text', 'long-text'].includes(field.control)))
      || !detail.outputFields.some(field => field.control === 'text-output')) {
      throw remoteError('REMOTE_MAPPING_UNSUPPORTED', 'Service does not support the confirmed synchronous TXT claims mapping')
    }
  }

  async function assertClaimsAdmission(workspaceId, taskId, execution, admission) {
    if (execution.environmentKind === 'production' && !Number.isSafeInteger(execution.serviceSnapshot.catalogEntryId)) {
      throw remoteError('REMOTE_SERVICE_MISMATCH', 'Historical preparation requires fresh catalog verification')
    }
    if (!admission || admission.expires <= Date.now()) throw remoteError('API_CONFIRMATION_REQUIRED', 'Pre-submit consent expired or Host restarted; do not resume automatically')
    await admission.active.assertCurrent()
    const snapshot = execution.unifiedClaims
    await bindingWorkspace(workspaceId, snapshot.workspacePath)
    const currentSettings = bindingSettings(snapshot.expectedSettingsRevision)
    const binding = claimsBinding(workspaceId, currentSettings)
    const task = requireTask(repository.get(workspaceId), taskId)
    if (snapshot.workspaceId !== workspaceId || snapshot.taskId !== taskId
      || canonicalJson(binding ?? null) !== canonicalJson(snapshot.binding)
      || canonicalJson(task.formValues) !== canonicalJson(snapshot.values)
      || task.generation?.source !== 'oasis-api' || task.generation.upstream || task.inputRefs.length) {
      throw remoteError('API_PREPARATION_CHANGED', 'Original project, binding or materials changed before submission')
    }
  }

  async function recheckClaimsDestination(execution, active) {
    const user = await active.client.getUserDetail()
    if (await accountIdFromUser(user, active) !== execution.accountId) throw remoteError('REMOTE_ACCOUNT_MISMATCH', 'Account changed before create')
    const services = await active.client.getCategoryCatalog()
    const s = execution.serviceSnapshot
    assertCatalogIdentity(services, s, execution.environmentKind)
    const detail = claimsDetail(await active.client.getApiDetail(s.apiEndpoint), execution.environmentKind)
    if (detail.id !== s.apiId || detail.name !== s.apiEndpoint) throw remoteError('REMOTE_SERVICE_MISMATCH', 'Service detail identity changed before create')
    if (detail.schemaHash !== s.schemaHash || detail.price !== execution.priceSnapshot.price) throw remoteError('REMOTE_SCHEMA_CHANGED', 'Schema or reference price changed before create')
    safeFolder(await active.client.getFolderDetail(execution.folderSnapshot.folderId), execution.folderSnapshot.folderId,
      execution.environmentKind === 'production' ? execution.accountId : undefined)
    if (safeBalance(user.balance) < detail.price) throw remoteError('INSUFFICIENT_BALANCE', 'Balance is below the confirmed reference price')
  }

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
    const descriptor = settings?.describe({ redactSecrets: true }).find(item => item.ns === settingsNamespace)
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
      if (execution.fast39Result) return current
      if (execution.unifiedClaims && ['completed', 'failed'].includes(execution.status)) {
        throw remoteError('REMOTE_EXECUTION_TERMINAL', 'A terminal execution cannot be resumed')
      }
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
    if (execution.unifiedClaims) {
      const s = execution.unifiedClaims, receipt = execution.uploadedFiles[0]
      if (!receipt) throw remoteError('REMOTE_UPLOAD_MISSING', 'Derived TXT receipt is missing')
      return buildClaimsApiDocumentInputs({ inputSchemaVersion: s.inputSchemaVersion, values: s.values }, receipt.url,
        s.allowedUploadOrigins, s.binding.environmentKind)
    }
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
    if (execution.unifiedClaims) {
      const d = execution.unifiedClaims.mapping.document
      return execution.uploadedFiles.length <= 1 && execution.uploadedFiles.every(upload => upload.fieldId === d.fieldId
        && upload.referenceId === `derived-txt:${d.sha256}` && upload.sha256 === d.sha256)
    }
    // Repository integrity already checks duplicate fields and material reference/hash identity.
    return execution.uploadedFiles.every(upload => detail.inputFields.some(field => (
      field.control === 'single-file' && field.fieldId === upload.fieldId
      && execution.formValues[field.fieldId] === upload.referenceId
    )))
  }

  async function complete(workspaceId, taskId, executionId, result, source, fast39Inspection, expectedRevision) {
    const execution = requireExecution(requireTask(repository.get(workspaceId), taskId), executionId)
    if (execution.fast39Result && !fast39Inspection) return { committed: true, current: repository.get(workspaceId) }
    const identityError = resultIdentityError(execution, result)
    if (identityError) {
      if (fast39Inspection) throw remoteError('FAST39_BINDING_MISMATCH', '专业服务响应不属于原请求，结果未写入。')
      return setExecution(workspaceId, taskId, executionId, {
        status: 'failed',
        safeError: identityError,
      })
    }
    if (Object.hasOwn(result, 'enhancedFragment') && !fast39Inspection) {
      // C4 cannot be downgraded into a legacy completed artifact. The current
      // dispatcher has no frozen packet2/delivery binding, so retain its existing
      // request facts and require explicit recovery instead of claiming acceptance.
      return setExecution(workspaceId, taskId, executionId, {
        status: 'submission-unknown',
        ...(source === 'create' && Number.isSafeInteger(result.recordId)
          ? { recordId: result.recordId, recordIdSource: 'create' } : {}),
        safeError: { code: 'FAST39_BINDING_REQUIRED',
          message: '已收到专业服务的新格式响应，但当前版本尚未完成该服务的结果接入。原提交记录已保留，请勿重复生成，需人工核对。' },
      })
    }
    if (execution.unifiedClaims && (typeof result.answerText !== 'string' || !result.answerText.trim() || result.answerText.length > 100000)) {
      return setExecution(workspaceId, taskId, executionId, { status: 'failed', safeError: {
        code: 'REMOTE_TEXT_REQUIRED', message: 'No bounded nonempty text was received; file links are not a text result and the request will not be repeated',
      } })
    }
    const operation = (current) => {
      const task = requireTask(current, taskId)
      const currentExecution = requireExecution(task, executionId)
      if (fast39Inspection) assertFast39Snapshot(current, taskId, executionId)
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
        ...(currentExecution.serviceSnapshot.catalogEntryId !== undefined ? { catalogEntryId: currentExecution.serviceSnapshot.catalogEntryId } : {}),
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
      if (currentExecution.unifiedClaims) {
        const s = currentExecution.unifiedClaims
        Object.assign(run, { mode: 'oasis-api', source: 'oasis-api', evidenceKind: currentExecution.environmentKind === 'production' ? 'production-api' : 'non-production-api',
          workflowId: CLAIMS_TEMPLATE_ID, workflowVersion: '2', inputSchemaVersion: CLAIMS_V2_SCHEMA_VERSION,
          parentRunId: null, executionInputSha: currentExecution.inputSha,
          inputSnapshot: { formValues: structuredClone(s.values), inputRefs: [], upstreamSnapshot: { status: 'missing', reason: 'not-connected' },
            sha256: '', capturedAt: currentExecution.createdAt },
          result: createUnifiedResult(answerText),
          remoteResponse: { answerText, fileUrls, responseSha: computeOasisRemoteResponseSha256({ answerText, fileUrls }), fileStatus: 'undownloaded-unverified' },
        })
        run.inputSnapshot.sha256 = unifiedInputSha256(run)
      }
      const next = structuredClone(current)
      Object.assign(next.tasks[taskId].remoteExecutions[executionId], {
        status: 'completed',
        ...(source === 'create' && Number.isSafeInteger(result.recordId)
          ? { recordId: result.recordId, recordIdSource: 'create' } : {}),
        safeError: null, updatedAt: completedAt, completedAt,
        ...(fast39Inspection ? { fast39Result: fast39Inspection.evidence } : {}),
      })
      next.tasks[taskId].runs[runId] = run
      next.tasks[taskId].runOrder.push(runId)
      next.tasks[taskId].activeRunId = runId
      next.tasks[taskId].updatedAt = completedAt
      return fast39Inspection ? fitFast39Candidate(current, next, taskId, executionId, fast39Inspection, result) : next
    }
    return expectedRevision === undefined ? mutateLatest(workspaceId, taskId, operation)
      : repository.mutate(workspaceId, expectedRevision, operation)
  }

  async function poll(workspaceId, taskId, executionId, client) {
    const controller = new AbortController()
    const key = executionKey(workspaceId, taskId, executionId)
    waitControllers.set(key, controller)
    try {
      for (let attempt = 0; attempt < pollLimit; attempt += 1) {
        const execution = requireExecution(requireTask(repository.get(workspaceId), taskId), executionId)
        if (execution.fast39Result) return { committed: true, current: repository.get(workspaceId) }
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
      const state = bindingSettings(expectedSettingsRevision)
      const { revision, value } = state
      const binding = claimsBinding(workspaceId, state)
      const websiteLink = parseWebsiteProjectLinks(value.websiteProjectLinks).find(item => item.workspaceId === workspaceId)
      if (!binding) throw websiteLink
        ? remoteError('API_SERVICE_MAPPING_REQUIRED', '网站项目已关联；当前版本尚未确认本模板的专业 API 服务映射，暂不能生成。无需填写 JWT 或项目绑定表单。')
        : remoteError('WORKSPACE_BINDING_REQUIRED', '请先在功能中心使用“从网站导入”关联网站项目；本地 Skills 不受影响。')
      if (websiteLink && ['workspacePath', 'apiBaseOrigin', 'accountId', 'folderId'].some(key => websiteLink[key] !== binding[key])) {
        throw remoteError('WEBSITE_PROJECT_LINK_CONFLICT', '导入项目与原专业 API 关联不一致，已阻止使用旧关联。')
      }
      if (binding.workspacePath !== workspacePath) throw remoteError('WORKSPACE_ROOT_CHANGED', 'Workspace binding path changed; confirm again')
      const config = resolveConfig(value)
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

    async prepareLinkedClaimsMapping(input) {
      if (input.remoteReadConfirmed !== true) throw remoteError('REMOTE_READ_CONFIRMATION_REQUIRED', 'Confirm metadata access first')
      return workspaceOperations.run(input.workspaceId, async () => {
        const state = bindingSettings(input.expectedSettingsRevision)
        if (resolveConfig(state.value).environmentKind !== 'production') return prepareClaimsMapping(input)
        const scope = linkedScope(input.workspaceId, state)
        await bindingWorkspace(input.workspaceId, scope.link.workspacePath)
        const record = repository.get(input.workspaceId), task = requireTask(record, input.taskId)
        if (record.revision !== input.expectedRevision) throw remoteError('REVISION_CONFLICT', 'Task changed before metadata read')
        if (task.workflowId !== CLAIMS_TEMPLATE_ID || task.workflowVersion !== '2' || task.generation?.source !== 'oasis-api') {
          throw remoteError('WORKFLOW_MISMATCH', 'A unified claims v2 API draft is required')
        }
        if (task.generation.upstream || task.inputRefs.length) throw remoteError('UNSUPPORTED_MATERIAL', 'Cannot omit upstream or file materials')
        if (Object.values(record.tasks).some(item => hasPendingUnifiedRun(item) || Object.values(item.remoteExecutions).some(isOasisRemoteExecutionUnresolved))) {
          throw remoteError('WORKSPACE_GENERATION_ACTIVE', 'Workspace has an unresolved generation')
        }
        prepareClaimsApiMapping({ inputSchemaVersion: task.generation.inputSchemaVersion, values: task.formValues })
        const active = await runtime()
        if (active.environmentKind !== 'production' || active.apiBaseOrigin !== scope.link.apiBaseOrigin) throw remoteError('REMOTE_ENVIRONMENT_MISMATCH', 'Linked runtime changed')
        const user = await active.client.getUserDetail()
        if (await accountIdFromUser(user, active) !== scope.link.accountId) throw remoteError('REMOTE_ACCOUNT_MISMATCH', 'Linked account changed')
        const services = await active.client.getCategoryCatalog()
        const matches = services.filter(item => item.apiEndpoint === FAST_SERVICE.name)
        if (matches.length !== 1 || !Number.isSafeInteger(matches[0].apiId) || matches[0].apiId < 0) {
          throw remoteError('REMOTE_SERVICE_MISMATCH', 'Released Fast service is not uniquely available')
        }
        const observed = await active.client.getApiDetail(FAST_SERVICE.name)
        if (observed.id !== FAST_SERVICE.id || observed.name !== FAST_SERVICE.name) throw remoteError('REMOTE_SERVICE_MISMATCH', 'Fast service identity changed')
        const detail = claimsDetail(observed, 'production')
        safeFolder(await active.client.getFolderDetail(scope.link.folderId), scope.link.folderId, scope.link.accountId)
        const binding = workspaceApiBindingSchema.parse({ ...scope.link, environmentKind: 'production',
          apiId: detail.id, catalogEntryId: matches[0].apiId, apiEndpoint: detail.name, apiProcess: matches[0].apiProcess, schemaHash: detail.schemaHash })
        await active.assertCurrent()
        await bindingWorkspace(input.workspaceId, scope.link.workspacePath)
        const current = bindingSettings(input.expectedSettingsRevision)
        if (linkedScope(input.workspaceId, current).key !== scope.key || repository.get(input.workspaceId).revision !== input.expectedRevision) {
          throw remoteError('API_PREPARATION_CHANGED', 'Project or draft changed during metadata read')
        }
        if (!linkedClaimsBindings.has(input.workspaceId) && linkedClaimsBindings.size >= 256) throw remoteError('API_CONFIRMATION_LIMIT', 'Too many cached Workspace mappings')
        linkedClaimsBindings.set(input.workspaceId, { key: scope.key, binding })
        return prepareClaimsMapping(input)
      })
    },

    async previewClaims(input) {
      pruneConfirmations()
      const observed = await this.checkClaimsMapping(input)
      const prepared = await prepareClaimsMapping(input)
      const snapshot = claimsApiSnapshotSchema.parse(prepared.snapshot)
      const active = await runtime()
      const detail = claimsDetail(await active.client.getApiDetail(snapshot.binding.apiEndpoint), snapshot.binding.environmentKind)
      assertClaimsDetail(detail)
      if (detail.schemaHash !== snapshot.binding.schemaHash) throw remoteError('REMOTE_SCHEMA_CHANGED', 'Service changed before confirmation')
      await active.assertCurrent()
      const token = randomUUID(), expires = Date.now() + 10 * 60 * 1000
      claimsConfirmations.set(token, { snapshot, active, expires, preparationSha256: prepared.preparationSha256 })
      const b = snapshot.binding
      return claimsApiPreviewSchema.parse({ workspaceId: snapshot.workspaceId, taskId: snapshot.taskId,
        expectedRevision: snapshot.expectedRevision, expectedSettingsRevision: snapshot.expectedSettingsRevision,
        confirmationToken: token, expiresAt: new Date(expires).toISOString(), preparationSha256: prepared.preparationSha256,
        apiBaseOrigin: b.apiBaseOrigin, environmentKind: b.environmentKind, accountId: b.accountId, folderId: b.folderId, folderName: b.folderName,
        apiEndpoint: b.apiEndpoint, price: observed.observed.price, balance: observed.observed.balance,
        documentBytes: snapshot.mapping.document.byteLength, characterCount: Object.values(snapshot.values).reduce((n, text) => n + text.length, 0),
        mappingVersion: 'claims-document-2' })
    },

    async startClaims(input) {
      return workspaceOperations.run(input.workspaceId, async () => {
      if (input.priceConfirmed !== true || input.externalTransferConfirmed !== true) throw remoteError('API_CONFIRMATION_REQUIRED', 'Confirm this transfer and reference price')
      const admission = claimsConfirmations.get(input.confirmationToken)
      claimsConfirmations.delete(input.confirmationToken)
      if (!admission || admission.expires <= Date.now()) throw remoteError('API_CONFIRMATION_REQUIRED', 'Prepare and confirm this operation again')
      const { snapshot } = admission
      if (input.workspaceId !== snapshot.workspaceId || input.taskId !== snapshot.taskId
        || input.expectedRevision !== snapshot.expectedRevision || input.expectedSettingsRevision !== snapshot.expectedSettingsRevision
        || typeof input.requestKey !== 'string' || !input.requestKey || input.requestKey.length > 256) {
        throw remoteError('API_PREPARATION_CHANGED', 'Confirmed scope changed')
      }
      await admission.active.assertCurrent()
      const checked = await this.checkClaimsMapping({ ...input, preparationSha256: admission.preparationSha256, remoteReadConfirmed: true })
      await admission.active.assertCurrent()
      const now = clock(), executionId = executionIdFactory(), b = snapshot.binding
      const providerSnapshot = { environmentKind: b.environmentKind, accountId: b.accountId, apiBaseOrigin: b.apiBaseOrigin,
        ...(b.catalogEntryId !== undefined ? { catalogEntryId: b.catalogEntryId } : {}),
        apiId: b.apiId, apiEndpoint: b.apiEndpoint, apiProcess: b.apiProcess, folderId: b.folderId, price: checked.observed.price }
      const execution = { environmentKind: b.environmentKind, accountId: b.accountId, unifiedClaims: snapshot,
        executionId, recordId: null, recordIdSource: null, requestKey: input.requestKey, status: 'prepared',
        inputSha: computeOasisRemoteInputSha256({ providerSnapshot, formValues: snapshot.mapping.textInputs, inputRefs: [], unifiedClaims: snapshot }),
        formValues: structuredClone(snapshot.mapping.textInputs), apiBaseOrigin: b.apiBaseOrigin,
        serviceSnapshot: { apiId: b.apiId, ...(b.catalogEntryId !== undefined ? { catalogEntryId: b.catalogEntryId } : {}),
          apiEndpoint: b.apiEndpoint, apiProcess: b.apiProcess, schemaHash: b.schemaHash },
        folderSnapshot: { folderId: b.folderId, folderName: b.folderName }, priceSnapshot: { price: checked.observed.price, balance: checked.observed.balance },
        materialSnapshots: [], uploadedFiles: [], safeError: null, createdAt: now, updatedAt: now, submittedAt: null, completedAt: null }
      const result = await repository.mutate(input.workspaceId, input.expectedRevision, async current => {
        await admission.active.assertCurrent()
        await bindingWorkspace(input.workspaceId, snapshot.workspacePath)
        bindingSettings(snapshot.expectedSettingsRevision)
        const task = requireTask(current, input.taskId)
        if (Object.values(current.tasks).some(t => hasPendingUnifiedRun(t) || Object.values(t.remoteExecutions).some(isOasisRemoteExecutionUnresolved))) {
          throw remoteError('WORKSPACE_GENERATION_ACTIVE', 'Workspace has an unresolved generation')
        }
        if (task.remoteExecutionOrder.length >= WORKBENCH_LIMITS.maxRemoteExecutionsPerTask || task.runOrder.length >= WORKBENCH_LIMITS.maxRunsPerTask) throw remoteError('RUN_LIMIT_REACHED', 'Generation history capacity reached')
        if (Object.values(task.remoteExecutions).some(e => e.requestKey === input.requestKey)) throw remoteError('IDEMPOTENCY_CONFLICT', 'Request already exists; observe it instead')
        const next = structuredClone(current)
        next.tasks[input.taskId].remoteExecutions[executionId] = execution
        next.tasks[input.taskId].remoteExecutionOrder.push(executionId)
        next.tasks[input.taskId].updatedAt = now
        return next
      })
      if (result.committed) claimsAdmissions.set(executionKey(input.workspaceId, input.taskId, executionId), admission)
      return result
      })
    },

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
        if (await accountIdFromUser(user, active) !== binding.accountId) {
          throw remoteError('REMOTE_ACCOUNT_MISMATCH', 'The prepared Oasis account changed')
        }
        services = await active.client.getCategoryCatalog()
        detail = claimsDetail(await active.client.getApiDetail(binding.apiEndpoint), binding.environmentKind)
        folderValue = await active.client.getFolderDetail(binding.folderId)
        await active.assertCurrent()
      } catch (error) {
        if (error instanceof WorkspaceMaterialError) throw error
        if (error?.code === 'REMOTE_RUNTIME_CHANGED') throw remoteError('REMOTE_RUNTIME_CHANGED', 'API configuration or credentials changed; prepare again')
        const safe = safeApiError(error, 'REMOTE_PREFLIGHT_FAILED', 'API metadata could not be verified; no upload or generation was requested')
        throw remoteError(safe.code, safe.message)
      }
      assertCatalogIdentity(services, binding, binding.environmentKind)
      if (detail.id !== binding.apiId || detail.name !== binding.apiEndpoint) {
        throw remoteError('REMOTE_SERVICE_MISMATCH', 'The prepared Oasis service changed')
      }
      if (detail.schemaHash !== binding.schemaHash) throw remoteError('REMOTE_SCHEMA_CHANGED', 'Service schema or price changed; confirm the binding again')
      const folder = safeFolder(folderValue, binding.folderId, binding.environmentKind === 'production' ? binding.accountId : undefined)
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

    async getBindingOptions({ workspaceId, remoteReadConfirmed }) {
      if (remoteReadConfirmed !== true) throw remoteError('REMOTE_READ_CONFIRMATION_REQUIRED', 'Confirm metadata access first')
      const workspacePath = await bindingWorkspace(workspaceId), { revision } = bindingSettings()
      try {
        const active = await runtime()
        if (typeof active.assertCurrent !== 'function') throw remoteError('REMOTE_DISABLED', 'Frozen runtime check is unavailable')
        const [user, services, folders] = await Promise.all([
          active.client.getUserDetail(), active.client.getCategoryCatalog(), active.client.getFolderList(),
        ])
        await active.assertCurrent()
        await bindingWorkspace(workspaceId, workspacePath)
        bindingSettings(revision)
        return { workspaceId, workspacePath, settingsRevision: revision, accountId: await accountIdFromUser(user, active),
          apiBaseOrigin: active.apiBaseOrigin, environmentKind: active.environmentKind, remoteEnabled: true, credentialConfigured: true,
          balance: safeBalance(user.balance), services: structuredClone(services), folders: folders.items.map(item => safeFolder(item)) }
      } catch (error) {
        if (error instanceof WorkspaceMaterialError) throw error
        const safe = safeApiError(error, 'REMOTE_METADATA_FAILED', 'Could not read binding metadata; no upload or generation was requested')
        throw remoteError(safe.code, safe.message)
      }
    },

    async bindWorkspace(input) {
      const parsed = workspaceApiBindingCommandSchema.safeParse(input)
      if (!parsed.success) throw remoteError('INVALID_WORKSPACE_BINDING', 'An explicit bounded Workspace binding is required')
      const { expectedSettingsRevision, confirmed: _confirmed, ...selection } = parsed.data
      return workspaceOperations.run(selection.workspaceId, async () => {
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
      const accountId = await accountIdFromUser(await active.client.getUserDetail(), active)
      if (accountId !== selection.accountId) throw remoteError('REMOTE_ACCOUNT_MISMATCH', 'The displayed Oasis account changed')
      const [services, detail, folderValue] = await Promise.all([
        active.client.getCategoryCatalog(),
        active.client.getApiDetail(selection.apiEndpoint).then(detailWithoutRaw),
        active.client.getFolderDetail(selection.folderId),
      ])
      assertCatalogIdentity(services, selection, active.environmentKind)
      if (detail.id !== selection.apiId || detail.name !== selection.apiEndpoint) {
        throw remoteError('REMOTE_SERVICE_MISMATCH', 'The displayed Oasis service changed')
      }
      if (detail.schemaHash !== selection.schemaHash) throw remoteError('REMOTE_SCHEMA_CHANGED', 'The displayed service schema changed')
      const folder = safeFolder(folderValue, selection.folderId,
        active.environmentKind === 'production' ? selection.accountId : undefined)
      const binding = workspaceApiBindingSchema.parse({ ...selection, folderName: folder.name, confirmedAt: clock() })
      const next = parseWorkspaceApiBindings([...bindings.filter(item => item.workspaceId !== selection.workspaceId), binding])
      await active.assertCurrent()
      await bindingWorkspace(selection.workspaceId, selection.workspacePath)
      try {
        await settings.update(settingsNamespace, { workspaceApiBindings: next }, expectedSettingsRevision)
      } catch (error) {
        if (error?.code !== 'SETTINGS_CONFLICT') throw error
        throw remoteError('SETTINGS_CONFLICT', 'Native settings changed; read and confirm again')
      }
      // This is not TXT/mapping acceptance or permission to generate.
      return { binding, status: 'unverified' }
      })
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

    // Receive-only consumer for an explicitly captured C4 context. It is not
    // registered as an RPC/tool, and never uploads, creates, queries or charges.
    async acceptFast39Response({ workspaceId, taskId, executionId, expectedRevision, result }) {
      return workspaceOperations.run(workspaceId, async () => {
      const d = capturedFast39
      if (!d) throw remoteError('FAST39_BINDING_REQUIRED', '该专业服务的结果接入尚未绑定，原提交记录保持。')
      if (d.workspaceId !== workspaceId || d.taskId !== taskId || d.executionId !== executionId) {
        throw remoteError('FAST39_BINDING_MISMATCH', '结果接入不属于当前项目和任务。')
      }
      await bindingWorkspace(workspaceId, d.workspacePath)
      const active = await runtime()
      const observed = repository.get(workspaceId), execution = assertFast39Snapshot(observed, taskId, executionId)
      assertExecutionEnvironment(active, execution)
      await assertExecutionAccount(active, execution)
      if (typeof active.assertCurrent !== 'function') throw remoteError('REMOTE_RUNTIME_CHANGED', '当前账户状态无法核实，结果未写入。')
      await active.assertCurrent()
      await bindingWorkspace(workspaceId, d.workspacePath)
      const current = repository.get(workspaceId), saved = assertFast39Snapshot(current, taskId, executionId)
      if (current.revision !== expectedRevision) return { committed: false, reason: 'revision-conflict', current }
      const identityError = resultIdentityError(saved, result)
      if (identityError) throw remoteError('FAST39_BINDING_MISMATCH', '专业服务响应不属于原请求，结果未写入。')
      const registry = buildM06Fast39Registry(d)
      const inspected = inspectM06Fast39Fragment({ fragment: result.enhancedFragment, requestKey: saved.requestKey, registry,
        frozenDeliverySha256: d.frozenDeliverySha256, originalEnqueueFact: d.originalEnqueueFact })
      if (saved.fast39Result) {
        const run = Object.values(current.tasks[taskId].runs).find(r => r.executionId === executionId)
        if (canonicalJson(saved.fast39Result) === canonicalJson(inspected.evidence)
          && (!run || (run.result.answerText === result.answerText && canonicalJson(run.result.fileUrls) === canonicalJson(result.fileUrls)))) {
          return { committed: true, current }
        }
        throw remoteError('FAST39_RECEIPT_ALREADY_RECORDED', '该请求已有收据，后到响应未覆盖原记录；请人工核对。')
      }
      if (['completed', 'failed'].includes(saved.status)) throw remoteError('REMOTE_EXECUTION_TERMINAL', '已结束的请求不能写入新响应。')
      if (inspected.status === 'completed') {
        // The same response owns two independent representations. The legacy
        // backend adds output_schema labels; C4 preserves six original strings.
        // Keep the existing legacy body/hash and separately validated fragment.
        return complete(workspaceId, taskId, executionId, result, 'create', inspected, expectedRevision)
      }
      return repository.mutate(workspaceId, expectedRevision, latest => {
        assertFast39Snapshot(latest, taskId, executionId)
        const candidate = fast39FailureCandidate(latest, taskId, executionId, inspected, result)
        return fitFast39Candidate(latest, candidate, taskId, executionId, inspected, result)
      })
      })
    },

    async start({
      workspaceId,
      taskId,
      expectedRevision,
      requestKey,
      priceConfirmed,
      externalTransferConfirmed,
    }) {
      return workspaceOperations.run(workspaceId, async () => {
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
      const accountId = await accountIdFromUser(user, active)
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
        const admission = claimsAdmissions.get(key)
        if (execution.unifiedClaims && execution.submittedAt === null) await assertClaimsAdmission(workspaceId, taskId, execution, admission)
        const active = execution.unifiedClaims && execution.submittedAt === null ? admission.active : await runtime()
        assertExecutionEnvironment(active, execution)
        await assertExecutionAccount(active, execution)
        if (execution.fast39Result || execution.safeError?.code === 'FAST39_BINDING_REQUIRED') {
          // Keep the latch across reload/continue after ownership checks. A later
          // legacy body cannot discharge missing C4 validation or create again.
          return { committed: true, current: repository.get(workspaceId) }
        }
        const detail = claimsDetail(await active.client.getApiDetail(execution.serviceSnapshot.apiEndpoint), execution.unifiedClaims ? execution.environmentKind : undefined)
        if (detail.schemaHash !== execution.serviceSnapshot.schemaHash || detail.id !== execution.serviceSnapshot.apiId) {
          return setExecution(workspaceId, taskId, executionId, {
            status: 'failed',
            safeError: { code: 'REMOTE_SCHEMA_CHANGED', message: 'Oasis service schema changed before execution' },
          })
        }

        if (execution.submittedAt === null && !['submission-unknown', 'waiting-result', 'wait-stopped'].includes(execution.status)) {
          if (execution.unifiedClaims) assertClaimsDetail(detail)
          if (execution.unifiedClaims && execution.environmentKind === 'production') {
            await recheckClaimsDestination(execution, active)
            await assertClaimsAdmission(workspaceId, taskId, execution, admission)
          }
          if (!receiptsMatchInputs(execution, detail)) {
            return setExecution(workspaceId, taskId, executionId, {
              status: 'failed', safeError: { code: 'REMOTE_UPLOAD_RECEIPT_INVALID',
                message: 'Saved upload receipts do not match the selected service inputs' },
            })
          }
          const task = requireTask(repository.get(workspaceId), taskId)
          const policy = workflowPolicy(task)
          for (const field of detail.inputFields.filter((item) => item.control === 'single-file')) {
            const derived = execution.unifiedClaims?.mapping.document
            const referenceId = derived ? `derived-txt:${derived.sha256}` : execution.formValues[field.fieldId]
            if (referenceId === undefined || referenceId === '') continue
            execution = requireExecution(requireTask(repository.get(workspaceId), taskId), executionId)
            if (execution.uploadedFiles.some((item) => item.fieldId === field.fieldId && item.referenceId === referenceId)) continue
            const reference = execution.materialSnapshots.find((item) => item.referenceId === referenceId)
            const upload = derived ? prepareClaimsApiDocument({ inputSchemaVersion: execution.unifiedClaims.inputSchemaVersion, values: execution.unifiedClaims.values })
              : await materialManager.readForUpload(workspaceId, reference, policy)
            if (derived) await assertClaimsAdmission(workspaceId, taskId, execution, admission)
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
          if (execution.unifiedClaims) {
            await recheckClaimsDestination(execution, active)
            await assertClaimsAdmission(workspaceId, taskId, execution, admission)
          }
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
        const current = requireExecution(requireTask(repository.get(workspaceId), taskId), executionId)
        if (current.submittedAt !== null || ['completed', 'failed'].includes(current.status)) claimsAdmissions.delete(key)
        if (continuationJobs.get(key) === shared) continuationJobs.delete(key)
      })
      continuationJobs.set(key, shared)
      return shared
    },

    async stop({ workspaceId, taskId, executionId }) {
      const execution = requireExecution(requireTask(repository.get(workspaceId), taskId), executionId)
      const key = executionKey(workspaceId, taskId, executionId)
      // A lost pre-submit consent may be abandoned explicitly, never resumed automatically.
      // Do not abandon while this Host owns an upload/create continuation.
      if (execution.unifiedClaims && execution.submittedAt === null
        && ['prepared', 'ready-to-submit'].includes(execution.status) && !continuationJobs.has(key)) {
        await mutateLatest(workspaceId, taskId, current => {
          const saved = requireExecution(requireTask(current, taskId), executionId)
          if (continuationJobs.has(key) || saved.submittedAt !== null || !['prepared', 'ready-to-submit'].includes(saved.status)) {
            throw remoteError('REMOTE_EXECUTION_CHANGED', 'The execution can no longer be abandoned before submission')
          }
          const next = structuredClone(current)
          Object.assign(next.tasks[taskId].remoteExecutions[executionId], { status: 'failed', updatedAt: clock(),
            safeError: { code: 'PRE_SUBMIT_ABANDONED', message: 'Abandoned before create; any saved upload receipt is retained, not deleted' } })
          return next
        })
        claimsAdmissions.delete(key)
        return { stopped: true }
      }
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
