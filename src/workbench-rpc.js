import { z } from 'zod'

import { workbenchEditableDraftSchema } from './workbench-domain.js'
import {
  WORKBENCH_LIMITS,
  workTypeSchema,
  writebackRecoveryManifestSchema,
} from './workbench-contract.js'
import { WorkspaceMaterialError } from './workspace-materials.js'
import { workspaceApiBindingCommandSchema } from './oasis-workspace-binding.js'
import { accountCommandSchemas } from './oasis-account-contract.js'
import { OasisAccountError } from './oasis-account.js'
import { importCommands, sanitizeImportDiagnostics } from './website-import-contract.js'
import { WebsiteImportError } from './website-import-client.js'
import { v340PrepareCommandSchema } from './v340-preparation.js'
import { v340Commands } from './v340-runtime-contract.js'

export const OASIS_WORKBENCH_RPC_CHANNEL = '/oasis-workbench'

const workspaceIdSchema = z.string()
  .min(1)
  .max(256)
  .refine((value) => value.trim() === value, 'workspaceId must not have surrounding whitespace')

const getPayloadSchema = z.object({
  workspaceId: workspaceIdSchema,
}).strict()

const replacePayloadSchema = z.object({
  workspaceId: workspaceIdSchema,
  expectedRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  state: workbenchEditableDraftSchema,
}).strict()

const workflowCatalogPayloadSchema = z.object({
  workType: workTypeSchema.optional(),
}).strict()

const materialCommandBase = {
  workspaceId: workspaceIdSchema,
  taskId: workspaceIdSchema,
  expectedRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
}

const materialAddPayloadSchema = z.object({
  ...materialCommandBase,
  relativePath: z.string().min(1).max(1024),
  confirmed: z.literal(true),
}).strict()

const materialReferencePayloadSchema = z.object({
  ...materialCommandBase,
  referenceId: workspaceIdSchema,
}).strict()

const taskCreatePayloadSchema = z.object({
  ...materialCommandBase,
  requestKey: workspaceIdSchema,
}).strict()

const unifiedRunPayloadSchema = z.object({ ...materialCommandBase, runId: workspaceIdSchema }).strict()
const artifactSelectionPayloadSchema = unifiedRunPayloadSchema.extend({ artifactId: z.string().regex(/^sha256:[a-f0-9]{64}$/) }).strict()
const savedFilePayloadSchema = artifactSelectionPayloadSchema.extend({ writebackId: workspaceIdSchema }).strict()
const editResultPayloadSchema = artifactSelectionPayloadSchema.extend({ requestKey: workspaceIdSchema, body: z.string().min(1).max(100000) }).strict()

const professionalDetailPayloadSchema = z.object({
  apiEndpoint: workspaceIdSchema,
}).strict()

const professionalStartPayloadSchema = z.object({
  ...materialCommandBase,
  requestKey: workspaceIdSchema,
  priceConfirmed: z.literal(true),
  externalTransferConfirmed: z.literal(true),
}).strict()

const professionalExecutionPayloadSchema = z.object({
  workspaceId: workspaceIdSchema,
  taskId: workspaceIdSchema,
  executionId: workspaceIdSchema,
}).strict()

const professionalRunningWaterPayloadSchema = z.object({
  workspaceId: workspaceIdSchema,
  taskId: workspaceIdSchema,
  runId: workspaceIdSchema,
}).strict()

const taskReviewPayloadSchema = z.object({
  ...materialCommandBase,
  runId: workspaceIdSchema,
  status: z.enum(['changes-requested', 'approved']),
  note: z.string().max(WORKBENCH_LIMITS.maxReviewNoteChars),
}).strict().superRefine((value, ctx) => {
  if (value.status === 'changes-requested' && value.note.trim().length === 0) {
    ctx.addIssue({ code: 'custom', path: ['note'], message: 'changes-requested review requires a note' })
  }
})

const writebackPreparePayloadSchema = z.object({
  workspaceId: workspaceIdSchema,
  taskId: workspaceIdSchema,
  runId: workspaceIdSchema,
  artifactId: workspaceIdSchema,
  expectedRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  relativeDirectory: z.string().min(1).max(1024),
}).strict()

const writebackCommitPayloadSchema = z.object({
  confirmationToken: z.string().min(1).max(512),
}).strict()

function badRequest(message, issues) {
  return {
    ok: false,
    error: {
      code: 'bad-request',
      message,
      details: { issues },
    },
  }
}

function parsePayload(schema, payload) {
  const result = schema.safeParse(payload)
  return result.success
    ? result
    : badRequest('Invalid Oasis workbench RPC payload', result.error.issues)
}

async function materialResult(operation) {
  try {
    return { ok: true, value: await operation() }
  } catch (error) {
    if (!(error instanceof WorkspaceMaterialError)) throw error
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    }
  }
}

async function apiResult(operation) {
  try { return await materialResult(operation) } catch {
    // Credential providers and remote adapters may throw arbitrary messages. Never echo them to the renderer.
    return { ok: false, error: { code: 'API_OPERATION_UNCONFIRMED',
      message: 'API operation could not be confirmed. Inspect the original execution; do not retry creation automatically.', details: {} } }
  }
}

async function writebackResult(operation) {
  try {
    return { ok: true, value: await operation() }
  } catch (error) {
    if (!(error instanceof WorkspaceMaterialError)) throw error
    let details = error.details
    if (['WRITEBACK_COMMITTED_INDEX_FAILED', 'WRITEBACK_PARTIAL_PUBLISH'].includes(error.code)) {
      const parsed = z.object({ manifest: writebackRecoveryManifestSchema }).strict().safeParse({ manifest: details.manifest })
      if (!parsed.success) throw new Error('Unsafe writeback recovery manifest was rejected')
      details = parsed.data
    }
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        details,
      },
    }
  }
}

export function createWorkbenchRpcHandler(service, professionalService = null, accountService = null, importService = null, {m06Candidate013=false,nativeZeroGeneration=false,nativeBusinessRecovery=null}={}) {
  if(nativeBusinessRecovery){
    if(!m06Candidate013||nativeZeroGeneration)throw new TypeError('Native recovery requires an exclusive controlled composition')
    return nativeBusinessRecovery.wrap(createWorkbenchRpcHandler(service,professionalService,accountService,importService,{m06Candidate013:true}))
  }
  if(nativeZeroGeneration&&!m06Candidate013)throw new TypeError('Native zero-generation requires the controlled M06 entry')
  const readonlyEndpoints=new Set(['state/get','workflow/catalog','workflow/v340/catalog','workflow/v340/prepare'])
  return async function handleWorkbenchRpc(endpoint, payload) {
    if(nativeZeroGeneration&&!readonlyEndpoints.has(endpoint))return {ok:false,error:{code:'NATIVE_ZERO_GENERATION',message:'本次仅检查界面与输入，不允许生成、联网或修改业务记录。',details:{}}}
    if (endpoint.startsWith('import/')) {
      const action = endpoint.slice('import/'.length)
      const schema = Object.hasOwn(importCommands, action) ? importCommands[action] : null
      if (!schema?.safeParse(payload).success) return { ok: false, error: { code: 'IMPORT_INVALID_INPUT', message: '导入选择无效', details: {} } }
      try {
        if (!importService) throw new WebsiteImportError('IMPORT_UNAVAILABLE')
        return { ok: true, value: await importService[action](payload) }
      } catch (error) {
        const code = error instanceof WebsiteImportError ? error.code : 'IMPORT_OPERATION_FAILED'
        return { ok: false, error: { code, message: '导入未完成；已保存的文件不会删除，请查看导入清单。', details: error instanceof WebsiteImportError ? sanitizeImportDiagnostics(error.details) : {} } }
      }
    }
    if (endpoint.startsWith('account/')) {
      const action = endpoint.slice('account/'.length)
      const schema = accountCommandSchemas[action]
      // Never include validation issues or input values for authentication payloads.
      if (!schema || !schema.safeParse(payload).success) return { ok: false, error: { code: 'ACCOUNT_INVALID_INPUT', message: '登录输入无效', details: {} } }
      try {
        const method = action === 'sms' ? 'sendSms' : action
        if (!accountService) throw new OasisAccountError('ACCOUNT_UNAVAILABLE')
        return { ok: true, value: await accountService[method](payload) }
      } catch (error) {
        const code = error instanceof OasisAccountError ? error.code : 'ACCOUNT_REQUEST_FAILED'
        return { ok: false, error: { code, message: '账户操作未完成，请检查登录状态；不会自动重试。', details: {} } }
      }
    }
    if (endpoint === 'state/get') {
      const parsed = parsePayload(getPayloadSchema, payload)
      if (!parsed.success) return parsed
      return { ok: true, value: service.getState(parsed.data.workspaceId) }
    }

    if (endpoint === 'state/replace') {
      const parsed = parsePayload(replacePayloadSchema, payload)
      if (!parsed.success) return parsed
      const { workspaceId, expectedRevision, state } = parsed.data
      return { ok: true, value: await service.replaceState(workspaceId, expectedRevision, state) }
    }

    if (endpoint === 'workflow/v340/catalog') {
      const parsed = parsePayload(z.object({}).strict(), payload)
      if (!parsed.success) return parsed
      const catalog=service.getV340Catalog()
      return { ok: true, value: nativeZeroGeneration?{...catalog,nativeZeroGeneration:true}:catalog }
    }
    if(m06Candidate013===true&&['workflow/v340/candidate/prepare','workflow/v340/candidate/run'].includes(endpoint)){
      const action=endpoint.slice('workflow/v340/'.length),parsed=v340Commands[action].safeParse(payload)
      if(!parsed.success)return {ok:false,error:{code:'bad-request',message:'受控候选确认输入无效。',details:{}}}
      try{return await materialResult(()=>action==='candidate/prepare'
        ?service.prepareV340CandidateConfirmation(parsed.data):service.createV340Run(parsed.data))}
      catch{return {ok:false,error:{code:'V340_OPERATION_FAILED',message:'候选状态未确认，请重新核对原任务；不会自动派发。',details:{}}}}
    }
    const v340Methods={'task/create':'createV340Task','task/draft':'updateV340Draft','run/observe':'observeV340Run','run/stop':'stopV340Run','result/draft':'saveV340ResultDraft',
      'result/edit':'editV340Result','result/review':'reviewV340Result','result/prepare-save':'prepareV340Save','result/commit-save':'commitV340Save',
      'result/conversation-draft':'prepareV340ConversationDraft','result/saved-file':'resolveV340SavedFile'}
    if(endpoint.startsWith('workflow/v340/')&&Object.hasOwn(v340Methods,endpoint.slice('workflow/v340/'.length))){
      const action=endpoint.slice('workflow/v340/'.length),parsed=v340Commands[action].safeParse(payload)
      if(!parsed.success)return {ok:false,error:{code:'bad-request',message:'新版任务输入无效',details:{}}}
      try{return await (action==='result/commit-save'?writebackResult:materialResult)(()=>service[v340Methods[action]](parsed.data))}
      catch{return {ok:false,error:{code:'V340_OPERATION_FAILED',message:'新版任务状态未确认，请刷新原任务；不会自动派发。',details:{}}}}
    }
    if (endpoint === 'workflow/v340/prepare') {
      // Avoid echoing input text, file paths or configuration in validation errors.
      const parsed = v340PrepareCommandSchema.safeParse(payload)
      if (!parsed.success) return { ok: false, error: { code: 'bad-request', message: 'V3.4.0输入无效', details: {} } }
      return materialResult(() => service.prepareV340(parsed.data))
    }
    if (endpoint === 'workflow/catalog') {
      const parsed = parsePayload(workflowCatalogPayloadSchema, payload)
      if (!parsed.success) return parsed
      return { ok: true, value: { ...service.getWorkflowCatalog(parsed.data.workType),
        ...(m06Candidate013===true ? {apiExecutionAvailable:false} : professionalService?.previewClaims ? { apiExecutionAvailable: true } : {}) } }
    }

    if (endpoint === 'professional/bootstrap') {
      const parsed = parsePayload(z.object({}).strict(), payload)
      if (!parsed.success) return parsed
      return materialResult(() => professionalService.getBootstrap())
    }

    if (endpoint === 'professional/binding/get') {
      const parsed = parsePayload(getPayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => professionalService.getWorkspaceBinding(parsed.data))
    }

    if (endpoint === 'professional/binding/confirm') {
      const parsed = parsePayload(workspaceApiBindingCommandSchema, payload)
      if (!parsed.success) return parsed
      return apiResult(() => professionalService.bindWorkspace(parsed.data))
    }

    if (endpoint === 'professional/binding/options') {
      const parsed = parsePayload(getPayloadSchema.extend({ remoteReadConfirmed: z.literal(true) }).strict(), payload)
      if (!parsed.success) return parsed
      return apiResult(() => professionalService.getBindingOptions(parsed.data))
    }

    if (endpoint === 'professional/detail') {
      const parsed = parsePayload(professionalDetailPayloadSchema, payload)
      if (!parsed.success) return parsed
      return apiResult(() => professionalService.getServiceDetail(parsed.data.apiEndpoint))
    }

    if (endpoint === 'professional/start') {
      const parsed = parsePayload(professionalStartPayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => professionalService.start(parsed.data))
    }

    if (endpoint === 'professional/continue') {
      const parsed = parsePayload(professionalExecutionPayloadSchema, payload)
      if (!parsed.success) return parsed
      return apiResult(() => professionalService.continue(parsed.data))
    }

    if (endpoint === 'professional/stop') {
      const parsed = parsePayload(professionalExecutionPayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => professionalService.stop(parsed.data))
    }

    if (endpoint === 'professional/running-water') {
      const parsed = parsePayload(professionalRunningWaterPayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => professionalService.observeRunningWater(parsed.data))
    }

    if (endpoint === 'material/add') {
      const parsed = parsePayload(materialAddPayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => service.addMaterial(parsed.data))
    }

    if (endpoint === 'material/refresh') {
      const parsed = parsePayload(materialReferencePayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => service.refreshMaterial(parsed.data))
    }

    if (endpoint === 'material/remove') {
      const parsed = parsePayload(materialReferencePayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => service.removeMaterial(parsed.data))
    }

    if (endpoint === 'task/create') {
      const parsed = parsePayload(taskCreatePayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => service.createRun(parsed.data))
    }

    if (endpoint === 'task/create-unified') {
      const parsed = parsePayload(taskCreatePayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => service.createUnifiedRun(parsed.data))
    }
    if (endpoint === 'task/select-upstream') {
      const parsed = parsePayload(z.object({ ...materialCommandBase, relativePath: z.string().min(1).max(1024).nullable(), confirmed: z.literal(true) }).strict(), payload)
      if (!parsed.success) return parsed
      return materialResult(() => service.selectClaimsUpstream(parsed.data))
    }
    if (endpoint === 'task/prepare-local') {
      const parsed = parsePayload(z.object({ ...materialCommandBase, sessionId: workspaceIdSchema }).strict(), payload)
      if (!parsed.success) return parsed
      return materialResult(() => service.prepareLocalRun(parsed.data))
    }
    if (endpoint === 'task/prepare-api') {
      const parsed = parsePayload(z.object({ ...materialCommandBase,
        expectedSettingsRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
        remoteReadConfirmed: z.literal(true).optional(),
      }).strict(), payload)
      if (!parsed.success) return parsed
      return apiResult(() => parsed.data.remoteReadConfirmed === true
        ? professionalService.prepareLinkedClaimsMapping(parsed.data) : professionalService.prepareClaimsMapping(parsed.data))
    }
    if (endpoint === 'task/check-api') {
      const parsed = parsePayload(z.object({ ...materialCommandBase,
        expectedSettingsRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
        preparationSha256: z.string().regex(/^[a-f0-9]{64}$/), remoteReadConfirmed: z.literal(true),
      }).strict(), payload)
      if (!parsed.success) return parsed
      return materialResult(() => professionalService.checkClaimsMapping(parsed.data))
    }
    if (endpoint === 'task/create-local') {
      const parsed = parsePayload(taskCreatePayloadSchema.extend({ sessionId: workspaceIdSchema,
        confirmation: z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/), confirmed: z.literal(true) }).strict().optional(),
      }).strict(), payload)
      if (!parsed.success) return parsed
      return materialResult(() => service.createLocalRun(parsed.data))
    }
    if (endpoint === 'task/preview-api') {
      const parsed = parsePayload(z.object({ ...materialCommandBase,
        expectedSettingsRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
        preparationSha256: z.string().regex(/^[a-f0-9]{64}$/), remoteReadConfirmed: z.literal(true),
      }).strict(), payload)
      if (!parsed.success) return parsed
      return apiResult(() => professionalService.previewClaims(parsed.data))
    }
    if (endpoint === 'task/start-api') {
      const parsed = parsePayload(professionalStartPayloadSchema.extend({ confirmationToken: z.string().uuid(),
        expectedSettingsRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      }).strict(), payload)
      if (!parsed.success) return parsed
      return apiResult(() => professionalService.startClaims(parsed.data))
    }
    if (endpoint === 'task/observe-local') {
      const parsed = parsePayload(unifiedRunPayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => service.observeLocalRun(parsed.data))
    }
    if (endpoint === 'task/stop-unified') {
      const parsed = parsePayload(unifiedRunPayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => service.stopUnifiedRun(parsed.data))
    }
    if (endpoint === 'task/edit-result') {
      const parsed = parsePayload(editResultPayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => service.editUnifiedResult(parsed.data))
    }
    if (endpoint === 'artifact/conversation-draft') {
      const parsed = parsePayload(artifactSelectionPayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => service.prepareConversationDraft(parsed.data))
    }
    if (endpoint === 'artifact/saved-file') {
      const parsed = parsePayload(savedFilePayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => service.resolveSavedFile(parsed.data))
    }

    if (endpoint === 'task/review') {
      const parsed = parsePayload(taskReviewPayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => service.reviewRun(parsed.data))
    }

    if (endpoint === 'artifact/prepare-writeback') {
      const parsed = parsePayload(writebackPreparePayloadSchema, payload)
      if (!parsed.success) return parsed
      return writebackResult(() => service.prepareWriteback(parsed.data))
    }

    if (endpoint === 'artifact/commit-writeback') {
      const parsed = parsePayload(writebackCommitPayloadSchema, payload)
      if (!parsed.success) return parsed
      return writebackResult(() => service.commitWriteback(parsed.data))
    }

    return badRequest('Unknown Oasis workbench RPC endpoint', [{
      code: 'custom',
      path: ['endpoint'],
      message: `Unknown endpoint: ${String(endpoint)}`,
    }])
  }
}
