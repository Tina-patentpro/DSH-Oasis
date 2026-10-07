import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { registerWorkbenchRoutes } from '../src/workbench-connection.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { createWorkbenchRemote } from '../src/client/workbench-remote.js'
import { FunctionCenter } from '../src/client/FunctionCenter.js'
const mod = await import('../src/client/website-import-controller.js').catch(() => ({}))
const ui = await import('../src/client/WebsiteImportDialog.js').catch(() => ({}))
test('import owns five exact routes, validates commands and sanitizes failures', async () => {
  const routes = []
  const dispose = registerWorkbenchRoutes({ fetch: { register: r => { routes.push(r.path); return () => {} } } }, () => {})
  for (const action of ['open', 'projects', 'items', 'commit', 'unlink']) assert.ok(routes.includes('/api/oasis-workbench/import/' + action))
  const handler = createWorkbenchRpcHandler({}, null, null, { open: async () => { throw Error('private-token') } })
  const bad = await handler('import/commit', { token: 'x', url: 'http://evil' })
  assert.equal(bad.ok, false)
  const failed = await handler('import/open', { workspaceId: 'a', confirmed: true })
  assert.equal(failed.ok, false); assert.ok(!JSON.stringify(failed).includes('private-token'))
  await dispose()
})
test('remote import validates result schema and command scope', async () => {
  const remote = createWorkbenchRemote({ rpc: { call: async () => ({ ok: true, value: {} }) } })
  assert.equal(typeof remote.websiteImport, 'function')
  await assert.rejects(remote.websiteImport('open', { workspaceId: 'a', confirmed: true }))
})
function harness() {
  assert.equal(typeof mod.createWebsiteImportController, 'function')
  let workspaceId = 'a', accountRevision = 'r1'
  const calls = [], rows = [{ key: 'history:9:text', fileName: 'claims_OIW.md', downloadable: true, role: 'text', recordId: 9, revision: 'a'.repeat(64) }]
  const remote = { websiteImport: async (action, payload) => {
    calls.push({ action, payload })
    if (action === 'open') return { protocolVersion: 2, token: 'ticket', workspaceId, accountRevision, workspacePath: 'D:\\a', settingsRevision: 3, link: { folderId: 2, folderName: 'x' } }
    if (action === 'unlink') return { workspaceId, status: 'unlinked' }
    if (action === 'projects') return { items: [{ id: 2, name: 'x' }], total: 1 }
    if (action === 'items') return { items: structuredClone(rows), folderId: payload.folderId, total: 1, recordIds: [9], pageState: 'complete', issues: [] }
    return { workspaceId, folderId: 2, status: 'completed', items: [{ key: rows[0].key, fileName: rows[0].fileName, status: 'saved' }] }
  } }
  const controller = mod.createWebsiteImportController({ remote, getWorkspaceId: () => workspaceId, getAccountRevision: () => accountRevision })
  return { controller, remote, calls, change: () => { workspaceId = 'b' } }
}

test('zero selections can associate even when optional item listing fails', async () => {
  const h = harness(); await h.controller.start()
  const base = h.remote.websiteImport
  h.remote.websiteImport = async (action, payload) => { if (action === 'items') throw { code: 'IMPORT_REQUEST_FAILED' }; return base(action, payload) }
  await h.controller.selectProject({ id: 2, name: 'x' })
  assert.ok(h.controller.getSnapshot().error)
  assert.equal(await h.controller.commit(), true)
  assert.deepEqual(h.calls.at(-1).payload.keys, []); assert.deepEqual(h.calls.at(-1).payload.versions, {})
})

test('unlink needs explicit confirmation, sends settings revision and clears stale selection', async () => {
  const h = harness(); await h.controller.start(); await h.controller.selectProject({ id: 2, name: 'x' })
  h.controller.toggle('history:9:text')
  assert.equal(await h.controller.unlink(), false)
  assert.equal(h.calls.some(x => x.action === 'unlink'), false)
  assert.equal(await h.controller.unlink({ confirmed: true }), true)
  assert.deepEqual(h.calls.at(-1).payload, { token: 'ticket', expectedSettingsRevision: 3, confirmed: true })
  assert.equal(h.controller.getSnapshot().session, null)
  assert.deepEqual(h.controller.getSnapshot().selected, [])
  assert.match(h.controller.getSnapshot().notice, /解除/)
})

test('project listing failure retains association so explicit unlink is still available', async () => {
  const h = harness(), base = h.remote.websiteImport
  h.remote.websiteImport = async (action, payload) => { if (action === 'projects') throw { code: 'IMPORT_REQUEST_FAILED' }; return base(action, payload) }
  assert.equal(await h.controller.start(), false)
  assert.equal(h.controller.getSnapshot().session.link.folderId, 2)
  assert.equal(await h.controller.unlink({ confirmed: true }), true)
})

test('shared workspace busy error keeps association and never retries unlink automatically', async () => {
  const h = harness(); await h.controller.start()
  let calls = 0
  h.remote.websiteImport = async () => { calls++; throw { code: 'WORKSPACE_OPERATION_BUSY' } }
  assert.equal(await h.controller.unlink({ confirmed: true }), false)
  assert.equal(h.controller.getSnapshot().session.link.folderId, 2)
  assert.match(h.controller.getSnapshot().error, /不会自动重试/)
  assert.equal(h.controller.getSnapshot().notice, null)
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(calls, 1)
})
test('no mount reads; explicit project selection and checked items drive import to frozen workspace', async () => {
  const h = harness(); assert.deepEqual(h.calls, [])
  await h.controller.start(); await h.controller.selectProject({ id: 2, name: 'x' })
  assert.equal(h.controller.getSnapshot().selected.length, 0)
  h.controller.toggle('history:9:text')
  await h.controller.commit()
  assert.deepEqual(h.calls.at(-1).payload, { token: 'ticket', folderId: 2, keys: ['history:9:text'], versions: { 'history:9:text': 'a'.repeat(64) }, confirmed: true })
  assert.equal(h.controller.getSnapshot().result.status, 'completed')
})
test('late response after Workspace changes cannot import into new project', async () => {
  const h = harness(); await h.controller.start()
  let finish
  h.remote.websiteImport = () => new Promise(resolve => { finish = resolve })
  const pending = h.controller.selectProject({ id: 2, name: 'x' })
  h.change(); finish({ items: [], total: 0, folderId: 2, recordIds: [], pageState: 'complete', issues: [] }); await pending
  assert.equal(h.controller.getSnapshot().session, null)
  assert.equal(await h.controller.commit(), false)
})
test('function center exposes import and dialog states local target without website navigation', () => {
  const html = renderToStaticMarkup(createElement(FunctionCenter, { state: { catalogStatus: 'ready', workflows: [] }, onImport: () => {} }))
  assert.match(html, /从网站导入/)
  assert.equal(typeof ui.WebsiteImportDialog, 'function')
  const account = { credentialConfigured: true, accountId: 7, accountRevision: 'r' }
  const dialog = renderToStaticMarkup(createElement(ui.WebsiteImportDialog, { workspaceId: 'a', remote: {},
    accountController: { subscribe: () => () => {}, getSnapshot: () => account }, onClose: () => {} }))
  assert.match(dialog, /<dialog/); assert.match(dialog, /无需打开网站/); assert.doesNotMatch(dialog, /<iframe|href=/)
})
