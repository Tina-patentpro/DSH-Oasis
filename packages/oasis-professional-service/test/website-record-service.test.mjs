import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createWebsiteImportService } from '../src/website-import-service.js'
import { IMPORT_LIMITS } from '../src/website-import-contract.js'
import { WebsiteImportError, createWebsiteImportClient } from '../src/website-import-client.js'

test('service issues no signed-tool download ticket and leaks no URL or signature in disabled metadata', async t => {
  const h = await fixture(t), attachmentCalls = []
  const realClient = createWebsiteImportClient({ accountId: 7, resolveToken: async () => 'synthetic-token', fetchImpl: async url => {
    const path = new URL(url).pathname
    if (path === '/api/user/user/folderdetail/2') return Response.json({ data: { id: 2, owner_id: 7, name: 'project' } })
    if (path === '/api/user/user/projectlist') return Response.json({ data: { total: 1, item: [{ id: 9, folder_id: 2 }] } })
    if (path === '/api/user/user/projectdetail/9') return Response.json({ data: { id: 9, folder_id: 2, user_id: 7,
      file_url: '/uploads/workflow/claims.docx', outputs: { claims_docx: [{ type: 'document', transfer_method: 'tool_file',
        url: '/files/tools/claims.docx?timestamp=1&nonce=synthetic&sign=fixture', filename: 'claims.docx', size: 4 }] } } })
    attachmentCalls.push(path); throw new Error('Unexpected attachment GET')
  } })
  Object.assign(h.client, realClient)
  const page = await h.list(), disabled = page.items.find(v => !v.downloadable)
  assert.ok(disabled)
  assert.doesNotMatch(JSON.stringify(page), /https:|timestamp|nonce|sign|synthetic|fixture/)
  await assert.rejects(h.service.commit({ token: h.session.token, folderId: 2, confirmed: true,
    keys: [disabled.key], versions: { [disabled.key]: disabled.revision } }), { code: 'IMPORT_INVALID_SELECTION' })
  assert.deepEqual(attachmentCalls, [])
  assert.deepEqual(await readdir(h.root), []); assert.deepEqual(h.settings().websiteProjectLinks, [])
})

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'oasis-records-')); t.after(() => rm(root, { recursive: true, force: true }))
  let settingsValue = { websiteProjectLinks: [] }, revision = 0, calls = 0
  const row = { key: 'record:9:file:opaque', revision: 'a'.repeat(64), name: 'record', sourceId: 9, role: 'input', inputField: 'material',
    mimeType: 'text/plain', fileName: 'input.txt', kind: 'file', size: null, downloadable: true, reason: null, url: 'https://lzhxpy.oasisintwrite.com/uploads/input.txt' }
  const client = { project: async id => ({ id, name: 'project' }), listItems: async () => ({ total: 1, pageState: 'complete', recordIds: [9], issues: [], items: [row] }),
    download: async (value, folder, { budget }) => { calls++; budget.remaining -= 3; return Buffer.from('abc') } }
  const settings = { writable: true, describe: () => [{ ns: 'oasis-professional-service', revision, value: settingsValue }],
    update: async (ns, patch, expected) => { assert.equal(expected, revision++); settingsValue = { ...settingsValue, ...patch } } }
  const service = createWebsiteImportService({ workspaceRegistry: { get: () => ({ path: root, status: async () => 'ok' }) },
    accountService: { status: async () => ({ authenticated: true, accountId: 7, revision: 'r1' }), captureToken: async () => async () => 'secret' },
    settings, createClient: () => client })
  const session = await service.open({ workspaceId: 'a', confirmed: true })
  const list = () => service.items({ token: session.token, folderId: 2, kind: 'records', page: 1 })
  const commit = versions => service.commit({ token: session.token, folderId: 2, keys: [row.key], versions: versions ?? { [row.key]: row.revision }, confirmed: true })
  return { root, row, client, service, session, list, commit, settingsObject: settings, settings: () => settingsValue, downloads: () => calls }
}

test('new protocol returns source metadata but no URL and writes provenance with current byte hash', async t => {
  const h = await fixture(t)
  assert.equal(h.session.protocolVersion, 2)
  const page = await h.list()
  assert.equal(page.items[0].recordId, 9); assert.equal(page.items[0].role, 'input')
  assert.doesNotMatch(JSON.stringify(page), /https:|secret/)
  const result = await h.commit()
  assert.equal(result.associationStatus, 'saved')
  const entries = (await readFile(join(h.root, result.manifest), 'utf8')).trim().split('\n').map(JSON.parse)
  assert.equal(entries[0].version, 2)
  assert.equal(entries[1].recordId, 9); assert.equal(entries[1].role, 'input'); assert.equal(entries[1].inputField, 'material')
  assert.equal(entries[1].sha256, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})

test('rereading changed metadata cannot silently replace the selected revision', async t => {
  const h = await fixture(t); await h.list()
  const old = h.row.revision
  h.row.revision = 'b'.repeat(64); h.row.fileName = 'renamed.txt'
  await h.list()
  await assert.rejects(h.commit({ [h.row.key]: old }), { code: 'IMPORT_ITEM_CHANGED' })
  assert.equal(h.downloads(), 0); assert.deepEqual(await readdir(h.root), []); assert.deepEqual(h.settings().websiteProjectLinks, [])
  const result = await h.commit()
  assert.equal(result.items[0].fileName, 'renamed.txt')
})

test('repeat reading the same full page counts unique identities, not duplicates', async t => {
  const h = await fixture(t)
  h.client.listItems = async () => ({ total: 1, pageState: 'complete', recordIds: [9], issues: [], items: Array.from({ length: 1200 }, (_, i) => ({ ...h.row, key: `file:${i}` })) })
  assert.equal((await h.list()).items.length, 1200)
  assert.equal((await h.list()).items.length, 1200)
})

test('remaining stream budget passes through service and failure bytes reduce the next attempt', async t => {
  const h = await fixture(t), second = { ...h.row, key: 'second' }; const remaining = []
  h.client.listItems = async () => ({ total: 1, pageState: 'complete', recordIds: [9], issues: [], items: [h.row, second] })
  await h.list()
  h.client.download = async (row, folder, { budget }) => {
    remaining.push(budget.remaining)
    if (row.key === h.row.key) { budget.remaining -= 123; throw new WebsiteImportError('IMPORT_REQUEST_FAILED') }
    budget.remaining -= 3; return Buffer.from('abc')
  }
  const result = await h.service.commit({ token: h.session.token, folderId: 2, keys: [h.row.key, second.key],
    versions: { [h.row.key]: h.row.revision, [second.key]: second.revision }, confirmed: true })
  assert.deepEqual(remaining, [IMPORT_LIMITS.totalBytes, IMPORT_LIMITS.totalBytes - 123])
  assert.equal(result.status, 'partial'); assert.equal(result.associationStatus, 'saved')
})

test('old selection payload without versions is rejected before any association write', async t => {
  const h = await fixture(t); await h.list()
  await assert.rejects(h.service.commit({ token: h.session.token, folderId: 2, keys: [h.row.key], confirmed: true }), { code: 'IMPORT_INVALID_INPUT' })
  assert.deepEqual(h.settings().websiteProjectLinks, [])
})

test('an uncertain settings write consumes the ticket and never retries that mutation automatically', async t => {
  const h = await fixture(t); await h.list()
  let writes = 0
  h.settingsObject.update = async () => { writes++; throw new Error('lost settings response') }
  await assert.rejects(h.commit())
  await assert.rejects(h.commit(), { code: 'IMPORT_ALREADY_SUBMITTED' })
  assert.equal(writes, 1); assert.equal(h.downloads(), 0); assert.deepEqual(await readdir(h.root), [])
})

test('record reads cannot race an in-progress association admission', async t => {
  const h = await fixture(t); await h.list()
  let finish, entered
  const ready = new Promise(resolve => { entered = resolve })
  h.client.project = () => { entered(); return new Promise(resolve => { finish = resolve }) }
  const pending = h.commit(); await ready
  await assert.rejects(h.list(), { code: 'IMPORT_BUSY' })
  finish({ id: 2, name: 'project' }); await pending
})

test('a later page read for the same record invalidates a formerly available removed attachment', async t => {
  const h = await fixture(t); await h.list()
  h.client.listItems = async () => ({ total: 1, recordIds: [9], pageState: 'complete', issues: [], recordIds: [9], items: [] })
  await h.list()
  await assert.rejects(h.commit(), { code: 'IMPORT_INVALID_SELECTION' })
  assert.equal(h.downloads(), 0); assert.deepEqual(h.settings().websiteProjectLinks, [])
})

test('ownership failure on re-read invalidates the old ticket rather than leaving its old materials selectable', async t => {
  const h = await fixture(t); await h.list()
  h.client.listItems = async () => { throw new WebsiteImportError('IMPORT_OWNERSHIP') }
  await assert.rejects(h.list(), { code: 'IMPORT_OWNERSHIP' })
  await assert.rejects(h.commit(), { code: 'IMPORT_EXPIRED' })
  assert.equal(h.downloads(), 0); assert.deepEqual(h.settings().websiteProjectLinks, [])
})
