import { z } from 'zod'

export const IMPORT_LIMITS = Object.freeze({ fileBytes: 32 * 1024 * 1024, totalBytes: 100 * 1024 * 1024, items: 100, listItems: 2000, ttlMs: 15 * 60 * 1000 })
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
export const importCommands = {
  open: z.object({ workspaceId: key, confirmed: z.literal(true) }).strict(),
  projects: z.object({ token, parentId: z.number().int().nonnegative().default(0), page: page.default(1), keyword: z.string().max(200).default('') }).strict(),
  items: z.object({ token, folderId: id, kind: z.enum(['history', 'files']), page: page.default(1) }).strict(),
  commit: z.object({ token, folderId: id, keys: z.array(key).max(IMPORT_LIMITS.items).refine(v => new Set(v).size === v.length), confirmed: z.literal(true) }).strict(),
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
const item = z.object({ key, name: z.string().max(200), fileName: z.string().max(255), kind: z.enum(['text', 'file', 'resource']),
  size: z.number().int().nonnegative().nullable(), downloadable: z.boolean(), reason: z.string().max(300).nullable() }).strict()
export const importResponses = {
  open: z.object({ token, workspaceId: key, workspacePath: z.string(), accountId: id, accountRevision: key,
    link: websiteProjectLinkSchema.nullable(), settingsRevision: z.number().int().nonnegative(), expiresAt: z.number() }).strict(),
  unlink: z.object({ workspaceId: key, status: z.literal('unlinked') }).strict(),
  projects: z.object({ total: z.number().int().nonnegative(), items: z.array(project).max(20) }).strict(),
  items: z.object({ folderId: id, total: z.number().int().nonnegative(), items: z.array(item).max(IMPORT_LIMITS.listItems) }).strict(),
  commit: z.object({ workspaceId: key, folderId: id, status: z.enum(['completed', 'partial']), manifest: z.string().max(255),
    items: z.array(z.object({ key, fileName: z.string().max(255), status: z.enum(['saved', 'skipped', 'failed']), code: z.string().max(100).optional() }).strict()).max(100) }).strict(),
}
