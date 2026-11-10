import test from 'node:test'
import assert from 'node:assert/strict'
import {createElement as h} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {setupM06ControlledHost} from './helpers/m06-controlled-host-harness.mjs'
import {createWorkbenchRemote} from '../src/client/workbench-remote.js'
import {FunctionCenter} from '../src/client/FunctionCenter.js'
import {createProductSettings} from '../src/client/product-settings.js'
import {PanelPages} from '../src/client/PanelPages.js'
import {PanelChrome} from '../src/client/PanelChrome.js'
import {ensureEmbeddedWorkspaceHidden} from '../src/client/OasisWorkbenchSurface.js'
import {createWorkbenchStore} from '../src/client/workbench-store.js'
import {writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import * as entry from '../src/client/WorkbenchEntry.js'
let api={}
try{api=await import('../src/client/v340-zero-preview.js')}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e}
function mode(t){const old=process.env.OASIS_NATIVE_ZERO_GENERATION;process.env.OASIS_NATIVE_ZERO_GENERATION='1';t.after(()=>{if(old===undefined)delete process.env.OASIS_NATIVE_ZERO_GENERATION;else process.env.OASIS_NATIVE_ZERO_GENERATION=old})}
async function fixture(t){mode(t);const f=await setupM06ControlledHost(t);const catalog=(await f.rpc('workflow/v340/catalog',{})).value;const calls=[]
 const remote=createWorkbenchRemote({rpc:{call:async(_,path,payload)=>{calls.push(path);return f.rpc(path.slice('oasis-workbench/'.length),payload)}}})
 return{f,catalog,calls,remote}}

test('trusted zero catalog exposes mode, and real transport prepares input without creating a business task',async t=>{
 const{f,catalog,calls,remote}=await fixture(t),before=structuredClone(await f.state())
 assert.equal(catalog.nativeZeroGeneration,true)
 assert.equal(typeof api.createV340ZeroPreview,'function')
 const view=api.createV340ZeroPreview({workspaceId:'w',catalog,prepare:(p,s)=>remote.prepareV340(p,s)})
 assert.deepEqual(calls,[])
 view.setInput('disclosure_text','公开阀体、弹簧和阀芯')
 await assert.rejects(view.prepare(),/确认/)
 view.setConfirmed(true);await view.prepare()
 assert.deepEqual(calls,['oasis-workbench/workflow/v340/prepare'])
 assert.equal(view.getSnapshot().result.prepared.receipts.disclosure_text.status,'accepted')
 assert.deepEqual(await f.state(),before)
 assert.deepEqual(f.calls,{...f.calls,adapter:0,credentials:0,network:0})
})

test('zero entry selects memory preview while ordinary entry retains real task creation',async t=>{
 const{catalog}=await fixture(t);assert.equal(typeof api.selectV340Entry,'function')
 const calls=[],options={catalog,nodeId:'Flow-2-6',openPreview:()=>calls.push('preview'),createTask:()=>calls.push('task')}
 await api.selectV340Entry(options);assert.deepEqual(calls,['preview'])
 await api.selectV340Entry({...options,catalog:{...catalog,nativeZeroGeneration:undefined}});assert.deepEqual(calls,['preview','task'])
 assert.throws(()=>api.selectV340Entry({...options,nodeId:'Flow-2-7'}),/零生成/)
})

test('input changes invalidate confirmation/results; cancellation rejects late results without retry',async t=>{
 const{catalog,remote}=await fixture(t);assert.equal(typeof api.createV340ZeroPreview,'function')
 let finish,requests=0;const view=api.createV340ZeroPreview({workspaceId:'w',catalog,prepare:async p=>{requests++;return new Promise(ok=>{finish=()=>remote.prepareV340(p).then(ok)})}})
 view.setConfirmed(true);const pending=view.prepare();await assert.rejects(view.prepare(),/进行/)
 view.cancel();await finish();await pending
 assert.equal(requests,1);assert.equal(view.getSnapshot().result,null)
 view.setInput('disclosure_text','另一份材料');assert.equal(view.getSnapshot().confirmed,false)
 await assert.rejects(view.prepare(),/确认/);assert.equal(requests,1)
})

test('normal catalog cannot construct a zero preview; mismatched preparation identity is refused',async t=>{
 const{catalog,remote}=await fixture(t);assert.equal(typeof api.createV340ZeroPreview,'function')
 assert.throws(()=>api.createV340ZeroPreview({workspaceId:'w',catalog:{...catalog,nativeZeroGeneration:undefined},prepare(){}}),/零生成/)
 const view=api.createV340ZeroPreview({workspaceId:'w',catalog,prepare:async p=>({...await remote.prepareV340(p),workspaceId:'other'})})
 view.setConfirmed(true);await assert.rejects(view.prepare(),/身份/);assert.equal(view.getSnapshot().result,null)
})

test('zero function center disables ordinary service/import/non-M06 entries and offers only M06 preview',async t=>{
 const{catalog}=await fixture(t)
 const html=renderToStaticMarkup(h(FunctionCenter,{state:{catalogStatus:'ready',workflows:[{workflowId:'patent-claims',executionMode:'unified-text'}],v340Catalog:catalog,pages:[]},onImport(){},onSelectV340(){}}))
 assert.match(html,/只读预览/)
 assert.match(html,/<button[^>]*disabled=""[^>]*>从网站导入/)
 assert.match(html,/<button[^>]*disabled=""[^>]*>权利要求书生成/)
 assert.match(html,/<button[^>]*disabled=""[^>]*>说明书初稿/)
})

test('zero settings never requests account status or credentials after Host capability is read',async t=>{
 const{remote,calls}=await fixture(t),scope={getSnapshot:()=>({status:'ready',mode:'host',writable:true}),subscribe:()=>()=>{}}
 const settings=createProductSettings({remote});t.after(()=>settings.dispose())
 settings.bind({settingsScope:{bind:()=>scope},remote:{$host:{isLoopback:true}},connection:{isLoopback:true,generation:{getSnapshot:()=>1,subscribe:()=>()=>{}}}})
 await settings.refresh()
 assert.equal(settings.getSnapshot().nativeZeroGeneration,true)
 await settings.login({});await settings.sendSms({});await settings.logout();await settings.refresh()
 assert.ok(calls.length>0);assert.ok(calls.every(x=>x==='oasis-workbench/workflow/v340/catalog'))
 assert.equal(settings.getSnapshot().credentialWritable,false)
})

test('zero PanelPages renders eight shared inputs without task records or saved/reviewed claims',async t=>{
 const{catalog}=await fixture(t),state={workspaceId:'w',syncStatus:'ready',pages:[],v340Catalog:catalog,catalogStatus:'ready',workflows:[]}
 const html=renderToStaticMarkup(h(PanelPages,{state,zeroPreview:true,prepareZeroPreview(){},onCloseZeroPreview(){}}))
 assert.match(html,/仅核对输入与准备结果/)
 assert.equal((html.match(/<(?:input|textarea)[^>]*aria-label=/g)??[]).length,8)
 assert.match(html,/本次视图关闭后不保留/)
 assert.doesNotMatch(html,/输入已保存|审核此版本|准备保存当前版本|taskId|revision/)
 const chrome=renderToStaticMarkup(h(PanelChrome,{state:{...state,effectiveMode:'normal',pageOperations:{}}}))
 assert.match(chrome,/<button[^>]*aria-label="新建任务页"[^>]*disabled=""/)
})

test('embedded hydration, local panel opening and preparation issue only readonly RPCs and retain actual repository',async t=>{
 const{f,calls,remote}=await fixture(t),before=structuredClone(await f.state()),store=createWorkbenchStore({remote,saveDelayMs:0})
 t.after(()=>store.dispose())
 await ensureEmbeddedWorkspaceHidden({store,workspaceId:'w',workspaceItems:[{workspaceId:'w'}]})
 store.openPanel('w');await store.flushWorkspace('w')
 const command={workspaceId:'w',nodeId:'Flow-2-6',confirmed:true,textInputs:{disclosure_text:'公开阀体'},filePaths:{},configuration:{}}
 await store.prepareV340ZeroPreview('w',command)
 await assert.rejects(store.prepareV340ZeroPreview('other',{...command,workspaceId:'other'}),/Workspace/)
 await store.flushWorkspace('w')
 assert.deepEqual(await f.state(),before)
 assert.ok(calls.every(path=>['state/get','workflow/catalog','workflow/v340/catalog','workflow/v340/prepare'].some(x=>path==='oasis-workbench/'+x)),calls.join(','))
})

test('preview reads selected project file through actual transport; editing clears result and confirmation',async t=>{
 const{f,catalog,remote}=await fixture(t),body='公开材料：弹簧连接阀芯。'
 await writeFile(join(f.h.root,'preview-input.md'),body)
 const view=api.createV340ZeroPreview({workspaceId:'w',catalog,prepare:(p,s)=>remote.prepareV340(p,s)})
 view.setInput('disclosure_file','preview-input.md');view.setConfirmed(true)
 await view.prepare()
 assert.equal(view.getSnapshot().result.prepared.receipts.disclosure_file.sha256,createHash('sha256').update(body).digest('hex'))
 view.setInput('disclosure_file','../outside.md')
 assert.equal(view.getSnapshot().confirmed,false);assert.equal(view.getSnapshot().result,null)
 view.setConfirmed(true);await assert.rejects(view.prepare())
 assert.equal(view.getSnapshot().result,null)
 assert.equal(f.calls.network,0);assert.equal(f.calls.adapter,0);assert.equal(f.calls.credentials,0)
})

test('store rejects late preparation after Workspace is removed and reintroduced',async t=>{
 const{remote}=await fixture(t)
 let release
 const store=createWorkbenchStore({remote:{...remote,prepareV340:async p=>{
  const result=await remote.prepareV340(p)
  return new Promise(ok=>{release=()=>ok(result)})
 }}})
 t.after(()=>store.dispose())
 await ensureEmbeddedWorkspaceHidden({store,workspaceId:'w',workspaceItems:[{workspaceId:'w'}]})
 const originalPages=structuredClone(store.getWorkspaceState('w').pages)
 const command={workspaceId:'w',nodeId:'Flow-2-6',confirmed:true,textInputs:{},filePaths:{},configuration:{}}
 const pending=store.prepareV340ZeroPreview('w',command)
 while(!release)await new Promise(ok=>setImmediate(ok))
 store.syncWorkspaces([]);store.syncWorkspaces([{workspaceId:'w'}])
 release();await assert.rejects(pending,/上下文/)
 assert.deepEqual(store.getWorkspaceState('w').pages,originalPages)
})

test('early standalone entry resolves Host mode before attempting panel persistence',async t=>{
 const{f,remote,calls}=await fixture(t),before=structuredClone(await f.state()),store=createWorkbenchStore({remote,saveDelayMs:0})
 t.after(()=>store.dispose());store.syncWorkspaces([{workspaceId:'w'}])
 assert.equal(typeof entry.openStandaloneWorkbench,'function')
 await entry.openStandaloneWorkbench({store,workspaceId:'w'})
 await store.hydrateWorkspace('w');await store.flushWorkspace('w')
 assert.deepEqual(await f.state(),before)
 assert.ok(calls.every(path=>['workflow/v340/catalog','state/get'].some(x=>path==='oasis-workbench/'+x)),calls.join(','))
 const events=[]
 await entry.openStandaloneWorkbench({workspaceId:'normal',store:{async loadV340Catalog(){events.push('catalog')},openPanel(){events.push('open')}}})
 assert.deepEqual(events,['catalog','open'])
 await assert.rejects(entry.openStandaloneWorkbench({workspaceId:'failed',store:{async loadV340Catalog(){throw Error('no capability')},openPanel(){assert.fail('must not open')}}}),/capability/)
})
