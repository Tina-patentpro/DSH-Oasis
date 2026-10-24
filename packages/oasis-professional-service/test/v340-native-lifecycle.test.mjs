import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { setupNative, MODEL_OUTPUT, NOW, Assembler, defer, tick } from './helpers/v340-native-harness.mjs'
import { NODE_CASES } from './helpers/v340-native-cases.mjs'
import { createWorkbenchService } from '../src/workbench-service.js'
import { createV340RuntimeService } from '../src/v340-runtime-service.js'
import { createV340NativeCandidate } from '../src/v340-native-model.js'
import { openOasisWorkbenchRepository } from '../src/workbench-repository.js'
import { restoreV340Prepared } from '../src/v340-input-snapshot.js'
import { assembleV340Document, prepareV340Inputs } from '../src/v340-document.js'
import { v340Hash, getV340Catalog } from '../src/v340-catalog.js'
import { canonicalJson } from '../src/local-mock-runner.js'

const draft=()=>({source:'local-skill',textInputs:{user_input:'仅合成校准，不宣称真实检索或实测。'},filePaths:{},configuration:{}})
async function waitFor(run){for(let n=0;n<1000&&run()?.status==='prepared';n++)await new Promise(r=>setTimeout(r,1));return run()}
const native={BlockAssembler:Assembler,createUserMessage:v=>({role:'user',...v})}
async function editAndSave(h,taskId,run,core){
 const workbench=createWorkbenchService({repository:h.repository,workspaceRegistry:h.ctx.workspaceRegistry,clock:()=>NOW})
 const cmd=extra=>({workspaceId:'w',taskId,expectedRevision:h.repository.get('w').revision,...extra})
 const base={runId:run.runId,versionId:run.runId,baseSha256:run.result.sha256}
 try{
  // Use the existing common facade for edits, review, writeback and pinned draft.
  await workbench.saveV340ResultDraft(cmd({runId:run.runId,baseSha256:base.baseSha256,body:core,format:'core-markdown'}))
  await workbench.editV340Result(cmd({...base,draftSha256:v340Hash(core),requestKey:'edit-'+taskId}))
  let current=h.repository.get('w').tasks[taskId].v340.runs[run.runId];const v=current.resultVersions.at(-1)
  const selected={runId:run.runId,versionId:v.versionId,resultSha256:v.result.sha256}
  await assert.rejects(()=>workbench.prepareV340Save(cmd(selected)))
  await workbench.reviewV340Result(cmd({...selected,confirmed:true}))
  const plan=await workbench.prepareV340Save(cmd(selected));await workbench.commitV340Save({confirmationToken:plan.confirmationToken})
  current=h.repository.get('w').tasks[taskId].v340.runs[run.runId];const saved=current.resultVersions.at(-1),files=saved.writebacks[0].files
  const md=files.find(f=>f.mediaType==='text/markdown'),json=files.find(f=>f.mediaType==='application/json'),body=await readFile(join(h.root,md.relativePath),'utf8')
  assert.equal(body,saved.result.body);assert.equal(v340Hash(body),md.sha256)
  const metadata=JSON.parse(await readFile(join(h.root,json.relativePath),'utf8'));assert.equal(metadata.execution.evidenceKind,'native-model-candidate')
  assert.equal(metadata.execution.nodeId,run.nodeId)
  return{body,relativePath:md.relativePath,sha256:md.sha256,result:saved.result,selected,workbench,cmd}
 }finally{await workbench.closeV340Runtime()}
}

for(const entry of NODE_CASES)test(entry.nodeId+' candidate edits, re-reviews and saves a pinned Markdown version on actual disk',async t=>{
 const h=await setupNative(t,{nodeId:entry.nodeId,draft:draft()});await h.create();const run=await h.settle();assert.equal(run.status,'completed')
 const saved=await editAndSave(h,'t',run,'已人工编辑：'+entry.nodeId+'公开候选正文。')
 const workbench=createWorkbenchService({repository:h.repository,workspaceRegistry:h.ctx.workspaceRegistry})
 try{const fixed=await workbench.prepareV340ConversationDraft(saved.cmd(saved.selected));assert.match(fixed.text,/已人工编辑/);assert.ok(fixed.text.includes(saved.selected.resultSha256))}
 finally{await workbench.closeV340Runtime()}
 const before=canonicalJson(h.repository.get('w'));await h.repository.close();const reopened=await openOasisWorkbenchRepository(h.disk)
 try{assert.equal(canonicalJson(reopened.get('w')),before)}finally{await reopened.close()}
})

for(const entry of NODE_CASES)for(const kind of ['auth','before-first-chunk','partial-stream','stop-late','close-late','prepare-timeout'])test(entry.nodeId+' '+kind+' retains its durable once-only outcome',async t=>{
 const gate=defer(),started=defer(),options={nodeId:entry.nodeId,draft:draft(),timeoutMs:kind==='prepare-timeout'?15:200}
 if(kind==='auth')options.onPrepare=()=>{throw Object.assign(Error('SYNTHETIC_PRIVATE_ERROR'),{code:'AUTH'})}
 if(kind==='prepare-timeout')options.onPrepare=()=>gate.promise
 if(['before-first-chunk','partial-stream'].includes(kind))options.stream=()=> (async function*(){if(kind==='partial-stream')yield{type:'text-delta',index:0,text:'局部不保存'};throw Error('SYNTHETIC_PRIVATE_ERROR')})()
 if(['stop-late','close-late'].includes(kind))options.stream=()=>{
  started.resolve();return{[Symbol.asyncIterator](){let n=0;return{async next(){await gate.promise;return n++===0?{done:false,value:{type:'text-delta',index:0,text:JSON.stringify(MODEL_OUTPUT)}}:n===2?{done:false,value:{type:'finish',reason:{kind:'stop'}}}:{done:true}},async return(){return{done:true}}}}}
 }
 const h=await setupNative(t,options);await h.create()
 if(kind==='stop-late'||kind==='close-late'){
  await started.promise
  if(kind==='stop-late')await h.service.stopV340Run(h.command({runId:h.run().runId}));else await h.service.closeV340Runtime()
 }
 const r=await h.settle();assert.equal(r.status,kind==='auth'?'failed':'unknown');assert.equal(r.result,null)
 assert.deepEqual(r.nativeCandidate.budget,{maxCalls:1,usedCalls:1});assert.doesNotMatch(JSON.stringify(h.repository.get('w')),/SYNTHETIC_PRIVATE_ERROR/)
 gate.resolve();await tick();await tick();assert.equal(h.run().status,r.status);assert.equal(h.run().result,null)
 if(kind!=='close-late'){await h.create();if(r.status==='unknown')await assert.rejects(()=>h.create('different-key'))}
 assert.equal(h.seen.prepare,1);assert.equal(h.seen.stream,['auth','prepare-timeout'].includes(kind)?0:1)
})

test('all fourteen native candidates hand actual edited saved files to their adjacent node in one Workspace',async t=>{
 let index=0
 const tableAt={'Flow-1-1':['T1'],'Flow-1-2':['T2','T3'],'Flow-2-6':['T4'],'Flow-3-9':['T5'],'Flow-4-11':['T6']}
 const output=()=>({...MODEL_OUTPUT,core_result_markdown:'完整原生替身正文 '+NODE_CASES[index].nodeId,
  tables:Object.fromEntries((tableAt[NODE_CASES[index].nodeId]??[]).map(id=>[id,[{row_id:'row-'+id,data:{value:'公开合成'+id}}]])),
  ...(index===0?{updates:[{content_id:'native-hypothesis',content_markdown:'合成假设保留待确认',content_origin:'model_completed',source_input_id:'none',source_locator:'none',source_hash:'none',trust_status:'hypothesis_to_verify',last_updated_flow:'Flow-1-1',revision_reason:'只校准接口'}],
   model_completions:[{content_id:'native-hypothesis',content_origin:'model_completed',completion_basis:'合成夹具',assumptions:'未实测',confidence:'low',affected_section:'结构',human_confirmation_status:'pending'}]}:{})})
 const h=await setupNative(t,{nodeId:'Flow-1-1',draft:draft(),stream:()=> (async function*(){yield{type:'text-delta',index:0,text:JSON.stringify(output())};yield{type:'finish',reason:{kind:'stop'}}})()})
 let previous
 for(index=0;index<NODE_CASES.length;index++){
  const entry=NODE_CASES[index],taskId=index?'chain-'+index:'t',service=index?createV340RuntimeService({repository:h.repository,preparation:h.preparation,executor:createV340NativeCandidate({nodeId:entry.nodeId,ctx:h.ctx,native}),clock:()=>NOW}):h.service
  const cmd=extra=>({workspaceId:'w',taskId,expectedRevision:h.repository.get('w').revision,...extra})
  try{
   if(index)await service.createV340Task(cmd({nodeId:entry.nodeId,title:entry.title}))
   const d=draft();if(previous)d.filePaths.upstream_md_file=previous.relativePath
   if(entry.nodeId==='Flow-1-4')d.configuration.application_type='utility_model'
   await service.updateV340Draft(cmd({draft:d}))
   const prepared=await h.preparation.prepareV340({workspaceId:'w',nodeId:entry.nodeId,confirmed:true,textInputs:d.textInputs,filePaths:d.filePaths,configuration:d.configuration})
   if(previous){assert.equal(prepared.prepared.values.upstream_md_file.sha256,previous.sha256);assert.equal(prepared.prepared.receipts.upstream_md_file.status,'accepted')}
   const executor=createV340NativeCandidate({nodeId:entry.nodeId,ctx:h.ctx,native})
   const confirmation=await executor.prepareConfirmation({...cmd({}),sessionId:'s',prepared:prepared.prepared})
   await service.createV340Run(cmd({requestKey:'chain-'+index,candidate:{sessionId:'s',confirmed:true,sha256:confirmation.sha256}}))
   const current=()=>{const s=h.repository.get('w').tasks[taskId].v340;return s.runs[s.activeRunId]},run=await waitFor(current)
   assert.equal(run.status,'completed');const snapshot=run.result.snapshot
   assert.equal(snapshot.input_history.length,index+1);assert.equal(snapshot.model_completions[0].human_confirmation_status,'pending')
   assert.ok(snapshot.contents.some(c=>c.content_markdown==='合成假设保留待确认'));assert.ok(snapshot.warnings.some(w=>w.status==='open'))
   if(index>=3)assert.equal(snapshot.application_type,'utility_model')
   for(let prior=0;prior<=index;prior++)assert.ok(snapshot.contents.some(c=>c.content_markdown==='完整原生替身正文 '+NODE_CASES[prior].nodeId))
   if(previous)assert.equal(JSON.parse(h.seen.options.messages[0].content[0].text).values.upstream_md_file.body,previous.body)
   previous=await editAndSave(h,taskId,run,'人工再审候选 '+entry.nodeId)
  }finally{if(index)await service.closeV340Runtime()}
 }
 for(const id of ['T1','T2','T3','T4','T5','T6'])assert.equal(previous.result.snapshot.tables[id].rows[0].data.value,'公开合成'+id)
 assert.equal(h.seen.prepare,14);assert.equal(h.seen.stream,14)
 assert.equal(previous.result.snapshot.input_history.length,14)
 const before=canonicalJson(h.repository.get('w'));await h.repository.close();const reopened=await openOasisWorkbenchRepository(h.disk)
 try{assert.equal(canonicalJson(reopened.get('w')),before)}finally{await reopened.close()}
 assert.equal(getV340Catalog().dispatchEnabled,false)
})

test('another node restores a compact long snapshot at the actual native seam using frozen bytes only',async t=>{
 const h=await setupNative(t,{nodeId:'Flow-2-7',draft:draft()})
 const prior=assembleV340Document({nodeId:'Flow-2-6',workflowRunUid:'12345678-1234-4234-8234-123456789abc',generatedAt:NOW,prepared:prepareV340Inputs('Flow-2-6',{}),output:{...MODEL_OUTPUT,core_result_markdown:'稿'.repeat(90000)}})
 await writeFile(join(h.root,prior.fileName),prior.body);await h.service.updateV340Draft(h.command({draft:{...draft(),filePaths:{upstream_md_file:prior.fileName}}}))
 h.disk.afterPut=async(_,record)=>{const r=record.tasks.t.v340.runs[record.tasks.t.v340.activeRunId];if(r?.status==='prepared')await writeFile(join(h.root,prior.fileName),'文件已变化，不能代替冻结正文')}
 await h.create();const run=await h.settle();assert.equal(run.status,'completed');assert.equal(run.inputSnapshot.preparedEncoding,'values-v1')
 assert.equal(restoreV340Prepared(run.inputSnapshot).values.upstream_md_file.body,prior.body)
 assert.equal(JSON.parse(h.seen.options.messages[0].content[0].text).values.upstream_md_file.body,prior.body)
})

test('first-batch v1 completed evidence still edits, re-reviews and saves without rewriting the old receipt',async t=>{
 const h=await setupNative(t);await h.service.closeV340Runtime();await h.repository.close()
 const bytes=await readFile(new URL('./fixtures/v340-native-candidate-v1/completed.json',import.meta.url),'utf8');await writeFile(h.file,JSON.stringify({w:JSON.parse(bytes)}))
 const repository=await openOasisWorkbenchRepository(h.disk)
 try{
  const state=repository.get('w').tasks.t.v340,run=state.runs[state.activeRunId],old=canonicalJson(run.nativeCandidate)
  await editAndSave({...h,repository},'t',run,'旧v1证据人工修订后的正文。')
  const after=repository.get('w').tasks.t.v340.runs[run.runId];assert.equal(canonicalJson(after.nativeCandidate),old)
  assert.equal(after.result.sha256,run.result.sha256);assert.equal(h.seen.prepare,0)
 }finally{await repository.close()}
})
test('first-batch v1 prepared evidence reopens to unknown and repeated request never consumes a new call',async t=>{
 const h=await setupNative(t);await h.service.closeV340Runtime();await h.repository.close()
 const bytes=await readFile(new URL('./fixtures/v340-native-candidate-v1/prepared.json',import.meta.url),'utf8');await writeFile(h.file,JSON.stringify({w:JSON.parse(bytes)}))
 const repository=await openOasisWorkbenchRepository(h.disk),service=createV340RuntimeService({repository,preparation:h.preparation,executor:h.executor,clock:()=>NOW})
 try{
  const state=repository.get('w').tasks.t.v340,run=state.runs[state.activeRunId],old=canonicalJson(run.nativeCandidate)
  await service.observeV340Run({workspaceId:'w',taskId:'t',runId:run.runId})
  await service.createV340Run({workspaceId:'w',taskId:'t',expectedRevision:repository.get('w').revision,requestKey:run.requestKey})
  const after=repository.get('w').tasks.t.v340.runs[run.runId];assert.equal(after.status,'unknown');assert.equal(canonicalJson(after.nativeCandidate),old);assert.equal(h.seen.prepare,0)
 }finally{await service.closeV340Runtime();await repository.close()}
})
