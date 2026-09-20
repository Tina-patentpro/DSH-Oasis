import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { fixtureHarness } from './unified-generation-harness.mjs'
import { createOasisRemoteService } from '../src/oasis-remote-service.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { registerWorkbenchRoutes } from '../src/workbench-connection.js'
import { createMaterialReference } from './workbench-fixtures.mjs'
import { canonicalJson } from '../src/local-mock-runner.js'

async function harness(t, options = {}) {
  const h = await fixtureHarness({ claimsV2: true, ...options })
  t.after(() => h.repository.close())
  const draft = h.draft()
  draft.tasks['task-a'].generation.source = 'oasis-api'
  draft.tasks['task-a'].formValues = { disclosure_text: '交底\r\n 😀\t尾\n', drawings_text: '图 1',
    claim_requirements_text: ' 两项 ', user_input: '不编造\n' }
  await h.service.replaceState('workspace-a', h.state().revision, draft)
  const workspace = { path: 'D:\\synthetic\\a', status: async () => 'ok' }
  const binding = { workspaceId: 'workspace-a', workspacePath: workspace.path,
    environmentKind: 'non-production', apiBaseOrigin: 'https://oasis-staging.example',
    accountId: 101, folderId: 8, folderName: 'synthetic', apiId: 39,
    apiEndpoint: 'synthetic-claims', apiProcess: 'one', schemaHash: 'a'.repeat(64),
    confirmedAt: '2026-09-20T00:00:00.000Z' }
  const value = { apiBaseUrl: binding.apiBaseOrigin, credentialOrigin: binding.apiBaseOrigin,
    workspaceApiBindings: [binding], downloadOrigins: ['https://files-staging.example'] }
  let settingsRevision = 7, sideEffects = 0
  const forbidden = () => { sideEffects++; throw new Error('Preparation side effect') }
  const registry = new Map([['workspace-a', workspace]])
  const professional = createOasisRemoteService({
    repository: { get: id => h.repository.get(id), mutate: forbidden },
    settings: { describe: () => [{ ns: 'oasis-professional-service', revision: settingsRevision, value }], update: forbidden },
    workspaceRegistry: { get: id => registry.get(id) }, getRuntime: forbidden,
    materialManager: { recheckAll: forbidden, readForUpload: forbidden },
    executionIdFactory: forbidden, runIdFactory: forbidden,
  })
  const rpc = createWorkbenchRpcHandler(h.service, professional)
  const command = () => ({ workspaceId: 'workspace-a', taskId: 'task-a',
    expectedRevision: h.state().revision, expectedSettingsRevision: settingsRevision })
  const prepare = (patch = {}) => rpc('task/prepare-api', { ...command(), ...patch })
  return { ...h, value, binding, registry, workspace, professional, rpc, command, prepare,
    bumpSettings: () => settingsRevision++, sideEffects: () => sideEffects }
}

test('exact Host route prepares the authoritative draft without credentials, uploads, execution or writes', async t => {
  const h = await harness(t), routes = new Map()
  const dispose = registerWorkbenchRoutes({ fetch: { register(route) {
    routes.set(route.path, route); return () => routes.delete(route.path)
  } } }, h.rpc)
  t.after(dispose)
  const before = JSON.stringify([h.state(), h.value])
  const path = '/api/oasis-workbench/task/prepare-api'
  assert.ok(routes.has(path), 'exact preparation route must be registered')
  const response = await routes.get(path).fetch(new Request('http://127.0.0.1' + path, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      type: 'client-request', rpcId: 'prepare-one', method: 'oasis-workbench/task/prepare-api', payload: h.command(),
    }),
  }))
  const envelope = await response.json()
  assert.equal(envelope.rpcId, 'prepare-one')
  assert.equal(envelope.result.ok, true)
  const result = envelope.result.value
  assert.equal(result.status, 'unverified')
  assert.equal(result.canSubmit, false)
  assert.ok(result.blockers.includes('REMOTE_DOCUMENT_CONTRACT_UNVERIFIED'))
  const { snapshot } = result
  assert.equal(snapshot.binding.accountId, 101)
  assert.equal(snapshot.binding.folderId, 8)
  assert.equal(snapshot.workspaceId, 'workspace-a')
  assert.equal(snapshot.workflowVersion, '2')
  assert.equal(snapshot.source, 'oasis-api')
  assert.deepEqual(snapshot.mapping.textInputs, { drawings_explain_TD: '图 1', User_input: '【撰写要求】\n 两项 \n\n【用户指令】\n不编造\n' })
  assert.equal(snapshot.mapping.document.fieldId, 'Technical_Disclosure_file')
  assert.equal(snapshot.mapping.document.byteLength, Buffer.byteLength('交底\r\n 😀\t尾\n'))
  assert.equal(snapshot.mapping.document.sha256, createHash('sha256').update('交底\r\n 😀\t尾\n').digest('hex'))
  assert.equal(Object.hasOwn(snapshot.mapping.document, 'url'), false)
  assert.deepEqual(snapshot.allowedUploadOrigins, ['https://files-staging.example', 'https://oasis-staging.example'])
  assert.equal(JSON.stringify(result).includes('credential'), false)
  assert.equal(JSON.stringify([h.state(), h.value]), before)
  snapshot.binding.folderId = 99; snapshot.values.disclosure_text = 'changed'
  assert.equal(JSON.stringify([h.state(), h.value]), before, 'response must not alias authoritative records')
  assert.equal(h.sideEffects(), 0)
})

test('preparation hash is repeatable and binds text, settings revision, service, folder and account', async t => {
  const h = await harness(t)
  const first = await h.prepare()
  assert.equal(first.ok, true)
  const original = first.value.preparationSha256
  assert.match(original, /^[a-f0-9]{64}$/)
  assert.equal((await h.prepare()).value.preparationSha256, original)
  for (const [key, changed] of [['accountId', 202], ['folderId', 9], ['apiId', 40], ['schemaHash', 'b'.repeat(64)]]) {
    const old = h.binding[key]; h.binding[key] = changed
    assert.notEqual((await h.prepare()).value.preparationSha256, original, key)
    h.binding[key] = old
  }
  h.bumpSettings()
  const revised = (await h.prepare()).value.preparationSha256
  assert.notEqual(revised, original)
  const draft = h.draft(); draft.tasks['task-a'].formValues.user_input += '新指令'
  await h.service.replaceState('workspace-a', h.state().revision, draft)
  assert.notEqual((await h.prepare()).value.preparationSha256, revised)
  assert.equal(h.sideEffects(), 0)
})

test('preflight rejects a displayed preparation from the old mapping revision before credentials or network', async t => {
  const h = await harness(t)
  const prepared = await h.prepare()
  const old = structuredClone(prepared.value.snapshot)
  old.mapping.version = 'claims-document-1'
  const oldHash = createHash('sha256').update(canonicalJson(old), 'utf8').digest('hex')
  const result = await h.rpc('task/check-api', { ...h.command(), remoteReadConfirmed: true, preparationSha256: oldHash })
  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'API_PREPARATION_CHANGED')
  assert.equal(h.sideEffects(), 0)
})

for (const [patch, code] of [
  [{ expectedRevision: 0 }, 'REVISION_CONFLICT'],
  [{ expectedSettingsRevision: 0 }, 'SETTINGS_CONFLICT'],
  [{ workspaceId: 'workspace-b' }, 'UNKNOWN_WORKSPACE'],
  [{ taskId: 'missing' }, 'TASK_NOT_FOUND'],
  [{ values: { disclosure_text: 'client injection' } }, 'bad-request'],
  [{ uploadedUrl: 'https://untrusted.example/a' }, 'bad-request'],
  [{ expectedRevision: -1 }, 'bad-request'],
]) test(`rejects ${JSON.stringify(patch)} without side effects`, async t => {
  const h = await harness(t), before = JSON.stringify([h.state(), h.value])
  const result = await h.prepare(patch)
  assert.equal(result.ok, false)
  assert.equal(result.error.code, code)
  assert.equal(JSON.stringify([h.state(), h.value]), before)
  assert.equal(h.sideEffects(), 0)
})

for (const [name, change, code] of [
  ['unbound', h => { h.value.workspaceApiBindings = [] }, 'WORKSPACE_BINDING_REQUIRED'],
  ['other workspace binding', h => { h.binding.workspaceId = 'workspace-b' }, 'WORKSPACE_BINDING_REQUIRED'],
  ['replaced workspace', h => { h.workspace.path += '-replaced' }, 'WORKSPACE_ROOT_CHANGED'],
  ['origin changed', h => { h.value.apiBaseUrl = 'https://other-staging.example' }, 'REMOTE_ENVIRONMENT_MISMATCH'],
  ['missing workspace', h => { h.workspace.status = async () => 'missing' }, 'WORKSPACE_MISSING'],
]) test(`rejects ${name}`, async t => {
  const h = await harness(t); change(h)
  const result = await h.prepare()
  assert.equal(result.ok, false); assert.equal(result.error.code, code)
  assert.equal(h.sideEffects(), 0)
})

for (const [name, change, code] of [
  ['local source', task => { task.generation.source = 'local-skill' }, 'WORKFLOW_MISMATCH'],
  ['empty disclosure', task => { task.formValues.disclosure_text = '  ' }, 'INVALID_REMOTE_FORM'],
  ['invalid unicode', task => { task.formValues.user_input = '\uD800' }, 'INVALID_REMOTE_FORM'],
]) test(`does not silently accept ${name}`, async t => {
  const h = await harness(t), draft = h.draft(); change(draft.tasks['task-a'])
  await h.service.replaceState('workspace-a', h.state().revision, draft)
  const result = await h.prepare()
  assert.equal(result.ok, false); assert.equal(result.error.code, code)
  assert.equal(h.sideEffects(), 0)
})

for (const kind of ['upstream', 'file']) test(`rejects unhandled ${kind} instead of omitting it from the API request`, async t => {
  const h = await harness(t)
  await h.repository.mutate('workspace-a', h.state().revision, current => {
    const next = structuredClone(current), task = next.tasks['task-a']
    if (kind === 'file') task.inputRefs = [createMaterialReference()]
    else task.generation.upstream = { kind: 'project-file', relativePath: 'upstream.md', displayName: 'upstream.md',
      mediaType: 'text/markdown', sizeBytes: 10, sha256: 'c'.repeat(64) }
    return next
  })
  const result = await h.prepare()
  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'UNSUPPORTED_MATERIAL')
  assert.equal(h.sideEffects(), 0)
})

test('an unresolved generation prevents preparing a competing API snapshot', async t => {
  let entered, release
  const started = new Promise(resolve => { entered = resolve })
  const h = await harness(t, { unifiedFixtureEnabled: true, unifiedFixtureRunner: async () => {
    entered(); return new Promise(resolve => { release = resolve })
  } })
  const running = h.service.createUnifiedRun({ ...h.command(), requestKey: 'synthetic-only' })
  await started
  try {
    const result = await h.prepare()
    assert.equal(result.ok, false)
    assert.equal(result.error.code, 'WORKSPACE_GENERATION_ACTIVE')
    assert.equal(h.sideEffects(), 0)
  } finally { release('仅合成正文'); await running }
})
