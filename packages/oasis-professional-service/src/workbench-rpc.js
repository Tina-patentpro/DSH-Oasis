import { z } from 'zod'

import { workbenchDraftSchema } from './workbench-domain.js'

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
  state: workbenchDraftSchema,
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

export function createWorkbenchRpcHandler(repository) {
  return async function handleWorkbenchRpc(endpoint, payload) {
    if (endpoint === 'state/get') {
      const parsed = parsePayload(getPayloadSchema, payload)
      if (!parsed.success) return parsed
      return { ok: true, value: repository.get(parsed.data.workspaceId) }
    }

    if (endpoint === 'state/replace') {
      const parsed = parsePayload(replacePayloadSchema, payload)
      if (!parsed.success) return parsed
      const { workspaceId, expectedRevision, state } = parsed.data
      return { ok: true, value: await repository.replace(workspaceId, expectedRevision, state) }
    }

    return badRequest('Unknown Oasis workbench RPC endpoint', [{
      code: 'custom',
      path: ['endpoint'],
      message: `Unknown endpoint: ${String(endpoint)}`,
    }])
  }
}
