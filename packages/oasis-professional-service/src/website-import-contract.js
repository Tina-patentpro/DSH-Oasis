import { z } from 'zod'

export const IMPORT_LIMITS = Object.freeze({ fileBytes: 32 * 1024 * 1024, totalBytes: 100 * 1024 * 1024, items: 100, listItems: 2000, ttlMs: 15 * 60 * 1000 })
export const IMPORT_PROTOCOL_VERSION = 2
export function sanitizeImportDiagnostics(value) {
  const result = {}
  if (!value || typeof value !== 'object') return result
  if (['project-list', 'project-detail', 'history-list', 'history-detail', 'file-list', 'file-metadata', 'file-download', 'history-attachment'].includes(value.endpoint)) result.endpoint = value.endpoint
  if (['authentication', 'request', 'response', 'body', 'json', 'validation'].includes(value.stage)) result.stage = value.stage
  if (['http', 'network', 'timeout', 'json', 'contract', 'ownership', 'operation'].includes(value.kind)) result.kind = value.kind
  if (Number.isInteger(value.httpStatus) && value.httpStatus >= 100 && value.httpStatus <= 599) result.httpStatus = value.httpStatus
  return result
}
const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const token = z.string().uuid()
const page = z.number().int().min(1).max(10000)
const key = z.string().min(1).max(256)
const revision = z.string().regex(/^[a-f0-9]{64}$/)
export const importCommands = {
  open: z.object({ workspaceId: key, confirmed: z.literal(true) }).strict(),
  projects: z.object({ token, parentId: z.number().int().nonnegative().default(0), page: page.default(1), keyword: z.string().max(200).default('') }).strict(),
  items: z.object({ token, folderId: id, kind: z.literal('records'), page: page.default(1) }).strict(),
  commit: z.object({ token, folderId: id, keys: z.array(key).max(IMPORT_LIMITS.items).refine(v => new Set(v).size === v.length),
    versions: z.record(key, revision), confirmed: z.literal(true) }).strict()
    .refine(v => Object.keys(v.versions).length === v.keys.length && v.keys.every(k => Object.hasOwn(v.versions, k))),
  unlink: z.object({ token, expectedSettingsRevision: z.number().int().nonnegative(), confirmed: z.literal(true) }).strict(),
}
export const websiteProjectLinkSchema = z.object({ workspaceId: key, workspacePath: z.string().min(1).max(4096),
  apiBaseOrigin: z.string().url(), accountId: id, folderId: id, folderName: z.string().min(1).max(200), confirmedAt: z.string().datetime() }).strict()
export function parseWebsiteProjectLinks(value = []) {
  const links = z.array(websiteProjectLinkSchema).max(256).parse(value)
  if (new Set(links.map(v => v.workspaceId)).size !== links.length) throw new Error('Duplicate website project link')
  return links
}
const project = z.object({ id, name: z.string().max(200), hasChildren: z.boolean() }).strict()
const item = z.object({ key, revision, recordId: id, role: z.enum(['text', 'input', 'output']), inputField: z.string().max(2000).nullable(),
  name: z.string().max(200), fileName: z.string().max(255), kind: z.enum(['text', 'file']),
  size: z.number().int().nonnegative().nullable(), downloadable: z.boolean(), reason: z.string().max(300).nullable() }).strict()
const diagnostics = z.object({ endpoint: z.enum(['project-list', 'project-detail', 'history-list', 'history-detail', 'file-list', 'file-metadata', 'file-download', 'history-attachment']).optional(),
  stage: z.enum(['authentication', 'request', 'response', 'body', 'json', 'validation']).optional(),
  kind: z.enum(['http', 'network', 'timeout', 'json', 'contract', 'ownership', 'operation']).optional(), httpStatus: z.number().int().min(100).max(599).optional() }).strict()
export const importResponses = {
  open: z.object({ protocolVersion: z.literal(IMPORT_PROTOCOL_VERSION), token, workspaceId: key, workspacePath: z.string(), accountId: id, accountRevision: key,
    link: websiteProjectLinkSchema.nullable(), settingsRevision: z.number().int().nonnegative(), expiresAt: z.number() }).strict(),
  unlink: z.object({ workspaceId: key, status: z.literal('unlinked') }).strict(),
  projects: z.object({ total: z.number().int().nonnegative(), items: z.array(project).max(20) }).strict(),
  items: z.object({ folderId: id, total: z.number().int().nonnegative(), pageState: z.enum(['complete', 'partial']),
    recordIds: z.array(id).max(20).refine(v => new Set(v).size === v.length),
    issues: z.array(z.object({ recordId: id, code: z.string().max(100), details: diagnostics }).strict()).max(20),
    items: z.array(item).max(IMPORT_LIMITS.listItems) }).strict()
    .refine(v => v.items.every(row => v.recordIds.includes(row.recordId)) && v.issues.every(issue => v.recordIds.includes(issue.recordId))),
  commit: z.object({ workspaceId: key, folderId: id, associationStatus: z.literal('saved'), status: z.enum(['completed', 'partial']), manifest: z.string().max(255),
    items: z.array(z.object({ key, fileName: z.string().max(255), status: z.enum(['saved', 'skipped', 'failed']), code: z.string().max(100).optional() }).strict()).max(100) }).strict(),
}
