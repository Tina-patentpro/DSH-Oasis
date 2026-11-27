import { z } from 'zod'
import { claimsV2DraftValuesSchema } from './generation-contract.js'
import { workspaceApiBindingSchema } from './oasis-workspace-binding.js'

const sha = z.string().regex(/^[a-f0-9]{64}$/)
const id = z.string().min(1).max(256)
const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
export const workspaceBindingReadSchema = z.object({ workspaceId: id, workspacePath: z.string().min(1).max(4096),
  settingsRevision: revision, binding: workspaceApiBindingSchema.nullable(), status: z.enum(['unbound', 'unverified']) }).strict()
export const workspaceBindingSavedSchema = z.object({ binding: workspaceApiBindingSchema, status: z.literal('unverified') }).strict()
export const claimsApiSnapshotSchema = z.object({
  workspaceId: id, workspacePath: z.string().min(1).max(4096), taskId: id,
  expectedRevision: revision, expectedSettingsRevision: revision,
  workflowId: z.literal('patent-claims'), workflowVersion: z.literal('2'), source: z.literal('oasis-api'),
  binding: workspaceApiBindingSchema, inputSchemaVersion: z.literal('claims-disclosure-2'), values: claimsV2DraftValuesSchema,
  mapping: z.object({ version: z.literal('claims-document-2'), document: z.object({
    fieldId: z.literal('Technical_Disclosure_file'), fileName: z.literal('technical-disclosure.txt'),
    mediaType: z.literal('text/plain;charset=utf-8'), byteLength: z.number().int().positive().max(80000), sha256: sha,
  }).strict(), textInputs: z.object({ drawings_explain_TD: z.string().max(12000).optional(), User_input: z.string().max(12100).optional() }).strict() }).strict(),
  allowedUploadOrigins: z.array(z.string().min(1).max(2048)).max(256),
}).strict()

export const claimsApiPreparationSchema = z.object({ status: z.literal('unverified'), canSubmit: z.literal(false),
  blockers: z.array(z.string().max(256)).max(16), snapshot: claimsApiSnapshotSchema, preparationSha256: sha }).strict()

export const claimsApiPreviewSchema = z.object({
  workspaceId: id, taskId: id, expectedRevision: revision, expectedSettingsRevision: revision,
  confirmationToken: z.string().uuid(), expiresAt: z.string().datetime(), preparationSha256: sha,
  apiBaseOrigin: z.string().min(1).max(2048), environmentKind: z.enum(['non-production', 'production']),
  accountId: revision, folderId: revision, folderName: z.string().min(1).max(200), apiEndpoint: id,
  price: z.number().nonnegative().finite(), balance: z.number().nonnegative().finite(),
  documentBytes: z.number().int().positive().max(80000), characterCount: z.number().int().nonnegative().max(44000),
  mappingVersion: z.literal('claims-document-2'),
}).strict()
