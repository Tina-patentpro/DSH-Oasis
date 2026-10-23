import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {resultFixture} from './v340-result-fixture.mjs'
import {createV3Task} from './workbench-fixtures.mjs'
import {createWorkbenchStore} from '../src/client/workbench-store.js'
import {createWorkbenchService} from '../src/workbench-service.js'
import {createWorkspaceMaterialManager} from '../src/workspace-materials.js'
const turn=()=>new Promise(r=>setImmediate(r))
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r});return{promise,resolve}}
function scheduler(){let id=0;const timers=new Map();return{setTimeout(fn,delay){timers.set(++id,{fn,delay});return id},clearTimeout(id){timers.delete(id)},delays:()=>[...timers.values()].map(t=>t.delay),run(delay){const entry=[...timers].find(([,t])=>t.delay===delay);assert.ok(entry,'expected timer');timers.delete(entry[0]);entry[1].fn()}}}
async function client(t,f,remote=f.remote,options={}){const store=createWorkbenchStore({remote,saveDelayMs:0,...options});t.after(()=>store.dispose());store.syncWorkspaces([{workspaceId:'a'}]);await store.hydrateWorkspace('a');return store}
async function reviewed(t,source='local-skill'){const f=await resultFixture(t,source),run=f.run(),target={runId:run.runId,versionId:run.runId,resultSha256:run.result.sha256};await f.service.reviewV340Result(f.command({...target,confirmed:true}));const plan=await f.service.prepareV340Save(f.command(target));await f.service.commitV340Save({confirmationToken:plan.confirmationToken});return {f,target,file:plan.manifest.files.find(f=>f.mediaType==='text/markdown'),saved:f.run().resultVersions[0].writebacks[0]}}

async function ordinaryWorkspace(f,id){
 const root=f.root+'/workspace-'+id;await mkdir(root);const get=f.workspaceRegistry.get
 f.workspaceRegistry.get=key=>key===id?{path:root,async status(){return'ok'}}:get(key)
 await f.repository.mutate(id,0,r=>({...r,panelMode:'normal',activeTaskId:'task-'+id,taskOrder:['task-'+id],tasks:{['task-'+id]:{...createV3Task('task-'+id),title:id+'原始标题',generation:null}}}))
}

for(const hangA of [false,true])test(`independent B draft must close-flush despite A queue hang=${hangA}`,async t=>{
 const f=await resultFixture(t),timer=scheduler(),started=deferred(),release=deferred(),bSaved=deferred(),replaceCalls=[]
 await ordinaryWorkspace(f,'b')
 const remote={...f.remote,async v340(...args){const result=await f.remote.v340(...args);started.resolve();if(hangA)await release.promise;return result},async replace(...args){replaceCalls.push(args[0]);const result=await f.remote.replace(...args);bSaved.resolve();return result}}
 const store=await client(t,f,remote,{saveDelayMs:400,disposeDrainMs:10,scheduler:timer});store.syncWorkspaces([{workspaceId:'a'},{workspaceId:'b'}]);await store.hydrateWorkspace('b')
 const write=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'A已接受写入'}});await started.promise;if(!hangA)await write
 store.renamePage('b','task-b','B已接受的独立标题');assert.equal(store.getWorkspaceState('b').pages[0].title,'B已接受的独立标题')
 const closing=store.dispose()
 try{
  if(hangA){await turn();assert.deepEqual([...replaceCalls],['b'],'B must start saving without waiting for A');await bSaved.promise;assert.ok(timer.delays().includes(10));timer.run(10)}
  await closing
  const persistedB=f.repository.get('b').tasks['task-b'].title,clientWorkspace=store.peekWorkspaceState('b').workspaceId,diskB=JSON.parse(await readFile(f.file,'utf8')).b.tasks['task-b'].title
  assert.equal(persistedB,diskB);t.diagnostic(JSON.stringify({hangA,replaceCalls,persistedB,diskB,clientWorkspace,remainingTimers:timer.delays()}))
  assert.equal(persistedB,'B已接受的独立标题','B is writable and independent; A must not suppress its accepted close drain')
  assert.deepEqual(replaceCalls,['b']);assert.equal(clientWorkspace,null)
 }finally{release.resolve();await Promise.allSettled([write,closing])}
})

for(const source of ['local-skill','oasis-api'])test(`root flip around actual inspect refuses mismatch without relying on registry call counts ${source}`,async t=>{
 const {f,target,file,saved}=await reviewed(t,source),other=f.root+'/other';await mkdir(other);await writeFile(other+'/'+file.relativePath,f.run().result.body);await writeFile(file.absolutePath,'A当前文件已经不同')
 let root=f.root;const registry={get:id=>id==='a'?{path:root,async status(){return'ok'}}:undefined},materials=createWorkspaceMaterialManager({workspaceRegistry:registry}),service=createWorkbenchService({repository:f.repository,workspaceRegistry:registry,materialManager:{...materials,async inspect(...args){root=other;try{return await materials.inspect(...args)}finally{root=f.root}}}});t.after(()=>service.closeV340Runtime());const bytes=await readFile(f.file)
 await assert.rejects(()=>service.resolveV340SavedFile(f.command({...target,writebackId:saved.writebackId})),e=>e.code==='WORKSPACE_ROOT_CHANGED');assert.equal(root,f.root);assert.deepEqual(await readFile(f.file),bytes)
 const ref=await f.service.prepareV340ConversationDraft(f.command(target));assert.ok(ref.text.endsWith(f.run().result.body));assert.equal(await readFile(file.absolutePath,'utf8'),'A当前文件已经不同')
})

test('late persistent root switch after valid inspection is still rejected by the final path check',async t=>{
 const {f,target,file,saved}=await reviewed(t),other=f.root+'/other';await mkdir(other);await writeFile(other+'/'+file.relativePath,f.run().result.body)
 let root=f.root;const registry={get:id=>id==='a'?{path:root,async status(){return'ok'}}:undefined},materials=createWorkspaceMaterialManager({workspaceRegistry:registry}),service=createWorkbenchService({repository:f.repository,workspaceRegistry:registry,materialManager:{...materials,async inspect(...args){const checked=await materials.inspect(...args);root=other;return checked}}});t.after(()=>service.closeV340Runtime())
 await assert.rejects(()=>service.resolveV340SavedFile(f.command({...target,writebackId:saved.writebackId})),e=>e.code==='V340_SAVE_STALE')
})

test('accepted edit digest finishing before deadline still drains, creates one unreviewed revision and preserves approved original',async t=>{
 const {f,target}=await reviewed(t),timer=scheduler(),started=deferred(),release=deferred(),store=await client(t,f,f.remote,{disposeDrainMs:10,scheduler:timer}),editTarget={runId:target.runId,versionId:target.versionId,baseSha256:target.resultSha256}
 await store.saveV340ResultDraft('a','new',editTarget,'期限内完成的核心正文')
 const digest=globalThis.crypto.subtle.digest;t.mock.method(globalThis.crypto.subtle,'digest',async function(...args){started.resolve();await release.promise;return digest.apply(this,args)})
 const original=structuredClone(f.run().resultVersions[0]),edit=store.editV340Result('a','new',editTarget);await started.promise;const closing=store.dispose();release.resolve()
 try{await Promise.all([closing,edit]);assert.equal(f.run().resultVersions.length,2);assert.deepEqual(f.run().resultVersions[0],original);assert.equal(f.run().resultVersions[1].review.status,'not-reviewed');assert.equal(f.run().resultVersions[1].result.snapshot.current_result.core_result_markdown,'期限内完成的核心正文');assert.deepEqual(timer.delays(),[]);assert.equal(store.peekWorkspaceState('a').workspaceId,null)}finally{release.resolve();await Promise.allSettled([edit,closing])}
})

test('zero-ms close deadline ends despite an accepted V340 response ignoring cancellation',async t=>{
 const f=await resultFixture(t),timer=scheduler(),started=deferred(),release=deferred(),remote={...f.remote,async v340(...args){const result=await f.remote.v340(...args);started.resolve();await release.promise;return result}},store=await client(t,f,remote,{disposeDrainMs:0,scheduler:timer})
 const write=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'Host已保存，响应迟到'}});await started.promise;const closing=store.dispose()
 try{assert.deepEqual(timer.delays(),[0]);timer.run(0);await closing;assert.equal(store.peekWorkspaceState('a').workspaceId,null);release.resolve();await write;assert.equal(store.peekWorkspaceState('a').workspaceId,null);assert.equal(f.task().draft.textInputs.research_request_text,'Host已保存，响应迟到')}finally{release.resolve();await Promise.allSettled([write,closing])}
})

test('current-file inspection still admits exact 1MiB and refuses UTF-8 byte overflow without altering frozen evidence',async t=>{
 const {f,target,file,saved}=await reviewed(t),bytes=await readFile(f.file),exact='x'.repeat(1024*1024)
 await writeFile(file.absolutePath,exact);const current=await f.service.resolveV340SavedFile(f.command({...target,writebackId:saved.writebackId}));assert.equal(current.absolutePath,file.absolutePath);assert.equal(current.matchesReviewed,false)
 const {createHash}=await import('node:crypto');assert.equal(current.currentSha256,createHash('sha256').update(exact).digest('hex'))
 const utf8='汉'.repeat(349526);assert.ok(Buffer.byteLength(utf8)>1024*1024);await writeFile(file.absolutePath,utf8)
 await assert.rejects(()=>f.service.resolveV340SavedFile(f.command({...target,writebackId:saved.writebackId})),e=>e.code==='MATERIAL_TOO_LARGE')
 assert.deepEqual(await readFile(f.file),bytes);assert.equal(f.run().result.sha256,target.resultSha256);assert.equal(await readFile(file.absolutePath,'utf8'),utf8)
})


test('independent close drains preserve same-Workspace ordinary and queued V340 revision order',async t=>{
 const f=await resultFixture(t);await ordinaryWorkspace(f,'b')
 const timer=scheduler(),started=deferred(),release=deferred(),bSaved=deferred(),calls=[]
 const remote={...f.remote,async replace(id,...args){calls.push({kind:'replace',id,revision:args[0]});const result=await f.remote.replace(id,...args);if(id==='b')bSaved.resolve();return result},async v340(action,payload,signal,...rest){
  calls.push({kind:payload.draft.textInputs.research_request_text,id:payload.workspaceId,revision:payload.expectedRevision})
  if(payload.draft.textInputs.research_request_text==='第一份'){started.resolve();await release.promise}
  return f.remote.v340(action,payload,signal,...rest)
 }}
 const store=await client(t,f,remote,{saveDelayMs:400,disposeDrainMs:10,scheduler:timer});store.syncWorkspaces([{workspaceId:'a'},{workspaceId:'b'}]);await store.hydrateWorkspace('b')
 const base=f.record().revision;store.renamePage('a','new','同项目先保存标题')
 const first=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'第一份'}});await started.promise
 const second=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'第二份'}})
 store.renamePage('b','task-b','独立项目先排空');const closing=store.dispose()
 try{
  await turn();assert.equal(calls.filter(c=>c.id==='b').length,1);await bSaved.promise
  assert.equal(calls.filter(c=>c.kind==='第二份').length,0);assert.equal(closing,store.dispose())
  assert.throws(()=>store.renamePage('a','new','关闭后拒绝'),/closing|disposed/)
  release.resolve();await Promise.all([closing,first,second])
  assert.deepEqual(calls.filter(c=>c.id==='a'),[{kind:'replace',id:'a',revision:base},{kind:'第一份',id:'a',revision:base+1},{kind:'第二份',id:'a',revision:base+2}])
  assert.equal(f.record().revision,base+3);assert.equal(f.record().tasks.new.title,'同项目先保存标题');assert.equal(f.task().draft.textInputs.research_request_text,'第二份')
  const disk=JSON.parse(await readFile(f.file,'utf8'));assert.deepEqual(disk.a,f.record());assert.equal(disk.b.tasks['task-b'].title,'独立项目先排空');assert.deepEqual(timer.delays(),[])
 }finally{release.resolve();await Promise.allSettled([first,second,closing])}
})

test('a failed independent draft does not suppress another Workspace flush or pretend to save',async t=>{
 const f=await resultFixture(t);await ordinaryWorkspace(f,'b');await ordinaryWorkspace(f,'c')
 const timer=scheduler(),started=deferred(),release=deferred(),cSaved=deferred(),attempts=[],observed=[]
 const remote={...f.remote,async v340(...args){const result=await f.remote.v340(...args);started.resolve();await release.promise;return result},async replace(id,...args){attempts.push(id);if(id==='b')throw Error('B保存失败');const result=await f.remote.replace(id,...args);if(id==='c')cSaved.resolve();return result}}
 const store=await client(t,f,remote,{saveDelayMs:400,disposeDrainMs:10,scheduler:timer});store.syncWorkspaces(['a','b','c'].map(workspaceId=>({workspaceId})));await Promise.all(['b','c'].map(id=>store.hydrateWorkspace(id)))
 store.subscribe(()=>observed.push(store.peekWorkspaceState('b')))
 const write=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'A响应挂起'}});await started.promise
 store.renamePage('b','task-b','B未成功的标题');store.renamePage('c','task-c','C成功保存');const closing=store.dispose()
 try{
  await turn();assert.deepEqual([...attempts].sort(),['b','c']);await cSaved.promise
  assert.ok(observed.some(s=>s.syncStatus==='error'&&s.syncError==='B保存失败'))
  timer.run(10);await closing;const disk=JSON.parse(await readFile(f.file,'utf8'))
  assert.equal(disk.b.tasks['task-b'].title,'b原始标题');assert.equal(disk.c.tasks['task-c'].title,'C成功保存');assert.equal(store.peekWorkspaceState('b').workspaceId,null)
  release.resolve();await write;await turn();assert.equal(store.peekWorkspaceState('c').workspaceId,null);assert.deepEqual(timer.delays(),[])
 }finally{release.resolve();await Promise.allSettled([write,closing])}
})

test('independently started ordinary save also obeys the shared deadline and ignores late acknowledgement',async t=>{
 const f=await resultFixture(t);await ordinaryWorkspace(f,'b')
 const timer=scheduler(),aStarted=deferred(),bStarted=deferred(),release=deferred();let bSignal
 const remote={...f.remote,async v340(...args){const result=await f.remote.v340(...args);aStarted.resolve();await release.promise;return result},async replace(...args){bSignal=args[3];const result=await f.remote.replace(...args);bStarted.resolve();await release.promise;return result}}
 const store=await client(t,f,remote,{saveDelayMs:400,disposeDrainMs:10,scheduler:timer});store.syncWorkspaces([{workspaceId:'a'},{workspaceId:'b'}]);await store.hydrateWorkspace('b')
 const write=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'A已接受'}});await aStarted.promise
 store.renamePage('b','task-b','B已落盘但响应挂起');const closing=store.dispose()
 try{
  await turn();assert.ok(bSignal,'independent B RPC must start');assert.ok(timer.delays().includes(10));await bStarted.promise;assert.equal(bSignal.aborted,false)
  timer.run(10);await closing;assert.equal(bSignal.aborted,true);assert.equal(store.peekWorkspaceState('b').workspaceId,null)
  release.resolve();await write;await turn();assert.equal(store.peekWorkspaceState('b').workspaceId,null)
  const disk=JSON.parse(await readFile(f.file,'utf8'));assert.equal(disk.b.tasks['task-b'].title,'B已落盘但响应挂起');assert.deepEqual(timer.delays(),[])
 }finally{release.resolve();await Promise.allSettled([write,closing])}
})


for(const mode of ['acknowledged','deadline'])test(`removed Workspace accepted V340 write stays in the close drain until ${mode}`,async t=>{
 const f=await resultFixture(t),timer=scheduler(),started=deferred(),release=deferred();let signal
 const remote={...f.remote,async v340(action,payload,writeSignal,...rest){signal=writeSignal;started.resolve();await release.promise;writeSignal.throwIfAborted();return f.remote.v340(action,payload,writeSignal,...rest)}}
 const store=await client(t,f,remote,{disposeDrainMs:10,scheduler:timer}),before=await readFile(f.file)
 const write=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'项目移出前已接受'}}),outcome=write.then(()=>({ok:true}),error=>({ok:false,error}));await started.promise
 store.syncWorkspaces([]);const closing=store.dispose()
 try{
  await turn();assert.equal(signal.aborted,false,'removal must not drop an accepted in-flight queue from close draining');assert.deepEqual(timer.delays(),[10]);assert.equal(closing,store.dispose())
  if(mode==='deadline'){timer.run(10);await closing;release.resolve()}else{release.resolve();await closing}
  await outcome;assert.equal(store.peekWorkspaceState('a').workspaceId,null);assert.deepEqual(timer.delays(),[])
  if(mode==='acknowledged'){
   assert.equal(f.task().draft.textInputs.research_request_text,'项目移出前已接受');assert.deepEqual(JSON.parse(await readFile(f.file,'utf8')).a,f.record())
  }else{assert.equal(signal.aborted,true);assert.deepEqual(await readFile(f.file),before)}
 }finally{release.resolve();await Promise.allSettled([outcome,closing])}
})
