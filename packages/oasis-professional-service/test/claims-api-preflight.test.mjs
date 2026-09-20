import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { fixtureHarness } from './unified-generation-harness.mjs'
import { createOasisRemoteService } from '../src/oasis-remote-service.js'
import { createOasisApiClient, normalizeApiDetail } from '../src/oasis-api-contract.js'
import { canonicalJson } from '../src/local-mock-runner.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { registerWorkbenchRoutes } from '../src/workbench-connection.js'
import { WorkspaceMaterialError } from '../src/workspace-materials.js'
import { captureOasisRuntimeCredential, normalizeOasisRuntimeConfig } from '../src/oasis-runtime-config.js'

async function harness(t) {
  const h = await fixtureHarness({ claimsV2: true })
  t.after(() => h.repository.close())
  const draft = h.draft()
  draft.tasks['task-a'].generation.source = 'oasis-api'
  draft.tasks['task-a'].formValues = { disclosure_text: '不应外传的交底', drawings_text: '图1', claim_requirements_text: '', user_input: '' }
  await h.service.replaceState('workspace-a', h.state().revision, draft)
  const detail = { id: 39, name: 'synthetic-claims', api_type: 'Workflow', is_async: 0, price: 2, model_name: 'synthetic',
    input_schema: [{ en_name: 'Technical_Disclosure_file', cn_name: '技术交底', type: 'file', content: '' },
      { en_name: 'drawings_explain_TD', cn_name: '附图说明', type: 'paragraph', content: '' },
      { en_name: 'User_input', cn_name: '指令', type: 'paragraph', content: '' }],
    output_schema: [{ en_name: 'answer', cn_name: '正文', type: 'paragraph', content: '' }] }
  const { raw, ...safeDetail } = normalizeApiDetail(detail)
  const workspace = { path: 'D:\\synthetic\\a', status: async () => 'ok' }
  const binding = { workspaceId: 'workspace-a', workspacePath: workspace.path, environmentKind: 'non-production',
    apiBaseOrigin: 'https://oasis-staging.example', accountId: 101, folderId: 8, folderName: 'synthetic',
    apiId: 39, apiEndpoint: 'synthetic-claims', apiProcess: 'one',
    schemaHash: createHash('sha256').update(canonicalJson(safeDetail)).digest('hex'), confirmedAt: '2026-09-20T00:00:00.000Z' }
  const value = { apiBaseUrl: binding.apiBaseOrigin, credentialOrigin: binding.apiBaseOrigin,
    workspaceApiBindings: [binding], downloadOrigins: ['https://files-staging.example'] }
  const user = { id: 101, balance: 20, phone: 'not-returnable' }
  const entry = { id: 39, api_endpoint: 'synthetic-claims', api_process: 'one' }
  const folder = { id: 8, name: 'synthetic', privateNote: 'not-returnable' }
  const calls = []; let runtimeCount = 0, settingsRevision = 7, hook = async () => {}, runtimeChanged = false, runtimeFailure = null
  const client = createOasisApiClient({ baseUrl: binding.apiBaseOrigin, resolveToken: async () => 'synthetic-only', fetchImpl: async (url, init) => {
    const path = new URL(url).pathname
    calls.push({ path, method: init.method, body: init.body })
    await hook(path)
    let data
    if (path === '/api/user/detail') data = user
    else if (path === '/api/apicategories/detail') data = { test: [{ id: 1, name: 'test', apis: [entry] }] }
    else if (path === '/api/apicategories/apidetail') {
      assert.deepEqual(JSON.parse(init.body), { name: 'synthetic-claims' }); data = detail
    } else if (path === '/api/user/user/folderdetail/8') data = folder
    else assert.fail('Unexpected network operation: ' + path)
    return Response.json({ code: 200, data })
  } })
  const active = { enabled: true, credentialConfigured: true, client,
    environmentKind: binding.environmentKind, apiBaseOrigin: binding.apiBaseOrigin,
    assertCurrent: async () => { if (runtimeChanged) throw new WorkspaceMaterialError('REMOTE_CONFIGURATION_CHANGED', 'changed') } }
  const forbidden = () => { assert.fail('Preflight must not write, read material, upload or allocate execution') }
  const professional = createOasisRemoteService({ repository: { get: id => h.repository.get(id), mutate: forbidden },
    settings: { describe: () => [{ ns: 'oasis-professional-service', revision: settingsRevision, value }], update: forbidden },
    workspaceRegistry: { get: id => id === 'workspace-a' ? workspace : undefined },
    getRuntime: async () => { runtimeCount++; if (runtimeFailure) throw runtimeFailure; return active },
    materialManager: { recheckAll: forbidden, readForUpload: forbidden }, executionIdFactory: forbidden, runIdFactory: forbidden })
  const rpc = createWorkbenchRpcHandler(h.service, professional)
  const base = { workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: h.state().revision, expectedSettingsRevision: 7 }
  const prepared = await rpc('task/prepare-api', base)
  assert.equal(prepared.ok, true)
  const command = { ...base, preparationSha256: prepared.value.preparationSha256, remoteReadConfirmed: true }
  return { ...h, rpc, command, binding, value, detail, user, entry, folder, workspace, active, calls,
    runtimeCount: () => runtimeCount, check: (patch = {}) => rpc('task/check-api', { ...command, ...patch }),
    setHook: f => { hook = f }, changeRuntime: () => { runtimeChanged = true }, bumpSettings: () => settingsRevision++,
    failRuntime: error => { runtimeFailure = error } }
}

test('exact preflight route checks metadata using the same draft and never authorizes or writes execution', async t => {
  const h = await harness(t), routes = new Map(), before = JSON.stringify([h.state(), h.value])
  t.after(registerWorkbenchRoutes({ fetch: { register(route) { routes.set(route.path, route); return () => routes.delete(route.path) } } }, h.rpc))
  const route = routes.get('/api/oasis-workbench/task/check-api')
  assert.ok(route, 'explicit preflight route must exist')
  const response = await route.fetch(new Request('http://127.0.0.1/api/oasis-workbench/task/check-api', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId: 'preflight', method: 'oasis-workbench/task/check-api', payload: h.command }) }))
  const envelope = await response.json()
  assert.equal(envelope.rpcId, 'preflight'); assert.equal(envelope.result.ok, true)
  const result = envelope.result.value
  assert.equal(result.status, 'unverified'); assert.equal(result.canSubmit, false)
  assert.deepEqual(result.blockers, ['REMOTE_DOCUMENT_CONTRACT_UNVERIFIED', 'UNIFIED_API_EXECUTION_NOT_CONNECTED'])
  assert.equal(result.preparationSha256, h.command.preparationSha256)
  assert.deepEqual(result.observed, { accountId: 101, folderId: 8, apiId: 39, apiEndpoint: 'synthetic-claims', apiProcess: 'one',
    schemaHash: h.binding.schemaHash, price: 2, balance: 20 })
  assert.equal(h.runtimeCount(), 1)
  assert.deepEqual(h.calls.map(c => c.path).sort(), ['/api/user/detail', '/api/apicategories/detail', '/api/apicategories/apidetail', '/api/user/user/folderdetail/8'].sort())
  assert.equal(h.calls.filter(c => c.method === 'POST').length, 1)
  assert.equal(JSON.stringify(h.calls).includes('不应外传'), false)
  assert.equal(JSON.stringify(result).includes('not-returnable'), false)
  result.observed.accountId = 999
  assert.equal(JSON.stringify([h.state(), h.value]), before)
})

for (const [patch, code] of [
  [{ preparationSha256: '0'.repeat(64) }, 'API_PREPARATION_CHANGED'],
  [{ remoteReadConfirmed: false }, 'bad-request'],
  [{ expectedSettingsRevision: 0 }, 'SETTINGS_CONFLICT'],
  [{ expectedRevision: 0 }, 'REVISION_CONFLICT'],
  [{ values: { disclosure_text: 'injected' } }, 'bad-request'],
]) test(`preflight rejects stale/unconfirmed input before credentials: ${code}`, async t => {
  const h = await harness(t), result = await h.check(patch)
  assert.equal(result.ok, false); assert.equal(result.error.code, code)
  assert.equal(h.runtimeCount(), 0); assert.equal(h.calls.length, 0)
})

for (const [label, change, code] of [
  ['account', h => { h.user.id = 202 }, 'REMOTE_ACCOUNT_MISMATCH'],
  ['service', h => { h.entry.id = 40 }, 'REMOTE_SERVICE_MISMATCH'],
  ['process', h => { h.entry.api_process = 'different' }, 'REMOTE_SERVICE_MISMATCH'],
  ['schema', h => { h.detail.input_schema[0].type = 'paragraph' }, 'REMOTE_SCHEMA_CHANGED'],
  ['price', h => { h.detail.price = 3 }, 'REMOTE_SCHEMA_CHANGED'],
  ['folder', h => { h.folder.id = 9 }, 'REMOTE_FOLDER_MISMATCH'],
  ['balance', h => { h.user.balance = 1 }, 'INSUFFICIENT_BALANCE'],
  ['origin', h => { h.active.apiBaseOrigin = 'https://other.example' }, 'REMOTE_ENVIRONMENT_MISMATCH'],
  ['missing credentials', h => { h.active.credentialConfigured = false }, 'AUTH_REQUIRED'],
]) test(`preflight refuses changed ${label}`, async t => {
  const h = await harness(t); change(h)
  const result = await h.check()
  assert.equal(result.ok, false); assert.equal(result.error.code, code)
  if (['account', 'origin', 'missing credentials'].includes(label)) assert.ok(h.calls.length <= 1)
})

for (const [label, change, code] of [
  ['settings', h => h.bumpSettings(), 'SETTINGS_CONFLICT'],
  ['workspace', h => { h.workspace.path += '-moved' }, 'WORKSPACE_ROOT_CHANGED'],
  ['runtime', h => h.changeRuntime(), 'REMOTE_CONFIGURATION_CHANGED'],
  ['draft', async h => { const draft = h.draft(); draft.tasks['task-a'].formValues.user_input = 'changed'; await h.service.replaceState('workspace-a', h.state().revision, draft) }, 'REVISION_CONFLICT'],
]) test(`preflight rejects ${label} changed while reading metadata`, async t => {
  const h = await harness(t)
  h.setHook(async path => { if (path === '/api/apicategories/apidetail') await change(h) })
  const result = await h.check()
  assert.equal(result.ok, false); assert.equal(result.error.code, code)
})

test('preflight sanitizes failed metadata reads and does not retry', async t => {
  const h = await harness(t)
  h.setHook(async () => { throw new Error('private-response-body') })
  const result = await h.check()
  assert.equal(result.ok, false); assert.equal(result.error.code, 'REMOTE_PREFLIGHT_FAILED')
  assert.equal(JSON.stringify(result).includes('private-response-body'), false)
  assert.equal(h.calls.length, 1)
})

test('real captured credential rejects a replacement at final preflight check without leaking it', async t => {
  const h = await harness(t)
  let token = 'synthetic-first'
  const resolver = await captureOasisRuntimeCredential({ get: () => h.value },
    { resolve: async () => ({ value: token }) }, normalizeOasisRuntimeConfig(h.value))
  h.active.assertCurrent = async () => { await resolver() }
  h.setHook(async path => { if (path === '/api/user/user/folderdetail/8') token = 'synthetic-second' })
  const result = await h.check()
  assert.equal(result.ok, false); assert.equal(result.error.code, 'REMOTE_RUNTIME_CHANGED')
  assert.equal(JSON.stringify(result).includes('synthetic-second'), false)
})

test('credential capture failure is a bounded RPC failure before any metadata request', async t => {
  const h = await harness(t)
  h.failRuntime(new Error('private-credential-provider-detail'))
  const result = await h.check()
  assert.equal(result.ok, false); assert.equal(result.error.code, 'REMOTE_PREFLIGHT_FAILED')
  assert.equal(JSON.stringify(result).includes('private-credential-provider-detail'), false)
  assert.equal(h.calls.length, 0)
})

test('authentication failure in metadata does not become a successful preflight', async t => {
  const h = await harness(t)
  h.setHook(async () => { throw Object.assign(new Error('private-auth-detail'), { code: 'AUTH_REQUIRED' }) })
  const result = await h.check()
  assert.equal(result.ok, false); assert.equal(result.error.code, 'AUTH_REQUIRED')
  assert.equal(JSON.stringify(result).includes('private-auth-detail'), false)
  assert.equal(h.calls.length, 1)
})

test('a binding edited during reads cannot return observations for the stale preparation', async t => {
  const h = await harness(t)
  h.setHook(async path => { if (path === '/api/user/user/folderdetail/8') h.binding.folderName = 'changed' })
  const result = await h.check()
  assert.equal(result.ok, false); assert.equal(result.error.code, 'API_PREPARATION_CHANGED')
})
