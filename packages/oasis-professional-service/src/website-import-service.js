import { randomUUID, createHash } from 'node:crypto'
import { lstat, realpath, open as openFile } from 'node:fs/promises'
import { resolve, parse, join, sep } from 'node:path'
import { OASIS_PRODUCT_ORIGIN } from './oasis-account-contract.js'
import { importCommands, importResponses, IMPORT_LIMITS, IMPORT_PROTOCOL_VERSION, parseWebsiteProjectLinks, sanitizeImportDiagnostics } from './website-import-contract.js'
import { createWebsiteImportClient, WebsiteImportError, importFail } from './website-import-client.js'
import { validateWorkspaceRelativePath, WorkspaceMaterialError } from './workspace-materials.js'
import { createWorkspaceOperationGuard } from './workspace-operation-guard.js'

const NS = 'oasis-professional-service'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const pathKey = path => process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path)
const identity = stat => `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`
function fileName(name, number) {
  if (/[\\/]/.test(name)) importFail('IMPORT_UNSAFE_PATH')
  try { validateWorkspaceRelativePath(name) } catch { importFail('IMPORT_UNSAFE_PATH') }
  if (number === 1) return name
  const { name: stem, ext } = parse(name)
  return stem.endsWith('_OIW') ? `${stem.slice(0, -4)}_${number}_OIW${ext}` : `${stem}_${number}${ext}`
}
async function secureRoot(path) {
  if (typeof path !== 'string' || !parse(path).root) importFail('IMPORT_WORKSPACE_CHANGED')
  const canonical = await realpath(path)
  if (pathKey(canonical) !== pathKey(path)) importFail('IMPORT_WORKSPACE_CHANGED')
  let current = parse(resolve(path)).root
  for (const part of resolve(path).slice(current.length).split(sep).filter(Boolean)) {
    current = join(current, part)
    const stat = await lstat(current)
    if (!stat.isDirectory() || stat.isSymbolicLink()) importFail('IMPORT_UNSAFE_PATH')
  }
  return { path: canonical, identity: identity(await lstat(canonical)) }
}
async function sameFile(path, bytes) {
  let handle
  try {
    const before = await lstat(path)
    if (!before.isFile() || before.isSymbolicLink() || before.size !== bytes.length) return false
    handle = await openFile(path, 'r')
    const stat = await handle.stat()
    if (identity(stat) !== identity(before)) return false
    const received = Buffer.alloc(bytes.length + 1)
    let length = 0
    while (length < received.length) {
      const result = await handle.read(received, length, received.length - length, length)
      if (!result.bytesRead) break
      length += result.bytesRead
    }
    const after = await lstat(path)
    return length === bytes.length && identity(after) === identity(before) && after.size === before.size && after.mtimeMs === before.mtimeMs && hash(received.subarray(0, length)) === hash(bytes)
  } catch (error) { if (error.code === 'ENOENT') return false; throw error }
  finally { await handle?.close() }
}
export function createWebsiteImportService({ workspaceRegistry, accountService, settings, createClient = createWebsiteImportClient, now = Date.now, isWorkspaceBusy = () => false, workspaceOperations = createWorkspaceOperationGuard() }) {
  const tickets = new Map()
  let disposed = false
  function descriptor() {
    const d = settings?.describe({ redactSecrets: true }).find(x => x.ns === NS)
    if (!d || !Number.isSafeInteger(d.revision)) importFail('IMPORT_SETTINGS_UNAVAILABLE')
    return { ...d, links: parseWebsiteProjectLinks(d.value.websiteProjectLinks) }
  }
  async function check(t) {
    if (disposed || !t || t.invalidated || now() >= t.expiresAt) importFail('IMPORT_EXPIRED')
    const status = await accountService.status()
    if (!status.authenticated || status.accountId !== t.accountId || status.revision !== t.accountRevision) importFail('IMPORT_ACCOUNT_CHANGED')
    await t.resolveToken()
    const w = workspaceRegistry.get(t.workspaceId)
    if (!w || w.path !== t.workspacePath || await w.status() !== 'ok') importFail('IMPORT_WORKSPACE_CHANGED')
    const root = await secureRoot(w.path)
    if (root.identity !== t.rootIdentity) importFail('IMPORT_WORKSPACE_CHANGED')
    if (disposed || t.invalidated || now() >= t.expiresAt) importFail('IMPORT_EXPIRED')
  }
  function linkCheck(t, folderId) {
    const d = descriptor(), link = d.links.find(x => x.workspaceId === t.workspaceId)
    const previous = d.value.workspaceApiBindings?.find(x => x.workspaceId === t.workspaceId)
    for (const v of [link, previous].filter(Boolean)) {
      if (v.apiBaseOrigin !== OASIS_PRODUCT_ORIGIN || v.accountId !== t.accountId || v.folderId !== folderId || v.workspacePath !== t.workspacePath) importFail('IMPORT_LINK_CONFLICT')
    }
    return d
  }
  function ticket(input, action) {
    const parsed = importCommands[action].safeParse(input)
    if (!parsed.success) importFail('IMPORT_INVALID_INPUT')
    return [parsed.data, tickets.get(parsed.data.token)]
  }
  async function locked(t, operation) {
    try { return await workspaceOperations.run(t.workspaceId, async () => {
      t.mutating = true
      try { return await operation() } finally { t.mutating = false }
    }) }
    catch (error) {
      if (error instanceof WorkspaceMaterialError && error.code === 'WORKSPACE_OPERATION_BUSY') importFail(error.code)
      throw error
    }
  }
  return Object.freeze({
    async open(input) {
      const parsed = importCommands.open.safeParse(input)
      if (!parsed.success) importFail('IMPORT_INVALID_INPUT')
      const { workspaceId } = parsed.data
      if (disposed) importFail('IMPORT_EXPIRED')
      for (const [key, value] of tickets) if (now() >= value.expiresAt && !workspaceOperations.isBusy(value.workspaceId)) tickets.delete(key)
      if (tickets.size >= 32) importFail('IMPORT_BUSY')
      const status = await accountService.status()
      if (!status.authenticated) importFail('AUTH_REQUIRED')
      const resolveToken = await accountService.captureToken()
      const w = workspaceRegistry.get(workspaceId)
      if (!w || await w.status() !== 'ok') importFail('IMPORT_WORKSPACE_CHANGED')
      const root = await secureRoot(w.path), token = randomUUID()
      const t = { token, workspaceId, workspacePath: root.path, rootIdentity: root.identity, accountId: status.accountId,
        accountRevision: status.revision, resolveToken, expiresAt: now() + IMPORT_LIMITS.ttlMs, seen: new Map(), result: null, consumed: false }
      await check(t)
      t.client = createClient({ resolveToken, accountId: t.accountId })
      tickets.set(token, t)
      const d = descriptor()
      t.settingsRevision = d.revision
      const existing = d.links.find(x => x.workspaceId === workspaceId) ?? d.value.workspaceApiBindings?.find(x => x.workspaceId === workspaceId)
      const link = existing ? Object.fromEntries(['workspaceId', 'workspacePath', 'apiBaseOrigin', 'accountId', 'folderId', 'folderName', 'confirmedAt'].map(key => [key, existing[key]])) : null
      return importResponses.open.parse({ protocolVersion: IMPORT_PROTOCOL_VERSION, token, workspaceId, workspacePath: t.workspacePath, accountId: t.accountId,
        accountRevision: t.accountRevision, expiresAt: t.expiresAt, settingsRevision: d.revision,
        link })
    },
    async projects(input) {
      const [args, t] = ticket(input, 'projects'); await check(t)
      const result = await t.client.listProjects(args); await check(t)
      return importResponses.projects.parse(result)
    },
    async items(input) {
      const [args, t] = ticket(input, 'items'); await check(t); linkCheck(t, args.folderId)
      if (t.consumed) importFail('IMPORT_EXPIRED')
      if (t.reading || t.mutating) importFail('IMPORT_BUSY')
      t.reading = true
      try {
      const result = await t.client.listItems(args); await check(t); linkCheck(t, args.folderId)
      if (t.consumed) importFail('IMPORT_EXPIRED')
      const response = importResponses.items.parse({ folderId: args.folderId, total: result.total, pageState: result.pageState, recordIds: result.recordIds,
        issues: result.issues.map(issue => ({ ...issue, details: sanitizeImportDiagnostics(issue.details) })),
        items: result.items.map(({ key, revision, sourceId, role, inputField, name, fileName, kind, size, downloadable, reason }) =>
          ({ key, revision, recordId: sourceId, role, inputField, name, fileName, kind, size, downloadable, reason })) })
      const nextSeen = new Map(t.seen)
      for (const [key, row] of nextSeen) if (key.startsWith(`${args.folderId}:`) && result.recordIds.includes(row.sourceId)) nextSeen.delete(key)
      for (const row of result.items) nextSeen.set(`${args.folderId}:${row.key}`, structuredClone(row))
      if (nextSeen.size > IMPORT_LIMITS.listItems) importFail('IMPORT_TOO_MANY_ITEMS')
      t.seen = nextSeen
      return response
      } catch (error) {
        if (['AUTH_REQUIRED', 'IMPORT_OWNERSHIP'].includes(error.code)) { t.invalidated = true; t.seen.clear() }
        throw error
      } finally { t.reading = false }
    },
    async commit(input) {
      const [args, t] = ticket(input, 'commit'); await check(t)
      if (t.reading) importFail('IMPORT_BUSY')
      const selection = JSON.stringify({ folderId: args.folderId, selected: [...args.keys].sort().map(key => [key, args.versions[key]]) })
      if (t.result && selection === t.selection) return structuredClone(t.result)
      if (t.consumed) importFail('IMPORT_ALREADY_SUBMITTED')
      const rows = args.keys.map(key => t.seen.get(`${args.folderId}:${key}`))
      if (rows.some(v => !v?.downloadable)) importFail('IMPORT_INVALID_SELECTION')
      if (rows.some(row => row.revision !== args.versions[row.key])) importFail('IMPORT_ITEM_CHANGED')
      for (const row of rows) fileName(row.fileName, 1)
      if (rows.reduce((sum, row) => sum + (row.size ?? 0), 0) > IMPORT_LIMITS.totalBytes) importFail('IMPORT_TOO_LARGE')
      return locked(t, async () => {
        if (t.reading) importFail('IMPORT_BUSY')
        await check(t)
        if (isWorkspaceBusy(t.workspaceId)) importFail('IMPORT_WORKSPACE_BUSY')
        const d = linkCheck(t, args.folderId), folder = await t.client.project(args.folderId)
        await check(t)
        if (!settings.writable || typeof settings.update !== 'function') importFail('IMPORT_SETTINGS_UNAVAILABLE')
        // The explicit import confirms this association, not any professional service/schema.
        const link = { workspaceId: t.workspaceId, workspacePath: t.workspacePath, apiBaseOrigin: OASIS_PRODUCT_ORIGIN,
          accountId: t.accountId, folderId: args.folderId, folderName: folder.name, confirmedAt: new Date(now()).toISOString() }
        const links = parseWebsiteProjectLinks([...d.links.filter(v => v.workspaceId !== t.workspaceId), link])
        if (isWorkspaceBusy(t.workspaceId)) importFail('IMPORT_WORKSPACE_BUSY')
        // Freeze before the first potentially persisted mutation: unknown settings outcome is not retryable.
        t.consumed = true; t.selection = selection
        await settings.update(NS, { websiteProjectLinks: links }, d.revision)
        await check(t); linkCheck(t, args.folderId)
        const manifest = `.oasis-import-${randomUUID()}.jsonl`, items = []
        let journal, fatal = false
        const budget = { remaining: IMPORT_LIMITS.totalBytes }
        const provenance = row => ({ recordId: row.sourceId, role: row.role, inputField: row.inputField, selectionRevision: row.revision })
        const record = async data => { await journal.writeFile(JSON.stringify(data) + '\n'); await journal.sync() }
        try {
          journal = await openFile(join(t.workspacePath, manifest), 'wx')
          await record({ kind: 'import', version: 2, ...link, selected: rows.map(v => ({ key: v.key, fileName: v.fileName, ...provenance(v) })),
            warning: 'Current website record references; downloaded hashes do not authenticate historical originals. Not locally reviewed. Intent without saved record requires inspection.' })
          for (const row of rows) {
            let chosen = row.fileName, handle
            try {
              if (fatal) importFail('IMPORT_STOPPED')
              await check(t); linkCheck(t, args.folderId)
              if (budget.remaining <= 0) { fatal = true; importFail('IMPORT_TOO_LARGE') }
              const before = budget.remaining
              const bytes = await t.client.download(row, args.folderId, { budget })
              if (bytes.length > IMPORT_LIMITS.fileBytes || bytes.length > before || budget.remaining > before - bytes.length) { fatal = true; importFail('IMPORT_TOO_LARGE') }
              await check(t); linkCheck(t, args.folderId)
              let saved = false
              for (let number = 1; number <= 1000; number++) {
                chosen = fileName(row.fileName, number)
                const path = join(t.workspacePath, chosen)
                if (await sameFile(path, bytes)) {
                  await record({ kind: 'verified-existing', key: row.key, fileName: chosen, ...provenance(row), size: bytes.length, sha256: hash(bytes) })
                  items.push({ key: row.key, fileName: chosen, status: 'skipped' }); saved = true; break
                }
                await check(t)
                // Durable intent precedes exclusive creation. Partial bytes remain explicitly incomplete after a crash.
                await record({ kind: 'intent', key: row.key, fileName: chosen, ...provenance(row), size: bytes.length, sha256: hash(bytes) })
                try { handle = await openFile(path, 'wx') } catch (error) { if (error.code === 'EEXIST') continue; throw error }
                await handle.writeFile(bytes); await handle.sync(); await handle.close(); handle = null
                await check(t)
                if (!await sameFile(path, bytes)) importFail('IMPORT_FILE_CHANGED')
                items.push({ key: row.key, fileName: chosen, status: 'saved' }); saved = true; break
              }
              if (!saved) importFail('IMPORT_NAME_COLLISION')
            } catch (error) {
              await handle?.close().catch(() => {})
              const code = error instanceof WebsiteImportError ? error.code : 'IMPORT_IO_OR_REQUEST_FAILED'
              if (['IMPORT_ACCOUNT_CHANGED', 'IMPORT_WORKSPACE_CHANGED', 'IMPORT_LINK_CONFLICT', 'IMPORT_EXPIRED', 'AUTH_REQUIRED', 'IMPORT_OWNERSHIP'].includes(code) || budget.remaining <= 0) fatal = true
              items.push({ key: row.key, fileName: chosen, status: 'failed', code })
            }
            await record({ kind: 'result', ...items.at(-1) })
          }
          const result = importResponses.commit.parse({ workspaceId: t.workspaceId, folderId: args.folderId, associationStatus: 'saved', manifest, items,
            status: items.some(v => v.status === 'failed') ? 'partial' : 'completed' })
          await record({ kind: 'finished', status: result.status })
          t.result = result
          return structuredClone(t.result)
        } catch { importFail('IMPORT_INCOMPLETE_CHECK_MANIFEST') }
        finally { await journal?.close() }
      })
    },
    async unlink(input) {
      const [args, t] = ticket(input, 'unlink'); await check(t)
      return locked(t, async () => {
        await check(t)
        if (isWorkspaceBusy(t.workspaceId)) importFail('IMPORT_WORKSPACE_BUSY')
        const d = descriptor()
        if (args.expectedSettingsRevision !== t.settingsRevision || d.revision !== t.settingsRevision) importFail('IMPORT_SETTINGS_CHANGED')
        if (!settings.writable || typeof settings.update !== 'function') importFail('IMPORT_SETTINGS_UNAVAILABLE')
        // One native settings CAS clears only this Workspace's association and service binding.
        await settings.update(NS, {
          websiteProjectLinks: d.links.filter(v => v.workspaceId !== t.workspaceId),
          workspaceApiBindings: (d.value.workspaceApiBindings ?? []).filter(v => v.workspaceId !== t.workspaceId),
        }, d.revision)
        for (const [key, value] of tickets) if (value.workspaceId === t.workspaceId) { value.invalidated = true; tickets.delete(key) }
        return importResponses.unlink.parse({ workspaceId: t.workspaceId, status: 'unlinked' })
      })
    },
    dispose() { disposed = true; tickets.clear() },
  })
}
