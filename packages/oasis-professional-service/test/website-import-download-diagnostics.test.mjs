import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createWebsiteImportClient, WebsiteImportError } from '../src/website-import-client.js'
import { createWebsiteImportService } from '../src/website-import-service.js'
import { importResponses, IMPORT_PROTOCOL_VERSION } from '../src/website-import-contract.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { createWorkbenchRemote } from '../src/client/workbench-remote.js'
import { createWebsiteImportController } from '../src/client/website-import-controller.js'
import * as ui from '../src/client/WebsiteImportDialog.js'

const secret = 'private-test-marker'
const origin = 'https://lzhxpy.oasisintwrite.com'
const safe = { endpoint: 'history-attachment', stage: 'response', kind: 'http', httpStatus: 404 }
const oldRow = { key: 'fixture', fileName: 'claims.docx', status: 'failed', code: 'IMPORT_REQUEST_FAILED' }
async function fixture(t, response) {
  const root = await mkdtemp(join(tmpdir(), 'oasis-download-diagnostics-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, 'claims.docx'), 'protected old bytes')
  let revision = 0, value = { websiteProjectLinks: [], workspaceApiBindings: [] }
  const calls = []
  const client = createWebsiteImportClient({ accountId: 7, resolveToken: async () => secret, fetchImpl: async (url, options) => {
    const path = new URL(url).pathname; calls.push({ path, ...options })
    if (path === '/files/claims.docx') return response()
    const data = path === '/api/user/user/folderdetail/2' ? { id: 2, owner_id: 7, name: 'fixture' }
      : path === '/api/user/user/folderlist' ? { total: 1, items: [{ id: 2, name: 'fixture' }] }
        : path === '/api/user/user/projectlist' ? { total: 1, items: [{ id: 9, folder_id: 2 }] }
          : path === '/api/user/user/projectdetail/9' ? { id: 9, folder_id: 2, file_url: origin + '/files/claims.docx' } : null
    assert.ok(data, 'Unexpected synthetic endpoint: ' + path)
    return Response.json({ code: 200, data })
  } })
  const provider = { ...client }
  const service = createWebsiteImportService({ workspaceRegistry: { get: id => id === 'a' ? { path: root, status: async () => 'ok' } : null },
    accountService: { status: async () => ({ authenticated: true, accountId: 7, revision: 'r1' }), captureToken: async () => async () => secret },
    settings: { writable: true, describe: () => [{ ns: 'oasis-professional-service', revision, value }],
      update: async (_, patch, expected) => { assert.equal(expected, revision); value = { ...value, ...patch }; revision++ } },
    createClient: () => provider })
  const handler = createWorkbenchRpcHandler({}, null, null, service)
  const remote = createWorkbenchRemote({ rpc: { call: (_, endpoint, input) => handler(endpoint.replace('oasis-workbench/', ''), input) } })
  const controller = createWebsiteImportController({ remote, getWorkspaceId: () => 'a', getAccountRevision: () => 'r1' })
  assert.equal(await controller.start(), true)
  assert.equal(await controller.selectProject({ id: 2, name: 'fixture' }), true)
  controller.toggle(controller.getSnapshot().items[0].key)
  return { root, calls, provider, controller }
}
async function commit(h) {
  assert.equal(await h.controller.commit(), true)
  const result = h.controller.getSnapshot().result
  assert.equal(result.status, 'partial')
  const journalText = await readFile(join(h.root, result.manifest), 'utf8')
  const journal = journalText.trim().split('\n').map(line => JSON.parse(line))
  assert.doesNotMatch(journalText, new RegExp(secret))
  assert.equal(journal.some(row => row.kind === 'intent'), false)
  assert.equal(journal.at(-1).status, 'partial')
  assert.equal(await readFile(join(h.root, 'claims.docx'), 'utf8'), 'protected old bytes')
  assert.deepEqual((await readdir(h.root)).sort(), [result.manifest, 'claims.docx'].sort())
  assert.deepEqual(journal.find(row => row.kind === 'result'), { kind: 'result', ...result.items[0] })
  assert.equal(await h.controller.commit(), false)
  return result.items[0]
}
for (const [label, response, details] of [
  ['HTTP', () => new Response(secret, { status: 404 }), safe],
  ['network', () => { throw new Error(secret) }, { endpoint: 'history-attachment', stage: 'request', kind: 'network' }],
  ['timeout', () => { throw new DOMException(secret, 'AbortError') }, { endpoint: 'history-attachment', stage: 'request', kind: 'timeout' }],
]) test(`failed output ${label} diagnostics survive real service, RPC, controller and journal without retry`, async t => {
  const h = await fixture(t, response), row = await commit(h)
  assert.equal(row.code, 'IMPORT_REQUEST_FAILED')
  assert.deepEqual(row.details, details)
  const downloads = h.calls.filter(call => call.path === '/files/claims.docx')
  assert.equal(downloads.length, 1)
  assert.deepEqual(downloads[0].headers, {})
  assert.equal(downloads[0].method, 'GET'); assert.equal(downloads[0].redirect, 'error')
})
test('per-item catch resanitizes polluted WebsiteImportError details before journaling', async t => {
  const h = await fixture(t, () => new Response('unused'))
  const error = new WebsiteImportError('IMPORT_REQUEST_FAILED')
  error.details = { ...safe, token: secret, url: secret, message: secret, stack: secret, response: secret }
  h.provider.download = async () => { throw error }
  assert.deepEqual((await commit(h)).details, safe)
})
for (const [label, error] of [
  ['generic error', Object.assign(new Error(secret, { cause: secret }), { details: safe })],
  ['empty diagnostics', new WebsiteImportError('IMPORT_REQUEST_FAILED', { url: secret, httpStatus: 999 })],
]) test(`${label} does not expose raw errors or add empty details to legacy rows`, async t => {
  const h = await fixture(t, () => new Response('unused'))
  h.provider.download = async () => { throw error }
  const row = await commit(h)
  assert.equal(row.code, label === 'generic error' ? 'IMPORT_IO_OR_REQUEST_FAILED' : 'IMPORT_REQUEST_FAILED')
  assert.equal(Object.hasOwn(row, 'details'), false)
})
test('V2 commit accepts only whitelisted optional diagnostics and retains legacy rows', () => {
  const parse = row => importResponses.commit.safeParse({ workspaceId: 'a', folderId: 2, associationStatus: 'saved', status: 'partial', manifest: 'fixture.jsonl', items: [row] })
  assert.equal(IMPORT_PROTOCOL_VERSION, 2)
  assert.equal(parse(oldRow).success, true)
  assert.equal(parse({ ...oldRow, details: safe }).success, true)
  for (const details of [{ ...safe, url: secret }, { ...safe, httpStatus: 999 }, { ...safe, kind: secret }, { ...safe, stage: secret }, { ...safe, endpoint: secret }]) {
    assert.equal(parse({ ...oldRow, details }).success, false)
  }
})
test('actual failed-result row renders localized safe diagnostics as escaped text', () => {
  assert.equal(typeof ui.WebsiteImportResultItem, 'function')
  const markup = renderToStaticMarkup(createElement(ui.WebsiteImportResultItem, { row: {
    ...oldRow, fileName: '<img onerror="bad">.docx', details: { ...safe, token: secret, url: secret, response: secret },
  } }))
  assert.match(markup, /未完成/); assert.match(markup, /IMPORT_REQUEST_FAILED/)
  assert.match(markup, /历史附件下载/); assert.match(markup, /接口响应失败/)
  assert.match(markup, /响应状态/); assert.match(markup, /HTTP 404/)
  assert.match(markup, /不会自动重试/)
  assert.match(markup, /&lt;img/); assert.doesNotMatch(markup, /<img|private-test-marker/)
})
test('legacy failed and saved/skipped result rows retain their previous output', () => {
  assert.equal(typeof ui.WebsiteImportResultItem, 'function')
  assert.equal(renderToStaticMarkup(createElement(ui.WebsiteImportResultItem, { row: oldRow })), '<p>未完成：claims.docx（IMPORT_REQUEST_FAILED）</p>')
  for (const [status, label] of [['saved', '已保存'], ['skipped', '相同内容已跳过']]) {
    const markup = renderToStaticMarkup(createElement(ui.WebsiteImportResultItem, { row: { key: 'fixture', fileName: 'claims.docx', status, details: safe } }))
    assert.equal(markup, `<p>${label}：claims.docx</p>`)
  }
})
