import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import { LlmRuntime, LlmAdapter } from '@deepseek-ai/dsh-llm'
import { apply as applyDefault } from '../../src/index.js'
import { setupNative, MODEL_OUTPUT } from './v340-native-harness.mjs'
const entryUrl = new URL('../../src/m06-controlled-host-013.js', import.meta.url)
export const controlledEntry = await import(entryUrl).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url === entryUrl.href) return {}
  throw error
})
const controlled=controlledEntry

// Only external Host services are adapted; repository/preparation/RPC/native SDK stay real.
export async function setupM06ControlledHost(t, { candidate = true, beforeApply, entry, applyHost } = {}) {
  if (candidate) assert.equal(typeof controlled.apply, 'function', 'controlled 013 Host entry is missing')
  const storageCleanup=[]
  const h = await setupNative({after:cleanup=>storageCleanup.push(cleanup)})
  let sdk,unregisterAdapter,dispose
  // The Host owns its outstanding publication: close it before removing its workspace/disk.
  t.after(async()=>{
    try{await dispose?.()}
    finally{
      try{unregisterAdapter?.();await sdk?.fiber.dispose()}
      finally{for(const cleanup of storageCleanup)await cleanup()}
    }
  })
  await h.service.closeV340Runtime()
  const routes = new Map(), calls = { adapter: 0, credentials: 0, tools: 0, network: 0 }
  sdk = new Context(); sdk.provide('workspaceRegistry', h.ctx.workspaceRegistry)
  await sdk.plugin(LlmRuntime).await()
  let actualCall
  class OfflineProvider extends LlmAdapter {
    async resolveModel(provider, model) { return { provider, id: model, name: model } }
    async *stream(options) {
      calls.adapter++; actualCall = options
      const text = JSON.stringify(MODEL_OUTPUT)
      yield { type: 'text-delta', index: 0, text }
      yield { type: 'finish', reason: { kind: 'stop' } }
    }
  }
  unregisterAdapter = sdk.llm.registerAdapter(['synthetic-native-test'], new OfflineProvider())
  t.mock.method(globalThis, 'fetch', () => { calls.network++; assert.fail('no external request') })
  const credential = () => { calls.credentials++; assert.fail('controlled candidate must not read website credentials') }
  const ctx = { ...h.ctx, llm: sdk.llm, storageDomain: h.disk,
    credentials: { readRecord: credential, describeRecord: credential, modifyRecord: credential, deleteRecord: credential },
    settings: { register: (_namespace, _schema, options) => ({ get: () => ({ ...options.base, localModelEnabled: true }) }) },
    tools: { register: () => { calls.tools++; return () => { calls.tools-- } } },
    connection: { fetch: { register: route => {
      assert.equal(routes.has(route.path), false); routes.set(route.path, route)
      return () => { routes.delete(route.path) }
    } } },
  }
  // Default must remain disabled even without optional injection; normal legacy flag is off for the control.
  if (!candidate) ctx.settings = { register: (_namespace, _schema, options) => ({ get: () => options.base }) }
  beforeApply?.(ctx, calls, routes)
  dispose = await (applyHost ?? entry?.apply ?? (candidate ? controlled.apply : applyDefault))(ctx)
  async function rpc(endpoint, payload) {
    const path = '/api/oasis-workbench/' + endpoint, route = routes.get(path)
    assert.ok(route, 'registered endpoint required: ' + endpoint)
    const response = await route.fetch(new Request('http://127.0.0.1' + path, { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request',
        rpcId: 'R34-controlled-host', method: 'oasis-workbench/' + endpoint, payload }) }))
    assert.equal(response.status, 200)
    return (await response.json()).result
  }
  const state = async () => {
    const result = await rpc('state/get', { workspaceId: 'w' }); assert.equal(result.ok, true); return result.value
  }
  const preview = async extra => {
    const current = await state()
    return rpc('workflow/v340/candidate/prepare', { workspaceId: 'w', taskId: 't',
      expectedRevision: current.revision, sessionId: 's', confirmed: true, ...extra })
  }
  const submit = async (preview, extra = {}) => {
    const current = await state()
    return rpc('workflow/v340/candidate/run', { workspaceId: 'w', taskId: 't', expectedRevision: current.revision,
      requestKey: 'R34-one-request', candidate: { sessionId: 's', confirmed: true, sha256: preview.sha256 }, ...extra })
  }
  return { h, ctx, routes, calls, rpc, state, preview, submit, dispose, get actualCall() { return actualCall } }
}

