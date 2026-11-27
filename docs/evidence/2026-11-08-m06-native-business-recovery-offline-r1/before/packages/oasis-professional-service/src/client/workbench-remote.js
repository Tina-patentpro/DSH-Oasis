import { importCommands, importResponses, IMPORT_PROTOCOL_VERSION } from '../website-import-contract.js'
import {
  savedFileResponseSchema,
  v340ConversationDraftResponseSchema,v340SavedFileResponseSchema,
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
import {v340Commands,v340CatalogResponseSchema,v340CandidatePreviewSchema,v340ReadonlyPrepareSchema,v340ReadonlyPreparedSchema} from '../v340-runtime-contract.js'

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
    async getV340Catalog(signal){return unwrap(await call(CHANNEL,'workflow/v340/catalog',{},signal),v340CatalogResponseSchema)},
    async prepareV340(payload,signal){
      const input=v340ReadonlyPrepareSchema.parse(payload)
      const result=unwrap(await call(CHANNEL,'workflow/v340/prepare',input,signal),v340ReadonlyPreparedSchema)
      if(result.workspaceId!==input.workspaceId||result.nodeId!==input.nodeId||result.prepared.nodeId!==input.nodeId)throw new WorkbenchRemoteError('malformed-response','只读准备身份不一致',{})
      return result
    },
    async prepareV340Candidate(payload,signal){
      const input=v340Commands['candidate/prepare'].parse(payload)
      const result=unwrap(await call(CHANNEL,'workflow/v340/candidate/prepare',input,signal),v340CandidatePreviewSchema)
      if(['workspaceId','taskId','sessionId','expectedRevision'].some(k=>result[k]!==input[k]))throw new WorkbenchRemoteError('malformed-response','候选准备身份不一致',{})
      return result
    },
    async createV340CandidateRun(payload,signal){
      const input=v340Commands['candidate/run'].parse(payload)
      const result=unwrap(await call(CHANNEL,'workflow/v340/candidate/run',input,signal),workbenchReplaceResponseSchema)
      if(result.current.workspaceId!==input.workspaceId)throw new WorkbenchRemoteError('malformed-response','候选项目身份不一致',{})
      if(result.committed){
        const run=Object.values(result.current.tasks[input.taskId]?.v340?.runs??{}).find(r=>r.requestKey===input.requestKey)
        if(!run||run.nodeId!=='Flow-2-6'||run.source!=='local-skill'||run.nativeCandidate?.businessSkillVersion!=='0.1.3'
          ||run.nativeCandidate.sessionId!==input.candidate.sessionId||run.nativeCandidate.confirmationSHA256!==input.candidate.sha256)
          throw new WorkbenchRemoteError('malformed-response','候选运行身份不一致，请核对原请求',{})
      }
      return result
    },
    async v340(action,payload,signal,expectedWorkspaceId){
      if(!Object.hasOwn(v340Commands,action)||action==='run/create'||action.startsWith('candidate/'))throw new WorkbenchRemoteError('V340_OPERATION_DISABLED','新版操作不可用')
      const input=v340Commands[action].parse(payload)
      const workspaceId=input.workspaceId??expectedWorkspaceId
      if(!workspaceId)throw new WorkbenchRemoteError('V340_INVALID_INPUT','缺少当前项目身份')
      const readSchema=action==='result/conversation-draft'?v340ConversationDraftResponseSchema:action==='result/saved-file'?v340SavedFileResponseSchema:null
      const schema=readSchema??(action==='result/prepare-save'?writebackPrepareResponseSchema:workbenchReplaceResponseSchema)
      const result=unwrap(await call(CHANNEL,`workflow/v340/${action}`,input,signal),schema)
      if(result.current&&result.current.workspaceId!==workspaceId||result.manifest&&result.manifest.workspaceId!==workspaceId)throw new WorkbenchRemoteError('malformed-response','新版项目身份不一致',{})
      if(readSchema&&(['workspaceId','taskId','runId','versionId','resultSha256','expectedRevision',...(action==='result/saved-file'?['writebackId']:[])].some(k=>result[k]!==input[k])
        ||result.artifactId!==`sha256:${input.resultSha256}`))throw new WorkbenchRemoteError('malformed-response','新版固定版本身份不一致',{})
      return result
    },
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
