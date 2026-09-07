import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { resolve } from 'node:path'

import { apply, inject, name } from '../src/index.js'

function createHostFixture(options = {}) {
  let registered
  let rpcRegistration
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
      rpc: {
        handle(channel, handler, options) {
          rpcRegistration = { channel, handler, options }
          return async () => {
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
    get rpcRegistration() { return rpcRegistration },
    get settingsRegistration() { return settingsRegistration },
  }
}

test('registers the current Host tool and loopback workbench RPC with owned cleanup', async () => {
  const fixture = createHostFixture()
  const dispose = await apply(fixture.ctx)

  assert.equal(name, 'oasis-professional-service')
  assert.deepEqual(inject, ['tools', 'storageDomain', 'connection', 'workspaceRegistry', 'settings', 'credentials'])
  assert.equal(fixture.settingsRegistration?.ns, 'oasis-professional-service')
  assert.equal(fixture.settingsRegistration?.options.applies, 'restart')
  assert.equal(fixture.registered?.name, 'oasis_workbench_status')
  assert.equal(fixture.rpcRegistration.channel, '/oasis-workbench')
  assert.deepEqual(fixture.rpcRegistration.options, { authority: 'loopback' })

  const stateResult = await fixture.rpcRegistration.handler('state/get', { workspaceId: 'workspace-a' })
  assert.equal(stateResult.ok, true)
  assert.equal(stateResult.value.revision, 0)
  const professional = await fixture.rpcRegistration.handler('professional/bootstrap', {})
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
  assert.deepEqual(fixture.calls, { domainClose: 1, rpcDispose: 1, toolDispose: 1, credentialResolve: 0 })
})

test('unregisters the Host tool when RPC setup fails', async () => {
  const fixture = createHostFixture()
  fixture.ctx.connection.rpc.handle = () => {
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
    const result = await fixture.rpcRegistration.handler('professional/bootstrap', {})
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

test('isolated synthetic Host disables legacy bootstrap before resolving any credential or API request', async () => {
  const oldHome = process.env.DSH_HOME; const oldFixture = process.env.OASIS_UNIFIED_FIXTURE
  process.env.DSH_HOME = resolve('../../.dsh-test/stage2-desktop'); process.env.OASIS_UNIFIED_FIXTURE = '1'
  const fixture = createHostFixture({ runtimeSettings: {
    environmentKind: 'non-production', apiBaseUrl: 'http://127.0.0.1:6326', credentialOrigin: 'http://127.0.0.1:6326',
    credentialRef: 'OASIS_USER_JWT', downloadOrigins: [],
  } })
  let dispose
  try {
    dispose = await apply(fixture.ctx)
    const catalog = await fixture.rpcRegistration.handler('workflow/catalog', {})
    assert.equal(catalog.value.unifiedFixtureEnabled, true)
    const response = await fixture.rpcRegistration.handler('professional/bootstrap', {})
    assert.equal(response.value.remoteEnabled, false)
    assert.equal(fixture.calls.credentialResolve, 0)
  } finally {
    await dispose?.()
    if (oldHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = oldHome
    if (oldFixture === undefined) delete process.env.OASIS_UNIFIED_FIXTURE; else process.env.OASIS_UNIFIED_FIXTURE = oldFixture
  }
})
