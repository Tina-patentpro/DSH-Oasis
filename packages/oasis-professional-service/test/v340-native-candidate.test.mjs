import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, realpath, readFile, writeFile, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { openOasisWorkbenchRepository } from '../src/workbench-repository.js'
import { createV340RuntimeService } from '../src/v340-runtime-service.js'
import { createV340PreparationService } from '../src/v340-preparation.js'
import { prepareV340Inputs, assembleV340Document } from '../src/v340-document.js'
import { getV340Catalog, v340Hash } from '../src/v340-catalog.js'
import { parseStoredWorkbenchRecord } from '../src/workbench-domain.js'
import { canonicalJson } from '../src/local-mock-runner.js'
import { createWorkbenchService } from '../src/workbench-service.js'
import { createWorkspaceMaterialManager } from '../src/workspace-materials.js'
const url = new URL('../src/v340-native-model.js', import.meta.url)
const api = await import(url).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url === url.href) return {}
  throw error
})
test('Flow-2-6 disabled native candidate is an explicit internal factory', () => {
  assert.equal(typeof api.createV340NativeCandidate, 'function', 'Flow-2-6 candidate is not implemented')
})
const NOW='2026-10-23T08:00:00.000Z'
const MODEL_OUTPUT={summary:'公开合成结论，未验证专业质量',core_result_markdown:'1. 一种公开测试用阀体，包括壳体和弹簧。',updates:[],tables:{},terms_master:[],warnings:[],model_completions:[]}
const draft=(patch={})=>({source:'local-skill',textInputs:{disclosure_text:'公开合成阀体：壳体内置弹簧与阀芯。',drawings_text:'图1：壳体和阀芯。',claim_requirements_text:'关注阀芯结构。',user_input:'仅根据公开合成材料撰写。'},filePaths:{},configuration:{},...patch})
class Assembler {data=new Map();push(c){if(c.type==='text-delta')this.data.set(c.index,(this.data.get(c.index)??'')+c.text);if(c.type==='block-end')this.data.set(c.index,c.block.text)}blocks(){return [...this.data.values()].map(text=>({type:'text',text}))}}
const finish={type:'finish',reason:{kind:'stop'}}
const text=body=>({type:'text-delta',index:0,text:body})
const tick=()=>new Promise(r=>setImmediate(r))
const defer=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return{promise,resolve}}
async function setup(t, options={}) {
  assert.equal(typeof api.createV340NativeCandidate,'function')
  const root=await realpath(await mkdtemp(join(tmpdir(),'v340-native-candidate-'))),file=join(root,'records.json');await writeFile(file,'{}')
  const disk={file,fail:false,afterPut:null,async open(){let records=JSON.parse(await readFile(file,'utf8'));return{table(){return{get:id=>structuredClone(records[id]),async put(id,value){if(disk.fail)throw Error('synthetic disk failure');const next={...records,[id]:value};await writeFile(file+'.tmp',JSON.stringify(next));await rename(file+'.tmp',file);records=next;await disk.afterPut?.(id,value)}}},async close(){}}}}
  const repository=await openOasisWorkbenchRepository(disk,{clock:()=>NOW})
  const route={provider:'synthetic-native-test',model:'fixture-model'},seen={prepare:0,stream:0,options:null}
  const workspace={id:'w',path:root,sessionIds:['s'],async status(){return'ok'}},session={id:'s',header:{cwd:root},requestHeader(){return undefined}}
  const ctx={workspaceRegistry:{get:id=>id==='w'?workspace:null,list:()=>[workspace]},sessions:{get:id=>id==='s'?session:null},sessionProjections:{stateOf:()=>({pending:{...route}})},agentDefaultModel:{currentSelection:()=>({...route})},llm:{async prepareCall(config,signal){seen.prepare++;await options.onPrepare?.();return{config:{...config},stream(call){seen.stream++;seen.options=call;return options.stream?options.stream(call):(async function*(){yield text(JSON.stringify(options.output??MODEL_OUTPUT));yield finish})()}}}}}
  const executor=api.createV340NativeCandidate({ctx,native:{BlockAssembler:Assembler,createUserMessage:v=>({role:'user',...v})},timeoutMs:options.timeoutMs??200})
  const preparation=createV340PreparationService({materialManager:createWorkspaceMaterialManager({workspaceRegistry:ctx.workspaceRegistry})})
  const service=createV340RuntimeService({repository,preparation,executor:options.wrapExecutor?.(executor)??executor,clock:()=>NOW})
  const command=extra=>({workspaceId:'w',taskId:'t',expectedRevision:repository.get('w').revision,...extra})
  await service.createV340Task(command({nodeId:options.nodeId??'Flow-2-6',title:'新版候选'}))
  await service.updateV340Draft(command({draft:options.draft??draft()}))
  const task=()=>repository.get('w').tasks.t.v340,run=()=>task().runs[task().activeRunId]
  const confirm=async()=>{const d=task().draft;const ready=await preparation.prepareV340({workspaceId:'w',nodeId:task().nodeId,confirmed:true,textInputs:d.textInputs,filePaths:d.filePaths,configuration:d.configuration});return executor.prepareConfirmation({workspaceId:'w',taskId:'t',sessionId:'s',expectedRevision:repository.get('w').revision,prepared:ready.prepared})}
  const create=async(key='request-one',candidate)=>service.createV340Run(command({requestKey:key,candidate:candidate??{sessionId:'s',confirmed:true,sha256:(await confirm()).sha256}}))
  const settle=async()=>{for(let n=0;n<80&&run()?.status==='prepared';n++)await tick();return run()}
  t.after(async()=>{await service.closeV340Runtime();await repository.close();await rm(root,{recursive:true,force:true})})
  return{root,file,disk,repository,service,preparation,executor,ctx,workspace,session,route,seen,command,task,run,confirm,create,settle}
}
test('candidate admission and consumed single-call budget are durable before the native seam',async t=>{
  const h=await setup(t,{onPrepare:async()=>{const r=JSON.parse(await readFile(h.file,'utf8')).w.tasks.t.v340.runs[h.run().runId];assert.equal(r.status,'prepared');assert.equal(r.evidenceKind,'native-model-candidate');assert.deepEqual(r.nativeCandidate.budget,{maxCalls:1,usedCalls:1});assert.equal(r.nativeCandidate.realCallVerified,false)}})
  assert.equal(h.executor.dispatchEnabled,false)
  await h.create();const run=await h.settle();assert.equal(run.status,'completed');assert.equal(run.evidenceKind,'native-model-candidate')
  assert.equal(h.seen.prepare,1);assert.equal(h.seen.stream,1);assert.equal(h.seen.options.tools,undefined)
  assert.equal(h.seen.options.sessionId,'s');assert.match(h.seen.options.system,/V3.4.0/)
  assert.equal(JSON.parse(h.seen.options.messages[0].content[0].text).values.disclosure_text,draft().textInputs.disclosure_text)
  assert.match(run.result.body,/公开测试用阀体/);assert.equal(run.reviewStatus,'not-reviewed')
  await h.create();assert.equal(h.seen.stream,1)
  const before=canonicalJson(h.repository.get('w'));await h.repository.close();const reopened=await openOasisWorkbenchRepository(h.disk)
  assert.equal(canonicalJson(reopened.get('w')),before);await reopened.close()
})
for(const [name,mutate]of [['missing confirmation',()=>undefined],['wrong confirmation',v=>({...v,sha256:'f'.repeat(64)})],['unconfirmed',v=>({...v,confirmed:false})]])test(name+' cannot prepare a call',async t=>{
  const h=await setup(t),c={sessionId:'s',confirmed:true,sha256:(await h.confirm()).sha256}
  await assert.rejects(()=>h.service.createV340Run(h.command({requestKey:'bad',candidate:mutate(c)})));assert.equal(h.seen.prepare,0);assert.equal(h.task().runOrder.length,0)
})
for(const field of ['model','input','revision','membership'])test('confirmation invalidates after '+field+' changes',async t=>{
  const h=await setup(t),confirmed=await h.confirm()
  if(field==='model')h.route.model='another'
  if(field==='input')await h.service.updateV340Draft(h.command({draft:draft({textInputs:{disclosure_text:'新资料'}})}))
  if(field==='revision')await h.service.updateV340Draft(h.command({draft:draft({textInputs:{...draft().textInputs,user_input:'新指令'}})}))
  if(field==='membership')h.workspace.sessionIds=[]
  await assert.rejects(()=>h.create('bad',{sessionId:'s',confirmed:true,sha256:confirmed.sha256}));assert.equal(h.seen.prepare,0)
})
test('a model change while prepareCall is pending prevents stream dispatch',async t=>{
  const h=await setup(t,{onPrepare:()=>{h.route.model='changed-after-admission'}});await h.create();assert.equal((await h.settle()).status,'failed');assert.equal(h.seen.stream,0)
})
for(const [name,output]of [['URL-only',{url:'https://example.invalid/result.md'}],['extra identity',{...MODEL_OUTPUT,workflow_run_uid:'forged'}],['missing required metadata',{core_result_markdown:'only prose'}]])test('strict output refuses '+name,async t=>{
  const h=await setup(t,{output});await h.create();const r=await h.settle();assert.equal(r.status,'failed');assert.equal(r.failureCode,'INVALID_OUTPUT');assert.equal(r.result,null)
})
test('stream disconnection is unknown and repeated/new request keys never redispatch',async t=>{
  const h=await setup(t,{stream:()=> (async function*(){yield text('partial');throw Error('SYNTHETIC_CANARY_PROVIDER_DETAIL')})()});await h.create();assert.equal((await h.settle()).status,'unknown');await h.create();await assert.rejects(()=>h.create('request-two'));assert.equal(h.seen.stream,1);assert.doesNotMatch(JSON.stringify(h.repository.get('w')),/CANARY_PROVIDER/)
})
test('explicit provider rejection before dispatch remains failed, without retry',async t=>{
  const h=await setup(t,{onPrepare:()=>{throw Object.assign(Error('not copied'),{code:'AUTH'})}});await h.create();assert.equal((await h.settle()).status,'failed');await h.create();assert.equal(h.seen.prepare,1);assert.equal(h.seen.stream,0)
})
for(const action of ['stop','close'])test(action+' preserves unknown and ignores late noncooperative success',async t=>{
  const gate=defer()
  const h=await setup(t,{stream:()=>({[Symbol.asyncIterator](){
    let n=0
    return {async next(){await gate.promise;return n++===0?{done:false,value:text(JSON.stringify(MODEL_OUTPUT))}:n===2?{done:false,value:finish}:{done:true}},return(){return Promise.resolve({done:true})}}
  }})})
  await h.create();await tick();if(action==='stop')await h.service.stopV340Run(h.command({runId:h.run().runId}));else await h.service.closeV340Runtime()
  gate.resolve();await tick();await tick();assert.equal((await h.settle()).status,'unknown');assert.equal(h.run().result,null);assert.equal(h.seen.stream,1)
})
test('timeout after preparation is unknown and never retried',async t=>{
  const gate=defer(),h=await setup(t,{timeoutMs:15,onPrepare:()=>gate.promise});await h.create();await new Promise(r=>setTimeout(r,30));assert.equal((await h.settle()).status,'unknown');gate.resolve();await tick();assert.equal(h.seen.stream,0)
})
test('storage failure never reaches prepareCall',async t=>{
  const h=await setup(t),c=await h.confirm();h.disk.fail=true;await assert.rejects(()=>h.create('bad',{sessionId:'s',confirmed:true,sha256:c.sha256}));h.disk.fail=false;assert.equal(h.seen.prepare,0)
})
test('candidate evidence and input corruption are rejected instead of relabeling old data',async t=>{
  const h=await setup(t);await h.create();await h.settle();const record=h.repository.get('w')
  for(const change of [r=>r.nativeCandidate.budget.usedCalls=0,r=>r.nativeCandidate.route.model='forged',r=>r.nativeCandidate.requestSHA256='a'.repeat(64),r=>r.evidenceKind='native-model',r=>delete r.nativeCandidate]){const bad=structuredClone(record);change(bad.tasks.t.v340.runs[h.run().runId]);assert.throws(()=>parseStoredWorkbenchRecord('w',bad))}
})
test('default workbench rejects candidate generation and catalog stays disabled',async t=>{
  const h=await setup(t),service=createV340RuntimeService({repository:h.repository,preparation:createV340PreparationService()});await assert.rejects(()=>service.createV340Run(h.command({requestKey:'default'})),e=>e.code==='V340_EXECUTION_DISABLED');await service.closeV340Runtime()
  assert.equal(getV340Catalog().dispatchEnabled,false);for(const n of getV340Catalog().nodes){assert.equal(n.sources['local-skill'].enabled,false);assert.equal(n.sources['oasis-api'].enabled,false)}
})
test('completed candidate uses the common edit, re-review, root Markdown save and fixed draft path',async t=>{
  const h=await setup(t);await h.create();await h.settle()
  const workbench=createWorkbenchService({repository:h.repository,workspaceRegistry:h.ctx.workspaceRegistry,clock:()=>NOW})
  t.after(()=>workbench.closeV340Runtime())
  const runId=h.run().runId,versionId=runId,baseSha256=h.run().result.sha256,body='1. 一种人工核对后的公开阀体，包括壳体、弹簧及导向件。'
  await h.service.saveV340ResultDraft(h.command({runId,baseSha256,body,format:'core-markdown'}))
  await workbench.editV340Result(h.command({runId,versionId,baseSha256,draftSha256:v340Hash(body),requestKey:'edit-one'}))
  const edited=h.run().resultVersions.at(-1),selection={runId,versionId:edited.versionId,resultSha256:edited.result.sha256}
  assert.equal(edited.review.status,'not-reviewed')
  await assert.rejects(()=>workbench.prepareV340Save(h.command(selection)))
  await workbench.reviewV340Result(h.command({...selection,confirmed:true}))
  const plan=await workbench.prepareV340Save(h.command(selection));await workbench.commitV340Save({confirmationToken:plan.confirmationToken})
  const saved=h.run().resultVersions.at(-1).writebacks[0],markdown=saved.files.find(f=>f.mediaType==='text/markdown'),receipt=saved.files.find(f=>f.mediaType==='application/json')
  assert.equal(await readFile(join(h.root,markdown.relativePath),'utf8'),edited.result.body)
  const metadata=JSON.parse(await readFile(join(h.root,receipt.relativePath),'utf8'));assert.equal(metadata.execution.evidenceKind,'native-model-candidate')
  const fixed=await workbench.prepareV340ConversationDraft(h.command(selection));assert.match(fixed.text,/人工核对后的公开阀体/)
})
test('compact long input is restored at the actual candidate seam without rereading or truncation',async t=>{
  const h=await setup(t),prior=assembleV340Document({nodeId:'Flow-1-5',workflowRunUid:'12345678-1234-4234-8234-123456789abc',generatedAt:NOW,
    prepared:prepareV340Inputs('Flow-1-5',{}),output:{...MODEL_OUTPUT,core_result_markdown:'稿'.repeat(90000)}})
  await writeFile(join(h.root,prior.fileName),prior.body)
  await h.service.updateV340Draft(h.command({draft:draft({filePaths:{upstream_md_file:prior.fileName}})}))
  const c=await h.confirm();await h.create('long',{sessionId:'s',confirmed:true,sha256:c.sha256});const run=await h.settle()
  assert.equal(run.inputSnapshot.preparedEncoding,'values-v1');assert.ok(Buffer.byteLength(JSON.stringify(run.inputSnapshot))<=2*1024*1024)
  assert.equal(run.status,'completed');assert.equal(JSON.parse(h.seen.options.messages[0].content[0].text).values.upstream_md_file.body,prior.body)
  assert.ok(Buffer.byteLength(run.result.body)<=1024*1024)
})
test('a selected material changed after confirmation is rejected before native preparation',async t=>{
  const h=await setup(t);await writeFile(join(h.root,'disclosure.md'),'公开材料 A')
  await h.service.updateV340Draft(h.command({draft:draft({filePaths:{disclosure_file:'disclosure.md'}})}))
  const c=await h.confirm();await writeFile(join(h.root,'disclosure.md'),'公开材料 B')
  await assert.rejects(()=>h.create('changed-file',{sessionId:'s',confirmed:true,sha256:c.sha256}));assert.equal(h.seen.prepare,0)
})
test('executor-local mutation cannot change the authoritative frozen preparation',async t=>{
  const h=await setup(t,{wrapExecutor:e=>({...e,generate(input){input.prepared.values.disclosure_text='MUTATION';return e.generate(input)}})})
  await h.create();assert.equal((await h.settle()).status,'failed');assert.doesNotMatch(JSON.stringify(h.repository.get('w')),/MUTATION/);assert.equal(h.seen.prepare,0)
})
for(const kind of ['other-node','api-source'])test(kind+' is outside this candidate and never dispatches',async t=>{
  const h=await setup(t,kind==='other-node'?{nodeId:'Flow-2-7',draft:draft({textInputs:{disclosure_text:'公开文本'}})}:{draft:draft({source:'oasis-api'})})
  await assert.rejects(()=>h.create('unsupported',{sessionId:'s',confirmed:true,sha256:'a'.repeat(64)}));assert.equal(h.seen.prepare,0)
})
test('a reopened prepared candidate is observed as unknown and never replayed',async t=>{
  const gate=defer(),h=await setup(t,{onPrepare:()=>gate.promise});await h.create();await tick()
  const crashed=await readFile(h.file,'utf8'),runId=h.run().runId
  await h.service.closeV340Runtime();gate.resolve();await h.repository.close();await writeFile(h.file,crashed)
  const repository=await openOasisWorkbenchRepository(h.disk),fresh=createV340RuntimeService({repository,preparation:h.preparation,executor:h.executor,clock:()=>NOW})
  const command=()=>({workspaceId:'w',taskId:'t',runId,expectedRevision:repository.get('w').revision})
  await fresh.observeV340Run({workspaceId:'w',taskId:'t',runId});assert.equal(repository.get('w').tasks.t.v340.runs[runId].status,'unknown')
  await fresh.createV340Run({workspaceId:'w',taskId:'t',expectedRevision:repository.get('w').revision,requestKey:'request-one'});assert.equal(h.seen.prepare,1)
  await fresh.closeV340Runtime();await repository.close()
})

test('candidate context: explicit reasoning-effort change after confirmation starts no call',async t=>{
 const h=await setup(t);h.route.reasoningEffort='low';const c=await h.confirm();h.route.reasoningEffort='high';
 await assert.rejects(()=>h.create('reasoning',{sessionId:'s',confirmed:true,sha256:c.sha256}));assert.equal(h.seen.prepare,0)
})
test('candidate context: cwd context loss during pending prepare prevents stream dispatch',async t=>{
 const h=await setup(t,{onPrepare:()=>{h.session.header.cwd=h.root+'/moved'}});await h.create();assert.equal((await h.settle()).status,'failed');assert.equal(h.seen.stream,0)
})
test('candidate context: removal of membership during pending prepare prevents stream dispatch',async t=>{
 const h=await setup(t,{onPrepare:()=>{h.workspace.sessionIds=[]}});await h.create();assert.equal((await h.settle()).status,'failed');assert.equal(h.seen.stream,0)
})
test('candidate context: malformed JSON safe failure includes no raw payload',async t=>{
 const canary='SYNTHETIC_SECRET_CANARY';const h=await setup(t,{stream:()=> (async function*(){yield text(canary);yield finish})()});await h.create();const r=await h.settle();assert.equal(r.status,'failed');assert.equal(r.failureCode,'INVALID_OUTPUT');assert.doesNotMatch(JSON.stringify(h.repository.get('w')),/SECRET_CANARY/)
})
test('candidate context: unicode oversized streamed response is rejected without partial document',async t=>{
 const h=await setup(t,{stream:()=> (async function*(){yield text('中'.repeat(700000));yield finish})()});await h.create();const r=await h.settle();assert.equal(r.status,'unknown');assert.equal(r.result,null)
})
test('candidate context: duplicate request after model change returns old candidate without another call',async t=>{
 const h=await setup(t);await h.create();await h.settle();const id=h.run().runId;h.route.model='different';await h.create();assert.equal(h.run().runId,id);assert.equal(h.seen.prepare,1);assert.equal(h.seen.stream,1)
})
test('candidate context: changed actual prepare config explicit effort cannot dispatch',async t=>{
 const h=await setup(t);h.route.reasoningEffort='low';const original=h.ctx.llm.prepareCall;h.ctx.llm.prepareCall=async(...args)=>{const p=await original(...args);p.config.reasoningEffort='high';return p};await h.create();assert.equal((await h.settle()).status,'failed');assert.equal(h.seen.stream,0)
})
test('candidate context: after durable admission context loss starts no prepareCall',async t=>{
 const h=await setup(t);h.disk.afterPut=(_,record)=>{if(record.tasks?.t?.v340?.runOrder?.length)h.workspace.sessionIds=[]};await h.create();assert.equal((await h.settle()).status,'failed');assert.equal(h.seen.prepare,0)
})
