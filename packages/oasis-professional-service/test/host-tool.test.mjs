import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { readFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { apply, inject, name } from '../src/index.js'
import { fixtureHarness } from './unified-generation-harness.mjs'
import { fastDetail, fastCatalog } from './fast-service-fixture.mjs'

function createHostFixture(options = {}) {
  let registered
  const routes = new Map()
  let settingsRegistration
  const records = new Map()
  const calls = { domainClose: 0, rpcDispose: 0, toolDispose: 0, credentialResolve: 0 }
  const domain = {
    table() {
      return {
        get(key) {
          return records.get(key)
        },
        async put(key, value) {
          records.set(key, value)
        },
      }
    },
    async close() {
      calls.domainClose += 1
    },
  }
  const ctx = {
    tools: {
      register(tool) {
        registered = tool
        return () => {
          calls.toolDispose += 1
        }
      },
    },
    storageDomain: {
      async open() {
        return domain
      },
    },
    connection: {
      fetch: {
        register(route) {
          assert.equal(routes.has(route.path), false)
          routes.set(route.path, route)
          return async () => {
            routes.delete(route.path)
            calls.rpcDispose += 1
          }
        },
      },
    },
    workspaceRegistry: {
      get() { return undefined },
    },
    settings: {
      register(ns, schema, registrationOptions) {
        settingsRegistration = { ns, schema, options: registrationOptions }
        return { get: () => options.runtimeSettings ?? registrationOptions.base }
      },
    },
    credentials: {
      async resolve() {
        calls.credentialResolve += 1
        return options.credential ?? undefined
      },
    },
  }
  return {
    ctx,
    calls,
    get registered() { return registered },
    routes,
    async dispatch(endpoint, payload) {
      const path = '/api/oasis-workbench/' + endpoint
      const response = await routes.get(path).fetch(new Request('http://127.0.0.1' + path, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', rpcId: 'host-test', method: 'oasis-workbench/' + endpoint, payload }),
      }))
      assert.equal(response.status, 200)
      return (await response.json()).result
    },
    get settingsRegistration() { return settingsRegistration },
  }
}

test('actual Host obtains the missing detail ID from its captured login grant before Fast preview', async t => {
  const h = await fixtureHarness({ claimsV2: true }); t.after(() => h.repository.close())
  const origin = 'https://lzhxpy.oasisintwrite.com', workspace = { path: 'D:\\synthetic\\account', status: async () => 'ok' }
  const value = { websiteProjectLinks: [{ workspaceId: 'workspace-a', workspacePath: workspace.path,
    apiBaseOrigin: origin, accountId: 101, folderId: 8, folderName: 'test', confirmedAt: '2026-09-27T00:00:00.000Z' }], workspaceApiBindings: [] }
  const fixture = createHostFixture({ runtimeSettings: value }), requests = []
  fixture.ctx.workspaceRegistry.get = id => id === 'workspace-a' ? workspace : undefined
  fixture.ctx.settings.describe = () => [{ ns: 'oasis-professional-service', value, revision: 0 }]
  Object.assign(fixture.ctx.credentials, {
    readRecord: async () => ({ kind: 'grant', payload: { origin, accountId: 101, revision: 'same-login', token: 'host-identity-secret' } }),
    describeRecord: async () => ({ writable: true }),
    modifyRecord: () => assert.fail('no credential mutation'), deleteRecord: () => assert.fail('no logout'),
  })
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const pathname = new URL(url).pathname; requests.push(pathname)
    assert.equal(options.headers.authorization, 'Bearer host-identity-secret')
    let data
    if (pathname === '/api/user/detail') data = { username: 'test', balance: 20 }
    else if (pathname === '/api/apicategories/detail') data = structuredClone(fastCatalog)
    else if (pathname === '/api/apicategories/apidetail') data = structuredClone(fastDetail)
    else if (pathname === '/api/user/user/folderdetail/8') data = { id: 8, name: 'test', owner_id: 101 }
    else assert.fail('no upload/create or other network action: ' + pathname)
    return Response.json({ code: 200, data })
  })
  const dispose = await apply(fixture.ctx)
  try {
    const draft = h.draft(); draft.tasks['task-a'].generation.source = 'oasis-api'
    const saved = await fixture.dispatch('state/replace', { workspaceId: 'workspace-a', expectedRevision: 0, state: draft })
    assert.equal(saved.ok, true)
    const payload = { workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: saved.value.current.revision, expectedSettingsRevision: 0, remoteReadConfirmed: true }
    const prepared = await fixture.dispatch('task/prepare-api', payload)
    assert.equal(prepared.ok, true, JSON.stringify(prepared))
    assert.equal(prepared.value.snapshot.binding.accountId, 101)
    const preview = await fixture.dispatch('task/preview-api', { ...payload, preparationSha256: prepared.value.preparationSha256 })
    assert.equal(preview.ok, true, JSON.stringify(preview))
    assert.equal(preview.value.accountId, 101); assert.equal(preview.value.balance, 20)
    assert.ok(requests.includes('/api/user/detail'))
    assert.equal(JSON.stringify([prepared, preview]).includes('host-identity-secret'), false)
    assert.deepEqual((await fixture.dispatch('state/get', { workspaceId: 'workspace-a' })).value.tasks['task-a'].remoteExecutions, {})
  } finally { await dispose() }
})

test('registers the current Host tool and owned Connection routes with cleanup', async () => {
  const fixture = createHostFixture()
  const dispose = await apply(fixture.ctx)

  assert.equal(name, 'oasis-professional-service')
  assert.deepEqual(inject, ['tools', 'storageDomain', 'connection', 'workspaceRegistry', 'settings', 'credentials'])
  assert.equal(fixture.settingsRegistration?.ns, 'oasis-professional-service')
  assert.equal(fixture.settingsRegistration?.options.applies, 'restart')
  assert.equal(fixture.registered?.name, 'oasis_workbench_status')
  assert.equal(fixture.routes.size, 41)

  const stateResult = await fixture.dispatch('state/get', { workspaceId: 'workspace-a' })
  assert.equal(stateResult.ok, true)
  assert.equal(stateResult.value.revision, 0)
  const professional = await fixture.dispatch('professional/bootstrap', {})
  assert.deepEqual(professional, {
    ok: true,
    value: {
      environmentKind: 'production', remoteEnabled: true, credentialConfigured: false,
      balance: null, services: [], folders: [],
    },
  })

  const value = await fixture.registered.execute({}, {
    signal: new AbortController().signal,
  })
  assert.equal(value.plugin, 'oasis-professional-service')
  assert.equal(value.phase, 'week-3')
  assert.equal(value.capabilityLevel, 'local-professional-loop')
  assert.deepEqual(value.supportedWorkTypes, ['technical-rd', 'cn-invention-patent'])
  assert.equal('workspaceState' in value, false)
  assert.equal(value.externalSystems, 'not-invoked')

  await dispose()
  assert.deepEqual(fixture.calls, { domainClose: 1, rpcDispose: 41, toolDispose: 1, credentialResolve: 0 })
  assert.equal(fixture.routes.size, 0)
})

test('formal Host with old disabled setting attaches native services without starting a model request', async () => {
  const fixture = createHostFixture({ runtimeSettings: { localModelEnabled: false } })
  let attached = 0, modelCalls = 0, released = 0
  fixture.ctx.inject = (names, callback) => {
    attached++
    assert.deepEqual(names, ['llm', 'sessions', 'sessionProjections', 'agentDefaultModel'])
    const detach = callback({ ...fixture.ctx, llm: { chat() { modelCalls++ } }, sessions: {}, sessionProjections: {}, agentDefaultModel: {} })
    return { dispose() { released++; detach() } }
  }
  const dispose = await apply(fixture.ctx)
  try {
    const catalog = await fixture.dispatch('workflow/catalog', {})
    assert.equal(attached, 1)
    assert.equal(catalog.value.localGenerationEnabled, true)
    assert.equal(catalog.value.localGenerationKind, 'native-model')
    assert.equal(modelCalls, 0)
    assert.equal(fixture.calls.credentialResolve, 0)
  } finally { await dispose() }
  assert.equal(released, 1)
})

test('unregisters the Host tool when RPC setup fails', async () => {
  const fixture = createHostFixture()
  fixture.ctx.connection.fetch.register = () => {
    throw new Error('RPC registration failed')
  }

  await assert.rejects(apply(fixture.ctx), /RPC registration failed/)
  assert.deepEqual(fixture.calls, { domainClose: 1, rpcDispose: 0, toolDispose: 1, credentialResolve: 0 })
})

test('an origin-mismatched credential cannot be resolved or used by automatic bootstrap', async () => {
  const previousFetch = globalThis.fetch
  let fetchCalls = 0
  globalThis.fetch = async (url) => {
    fetchCalls += 1
    const path = new URL(url).pathname
    const data = path === '/api/user/detail'
      ? { balance: 100 }
      : path === '/api/user/user/folderlist'
        ? { total: 0, items: [] }
        : {}
    return { ok: true, status: 200, async json() { return { data } } }
  }
  const fixture = createHostFixture({
    runtimeSettings: {
      environmentKind: 'non-production',
      apiBaseUrl: 'http://127.0.0.1:6326',
      credentialOrigin: 'http://127.0.0.1:6327',
      credentialRef: 'OASIS_USER_JWT',
      downloadOrigins: [],
    },
    credential: { value: 'synthetic-token', source: 'test' },
  })
  let dispose
  try {
    dispose = await apply(fixture.ctx)
    const result = await fixture.dispatch('professional/bootstrap', {})
    assert.deepEqual(result, {
      ok: true,
      value: {
        environmentKind: 'production', remoteEnabled: true, credentialConfigured: false,
        balance: null, services: [], folders: [],
      },
    })
    assert.equal(fixture.calls.credentialResolve, 0)
    assert.equal(fetchCalls, 0)
  } finally {
    await dispose?.()
    globalThis.fetch = previousFetch
  }
})

test('wires the Host workspace registry into the safe writeback boundary', async () => {
  const source = await readFile(new URL('../src/index.js', import.meta.url), 'utf8')
  assert.match(
    source,
    /createWorkbenchService\(\{\s*repository,\s*workspaceOperations,\s*materialManager,\s*workspaceRegistry:\s*ctx\.workspaceRegistry,/,
  )
})

test('R1 Host shares import and generation admission guard and preserves safe RPC busy errors', async t => {
  const root = await mkdtemp(join(tmpdir(), 'oasis-r1-host-'))
  let value = { websiteProjectLinks: [{ workspaceId: 'workspace-a', workspacePath: root,
    apiBaseOrigin: 'https://lzhxpy.oasisintwrite.com', accountId: 7, folderId: 2,
    folderName: 'synthetic', confirmedAt: new Date().toISOString() }], workspaceApiBindings: [] }
  let revision = 0, entered, release
  const waiting = new Promise(resolve => { entered = resolve })
  const gate = new Promise(resolve => { release = resolve })
  const fixture = createHostFixture({ runtimeSettings: value })
  fixture.ctx.workspaceRegistry.get = () => ({ path: root, status: async () => 'ok' })
  Object.assign(fixture.ctx.settings, {
    writable: true, describe: () => [{ ns: 'oasis-professional-service', value, revision }],
    update: async (_ns, patch, expected) => {
      assert.equal(expected, revision); entered(); await gate
      value = { ...value, ...patch }; revision++
    },
  })
  Object.assign(fixture.ctx.credentials, {
    readRecord: async () => ({ kind: 'grant', payload: { origin: 'https://lzhxpy.oasisintwrite.com',
      accountId: 7, token: 'synthetic-token', revision: 'r1' } }),
    describeRecord: async () => ({ writable: true }),
    modifyRecord: () => assert.fail('no credential write'), deleteRecord: () => assert.fail('no logout'),
  })
  t.mock.method(globalThis, 'fetch', () => assert.fail('no network'))
  const dispose = await apply(fixture.ctx)
  let pending
  try {
    const opened = await fixture.dispatch('import/open', { workspaceId: 'workspace-a', confirmed: true })
    assert.equal(opened.ok, true)
    const unlink = { token: opened.value.token, expectedSettingsRevision: 0, confirmed: true }
    pending = fixture.dispatch('import/unlink', unlink); await waiting
    const create = { workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 0, requestKey: 'r1' }
    for (const [endpoint, payload] of [
      ['task/create', create],
      ['professional/start', { ...create, priceConfirmed: true, externalTransferConfirmed: true }],
      ['import/unlink', unlink],
    ]) {
      const result = await fixture.dispatch(endpoint, payload)
      assert.equal(result.ok, false, endpoint)
      assert.equal(result.error.code, 'WORKSPACE_OPERATION_BUSY', endpoint)
      assert.ok(!JSON.stringify(result).includes('synthetic-token'))
    }
  } finally { release(); if (pending) assert.equal((await pending).ok, true); await dispose() }
  assert.deepEqual(value.websiteProjectLinks, [])
})

test('Host authentication routes never expose secrets or use legacy Profile destinations', async t => {
  const fixture = createHostFixture({ runtimeSettings: { apiBaseUrl: 'https://legacy.invalid', downloadOrigins: ['https://files.invalid'] } })
  let record, requests = []
  Object.assign(fixture.ctx.credentials, {
    readRecord: async () => record, describeRecord: async () => ({ configured: !!record, writable: true }),
    modifyRecord: async (_, mutate) => { record = await mutate(record) }, deleteRecord: async () => { record = undefined },
  })
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push(url)
    assert.equal(options.redirect, 'error')
    return Response.json({ code: 200, data: { id: 101, token: 'host-only-secret' } })
  })
  const dispose = await apply(fixture.ctx)
  try {
    assert.equal((await fixture.dispatch('account/status', {})).value.authenticated, false)
    assert.equal(requests.length, 0)
    const invalid = await fixture.dispatch('account/login', { mode: 'password', phone: '13800000000', password: 'host-only-secret', confirmed: false })
    assert.equal(invalid.ok, false); assert.equal(JSON.stringify(invalid).includes('host-only-secret'), false)
    const logged = await fixture.dispatch('account/login', { mode: 'password', phone: '13800000000', password: 'host-only-secret', confirmed: true })
    assert.equal(logged.value.authenticated, true)
    assert.equal(JSON.stringify(logged).includes('host-only-secret'), false)
    assert.equal(record.payload.origin, 'https://lzhxpy.oasisintwrite.com')
    await fixture.dispatch('account/logout', { confirmed: true })
    assert.deepEqual(requests, ['https://lzhxpy.oasisintwrite.com/api/auth/pwdlogin'])
    assert.equal(record, undefined)
    assert.equal(fixture.calls.credentialResolve, 0)
  } finally { await dispose() }
})

test('S6 Host refuses a replacement credential during an existing bootstrap operation', async (t) => {
  const fixture = createHostFixture({ runtimeSettings: {
    environmentKind: 'non-production', apiBaseUrl: 'https://oasis-staging.example',
    credentialOrigin: 'https://oasis-staging.example', credentialRef: 'OASIS_USER_JWT', downloadOrigins: [],
  } })
  let reads = 0, requests = 0
  fixture.ctx.credentials.readRecord = async () => ({ kind: 'grant', payload: {
    origin: 'https://lzhxpy.oasisintwrite.com', accountId: 1, token: 'synthetic-token', revision: ++reads === 1 ? 'a' : 'b',
  } })
  fixture.ctx.credentials.describeRecord = async () => ({ configured: true, writable: true })
  fixture.ctx.credentials.modifyRecord = async () => { throw Error('no mutation') }
  fixture.ctx.credentials.deleteRecord = async () => { throw Error('no mutation') }
  t.mock.method(globalThis, 'fetch', async () => {
    requests += 1
    throw new Error('Synthetic fetch must not be reached after account switch')
  })
  const dispose = await apply(fixture.ctx)
  try {
    await assert.rejects(fixture.dispatch('professional/bootstrap', {}))
    assert.equal(requests, 0, 'old operation must not use the new account credential')
  } finally { await dispose() }
})

test('S6 actual Host binding read is scoped and confirm cannot bypass disabled runtime', async () => {
  const fixture = createHostFixture()
  const workspace = { path: 'D:\\synthetic\\a', status: async () => 'ok' }
  fixture.ctx.workspaceRegistry.get = id => id === 'workspace-a' ? workspace : undefined
  fixture.ctx.settings.describe = () => [{ ns: 'oasis-professional-service', revision: 0,
    value: fixture.settingsRegistration.options.base }]
  fixture.ctx.settings.writable = true
  fixture.ctx.settings.update = () => { throw new Error('No settings write allowed') }
  const dispose = await apply(fixture.ctx)
  try {
    const read = await fixture.dispatch('professional/binding/get', { workspaceId: 'workspace-a' })
    assert.deepEqual(read, { ok: true, value: { workspaceId: 'workspace-a', workspacePath: workspace.path,
      settingsRevision: 0, binding: null, status: 'unbound' } })
    const denied = await fixture.dispatch('professional/binding/confirm', {
      workspaceId: 'workspace-a', workspacePath: workspace.path, expectedSettingsRevision: 0,
      confirmed: true, accountId: 101, environmentKind: 'non-production',
      apiBaseOrigin: 'https://oasis-staging.example', folderId: 8, apiId: 39,
      apiEndpoint: 'synthetic-claims', apiProcess: 'one', schemaHash: 'a'.repeat(64),
    })
    assert.equal(denied.ok, false)
    assert.equal(denied.error.code, 'AUTH_REQUIRED')
    assert.equal(fixture.calls.credentialResolve, 0)
    const preparation = await fixture.dispatch('task/prepare-api', { workspaceId: 'workspace-a', taskId: 'task-a',
      expectedRevision: 0, expectedSettingsRevision: 0 })
    assert.equal(preparation.ok, false)
    assert.equal(preparation.error.code, 'WORKSPACE_BINDING_REQUIRED')
    assert.equal(fixture.calls.credentialResolve, 0)
  } finally { await dispose() }
})

test('isolated synthetic Host disables legacy bootstrap before resolving any credential or API request', async () => {
  const oldHome = process.env.DSH_HOME; const oldFixture = process.env.OASIS_UNIFIED_FIXTURE
  process.env.DSH_HOME = (process.platform === 'win32' ? String.raw`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\home` : fileURLToPath(new URL('../../../.dsh-test/mac-dev/home', import.meta.url))); process.env.OASIS_UNIFIED_FIXTURE = '1'
  const fixture = createHostFixture({ runtimeSettings: {
    environmentKind: 'non-production', apiBaseUrl: 'http://127.0.0.1:6326', credentialOrigin: 'http://127.0.0.1:6326',
    credentialRef: 'OASIS_USER_JWT', downloadOrigins: [],
  } })
  let dispose
  try {
    dispose = await apply(fixture.ctx)
    const catalog = await fixture.dispatch('workflow/catalog', {})
    assert.equal(catalog.value.unifiedFixtureEnabled, true)
    const response = await fixture.dispatch('professional/bootstrap', {})
    assert.equal(response.value.remoteEnabled, false)
    assert.equal(fixture.calls.credentialResolve, 0)
  } finally {
    await dispose?.()
    if (oldHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = oldHome
    if (oldFixture === undefined) delete process.env.OASIS_UNIFIED_FIXTURE; else process.env.OASIS_UNIFIED_FIXTURE = oldFixture
  }
})
