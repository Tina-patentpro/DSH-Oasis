import { importCommands, importResponses, IMPORT_PROTOCOL_VERSION } from '../website-import-contract.js'
import {
  savedFileResponseSchema,
  localGenerationPreviewSchema,
  conversationDraftResponseSchema,
  oasisProfessionalBootstrapSchema,
  oasisProfessionalDetailSchema,
  oasisRunningWaterObservationSchema,
  oasisProfessionalStopResponseSchema,
  workbenchGetResponseSchema,
  workbenchReplaceResponseSchema,
  writebackCommitResponseSchema,
  writebackPrepareResponseSchema,
  workflowCatalogResponseSchema,
  workspaceBindingOptionsSchema,
} from '../workbench-contract.js'
import { claimsApiPreparationSchema, claimsApiPreviewSchema, workspaceBindingReadSchema, workspaceBindingSavedSchema } from '../claims-api-execution-contract.js'
import { accountStatusSchema } from '../oasis-account-contract.js'

const CHANNEL = '/oasis-workbench'

export class WorkbenchRemoteError extends Error {
  constructor(code, message, details) {
    super(message)
    this.name = 'WorkbenchRemoteError'
    this.code = code
    this.details = details
  }
}

function unwrap(result, schema) {
  if (result?.ok === true && Object.hasOwn(result, 'value')) {
    const parsed = schema.safeParse(result.value)
    if (parsed.success) return parsed.data
    throw new WorkbenchRemoteError(
      'malformed-response',
      'Malformed Oasis workbench response payload',
      { issues: parsed.error.issues },
    )
  }
  if (result?.ok === false && result.error && typeof result.error.code === 'string') {
    throw new WorkbenchRemoteError(
      result.error.code,
      typeof result.error.message === 'string' ? result.error.message : 'Oasis workbench request failed',
      result.error.details,
    )
  }
  throw new WorkbenchRemoteError('malformed-response', 'Malformed Oasis workbench Connection result', {})
}

export function createWorkbenchRemote(connection) {
  if (typeof connection?.rpc?.call !== 'function') {
    throw new TypeError('DSH connection.rpc.call is required')
  }

  // Only the owned wire namespace changes; payload and result contracts stay intact.
  const call = (channel, endpoint, payload, signal) => {
    if (channel !== CHANNEL) throw new TypeError('Unexpected workbench channel')
    return connection.rpc.call('/api', `oasis-workbench/${endpoint}`, payload, signal)
  }

  return Object.freeze({
    async websiteImport(action, payload) {
      if (!Object.hasOwn(importCommands, action)) throw new WorkbenchRemoteError('IMPORT_INVALID_INPUT', '导入动作无效')
      const input = importCommands[action].parse(payload)
      const response = await call(CHANNEL, `import/${action}`, input)
      if (action === 'open' && response?.ok === true && response.value?.protocolVersion !== IMPORT_PROTOCOL_VERSION) {
        throw new WorkbenchRemoteError('IMPORT_PROTOCOL_MISMATCH', '导入协议不匹配')
      }
      const result = unwrap(response, importResponses[action])
      if (action === 'open' && result.workspaceId !== input.workspaceId || ['items', 'commit'].includes(action) && result.folderId !== input.folderId) {
        throw new WorkbenchRemoteError('INVALID_RESPONSE', '导入项目不一致')
      }
      return result
    },
    async accountStatus() { return unwrap(await call(CHANNEL, 'account/status', {}), accountStatusSchema) },
    async accountSms(payload) { return unwrap(await call(CHANNEL, 'account/sms', payload), accountStatusSchema) },
    async accountLogin(payload) { return unwrap(await call(CHANNEL, 'account/login', payload), accountStatusSchema) },
    async accountLogout(payload) { return unwrap(await call(CHANNEL, 'account/logout', payload), accountStatusSchema) },
    async getWorkspaceBinding(payload, signal) {
      const result = unwrap(await call(CHANNEL, 'professional/binding/get', payload, signal), workspaceBindingReadSchema)
      if (result.workspaceId !== payload.workspaceId) throw new WorkbenchRemoteError('INVALID_RESPONSE', '绑定项目不一致')
      return result
    },
    async getBindingOptions(payload, signal) {
      const result = unwrap(await call(CHANNEL, 'professional/binding/options', payload, signal), workspaceBindingOptionsSchema)
      if (result.workspaceId !== payload.workspaceId) throw new WorkbenchRemoteError('INVALID_RESPONSE', '绑定项目不一致')
      return result
    },
    async confirmWorkspaceBinding(payload, signal) {
      const result = unwrap(await call(CHANNEL, 'professional/binding/confirm', payload, signal), workspaceBindingSavedSchema)
      for (const key of ['workspaceId', 'workspacePath', 'apiBaseOrigin', 'accountId', 'apiId', 'apiEndpoint', 'apiProcess', 'folderId', 'schemaHash']) {
        if (result.binding[key] !== payload[key]) throw new WorkbenchRemoteError('INVALID_RESPONSE', '绑定范围不一致')
      }
      return result
    },
    async prepareClaimsApi(payload, signal) {
      const result = unwrap(await call(CHANNEL, 'task/prepare-api', payload, signal), claimsApiPreparationSchema)
      for (const key of ['workspaceId', 'taskId', 'expectedRevision', 'expectedSettingsRevision']) {
        if (result.snapshot[key] !== payload[key]) throw new WorkbenchRemoteError('INVALID_RESPONSE', 'API 材料准备范围不一致')
      }
      return result
    },
    async previewClaimsApi(payload, signal) {
      const result = unwrap(await call(CHANNEL, 'task/preview-api', payload, signal), claimsApiPreviewSchema)
      for (const key of ['workspaceId', 'taskId', 'expectedRevision', 'expectedSettingsRevision', 'preparationSha256']) {
        if (result[key] !== payload[key]) throw new WorkbenchRemoteError('INVALID_RESPONSE', 'API 确认范围不一致')
      }
      return result
    },
    async startClaimsApi(payload, signal) {
      return unwrap(await call(CHANNEL, 'task/start-api', payload, signal), workbenchReplaceResponseSchema)
    },
    async get(workspaceId, signal) {
      return unwrap(await call(
        CHANNEL,
        'state/get',
        { workspaceId },
        signal,
      ), workbenchGetResponseSchema)
    },

    async replace(workspaceId, expectedRevision, state, signal) {
      return unwrap(await call(
        CHANNEL,
        'state/replace',
        { workspaceId, expectedRevision, state },
        signal,
      ), workbenchReplaceResponseSchema)
    },

    async getWorkflowCatalog(workType, signal) {
      const payload = workType === undefined ? {} : { workType }
      return unwrap(await call(
        CHANNEL,
        'workflow/catalog',
        payload,
        signal,
      ), workflowCatalogResponseSchema)
    },

    async getProfessionalBootstrap(signal) {
      return unwrap(await call(
        CHANNEL,
        'professional/bootstrap',
        {},
        signal,
      ), oasisProfessionalBootstrapSchema)
    },

    async getProfessionalDetail(apiEndpoint, signal) {
      return unwrap(await call(
        CHANNEL,
        'professional/detail',
        { apiEndpoint },
        signal,
      ), oasisProfessionalDetailSchema)
    },

    async startProfessional(payload, signal) {
      return unwrap(await call(
        CHANNEL,
        'professional/start',
        payload,
        signal,
      ), workbenchReplaceResponseSchema)
    },

    async continueProfessional(payload, signal) {
      return unwrap(await call(
        CHANNEL,
        'professional/continue',
        payload,
        signal,
      ), workbenchReplaceResponseSchema)
    },

    async stopProfessional(payload, signal) {
      return unwrap(await call(
        CHANNEL,
        'professional/stop',
        payload,
        signal,
      ), oasisProfessionalStopResponseSchema)
    },

    async observeRunningWater(payload, signal) {
      const observation = unwrap(await call(
        CHANNEL,
        'professional/running-water',
        payload,
        signal,
      ), oasisRunningWaterObservationSchema)
      if (observation.runId !== payload.runId) {
        throw new WorkbenchRemoteError('malformed-response', 'Running-water response does not match the requested run', {})
      }
      return observation
    },

    async addMaterial(payload, signal) {
      return unwrap(await call(
        CHANNEL,
        'material/add',
        payload,
        signal,
      ), workbenchReplaceResponseSchema)
    },

    async refreshMaterial(payload, signal) {
      return unwrap(await call(
        CHANNEL,
        'material/refresh',
        payload,
        signal,
      ), workbenchReplaceResponseSchema)
    },

    async removeMaterial(payload, signal) {
      return unwrap(await call(
        CHANNEL,
        'material/remove',
        payload,
        signal,
      ), workbenchReplaceResponseSchema)
    },

    async createRun(payload, signal) {
      return unwrap(await call(
        CHANNEL,
        'task/create',
        payload,
        signal,
      ), workbenchReplaceResponseSchema)
    },

    async reviewRun(payload, signal) {
      return unwrap(await call(
        CHANNEL,
        'task/review',
        payload,
        signal,
      ), workbenchReplaceResponseSchema)
    },

    async createUnifiedRun(payload, signal) {
      return unwrap(await call(CHANNEL, 'task/create-unified', payload, signal), workbenchReplaceResponseSchema)
    },
    async selectClaimsUpstream(payload, signal) {
      return unwrap(await call(CHANNEL, 'task/select-upstream', payload, signal), workbenchReplaceResponseSchema)
    },
    async prepareLocalRun(payload, signal) {
      const result = unwrap(await call(CHANNEL, 'task/prepare-local', payload, signal), localGenerationPreviewSchema)
      for (const key of ['workspaceId', 'taskId', 'sessionId', 'expectedRevision']) {
        if (result[key] !== payload[key]) throw new WorkbenchRemoteError('INVALID_RESPONSE', '生成确认范围不一致')
      }
      return result
    },
    async createLocalRun(payload, signal) {
      return unwrap(await call(CHANNEL, 'task/create-local', payload, signal), workbenchReplaceResponseSchema)
    },
    async observeLocalRun(payload, signal) {
      return unwrap(await call(CHANNEL, 'task/observe-local', payload, signal), workbenchReplaceResponseSchema)
    },
    async stopUnifiedRun(payload, signal) {
      return unwrap(await call(CHANNEL, 'task/stop-unified', payload, signal), workbenchReplaceResponseSchema)
    },
    async editUnifiedResult(payload, signal) {
      return unwrap(await call(CHANNEL, 'task/edit-result', payload, signal), workbenchReplaceResponseSchema)
    },
    async prepareConversationDraft(payload, signal) {
      const result = unwrap(await call(CHANNEL, 'artifact/conversation-draft', payload, signal), conversationDraftResponseSchema)
      for (const key of ['workspaceId', 'taskId', 'runId', 'artifactId']) {
        if (result[key] !== payload[key]) throw new WorkbenchRemoteError('malformed-response', 'Conversation artifact identity mismatch', {})
      }
      return result
    },
    async resolveSavedFile(payload, signal) {
      const result = unwrap(await call(CHANNEL, 'artifact/saved-file', payload, signal), savedFileResponseSchema)
      for (const key of ['workspaceId', 'taskId', 'runId', 'artifactId', 'writebackId']) {
        if (result[key] !== payload[key]) throw new WorkbenchRemoteError('malformed-response', 'Saved file identity mismatch', {})
      }
      return result
    },

    async prepareWriteback(payload, signal) {
      return unwrap(await call(
        CHANNEL,
        'artifact/prepare-writeback',
        payload,
        signal,
      ), writebackPrepareResponseSchema)
    },

    async commitWriteback(confirmationToken, signal) {
      return unwrap(await call(
        CHANNEL,
        'artifact/commit-writeback',
        { confirmationToken },
        signal,
      ), writebackCommitResponseSchema)
    },
  })
}
