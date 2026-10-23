import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFile,rm,writeFile} from 'node:fs/promises'
import {resultFixture} from './v340-result-fixture.mjs'
import {createWorkbenchService} from '../src/workbench-service.js'
import {openOasisWorkbenchRepository} from '../src/workbench-repository.js'
import {canonicalJson} from '../src/local-mock-runner.js'
import {parseWorkbenchRecord} from '../src/workbench-domain.js'
import {createWorkbenchStore} from '../src/client/workbench-store.js'

const hash=s=>createHash('sha256').update(s).digest('hex')
const bytes=value=>Buffer.byteLength(JSON.stringify(value))
const output=core=>({summary:'公开合成结论',core_result_markdown:core,updates:[],tables:{},terms_master:[],warnings:[],model_completions:[]})
async function settled(get){
 const end=Date.now()+5000
 while(get()?.status==='prepared'&&Date.now()<end)await new Promise(r=>setTimeout(r,5))
 assert.equal(get()?.status,'completed');return get()
}
async function savedLong(t,source='local-skill',options={}){
 const f=await resultFixture(t,source),legacy=structuredClone(f.run())
 let nextInput,calls=0
 const service=createWorkbenchService({repository:f.repository,workspaceRegistry:f.workspaceRegistry,v340Executor:{evidenceKind:'synthetic',async generate(input){
  calls++
  if(input.nodeId==='Flow-1-2'){
   nextInput=structuredClone(input.prepared)
   if(options.next)return options.next(input)
  }
  return{status:'completed',output:output(input.nodeId==='Flow-1-1'?'x'.repeat(270000):'下游完整正文')}
 }}});t.after(()=>service.closeV340Runtime())
 const command=(taskId,extra)=>({workspaceId:'a',taskId,expectedRevision:f.record().revision,...extra})
 const get=taskId=>{const state=f.record().tasks[taskId].v340;return state.runs[state.activeRunId]}
 await service.createV340Task(command('long',{nodeId:'Flow-1-1',title:'长稿准入回归'}))
 await service.updateV340Draft(command('long',{draft:{source,textInputs:{},filePaths:{},configuration:{}}}))
 await service.createV340Run(command('long',{requestKey:'long'}));const original=await settled(()=>get('long'))
 const identity={runId:original.runId,versionId:original.runId,resultSha256:original.result.sha256}
 await service.reviewV340Result(command('long',{...identity,confirmed:true}))
 const plan=await service.prepareV340Save(command('long',identity));await service.commitV340Save({confirmationToken:plan.confirmationToken})
 const file=plan.manifest.files.find(f=>f.mediaType==='text/markdown')
 assert.equal(await readFile(file.absolutePath,'utf8'),original.result.body)
 assert.ok(Buffer.byteLength(original.result.body)>800000&&Buffer.byteLength(original.result.body)<1024*1024)
 assert.equal(file.relativePath.endsWith('_OIW.md'),source==='oasis-api')
 const prepared=(await service.prepareV340({workspaceId:'a',nodeId:'Flow-1-2',confirmed:true,filePaths:{upstream_md_file:file.relativePath}})).prepared
 assert.equal(prepared.upstream.status,'accepted');assert.ok(bytes(prepared)>2*1024*1024)
 await service.createV340Task(command('next',{nodeId:'Flow-1-2',title:'实际相邻准入'}))
 await service.updateV340Draft(command('next',{draft:{source,textInputs:{},filePaths:{upstream_md_file:file.relativePath},configuration:{}}}))
 return{f,service,legacy,original,file,prepared,command,get,nextInput:()=>nextInput,calls:()=>calls}
}

// Reverting snapshot de-duplication must reject these real saved-file admissions.
for(const source of ['local-skill','oasis-api'])test(`saved long ${source} artifact actually admits and completes its adjacent node with frozen input and legacy evidence intact`,async t=>{
 const h=await savedLong(t,source),before=structuredClone(h.get('long'))
 await h.service.createV340Run(h.command('next',{requestKey:'next'}))
 const run=await settled(()=>h.get('next'))
 assert.ok(bytes(run.inputSnapshot)<=2*1024*1024)
 assert.equal(run.inputSha256,hash(canonicalJson(run.inputSnapshot)))
 assert.equal(run.inputSnapshot.prepared.sha256,hash(canonicalJson(h.prepared)))
 assert.deepEqual(h.nextInput(),h.prepared)
 assert.equal(run.result.snapshot.upstream_file_sha256,h.file.sha256)
 assert.ok(run.result.snapshot.contents.some(c=>c.content_markdown==='x'.repeat(270000)))
 assert.equal(run.result.snapshot.contents.some(c=>c.content_markdown===h.original.result.body),false)
 assert.equal(run.result.snapshot.input_history.at(-1).input_sha256,h.prepared.inputHash)
 assert.deepEqual(h.get('long'),before);assert.deepEqual(h.f.run(),h.legacy)
 // A compact record must also survive the actual RPC/client projection and save flow.
 const store=createWorkbenchStore({remote:h.f.remote,saveDelayMs:0});t.after(()=>store.dispose())
 store.syncWorkspaces([{workspaceId:'a'}]);await store.hydrateWorkspace('a')
 assert.deepEqual(store.getWorkspaceState('a').pages.find(p=>p.pageId==='next').v340.runs[run.runId].inputSnapshot,run.inputSnapshot)
 store.activatePage('a','next');await store.flushWorkspace('a')
 const selected={runId:run.runId,versionId:run.runId,resultSha256:run.result.sha256}
 await store.reviewV340Result('a','next',selected,{workspaceId:'a',revision:store.getWorkspaceState('a').revision,...selected})
 await store.prepareV340Save('a','next',selected);store.setV340SaveConfirmation('a','next',true);await store.commitV340Save('a','next')
 assert.equal(h.get('next').resultVersions[0].review.status,'approved')
 assert.equal(h.get('next').resultVersions[0].writebacks[0].files.find(f=>f.mediaType==='text/markdown').sha256,run.result.sha256)
 assert.deepEqual(h.get('next').inputSnapshot,run.inputSnapshot);assert.deepEqual(h.get('long'),before)
 await store.dispose()
 // Existing request identity must not reread the now-missing file or dispatch again.
 await rm(h.file.absolutePath);const calls=h.calls()
 await h.service.createV340Run(h.command('next',{requestKey:'next'}));assert.equal(h.calls(),calls)
 const current=structuredClone(h.f.record()),disk=await readFile(h.f.file)
 await h.service.closeV340Runtime();await h.f.repository.close()
 const reopened=await openOasisWorkbenchRepository(h.f.storageDomain);assert.deepEqual(reopened.get('a'),current)
 await reopened.close();assert.deepEqual(await readFile(h.f.file),disk)
})

test('de-duplicated input still exceeding 2 MiB is rejected before write or dispatch, with no truncation',async t=>{
 const h=await savedLong(t),text='汉'.repeat(230000)
 await h.service.updateV340Draft(h.command('next',{draft:{source:'local-skill',textInputs:{user_input:text},filePaths:{upstream_md_file:h.file.relativePath},configuration:{}}}))
 const before=await readFile(h.f.file),calls=h.calls(),record=structuredClone(h.f.record())
 await assert.rejects(()=>h.service.createV340Run(h.command('next',{requestKey:'still-too-large'})),e=>e.issues?.some(i=>i.message==='V340 snapshot exceeds byte limit'))
 assert.deepEqual(h.f.record(),record);assert.deepEqual(await readFile(h.f.file),before);assert.equal(h.calls(),calls)
 assert.equal(h.f.record().tasks.next.v340.draft.textInputs.user_input,text)
 assert.equal(await readFile(h.file.absolutePath,'utf8'),h.original.result.body)
})

test('upstream file over 1 MiB remains rejected before admission and preserves saved evidence',async t=>{
 const h=await savedLong(t),body=h.original.result.body+'x'.repeat(1024*1024-Buffer.byteLength(h.original.result.body)+1)
 await writeFile(h.file.absolutePath,body)
 const before=await readFile(h.f.file),calls=h.calls(),record=structuredClone(h.f.record())
 await assert.rejects(()=>h.service.createV340Run(h.command('next',{requestKey:'file-too-large'})),e=>e.code==='V340_PREPARATION_FAILED')
 assert.deepEqual(await readFile(h.f.file),before);assert.deepEqual(h.f.record(),record);assert.equal(h.calls(),calls)
 assert.equal(await readFile(h.file.absolutePath,'utf8'),body)
})

test('Workspace 8 MiB cap still blocks compact admission without evicting drafts or approved saves',async t=>{
 const h=await savedLong(t),body='x'.repeat(1024*1024)
 // Fill with separate valid 1 MiB recovery drafts; no artificial oversized field.
 for(let n=0;n<5;n++){
  const id='capacity-'+n
  await h.service.createV340Task(h.command(id,{nodeId:'Flow-1-1',title:id}))
  await h.service.updateV340Draft(h.command(id,{draft:{source:'local-skill',textInputs:{},filePaths:{},configuration:{}}}))
  // The small existing fixture service can generate a valid result for each task.
  await h.f.service.createV340Run(h.command(id,{requestKey:id}));const run=await settled(()=>h.get(id))
  await h.service.saveV340ResultDraft(h.command(id,{runId:run.runId,baseSha256:run.result.sha256,body}))
 }
 const before=await readFile(h.f.file),record=structuredClone(h.f.record()),calls=h.calls()
 assert.ok(bytes(record)<8*1024*1024)
 await assert.rejects(()=>h.service.createV340Run(h.command('next',{requestKey:'record-too-large'})),/workspace data must not exceed/)
 assert.deepEqual(await readFile(h.f.file),before);assert.deepEqual(h.f.record(),record);assert.equal(h.calls(),calls)
 for(let n=0;n<5;n++)assert.equal(h.get('capacity-'+n).resultDraft.body,body)
})

test('compact encoding rejects forged fields, hashes, normalized values and draft/file misbinding',async t=>{
 const h=await savedLong(t);await h.service.createV340Run(h.command('next',{requestKey:'compact-integrity'}));await settled(()=>h.get('next'))
 const good=structuredClone(h.f.record()),runId=h.get('next').runId,disk=await readFile(h.f.file)
 const edits=[
  r=>{r.inputSnapshot.preparedEncoding='unknown-v2'},
  r=>{delete r.inputSnapshot.preparedEncoding},
  r=>{r.inputSnapshot.prepared.receipts=h.prepared.receipts},
  r=>{r.inputSnapshot.prepared.sha256='f'.repeat(64)},
  r=>{r.inputSnapshot.prepared.values.upstream_md_file.body+='changed'},
  r=>{r.inputSnapshot.prepared.values.upstream_md_file.sha256='f'.repeat(64)},
  r=>{r.inputSnapshot.prepared.values.user_input=''},
  r=>{r.inputSnapshot.prepared.values.unexpected='hidden'},
  r=>{r.inputSnapshot.draft.textInputs.user_input='mismatched'},
  r=>{delete r.inputSnapshot.draft.filePaths.upstream_md_file},
 ]
 for(const edit of edits){
  const candidate=structuredClone(good),run=candidate.tasks.next.v340.runs[runId];edit(run)
  // Recomputing the outer hash must not bypass structural or semantic integrity.
  run.inputSha256=hash(canonicalJson(run.inputSnapshot))
  assert.throws(()=>parseWorkbenchRecord('a',candidate))
 }
 const badHash=structuredClone(good);badHash.tasks.next.v340.runs[runId].inputSha256='f'.repeat(64)
 assert.throws(()=>parseWorkbenchRecord('a',badHash),/input integrity mismatch/)
 assert.deepEqual(await readFile(h.f.file),disk);assert.deepEqual(h.f.record(),good)
})

test('compact execution and assembly use frozen material after the project file changes',async t=>{
 let savedFile
 const h=await savedLong(t,'oasis-api',{async next(input){
  await writeFile(savedFile,'当前文件已变化，不能进入冻结运行')
  assert.equal(input.prepared.upstream.status,'accepted')
  // Executor scratch edits must not rewrite the authoritative preparation used by assembly.
  input.prepared.values.upstream_md_file.body='执行器临时修改'
  input.prepared.upstream.snapshot.contents=[]
  return{status:'completed',output:output('冻结输入下游正文')}
 }});savedFile=h.file.absolutePath
 await h.service.createV340Run(h.command('next',{requestKey:'frozen-file'}));const run=await settled(()=>h.get('next'))
 assert.equal(run.result.snapshot.upstream_file_sha256,h.file.sha256)
 assert.equal(h.nextInput().values.upstream_md_file.body,h.original.result.body)
 assert.ok(run.result.snapshot.contents.some(c=>c.content_markdown==='x'.repeat(270000)))
 assert.equal(await readFile(savedFile,'utf8'),'当前文件已变化，不能进入冻结运行')
 const good=structuredClone(h.f.record());await h.service.closeV340Runtime();await h.f.repository.close()
 const reopened=await openOasisWorkbenchRepository(h.f.storageDomain);assert.deepEqual(reopened.get('a'),good);await reopened.close()
})

test('long manually changed upstream retains all warning bytes and still fails an oversized cumulative output',async t=>{
 const h=await savedLong(t),body=h.original.result.body.replace('## 核心结论','## 人工修改核心结论')
 await writeFile(h.file.absolutePath,body)
 await h.service.createV340Run(h.command('next',{requestKey:'manual-warning'}))
 const end=Date.now()+5000
 while(h.get('next').status==='prepared'&&Date.now()<end)await new Promise(r=>setTimeout(r,5))
 const run=h.get('next')
 assert.equal(run.status,'failed');assert.equal(run.failureCode,'INVALID_OUTPUT');assert.equal(run.result,null)
 assert.equal(h.nextInput().upstream.status,'warning');assert.ok(h.nextInput().upstream.issues.includes('manual-edit'))
 assert.equal(h.nextInput().values.upstream_md_file.body,body)
 assert.equal(run.inputSnapshot.prepared.values.upstream_md_file.body,body)
 assert.equal(run.inputSha256,hash(canonicalJson(run.inputSnapshot)))
 assert.equal(await readFile(h.file.absolutePath,'utf8'),body);assert.deepEqual(h.f.run(),h.legacy)
})

for(const status of ['prepared','unknown','failed'])test(`compact ${status} records reopen, observe and reuse request identity without file reads or replay`,async t=>{
 let received
 const h=await savedLong(t,'local-skill',{next(input){received=input;return new Promise(()=>{})}})
 await h.service.createV340Run(h.command('next',{requestKey:'pending-compact'}))
 const end=Date.now()+5000;while(!received&&Date.now()<end)await new Promise(r=>setTimeout(r,5));assert.ok(received)
 const run=structuredClone(h.get('next')),legacy=structuredClone(h.f.run())
 assert.equal(run.status,'prepared');assert.ok(bytes(run.inputSnapshot)<=2*1024*1024)
 await h.service.closeV340Runtime()
 // Model the three persisted lifecycle states with the real validated repository.
 await h.f.repository.mutate('a',h.f.record().revision,record=>{
  const next=structuredClone(record),target=next.tasks.next.v340.runs[run.runId]
  Object.assign(target,run,status==='prepared'?{}:{status,failureCode:status==='unknown'?'INTERRUPTED':'EXECUTION_FAILED',completedAt:'2026-10-23T01:00:00.000Z'})
  return next
 })
 await rm(h.file.absolutePath);const frozen=structuredClone(h.f.record()),disk=await readFile(h.f.file)
 await h.f.repository.close();const repo=await openOasisWorkbenchRepository(h.f.storageDomain);t.after(()=>repo.close())
 assert.deepEqual(repo.get('a'),frozen);assert.deepEqual(await readFile(h.f.file),disk)
 let calls=0
 const service=createWorkbenchService({repository:repo,workspaceRegistry:h.f.workspaceRegistry,v340Executor:{evidenceKind:'synthetic',generate(){calls++;throw Error('must not replay')}}});t.after(()=>service.closeV340Runtime())
 await service.observeV340Run({workspaceId:'a',taskId:'next',runId:run.runId})
 const command=extra=>({workspaceId:'a',taskId:'next',expectedRevision:repo.get('a').revision,...extra})
 await service.createV340Run(command({requestKey:'pending-compact'}))
 const restored=repo.get('a').tasks.next.v340.runs[run.runId]
 assert.equal(restored.status,status==='prepared'?'unknown':status);assert.deepEqual(restored.inputSnapshot,run.inputSnapshot);assert.equal(restored.inputSha256,run.inputSha256)
 assert.deepEqual(repo.get('a').tasks.new.v340.runs[legacy.runId],legacy);assert.equal(calls,0)
})
