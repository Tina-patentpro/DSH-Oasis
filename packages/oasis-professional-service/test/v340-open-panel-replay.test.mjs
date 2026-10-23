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

async function firstCreation(t){
  const f=await resultFixture(t),root=f.root+'/empty-b';await mkdir(root)
  const get=f.workspaceRegistry.get;f.workspaceRegistry.get=id=>id==='b'?{path:root,async status(){return'ok'}}:get(id)
  const timer=scheduler(),started=deferred(),release=deferred(),calls=[];let ids=0,ticks=0
  const remote={...f.remote,
    async v340(action,payload,...args){
      calls.push({kind:action,revision:payload.expectedRevision})
      const result=await f.remote.v340(action,payload,...args)
      if(action==='task/create'){started.resolve();await release.promise}
      return result
    },
    async replace(id,revision,draft,...args){
      const call={kind:'ordinary',revision};calls.push(call)
      const result=await f.remote.replace(id,revision,draft,...args);call.committed=result.committed
      return result
    },
  }
  const store=createWorkbenchStore({remote,scheduler:timer,saveDelayMs:400,disposeDrainMs:10,
    createId:()=>++ids===1?'host-task':'ordinary-task',
    clock:()=>new Date(Date.UTC(2026,9,23,0,0,++ticks)).toISOString(),
  })
  t.after(()=>{release.resolve();return store.dispose()})
  store.syncWorkspaces([{workspaceId:'b'}]);await store.hydrateWorkspace('b');await store.loadV340Catalog('b')
  assert.equal(store.peekWorkspaceState('b').pages.length,0)
  const creation=store.createV340Task('b','Flow-1-1'),outcome=creation.then(()=>null,error=>error)
  await started.promise
  return{f,store,timer,release,calls,outcome,ids:()=>ids,ticks:()=>ticks,
    disk:async()=>JSON.parse(await readFile(f.file,'utf8')).b}
}

for(const kind of ['open-panel','create-page'])for(const rename of [false,true])for(const finish of ['settle','close','removed-close']){
  test(`first V340 creation preserves accepted ordinary page kind=${kind} rename=${rename} finish=${finish}`,async t=>{
    const c=await firstCreation(t),{store,timer,release,calls,outcome}=c
    try{
      const page=kind==='open-panel'?store.openPanel('b'):store.createPage('b')
      assert.equal(page.pageId,'ordinary-task')
      if(rename)store.renamePage('b',page.pageId,'accepted ordinary title')
      if(finish==='removed-close')store.syncWorkspaces([])
      const closing=finish==='settle'?null:store.dispose()
      await turn();assert.deepEqual(calls,[{kind:'task/create',revision:0}])
      release.resolve();assert.equal(await outcome,null,'accepted ordinary effects must replay without an internal conflict')
      if(closing)await closing
      else{
        await store.flushWorkspace('b')
        assert.equal(store.peekWorkspaceState('b').syncStatus,'ready')
        assert.equal(store.peekWorkspaceState('b').pages.find(p=>p.pageId===page.pageId)?.title,rename?'accepted ordinary title':'新任务')
      }
      const disk=await c.disk()
      assert.deepEqual(disk.taskOrder,['host-task','ordinary-task'])
      assert.ok(disk.tasks['host-task'].v340)
      assert.equal(disk.tasks['ordinary-task'].title,rename?'accepted ordinary title':'新任务')
      assert.equal(disk.tasks['ordinary-task'].createdAt,page.createdAt)
      assert.equal(disk.tasks['ordinary-task'].updatedAt,rename?'2026-10-23T00:00:02.000Z':page.updatedAt)
      assert.deepEqual(calls,[{kind:'task/create',revision:0},{kind:'ordinary',revision:1,committed:true}])
      assert.equal(disk.revision,2);assert.equal(c.ids(),2);assert.equal(c.ticks(),rename?2:1)
      await store.dispose();assert.equal(store.peekWorkspaceState('b').workspaceId,null);assert.deepEqual(timer.delays(),[])
    }finally{release.resolve();await Promise.allSettled([outcome,store.dispose()])}
  })
}

test('reopening an already created ordinary page replays panel visibility without creating another page',async t=>{
  const c=await firstCreation(t),{store,release,outcome}=c
  try{
    const page=store.openPanel('b');store.setPanelMode('b','hidden')
    assert.equal(store.openPanel('b'),undefined)
    store.renamePage('b',page.pageId,'reopened title')
    release.resolve();assert.equal(await outcome,null);await store.dispose()
    const disk=await c.disk();assert.deepEqual(disk.taskOrder,['host-task','ordinary-task']);assert.equal(disk.panelMode,'normal')
    assert.equal(disk.tasks['ordinary-task'].title,'reopened title');assert.equal(c.ids(),2);assert.deepEqual(c.timer.delays(),[])
  }finally{release.resolve();await Promise.allSettled([outcome,store.dispose()])}
})

test('ordinary openPanel creation and rename drain before the next accepted V340 mutation',async t=>{
  const c=await firstCreation(t),{store,release,calls,outcome}=c
  try{
    const page=store.openPanel('b');store.renamePage('b',page.pageId,'before next V340')
    const next=store.v340Action('b','host-task','task/draft',{draft:{source:'local-skill',textInputs:{research_request_text:'next input'},filePaths:{},configuration:{}}})
    const settled=Promise.allSettled([next]);store.syncWorkspaces([]);const closing=store.dispose()
    release.resolve();assert.equal(await outcome,null);await closing
    assert.equal((await settled)[0].status,'fulfilled')
    const disk=await c.disk();assert.equal(disk.tasks['ordinary-task'].title,'before next V340')
    assert.equal(disk.tasks['host-task'].v340.draft.textInputs.research_request_text,'next input')
    assert.deepEqual(calls,[{kind:'task/create',revision:0},{kind:'ordinary',revision:1,committed:true},{kind:'task/draft',revision:2}])
    assert.equal(disk.revision,3);assert.equal(c.ids(),2);assert.deepEqual(c.timer.delays(),[])
  }finally{release.resolve();await Promise.allSettled([outcome,store.dispose()])}
})

test('synchronous rename during authoritative replay publication preserves the newer accepted title',async t=>{
  const c=await firstCreation(t),{store,release,outcome}=c
  try{
    const page=store.openPanel('b');store.renamePage('b',page.pageId,'earlier title');let reentered=false
    const unsubscribe=store.subscribe(()=>{
      const state=store.peekWorkspaceState('b')
      if(!reentered&&state.pages.some(p=>p.pageId==='host-task')&&state.pages.some(p=>p.pageId===page.pageId)){
        reentered=true;store.renamePage('b',page.pageId,'later synchronous title')
      }
    })
    release.resolve();assert.equal(await outcome,null);unsubscribe();assert.equal(reentered,true);await store.dispose()
    const disk=await c.disk();assert.equal(disk.tasks['ordinary-task'].title,'later synchronous title')
    assert.deepEqual(disk.taskOrder,['host-task','ordinary-task']);assert.equal(c.ids(),2);assert.deepEqual(c.timer.delays(),[])
  }finally{release.resolve();await Promise.allSettled([outcome,store.dispose()])}
})

test('close deadline suppresses late openPanel replay and all subsequent RPC dispatch',async t=>{
  const c=await firstCreation(t),{store,timer,release,calls,outcome}=c
  try{
    const page=store.openPanel('b');store.renamePage('b',page.pageId,'late ordinary title');store.syncWorkspaces([])
    const closing=store.dispose();timer.run(10);await closing
    release.resolve();await outcome;await turn()
    assert.deepEqual(calls,[{kind:'task/create',revision:0}]);assert.equal(store.peekWorkspaceState('b').workspaceId,null)
    const disk=await c.disk();assert.deepEqual(disk.taskOrder,['host-task']);assert.ok(disk.tasks['host-task'].v340)
    assert.equal(c.ids(),2);assert.deepEqual(timer.delays(),[])
  }finally{release.resolve();await Promise.allSettled([outcome,store.dispose()])}
})
