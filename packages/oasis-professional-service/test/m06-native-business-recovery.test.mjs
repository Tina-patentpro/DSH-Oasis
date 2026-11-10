import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFile,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {resultFixture} from './v340-result-fixture.mjs'
import {createWorkbenchRpcHandler} from '../src/workbench-rpc.js'
import {registerWorkbenchRoutes} from '../src/workbench-connection.js'
const recovery=await import('../src/m06-native-business-recovery.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return{};throw e})
const marker={schemaVersion:1,policy:'m06-native-business-recovery-v1'}
const hash=x=>createHash('sha256').update(x).digest('hex')
async function setup(t){
 assert.equal(typeof recovery.createM06NativeBusinessRecovery,'function','bounded recovery composition must exist')
 const h=await resultFixture(t,'local-skill',{nodeId:'Flow-2-6'})
 const old=h.workspaceRegistry.get
 h.workspaceRegistry.get=id=>{const v=old(id);return v?{...v,id}:undefined}
 await h.repository.mutate('a',h.record().revision,r=>({...r,activeTaskId:null}))
 const scope={schemaVersion:1,policy:marker.policy,root:h.root,workspaceId:'a',workspacePath:h.root,taskId:'new',runId:h.run().runId,inputSha256:h.run().inputSha256}
 const mode=recovery.createM06NativeBusinessRecovery({repository:h.repository,workspaceRegistry:h.workspaceRegistry,scope})
 const handler=createWorkbenchRpcHandler(h.service,null,null,null,{m06Candidate013:true,nativeBusinessRecovery:mode})
 return{...h,scope,mode,handler,call:(endpoint,payload={})=>handler(endpoint,payload)}
}
test('recovery selects an existing task without replacing editable or result data',async t=>{
 const h=await setup(t),before=h.record(),selected=await h.call('workflow/v340/task/select',h.command({}))
 assert.equal(selected.ok,true);assert.equal(selected.value.current.activeTaskId,'new')
 assert.equal(selected.value.current.revision,before.revision+1)
 assert.deepEqual(selected.value.current.tasks,before.tasks);assert.deepEqual(selected.value.current.taskOrder,before.taskOrder)
 const bytes=await readFile(h.file,'utf8')
 assert.equal((await h.call('workflow/v340/task/select',h.command({}))).ok,true)
 assert.equal(await readFile(h.file,'utf8'),bytes,'same selection is a no-op')
 const stale=await h.call('workflow/v340/task/select',{workspaceId:'a',taskId:'new',expectedRevision:before.revision})
 assert.equal(stale.value.committed,false);assert.equal(stale.value.reason,'revision-conflict')
 assert.equal((await h.call('workflow/v340/task/select',{...h.command({}),state:{}})).ok,false)
})
test('recovery denies broad mutations, foreign identity and generation before dispatch',async t=>{
 const h=await setup(t),before=await readFile(h.file,'utf8'),calls=h.generationCalls
 for(const endpoint of ['state/replace','workflow/v340/task/create','workflow/v340/task/draft','workflow/v340/candidate/prepare','workflow/v340/candidate/run','workflow/v340/run/create','workflow/v340/run/observe','workflow/v340/run/stop','workflow/v340/prepare','account/status','account/login','import/open','professional/bootstrap','task/create-local','artifact/commit-writeback']){
  const value=await h.call(endpoint,{})
  assert.equal(value.ok,false,endpoint);assert.equal(value.error.code,'NATIVE_BUSINESS_RECOVERY_DENIED',endpoint)
 }
 assert.equal((await h.call('state/get',{workspaceId:'b'})).ok,false)
 assert.equal((await h.call('workflow/v340/task/select',{...h.command({}),taskId:'other'})).ok,false)
 assert.equal(await readFile(h.file,'utf8'),before);assert.equal(h.generationCalls,calls)
 const catalog=await h.call('workflow/v340/catalog',{})
 assert.deepEqual(catalog.value.nativeBusinessRecovery,marker)
 assert.ok(catalog.value.nodes.every(n=>!n.m06Candidate));assert.equal(catalog.value.dispatchEnabled,false)
 assert.throws(()=>createWorkbenchRpcHandler(h.service,null,null,null,{m06Candidate013:true,nativeZeroGeneration:true,nativeBusinessRecovery:h.mode}))
})
test('recovery edits and reviews through existing services and guards token-only commit',async t=>{
 const h=await setup(t),run=h.run(),id=run.runId,base=run.result.sha256
 await h.call('workflow/v340/task/select',h.command({}))
 const body='公开的新核心修订，仍须专业核对。'
 assert.equal((await h.call('workflow/v340/result/draft',h.command({runId:id,baseSha256:base,body,format:'core-markdown'}))).ok,true)
 const edit=await h.call('workflow/v340/result/edit',h.command({runId:id,versionId:id,baseSha256:base,draftSha256:hash(body),requestKey:'recovery-edit'}))
 assert.equal(edit.ok,true)
 const v=h.run().resultVersions.at(-1),target={runId:id,versionId:v.versionId,resultSha256:v.result.sha256}
 assert.equal(v.review.status,'not-reviewed')
 assert.equal((await h.call('workflow/v340/result/prepare-save',h.command(target))).error.code,'V340_REVIEW_REQUIRED')
 assert.equal((await h.call('workflow/v340/result/review',h.command({...target,confirmed:true}))).ok,true)
 const outside=await h.service.prepareV340Save(h.command(target))
 assert.equal((await h.call('workflow/v340/result/commit-save',{confirmationToken:outside.confirmationToken})).ok,false,'token not issued by this scope')
 const prepared=await h.call('workflow/v340/result/prepare-save',h.command(target))
 assert.equal(prepared.ok,true)
 const token=prepared.value.confirmationToken
 const saved=await h.call('workflow/v340/result/commit-save',{confirmationToken:token})
 assert.equal(saved.ok,true);assert.equal(h.writebackCalls.consume,1)
 assert.equal((await h.call('workflow/v340/result/commit-save',{confirmationToken:token})).ok,false)
 const receipt=h.run().resultVersions.at(-1).writebacks[0]
 const path=join(h.root,receipt.files.find(f=>f.mediaType==='text/markdown').relativePath)
 await writeFile(path,(await readFile(path,'utf8'))+'\n用户明确追加的合成标记')
 const opened=await h.call('workflow/v340/result/saved-file',h.command({...target,writebackId:receipt.writebackId}))
 assert.equal(opened.value.matchesReviewed,false)
 const draft=await h.call('workflow/v340/result/conversation-draft',h.command(target))
 assert.ok(!draft.value.text.includes('用户明确追加的合成标记'));assert.ok(draft.value.text.includes(v.result.sha256))
})
test('recovery token invalidates on revision change and cannot survive a new mode instance',async t=>{
 const h=await setup(t),run=h.run(),target={runId:run.runId,versionId:run.runId,resultSha256:run.result.sha256}
 await h.call('workflow/v340/result/review',h.command({...target,confirmed:true}))
 const p=await h.call('workflow/v340/result/prepare-save',h.command(target))
 const fresh=recovery.createM06NativeBusinessRecovery({repository:h.repository,workspaceRegistry:h.workspaceRegistry,scope:h.scope})
 const other=createWorkbenchRpcHandler(h.service,null,null,null,{m06Candidate013:true,nativeBusinessRecovery:fresh})
 assert.equal((await other('workflow/v340/result/commit-save',{confirmationToken:p.value.confirmationToken})).ok,false)
 await h.call('workflow/v340/task/select',h.command({}))
 assert.equal((await h.call('workflow/v340/result/commit-save',{confirmationToken:p.value.confirmationToken})).ok,false)
 assert.equal(h.writebackCalls.consume,0)
})
test('recovery rechecks authoritative roots and registers no paid or broad RPC routes',async t=>{
 const h=await setup(t),routes=[]
 const dispose=registerWorkbenchRoutes({fetch:{register(r){routes.push(r.path);return()=>{}}}},h.handler,{m06Candidate013:true,nativeBusinessRecovery:h.mode})
 assert.equal(routes.length,11);assert.ok(routes.includes('/api/oasis-workbench/workflow/v340/task/select'))
 assert.ok(!routes.some(x=>/account|candidate|state\/replace/.test(x)))
 h.workspaceRegistry.get=()=>({id:'a',path:join(h.root,'missing'),status:async()=>'ok'})
 assert.equal((await h.call('state/get',{workspaceId:'a'})).ok,false)
 await dispose()
})
