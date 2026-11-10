import test from 'node:test'
import assert from 'node:assert/strict'
import {setupM06ControlledHost as host} from './helpers/m06-controlled-host-harness.mjs'

test('explicit M06 workarea entry permits native account/project association without opening remote generation',async t=>{
  const entry=await import('oasis-professional-service/m06-workarea-host-013').catch(()=>({}))
  assert.equal(typeof entry.apply,'function')
  let reads=0
  const f=await host(t,{entry,beforeApply(ctx){ctx.credentials={
    readRecord:async()=>{reads++;return null},describeRecord:async()=>({writable:true}),
    modifyRecord:async()=>assert.fail('no login or credential save'),deleteRecord:async()=>assert.fail('no logout'),
  }}})
  const status=await f.rpc('account/status',{})
  assert.equal(status.ok,true);assert.equal(status.value.available,true);assert.equal(status.value.authenticated,false)
  assert.equal(reads,1)
  const bootstrap=await f.rpc('professional/bootstrap',{})
  assert.equal(bootstrap.value.remoteEnabled,false)
  const opened=await f.rpc('import/open',{workspaceId:'w',confirmed:true})
  assert.equal(opened.ok,false);assert.equal(opened.error.code,'AUTH_REQUIRED')
  const catalog=await f.rpc('workflow/v340/catalog',{})
  assert.equal(catalog.value.nodes.find(n=>n.nodeId==='Flow-2-6').m06Candidate.skillVersion,'0.1.3')
  assert.equal(f.calls.adapter,0);assert.equal(f.calls.network,0)
})

test('authenticated controlled entry resolves its actual native settings owner before reading projects',async t=>{
  const entry=await import('oasis-professional-service/m06-workarea-host-013')
  const owner='oasis-m06-workarea-live-013'
  const f=await host(t,{entry,beforeApply(ctx){
    ctx.fiber={entry:{options:{id:owner}}}
    ctx.settings.describe=()=>[{ns:owner,revision:0,value:{websiteProjectLinks:[],workspaceApiBindings:[]}}]
    ctx.credentials={readRecord:async()=>({kind:'grant',payload:{origin:'https://lzhxpy.oasisintwrite.com',accountId:33,token:'synthetic-only',revision:'test-grant'}}),
      describeRecord:async()=>({writable:true}),modifyRecord:async()=>assert.fail('no credential write'),deleteRecord:async()=>assert.fail('no logout')}
  }})
  const opened=await f.rpc('import/open',{workspaceId:'w',confirmed:true})
  assert.equal(opened.ok,true)
  assert.equal(opened.value.accountId,33)
  assert.equal(opened.value.link,null)
  assert.equal(f.calls.adapter,0);assert.equal(f.calls.network,0)
})
