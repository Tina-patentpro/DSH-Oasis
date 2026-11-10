import { z } from 'zod'
import { normalizeOasisOrigin } from './oasis-origin-policy.js'

const id = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const label = z.string().min(1).max(256).refine(value => value.trim() === value)
export const workspaceApiBindingFields = {
  workspaceId: label,
  workspacePath: z.string().min(1).max(4096),
  environmentKind: z.enum(['non-production', 'production']),
  apiBaseOrigin: z.string().min(1).max(2048),
  accountId: id,
  folderId: id,
  apiId: id,
  catalogEntryId: id.optional(),
  apiEndpoint: label,
  apiProcess: z.string().max(4000),
  schemaHash: z.string().regex(/^[a-f0-9]{64}$/),
}
export const workspaceApiBindingCommandSchema = z.object({
  ...workspaceApiBindingFields,
  expectedSettingsRevision: id,
  confirmed: z.literal(true),
}).strict()
export const workspaceApiBindingSchema = z.object({
  ...workspaceApiBindingFields,
  folderName: z.string().min(1).max(200),
  confirmedAt: z.string().datetime(),
}).strict().superRefine((value, ctx) => {
  try {
    if (normalizeOasisOrigin(value.apiBaseOrigin, 'binding origin', value.environmentKind) !== value.apiBaseOrigin) throw new Error()
  } catch { ctx.addIssue({ code: 'custom', path: ['apiBaseOrigin'], message: 'Invalid canonical binding origin' }) }
})

export function parseWorkspaceApiBindings(value = []) {
  const bindings = z.array(workspaceApiBindingSchema).max(256).parse(value)
  if (new Set(bindings.map(binding => binding.workspaceId)).size !== bindings.length) {
    throw new TypeError('Duplicate Workspace API binding')
  }
  return bindings
}
