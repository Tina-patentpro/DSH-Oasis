import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {resultFixture} from './v340-result-fixture.mjs'
import {createWorkbenchService} from '../src/workbench-service.js'
import {createWorkbenchRpcHandler} from '../src/workbench-rpc.js'
import {createWorkbenchRemote} from '../src/client/workbench-remote.js'
import {createWorkbenchStore} from '../src/client/workbench-store.js'
import {createConversationDraftBridge} from '../src/client/conversation-draft-bridge.js'
import {createWorkspaceMaterialManager} from '../src/workspace-materials.js'
import {openOasisWorkbenchRepository} from '../src/workbench-repository.js'

const hash=s=>createHash('sha256').update(s).digest('hex')
const turn=()=>new Promise(resolve=>setImmediate(resolve))
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r});return{promise,resolve}}
function scheduler(){let id=0;const timers=new Map();return{
 setTimeout(fn,delay){timers.set(++id,{fn,delay});return id},clearTimeout(id){timers.delete(id)},
 delays:()=>[...timers.values()].map(t=>t.delay),run(){const entry=timers.entries().next().value;assert.ok(entry,'close deadline must exist');timers.delete(entry[0]);entry[1].fn()}
}}
async function reviewed(t,source='local-skill'){
 const f=await resultFixture(t,source),run=f.run(),target={runId:run.runId,versionId:run.runId,resultSha256:run.result.sha256}
 await f.service.reviewV340Result(f.command({...target,confirmed:true}))
 const plan=await f.service.prepareV340Save(f.command(target));await f.service.commitV340Save({confirmationToken:plan.confirmationToken})
 return {f,target,file:plan.manifest.files.find(f=>f.mediaType==='text/markdown'),saved:f.run().resultVersions[0].writebacks[0]}
}
async function client(t,f,remote=f.remote,options={}){
 let input={phase:'plain',draft:'',draftRev:0,occurrences:[],imageIds:[]}
 const bridge=createConversationDraftBridge(()=>({status:'ready',currentSessionId:'s',workspaceItems:[{workspaceId:'a',sessionIds:['s']}]}))
 bridge.register({sessionId:'s',workspaceId:'a',read:()=>input,inputActions:{setDraft(text){input={...input,draft:text,draftRev:input.draftRev+1}},submit(){assert.fail('must not send')}}})
 const opened=[],store=createWorkbenchStore({remote,saveDelayMs:0,conversationDrafts:bridge,nativeFiles:{captureSavedFileTarget:id=>({workspaceId:id}),openSavedFile(_,file){opened.push(file);return true}},...options})
 t.after(()=>store.dispose());store.syncWorkspaces([{workspaceId:'a'}]);await store.hydrateWorkspace('a')
 return {store,opened,input:()=>input}
}
const handoff=(h,kind,target,saved)=>kind==='reference'?h.store.useV340InConversation('a','new',target):h.store.openV340SavedFile('a','new',target,saved.writebackId)
const noEffects=h=>{assert.equal(h.input().draft,'');assert.deepEqual(h.opened,[])}

// Removing either the Host path precondition or the material-reader check must fail these real RPC tests.
for(const source of ['local-skill','oasis-api'])test(`NH-R1 ${source}: root A-B-A cannot combine A path with B hash or open a false reviewed match`,async t=>{
 const {f,target,file,saved}=await reviewed(t,source),other=f.root+'/other';await mkdir(other)
 await writeFile(other+'/'+file.relativePath,f.run().result.body);await writeFile(file.absolutePath,'A项目已修改文件')
 const disk=await readFile(f.file);let reads=0
 const registry={get:id=>id==='a'?{path:++reads===2?other:f.root,async status(){return'ok'}}:undefined}
 const service=createWorkbenchService({repository:f.repository,workspaceRegistry:registry,materialManager:createWorkspaceMaterialManager({workspaceRegistry:registry})});t.after(()=>service.closeV340Runtime())
 const handler=createWorkbenchRpcHandler(service),remote=createWorkbenchRemote({rpc:{call:(_ch,endpoint,payload)=>handler(endpoint.replace('oasis-workbench/',''),payload)}}),h=await client(t,f,remote)
 await assert.rejects(()=>handoff(h,'open',target,saved),e=>e.code==='WORKSPACE_ROOT_CHANGED')
 noEffects(h);assert.equal(h.store.getWorkspaceState('a').pageOperations.new.feedback,null)
 assert.equal(await readFile(file.absolutePath,'utf8'),'A项目已修改文件');assert.deepEqual(await readFile(f.file),disk)
 assert.ok((await f.remote.v340('result/conversation-draft',f.command(target))).text.endsWith(f.run().result.body))
})

test('NH-R1 stable root returns the actual changed-file hash and keeps legacy inspection evidence shape',async t=>{
 const {f,target,file,saved}=await reviewed(t),manager=createWorkspaceMaterialManager({workspaceRegistry:f.workspaceRegistry})
 const policy={acceptedExtensions:['.md'],maxFileBytes:1024*1024,contentReadMode:'metadata-only'},body='稳定根目录下的当前文件🙂';await writeFile(file.absolutePath,body)
 const legacy=await manager.inspect('a',file.relativePath,policy),bound=await manager.inspect('a',file.relativePath,policy,file.absolutePath)
 assert.deepEqual(Object.keys(bound),Object.keys(legacy));assert.equal(bound.sha256,hash(body));assert.equal(legacy.sha256,bound.sha256)
 const resolved=await f.remote.v340('result/saved-file',f.command({...target,writebackId:saved.writebackId}));assert.equal(resolved.currentSha256,hash(body));assert.equal(resolved.matchesReviewed,false)
 await assert.rejects(()=>manager.inspect('a',file.relativePath,policy,f.root+'/unrelated.md'),e=>e.code==='WORKSPACE_ROOT_CHANGED')
 await writeFile(file.absolutePath,'x'.repeat(1024*1024+1));await assert.rejects(()=>f.service.resolveV340SavedFile(f.command({...target,writebackId:saved.writebackId})),e=>e.code==='MATERIAL_TOO_LARGE')
})

// The two handoffs share cancellation code but must both obey the externally visible shutdown contract.
for(const kind of ['reference','open'])test(`NH-R2 ${kind}: close during ordinary-save flush starts one deadline and rejects new actions immediately`,async t=>{
 const {f,target,saved}=await reviewed(t),started=deferred(),release=deferred(),finished=deferred(),timer=scheduler();let reads=0
 const remote={...f.remote,async replace(...args){started.resolve();await release.promise;try{return await f.remote.replace(...args)}finally{finished.resolve()}},async v340(...args){reads++;return f.remote.v340(...args)}}
 const h=await client(t,f,remote,{disposeDrainMs:10,scheduler:timer});h.store.renamePage('a','new','关闭前已接受的重命名');await started.promise
 const pending=handoff(h,kind,target,saved);await turn();let closing
 try{
  closing=h.store.dispose();assert.deepEqual(timer.delays(),[10]);assert.equal(closing,h.store.dispose())
  assert.throws(()=>h.store.renamePage('a','new','关闭后不能接受'),/closing|disposed/)
  assert.throws(()=>h.store.selectV340Version('a','new',target.runId,target.versionId),/closing|disposed/)
  await assert.rejects(()=>handoff(h,kind,target,saved),/closing|disposed/)
  timer.run();await closing;assert.equal(await pending,false);assert.equal(h.store.peekWorkspaceState('a').workspaceId,null)
  release.resolve();await finished.promise;await turn();assert.equal(reads,0);noEffects(h);assert.equal(h.store.peekWorkspaceState('a').workspaceId,null)
 }finally{release.resolve();await Promise.allSettled([pending,closing??h.store.dispose()])}
})

for(const kind of ['reference','open'])test(`NH-R2 ${kind}: flushing acknowledged before the close deadline never starts a cancelled readonly RPC`,async t=>{
 const {f,target,saved}=await reviewed(t),started=deferred(),release=deferred(),timer=scheduler();let reads=0
 const remote={...f.remote,async replace(...args){started.resolve();await release.promise;return f.remote.replace(...args)},async v340(...args){reads++;return f.remote.v340(...args)}}
 const h=await client(t,f,remote,{disposeDrainMs:10,scheduler:timer});h.store.renamePage('a','new','及时排空的旧写入');await started.promise
 const pending=handoff(h,kind,target,saved);await turn();const closing=h.store.dispose();release.resolve()
 try{await closing;assert.equal(await pending,false);assert.equal(reads,0);noEffects(h);assert.equal(f.record().tasks.new.title,'及时排空的旧写入');assert.deepEqual(timer.delays(),[])}
 finally{release.resolve();await Promise.allSettled([pending,closing])}
})

for(const kind of ['reference','open'])test(`NH-R2 ${kind}: queued read cancels immediately even when a prior V340 write ignores abort`,async t=>{
 const {f,target,saved}=await reviewed(t),started=deferred(),release=deferred(),timer=scheduler();let readCalls=0,writeSignal
 const remote={...f.remote,async v340(action,payload,signal,...rest){
  if(action==='task/draft'){const result=await f.remote.v340(action,payload,signal,...rest);writeSignal=signal;started.resolve();await release.promise;return result}
  readCalls++;return f.remote.v340(action,payload,signal,...rest)
 }}
 const h=await client(t,f,remote,{disposeDrainMs:10,scheduler:timer}),draft={...f.task().draft,textInputs:{research_request_text:'已写Host、响应尚未确认'}}
 const write=h.store.saveV340Draft('a','new',draft);await started.promise;const pending=handoff(h,kind,target,saved);await turn();let closing
 try{
  closing=h.store.dispose();const quick=await Promise.race([pending,turn().then(()=> 'still-pending')]);assert.equal(quick,false)
  assert.deepEqual(timer.delays(),[10]);timer.run();await closing;assert.equal(writeSignal.aborted,true);noEffects(h)
  release.resolve();await write;await turn();assert.equal(readCalls,0);assert.equal(h.store.peekWorkspaceState('a').workspaceId,null)
  assert.equal(f.task().draft.textInputs.research_request_text,'已写Host、响应尚未确认')
 }finally{release.resolve();await Promise.allSettled([pending,write,closing??h.store.dispose()])}
})

for(const kind of ['reference','open'])test(`NH-R2 ${kind}: cancelled RPC response cannot perform native effects or repopulate disposed state`,async t=>{
 const {f,target,saved}=await reviewed(t),started=deferred(),release=deferred(),timer=scheduler()
 const remote={...f.remote,async v340(...args){const result=await f.remote.v340(...args);started.resolve();await release.promise;return result}}
 const h=await client(t,f,remote,{disposeDrainMs:10,scheduler:timer}),pending=handoff(h,kind,target,saved);await started.promise
 const closing=h.store.dispose()
 try{await closing;assert.equal(await pending,false);release.resolve();await turn();noEffects(h);assert.equal(h.store.peekWorkspaceState('a').workspaceId,null);assert.deepEqual(timer.delays(),[])}
 finally{release.resolve();await Promise.allSettled([pending,closing])}
})

test('NH-R2 close drains previously accepted input and result drafts behind a cancelled read and preserves Host evidence across reopen',async t=>{
 const {f,target}=await reviewed(t),started=deferred(),release=deferred(),timer=scheduler()
 const remote={...f.remote,async v340(action,...args){const result=await f.remote.v340(action,...args);if(action==='result/conversation-draft'){started.resolve();await release.promise}return result}}
 const h=await client(t,f,remote,{disposeDrainMs:10,scheduler:timer}),pending=handoff(h,'reference',target);await started.promise
 const input=h.store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'关闭前接受的输入'}})
 const edit=h.store.saveV340ResultDraft('a','new',{runId:target.runId,versionId:target.versionId,baseSha256:target.resultSha256},'关闭前接受的核心编辑')
 const original=structuredClone(f.run().result),closing=h.store.dispose()
 try{
  await closing;await Promise.all([input,edit]);assert.equal(await pending,false);noEffects(h)
  assert.equal(f.task().draft.textInputs.research_request_text,'关闭前接受的输入');assert.equal(f.run().coreResultDrafts[target.versionId].body,'关闭前接受的核心编辑')
  assert.deepEqual(f.run().result,original);assert.equal(f.run().resultVersions[0].review.status,'approved');assert.equal(f.run().resultVersions[0].writebacks.length,1);assert.deepEqual(timer.delays(),[])
  const before=structuredClone(f.record());await f.repository.close();const reopened=await openOasisWorkbenchRepository(f.storageDomain);assert.deepEqual(reopened.get('a'),before);await reopened.close()
 }finally{release.resolve();await Promise.allSettled([pending,input,edit,closing])}
})

test('NH-R2 failed pre-close draft still rejects to its caller and never becomes a successful Host write',async t=>{
 const {f,target}=await reviewed(t),started=deferred(),release=deferred(),timer=scheduler()
 const remote={...f.remote,async v340(action,...args){const result=await f.remote.v340(action,...args);if(action==='result/conversation-draft'){started.resolve();await release.promise}return result}}
 const h=await client(t,f,remote,{disposeDrainMs:10,scheduler:timer}),pending=handoff(h,'reference',target);await started.promise;f.failWrites=true
 const before=await readFile(f.file),write=h.store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'不能伪记成功的输入'}}),rejection=assert.rejects(write),closing=h.store.dispose()
 try{await closing;await rejection;assert.equal(await pending,false);assert.deepEqual(await readFile(f.file),before);noEffects(h);assert.deepEqual(timer.delays(),[])}
 finally{f.failWrites=false;release.resolve();await Promise.allSettled([pending,write,closing])}
})

test('NH-R2 an accepted edit whose digest completes after the close deadline must not start a write RPC',async t=>{
 const {f,target}=await reviewed(t),timer=scheduler(),started=deferred(),release=deferred(),calls=[]
 const remote={...f.remote,async v340(action,...args){calls.push(action);return f.remote.v340(action,...args)}}
 const h=await client(t,f,remote,{disposeDrainMs:10,scheduler:timer}),editTarget={runId:target.runId,versionId:target.versionId,baseSha256:target.resultSha256}
 await h.store.saveV340ResultDraft('a','new',editTarget,'摘要迟到时必须保留原核心草稿');calls.length=0
 const originalDigest=globalThis.crypto.subtle.digest
 t.mock.method(globalThis.crypto.subtle,'digest',async function(...args){started.resolve();await release.promise;return originalDigest.apply(this,args)})
 const before=await readFile(f.file),edit=h.store.editV340Result('a','new',editTarget),outcome=edit.then(()=>({ok:true}),error=>({ok:false,error}));await started.promise
 const closing=h.store.dispose()
 try{
  assert.deepEqual(timer.delays(),[10]);timer.run();await closing;release.resolve();const result=await outcome
  assert.deepEqual(calls,[],'late digest must not invoke result/edit even with an aborted transport signal')
  assert.equal(result.ok,false);assert.match(result.error.message,/closing|disposed|abort/i)
  assert.deepEqual(await readFile(f.file),before);assert.equal(f.run().coreResultDrafts[target.versionId].body,'摘要迟到时必须保留原核心草稿')
  noEffects(h);assert.equal(h.store.peekWorkspaceState('a').workspaceId,null)
 }finally{release.resolve();await Promise.allSettled([edit,closing])}
})
