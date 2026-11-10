import test from 'node:test'
import assert from 'node:assert/strict'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {setupNative,Assembler} from './helpers/v340-native-harness.mjs'
import {createM06BusinessNativeCandidate013} from '../src/v340-native-model.js'
import {V340GenerationPage} from '../src/client/V340GenerationPage.js'
import {getV340Catalog} from '../src/v340-catalog.js'

test('a selected native model with an unconfigured referenced credential cannot offer paid confirmation',async t=>{
  const h=await setupNative(t)
  let descriptions=0
  h.ctx.llm.listConfigurableProviders=()=>[{provider:h.route.provider,settingsNs:'native-model',settingsPath:[]}]
  h.ctx.settings={describe:()=>[{ns:'native-model',value:{apiKeyEnv:'PUBLIC_TEST_MODEL_KEY'}}]}
  h.ctx.credentials={describe:async ref=>{assert.equal(ref,'PUBLIC_TEST_MODEL_KEY');descriptions++;return{configured:false,writable:true}},resolve:()=>assert.fail('do not read credential value')}
  const executor=createM06BusinessNativeCandidate013({ctx:h.ctx,native:{BlockAssembler:Assembler,createUserMessage:x=>x}})
  const d=h.task().draft,{prepared}=await h.preparation.prepareV340({workspaceId:'w',nodeId:'Flow-2-6',confirmed:true,textInputs:d.textInputs,filePaths:d.filePaths,configuration:d.configuration})
  await assert.rejects(executor.prepareConfirmation({workspaceId:'w',taskId:'t',sessionId:'s',expectedRevision:h.repository.get('w').revision,prepared}),{code:'MODEL_UNAVAILABLE'})
  assert.equal(descriptions,1);assert.equal(h.seen.prepare,0);assert.equal(h.seen.stream,0)
  assert.equal(h.task().runOrder.length,0)
})

test('runtime retains safe native model failure classification without dispatching a second call',async t=>{
  const h=await setupNative(t,{wrapExecutor:executor=>({...executor,generate:async()=>({status:'failed',code:'MODEL_UNAVAILABLE'})})})
  await h.create();const run=await h.settle()
  assert.equal(run.status,'failed');assert.equal(run.failureCode,'MODEL_UNAVAILABLE')
  assert.equal(h.task().runOrder.length,1);assert.equal(h.seen.stream,0)
})

test('a historical EXECUTION_FAILED run is visibly failed rather than an empty result',()=>{
  const run={runId:'r',status:'failed',failureCode:'EXECUTION_FAILED',result:null}
  const page={pageId:'t',title:'权利要求初稿',v340:{nodeId:'Flow-2-6',draft:{source:'local-skill',filePaths:{},textInputs:{},configuration:{}},activeRunId:'r',runOrder:['r'],runs:{r:run}}}
  const html=renderToStaticMarkup(createElement(V340GenerationPage,{page,node:getV340Catalog().nodes.find(n=>n.nodeId==='Flow-2-6'),state:{workspaceId:'w',revision:1,pages:[page],syncStatus:'ready'}}))
  assert.match(html,/本次生成失败/);assert.match(html,/EXECUTION_FAILED/);assert.match(html,/不会自动重试/)
})

test('model prerequisite feedback exposes a safe explanation instead of a raw error',()=>{
  const page={pageId:'t',title:'权利要求初稿',v340:{nodeId:'Flow-2-6',draft:{source:'local-skill',filePaths:{},textInputs:{},configuration:{}},activeRunId:null,runOrder:[],runs:{}}}
  const html=renderToStaticMarkup(createElement(V340GenerationPage,{page,node:getV340Catalog().nodes.find(n=>n.nodeId==='Flow-2-6'),operation:{candidateModelUnavailable:true,error:'private-error-must-not-render'},state:{workspaceId:'w',revision:1,pages:[page],syncStatus:'ready'}}))
  assert.match(html,/当前DSH模型引用的API凭据不可用/);assert.doesNotMatch(html,/private-error-must-not-render/)
})
