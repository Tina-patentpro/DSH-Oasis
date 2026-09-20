import assert from 'node:assert/strict'
import test from 'node:test'
import { createOasisRemoteService } from '../src/oasis-remote-service.js'
import { normalizeOasisRuntimeConfig, registerOasisSettings } from '../src/oasis-runtime-config.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'

const ORIGIN = 'https://oasis-staging.example'
const NS = 'oasis-professional-service'
const DETAIL = { id: 39, name: 'synthetic-claims', apiType: 'Workflow', price: 3,
  modelName: '', executionMode: 'sync', inputFields: [], outputFields: [] }

function harness() {
  let revision = 0
  let value = { environmentKind: 'non-production', apiBaseUrl: ORIGIN, credentialOrigin: ORIGIN,
    credentialRef: 'OASIS_USER_JWT', outputDirectoryPrefix: 'keep', workspaceApiBindings: [] }
  const calls = []
  const registry = new Map(['a', 'b'].map(id => [id, { path: `D:\\synthetic\\${id}`, status: async () => 'ok' }]))
  const settings = {
    writable: true,
    describe() { return [{ ns: NS, revision, value: structuredClone(value) }] },
    async update(ns, patch, expected) {
      assert.equal(ns, NS)
      if (expected !== revision) throw Object.assign(new Error('settings conflict'), { code: 'SETTINGS_CONFLICT' })
      calls.push('write')
      value = { ...value, ...structuredClone(patch) }; revision++
    },
  }
  const client = {
    async getUserDetail() { calls.push('user'); return { id: 101 } },
    async getCategoryCatalog() { calls.push('catalog'); return [{ apiId: 39, apiEndpoint: 'synthetic-claims', apiProcess: 'one' }] },
    async getApiDetail() { calls.push('detail'); return structuredClone(DETAIL) },
    async getFolderDetail(id) { calls.push('folder'); return { id, name: 'same-name' } },
  }
  const runtime = { enabled: true, credentialConfigured: true, environmentKind: 'non-production',
    apiBaseOrigin: ORIGIN, client, assertCurrent: async () => {} }
  const forbidden = () => { throw new Error('Binding must not access business storage or materials') }
  const makeService = () => createOasisRemoteService({ repository: { get: forbidden, mutate: forbidden },
    materialManager: { recheckAll: forbidden, readForUpload: forbidden },
    settings, workspaceRegistry: { get: id => registry.get(id) },
    getRuntime: async () => runtime, clock: () => '2026-09-15T06:00:00.000Z',
    executionIdFactory: () => 'unused', runIdFactory: () => 'unused' })
  const service = makeService()
  async function request(id = 'a') {
    const detail = await service.getServiceDetail('synthetic-claims')
    return { workspaceId: id, workspacePath: registry.get(id).path,
      expectedSettingsRevision: revision, confirmed: true, accountId: 101,
      environmentKind: 'non-production', apiBaseOrigin: ORIGIN, folderId: 8,
      apiId: 39, apiEndpoint: 'synthetic-claims', apiProcess: 'one', schemaHash: detail.schemaHash }
  }
  return { service, reload: makeService, runtime, client, settings, registry, calls, request,
    value: () => structuredClone(value),
    change(patch) { value = { ...value, ...structuredClone(patch) }; revision++ } }
}

test('binding read is local, scoped, and explicitly unverified after reload', async () => {
  const h = harness()
  const req = await h.request()
  assert.equal(typeof h.service.bindWorkspace, 'function')
  await h.service.bindWorkspace(req)
  h.calls.length = 0
  const reloaded = h.reload()
  const a = await reloaded.getWorkspaceBinding({ workspaceId: 'a' })
  const b = await reloaded.getWorkspaceBinding({ workspaceId: 'b' })
  assert.equal(a.binding.accountId, 101)
  assert.equal(a.status, 'unverified')
  assert.equal(b.binding, null)
  assert.equal(b.status, 'unbound')
  assert.deepEqual(h.calls, [])
  assert.equal(h.value().outputDirectoryPrefix, 'keep')
  assert.equal(h.value().workspaceApiBindings.length, 1)
  assert.equal('raw' in a.binding, false)
  assert.equal('enabled' in a, false)
})

test('explicitly confirming B preserves A and uses native revision CAS', async () => {
  const h = harness()
  await h.service.bindWorkspace(await h.request('a'))
  const a = JSON.stringify(h.value().workspaceApiBindings[0])
  await h.service.bindWorkspace(await h.request('b'))
  assert.equal(h.value().workspaceApiBindings.length, 2)
  assert.equal(JSON.stringify(h.value().workspaceApiBindings[0]), a)
  assert.equal(h.calls.filter(c => c === 'write').length, 2)
})

test('stale display revision rejects before remote reads and does not overwrite preferences', async () => {
  const h = harness(); const req = await h.request()
  h.change({ outputDirectoryPrefix: 'user-new' }); h.calls.length = 0
  await assert.rejects(h.service.bindWorkspace(req), { code: 'SETTINGS_CONFLICT' })
  assert.deepEqual(h.calls, [])
  assert.equal(h.value().outputDirectoryPrefix, 'user-new')
})

test('late concurrent settings writer is preserved by provider CAS with no retry', async () => {
  const h = harness(); const req = await h.request()
  h.client.getFolderDetail = async id => { h.change({ outputDirectoryPrefix: 'concurrent' }); return { id, name: 'folder' } }
  await assert.rejects(h.service.bindWorkspace(req), { code: 'SETTINGS_CONFLICT' })
  assert.equal(h.value().outputDirectoryPrefix, 'concurrent')
  assert.equal(h.value().workspaceApiBindings.length, 0)
  assert.equal(h.calls.includes('write'), false)
})

test('native CAS conflict is a safe RPC failure rather than an unhandled transport exception', async () => {
  const h = harness(); const req = await h.request()
  h.settings.update = async () => { throw Object.assign(new Error('provider internal details'), { code: 'SETTINGS_CONFLICT' }) }
  const result = await createWorkbenchRpcHandler({}, h.service)('professional/binding/confirm', req)
  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'SETTINGS_CONFLICT')
  assert.equal(JSON.stringify(result).includes('provider internal'), false)
})

for (const [key, next, code] of [
  ['confirmed', false, 'INVALID_WORKSPACE_BINDING'],
  ['workspacePath', 'D:\\synthetic\\other', 'WORKSPACE_ROOT_CHANGED'],
  ['accountId', 202, 'REMOTE_ACCOUNT_MISMATCH'],
  ['apiBaseOrigin', 'https://other-staging.example', 'REMOTE_ENVIRONMENT_MISMATCH'],
  ['apiId', 40, 'REMOTE_SERVICE_MISMATCH'],
  ['apiProcess', 'different', 'REMOTE_SERVICE_MISMATCH'],
  ['schemaHash', 'a'.repeat(64), 'REMOTE_SCHEMA_CHANGED'],
]) {
  test(`rejects displayed ${key} drift without saving`, async () => {
    const h = harness(); const req = { ...await h.request(), [key]: next }
    await assert.rejects(h.service.bindWorkspace(req), { code })
    assert.equal(h.calls.includes('write'), false)
  })
}

test('rejects a same-name folder with the wrong id', async () => {
  const h = harness(); const req = await h.request()
  h.client.getFolderDetail = async () => ({ id: 99, name: 'same-name' })
  await assert.rejects(h.service.bindWorkspace(req), { code: 'REMOTE_FOLDER_MISMATCH' })
  assert.equal(h.calls.includes('write'), false)
})

test('late workspace replacement cannot acquire the old confirmation', async () => {
  const h = harness(); const req = await h.request()
  h.client.getFolderDetail = async id => {
    h.registry.set('a', { path: 'D:\\synthetic\\replaced', status: async () => 'ok' })
    return { id, name: 'folder' }
  }
  await assert.rejects(h.service.bindWorkspace(req), { code: 'WORKSPACE_ROOT_CHANGED' })
  assert.equal(h.calls.includes('write'), false)
})

test('unknown or missing workspace prevents any account or settings access', async () => {
  const h = harness(); const req = await h.request(); h.calls.length = 0
  h.registry.delete('a')
  await assert.rejects(h.service.bindWorkspace(req), { code: 'UNKNOWN_WORKSPACE' })
  await assert.rejects(h.service.getWorkspaceBinding({ workspaceId: 'a' }), { code: 'UNKNOWN_WORKSPACE' })
  h.registry.set('a', { path: req.workspacePath, status: async () => 'missing' })
  await assert.rejects(h.service.bindWorkspace(req), { code: 'WORKSPACE_MISSING' })
  assert.deepEqual(h.calls, [])
})

test('a final frozen-runtime failure prevents persisting earlier verified identity', async () => {
  const h = harness(); const req = await h.request()
  h.runtime.assertCurrent = async () => { throw Object.assign(new Error('changed'), { code: 'REMOTE_RUNTIME_CHANGED' }) }
  await assert.rejects(h.service.bindWorkspace(req), { code: 'REMOTE_RUNTIME_CHANGED' })
  assert.equal(h.calls.includes('write'), false)
})

test('workspace change during final credential verification cannot persist an old selection', async () => {
  const h = harness(); const req = await h.request()
  h.runtime.assertCurrent = async () => {
    h.registry.set('a', { path: 'D:\\synthetic\\late', status: async () => 'ok' })
  }
  await assert.rejects(h.service.bindWorkspace(req), { code: 'WORKSPACE_ROOT_CHANGED' })
  assert.equal(h.calls.includes('write'), false)
})

test('registered settings own the default empty binding list and reject invalid or duplicate records', async () => {
  let registration
  registerOasisSettings({ settings: { register(ns, schema, options) { registration = { ns, schema, options }; return {} } } })
  assert.deepEqual(registration.options.base.workspaceApiBindings, [])
  assert.throws(() => normalizeOasisRuntimeConfig({ workspaceApiBindings: [{ workspaceId: 'a', token: 'synthetic' }] }))
  const h = harness(); await h.service.bindWorkspace(await h.request())
  const binding = h.value().workspaceApiBindings[0]
  assert.doesNotThrow(() => normalizeOasisRuntimeConfig({ workspaceApiBindings: [binding] }))
  assert.throws(() => normalizeOasisRuntimeConfig({ workspaceApiBindings: [binding, binding] }))
})
