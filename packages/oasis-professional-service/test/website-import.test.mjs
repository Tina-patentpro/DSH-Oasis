import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, readdir, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const clientModule = await import('../src/website-import-client.js').catch(() => ({}))
const serviceModule = await import('../src/website-import-service.js').catch(() => ({}))
const origin = 'https://lzhxpy.oasisintwrite.com'
const json = data => Response.json({ code: 200, data })
function network() {
  const calls = []
  const responses = new Map([
    ['/api/user/user/folderlist?parent_id=0&page=2&limit=20&keyword=abc', json({ total: 21, items: [{ id: 2, name: 'project', has_children: false }] })],
    ['/api/user/user/folderdetail/2', json({ id: 2, owner_id: 7, name: 'project' })],
    ['/api/user/user/projectlist?folder_id=2&page=1&limit=20', json({ total: 1, items: [{ id: 9, folder_id: 2, name: 'claims', answer_text: '# text', file_url: null }] })],
    ['/api/user/user/projectdetail/9', json({ id: 9, folder_id: 2, answer_text: '# text', name: 'claims' })],
    ['/api/files?projectId=2&page=1&pageSize=20', json({ items: [{ id: 'f1', projectId: '2', filename: 'original.txt', size: 3 }], pagination: { total: 1 } })],
    ['/api/files/f1/metadata', json({ id: 'f1', projectId: '2', filename: 'original.txt', size: 3 })],
    ['/api/files/f1', new Response('abc')],
  ])
  const fetchImpl = async (url, options) => { calls.push({ url, ...options }); return (responses.get(url.slice(origin.length)) ?? new Response('', { status: 404 })).clone() }
  return { calls, responses, client: () => clientModule.createWebsiteImportClient({ resolveToken: async () => 'test-secret', accountId: 7, fetchImpl }) }
}
test('import adapter implements bounded read-only pagination without returning credentials', async () => {
  assert.equal(typeof clientModule.createWebsiteImportClient, 'function')
  const h = network(), c = h.client()
  assert.equal((await c.listProjects({ parentId: 0, page: 2, keyword: 'abc' })).total, 21)
  const page = await c.listItems({ folderId: 2, kind: 'history', page: 1 })
  assert.equal(page.items[0].fileName, 'claims_OIW.md')
  assert.equal((await c.download(page.items[0], 2)).toString(), '# text')
  const files = await c.listItems({ folderId: 2, kind: 'files', page: 1 })
  assert.equal((await c.download(files.items[0], 2)).toString(), 'abc')
  assert.ok(h.calls.every(x => x.method === 'GET' && x.redirect === 'error'))
  assert.ok(!JSON.stringify(page).includes('test-secret'))
})
test('import rejects wrong project membership, owner, malformed pagination and untrusted URLs', async () => {
  assert.equal(typeof clientModule.createWebsiteImportClient, 'function')
  const h = network(), c = h.client()
  h.responses.set('/api/user/user/folderdetail/2', json({ id: 2, owner_id: 8, name: 'x' }))
  await assert.rejects(c.project(2), { code: 'IMPORT_OWNERSHIP' })
  h.responses.set('/api/user/user/folderdetail/2', json({ id: 2, owner_id: 7, name: 'x' }))
  h.responses.set('/api/files?projectId=2&page=1&pageSize=20', json({ items: [{ id: 'f1', projectId: 'other', filename: 'x', size: 1 }], pagination: { total: 1 } }))
  await assert.rejects(c.listItems({ folderId: 2, kind: 'files', page: 1 }), { code: 'IMPORT_OWNERSHIP' })
  h.responses.set('/api/user/user/projectlist?folder_id=2&page=1&limit=20', json({ total: 1, items: [{ id: 9, folder_id: 2, name: 'x', file_url: 'https://evil.example/a.pdf' }] }))
  const p = await c.listItems({ folderId: 2, kind: 'history', page: 1 })
  assert.equal(p.items[0].downloadable, false)
  await assert.rejects(c.download(p.items[0], 2))
  assert.ok(h.calls.every(x => x.url.startsWith(origin)))
})
test('history content changed since selection is rejected and oversized streaming responses are bounded', async () => {
  const h = network(), c = h.client()
  const page = await c.listItems({ folderId: 2, kind: 'history', page: 1 })
  h.responses.set('/api/user/user/projectdetail/9', json({ id: 9, folder_id: 2, answer_text: 'changed' }))
  await assert.rejects(c.download(page.items[0], 2), { code: 'IMPORT_ITEM_CHANGED' })
  const rows = await c.listItems({ folderId: 2, kind: 'files', page: 1 })
  h.responses.set('/api/files/f1', new Response('abc', { headers: { 'content-length': String(33 * 1024 * 1024) } }))
  await assert.rejects(c.download(rows.items[0], 2), { code: 'IMPORT_TOO_LARGE' })
})
test('legacy file attachments never receive a Bearer token; redirect and malformed lists fail closed', async () => {
  const h = network(), c = h.client(), url = origin + '/uploads/a.txt'
  h.responses.set('/api/user/user/projectlist?folder_id=2&page=1&limit=20', json({ total: 1, items: [{ id: 9, folder_id: 2, name: 'x', file_url: url }] }))
  h.responses.set('/api/user/user/projectdetail/9', json({ id: 9, folder_id: 2, file_url: url }))
  h.responses.set('/uploads/a.txt', new Response('content'))
  const p = await c.listItems({ folderId: 2, kind: 'history', page: 1 })
  assert.equal((await c.download(p.items[0], 2)).toString(), 'content')
  assert.deepEqual(h.calls.at(-1).headers, {})
  h.responses.set('/uploads/a.txt', new Response(null, { status: 302, headers: { location: 'https://evil.example' } }))
  await assert.rejects(c.download(p.items[0], 2))
  h.responses.set('/api/files?projectId=2&page=1&pageSize=20', json({ items: [], pagination: {} }))
  await assert.rejects(c.listItems({ folderId: 2, kind: 'files', page: 1 }), { code: 'IMPORT_INVALID_RESPONSE' })
})
async function fixture(t) {
  assert.equal(typeof serviceModule.createWebsiteImportService, 'function')
  const root = await mkdtemp(join(tmpdir(), 'oasis-import-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const workspace = { path: root, status: async () => 'ok' }
  let revision = 'r1', settingsRevision = 0, clock = Date.now(), active = false
  let value = { websiteProjectLinks: [], workspaceApiBindings: [] }
  const row = { key: 'history:9:text', kind: 'text', sourceId: 9, fileName: 'claims_OIW.md', name: 'claims', size: 6, downloadable: true, reason: null }
  let body = '# text', downloads = 0
  const accountService = { status: async () => ({ authenticated: true, accountId: 7, revision }), captureToken: async () => { const r = revision; return async () => { if (r !== revision) throw Error('changed'); return 'test-secret' } } }
  const settings = { writable: true, describe: () => [{ ns: 'oasis-professional-service', revision: settingsRevision, value }],
    update: async (ns, patch, r) => { assert.equal(r, settingsRevision); value = { ...value, ...patch }; settingsRevision++ } }
  const client = { project: async id => ({ id, name: 'website' }), listProjects: async () => ({ total: 1, items: [{ id: 2, name: 'website' }] }),
    listItems: async () => ({ total: 1, items: [row] }), download: async () => { downloads++; return Buffer.from(body) } }
  const service = serviceModule.createWebsiteImportService({ workspaceRegistry: { get: id => id === 'a' ? workspace : null }, accountService, settings, createClient: () => client,
    now: () => clock, isWorkspaceBusy: () => active })
  const open = () => service.open({ workspaceId: 'a', confirmed: true })
  async function select() { const s = await open(); await service.items({ token: s.token, folderId: 2, kind: 'history', page: 1 }); return s }
  return { service, root, open, select, row, client, downloads: () => downloads, settings: () => value,
    expire: () => { clock += 16 * 60 * 1000 }, busy: () => { active = true },
    accountChange: () => { revision = 'r2' }, body: text => { body = text }, move: path => { workspace.path = path } }
}
test('import writes current project root, associates project, preserves collision and deduplicates', async t => {
  const h = await fixture(t)
  await writeFile(join(h.root, 'claims_OIW.md'), 'old')
  let s = await h.select()
  const result = await h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], confirmed: true })
  assert.equal(result.items[0].status, 'saved')
  assert.equal(result.items[0].fileName, 'claims_2_OIW.md')
  assert.equal(await readFile(join(h.root, 'claims_OIW.md'), 'utf8'), 'old')
  assert.equal(await readFile(join(h.root, 'claims_2_OIW.md'), 'utf8'), '# text')
  assert.equal(h.settings().websiteProjectLinks[0].folderId, 2)
  assert.deepEqual(await h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], confirmed: true }), result)
  assert.equal(h.downloads(), 1)
  s = await h.select()
  assert.equal((await h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], confirmed: true })).items[0].status, 'skipped')
  assert.equal((await readdir(h.root)).filter(x => x.endsWith('.md')).length, 2)
})
test('account change or unlisted keys cause no writes or downloads', async t => {
  const h = await fixture(t), s = await h.select()
  await assert.rejects(h.service.commit({ token: s.token, folderId: 2, keys: ['arbitrary-url'], confirmed: true }))
  h.accountChange()
  await assert.rejects(h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], confirmed: true }))
  assert.equal(h.downloads(), 0); assert.deepEqual(await readdir(h.root), [])
})
test('unsafe remote filename, project conflict and moved Workspace fail closed', async t => {
  const h = await fixture(t), s = await h.select()
  h.row.fileName = '../escape.txt'
  const r = await h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], confirmed: true })
  // The stored selection, not a mutable provider row, controls output names.
  assert.equal(r.items[0].fileName, 'claims_OIW.md')
  const next = await h.open()
  await assert.rejects(h.service.items({ token: next.token, folderId: 3, kind: 'history', page: 1 }), { code: 'IMPORT_LINK_CONFLICT' })
  h.move(join(h.root, 'missing'))
  await assert.rejects(h.service.projects({ token: next.token, page: 1, parentId: 0, keyword: '' }))
})
test('unsafe listed filename cannot write; an existing directory junction is not followed', async t => {
  const h = await fixture(t)
  h.row.fileName = '../escape.txt'
  let s = await h.select()
  await assert.rejects(h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], confirmed: true }), { code: 'IMPORT_UNSAFE_PATH' })
  assert.deepEqual(await readdir(h.root), [])
  h.row.fileName = 'claims_OIW.md'
  const outside = await mkdtemp(join(tmpdir(), 'oasis-outside-'))
  t.after(() => rm(outside, { recursive: true, force: true }))
  await symlink(outside, join(h.root, 'claims_OIW.md'), 'junction')
  s = await h.select()
  const result = await h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], confirmed: true })
  assert.equal(result.items[0].fileName, 'claims_2_OIW.md')
  assert.deepEqual(await readdir(outside), [])
})
test('partial download records failures and preserves existing files; account switch stops later items', async t => {
  const h = await fixture(t)
  const second = { ...h.row, key: 'history:10:text', fileName: 'second_OIW.md' }
  h.client.listItems = async () => ({ total: 2, items: [h.row, second] })
  const s = await h.select()
  h.client.download = async row => { if (row.key === second.key) throw Error('secret server message'); return Buffer.from('# text') }
  const result = await h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key, second.key], confirmed: true })
  assert.equal(result.status, 'partial'); assert.deepEqual(result.items.map(v => v.status), ['saved', 'failed'])
  const journal = await readFile(join(h.root, result.manifest), 'utf8')
  assert.ok(!journal.includes('secret')); assert.match(journal, /"kind":"intent"/); assert.match(journal, /"status":"failed"/)
  const s2 = await h.select()
  let calls = 0
  h.client.download = async () => { calls++; h.accountChange(); return Buffer.from('new') }
  const stopped = await h.service.commit({ token: s2.token, folderId: 2, keys: [h.row.key, second.key], confirmed: true })
  assert.equal(stopped.status, 'partial'); assert.equal(calls, 1)
  assert.equal(await readFile(join(h.root, 'claims_OIW.md'), 'utf8'), '# text')
})
test('concurrent commits and forged download fields cannot bypass confirmation', async t => {
  const h = await fixture(t), s = await h.select()
  const command = { token: s.token, folderId: 2, keys: [h.row.key], confirmed: true }
  await assert.rejects(h.service.commit({ ...command, absolutePath: 'D:\\outside' }))
  await assert.rejects(h.service.commit({ ...command, confirmed: false }))
  let release, entered
  const ready = new Promise(resolve => { entered = resolve })
  h.client.download = () => { entered(); return new Promise(resolve => { release = resolve }) }
  const pending = h.service.commit(command); await ready
  await assert.rejects(h.service.commit(command))
  release(Buffer.from('one')); await pending
  assert.equal((await readdir(h.root)).filter(v => v.endsWith('.md')).length, 1)
})
test('expired selections and unresolved generation block import before settings or file writes', async t => {
  const h = await fixture(t), s = await h.select()
  h.expire()
  await assert.rejects(h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], confirmed: true }), { code: 'IMPORT_EXPIRED' })
  const s2 = await h.select(); h.busy()
  await assert.rejects(h.service.commit({ token: s2.token, folderId: 2, keys: [h.row.key], confirmed: true }), { code: 'IMPORT_WORKSPACE_BUSY' })
  assert.deepEqual(h.settings().websiteProjectLinks, []); assert.deepEqual(await readdir(h.root), [])
})
test('legacy array project pagination does not silently repeat the first page', async () => {
  const h = network(), c = h.client()
  h.responses.set('/api/user/user/folderlist?parent_id=0&page=2&limit=20&keyword=', json(Array.from({ length: 22 }, (_, i) => ({ id: i + 1, name: 'p' }))))
  const result = await c.listProjects({ parentId: 0, page: 2, keyword: '' })
  assert.deepEqual(result.items.map(v => v.id), [21, 22])
})
