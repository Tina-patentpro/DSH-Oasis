import assert from 'node:assert/strict'
import test from 'node:test'

import { apply, inject, name } from '../src/index.js'

function createHostFixture() {
  let registered
  let rpcRegistration
  let settingsRegistration
  const records = new Map()
  const calls = { domainClose: 0, rpcDispose: 0, toolDispose: 0 }
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
      register(ns, schema, options) {
        settingsRegistration = { ns, schema, options }
        return { get: () => options.base }
      },
    },
    credentials: {
      async resolve() { return undefined },
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
  assert.deepEqual(fixture.calls, { domainClose: 1, rpcDispose: 1, toolDispose: 1 })
})

test('unregisters the Host tool when RPC setup fails', async () => {
  const fixture = createHostFixture()
  fixture.ctx.connection.rpc.handle = () => {
    throw new Error('RPC registration failed')
  }

  await assert.rejects(apply(fixture.ctx), /RPC registration failed/)
  assert.deepEqual(fixture.calls, { domainClose: 1, rpcDispose: 0, toolDispose: 1 })
})
