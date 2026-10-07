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
  const calls = [], responses = new Map([
    ['/api/user/user/folderlist?parent_id=0&page=2&limit=20&keyword=abc', json({ total: 21, items: [{ id: 2, name: 'project', has_children: false }] })],
    ['/api/user/user/folderdetail/2', json({ id: 2, owner_id: 7, name: 'project' })],
    ['/api/user/user/projectlist?folder_id=2&page=1&limit=20', json({ total: 1, items: [{ id: 9, folder_id: 2 }] })],
    ['/api/user/user/projectdetail/9', json({ id: 9, folder_id: 2, answer_text: '# text', name: 'claims' })],
  ])
  const fetchImpl = async (url, options) => { calls.push({ url, ...options }); return (responses.get(url.slice(origin.length)) ?? new Response('', { status: 404 })).clone() }
  return { calls, responses, client: () => clientModule.createWebsiteImportClient({ resolveToken: async () => 'test-secret', accountId: 7, fetchImpl }),
    setRecord: value => responses.set('/api/user/user/projectdetail/9', json({ id: 9, folder_id: 2, ...value })) }
}
test('import adapter keeps bounded read-only project pagination and text download without credential disclosure', async () => {
  const h = network(), c = h.client()
  assert.equal((await c.listProjects({ parentId: 0, page: 2, keyword: 'abc' })).total, 21)
  const page = await c.listItems({ folderId: 2, kind: 'records', page: 1 })
  assert.equal(page.items[0].fileName, 'claims_OIW.md')
  assert.equal((await c.download(page.items[0], 2)).toString(), '# text')
  assert.ok(h.calls.every(x => x.method === 'GET' && x.redirect === 'error'))
  assert.ok(!JSON.stringify(page).includes('test-secret'))
})
test('selected history text changes and declared oversized attachment bodies are rejected', async () => {
  const h = network(), c = h.client()
  const page = await c.listItems({ folderId: 2, kind: 'records', page: 1 })
  h.setRecord({ answer_text: 'changed' })
  await assert.rejects(c.download(page.items[0], 2), { code: 'IMPORT_ITEM_CHANGED' })
  h.setRecord({ file_url: origin + '/files/a.txt' })
  const rows = await c.listItems({ folderId: 2, kind: 'records', page: 1 })
  h.responses.set('/files/a.txt', new Response('abc', { headers: { 'content-length': String(33 * 1024 * 1024) } }))
  await assert.rejects(c.download(rows.items[0], 2), { code: 'IMPORT_TOO_LARGE' })
})
test('legacy attachment downloads never receive Bearer and reject redirects', async () => {
  const h = network(), c = h.client()
  h.setRecord({ file_url: origin + '/uploads/a.txt' }); h.responses.set('/uploads/a.txt', new Response('content'))
  const p = await c.listItems({ folderId: 2, kind: 'records', page: 1 })
  assert.equal((await c.download(p.items[0], 2)).toString(), 'content')
  const request = h.calls.find(call => new URL(call.url).pathname === '/uploads/a.txt')
  assert.deepEqual(request.headers, {}); assert.equal(request.redirect, 'error')
  h.responses.set('/uploads/a.txt', new Response(null, { status: 302, headers: { location: 'https://evil.example' } }))
  await assert.rejects(c.download(p.items[0], 2))
})
test('canonical Unicode and spaces stay equal between the frozen detail and download revalidation', async () => {
  const raw = origin + '/files/权利要求书生成报告 1.docx', encoded = new URL(raw).href
  for (const [listed, detail] of [[raw, raw], [raw, encoded], [encoded, raw], [encoded, encoded]]) {
    const h = network(), c = h.client(); h.setRecord({ file_url: listed })
    const page = await c.listItems({ folderId: 2, kind: 'records', page: 1 })
    h.setRecord({ file_url: detail }); h.responses.set(new URL(encoded).pathname, new Response('synthetic attachment'))
    assert.equal(page.items[0].fileName, '权利要求书生成报告 1.docx')
    assert.equal((await c.download(page.items[0], 2)).toString(), 'synthetic attachment')
    const request = h.calls.find(call => new URL(call.url).pathname.startsWith('/files/'))
    assert.equal(request.url, encoded); assert.deepEqual(request.headers, {})
  }
})
test('changed query, removed attachment and untrusted URL cannot download a selected history file', async () => {
  const raw = origin + '/files/报告.docx?version=1'
  for (const detail of [origin + '/files/其他.docx?version=1', origin + '/files/报告.docx?version=2',
    'https://evil.example/files/报告.docx?version=1', origin + '/api/user/detail', raw + '#fragment', null]) {
    const h = network(), c = h.client(); h.setRecord({ file_url: raw })
    const page = await c.listItems({ folderId: 2, kind: 'records', page: 1 })
    h.setRecord({ file_url: detail })
    await assert.rejects(c.download(page.items[0], 2), { code: 'IMPORT_ITEM_CHANGED' })
    assert.ok(h.calls.every(call => new URL(call.url).pathname.startsWith('/api/')))
  }
})
test('a comma-separated legacy history lists and downloads each selected file independently', async () => {
  const h = network(), c = h.client()
  const first = origin + '/files/权利要求书.docx', second = origin + '/files/生成报告.docx'
  h.setRecord({ file_url: first + ', ' + second })
  h.responses.set(new URL(first).pathname, new Response('claims fixture')); h.responses.set(new URL(second).pathname, new Response('report fixture'))
  const page = await c.listItems({ folderId: 2, kind: 'records', page: 1 })
  assert.deepEqual(page.items.map(row => row.fileName), ['权利要求书.docx', '生成报告.docx'])
  assert.notEqual(page.items[0].key, page.items[1].key)
  assert.equal((await c.download(page.items[0], 2)).toString(), 'claims fixture')
  assert.equal((await c.download(page.items[1], 2)).toString(), 'report fixture')
  assert.deepEqual(h.calls.filter(call => new URL(call.url).pathname.startsWith('/files/')).map(call => call.url), [new URL(first).href, new URL(second).href])
})
test('legacy attachment identity survives order, string/array and canonical encoding changes', async () => {
  const h = network(), c = h.client(), first = origin + '/files/报告 1.docx', second = origin + '/files/claims.docx'
  h.setRecord({ file_url: first + ', ' + second })
  const selected = await c.listItems({ folderId: 2, kind: 'records', page: 1 })
  h.setRecord({ file_url: ['', second, new URL(first).href + ', ' + first, '  '] })
  const reordered = await c.listItems({ folderId: 2, kind: 'records', page: 1 })
  assert.deepEqual(reordered.items.map(row => row.fileName), ['claims.docx', '报告 1.docx'])
  assert.equal(reordered.items[0].key, selected.items[1].key); assert.equal(reordered.items[1].revision, selected.items[0].revision)
  h.responses.set(new URL(first).pathname, new Response('selected report'))
  assert.equal((await c.download(selected.items[0], 2)).toString(), 'selected report')
})
test('ordinary URL commas and approved relative URLs work while unsafe siblings remain unsupported', async () => {
  const h = network(), c = h.client(), trusted = origin + '/files/part,one.docx?parts=1,2'
  h.setRecord({ file_url: [trusted, '/files/relative.docx', 'https://evil.example/files/a.docx', origin + '/api/user/detail',
    trusted + '#fragment', 'https://user:pass@lzhxpy.oasisintwrite.com/files/a.docx'] })
  const page = await c.listItems({ folderId: 2, kind: 'records', page: 1 })
  assert.equal(page.items.length, 6); assert.equal(page.items[0].fileName, 'part,one.docx')
  assert.deepEqual(page.items.map(row => row.downloadable), [true, true, false, false, false, false])
  for (const row of page.items.slice(2)) await assert.rejects(c.download(row, 2), { code: 'IMPORT_UNSUPPORTED_FILE' })
})
test('removed selected legacy attachment never substitutes its remaining sibling', async () => {
  const h = network(), c = h.client(), selected = origin + '/files/selected.docx', sibling = origin + '/files/sibling.docx'
  h.setRecord({ file_url: [selected, sibling] })
  const page = await c.listItems({ folderId: 2, kind: 'records', page: 1 })
  h.setRecord({ file_url: sibling })
  await assert.rejects(c.download(page.items[0], 2), { code: 'IMPORT_ITEM_CHANGED' })
  assert.ok(h.calls.every(call => new URL(call.url).pathname.startsWith('/api/')))
})
test('malformed attachments are explicitly unsupported and oversized expansion is rejected', async () => {
  const h = network(), c = h.client(); h.setRecord({ file_url: [origin + '/files/a.docx', { url: origin + '/files/b.docx' }] })
  const page = await c.listItems({ folderId: 2, kind: 'records', page: 1 })
  assert.equal(page.pageState, 'partial'); assert.equal(page.items.filter(v => !v.downloadable).length, 1)
  h.setRecord({ file_url: Array.from({ length: 2001 }, (_, i) => origin + '/files/' + i + '.docx') })
  await assert.rejects(c.listItems({ folderId: 2, kind: 'records', page: 1 }), { code: 'IMPORT_TOO_MANY_ITEMS' })
})

async function fixture(t) {
  assert.equal(typeof serviceModule.createWebsiteImportService, 'function')
  const root = await mkdtemp(join(tmpdir(), 'oasis-import-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const workspace = { path: root, status: async () => 'ok' }
  let revision = 'r1', settingsRevision = 0, clock = Date.now(), active = false
  let value = { websiteProjectLinks: [], workspaceApiBindings: [] }
  const row = { key: 'history:9:text', revision: 'a'.repeat(64), role: 'text', inputField: null, kind: 'text', sourceId: 9, fileName: 'claims_OIW.md', name: 'claims', size: 6, downloadable: true, reason: null }
  let body = '# text', downloads = 0
  const accountService = { status: async () => ({ authenticated: true, accountId: 7, revision }), captureToken: async () => { const r = revision; return async () => { if (r !== revision) throw Error('changed'); return 'test-secret' } } }
  const settings = { writable: true, describe: () => [{ ns: 'oasis-professional-service', revision: settingsRevision, value }],
    update: async (ns, patch, r) => { assert.equal(r, settingsRevision); value = { ...value, ...patch }; settingsRevision++ } }
  const client = { project: async id => ({ id, name: 'website' }), listProjects: async () => ({ total: 1, items: [{ id: 2, name: 'website' }] }),
    listItems: async () => ({ total: 1, pageState: 'complete', recordIds: [9], issues: [], items: [row] }), download: async (row, folder, { budget }) => { downloads++; const bytes = Buffer.from(body); budget.remaining -= bytes.length; return bytes } }
  const service = serviceModule.createWebsiteImportService({ workspaceRegistry: { get: id => id === 'a' ? workspace : null }, accountService, settings, createClient: () => client,
    now: () => clock, isWorkspaceBusy: () => active })
  const open = () => service.open({ workspaceId: 'a', confirmed: true })
  async function select() { const s = await open(); await service.items({ token: s.token, folderId: 2, kind: 'records', page: 1 }); return s }
  return { service, root, open, select, row, client, downloads: () => downloads, settings: () => value,
    changeSettings: patch => { value = { ...value, ...patch }; settingsRevision++ },
    expire: () => { clock += 16 * 60 * 1000 }, busy: () => { active = true },
    accountChange: () => { revision = 'r2' }, body: text => { body = text }, move: path => { workspace.path = path } }
}

test('expanded history pages cross 40 rows without leaking URLs and save only the selected attachment', async t => {
  const h = await fixture(t), n = network(), c = n.client()
  n.responses.set('/api/user/user/projectlist?folder_id=2&page=1&limit=20', json({ total: 21, items: Array.from({ length: 20 }, (_, i) => ({
    id: i + 9, folder_id: 2, name: `record-${i}`, answer_text: '# fixture',
    file_url: `${origin}/files/first-${i}.docx, ${origin}/files/second-${i}.docx`,
  })) }))
  for (let i = 0; i < 20; i++) n.responses.set('/api/user/user/projectdetail/' + (i + 9), json({ id: i + 9, folder_id: 2, name: `record-${i}`, answer_text: '# fixture', file_url: `${origin}/files/first-${i}.docx, ${origin}/files/second-${i}.docx` }))
  h.client.listItems = c.listItems; h.client.download = c.download
  const s = await h.open(), page = await h.service.items({ token: s.token, folderId: 2, kind: 'records', page: 1 })
  assert.equal(page.total, 21)
  assert.equal(page.items.length, 60)
  assert.equal(new Set(page.items.map(row => row.key)).size, 60)
  assert.ok(!JSON.stringify(page).includes(origin))
  assert.ok(!JSON.stringify(page).includes('test-secret'))
  const selected = page.items.find(row => row.fileName === 'second-0.docx')
  assert.ok(selected)
  n.responses.set('/api/user/user/projectdetail/9', json({ id: 9, folder_id: 2, file_url: [origin + '/files/second-0.docx', origin + '/files/first-0.docx'] }))
  n.responses.set('/files/second-0.docx', new Response('selected bytes'))
  const result = await h.service.commit({ token: s.token, folderId: 2, keys: [selected.key], versions: { [selected.key]: selected.revision }, confirmed: true })
  assert.deepEqual(result.items, [{ key: selected.key, fileName: 'second-0.docx', status: 'saved' }])
  assert.deepEqual((await readdir(h.root)).sort(), [result.manifest, 'second-0.docx'].sort())
  assert.equal(await readFile(join(h.root, 'second-0.docx'), 'utf8'), 'selected bytes')
  assert.deepEqual(n.calls.filter(call => new URL(call.url).pathname.startsWith('/files/')).map(call => call.url), [origin + '/files/second-0.docx'])
  const manifest = await readFile(join(h.root, result.manifest), 'utf8')
  assert.ok(!manifest.includes(origin + '/files/'))
  assert.ok(!manifest.includes('test-secret'))
})

test('zero-file association validates project and records intent without downloading', async t => {
  const h = await fixture(t), s = await h.open()
  let checked = 0; h.client.project = async id => { checked++; return { id, name: 'empty' } }
  const result = await h.service.commit({ token: s.token, folderId: 2, keys: [], versions: {}, confirmed: true })
  assert.equal(checked, 1); assert.equal(h.downloads(), 0); assert.deepEqual(result.items, [])
  assert.equal(h.settings().websiteProjectLinks[0].folderId, 2)
  assert.deepEqual(await readdir(h.root), [result.manifest])
})

test('unlink is explicit, revision-bound, preserves files and invalidates all old tickets', async t => {
  const h = await fixture(t), s = await h.select()
  const r = await h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], versions: { [h.row.key]: h.row.revision }, confirmed: true })
  h.changeSettings({ workspaceApiBindings: [{ ...h.settings().websiteProjectLinks[0], serviceId: 4 }, { workspaceId: 'b' }] })
  const current = await h.open(), other = await h.open()
  const before = await readFile(join(h.root, r.manifest), 'utf8')
  await assert.rejects(h.service.unlink({ token: current.token, expectedSettingsRevision: current.settingsRevision, confirmed: false }), { code: 'IMPORT_INVALID_INPUT' })
  await assert.rejects(h.service.unlink({ token: current.token, expectedSettingsRevision: current.settingsRevision - 1, confirmed: true }), { code: 'IMPORT_SETTINGS_CHANGED' })
  await h.service.unlink({ token: current.token, expectedSettingsRevision: current.settingsRevision, confirmed: true })
  assert.deepEqual(h.settings().websiteProjectLinks, [])
  assert.deepEqual(h.settings().workspaceApiBindings, [{ workspaceId: 'b' }])
  assert.equal(await readFile(join(h.root, r.manifest), 'utf8'), before)
  assert.equal(await readFile(join(h.root, r.items[0].fileName), 'utf8'), '# text')
  await assert.rejects(h.service.projects({ token: other.token }), { code: 'IMPORT_EXPIRED' })
  const fresh = await h.open()
  await h.service.commit({ token: fresh.token, folderId: 3, keys: [], versions: {}, confirmed: true })
  assert.equal(h.settings().websiteProjectLinks[0].folderId, 3)
})

test('unlink refuses changed settings, account and unresolved generation', async t => {
  for (const [change, code] of [
    [h => h.changeSettings({ unrelated: true }), 'IMPORT_SETTINGS_CHANGED'],
    [h => h.accountChange(), 'IMPORT_ACCOUNT_CHANGED'],
    [h => h.busy(), 'IMPORT_WORKSPACE_BUSY'],
  ]) {
    const h = await fixture(t), s = await h.open()
    await h.service.commit({ token: s.token, folderId: 2, keys: [], versions: {}, confirmed: true })
    const current = await h.open(); change(h)
    await assert.rejects(h.service.unlink({ token: current.token, expectedSettingsRevision: current.settingsRevision, confirmed: true }), { code })
    assert.equal(h.settings().websiteProjectLinks.length, 1)
  }
})

test('legacy service-only association can be explicitly unlinked without reading website lists', async t => {
  const h = await fixture(t)
  h.changeSettings({ workspaceApiBindings: [{ workspaceId: 'a', workspacePath: h.root, apiBaseOrigin: origin,
    accountId: 7, folderId: 2, folderName: 'legacy', confirmedAt: new Date().toISOString(), apiId: 3 }] })
  const s = await h.open()
  assert.equal(s.link.folderName, 'legacy')
  await h.service.unlink({ token: s.token, expectedSettingsRevision: s.settingsRevision, confirmed: true })
  assert.deepEqual(h.settings().workspaceApiBindings, [])
})

test('zero-file association still rejects unverifiable ownership before any writes', async t => {
  const h = await fixture(t), s = await h.open()
  h.client.project = async () => { throw new clientModule.WebsiteImportError('IMPORT_OWNERSHIP') }
  await assert.rejects(h.service.commit({ token: s.token, folderId: 2, keys: [], versions: {}, confirmed: true }), { code: 'IMPORT_OWNERSHIP' })
  assert.deepEqual(h.settings().websiteProjectLinks, []); assert.deepEqual(await readdir(h.root), [])
})

test('unlink refuses a running import and invalidates a late item read', async t => {
  const h = await fixture(t), s = await h.select(), second = await h.open()
  let finish, entered
  const started = new Promise(resolve => { entered = resolve })
  h.client.download = (row, folder, { budget }) => { entered(); return new Promise(resolve => { finish = bytes => { budget.remaining -= bytes.length; resolve(bytes) } }) }
  const pending = h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], versions: { [h.row.key]: h.row.revision }, confirmed: true })
  await started
  await assert.rejects(h.service.unlink({ token: second.token, expectedSettingsRevision: second.settingsRevision, confirmed: true }), { code: 'WORKSPACE_OPERATION_BUSY' })
  finish(Buffer.from('# text')); await pending
  const current = await h.open()
  let finishRead, enteredRead
  const reading = new Promise(resolve => { enteredRead = resolve })
  h.client.listItems = () => { enteredRead(); return new Promise(resolve => { finishRead = resolve }) }
  const late = h.service.items({ token: current.token, folderId: 2, kind: 'records' })
  await reading
  await h.service.unlink({ token: current.token, expectedSettingsRevision: current.settingsRevision, confirmed: true })
  finishRead({ total: 1, pageState: 'complete', recordIds: [9], issues: [], items: [h.row] })
  await assert.rejects(late, { code: 'IMPORT_EXPIRED' })
})
test('import writes current project root, associates project, preserves collision and deduplicates', async t => {
  const h = await fixture(t)
  await writeFile(join(h.root, 'claims_OIW.md'), 'old')
  let s = await h.select()
  const result = await h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], versions: { [h.row.key]: h.row.revision }, confirmed: true })
  assert.equal(result.items[0].status, 'saved')
  assert.equal(result.items[0].fileName, 'claims_2_OIW.md')
  assert.equal(await readFile(join(h.root, 'claims_OIW.md'), 'utf8'), 'old')
  assert.equal(await readFile(join(h.root, 'claims_2_OIW.md'), 'utf8'), '# text')
  assert.equal(h.settings().websiteProjectLinks[0].folderId, 2)
  assert.deepEqual(await h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], versions: { [h.row.key]: h.row.revision }, confirmed: true }), result)
  assert.equal(h.downloads(), 1)
  s = await h.select()
  assert.equal((await h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], versions: { [h.row.key]: h.row.revision }, confirmed: true })).items[0].status, 'skipped')
  assert.equal((await readdir(h.root)).filter(x => x.endsWith('.md')).length, 2)
})
test('account change or unlisted keys cause no writes or downloads', async t => {
  const h = await fixture(t), s = await h.select()
  await assert.rejects(h.service.commit({ token: s.token, folderId: 2, keys: ['arbitrary-url'], versions: { 'arbitrary-url': 'a'.repeat(64) }, confirmed: true }))
  h.accountChange()
  await assert.rejects(h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], versions: { [h.row.key]: h.row.revision }, confirmed: true }))
  assert.equal(h.downloads(), 0); assert.deepEqual(await readdir(h.root), [])
})
test('unsafe remote filename, project conflict and moved Workspace fail closed', async t => {
  const h = await fixture(t), s = await h.select()
  h.row.fileName = '../escape.txt'
  const r = await h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], versions: { [h.row.key]: h.row.revision }, confirmed: true })
  // The stored selection, not a mutable provider row, controls output names.
  assert.equal(r.items[0].fileName, 'claims_OIW.md')
  const next = await h.open()
  await assert.rejects(h.service.items({ token: next.token, folderId: 3, kind: 'records', page: 1 }), { code: 'IMPORT_LINK_CONFLICT' })
  h.move(join(h.root, 'missing'))
  await assert.rejects(h.service.projects({ token: next.token, page: 1, parentId: 0, keyword: '' }))
})
test('unsafe listed filename cannot write; an existing directory junction is not followed', async t => {
  const h = await fixture(t)
  h.row.fileName = '../escape.txt'
  let s = await h.select()
  await assert.rejects(h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], versions: { [h.row.key]: h.row.revision }, confirmed: true }), { code: 'IMPORT_UNSAFE_PATH' })
  assert.deepEqual(await readdir(h.root), [])
  h.row.fileName = 'claims_OIW.md'
  const outside = await mkdtemp(join(tmpdir(), 'oasis-outside-'))
  t.after(() => rm(outside, { recursive: true, force: true }))
  await symlink(outside, join(h.root, 'claims_OIW.md'), 'junction')
  s = await h.select()
  const result = await h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], versions: { [h.row.key]: h.row.revision }, confirmed: true })
  assert.equal(result.items[0].fileName, 'claims_2_OIW.md')
  assert.deepEqual(await readdir(outside), [])
})
test('partial download records failures and preserves existing files; account switch stops later items', async t => {
  const h = await fixture(t)
  const second = { ...h.row, key: 'history:10:text', fileName: 'second_OIW.md' }
  h.client.listItems = async () => ({ total: 2, pageState: 'complete', recordIds: [9], issues: [], items: [h.row, second] })
  const s = await h.select()
  h.client.download = async (row, folder, { budget }) => { if (row.key === second.key) throw Error('secret server message'); budget.remaining -= 6; return Buffer.from('# text') }
  const result = await h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key, second.key], versions: { [h.row.key]: h.row.revision, [second.key]: second.revision }, confirmed: true })
  assert.equal(result.status, 'partial'); assert.deepEqual(result.items.map(v => v.status), ['saved', 'failed'])
  const journal = await readFile(join(h.root, result.manifest), 'utf8')
  assert.ok(!journal.includes('secret')); assert.match(journal, /"kind":"intent"/); assert.match(journal, /"status":"failed"/)
  const s2 = await h.select()
  let calls = 0
  h.client.download = async (row, folder, { budget }) => { calls++; h.accountChange(); budget.remaining -= 3; return Buffer.from('new') }
  const stopped = await h.service.commit({ token: s2.token, folderId: 2, keys: [h.row.key, second.key], versions: { [h.row.key]: h.row.revision, [second.key]: second.revision }, confirmed: true })
  assert.equal(stopped.status, 'partial'); assert.equal(calls, 1)
  assert.equal(await readFile(join(h.root, 'claims_OIW.md'), 'utf8'), '# text')
})
test('concurrent commits and forged download fields cannot bypass confirmation', async t => {
  const h = await fixture(t), s = await h.select()
  const command = { token: s.token, folderId: 2, keys: [h.row.key], versions: { [h.row.key]: h.row.revision }, confirmed: true }
  await assert.rejects(h.service.commit({ ...command, absolutePath: 'D:\\outside' }))
  await assert.rejects(h.service.commit({ ...command, confirmed: false }))
  let release, entered
  const ready = new Promise(resolve => { entered = resolve })
  h.client.download = (row, folder, { budget }) => { entered(); return new Promise(resolve => { release = bytes => { budget.remaining -= bytes.length; resolve(bytes) } }) }
  const pending = h.service.commit(command); await ready
  await assert.rejects(h.service.commit(command))
  release(Buffer.from('one')); await pending
  assert.equal((await readdir(h.root)).filter(v => v.endsWith('.md')).length, 1)
})
test('expired selections and unresolved generation block import before settings or file writes', async t => {
  const h = await fixture(t), s = await h.select()
  h.expire()
  await assert.rejects(h.service.commit({ token: s.token, folderId: 2, keys: [h.row.key], versions: { [h.row.key]: h.row.revision }, confirmed: true }), { code: 'IMPORT_EXPIRED' })
  const s2 = await h.select(); h.busy()
  await assert.rejects(h.service.commit({ token: s2.token, folderId: 2, keys: [h.row.key], versions: { [h.row.key]: h.row.revision }, confirmed: true }), { code: 'IMPORT_WORKSPACE_BUSY' })
  assert.deepEqual(h.settings().websiteProjectLinks, []); assert.deepEqual(await readdir(h.root), [])
})
test('legacy array project pagination does not silently repeat the first page', async () => {
  const h = network(), c = h.client()
  h.responses.set('/api/user/user/folderlist?parent_id=0&page=2&limit=20&keyword=', json(Array.from({ length: 22 }, (_, i) => ({ id: i + 1, name: 'p' }))))
  const result = await c.listProjects({ parentId: 0, page: 2, keyword: '' })
  assert.deepEqual(result.items.map(v => v.id), [21, 22])
})
