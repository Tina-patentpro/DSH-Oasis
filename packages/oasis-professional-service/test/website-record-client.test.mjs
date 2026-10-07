import test from 'node:test'
import assert from 'node:assert/strict'
import { createWebsiteImportClient } from '../src/website-import-client.js'
const origin = 'https://lzhxpy.oasisintwrite.com'
const json = value => Response.json({ code: 200, data: value })
const record = { id: 9, folder_id: 2, user_id: 7, name: 'claims', answer_text: '# text',
  inputs: { material: { type: 'document', transfer_method: 'remote_url', url: '/uploads/input.txt' } }, file_output: [{ url: '/files/output.docx' }] }
function fixture(details = [record]) {
  const calls = [], responses = new Map(details.map(v => [`/api/user/user/projectdetail/${v.id}`, () => json(v)]))
  responses.set('/api/user/user/folderdetail/2', () => json({ id: 2, owner_id: 7, name: 'project' }))
  responses.set('/api/user/user/projectlist', () => json({ total: details.length, item: details.map(v => ({ id: v.id, folder_id: 2 })) }))
  responses.set('/uploads/input.txt', () => new Response('input'))
  responses.set('/files/output.docx', () => new Response('output'))
  const client = createWebsiteImportClient({ accountId: 7, resolveToken: async () => 'test-secret', fetchImpl: async (url, options) => {
    calls.push({ url, ...options }); const response = responses.get(new URL(url).pathname)
    assert.ok(response, `unexpected endpoint ${new URL(url).pathname}`); return response(options)
  } })
  return { client, calls, responses, list: () => client.listItems({ folderId: 2, kind: 'records', page: 1 }) }
}

test('record chain discovers inputs and outputs only from verified detail and accepts item pagination alias', async () => {
  const h = fixture(), page = await h.list()
  assert.deepEqual(page.items.map(v => v.role), ['text', 'input', 'output'])
  assert.equal(page.pageState, 'complete'); assert.deepEqual(page.issues, [])
  assert.equal(page.total, 1)
  assert.equal((await h.client.download(page.items[1], 2)).toString(), 'input')
  const attachment = h.calls.find(c => new URL(c.url).pathname === '/uploads/input.txt')
  assert.deepEqual(attachment.headers, {}); assert.equal(attachment.redirect, 'error')
  assert.ok(!h.calls.some(c => new URL(c.url).pathname.startsWith('/api/files')))
})

test('detail failures are partial not empty proof and never use unverified list attachment fields', async () => {
  const h = fixture([record, { ...record, id: 10 }])
  h.responses.set('/api/user/user/projectdetail/10', () => new Response('', { status: 404 }))
  const page = await h.list()
  assert.equal(page.pageState, 'partial'); assert.equal(page.items.length, 3)
  assert.deepEqual(page.issues, [{ recordId: 10, code: 'IMPORT_REQUEST_FAILED', details: { endpoint: 'history-detail', stage: 'response', kind: 'http', httpStatus: 404 } }])
})

for (const change of [{ user_id: 8 }, { folder_id: 3 }, { id: 12 }]) test(`detail ownership mismatch ${JSON.stringify(change)} stops listing`, async () => {
  const h = fixture(); h.responses.set('/api/user/user/projectdetail/9', () => json({ ...record, ...change }))
  await assert.rejects(h.list(), { code: 'IMPORT_OWNERSHIP' })
})

test('detail workers never exceed two concurrent reads and authentication stops the pending queue', async () => {
  const h = fixture(Array.from({ length: 20 }, (_, i) => ({ ...record, id: i + 9 })))
  let active = 0, max = 0
  for (let i = 9; i < 29; i++) h.responses.set(`/api/user/user/projectdetail/${i}`, async () => {
    active++; max = Math.max(active, max); await new Promise(resolve => setImmediate(resolve)); active--
    return i === 9 ? new Response('', { status: 401 }) : json({ ...record, id: i })
  })
  await assert.rejects(h.list(), { code: 'AUTH_REQUIRED' })
  assert.ok(max <= 2)
  assert.ok(h.calls.filter(c => new URL(c.url).pathname.includes('projectdetail')).length <= 2)
})

test('same file identity with changed metadata has a new revision and old download is rejected', async () => {
  const h = fixture(), before = await h.list()
  h.responses.set('/api/user/user/projectdetail/9', () => json({ ...record, file_output: [{ url: '/files/output.docx', filename: 'renamed.docx' }] }))
  const after = await h.list()
  assert.equal(before.items[2].key, after.items[2].key)
  assert.notEqual(before.items[2].revision, after.items[2].revision)
  await assert.rejects(h.client.download(before.items[2], 2), { code: 'IMPORT_ITEM_CHANGED' })
  assert.ok(!h.calls.some(c => new URL(c.url).pathname === '/files/output.docx'))
})

test('record changed while bytes were downloaded is rejected before saving', async () => {
  const h = fixture(), page = await h.list()
  h.responses.set('/files/output.docx', () => {
    h.responses.set('/api/user/user/projectdetail/9', () => json({ ...record, file_output: [] }))
    return new Response('output')
  })
  await assert.rejects(h.client.download(page.items[2], 2), { code: 'IMPORT_ITEM_CHANGED' })
})

test('streaming rejects remaining budget without buffering the complete file, even without a length header', async () => {
  const h = fixture(), page = await h.list(), budget = { remaining: 4 }
  let cancelled = false
  h.responses.set('/files/output.docx', () => new Response(new ReadableStream({
    start(c) { c.enqueue(new Uint8Array(3)); c.enqueue(new Uint8Array(3)) },
    cancel() { cancelled = true },
  })))
  await assert.rejects(h.client.download(page.items[2], 2, { budget }), { code: 'IMPORT_TOO_LARGE' })
  assert.equal(cancelled, true); assert.equal(budget.remaining, 0)
})

test('failed transfer body bytes do not refund the import budget', async () => {
  const h = fixture(), page = await h.list(), budget = { remaining: 10 }
  let reads = 0
  h.responses.set('/files/output.docx', () => new Response(new ReadableStream({ pull(c) {
    if (++reads === 1) c.enqueue(new Uint8Array(3)); else c.error(new Error('network'))
  } })))
  await assert.rejects(h.client.download(page.items[2], 2, { budget }), { code: 'IMPORT_REQUEST_FAILED' })
  assert.equal(budget.remaining, 7)
})

test('unexpected HTML instead of a binary attachment is rejected', async () => {
  const h = fixture(), page = await h.list()
  h.responses.set('/files/output.docx', () => new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } }))
  await assert.rejects(h.client.download(page.items[2], 2), { code: 'IMPORT_UNSUPPORTED_FILE' })
})

test('page deadline aborts both active detail reads and prevents issuing remaining requests', async t => {
  const timers = new Map()
  t.mock.method(globalThis, 'setTimeout', (fn, ms) => { const key = {}; timers.set(key, { fn, ms }); return key })
  t.mock.method(globalThis, 'clearTimeout', key => timers.delete(key))
  const h = fixture(Array.from({ length: 20 }, (_, i) => ({ ...record, id: i + 9 })))
  let entered, count = 0
  const active = new Promise(resolve => { entered = resolve })
  for (let i = 9; i < 29; i++) h.responses.set(`/api/user/user/projectdetail/${i}`, ({ signal }) => new Promise((resolve, reject) => {
    if (++count === 2) entered()
    signal.addEventListener('abort', () => reject(new DOMException('deadline', 'AbortError')), { once: true })
  }))
  const pending = h.list(); await active
  const deadline = [...timers.values()].find(v => v.ms === 60000)
  assert.ok(deadline); deadline.fn()
  const page = await pending
  assert.equal(count, 2); assert.equal(page.pageState, 'partial'); assert.equal(page.items.length, 0)
  assert.equal(page.issues.length, 20)
})

test('record declared size mismatch is rejected after download, not saved as the selected original', async () => {
  const h = fixture()
  h.responses.set('/api/user/user/projectdetail/9', () => json({ ...record, file_output: [{ url: '/files/output.docx', size: 99 }] }))
  const page = await h.list()
  await assert.rejects(h.client.download(page.items[2], 2), { code: 'IMPORT_ITEM_CHANGED' })
})

test('a single file without Content-Length is bounded at 32 MiB regardless of total budget', async () => {
  const h = fixture(), page = await h.list()
  let cancelled = false
  h.responses.set('/files/output.docx', () => new Response(new ReadableStream({
    start(c) { c.enqueue(new Uint8Array(17 * 1024 * 1024)); c.enqueue(new Uint8Array(17 * 1024 * 1024)) }, cancel() { cancelled = true },
  })))
  await assert.rejects(h.client.download(page.items[2], 2), { code: 'IMPORT_TOO_LARGE' })
  assert.equal(cancelled, true)
})

test('a wrapper sibling attachment is listed instead of reported as complete empty materials', async () => {
  const h = fixture(), detail = { id: 9, folder_id: 2, user_id: 7, name: 'report',
    response: { data: { outputs: { answer: 'text' }, file_output: [{ url: '/files/output.docx', filename: 'report.docx', size: 6 }] } } }
  h.responses.set('/api/user/user/projectdetail/9', () => json(detail))
  const page = await h.list()
  assert.equal(page.items.length, 1); assert.equal(page.pageState, 'complete'); assert.deepEqual(page.issues, [])
  assert.equal(page.items[0].role, 'output'); assert.equal(page.items[0].fileName, 'report.docx')
  assert.equal((await h.client.download(page.items[0], 2)).toString(), 'output')
})

test('typed tool output follows the existing revision and no-Bearer download contract', async () => {
  const h = fixture(), detail = { id: 9, folder_id: 2, user_id: 7, name: 'report',
    outputs: { generated: [{ type: 'document', transfer_method: 'tool_file', url: '/files/output.docx', filename: 'report.docx' }] } }
  h.responses.set('/api/user/user/projectdetail/9', () => json(detail))
  const page = await h.list()
  assert.equal(page.items.length, 1); assert.equal(page.pageState, 'complete')
  assert.equal((await h.client.download(page.items[0], 2)).toString(), 'output')
  const request = h.calls.find(v => new URL(v.url).pathname === '/files/output.docx')
  assert.deepEqual(request.headers, {}); assert.equal(request.redirect, 'error')
  h.responses.set('/api/user/user/projectdetail/9', () => json({ ...detail, outputs: { generated: [{ ...detail.outputs.generated[0], filename: 'changed.docx' }] } }))
  await assert.rejects(h.client.download(page.items[0], 2), { code: 'IMPORT_ITEM_CHANGED' })
  assert.equal(h.calls.filter(v => new URL(v.url).pathname === '/files/output.docx').length, 1)
})

for (const key of ['data', 'outputs']) test(`named ${key} file remains visible and uses revision-safe attachment download`, async () => {
  const h = fixture(), file = { type: 'document', transfer_method: 'tool_file', url: '/files/output.docx', filename: 'report.docx' }
  const detail = { id: 9, folder_id: 2, user_id: 7, name: 'report', outputs: { [key]: file } }
  h.responses.set('/api/user/user/projectdetail/9', () => json(detail))
  const page = await h.list()
  assert.equal(page.items.length, 1); assert.equal(page.pageState, 'complete'); assert.deepEqual(page.issues, [])
  assert.equal(page.items[0].role, 'output'); assert.equal(page.items[0].fileName, 'report.docx')
  assert.equal((await h.client.download(page.items[0], 2)).toString(), 'output')
  const request = h.calls.find(v => new URL(v.url).pathname === '/files/output.docx')
  assert.deepEqual(request.headers, {}); assert.equal(request.redirect, 'error')
  h.responses.set('/api/user/user/projectdetail/9', () => json({ ...detail, outputs: { [key]: { ...file, filename: 'changed.docx' } } }))
  await assert.rejects(h.client.download(page.items[0], 2), { code: 'IMPORT_ITEM_CHANGED' })
  assert.equal(h.calls.filter(v => new URL(v.url).pathname === '/files/output.docx').length, 1)
})

for (const key of ['data', 'outputs']) for (const invalid of [
  { type: 'unknown' }, { transfer_method: 'unknown' }, { url: 'https://evil.example/files/a.pdf' },
]) test(`invalid named ${key} file cannot yield a complete empty page: ${JSON.stringify(invalid)}`, async () => {
  const h = fixture()
  h.responses.set('/api/user/user/projectdetail/9', () => json({ id: 9, folder_id: 2, user_id: 7, name: 'report',
    outputs: { [key]: { type: 'document', transfer_method: 'tool_file', url: '/files/output.docx', ...invalid } } }))
  const page = await h.list()
  assert.equal(page.pageState, 'partial'); assert.equal(page.items.length, 1)
  assert.equal(page.items[0].downloadable, false); assert.ok(page.items[0].reason)
  await assert.rejects(h.client.download(page.items[0], 2), { code: 'IMPORT_UNSUPPORTED_FILE' })
  assert.ok(!h.calls.some(v => new URL(v.url).pathname === '/files/output.docx'))
})
