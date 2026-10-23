import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {resultFixture} from './v340-result-fixture.mjs'
import {createWorkbenchStore} from '../src/client/workbench-store.js'
import {createV3Task} from './workbench-fixtures.mjs'
import {createConversationDraftBridge} from '../src/client/conversation-draft-bridge.js'

const turn=()=>new Promise(resolve=>setImmediate(resolve))
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r});return{promise,resolve}}
function scheduler(){let id=0;const timers=new Map();return{
 setTimeout(fn,delay){timers.set(++id,{fn,delay});return id},clearTimeout(id){timers.delete(id)},
 delays:()=>[...timers.values()].map(t=>t.delay),run(delay){const entry=[...timers].find(([,t])=>t.delay===delay);assert.ok(entry);timers.delete(entry[0]);entry[1].fn()}
}}
async function client(t,f,remote,options={}){
 const store=createWorkbenchStore({remote,saveDelayMs:400,...options});t.after(()=>store.dispose())
 store.syncWorkspaces([{workspaceId:'a'}]);await store.hydrateWorkspace('a');return store
}

for(const removed of [false,true])test(`accepted debounced ordinary draft closes to disk removed=${removed}`,async t=>{
 const f=await resultFixture(t),timer=scheduler(),calls=[]
 const remote={...f.remote,async replace(...args){calls.push(args[0]);return f.remote.replace(...args)}}
 const store=await client(t,f,remote,{scheduler:timer,disposeDrainMs:10})
 store.renamePage('a','new','accepted ordinary title');if(removed)store.syncWorkspaces([])
 await store.dispose()
 const disk=JSON.parse(await readFile(f.file,'utf8'));t.diagnostic(JSON.stringify({removed,calls,title:disk.a.tasks.new.title,timers:timer.delays()}))
 assert.equal(store.peekWorkspaceState('a').workspaceId,null)
 assert.equal(disk.a.tasks.new.title,'accepted ordinary title','removal must not clear an accepted ordinary draft without attempting persistence')
 assert.deepEqual(calls,['a']);assert.deepEqual(timer.delays(),[])
})

for(const removed of [false,true])test(`accepted in-flight ordinary save retains its drain deadline removed=${removed}`,async t=>{
 const f=await resultFixture(t),timer=scheduler(),started=deferred(),release=deferred(),finished=deferred();let signal
 const remote={...f.remote,async replace(...args){signal=args[3];started.resolve();await release.promise;try{signal.throwIfAborted();return await f.remote.replace(...args)}finally{finished.resolve()}}}
 const store=await client(t,f,remote,{scheduler:timer,disposeDrainMs:10,saveDelayMs:0})
 store.renamePage('a','new','accepted in-flight title');await started.promise;if(removed)store.syncWorkspaces([])
 const closing=store.dispose()
 try{
  await turn();t.diagnostic(JSON.stringify({removed,aborted:signal.aborted,timers:timer.delays(),disposed:store.peekWorkspaceState('a').workspaceId===null}))
  assert.equal(signal.aborted,false,'an accepted ordinary RPC must not be aborted before its deadline merely because the project was removed')
  assert.deepEqual(timer.delays(),[10]);release.resolve();await Promise.all([closing,finished.promise])
  assert.equal(JSON.parse(await readFile(f.file,'utf8')).a.tasks.new.title,'accepted in-flight title')
 }finally{release.resolve();await Promise.allSettled([closing,finished.promise]);await turn()}
})

for(const removed of [false,true])test(`accepted queued V340 draft is not silently discarded after a prior response removed=${removed}`,async t=>{
 const f=await resultFixture(t),timer=scheduler(),started=deferred(),release=deferred(),calls=[]
 const remote={...f.remote,async v340(action,payload,signal,...rest){
  calls.push({action,body:payload.draft.textInputs.research_request_text});const result=await f.remote.v340(action,payload,signal,...rest)
  if(calls.length===1){started.resolve();await release.promise}return result
 }}
 const store=await client(t,f,remote,{scheduler:timer,disposeDrainMs:10})
 const first=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'first accepted draft'}});await started.promise
 const second=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'second accepted draft'}})
 const outcome=Promise.allSettled([first,second]);if(removed)store.syncWorkspaces([])
 const closing=store.dispose()
 try{
  await turn();assert.deepEqual(timer.delays(),[10]);release.resolve();await closing
  const settled=await outcome,disk=JSON.parse(await readFile(f.file,'utf8'))
  t.diagnostic(JSON.stringify({removed,calls,errors:settled.map(v=>v.status==='rejected'?v.reason.message:null),disk:disk.a.tasks.new.v340.draft.textInputs.research_request_text}))
  assert.equal(disk.a.tasks.new.v340.draft.textInputs.research_request_text,'second accepted draft','both saves were already accepted into the same Workspace queue')
  assert.equal(calls.length,2)
 }finally{release.resolve();await Promise.allSettled([outcome,closing])}
})

test('removed and re-added Workspace still drains ordinary draft with exact revision',async t=>{
 const f=await resultFixture(t),timer=scheduler(),calls=[]
 const remote={...f.remote,async replace(id,revision,...args){calls.push(revision);return f.remote.replace(id,revision,...args)}}
 const store=await client(t,f,remote,{scheduler:timer,disposeDrainMs:10}),base=f.record().revision
 store.renamePage('a','new','re-added accepted title');store.syncWorkspaces([]);store.syncWorkspaces([{workspaceId:'a'}]);await store.dispose()
 assert.deepEqual(calls,[base]);assert.equal(JSON.parse(await readFile(f.file,'utf8')).a.tasks.new.title,'re-added accepted title')
})

for(const close of [false,true])test(`same-Workspace accepted rename after an in-flight V340 write stays recoverable close=${close}`,async t=>{
 const f=await resultFixture(t),timer=scheduler(),started=deferred(),release=deferred(),calls=[]
 const remote={...f.remote,async replace(...args){calls.push('replace');return f.remote.replace(...args)},async v340(...args){const result=await f.remote.v340(...args);calls.push('task/draft');started.resolve();await release.promise;return result}}
 const store=await client(t,f,remote,{scheduler:timer,disposeDrainMs:10})
 const write=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'accepted V340 draft'}}),outcome=write.then(()=>({ok:true}),error=>({ok:false,error}));await started.promise
 store.renamePage('a','new','concurrent accepted title');const closing=close?store.dispose():null
 try{
  release.resolve();const result=await outcome;if(closing)await closing
  const state=store.peekWorkspaceState('a'),disk=JSON.parse(await readFile(f.file,'utf8'))
  t.diagnostic(JSON.stringify({close,calls,error:result.error?.message,code:result.error?.code,status:state.syncStatus,clientTitle:state.pages[0]?.title,diskTitle:disk.a.tasks.new.title}))
  assert.equal(result.ok,true,'internal ordinary/V340 interleaving must serialize without a false external conflict');assert.equal(disk.a.tasks.new.v340.draft.textInputs.research_request_text,'accepted V340 draft')
  assert.ok(disk.a.tasks.new.title==='concurrent accepted title'||state.pages.some(page=>page.title==='concurrent accepted title'),'accepted title must either persist or remain available for conflict recovery; close must not erase both copies')
 }finally{release.resolve();await outcome;if(closing)await closing}
})

async function ordinaryB(f){
 const root=f.root+'/b';await mkdir(root);const get=f.workspaceRegistry.get;f.workspaceRegistry.get=id=>id==='b'?{path:root,async status(){return'ok'}}:get(id)
 await f.repository.mutate('b',0,r=>({...r,panelMode:'normal',activeTaskId:'task-b',taskOrder:['task-b'],tasks:{'task-b':{...createV3Task('task-b'),title:'initial B',generation:null}}}))
}

test('independent accepted V340 write drains before another Workspace deadline',async t=>{
 const f=await resultFixture(t);await ordinaryB(f)
 await f.service.createV340Task({workspaceId:'b',taskId:'new',expectedRevision:f.repository.get('b').revision,nodeId:'Flow-1-1',title:'B V340'})
 const timer=scheduler(),aStarted=deferred(),bSaved=deferred(),release=deferred(),calls=[]
 const remote={...f.remote,async v340(action,payload,signal,...rest){calls.push(payload.workspaceId);const result=await f.remote.v340(action,payload,signal,...rest);if(payload.workspaceId==='a'){aStarted.resolve();await release.promise}else bSaved.resolve();return result}}
 const store=await client(t,f,remote,{scheduler:timer,disposeDrainMs:10});store.syncWorkspaces([{workspaceId:'a'},{workspaceId:'b'}]);await store.hydrateWorkspace('b')
 const a=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'A accepted'}});await aStarted.promise
 const b=store.saveV340Draft('b','new',{source:'local-skill',textInputs:{research_request_text:'B accepted'},filePaths:{},configuration:{}}),closing=store.dispose()
 try{
  await turn();assert.ok(calls.includes('b'));await bSaved.promise;await b;assert.deepEqual(timer.delays(),[10]);timer.run(10);await closing
  assert.equal(JSON.parse(await readFile(f.file,'utf8')).b.tasks.new.v340.draft.textInputs.research_request_text,'B accepted');release.resolve();await a
 }finally{release.resolve();await Promise.allSettled([a,b,closing])}
})

for(const late of [false,true])test(`independent hydration and accepted ordinary actions respect close deadline late=${late}`,async t=>{
 const f=await resultFixture(t);await ordinaryB(f)
 const timer=scheduler(),aStarted=deferred(),bStarted=deferred(),releaseA=deferred(),releaseB=deferred(),bSaved=deferred(),calls=[]
 const remote={...f.remote,async get(id,...args){if(id==='b'){bStarted.resolve();await releaseB.promise}return f.remote.get(id,...args)},async replace(id,...args){calls.push(id);const result=await f.remote.replace(id,...args);bSaved.resolve();return result},async v340(...args){const result=await f.remote.v340(...args);aStarted.resolve();await releaseA.promise;return result}}
 const store=await client(t,f,remote,{scheduler:timer,disposeDrainMs:10});store.syncWorkspaces([{workspaceId:'a'},{workspaceId:'b'}])
 const a=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'A accepted'}});await aStarted.promise
 store.openPanel('b');await bStarted.promise;store.renamePage('b','task-b','hydrated accepted title');const closing=store.dispose()
 try{
  if(late){timer.run(10);await closing;releaseB.resolve();await turn()}else{releaseB.resolve();await bSaved.promise;timer.run(10);await closing}
  releaseA.resolve();await a;await turn()
  const disk=JSON.parse(await readFile(f.file,'utf8'));assert.equal(disk.b.tasks['task-b'].title,late?'initial B':'hydrated accepted title')
  assert.deepEqual(calls,late?[]:['b']);assert.equal(store.peekWorkspaceState('b').workspaceId,null);assert.deepEqual(timer.delays(),[])
 }finally{releaseA.resolve();releaseB.resolve();await Promise.allSettled([a,closing])}
})

test('an edit accepted synchronously while replayed state publishes is saved after the replayed edit',async t=>{
 const f=await resultFixture(t),timer=scheduler(),started=deferred(),release=deferred(),revisions=[]
 const remote={...f.remote,async v340(...args){const result=await f.remote.v340(...args);started.resolve();await release.promise;return result},async replace(id,revision,...args){revisions.push(revision);return f.remote.replace(id,revision,...args)}}
 const store=await client(t,f,remote,{scheduler:timer,disposeDrainMs:10}),base=f.record().revision
 const write=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'accepted input'}});await started.promise
 store.renamePage('a','new','first local title');let reentered=false
 store.subscribe(()=>{const state=store.peekWorkspaceState('a');if(!reentered&&state.revision===base+1&&state.syncStatus==='saving'){reentered=true;store.renamePage('a','new','second synchronous title')}})
 try{
  release.resolve();await write;assert.equal(reentered,true);await store.dispose()
  assert.deepEqual(revisions,[base+1]);assert.equal(JSON.parse(await readFile(f.file,'utf8')).a.tasks.new.title,'second synchronous title')
 }finally{release.resolve();await Promise.allSettled([write])}
})

test('a V340 failure does not replace a later synchronous ordinary edit with its earlier snapshot',async t=>{
 const f=await resultFixture(t),timer=scheduler(),started=deferred(),release=deferred()
 const remote={...f.remote,async v340(){started.resolve();await release.promise;throw Error('synthetic V340 refusal')}}
 const store=await client(t,f,remote,{scheduler:timer,disposeDrainMs:10}),before=structuredClone(f.task())
 const write=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'refused input'}}),outcome=write.then(()=>null,e=>e);await started.promise
 let reentered=false
 store.subscribe(()=>{if(!reentered&&store.peekWorkspaceState('a').pages[0]?.title==='first local title'){reentered=true;store.renamePage('a','new','second synchronous title')}})
 store.renamePage('a','new','first local title');const closing=store.dispose()
 try{
  release.resolve();await closing;assert.match((await outcome).message,/synthetic V340 refusal/)
  assert.equal(JSON.parse(await readFile(f.file,'utf8')).a.tasks.new.title,'second synchronous title');assert.deepEqual(f.task(),before)
 }finally{release.resolve();await Promise.allSettled([outcome,closing])}
})

test('removed Workspace cannot accept new public actions while its old input and result draft writes drain',async t=>{
 const f=await resultFixture(t),timer=scheduler(),started=deferred(),release=deferred(),calls=[]
 const remote={...f.remote,async v340(action,payload,...args){calls.push(action);const result=await f.remote.v340(action,payload,...args);if(action==='task/draft'){started.resolve();await release.promise}return result}}
 const store=await client(t,f,remote,{scheduler:timer,disposeDrainMs:10}),original=structuredClone(f.run()),run=f.run()
 const input=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'accepted input'}});await started.promise
 const core=store.saveV340ResultDraft('a','new',{runId:run.runId,versionId:run.runId,baseSha256:run.result.sha256},'accepted core draft')
 let closing
 try{
 store.syncWorkspaces([])
 assert.throws(()=>store.renamePage('a','new','forbidden new title'),/known Workspace/)
 assert.throws(()=>store.saveV340Draft('a','new',f.task().draft),/known Workspace/)
 assert.throws(()=>store.selectV340Version('a','new',run.runId,run.runId),/known Workspace/)
 await assert.rejects(()=>store.hydrateWorkspace('a'),/known Workspace/)
 await assert.rejects(()=>store.useV340InConversation('a','new',{}),/known Workspace/)
 closing=store.dispose()
  assert.equal(closing,store.dispose());release.resolve();await Promise.all([input,core,closing])
  const disk=JSON.parse(await readFile(f.file,'utf8')).a.tasks.new.v340
  assert.equal(disk.draft.textInputs.research_request_text,'accepted input');assert.equal(disk.runs[run.runId].coreResultDrafts[run.runId].body,'accepted core draft')
  assert.deepEqual(f.run().result,original.result);assert.deepEqual(f.run().resultVersions,original.resultVersions);assert.deepEqual(calls,['task/draft','result/draft']);assert.deepEqual(timer.delays(),[])
 }finally{release.resolve();await Promise.allSettled([input,core,closing??store.dispose()])}
})

test('removed ordinary in-flight save shares the deadline and a late abort cannot revive state',async t=>{
 const f=await resultFixture(t),timer=scheduler(),started=deferred(),release=deferred(),finished=deferred();let signal
 const remote={...f.remote,async replace(...args){signal=args[3];started.resolve();await release.promise;try{signal.throwIfAborted();return await f.remote.replace(...args)}finally{finished.resolve()}}}
 const store=await client(t,f,remote,{scheduler:timer,disposeDrainMs:10,saveDelayMs:0}),before=await readFile(f.file)
 store.renamePage('a','new','not committed before deadline');await started.promise;store.syncWorkspaces([]);const closing=store.dispose()
 try{
  assert.deepEqual(timer.delays(),[10]);timer.run(10);await closing;assert.equal(signal.aborted,true)
  release.resolve();await finished.promise;await turn();assert.deepEqual(await readFile(f.file),before);assert.equal(store.peekWorkspaceState('a').workspaceId,null);assert.deepEqual(timer.delays(),[])
 }finally{release.resolve();await Promise.allSettled([closing,finished.promise])}
})

test('removed hydration still flushes ordinary actions accepted before removal',async t=>{
 const f=await resultFixture(t),timer=scheduler(),started=deferred(),release=deferred(),saved=deferred(),calls=[]
 const remote={...f.remote,async get(...args){started.resolve();await release.promise;return f.remote.get(...args)},async replace(...args){calls.push(args[0]);const result=await f.remote.replace(...args);saved.resolve();return result}}
 const store=createWorkbenchStore({remote,saveDelayMs:400,scheduler:timer,disposeDrainMs:10});t.after(()=>store.dispose());store.syncWorkspaces([{workspaceId:'a'}]);store.openPanel('a');await started.promise
 store.renamePage('a','new','accepted during hydration');store.syncWorkspaces([]);const closing=store.dispose()
 try{
  release.resolve();await turn();assert.deepEqual(calls,['a']);await saved.promise;await closing;assert.deepEqual(calls,['a']);assert.equal(JSON.parse(await readFile(f.file,'utf8')).a.tasks.new.title,'accepted during hydration');assert.deepEqual(timer.delays(),[])
 }finally{release.resolve();await closing}
})

test('ordinary creation and renames replay once between two V340 writes without changing frozen result evidence',async t=>{
 const f=await resultFixture(t),timer=scheduler(),started=deferred(),release=deferred(),calls=[];let ids=0
 const remote={...f.remote,async v340(action,payload,...args){calls.push({kind:'v340',revision:payload.expectedRevision});const result=await f.remote.v340(action,payload,...args);if(calls.length===1){started.resolve();await release.promise}return result},async replace(id,revision,...args){calls.push({kind:'ordinary',revision});return f.remote.replace(id,revision,...args)}}
 const store=await client(t,f,remote,{scheduler:timer,disposeDrainMs:10,createId:()=>`ordinary-${++ids}`}),base=f.record().revision,original=structuredClone(f.run())
 const first=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'first'}});await started.promise
 store.renamePage('a','new','renamed original');const created=store.createPage('a');store.renamePage('a',created.pageId,'new ordinary title')
 const second=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'second'}}),closing=store.dispose()
 try{
  release.resolve();await Promise.all([first,second,closing]);const disk=JSON.parse(await readFile(f.file,'utf8')).a
  assert.equal(ids,1);assert.equal(created.pageId,'ordinary-1');assert.equal(disk.tasks.new.title,'renamed original');assert.equal(disk.tasks['ordinary-1'].title,'new ordinary title');assert.equal(disk.tasks.new.v340.draft.textInputs.research_request_text,'second')
  assert.deepEqual(calls,[{kind:'v340',revision:base},{kind:'ordinary',revision:base+1},{kind:'v340',revision:base+2}]);assert.deepEqual(f.run(),original);assert.deepEqual(timer.delays(),[])
 }finally{release.resolve();await Promise.allSettled([first,second,closing])}
})

test('accepted V340 task creation survives removal and ordinary replay keeps the new Host task',async t=>{
 const f=await resultFixture(t),timer=scheduler(),started=deferred(),release=deferred()
 const remote={...f.remote,async v340(action,...args){const result=await f.remote.v340(action,...args);if(action==='task/create'){started.resolve();await release.promise}return result}}
 const store=await client(t,f,remote,{scheduler:timer,disposeDrainMs:10,createId:()=> 'retained-created'});await store.loadV340Catalog('a')
 const original=structuredClone(f.run()),creation=store.createV340Task('a','Flow-1-1');await started.promise
 store.renamePage('a','new','accepted old task title');store.syncWorkspaces([]);const closing=store.dispose()
 try{
  release.resolve();await Promise.all([creation,closing]);const disk=JSON.parse(await readFile(f.file,'utf8')).a
  assert.equal(disk.tasks.new.title,'accepted old task title');assert.ok(disk.tasks['retained-created'].v340);assert.equal(disk.activeTaskId,'retained-created');assert.equal(disk.taskOrder.filter(id=>id==='retained-created').length,1);assert.deepEqual(f.run(),original);assert.deepEqual(timer.delays(),[])
 }finally{release.resolve();await Promise.allSettled([creation,closing])}
})

test('external revision changes still refuse an ordinary replay without overwriting another writer',async t=>{
 const f=await resultFixture(t),timer=scheduler(),started=deferred(),release=deferred(),replacements=[]
 const remote={...f.remote,async v340(...args){const result=await f.remote.v340(...args);started.resolve();await release.promise;return result},async replace(...args){const result=await f.remote.replace(...args);replacements.push(result);return result}}
 const store=await client(t,f,remote,{scheduler:timer}),original=structuredClone(f.run())
 const write=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'accepted input'}});await started.promise
 store.renamePage('a','new','local title')
 await f.repository.mutate('a',f.record().revision,record=>({...record,tasks:{...record.tasks,new:{...record.tasks.new,title:'other writer title'}}}));const diskBefore=await readFile(f.file)
 try{
  release.resolve();await write;assert.deepEqual(await readFile(f.file),diskBefore);assert.equal(replacements.length,1);assert.equal(replacements[0].committed,false);assert.equal(replacements[0].reason,'revision-conflict')
  assert.equal(store.peekWorkspaceState('a').syncStatus,'conflict');assert.equal(store.peekWorkspaceState('a').pages[0].title,'local title');assert.deepEqual(f.run(),original)
 }finally{release.resolve();await Promise.allSettled([write])}
})

test('deadline during a V340 response prevents all late replay and subsequent accepted RPC dispatch',async t=>{
 const f=await resultFixture(t),timer=scheduler(),started=deferred(),release=deferred(),calls=[]
 const remote={...f.remote,async v340(...args){calls.push('v340');const result=await f.remote.v340(...args);started.resolve();await release.promise;return result},async replace(...args){calls.push('ordinary');return f.remote.replace(...args)}}
 const store=await client(t,f,remote,{scheduler:timer,disposeDrainMs:10})
 const first=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'first'}});await started.promise
 store.renamePage('a','new','late replay must not dispatch');const second=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'second'}}),outcome=Promise.allSettled([first,second]),closing=store.dispose()
 try{
  timer.run(10);await closing;release.resolve();await outcome;await turn();assert.deepEqual(calls,['v340']);assert.equal(f.task().draft.textInputs.research_request_text,'first');assert.notEqual(f.record().tasks.new.title,'late replay must not dispatch');assert.equal(store.peekWorkspaceState('a').workspaceId,null);assert.deepEqual(timer.delays(),[])
 }finally{release.resolve();await Promise.allSettled([outcome,closing])}
})

for(const kind of ['reference','open'])test(`retaining accepted writes cannot dispatch ${kind} after synchronous Workspace removal`,async t=>{
 const f=await resultFixture(t),run=f.run(),target={runId:run.runId,versionId:run.runId,resultSha256:run.result.sha256}
 await f.service.reviewV340Result(f.command({...target,confirmed:true}));const plan=await f.service.prepareV340Save(f.command(target));await f.service.commitV340Save({confirmationToken:plan.confirmationToken})
 const saved=f.run().resultVersions[0].writebacks[0],before=await readFile(f.file),calls=[],effects=[]
 const bridge=createConversationDraftBridge(()=>({status:'ready',currentSessionId:'s',workspaceItems:[{workspaceId:'a',sessionIds:['s']}]}))
 bridge.register({sessionId:'s',workspaceId:'a',read:()=>({phase:'plain',draft:'',draftRev:0,occurrences:[],imageIds:[]}),inputActions:{setDraft(){effects.push('reference')},submit(){assert.fail('must not send')}}})
 const remote={...f.remote,async v340(action,...args){calls.push(action);return f.remote.v340(action,...args)}}
 const store=await client(t,f,remote,{conversationDrafts:bridge,nativeFiles:{captureSavedFileTarget:id=>({workspaceId:id}),openSavedFile(){effects.push('open');return true}}});let removed=false
 store.subscribe(()=>{if(!removed&&store.peekWorkspaceState('a').pageOperations.new?.activeOperation==='v340-handoff'){removed=true;store.syncWorkspaces([])}})
 const result=await (kind==='reference'?store.useV340InConversation('a','new',target):store.openV340SavedFile('a','new',target,saved.writebackId))
 assert.equal(removed,true);assert.equal(result,false);assert.deepEqual(calls,[]);assert.deepEqual(effects,[]);assert.deepEqual(await readFile(f.file),before);await store.dispose()
})

test('explicit public flush cannot send an ordinary snapshot ahead of an in-flight V340 response',async t=>{
 const f=await resultFixture(t),timer=scheduler(),started=deferred(),release=deferred(),calls=[]
 const remote={...f.remote,async v340(...args){calls.push('v340');const result=await f.remote.v340(...args);started.resolve();await release.promise;return result},async replace(...args){calls.push('ordinary');return f.remote.replace(...args)}}
 const store=await client(t,f,remote,{scheduler:timer}),base=f.record().revision
 const write=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'accepted before public flush'}}),outcome=write.then(()=>null,e=>e);await started.promise
 store.renamePage('a','new','accepted before public flush');const flush=store.flushWorkspace('a'),flushed=flush.then(()=>null,e=>e)
 try{
  await turn();assert.deepEqual([...calls],['v340'],'public flush must wait for the accepted V340 job rather than issue a stale ordinary write')
  release.resolve();assert.equal(await outcome,null);assert.equal(await flushed,null);await store.dispose()
  const disk=JSON.parse(await readFile(f.file,'utf8')).a;assert.equal(disk.tasks.new.title,'accepted before public flush');assert.equal(disk.tasks.new.v340.draft.textInputs.research_request_text,'accepted before public flush');assert.equal(disk.revision,base+2);assert.deepEqual(calls,['v340','ordinary'])
 }finally{release.resolve();await Promise.allSettled([outcome,flushed])}
})

for(const removed of [false,true])test(`hydration publishes the latest accepted synchronous ordinary edit before closing removed=${removed}`,async t=>{
 const f=await resultFixture(t),timer=scheduler(),started=deferred(),release=deferred(),calls=[]
 const remote={...f.remote,async get(...args){started.resolve();await release.promise;return f.remote.get(...args)},async replace(id,revision,draft,...args){calls.push(draft.tasks.new.title);return f.remote.replace(id,revision,draft,...args)}}
 const store=createWorkbenchStore({remote,saveDelayMs:400,disposeDrainMs:10,scheduler:timer});t.after(()=>store.dispose());store.syncWorkspaces([{workspaceId:'a'}]);store.openPanel('a');await started.promise
 store.renamePage('a','new','queued ordinary title');let reentered=false,closing
 store.subscribe(()=>{
  if(reentered||store.peekWorkspaceState('a').syncStatus!=='saving')return
  reentered=true;store.renamePage('a','new','new synchronous title');if(removed)store.syncWorkspaces([]);closing=store.dispose()
 })
 try{
  release.resolve();await turn();assert.ok(closing);await closing;assert.equal(reentered,true)
  assert.deepEqual(calls,['new synchronous title']);assert.equal(JSON.parse(await readFile(f.file,'utf8')).a.tasks.new.title,'new synchronous title');assert.equal(store.peekWorkspaceState('a').workspaceId,null);assert.deepEqual(timer.delays(),[])
 }finally{release.resolve();await (closing??store.dispose())}
})

test('legacy page mutation reports busy without bypassing an in-flight V340 write and can retry afterward',async t=>{
 const f=await resultFixture(t);await writeFile(f.root+'/material.md','public local material')
 await f.repository.mutate('a',f.record().revision,r=>({...r,taskOrder:[...r.taskOrder,'legacy'],tasks:{...r.tasks,legacy:{...createV3Task('legacy'),generation:null}}}))
 const timer=scheduler(),started=deferred(),release=deferred(),calls=[]
 const remote={...f.remote,async v340(...args){calls.push('v340');const result=await f.remote.v340(...args);started.resolve();await release.promise;return result},async replace(...args){calls.push('ordinary');return f.remote.replace(...args)},async addMaterial(...args){calls.push('material');return f.remote.addMaterial(...args)}}
 const store=await client(t,f,remote,{scheduler:timer}),base=f.record().revision
 const write=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'accepted V340 input'}}),outcome=write.then(()=>null,e=>e);await started.promise
 store.renamePage('a','new','accepted during V340');store.setMaterialDraft('a','legacy','material.md',true)
 const legacy=store.addMaterial('a','legacy').then(()=>null,e=>e)
 try{
  await turn();assert.deepEqual([...calls],['v340'],'legacy internal flush must not dispatch the old ordinary snapshot')
  assert.match((await legacy).message,/保存|saving/i);release.resolve();assert.equal(await outcome,null)
  await store.addMaterial('a','legacy');await store.dispose();const disk=JSON.parse(await readFile(f.file,'utf8')).a
  assert.deepEqual(calls,['v340','ordinary','material']);assert.equal(disk.revision,base+3);assert.equal(disk.tasks.new.title,'accepted during V340');assert.equal(disk.tasks.legacy.inputRefs.length,1);assert.equal(disk.tasks.new.v340.draft.textInputs.research_request_text,'accepted V340 input')
 }finally{release.resolve();await Promise.allSettled([outcome,legacy])}
})

test('legacy mutation cannot enter during the same-tick queued V340 ownership gap',async t=>{
 const f=await resultFixture(t);await writeFile(f.root+'/material.md','public local material')
 await f.repository.mutate('a',f.record().revision,r=>({...r,taskOrder:[...r.taskOrder,'legacy'],tasks:{...r.tasks,legacy:{...createV3Task('legacy'),generation:null}}}))
 const timer=scheduler(),started=deferred(),release=deferred(),releaseMaterial=deferred(),calls=[]
 const remote={...f.remote,async v340(...args){calls.push('v340');const result=await f.remote.v340(...args);started.resolve();await release.promise;return result},async addMaterial(...args){calls.push('material');await releaseMaterial.promise;return f.remote.addMaterial(...args)}}
 const store=await client(t,f,remote,{scheduler:timer,disposeDrainMs:10});store.setMaterialDraft('a','legacy','material.md',true)
 const write=store.saveV340Draft('a','new',{...f.task().draft,textInputs:{research_request_text:'same-tick accepted'}}),outcome=write.then(()=>null,e=>e)
 const legacy=store.addMaterial('a','legacy').then(()=>null,e=>e);let closing
 try{
  await turn();assert.equal(calls.includes('material'),false,'queued work owns serialization before its async callback starts');assert.match((await legacy).message,/保存|saving/i)
  await started.promise;store.renamePage('a','new','same-tick title');closing=store.dispose();release.resolve();await closing;assert.equal(await outcome,null)
  const disk=JSON.parse(await readFile(f.file,'utf8')).a;assert.equal(disk.tasks.new.title,'same-tick title');assert.equal(disk.tasks.legacy.inputRefs.length,0);assert.deepEqual(calls,['v340'])
 }finally{release.resolve();releaseMaterial.resolve();await Promise.allSettled([outcome,legacy,closing??store.dispose()])}
})
