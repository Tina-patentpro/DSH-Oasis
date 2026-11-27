import test from 'node:test'
import assert from 'node:assert/strict'
import {createElement as h} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {resultFixture} from './v340-result-fixture.mjs'
import {createWorkbenchRemote} from '../src/client/workbench-remote.js'
import {createWorkbenchStore} from '../src/client/workbench-store.js'
import {recordToWorkspaceState} from '../src/client/workbench-model.js'
import {createProductSettings} from '../src/client/product-settings.js'
import {FunctionCenter} from '../src/client/FunctionCenter.js'
import {V340GenerationPage} from '../src/client/V340GenerationPage.js'
import {createM06NativeBusinessRecovery} from '../src/m06-native-business-recovery.js'
import {createWorkbenchRpcHandler} from '../src/workbench-rpc.js'
const marker={schemaVersion:1,policy:'m06-native-business-recovery-v1'}
test('recovery client resumes through narrow selection and cannot schedule broad saves or new runs',async t=>{
 const f=await resultFixture(t,'local-skill',{nodeId:'Flow-2-6'}),get=f.workspaceRegistry.get
 f.workspaceRegistry.get=id=>{const v=get(id);return v?{...v,id}:undefined}
 await f.repository.mutate('a',f.record().revision,r=>({...r,activeTaskId:null}))
 const mode=createM06NativeBusinessRecovery({repository:f.repository,workspaceRegistry:f.workspaceRegistry,scope:{...marker,root:f.root,workspacePath:f.root,workspaceId:'a',taskId:'new',runId:f.run().runId,inputSha256:f.run().inputSha256}})
 const handler=createWorkbenchRpcHandler(f.service,null,null,null,{m06Candidate013:true,nativeBusinessRecovery:mode}),calls=[]
 const remote=createWorkbenchRemote({rpc:{async call(_channel,endpoint,payload){const action=endpoint.replace('oasis-workbench/','');calls.push(action);return handler(action,payload)}}})
 const store=createWorkbenchStore({remote,saveDelayMs:0});t.after(()=>store.dispose())
 store.syncWorkspaces([{workspaceId:'a'}]);await store.hydrateWorkspace('a');await store.loadWorkflowCatalog('a')
 assert.deepEqual(store.getWorkspaceState('a').v340Catalog.nativeBusinessRecovery,marker)
 store.openPanel('a');await store.activatePage('a','new');await store.flushWorkspace('a')
 assert.equal(store.getWorkspaceState('a').activePageId,'new');assert.equal(f.record().activeTaskId,'new')
 assert.ok(calls.includes('workflow/v340/task/select'));assert.ok(!calls.includes('state/replace'))
 for(const op of [()=>store.createPage('a'),()=>store.renamePage('a','new','forbidden'),()=>store.createV340Task('a','Flow-2-6'),()=>store.prepareV340Candidate('a','new'),()=>store.saveV340Draft('a','new',{})]){
  await assert.rejects(async()=>op())
 }
 await store.loadProfessionalBootstrap('a')
 assert.ok(!calls.some(x=>/professional|candidate|task\/create|task\/draft/.test(x)))
 store.closePage('a','new')
 assert.equal(store.getWorkspaceState('a').activePageId,null)
 await store.activatePage('a','new')
 assert.equal(store.getWorkspaceState('a').activePageId,'new','closed retained task can be reopened')
 assert.ok(!store.getWorkspaceState('a').closedV340Tabs.includes('new'))
 const cold=createWorkbenchStore({remote,saveDelayMs:0});t.after(()=>cold.dispose())
 cold.syncWorkspaces([{workspaceId:'a'}]);await cold.hydrateWorkspace('a');await cold.loadWorkflowCatalog('a')
 assert.equal(cold.getWorkspaceState('a').activePageId,'new')
 assert.equal(cold.getWorkspaceState('a').pages[0].v340.activeRunId,f.run().runId)
})
test('recovery UI exposes retained tasks but freezes input and candidate generation',async t=>{
 const f=await resultFixture(t,'local-skill',{nodeId:'Flow-2-6'}),state={...recordToWorkspaceState(f.record()),catalogStatus:'ready',v340Catalog:{...f.service.getV340Catalog(),nativeBusinessRecovery:marker}}
 const center=renderToStaticMarkup(h(FunctionCenter,{state,onResumeV340(){},onSelectV340(){},onImport(){}}))
 assert.match(center,/重新打开 共同任务/)
 assert.match(center,/本地业务恢复验收/)
 const page=state.pages[0],node=state.v340Catalog.nodes.find(n=>n.nodeId==='Flow-2-6')
 const html=renderToStaticMarkup(h(V340GenerationPage,{page,state,node,actions:{prepareCandidate(){},saveDraft(){}}}))
 assert.match(html,/<textarea[^>]*disabled=""/)
 assert.ok(!html.includes('核对模型与材料'))
 assert.match(html,/编辑结果/)
})
test('recovery settings detect mode before reading account state or credentials',async t=>{
 let accountReads=0
 const remote={getV340Catalog:async()=>({nativeBusinessRecovery:marker}),accountStatus:async()=>{accountReads++;throw Error('forbidden')}}
 const controller=createProductSettings({remote});t.after(()=>controller.dispose())
 controller.bind({settingsScope:{bind:()=>({getSnapshot:()=>({status:'ready',mode:'host',writable:true,value:{}}),subscribe:()=>()=>{}})},remote:{$host:{isLoopback:true}},connection:{isLoopback:true,generation:{getSnapshot:()=>1,subscribe:()=>()=>{}}}})
 await controller.refresh();assert.equal(accountReads,0);assert.equal(controller.getSnapshot().credentialWritable,false)
 assert.equal(controller.getSnapshot().nativeBusinessRecovery,true)
})
