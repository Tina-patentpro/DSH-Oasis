import test from 'node:test'
import assert from 'node:assert/strict'
import { registerWorkbenchRoutes } from '../src/workbench-connection.js'

function fixture(failAt = -1) {
  const routes = new Map(), calls = []
  let registrations = 0
  const connection = { fetch: { register(route) {
    if (registrations++ === failAt) throw new Error('registration failed')
    assert.equal(routes.has(route.path), false)
    routes.set(route.path, route)
    return () => routes.delete(route.path)
  } } }
  const handler = async (endpoint,payload) => { calls.push({endpoint,payload}); return {ok:true,value:{received:payload}} }
  return {connection,routes,calls,handler}
}
function request(endpoint,patch={}) {
  return new Request('http://127.0.0.1:43121/api/oasis-workbench/'+endpoint, {
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({type:'client-request',rpcId:'synthetic-1',method:'oasis-workbench/'+endpoint,payload:{workspaceId:'workspace-a'}}),...patch,
  })
}
test('owned routes preserve RPC correlation and handler validation boundary without intercepting other services',async()=>{
  const f=fixture(),dispose=registerWorkbenchRoutes(f.connection,f.handler)
  assert.equal(f.routes.size,41)
  for(const route of f.routes.values()) {
    assert.deepEqual(route.methods,['POST'])
    assert.equal(route.requestBody,'buffered')
    assert.ok(route.path.startsWith('/api/oasis-workbench/'))
  }
  const route=f.routes.get('/api/oasis-workbench/state/get')
  const response=await route.fetch(request('state/get'))
  assert.equal(response.status,200)
  assert.deepEqual(await response.json(),{type:'server-response',rpcId:'synthetic-1',result:{ok:true,value:{received:{workspaceId:'workspace-a'}}}})
  assert.deepEqual(f.calls,[{endpoint:'state/get',payload:{workspaceId:'workspace-a'}}])
  await dispose(); await dispose()
  assert.equal(f.routes.size,0)
})
test('invalid transport envelopes never dispatch the business handler',async()=>{
  const f=fixture(),dispose=registerWorkbenchRoutes(f.connection,f.handler)
  const route=f.routes.get('/api/oasis-workbench/state/get')
  for(const req of [
    request('state/get',{method:'GET',body:undefined}),
    request('state/get',{headers:{'content-type':'text/plain'}}),
    request('state/get',{body:'broken'}),
    request('state/get',{body:JSON.stringify({type:'client-request',rpcId:4,method:'oasis-workbench/state/get',payload:{}})}),
    request('state/get',{body:JSON.stringify({type:'client-request',rpcId:'1',method:'oasis-workbench/state/replace',payload:{}})}),
    request('state/replace'),
  ]) assert.ok((await route.fetch(req)).status>=400)
  assert.deepEqual(f.calls,[])
  await dispose()
})
test('partial route registration is rolled back',()=>{
  const f=fixture(2)
  assert.throws(()=>registerWorkbenchRoutes(f.connection,f.handler),/registration failed/)
  assert.equal(f.routes.size,0)
})
test('business failure results are not retried or converted into success',async()=>{
  const f=fixture();let count=0
  const dispose=registerWorkbenchRoutes(f.connection,async()=>{count++;return {ok:false,error:{code:'REVISION_CONFLICT',message:'Conflict',details:{}}}})
  const response=await f.routes.get('/api/oasis-workbench/state/get').fetch(request('state/get'))
  assert.equal((await response.json()).result.error.code,'REVISION_CONFLICT')
  assert.equal(count,1)
  await dispose()
})
