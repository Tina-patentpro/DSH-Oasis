import { OASIS_PRODUCT_ORIGIN } from './oasis-account-contract.js'
import { IMPORT_LIMITS, sanitizeImportDiagnostics } from './website-import-contract.js'
import { validateWorkspaceRelativePath } from './workspace-materials.js'
import { createHash } from 'node:crypto'

export class WebsiteImportError extends Error {
  constructor(code, details) { super(code); this.code = code; this.details = sanitizeImportDiagnostics(details) }
}
export const importFail = (code, details) => { throw new WebsiteImportError(code, details) }
const id = value => Number.isSafeInteger(value) && value > 0 ? value : importFail('IMPORT_INVALID_RESPONSE')
const title = value => typeof value === 'string' && value.trim() ? value.slice(0, 200) : '未命名'
const digest = value => createHash('sha256').update(value).digest('hex')
function safeName(value) {
  try { if (/[\\/]/.test(value)) throw Error(); validateWorkspaceRelativePath(value); return value } catch { return null }
}
function generatedName(value) {
  let stem = title(value).normalize('NFC').replace(/[\x00-\x1f<>:"/\\|?*]/g, '_').replace(/[ .]+$/g, '').slice(0, 170)
  if (!safeName(stem)) stem = `历史_${stem}`
  return `${stem}_OIW.md`
}
function legacyUrl(value) {
  try {
    if (typeof value !== 'string' || value.length > 4096) return null
    const url = new URL(value)
    if (url.origin !== OASIS_PRODUCT_ORIGIN || url.username || url.password || url.hash) return null
    // Never follow arbitrary authenticated API GETs found inside imported content.
    if (!/^\/(?:uploads|storage|files)\//.test(url.pathname)) return null
    return url.href
  } catch { return null }
}
function legacyAttachments(value) {
  if (value == null) return []
  const values = typeof value === 'string' ? [value] : value
  if (!Array.isArray(values) || values.some(v => typeof v !== 'string')) importFail('IMPORT_INVALID_RESPONSE')
  const attachments = new Map()
  for (const entry of values) {
    // The website's legacy file_url can join several URLs; commas inside a URL remain data.
    for (const part of entry.split(/,(?=\s*(?:https?:\/\/|\/))/g)) {
      const raw = part.trim()
      if (!raw) continue
      const url = legacyUrl(raw), fingerprint = digest(url ?? raw)
      attachments.set(fingerprint, { url, fingerprint })
      if (attachments.size > IMPORT_LIMITS.listItems) importFail('IMPORT_TOO_MANY_ITEMS')
    }
  }
  return [...attachments.values()]
}
function unwrap(value) {
  if (!value || typeof value !== 'object' || ('code' in value && ![0, 200].includes(value.code))
    || ('success' in value && value.success !== true)) importFail('IMPORT_INVALID_RESPONSE')
  return Object.hasOwn(value, 'data') ? value.data : value
}
function list(value, resource = false, page = 1) {
  const data = unwrap(value)
  if (!resource && Array.isArray(data)) return { total: data.length, items: data.slice((page - 1) * 20, page * 20) }
  const total = resource ? data?.pagination?.total : data?.total
  if (!Number.isSafeInteger(total) || total < 0 || !Array.isArray(data?.items) || data.items.length > 20 || total < data.items.length) importFail('IMPORT_INVALID_RESPONSE')
  return { total, items: data.items }
}
export function createWebsiteImportClient({ resolveToken, accountId, fetchImpl = globalThis.fetch }) {
  async function validated(endpoint, operation) {
    try { return await operation() }
    catch (error) {
      if (error instanceof WebsiteImportError && error.details.endpoint) throw error
      const code = error instanceof WebsiteImportError ? error.code : 'IMPORT_INVALID_RESPONSE'
      importFail(code, { endpoint, stage: 'validation', kind: code === 'IMPORT_OWNERSHIP' ? 'ownership' : 'contract', httpStatus: 200 })
    }
  }
  async function request(path, endpoint, binary = false, authenticated = true) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000)
    let reader, httpStatus, stage = 'authentication'
    try {
      const auth = authenticated ? { authorization: `Bearer ${await resolveToken()}` } : {}
      stage = 'request'
      const response = await fetchImpl(path.startsWith('https:') ? path : OASIS_PRODUCT_ORIGIN + path, {
        method: 'GET', headers: auth, redirect: 'error', credentials: 'omit', cache: 'no-store', signal: controller.signal,
      })
      stage = 'response'; httpStatus = response.status
      if (response.status === 401 || response.status === 403) importFail('AUTH_REQUIRED', { endpoint, stage, kind: 'http', httpStatus })
      if (response.status !== 200) importFail('IMPORT_REQUEST_FAILED', { endpoint, stage, kind: 'http', httpStatus })
      stage = 'body'
      const max = binary ? IMPORT_LIMITS.fileBytes : 2 * 1024 * 1024
      if (Number(response.headers.get('content-length')) > max) importFail('IMPORT_TOO_LARGE')
      reader = response.body?.getReader()
      if (!reader) importFail('IMPORT_INVALID_RESPONSE')
      const chunks = []; let size = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > max) importFail('IMPORT_TOO_LARGE')
        chunks.push(value)
      }
      stage = 'authentication'
      await resolveToken()
      const bytes = Buffer.concat(chunks)
      stage = 'json'
      return binary ? bytes : JSON.parse(bytes.toString('utf8'))
    } catch (error) {
      if (error instanceof WebsiteImportError) {
        if (error.details.endpoint) throw error
        importFail(error.code, { endpoint, stage, kind: 'contract', httpStatus })
      }
      const kind = controller.signal.aborted || error?.name === 'AbortError' ? 'timeout'
        : stage === 'json' ? 'json' : stage === 'request' || stage === 'body' ? 'network' : 'operation'
      importFail('IMPORT_REQUEST_FAILED', { endpoint, stage, kind, httpStatus })
    } finally { clearTimeout(timer); controller.abort(); await reader?.cancel().catch(() => {}); reader?.releaseLock() }
  }
  async function project(folderId) {
    return validated('project-detail', async () => {
    const data = unwrap(await request(`/api/user/user/folderdetail/${id(folderId)}`, 'project-detail'))
    if (data.id !== folderId || data.owner_id !== accountId) importFail('IMPORT_OWNERSHIP')
    return { id: folderId, name: title(data.name), hasChildren: data.has_children === true }
    })
  }
  async function history(sourceId, folderId) {
    return validated('history-detail', async () => {
    const data = unwrap(await request(`/api/user/user/projectdetail/${id(sourceId)}`, 'history-detail'))
    if (data.id !== sourceId || data.folder_id !== folderId) importFail('IMPORT_OWNERSHIP')
    return data
    })
  }
  return Object.freeze({
    project,
    async listProjects({ parentId = 0, page = 1, keyword = '' }) {
      return validated('project-list', async () => {
      const result = list(await request('/api/user/user/folderlist?' + new URLSearchParams({ parent_id: parentId, page, limit: 20, keyword }), 'project-list'), false, page)
      return { total: result.total, items: result.items.map(v => ({ id: id(v.id), name: title(v.name), hasChildren: v.has_children === true })) }
      })
    },
    async listItems({ folderId, kind, page }) {
      await project(folderId)
      const resource = kind === 'files'
      const endpoint = resource ? 'file-list' : 'history-list'
      return validated(endpoint, async () => {
      const result = list(await request(resource ? '/api/files?' + new URLSearchParams({ projectId: folderId, page, pageSize: 20 })
        : '/api/user/user/projectlist?' + new URLSearchParams({ folder_id: folderId, page, limit: 20 }), endpoint), resource, page)
      const items = []
      for (const v of result.items) {
        if (resource) {
          if (v.projectId !== String(folderId)) importFail('IMPORT_OWNERSHIP')
          if (typeof v.id !== 'string' || !/^[a-zA-Z0-9_-]{1,180}$/.test(v.id) || !Number.isSafeInteger(v.size) || v.size < 0) importFail('IMPORT_INVALID_RESPONSE')
          const fileName = safeName(v.filename), downloadable = !!fileName && v.size <= IMPORT_LIMITS.fileBytes
          items.push({ key: `resource:${v.id}`, sourceId: v.id, name: title(v.filename), fileName: fileName ?? '不可导入文件', kind: 'resource',
            size: v.size, downloadable, reason: downloadable ? null : '文件名不安全或超过 32 MiB' })
        } else {
          if (v.folder_id !== folderId) importFail('IMPORT_OWNERSHIP')
          id(v.id)
          if (typeof v.answer_text === 'string' && v.answer_text.trim()) items.push({ key: `history:${v.id}:text`, sourceId: v.id, name: title(v.name),
            fileName: generatedName(v.name), kind: 'text', size: Buffer.byteLength(v.answer_text), sha256: digest(v.answer_text), downloadable: true, reason: null })
          for (const { url, fingerprint } of legacyAttachments(v.file_url)) {
            let fileName = null
            try { fileName = url ? safeName(decodeURIComponent(new URL(url).pathname.split('/').at(-1))) : null } catch {}
            items.push({ key: `history:${v.id}:file:${fingerprint}`, sourceId: v.id, name: title(v.name), fileName: fileName ?? '历史附件', kind: 'file', size: null,
              downloadable: !!url && !!fileName, reason: url && fileName ? null : '附件地址未获信任或文件名不安全', url })
          }
        }
        if (items.length > IMPORT_LIMITS.listItems) importFail('IMPORT_TOO_MANY_ITEMS')
      }
      return { total: result.total, items }
      })
    },
    async download(row, folderId) {
      if (!row.downloadable) importFail('IMPORT_UNSUPPORTED_FILE')
      await project(folderId)
      if (row.kind === 'resource') {
        await validated('file-metadata', async () => {
        const data = unwrap(await request(`/api/files/${encodeURIComponent(row.sourceId)}/metadata`, 'file-metadata'))
        if (data.id !== row.sourceId || data.projectId !== String(folderId)) importFail('IMPORT_OWNERSHIP')
        if (data.filename !== row.fileName || data.size !== row.size) importFail('IMPORT_ITEM_CHANGED')
        })
        return validated('file-download', async () => {
        const bytes = await request(`/api/files/${encodeURIComponent(row.sourceId)}`, 'file-download', true)
        if (bytes.length !== row.size) importFail('IMPORT_ITEM_CHANGED')
        return bytes
        })
      }
      const data = await history(row.sourceId, folderId)
      if (row.kind === 'text') {
        if (typeof data.answer_text !== 'string' || !data.answer_text.trim() || digest(data.answer_text) !== row.sha256) importFail('IMPORT_ITEM_CHANGED')
        return Buffer.from(data.answer_text, 'utf8')
      }
      if (!legacyAttachments(data.file_url).some(({ url }) => url && url === row.url)) importFail('IMPORT_ITEM_CHANGED')
      return request(row.url, 'history-attachment', true, false)
    },
  })
}
