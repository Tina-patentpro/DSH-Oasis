import { OASIS_PRODUCT_ORIGIN } from './oasis-account-contract.js'
import { IMPORT_LIMITS, sanitizeImportDiagnostics } from './website-import-contract.js'
import { extractWebsiteRecordFiles, safeImportName } from './website-record-files.js'
import { createHash } from 'node:crypto'

export class WebsiteImportError extends Error {
  constructor(code, details) { super(code); this.code = code; this.details = sanitizeImportDiagnostics(details) }
}
export const importFail = (code, details) => { throw new WebsiteImportError(code, details) }
const id = value => Number.isSafeInteger(value) && value > 0 ? value : importFail('IMPORT_INVALID_RESPONSE')
const title = value => typeof value === 'string' && value.trim() ? value.slice(0, 200) : '未命名'
const digest = value => createHash('sha256').update(value).digest('hex')
const fingerprint = value => digest(JSON.stringify(value))
function generatedName(value) {
  let stem = title(value).normalize('NFC').replace(/[\x00-\x1f<>:"/\\|?*]/g, '_').replace(/[ .]+$/g, '').slice(0, 170)
  if (!safeImportName(stem)) stem = `历史_${stem}`
  return `${stem}_OIW.md`
}
function unwrap(value) {
  if (!value || typeof value !== 'object' || ('code' in value && ![0, 200].includes(value.code))
    || ('success' in value && value.success !== true)) importFail('IMPORT_INVALID_RESPONSE')
  return Object.hasOwn(value, 'data') ? value.data : value
}
function list(value, page = 1) {
  const data = unwrap(value)
  if (Array.isArray(data)) return { total: data.length, items: data.slice((page - 1) * 20, page * 20) }
  const total = data?.total, items = Object.hasOwn(data ?? {}, 'items') ? data.items : data?.item
  if (!Number.isSafeInteger(total) || total < 0 || !Array.isArray(items) || items.length > 20 || total < items.length) importFail('IMPORT_INVALID_RESPONSE')
  return { total, items }
}
export function createWebsiteImportClient({ resolveToken, accountId, fetchImpl = globalThis.fetch }) {
  async function validated(endpoint, operation) {
    try { return await operation() }
    catch (error) {
      if (error instanceof WebsiteImportError && error.details.endpoint) throw error
      const code = error instanceof WebsiteImportError ? error.code : error?.code === 'IMPORT_TOO_MANY_ITEMS' ? error.code : 'IMPORT_INVALID_RESPONSE'
      importFail(code, { endpoint, stage: 'validation', kind: code === 'IMPORT_OWNERSHIP' ? 'ownership' : 'contract', httpStatus: 200 })
    }
  }
  async function request(path, endpoint, { binary = false, authenticated = true, signal, budget } = {}) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000)
    const abort = () => controller.abort()
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) controller.abort()
    let reader, httpStatus, stage = 'authentication'
    try {
      controller.signal.throwIfAborted()
      const auth = authenticated ? { authorization: 'Bearer ' + await resolveToken() } : {}
      controller.signal.throwIfAborted(); stage = 'request'
      const response = await fetchImpl(path.startsWith('https:') ? path : OASIS_PRODUCT_ORIGIN + path, {
        method: 'GET', headers: auth, redirect: 'error', credentials: 'omit', cache: 'no-store', signal: controller.signal,
      })
      controller.signal.throwIfAborted(); stage = 'response'; httpStatus = response.status
      if (response.status === 401 || response.status === 403) importFail('AUTH_REQUIRED', { endpoint, stage, kind: 'http', httpStatus })
      if (response.status !== 200) importFail('IMPORT_REQUEST_FAILED', { endpoint, stage, kind: 'http', httpStatus })
      stage = 'body'
      const max = binary ? Math.min(IMPORT_LIMITS.fileBytes, budget?.remaining ?? IMPORT_LIMITS.fileBytes) : 2 * 1024 * 1024
      if (Number(response.headers.get('content-length')) > max) importFail('IMPORT_TOO_LARGE')
      const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
      if (binary && /^(?:text\/html|application\/(?:json|problem\+json|xhtml\+xml))$/.test(contentType)) importFail('IMPORT_UNSUPPORTED_FILE')
      reader = response.body?.getReader()
      if (!reader) importFail('IMPORT_INVALID_RESPONSE')
      const chunks = []; let size = 0
      while (true) {
        const { done, value } = await reader.read()
        controller.signal.throwIfAborted()
        if (done) break
        size += value.byteLength
        if (binary && budget) budget.remaining = Math.max(0, budget.remaining - value.byteLength)
        if (size > max) importFail('IMPORT_TOO_LARGE')
        chunks.push(value)
      }
      stage = 'authentication'; await resolveToken(); controller.signal.throwIfAborted()
      const bytes = Buffer.concat(chunks); stage = 'json'
      return binary ? bytes : JSON.parse(bytes.toString('utf8'))
    } catch (error) {
      if (error instanceof WebsiteImportError) {
        if (error.details.endpoint) throw error
        importFail(error.code, { endpoint, stage, kind: 'contract', httpStatus })
      }
      const kind = controller.signal.aborted || error?.name === 'AbortError' ? 'timeout'
        : stage === 'json' ? 'json' : stage === 'request' || stage === 'body' ? 'network' : 'operation'
      importFail('IMPORT_REQUEST_FAILED', { endpoint, stage, kind, httpStatus })
    } finally {
      clearTimeout(timer); signal?.removeEventListener('abort', abort); controller.abort()
      await reader?.cancel().catch(() => {}); reader?.releaseLock()
    }
  }
  async function project(folderId, options) {
    return validated('project-detail', async () => {
      const data = unwrap(await request('/api/user/user/folderdetail/' + id(folderId), 'project-detail', options))
      if (data?.id !== folderId || data.owner_id !== accountId) importFail('IMPORT_OWNERSHIP')
      return { id: folderId, name: title(data.name), hasChildren: data.has_children === true }
    })
  }
  async function history(sourceId, folderId, options) {
    return validated('history-detail', async () => {
      const data = unwrap(await request('/api/user/user/projectdetail/' + id(sourceId), 'history-detail', options))
      if (data?.id !== sourceId || data.folder_id !== folderId || (Object.hasOwn(data, 'user_id') && data.user_id !== accountId)) importFail('IMPORT_OWNERSHIP')
      return data
    })
  }
  function recordRows(data, folderId) {
    const rows = [], base = [accountId, folderId, data.id]
    if (typeof data.answer_text === 'string' && data.answer_text.trim()) {
      const fileName = generatedName(data.name), size = Buffer.byteLength(data.answer_text), sha256 = digest(data.answer_text)
      rows.push({ key: 'record:' + data.id + ':text:' + fingerprint(base), sourceId: data.id, role: 'text', inputField: null, mimeType: 'text/markdown',
        revision: fingerprint([fileName, size, sha256]), name: title(data.name), fileName, kind: 'text', size, sha256,
        downloadable: size <= IMPORT_LIMITS.fileBytes, reason: size <= IMPORT_LIMITS.fileBytes ? null : '正文超过32 MiB' })
    }
    const { files, unsupported } = extractWebsiteRecordFiles(data)
    for (const file of files) {
      const key = 'record:' + data.id + ':file:' + fingerprint([...base, file.role, file.inputField, file.url])
      rows.push({ ...file, key, sourceId: data.id, name: title(data.name), kind: 'file',
        revision: fingerprint([file.url, file.fileName, file.mimeType, file.size]), downloadable: true, reason: null })
    }
    unsupported.forEach((file, index) => rows.push({ ...file, key: 'record:' + data.id + ':unsupported:' + fingerprint([...base, index, file]),
      revision: fingerprint(file), sourceId: data.id, name: title(data.name), fileName: '不支持的材料', kind: 'file', size: null,
      mimeType: null, downloadable: false }))
    if (rows.length > IMPORT_LIMITS.listItems) importFail('IMPORT_TOO_MANY_ITEMS')
    return rows
  }
  return Object.freeze({
    project,
    async listProjects({ parentId = 0, page = 1, keyword = '' }) {
      return validated('project-list', async () => {
        const result = list(await request('/api/user/user/folderlist?' + new URLSearchParams({ parent_id: parentId, page, limit: 20, keyword }), 'project-list'), page)
        return { total: result.total, items: result.items.map(v => ({ id: id(v.id), name: title(v.name), hasChildren: v.has_children === true })) }
      })
    },
    async listItems({ folderId, kind, page = 1 }) {
      if (kind !== 'records') importFail('IMPORT_INVALID_INPUT')
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 60000)
      const options = { signal: controller.signal }
      try {
        await project(folderId, options)
        return await validated('history-list', async () => {
          const result = list(await request('/api/user/user/projectlist?' + new URLSearchParams({ folder_id: folderId, page, limit: 20 }), 'history-list', options), page)
          const ids = new Set()
          for (const v of result.items) {
            id(v.id)
            if (v.folder_id !== folderId || (Object.hasOwn(v, 'user_id') && v.user_id !== accountId)) importFail('IMPORT_OWNERSHIP')
            if (ids.has(v.id)) importFail('IMPORT_INVALID_RESPONSE')
            ids.add(v.id)
          }
          const batches = [], issues = []; let next = 0, fatal
          async function worker() {
            while (!fatal && next < result.items.length) {
              const index = next++, sourceId = result.items[index].id
              try { batches[index] = recordRows(await history(sourceId, folderId, options), folderId) }
              catch (error) {
                if (['AUTH_REQUIRED', 'IMPORT_OWNERSHIP', 'IMPORT_TOO_MANY_ITEMS'].includes(error.code)) {
                  if (!fatal) fatal = error
                  controller.abort(); return
                }
                issues.push({ recordId: sourceId, code: error instanceof WebsiteImportError ? error.code : 'IMPORT_INVALID_RESPONSE', details: sanitizeImportDiagnostics(error.details) })
              }
            }
          }
          await Promise.all([worker(), worker()])
          if (fatal) throw fatal
          const items = batches.flat().filter(Boolean)
          if (items.length > IMPORT_LIMITS.listItems) importFail('IMPORT_TOO_MANY_ITEMS')
          return { total: result.total, recordIds: [...ids], items, issues: issues.sort((a, b) => a.recordId - b.recordId),
            pageState: issues.length || items.some(v => !v.downloadable) ? 'partial' : 'complete' }
        })
      } finally { clearTimeout(timer); controller.abort() }
    },
    async download(row, folderId, { budget = { remaining: IMPORT_LIMITS.totalBytes } } = {}) {
      if (!row.downloadable) importFail('IMPORT_UNSUPPORTED_FILE')
      await project(folderId)
      async function revalidate() {
        const rows = await validated('history-detail', async () => recordRows(await history(row.sourceId, folderId), folderId))
        if (!rows.some(v => v.key === row.key && v.revision === row.revision && v.downloadable)) importFail('IMPORT_ITEM_CHANGED')
      }
      await revalidate()
      let bytes
      if (row.kind === 'text') {
        const data = await history(row.sourceId, folderId)
        bytes = Buffer.from(data.answer_text, 'utf8')
        if (bytes.length > Math.min(IMPORT_LIMITS.fileBytes, budget.remaining)) importFail('IMPORT_TOO_LARGE')
        budget.remaining -= bytes.length
        if (digest(bytes) !== row.sha256) importFail('IMPORT_ITEM_CHANGED')
      } else bytes = await request(row.url, 'history-attachment', { binary: true, authenticated: false, budget })
      if (row.size != null && bytes.length !== row.size) importFail('IMPORT_ITEM_CHANGED')
      await revalidate(); await project(folderId)
      return bytes
    },
  })
}
