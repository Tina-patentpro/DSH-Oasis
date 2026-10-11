import test from 'node:test'
import assert from 'node:assert/strict'
import { createWebsiteImportController } from '../src/client/website-import-controller.js'
import { createWorkbenchRemote } from '../src/client/workbench-remote.js'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as view from '../src/client/WebsiteImportDialog.js'
import { createWebsiteImportClient } from '../src/website-import-client.js'

test('real record eligibility renders signed tools disabled and controller cannot select them', async () => {
  const h = fixture()
  const client = createWebsiteImportClient({ accountId: 7, resolveToken: async () => 'synthetic-token', fetchImpl: async url => {
    const path = new URL(url).pathname
    if (path === '/api/user/user/folderdetail/2') return Response.json({ data: { id: 2, owner_id: 7, name: 'project' } })
    if (path === '/api/user/user/projectlist') return Response.json({ data: { total: 1, item: [{ id: 9, folder_id: 2 }] } })
    assert.equal(path, '/api/user/user/projectdetail/9')
    return Response.json({ data: { id: 9, folder_id: 2, user_id: 7, file_url: '/uploads/workflow/claims.docx',
      outputs: { claims_docx: [{ type: 'document', transfer_method: 'tool_file', filename: 'claims.docx', size: 4,
        url: '/files/tools/claims.docx?timestamp=1&nonce=synthetic&sign=fixture' }] } } })
  } })
  const page = await client.listItems({ folderId: 2, kind: 'records' })
  h.rows.splice(0, h.rows.length, ...page.items.map(({ url, sourceId, ...row }) => ({ ...row, recordId: sourceId })))
  await h.controller.start(); await h.controller.selectProject({ id: 2, name: 'project' }); h.controller.filter('output')
  const state = h.controller.getSnapshot(), disabled = state.items.find(v => !v.downloadable)
  assert.ok(disabled)
  h.controller.toggle(disabled.key)
  assert.deepEqual(h.controller.getSnapshot().selected, [])
  const html = renderToStaticMarkup(createElement(view.WebsiteRecordItems, { state, onToggle: () => {} }))
  assert.match(html, /disabled=""/); assert.match(html, /工具资源地址/)
  assert.match(html, /大小待下载核实/)
  assert.doesNotMatch(html, /timestamp|nonce|sign|synthetic|fixture/)
})
function fixture(version = 2) {
  const calls = [], rows = ['text', 'input', 'output'].map((role, i) => ({ key: `${role}:9`, role, recordId: 9, revision: 'a'.repeat(64), fileName: `${role}.txt`, downloadable: true }))
  const remote = { websiteImport: async (action, payload) => {
    calls.push({ action, payload })
    if (action === 'open') return { protocolVersion: version, token: 'ticket', workspaceId: 'a', accountRevision: 'r1' }
    if (action === 'projects') return { total: 1, items: [{ id: 2, name: 'project' }] }
    if (action === 'items') return { folderId: payload.folderId, total: 21, items: structuredClone(payload.page === 2 ? [{ ...rows[0], key: 'text:10', recordId: 10 }] : rows), recordIds: payload.page === 2 ? [10] : [9], pageState: 'complete', issues: [] }
    if (action === 'commit') return { workspaceId: 'a', folderId: 2, associationStatus: 'saved', status: 'partial', items: [] }
  } }
  const controller = createWebsiteImportController({ remote, getWorkspaceId: () => 'a', getAccountRevision: () => 'r1' })
  return { controller, calls, rows, remote }
}

test('role filters never issue requests and selection retains full snapshots across pages', async () => {
  const h = fixture(); await h.controller.start(); await h.controller.selectProject({ id: 2, name: 'project' })
  const before = h.calls.length
  assert.equal(h.controller.filter('input'), true); assert.equal(h.controller.filter('output'), true)
  assert.equal(h.calls.length, before)
  h.controller.toggle('input:9'); await h.controller.items({ page: 2 }); h.controller.toggle('text:10')
  assert.deepEqual(h.controller.getSnapshot().selectedRows.map(v => v.fileName), ['input.txt', 'text.txt'])
  await h.controller.commit()
  assert.deepEqual(h.calls.at(-1).payload.versions, { 'input:9': 'a'.repeat(64), 'text:10': 'a'.repeat(64) })
})

test('changed selected revision is deselected with an explicit reselect notice', async () => {
  const h = fixture(); await h.controller.start(); await h.controller.selectProject({ id: 2, name: 'project' })
  h.controller.toggle('input:9'); h.rows[1] = { ...h.rows[1], revision: 'b'.repeat(64) }
  await h.controller.items()
  assert.deepEqual(h.controller.getSnapshot().selected, [])
  assert.match(h.controller.getSnapshot().notice, /重新选择/)
})

test('old Host protocol is disabled before any list or import request', async () => {
  const h = fixture(1)
  assert.equal(await h.controller.start(), false)
  assert.equal(h.controller.getSnapshot().session, null)
  assert.deepEqual(h.calls.map(c => c.action), ['open'])
})

test('remote exposes protocol mismatch rather than permitting an old Host response', async () => {
  const remote = createWorkbenchRemote({ rpc: { call: async () => ({ ok: true, value: { protocolVersion: 1 } }) } })
  await assert.rejects(remote.websiteImport('open', { workspaceId: 'a', confirmed: true }), { code: 'IMPORT_PROTOCOL_MISMATCH' })
})

test('unavailable record re-read clears its stale selection without substituting other materials', async () => {
  const h = fixture(); await h.controller.start(); await h.controller.selectProject({ id: 2, name: 'project' }); h.controller.toggle('input:9')
  h.rows.splice(0)
  await h.controller.items()
  assert.deepEqual(h.controller.getSnapshot().selected, [])
})

test('record view exposes partial read failures, local role labels and cross-page selection provenance', () => {
  assert.equal(typeof view.WebsiteRecordItems, 'function')
  const state = { role: 'input', pageState: 'partial', items: [{ key: 'x', role: 'input', recordId: 9, name: 'record', fileName: '<script>.txt',
    inputField: 'material', size: null, downloadable: true, reason: null }], selected: ['x'], selectedRows: [{ key: 'x', role: 'input', recordId: 9, fileName: '<script>.txt' }],
    issues: [{ recordId: 10, code: 'IMPORT_REQUEST_FAILED', details: { httpStatus: 404 } }] }
  const html = renderToStaticMarkup(createElement(view.WebsiteRecordItems, { state, onToggle: () => {} }))
  assert.match(html, /部分记录或材料无法读取/); assert.match(html, /HTTP 404/); assert.match(html, /记录 9/)
  assert.match(html, /已选清单/); assert.match(html, /输入材料/); assert.doesNotMatch(html, /<script>/)
})

test('empty partial page never claims there are no materials', () => {
  assert.equal(typeof view.WebsiteRecordItems, 'function')
  const html = renderToStaticMarkup(createElement(view.WebsiteRecordItems, { state: { role: 'output', pageState: 'partial', items: [], selected: [], selectedRows: [], issues: [] }, onToggle: () => {} }))
  assert.match(html, /不能判断是否没有材料/)
  assert.doesNotMatch(html, /本页没有可识别材料/)
})

test('a second project selection while reading cannot change scope before a late response', async () => {
  const h = fixture(); await h.controller.start()
  const base = h.remote.websiteImport
  let finish, entered
  const ready = new Promise(resolve => { entered = resolve })
  h.remote.websiteImport = async (action, payload) => {
    if (action !== 'items') return base(action, payload)
    entered(); await new Promise(resolve => { finish = resolve }); return base(action, payload)
  }
  const pending = h.controller.selectProject({ id: 2, name: 'first' }); await ready
  assert.equal(await h.controller.selectProject({ id: 3, name: 'second' }), false)
  assert.equal(h.controller.getSnapshot().project.id, 2)
  finish(); await pending
  assert.equal(h.controller.getSnapshot().project.id, 2)
})

test('fatal ownership failure clears old selectable materials instead of retaining a misleading list', async () => {
  const h = fixture(); await h.controller.start(); await h.controller.selectProject({ id: 2, name: 'first' })
  h.controller.toggle('input:9')
  h.remote.websiteImport = async () => { throw { code: 'IMPORT_OWNERSHIP' } }
  assert.equal(await h.controller.items(), false)
  const state = h.controller.getSnapshot()
  assert.equal(state.session, null); assert.deepEqual(state.selected, []); assert.deepEqual(state.items, [])
  assert.match(state.error, /归属/)
})

test('failed new-project read retries its first page rather than the old project page', async () => {
  const h = fixture(); await h.controller.start(); await h.controller.selectProject({ id: 2, name: 'A' })
  await h.controller.items({ page: 3 }); h.controller.toggle('input:9')
  const original = h.remote.websiteImport; let fail = true
  h.remote.websiteImport = async (action, payload) => {
    if (action === 'items' && payload.folderId === 3 && fail) { fail = false; throw { code: 'IMPORT_REQUEST_FAILED' } }
    return original(action, payload)
  }
  assert.equal(await h.controller.selectProject({ id: 3, name: 'B' }), false)
  const failed = h.controller.getSnapshot()
  assert.equal(failed.project.id, 3); assert.equal(failed.itemPage, 1)
  assert.deepEqual(failed.items, []); assert.deepEqual(failed.selectedRows, []); assert.equal(failed.pageState, null)
  assert.ok(failed.error)
  assert.equal(await h.controller.items(), true)
  assert.deepEqual(h.calls.at(-1).payload, { token: 'ticket', folderId: 3, kind: 'records', page: 1 })
})

test('failed same-project pagination retains the prior successful page and explicit retry target', async () => {
  const h = fixture(); await h.controller.start(); await h.controller.selectProject({ id: 2, name: 'A' })
  h.controller.toggle('input:9'); const before = h.controller.getSnapshot()
  const original = h.remote.websiteImport; let fail = true
  h.remote.websiteImport = async (action, payload) => {
    if (action === 'items' && fail) { fail = false; throw { code: 'IMPORT_REQUEST_FAILED' } }
    return original(action, payload)
  }
  assert.equal(await h.controller.items({ page: 2 }), false)
  const failed = h.controller.getSnapshot()
  assert.equal(failed.itemPage, 1); assert.deepEqual(failed.items, before.items); assert.deepEqual(failed.selectedRows, before.selectedRows)
  assert.equal(await h.controller.items(), true); assert.equal(h.calls.at(-1).payload.page, 1)
})
