import test from 'node:test'
import assert from 'node:assert/strict'
import { createWebsiteImportClient, WebsiteImportError } from '../src/website-import-client.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { createWorkbenchRemote } from '../src/client/workbench-remote.js'
import { createWebsiteImportController } from '../src/client/website-import-controller.js'

const ticket = '00000000-0000-4000-8000-000000000001'
const args = { token: ticket, folderId: 2, kind: 'records', page: 1 }
function clientWith(response) {
  const paths = []
  const client = createWebsiteImportClient({ accountId: 7, resolveToken: async () => 'private-token', fetchImpl: async url => {
    const path = new URL(url).pathname; paths.push(path)
    if (path === '/api/user/user/folderdetail/2') return Response.json({ code: 200, data: { id: 2, owner_id: 7, name: 'fixture' } })
    assert.equal(path, '/api/user/user/projectlist')
    return response()
  } })
  return { client, paths }
}

for (const status of [401, 403, 404, 500]) test(`record list HTTP ${status} is distinguishable without body or credentials`, async () => {
  const h = clientWith(() => new Response('private-body', { status }))
  const remote = createWorkbenchRemote({ rpc: { call: async (_, endpoint, input) => {
    const handler = createWorkbenchRpcHandler({}, null, null, { items: () => h.client.listItems(input) })
    return handler(endpoint.replace('oasis-workbench/', ''), input)
  } } })
  await assert.rejects(remote.websiteImport('items', args), error => {
    assert.equal(error.code, status === 401 || status === 403 ? 'AUTH_REQUIRED' : 'IMPORT_REQUEST_FAILED')
    assert.deepEqual(error.details, { endpoint: 'history-list', stage: 'response', kind: 'http', httpStatus: status })
    assert.doesNotMatch(JSON.stringify(error), /private-token|private-body|https:/)
    return true
  })
  assert.deepEqual(h.paths, ['/api/user/user/folderdetail/2', '/api/user/user/projectlist'])
})

for (const [name, response, details] of [
  ['network', () => { throw new TypeError('private-host private-token') }, { endpoint: 'history-list', stage: 'request', kind: 'network' }],
  ['timeout', () => { throw new DOMException('private-token', 'AbortError') }, { endpoint: 'history-list', stage: 'request', kind: 'timeout' }],
  ['invalid JSON', () => new Response('<html>private-body</html>'), { endpoint: 'history-list', stage: 'json', kind: 'json', httpStatus: 200 }],
  ['invalid pagination', () => Response.json({ success: true, data: { items: [] } }), { endpoint: 'history-list', stage: 'validation', kind: 'contract', httpStatus: 200 }],
  ['wrong file project', () => Response.json({ success: true, data: { items: [{ id: 9, folder_id: 3 }], total: 1 } }), { endpoint: 'history-list', stage: 'validation', kind: 'ownership', httpStatus: 200 }],
]) test(`record list ${name} has a bounded diagnostic and never retries`, async () => {
  const h = clientWith(response)
  await assert.rejects(h.client.listItems(args), error => {
    assert.deepEqual(error.details, details)
    assert.doesNotMatch(JSON.stringify(error), /private-token|private-host|private-body|https:/)
    return true
  })
  assert.deepEqual(h.paths, ['/api/user/user/folderdetail/2', '/api/user/user/projectlist'])
})

test('project ownership failure is attributed to detail, not an unissued file-list request', async () => {
  let calls = 0
  const c = createWebsiteImportClient({ accountId: 7, resolveToken: async () => 'private-token', fetchImpl: async () => {
    calls++; return Response.json({ code: 200, data: { id: 2, owner_id: 8 } })
  } })
  await assert.rejects(c.listItems(args), error => {
    assert.deepEqual(error.details, { endpoint: 'project-detail', stage: 'validation', kind: 'ownership', httpStatus: 200 }); return true
  })
  assert.equal(calls, 1)
})

test('documented unsuccessful file envelope cannot be promoted to an empty successful list', async () => {
  const h = clientWith(() => Response.json({ success: false, error: { message: 'private-body' }, data: { items: [], total: 0 } }))
  await assert.rejects(h.client.listItems(args), { code: 'IMPORT_INVALID_RESPONSE' })
})

test('RPC diagnostics whitelist is applied even when an error object was polluted after construction', async () => {
  const error = new WebsiteImportError('IMPORT_REQUEST_FAILED')
  error.details = { endpoint: 'history-list', stage: 'response', kind: 'http', httpStatus: 404, token: 'private-token', response: 'private-body', url: 'https://private-host' }
  const handler = createWorkbenchRpcHandler({}, null, null, { items: async () => { throw error } })
  const result = await handler('import/items', args)
  assert.deepEqual(result.error.details, { endpoint: 'history-list', stage: 'response', kind: 'http', httpStatus: 404 })
  error.details = { endpoint: 'private-token', stage: 'private-body', kind: 'private-host', httpStatus: 999 }
  assert.deepEqual((await handler('import/items', args)).error.details, {})
})

test('UI reports a failed record-page read while retaining the previously labeled page', async () => {
  const history = { key: 'history:9:text', revision: 'a'.repeat(64), recordId: 9, role: 'text', inputField: null,
    name: 'fixture', fileName: 'fixture_OIW.md', kind: 'text', size: 1, downloadable: true, reason: null }
  let failedCalls = 0
  const remote = { websiteImport: async (action, payload) => {
    if (action === 'open') return { protocolVersion: 2, token: ticket, workspaceId: 'a', accountRevision: 'r1' }
    if (action === 'projects') return { items: [{ id: 2, name: 'fixture' }], total: 1 }
    if (payload.page === 1) return { folderId: 2, items: [history], total: 21, recordIds: [9], pageState: 'complete', issues: [] }
    failedCalls++
    throw { code: 'IMPORT_REQUEST_FAILED', details: { endpoint: 'history-list', stage: 'response', kind: 'http', httpStatus: 404, message: 'private-token' } }
  } }
  const controller = createWebsiteImportController({ remote, getWorkspaceId: () => 'a', getAccountRevision: () => 'r1' })
  await controller.start(); await controller.selectProject({ id: 2, name: 'fixture' })
  assert.equal(await controller.items({ page: 2 }), false)
  const state = controller.getSnapshot()
  assert.match(state.error, /历史内容列表/); assert.match(state.error, /HTTP 404/)
  assert.doesNotMatch(state.error, /private-token/)
  assert.equal(state.itemPage, 1); assert.deepEqual(state.items, [history])
  assert.deepEqual(state.selected, [])
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(failedCalls, 1)
})
