import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resultFixture} from './v340-result-fixture.mjs'
import {createWorkbenchStore} from '../src/client/workbench-store.js'
import {createConversationDraftBridge} from '../src/client/conversation-draft-bridge.js'

async function fixture(t){
 const f=await resultFixture(t),run=f.run(),target={runId:run.runId,versionId:run.runId,resultSha256:run.result.sha256}
 await f.service.reviewV340Result(f.command({...target,confirmed:true}));const plan=await f.service.prepareV340Save(f.command(target));await f.service.commitV340Save({confirmationToken:plan.confirmationToken})
 const saved=f.run().resultVersions[0].writebacks[0];return {f,target,saved}
}
async function client(t,f,remote){
 let input={phase:'plain',draft:'',draftRev:0,occurrences:[],imageIds:[]}
 const bridge=createConversationDraftBridge(()=>({status:'ready',currentSessionId:'s',workspaceItems:[{workspaceId:'a',sessionIds:['s']}]}))
 bridge.register({sessionId:'s',workspaceId:'a',read:()=>input,inputActions:{setDraft(text){input={...input,draft:text,draftRev:input.draftRev+1}},submit(){assert.fail('no sending')}}})
 const opened=[],store=createWorkbenchStore({remote,saveDelayMs:0,conversationDrafts:bridge,nativeFiles:{captureSavedFileTarget:id=>({workspaceId:id}),openSavedFile(_,file){opened.push(file);return true}}})
 t.after(()=>store.dispose());store.syncWorkspaces([{workspaceId:'a'}]);await store.hydrateWorkspace('a');return {store,input:()=>input,opened}
}

for(const kind of ['reference','open'])test(`close reentered synchronously from handoff-start notification forbids a new ${kind} RPC`,async t=>{
 const {f,target,saved}=await fixture(t),disk=await readFile(f.file),calls=[]
 const remote={...f.remote,async v340(action,payload,signal,...rest){calls.push({action,aborted:signal.aborted});return f.remote.v340(action,payload,signal,...rest)}}
 const h=await client(t,f,remote);let closing
 const unsubscribe=h.store.subscribe(()=>{if(!closing&&h.store.getWorkspaceState('a').pageOperations.new?.activeOperation==='v340-handoff')closing=h.store.dispose()})
 const result=await (kind==='reference'?h.store.useV340InConversation('a','new',target):h.store.openV340SavedFile('a','new',target,saved.writebackId))
 assert.ok(closing);await closing;unsubscribe();assert.equal(result,false);assert.equal(h.input().draft,'');assert.deepEqual(h.opened,[]);assert.deepEqual(await readFile(f.file),disk)
 t.diagnostic(JSON.stringify({kind,calls,disposed:h.store.peekWorkspaceState('a').workspaceId===null}))
 assert.deepEqual(calls,[],'a subscriber already cancelled handoff before the transport invocation')
})


for(const kind of ['reference','open'])test(`synchronous ${kind} cancellation still drains a write accepted by the same subscriber`,async t=>{
 const {f,target,saved}=await fixture(t),calls=[]
 const remote={...f.remote,async v340(action,payload,signal,...rest){calls.push({action,aborted:signal.aborted});return f.remote.v340(action,payload,signal,...rest)}}
 const h=await client(t,f,remote);let fired=false,closing,write
 const original=structuredClone(f.run().resultVersions[0])
 const unsubscribe=h.store.subscribe(()=>{
  if(fired||h.store.getWorkspaceState('a').pageOperations.new?.activeOperation!=='v340-handoff')return
  fired=true
  write=h.store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'同步回调已接受草稿'}})
  closing=h.store.dispose();assert.equal(closing,h.store.dispose())
 })
 const result=await (kind==='reference'?h.store.useV340InConversation('a','new',target):h.store.openV340SavedFile('a','new',target,saved.writebackId))
 await Promise.all([closing,write]);unsubscribe()
 assert.equal(fired,true);assert.equal(result,false);assert.deepEqual(calls,[{action:'task/draft',aborted:false}])
 assert.equal(h.input().draft,'');assert.deepEqual(h.opened,[]);assert.equal(h.store.peekWorkspaceState('a').workspaceId,null)
 const disk=JSON.parse(await readFile(f.file,'utf8'));assert.equal(disk.a.tasks.new.v340.draft.textInputs.research_request_text,'同步回调已接受草稿');assert.deepEqual(f.run().resultVersions[0],original)
})
