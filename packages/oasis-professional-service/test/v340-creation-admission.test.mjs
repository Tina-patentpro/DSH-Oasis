import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdir,readFile} from 'node:fs/promises'
import {resultFixture} from './v340-result-fixture.mjs'
import {createWorkbenchStore} from '../src/client/workbench-store.js'

const turn=()=>new Promise(resolve=>setImmediate(resolve))
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r});return{promise,resolve}}
function scheduler(){let id=0;const timers=new Map();return{
  setTimeout(fn,delay){timers.set(++id,{fn,delay});return id},clearTimeout(id){timers.delete(id)},
  delays:()=>[...timers.values()].map(t=>t.delay),
  run(delay){const entry=[...timers].find(([,t])=>t.delay===delay);assert.ok(entry);timers.delete(entry[0]);entry[1].fn()},
}}
function create(store){
  try{return Promise.resolve(store.createV340Task('b','Flow-1-1')).then(()=>null,error=>error)}
  catch(error){return Promise.resolve(error)}
}
async function setup(t,stage='before-commit'){
  const f=await resultFixture(t),root=f.root+'/b';await mkdir(root)
  const get=f.workspaceRegistry.get;f.workspaceRegistry.get=id=>id==='b'?{path:root,async status(){return'ok'}}:get(id)
  const started=deferred(),release=deferred(),timer=scheduler(),calls=[];let first=true,signal,ids=0
  const remote={...f.remote,
    async v340(action,payload,s,...args){
      calls.push({kind:action,revision:payload.expectedRevision})
      const hold=first;first=false
      if(hold){signal=s;if(stage==='before-commit'){started.resolve();await release.promise;s.throwIfAborted()}}
      const result=await f.remote.v340(action,payload,s,...args)
      if(hold&&stage==='after-commit'){started.resolve();await release.promise}
      return result
    },
    async replace(id,revision,...args){calls.push({kind:'ordinary',revision});return f.remote.replace(id,revision,...args)},
  }
  const store=createWorkbenchStore({remote,scheduler:timer,saveDelayMs:400,disposeDrainMs:100,createId:()=>`accepted-${++ids}`})
  t.after(()=>{release.resolve();return store.dispose()})
  store.syncWorkspaces([{workspaceId:'b'}]);await store.hydrateWorkspace('b');await store.loadV340Catalog('b')
  return{f,store,started,release,timer,calls,signal:()=>signal,ids:()=>ids,
    disk:async()=>JSON.parse(await readFile(f.file,'utf8')).b}
}
function onInitialCreation(c,callback){
  let seen=false
  return c.store.subscribe(()=>{if(!seen&&c.store.peekWorkspaceState('b').v340Creating){seen=true;callback()}})
}

for(const stage of ['before-commit','after-commit'])test(`initial creation notification close retains the accepted job stage=${stage}`,async t=>{
  const c=await setup(t,stage);let closing,closed=false
  onInitialCreation(c,()=>{closing=c.store.dispose();closing.then(()=>{closed=true})})
  const outcome=create(c.store)
  try{
    await Promise.race([c.started.promise,outcome]);await turn()
    assert.equal(closed,false,'initial notification must not bypass the accepted creation drain')
    assert.equal(c.signal()?.aborted,false);assert.deepEqual(c.timer.delays(),[100])
    assert.throws(()=>c.store.openPanel('b'),/closing/)
    c.release.resolve();assert.equal(await outcome,null);await closing
    const disk=await c.disk();assert.deepEqual(disk.taskOrder,['accepted-1']);assert.ok(disk.tasks['accepted-1'].v340)
    assert.equal(disk.activeTaskId,'accepted-1');assert.equal(c.ids(),1)
    assert.deepEqual(c.calls,[{kind:'task/create',revision:0},{kind:'ordinary',revision:1}])
    assert.equal(c.store.peekWorkspaceState('b').workspaceId,null);assert.deepEqual(c.timer.delays(),[])
  }finally{c.release.resolve();await Promise.allSettled([outcome,c.store.dispose()])}
})

for(const mode of ['remove','remove-readd','remove-close'])test(`initial creation notification removal keeps accepted work and releases busy mode=${mode}`,async t=>{
  const c=await setup(t);let closing
  onInitialCreation(c,()=>{c.store.syncWorkspaces([]);if(mode==='remove-readd')c.store.syncWorkspaces([{workspaceId:'b'}]);if(mode==='remove-close')closing=c.store.dispose()})
  const outcome=create(c.store)
  try{
    await Promise.race([c.started.promise,outcome]);c.release.resolve()
    assert.equal(await outcome,null,'removal after acceptance must not reject the already queued creation')
    if(closing)await closing
    const first=await c.disk();assert.deepEqual(first.taskOrder,['accepted-1']);assert.ok(first.tasks['accepted-1'].v340)
    if(!closing){
      c.store.syncWorkspaces([{workspaceId:'b'}]);assert.equal(c.store.peekWorkspaceState('b').v340Creating,false)
      assert.equal(await create(c.store),null,'re-added Workspace can create again after the accepted job settles')
      assert.deepEqual((await c.disk()).taskOrder,['accepted-1','accepted-2'])
      assert.equal(c.store.peekWorkspaceState('b').v340Creating,false)
    }
    await c.store.dispose();assert.deepEqual(c.timer.delays(),[])
  }finally{c.release.resolve();await Promise.allSettled([outcome,c.store.dispose()])}
})

for(const stage of ['before-commit','after-commit'])test(`initial notification close still expires at the original deadline stage=${stage}`,async t=>{
  const c=await setup(t,stage);let closing
  onInitialCreation(c,()=>{closing=c.store.dispose()});const outcome=create(c.store)
  try{
    await Promise.race([c.started.promise,outcome]);await turn();assert.deepEqual(c.timer.delays(),[100])
    c.timer.run(100);await closing;assert.equal(c.signal()?.aborted,true)
    c.release.resolve();const error=await outcome;await turn()
    if(stage==='before-commit')assert.equal(error?.name,'AbortError')
    assert.deepEqual((await c.disk())?.taskOrder??[],stage==='before-commit'?[]:['accepted-1'])
    assert.deepEqual(c.calls,[{kind:'task/create',revision:0}]);assert.equal(c.store.peekWorkspaceState('b').workspaceId,null);assert.deepEqual(c.timer.delays(),[])
  }finally{c.release.resolve();await Promise.allSettled([outcome,c.store.dispose()])}
})

test('initial notification duplicate creation remains busy without allocating another identity',async t=>{
  const c=await setup(t);let duplicate
  onInitialCreation(c,()=>{duplicate=create(c.store)});const outcome=create(c.store)
  try{
    await c.started.promise;assert.match((await duplicate)?.message,/正在创建/);assert.equal(c.ids(),1)
    c.release.resolve();assert.equal(await outcome,null);assert.equal(c.store.peekWorkspaceState('b').v340Creating,false)
    assert.deepEqual((await c.disk()).taskOrder,['accepted-1'])
  }finally{c.release.resolve();await Promise.allSettled([outcome,c.store.dispose()])}
})

for(const removed of [false,true])test(`initial notification ordinary openPanel and rename save in order through close removed=${removed}`,async t=>{
  const c=await setup(t);let closing,page
  onInitialCreation(c,()=>{page=c.store.openPanel('b');c.store.renamePage('b',page.pageId,'initial ordinary title');if(removed)c.store.syncWorkspaces([]);closing=c.store.dispose()})
  const outcome=create(c.store)
  try{
    await Promise.race([c.started.promise,outcome]);c.release.resolve();assert.equal(await outcome,null);await closing
    const disk=await c.disk();assert.deepEqual(disk.taskOrder,['accepted-2','accepted-1'])
    assert.equal(disk.tasks[page.pageId].title,'initial ordinary title');assert.equal(disk.tasks[page.pageId].createdAt,page.createdAt)
    assert.ok(disk.tasks['accepted-1'].v340);assert.equal(c.ids(),2)
    assert.deepEqual(c.calls,[{kind:'ordinary',revision:0},{kind:'task/create',revision:1},{kind:'ordinary',revision:2}]);assert.deepEqual(c.timer.delays(),[])
  }finally{c.release.resolve();await Promise.allSettled([outcome,c.store.dispose()])}
})

test('public flush begun in the initial notification waits for the accepted creation',async t=>{
  const c=await setup(t);let flush,flushed=false
  onInitialCreation(c,()=>{flush=c.store.flushWorkspace('b');flush.then(()=>{flushed=true})});const outcome=create(c.store)
  try{
    await c.started.promise;await turn();assert.equal(flushed,false,'public flush must observe the creation queue before publication')
    c.release.resolve();assert.equal(await outcome,null);await flush
    assert.deepEqual((await c.disk()).taskOrder,['accepted-1']);assert.equal(c.store.peekWorkspaceState('b').syncStatus,'ready')
  }finally{c.release.resolve();await Promise.allSettled([outcome,c.store.dispose()])}
})

test('control: closing after the creation RPC started retains the same drain deadline',async t=>{
  const c=await setup(t),outcome=create(c.store)
  try{
    await c.started.promise;let closed=false;const closing=c.store.dispose();closing.then(()=>{closed=true});await turn()
    assert.equal(closed,false);assert.equal(c.signal().aborted,false);assert.deepEqual(c.timer.delays(),[100])
    c.release.resolve();assert.equal(await outcome,null);await closing;assert.deepEqual((await c.disk()).taskOrder,['accepted-1']);assert.deepEqual(c.timer.delays(),[])
  }finally{c.release.resolve();await Promise.allSettled([outcome,c.store.dispose()])}
})

for(const kind of ['input','result'])for(const mode of ['close','remove'])test(`related draft initial notification retains accepted write kind=${kind} mode=${mode}`,async t=>{
  const c=await setup(t);c.store.syncWorkspaces([{workspaceId:'a'}]);await c.store.hydrateWorkspace('a')
  const original=structuredClone(c.f.run());let seen=false,closing,closed=false
  c.store.subscribe(()=>{
    const op=c.store.peekWorkspaceState('a').pageOperations.new
    const dirty=kind==='input'?op?.v340InputDraft:Object.keys(op?.v340Edits??{}).length
    if(!seen&&dirty){seen=true;if(mode==='close'){closing=c.store.dispose();closing.then(()=>{closed=true})}else c.store.syncWorkspaces([])}
  })
  let pending
  try{
    pending=kind==='input'
      ?c.store.saveV340Draft('a','new',{...c.f.task().draft,textInputs:{research_request_text:'accepted in initial notification'}})
      :c.store.saveV340ResultDraft('a','new',{runId:original.runId,versionId:original.runId,baseSha256:original.result.sha256},'accepted result in initial notification')
  }catch(error){pending=Promise.reject(error)}
  const outcome=Promise.resolve(pending).then(()=>null,error=>error)
  try{
    await Promise.race([c.started.promise,outcome]);await turn()
    if(closing){assert.equal(closed,false,'related accepted draft must be captured before its first notification');assert.equal(c.signal()?.aborted,false);assert.deepEqual(c.timer.delays(),[100])}
    c.release.resolve();assert.equal(await outcome,null,'removal after draft acceptance must not prevent its queued write')
    if(closing)await closing
    const disk=JSON.parse(await readFile(c.f.file,'utf8')).a.tasks.new.v340
    if(kind==='input')assert.equal(disk.draft.textInputs.research_request_text,'accepted in initial notification')
    else assert.equal(disk.runs[original.runId].coreResultDrafts[original.runId].body,'accepted result in initial notification')
    assert.deepEqual(c.f.run().result,original.result);assert.deepEqual(c.f.run().resultVersions,original.resultVersions)
    await c.store.dispose();assert.deepEqual(c.timer.delays(),[])
  }finally{c.release.resolve();await Promise.allSettled([outcome,c.store.dispose()])}
})
