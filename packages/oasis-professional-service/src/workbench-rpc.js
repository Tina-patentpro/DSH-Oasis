import { z } from 'zod'

import { workbenchEditableDraftSchema } from './workbench-domain.js'
import {
  WORKBENCH_LIMITS,
  workTypeSchema,
  writebackRecoveryManifestSchema,
} from './workbench-contract.js'
import { WorkspaceMaterialError } from './workspace-materials.js'

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

async function writebackResult(operation) {
  try {
    return { ok: true, value: await operation() }
  } catch (error) {
    if (!(error instanceof WorkspaceMaterialError)) throw error
    let details = error.details
    if (error.code === 'WRITEBACK_COMMITTED_INDEX_FAILED') {
      const parsed = z.object({ manifest: writebackRecoveryManifestSchema }).strict().safeParse(details)
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

export function createWorkbenchRpcHandler(service, professionalService = null) {
  return async function handleWorkbenchRpc(endpoint, payload) {
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

    if (endpoint === 'workflow/catalog') {
      const parsed = parsePayload(workflowCatalogPayloadSchema, payload)
      if (!parsed.success) return parsed
      return { ok: true, value: service.getWorkflowCatalog(parsed.data.workType) }
    }

    if (endpoint === 'professional/bootstrap') {
      const parsed = parsePayload(z.object({}).strict(), payload)
      if (!parsed.success) return parsed
      return materialResult(() => professionalService.getBootstrap())
    }

    if (endpoint === 'professional/detail') {
      const parsed = parsePayload(professionalDetailPayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => professionalService.getServiceDetail(parsed.data.apiEndpoint))
    }

    if (endpoint === 'professional/start') {
      const parsed = parsePayload(professionalStartPayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => professionalService.start(parsed.data))
    }

    if (endpoint === 'professional/continue') {
      const parsed = parsePayload(professionalExecutionPayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => professionalService.continue(parsed.data))
    }

    if (endpoint === 'professional/stop') {
      const parsed = parsePayload(professionalExecutionPayloadSchema, payload)
      if (!parsed.success) return parsed
      return materialResult(() => professionalService.stop(parsed.data))
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
