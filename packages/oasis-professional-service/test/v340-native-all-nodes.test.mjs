import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { setupNative, MODEL_OUTPUT, NOW } from './helpers/v340-native-harness.mjs'
import { NODE_CASES } from './helpers/v340-native-cases.mjs'
import { createV340NativeCandidate } from '../src/v340-native-model.js'
import { assembleV340Document, prepareV340Inputs } from '../src/v340-document.js'
import { parseStoredWorkbenchRecord } from '../src/workbench-domain.js'
import { canonicalJson } from '../src/local-mock-runner.js'
import { v340Hash } from '../src/v340-catalog.js'

const emptyDraft=()=>({source:'local-skill',textInputs:{user_input:'公开合成材料，不用于申报。'},filePaths:{},configuration:{}})
async function fillInputs(h,entry){
 const d=emptyDraft()
 for(const id of entry.inputIds){
  if(id==='upstream_md_file'){
   const at=NODE_CASES.indexOf(entry),previous=NODE_CASES[at-1]
   const doc=assembleV340Document({nodeId:previous.nodeId,workflowRunUid:'12345678-1234-4234-8234-123456789abc',generatedAt:NOW,prepared:prepareV340Inputs(previous.nodeId,{}),output:MODEL_OUTPUT})
   await writeFile(join(h.root,doc.fileName),doc.body);d.filePaths[id]=doc.fileName
  }else if(id.endsWith('_file')){d.filePaths[id]=id+'.md';await writeFile(join(h.root,d.filePaths[id]),'公开合成文件 '+id+'\n逐字资料。')}
  else if(id==='application_type')d.configuration[id]='utility_model'
  else if(id==='max_fetch')d.configuration[id]=3
  else if(id==='research_scope_config')d.configuration[id]={scope:'公开机械',region:'CN'}
  else d.textInputs[id]='公开合成文本 '+id+'\n逐字资料。'
 }
 await h.service.updateV340Draft(h.command({draft:d}));return d
}

for(const entry of NODE_CASES)test(entry.nodeId+' binds its own fixed resource and all input channels at durable native admission',async t=>{
 const h=await setupNative(t,{nodeId:entry.nodeId,draft:emptyDraft()});const d=await fillInputs(h,entry)
 h.disk.afterPut=async(_,record)=>{
  const state=record.tasks.t.v340,r=state.runs[state.activeRunId];if(r?.status==='prepared'){
   assert.equal(r.nativeCandidate.version,'v340-native-candidate-2');assert.equal(r.nativeCandidate.nodeId,entry.nodeId)
   assert.equal(r.nativeCandidate.workspaceRoot,h.root);assert.equal(r.nativeCandidate.instructionSHA256,entry.instructionSHA256)
   assert.deepEqual(r.nativeCandidate.budget,{maxCalls:1,usedCalls:1})
  }
 }
 await h.create();const run=await h.settle();assert.equal(run.status,'completed');assert.equal(h.seen.stream,1)
 const sent=JSON.parse(h.seen.options.messages[0].content[0].text)
 assert.equal(sent.nodeId,entry.nodeId);assert.deepEqual(Object.keys(sent.values).sort(),entry.inputIds.toSorted())
 for(const [id,value]of Object.entries(d.textInputs))assert.equal(sent.values[id],value)
 for(const [id,value]of Object.entries(d.configuration))assert.deepEqual(sent.values[id],value)
 for(const [id,name]of Object.entries(d.filePaths))assert.equal(sent.values[id].body,await readFile(join(h.root,name),'utf8'))
 assert.equal(v340Hash(h.seen.options.system.split('\n\nHost响应合同 ')[0]),entry.instructionSHA256)
 assert.equal(run.result.snapshot.node_id,entry.nodeId);assert.equal(run.result.snapshot.input_history.at(-1).inputs.user_input.content_origin,'user_text')
 await h.create();assert.equal(h.seen.stream,1)
})

test('same Workspace ID moving root and session cwd invalidates an already prepared confirmation',async t=>{
 const h=await setupNative(t),c=await h.confirm();h.workspace.path=h.root+'/B';h.session.header.cwd=h.workspace.path
 await assert.rejects(()=>h.create('root-change',{sessionId:'s',confirmed:true,sha256:c.sha256}));assert.equal(h.seen.prepare,0)
})
test('same-ID root and cwd movement during prepareCall blocks stream dispatch',async t=>{
 const h=await setupNative(t,{onPrepare:()=>{h.workspace.path=h.root+'/B';h.session.header.cwd=h.workspace.path}})
 await h.create();assert.equal((await h.settle()).status,'failed');assert.equal(h.seen.stream,0)
})
test('node-bound factory rejects another node preparation and unknown node before any call',async t=>{
 const h=await setupNative(t);const other=createV340NativeCandidate({nodeId:'Flow-2-7',ctx:h.ctx,native:{}})
 await assert.rejects(()=>other.prepareConfirmation({workspaceId:'w',taskId:'t',sessionId:'s',expectedRevision:2,prepared:prepareV340Inputs('Flow-2-6',{})}))
 assert.throws(()=>createV340NativeCandidate({nodeId:'Flow-9-99',ctx:h.ctx,native:{}}));assert.equal(h.seen.prepare,0)
})
test('v2 system supplies the strict model response schema and retains the original node instruction',async t=>{
 const h=await setupNative(t);await h.create();await h.settle();const system=h.seen.options.system
 const schema=JSON.parse(system.split('\nHost输出JSON Schema：')[1])
 assert.deepEqual(schema.required.toSorted(),['summary','core_result_markdown','updates','tables','terms_master','warnings','model_completions'].toSorted())
 assert.equal(schema.additionalProperties,false);assert.equal(schema.properties.tables.additionalProperties,false)
 assert.equal(schema.properties.updates.items.additionalProperties,false);assert.equal(schema.properties.model_completions.items.properties.human_confirmation_status.const,'pending')
})
for(const name of ['prepared','completed'])test('first-batch native v1 '+name+' record remains byte-compatible without migration',async()=>{
 const input=JSON.parse(await readFile(new URL('./fixtures/v340-native-candidate-v1/'+name+'.json',import.meta.url),'utf8'))
 assert.equal(canonicalJson(parseStoredWorkbenchRecord('w',input)),canonicalJson(input))
})
test('a captured v1 prepared authorization cannot be dispatched by the new candidate executor',async t=>{
 const h=await setupNative(t);const record=JSON.parse(await readFile(new URL('./fixtures/v340-native-candidate-v1/prepared.json',import.meta.url),'utf8')),state=record.tasks.t.v340,run=state.runs[state.activeRunId]
 const response=await h.executor.generate({runId:run.runId,workflowRunUid:run.workflowRunUid,workspaceId:'w',taskId:'t',nodeId:run.nodeId,source:run.source,prepared:structuredClone(run.inputSnapshot.prepared),candidateRun:run,signal:new AbortController().signal})
 assert.equal(response.status,'failed');assert.equal(h.seen.prepare,0)
})

for(const path of ['', 'relative-project'])test('new native confirmation rejects an unselected '+(path?'relative':'empty')+' root',async t=>{
 const h=await setupNative(t);h.workspace.path=path;h.session.header.cwd=path
 await assert.rejects(()=>h.confirm());assert.equal(h.seen.prepare,0)
})
test('frozen text source receipts make a legitimate native provenance update possible without invented hashes',async t=>{
 const source='公开审查意见：请解释阀芯的导向关系。'
 const h=await setupNative(t,{nodeId:'Flow-6-14',draft:{...emptyDraft(),textInputs:{oa_notice_text:source,user_input:'仅合成校准'}},stream:call=>(async function*(){
  const request=JSON.parse(call.messages[0].content[0].text),receipt=request.receipts?.oa_notice_text
  const output={...MODEL_OUTPUT,updates:[{content_id:'notice-source',content_markdown:source,content_origin:'user_text',source_input_id:'oa_notice_text',source_locator:source,source_hash:receipt?.sha256??'none',trust_status:'source_fact',last_updated_flow:'Flow-6-14',revision_reason:'原文来源引用，不作额外判断'}]}
  yield{type:'text-delta',index:0,text:JSON.stringify(output)};yield{type:'finish',reason:{kind:'stop'}}
 })()})
 await h.create();const run=await h.settle();assert.equal(run.status,'completed')
 const sent=JSON.parse(h.seen.options.messages[0].content[0].text)
 assert.equal(sent.receipts.oa_notice_text.sha256,v340Hash(source));assert.equal(sent.receipts.oa_notice_text.content_origin,'user_text')
 assert.equal(run.result.snapshot.contents.find(c=>c.content_id==='notice-source').source_hash,v340Hash(source))
 const requestSHA256=v340Hash(canonicalJson(sent));assert.equal(run.nativeCandidate.requestSHA256,requestSHA256)
})

for(const entry of NODE_CASES)test(entry.nodeId+' invalidates confirmation after model, root or input revision changes before dispatch',async t=>{
 const h=await setupNative(t,{nodeId:entry.nodeId,draft:emptyDraft()}),c=await h.confirm(),confirmation={sessionId:'s',confirmed:true,sha256:c.sha256}
 const model=h.route.model;h.route.model='another-model';await assert.rejects(()=>h.create('stale-model',confirmation));h.route.model=model
 h.workspace.path=h.root+'/another-root';h.session.header.cwd=h.workspace.path;await assert.rejects(()=>h.create('stale-root',confirmation));h.workspace.path=h.root;h.session.header.cwd=h.root
 await h.service.updateV340Draft(h.command({draft:{...emptyDraft(),textInputs:{user_input:'确认后新增材料'}}}))
 await assert.rejects(()=>h.create('stale-input',confirmation));assert.equal(h.seen.prepare,0);assert.equal(h.task().runOrder.length,0)
})
for(const [kind,change]of [
 ['human-confirmed origin',u=>({...u,content_origin:'human_confirmed'})],
 ['confirmed technical fact',u=>({...u,trust_status:'confirmed_fact'})],
 ['another node provenance',u=>({...u,last_updated_flow:'Flow-2-6'})],
])test('native Flow-6-14 cannot publish '+kind+' through a structurally valid output',async t=>{
 const update={content_id:'fabricated-confirmation',content_markdown:'模型分析仍待核对',content_origin:'workflow_analysis',source_input_id:'none',source_locator:'none',source_hash:'none',trust_status:'reasoned_inference',last_updated_flow:'Flow-6-14',revision_reason:'合成边界测试'}
 const h=await setupNative(t,{nodeId:'Flow-6-14',draft:emptyDraft(),output:{...MODEL_OUTPUT,updates:[change(update)]}})
 await h.create();const run=await h.settle();assert.equal(run.status,'failed');assert.equal(run.failureCode,'INVALID_OUTPUT');assert.equal(run.result,null)
})
