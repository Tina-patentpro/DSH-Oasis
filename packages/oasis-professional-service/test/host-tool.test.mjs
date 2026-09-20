import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { apply, inject, name } from '../src/index.js'

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

test('registers the current Host tool and owned Connection routes with cleanup', async () => {
  const fixture = createHostFixture()
  const dispose = await apply(fixture.ctx)

  assert.equal(name, 'oasis-professional-service')
  assert.deepEqual(inject, ['tools', 'storageDomain', 'connection', 'workspaceRegistry', 'settings', 'credentials'])
  assert.equal(fixture.settingsRegistration?.ns, 'oasis-professional-service')
  assert.equal(fixture.settingsRegistration?.options.applies, 'restart')
  assert.equal(fixture.registered?.name, 'oasis_workbench_status')
  assert.equal(fixture.routes.size, 29)

  const stateResult = await fixture.dispatch('state/get', { workspaceId: 'workspace-a' })
  assert.equal(stateResult.ok, true)
  assert.equal(stateResult.value.revision, 0)
  const professional = await fixture.dispatch('professional/bootstrap', {})
  assert.deepEqual(professional, {
    ok: true,
    value: {
      environmentKind: 'non-production', remoteEnabled: false, credentialConfigured: false,
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
  assert.deepEqual(fixture.calls, { domainClose: 1, rpcDispose: 29, toolDispose: 1, credentialResolve: 0 })
  assert.equal(fixture.routes.size, 0)
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
        environmentKind: 'non-production', remoteEnabled: true, credentialConfigured: false,
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
    /createWorkbenchService\(\{\s*repository,\s*materialManager,\s*workspaceRegistry:\s*ctx\.workspaceRegistry,/,
  )
})

test('S6 Host refuses a replacement credential during an existing bootstrap operation', async (t) => {
  const fixture = createHostFixture({ runtimeSettings: {
    environmentKind: 'non-production', apiBaseUrl: 'https://oasis-staging.example',
    credentialOrigin: 'https://oasis-staging.example', credentialRef: 'OASIS_USER_JWT', downloadOrigins: [],
  } })
  let reads = 0, requests = 0
  fixture.ctx.credentials.resolve = async () => ({ value: ++reads === 1 ? 'synthetic-account-a' : 'synthetic-account-b' })
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
    assert.equal(denied.error.code, 'REMOTE_DISABLED')
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
  process.env.DSH_HOME = String.raw`D:\OneDrive\4、董娣相关\9、绿洲慧写4.0预研\.dsh-test\isolated-dev-20260913\home`; process.env.OASIS_UNIFIED_FIXTURE = '1'
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
