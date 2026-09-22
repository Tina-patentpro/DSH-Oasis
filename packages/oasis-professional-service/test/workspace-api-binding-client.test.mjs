import assert from 'node:assert/strict'
import test from 'node:test'
import { createWorkspaceApiBindingController } from '../src/client/workspace-api-binding-controller.js'

function harness() {
  let workspaceId = 'a', config = { canSubmit: true, settingsWritable: true }
  const calls = []
  const options = { workspaceId: 'a', workspacePath: 'D:\\test\\a', settingsRevision: 7, apiBaseOrigin: 'https://api.example',
    environmentKind: 'non-production', accountId: 1, services: [{ apiId: 2, apiEndpoint: 'claims', apiProcess: 'one' }], folders: [{ id: 3, name: 'folder' }] }
  const detail = { id: 2, name: 'claims', schemaHash: 'a'.repeat(64) }
  const remote = { getBindingOptions: async () => { calls.push('read'); return options },
    getProfessionalDetail: async () => detail,
    confirmWorkspaceBinding: async p => { calls.push(p); return { status: 'unverified', binding: { ...p, folderName: 'folder' } } } }
  const controller = createWorkspaceApiBindingController({ remote, getWorkspaceId: () => workspaceId, getConfiguration: () => config })
  return { controller, calls, remote, detail, changeWorkspace: () => { workspaceId = 'b' }, changeConfig: () => { config = { ...config } } }
}

test('binding controller requires explicit metadata read, service/folder selection and confirmation', async () => {
  const h = harness(); assert.equal(h.calls.length, 0)
  await h.controller.read(); await assert.rejects(h.controller.confirm(false))
  await h.controller.selectService('claims'); h.controller.selectFolder('3')
  await assert.rejects(h.controller.confirm(false)); await h.controller.confirm(true)
  assert.equal(h.calls.length, 2)
  assert.equal(h.calls[1].workspaceId, 'a'); assert.equal(h.calls[1].accountId, 1)
  assert.equal(h.calls[1].expectedSettingsRevision, 7); assert.equal(h.calls[1].schemaHash, 'a'.repeat(64))
})

for (const kind of ['Workspace', 'Config']) test(`changed ${kind} prevents binding, even without a render notification`, async () => {
  const h = harness(); await h.controller.read(); await h.controller.selectService('claims'); h.controller.selectFolder('3')
  h[`change${kind}`](); await assert.rejects(h.controller.confirm(true))
  assert.deepEqual(h.calls, ['read'])
})

test('late detail after invalidation is discarded and not assigned to another project', async () => {
  const h = harness(); let release
  h.remote.getProfessionalDetail = () => new Promise(resolve => { release = resolve })
  await h.controller.read(); const job = h.controller.selectService('claims')
  h.changeWorkspace(); h.controller.invalidate(); release(h.detail)
  await job; assert.equal(h.controller.getSnapshot().detail, null)
})
