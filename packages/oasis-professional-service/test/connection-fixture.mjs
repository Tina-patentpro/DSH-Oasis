import assert from 'node:assert/strict'
import { registerWorkbenchRoutes } from '../src/workbench-connection.js'

// In-memory HTTP boundary: no network, credentials, real Host or model calls.
export function createConnectionFixture(handler) {
  const routes = new Map()
  const connection = { fetch: { register(route) {
    assert.equal(routes.has(route.path), false)
    routes.set(route.path, route)
    return () => routes.delete(route.path)
  } } }
  const dispose = registerWorkbenchRoutes(connection, handler)
  let sequence = 0
  return {
    dispose,
    rpc: { async call(channel, method, payload, signal) {
      assert.equal(channel, '/api')
      const path = channel + '/' + method
      const route = routes.get(path)
      assert.ok(route, 'client method must address an owned registered route')
      const rpcId = 'fixture-' + ++sequence
      const response = await route.fetch(new Request('http://127.0.0.1' + path, {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal,
        body: JSON.stringify({ type: 'client-request', rpcId, method, payload }),
      }))
      assert.equal(response.status, 200)
      const envelope = await response.json()
      assert.equal(envelope.type, 'server-response')
      assert.equal(envelope.rpcId, rpcId)
      return envelope.result
    } },
  }
}
