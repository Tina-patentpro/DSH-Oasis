import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rename, rm, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { openOasisWorkbenchRepository } from '../src/workbench-repository.js'
import { parseStoredWorkbenchRecord, computeOasisRemoteInputSha256 } from '../src/workbench-domain.js'
import { createWorkspaceMaterialManager } from '../src/workspace-materials.js'
import { createV340PreparationService } from '../src/v340-preparation.js'
import { createWorkspaceOperationGuard } from '../src/workspace-operation-guard.js'
import { createWorkbenchService } from '../src/workbench-service.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { hasPendingUnifiedRun } from '../src/generation-contract.js'
import { v340DraftSchema, v340Commands, v340RunSchema } from '../src/v340-runtime-contract.js'
import { assembleV340Document, inspectV340Document, prepareV340Inputs } from '../src/v340-document.js'
import { createLegacyRecord, createStoredV2Record, createV3Record, recordToEditableDraft, NOW } from './workbench-fixtures.mjs'
import { fixtureHarness } from './unified-generation-harness.mjs'

const api = await import('../src/v340-runtime-service.js').catch(() => ({}))
const output = { summary:'公开合成结论', core_result_markdown:'公开合成正文', updates:[], tables:{}, terms_master:[], warnings:[], model_completions:[] }
const completed = () => ({ status:'completed', output:structuredClone(output) })
const draft = (text='公开输入', source='local-skill') => ({source,textInputs:{research_request_text:text},filePaths:{},configuration:{}})
const tick = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve; const promise=new Promise(r=>{resolve=r}); return {promise,resolve} }
const hash = text => createHash('sha256').update(text).digest('hex')

async function diskFixture(t) {
  const root=await realpath(await mkdtemp(join(tmpdir(),'v340-runtime-')))
  const file=join(root,'records.json'); await writeFile(file,'{}')
  const fixture={root,file,failWrites:false,puts:0}
  fixture.storageDomain={async open(){
    let records=JSON.parse(await readFile(file,'utf8')),writes=Promise.resolve()
    return {table(){return {get:id=>structuredClone(records[id]),put(id,value){
      // Match the fixed DSH domain's shared write queue across Workspace keys.
      const job=writes.then(async()=>{
        if(fixture.failWrites) throw Error('synthetic storage unavailable')
        const next={...records,[id]:value};await writeFile(file+'.tmp',JSON.stringify(next));await rename(file+'.tmp',file);records=next;fixture.puts++;fixture.afterPut?.(id,value)
      })
      writes=job.catch(()=>{});return job
    }}},async close(){await writes}}
  }}
  fixture.seed=async records=>writeFile(file,JSON.stringify(records))
  t.after(()=>rm(root,{recursive:true,force:true}))
  return fixture
}
function runtime(repository, executor={evidenceKind:'synthetic',generate:async()=>completed()}, extra={}) {
  assert.equal(typeof api.createV340RuntimeService,'function','V3.4.0 durable runtime must exist')
  return api.createV340RuntimeService({repository,preparation:createV340PreparationService(),executor,clock:()=>NOW,...extra})
}
async function setup(t, executor, extra={}) {
  const disk=await diskFixture(t), repository=await openOasisWorkbenchRepository(disk.storageDomain,{clock:()=>NOW})
  const service=runtime(repository,executor,extra)
  t.after(async()=>{await service.closeV340Runtime();await repository.close()})
  const command=(extra={})=>({workspaceId:'a',taskId:'new',expectedRevision:repository.get('a').revision,...extra})
  await service.createV340Task(command({nodeId:'Flow-1-1',title:'新版任务'}))
  await service.updateV340Draft(command({draft:draft()}))
  const state=()=>repository.get('a'), task=()=>state().tasks.new.v340
  const run=()=>task().runs[task().activeRunId]
  return {disk,repository,service,command,state,task,run}
}
async function settled(h) { for(let n=0;n<40&&h.run().status==='prepared';n++)await tick();return h.run() }

test('v1–v4 reads do not write, relabel, rehash or alter existing run/review/writeback evidence',async t=>{
  const d=await diskFixture(t)
  const unrelated=createV3Record('a');unrelated.schemaVersion=4;unrelated.tasks['task-a'].generation=null;unrelated.tasks['task-a'].workflowVersion='V3.4.0'
  for(const original of [createLegacyRecord('a'),createStoredV2Record('a',1,{withEvidence:true}),createV3Record('a',1,{withEvidence:true}),parseStoredWorkbenchRecord('a',createV3Record('a',1,{withEvidence:true})),unrelated]) {
    await d.seed({a:original});const bytes=await readFile(d.file,'utf8'),repo=await openOasisWorkbenchRepository(d.storageDomain)
    const current=repo.get('a');assert.deepEqual(current,parseStoredWorkbenchRecord('a',original))
    assert.equal(Object.hasOwn(current.tasks['task-a'],'v340'),false)
    assert.equal(await readFile(d.file,'utf8'),bytes);assert.equal(d.puts,0);await repo.close()
  }
})

test('new draft has one source, rejects invalid channels and survives real disk repository reopen',async t=>{
  const h=await setup(t)
  assert.equal(h.task().schemaVersion,1);assert.equal(h.task().draft.source,'local-skill')
  for(const value of [{...draft(),textInputs:{research_request_file:'fake'}},{...draft(),configuration:{user_input:'fake'}},{...draft(),secret:'forbidden'}])
    await assert.rejects(()=>h.service.updateV340Draft(h.command({draft:value})))
  await h.service.updateV340Draft(h.command({draft:draft('精确逐字\n新材料','oasis-api')}))
  const snapshot=h.state();await h.repository.close();const reopened=await openOasisWorkbenchRepository(h.disk.storageDomain)
  assert.deepEqual(reopened.get('a'),snapshot);assert.equal(reopened.get('b').taskOrder.length,0);await reopened.close()
})

test('writing a new v340 task retains approved legacy artifacts and writeback receipts through migration and reopen',async t=>{
  const d=await diskFixture(t)
  for(const source of [createStoredV2Record('a',1,{withEvidence:true}),createV3Record('a',1,{withEvidence:true}),parseStoredWorkbenchRecord('a',createV3Record('a',1,{withEvidence:true}))]){
    const original=structuredClone(source)
    const run=original.tasks['task-a'].runs['run-a']
    run.review={status:'approved',note:'旧人工审核',updatedAt:NOW}
    run.writebacks=[{writebackId:'old-save',artifactId:run.result.artifact.artifactId,relativeDirectory:'.',
      files:[{relativePath:'历史产物.md',sha256:run.result.artifact.sha256,mediaType:'text/markdown'},{relativePath:'receipt.json',sha256:'c'.repeat(64),mediaType:'application/json'}],reviewStatus:'approved',committedAt:NOW}]
    await d.seed({a:original});const repo=await openOasisWorkbenchRepository(d.storageDomain),before=repo.get('a').tasks['task-a'],service=runtime(repo)
    await service.createV340Task({workspaceId:'a',taskId:'new',expectedRevision:repo.get('a').revision,nodeId:'Flow-1-1',title:'新版'})
    assert.deepEqual(repo.get('a').tasks['task-a'],before)
    await service.closeV340Runtime();await repo.close();const reopened=await openOasisWorkbenchRepository(d.storageDomain)
    assert.deepEqual(reopened.get('a').tasks['task-a'],before);await reopened.close()
  }
})

test('synthetic admission is durable before dispatch, completed document and result edit draft survive reopen',async t=>{
  let h,calls=0
  h=await setup(t,{evidenceKind:'synthetic',async generate(input){calls++;const durable=JSON.parse(await readFile(h.disk.file,'utf8'));assert.equal(durable.a.tasks.new.v340.runs[input.runId].status,'prepared');return completed()}})
  const command=h.command({requestKey:'request-a'});await h.service.createV340Run(command)
  const run=await settled(h);assert.equal(run.status,'completed');assert.equal(run.evidenceKind,'synthetic');assert.equal(run.result.sha256,hash(run.result.body))
  assert.match(run.result.body,/公开合成正文/);assert.equal(run.reviewStatus,'not-reviewed')
  await h.service.createV340Run({...command,expectedRevision:h.state().revision});assert.equal(calls,1)
  await h.service.saveV340ResultDraft(h.command({runId:run.runId,baseSha256:run.result.sha256,body:'人工逐字草稿\n未审核'}))
  const current=h.state();await h.repository.close();const repo=await openOasisWorkbenchRepository(h.disk.storageDomain)
  assert.deepEqual(repo.get('a'),current);assert.equal(repo.get('a').tasks.new.v340.runs[run.runId].resultDraft.body,'人工逐字草稿\n未审核');await repo.close()
})

test('old editable drafts cannot forge or erase Host-owned v340 evidence; stale writes conflict',async t=>{
  const h=await setup(t);await h.service.createV340Run(h.command({requestKey:'one'}));await settled(h)
  await h.service.saveV340ResultDraft(h.command({runId:h.run().runId,baseSha256:h.run().result.sha256,body:'旧客户端必须保留的编辑草稿'}))
  const original=h.task(),editable=recordToEditableDraft(h.state());editable.schemaVersion=4
  for(const task of Object.values(editable.tasks))task.generation=null
  const result=await h.repository.replaceEditable('a',h.state().revision,editable);assert.equal(result.committed,true);assert.deepEqual(h.task(),original)
  await assert.rejects(()=>h.repository.replaceEditable('a',h.state().revision,{...editable,activeTaskId:null,taskOrder:[],tasks:{}}),/V340/)
  editable.tasks.new.v340={...structuredClone(original),runs:{}}
  await assert.rejects(()=>h.repository.replaceEditable('a',h.state().revision,editable))
  const revision=h.state().revision
  const results=await Promise.all([h.service.updateV340Draft(h.command({expectedRevision:revision,draft:draft('A')})),h.service.updateV340Draft(h.command({expectedRevision:revision,draft:draft('B')}))])
  assert.equal(results.filter(r=>r.committed).length,1);assert.equal(results.filter(r=>r.reason==='revision-conflict').length,1)
})

test('concurrent run admissions dispatch at most once and stale discard cannot erase a newer result draft',async t=>{
  let calls=0;const h=await setup(t,{evidenceKind:'synthetic',generate(){calls++;return completed()}})
  const revision=h.state().revision
  const attempts=await Promise.allSettled([h.service.createV340Run(h.command({expectedRevision:revision,requestKey:'one'})),h.service.createV340Run(h.command({expectedRevision:revision,requestKey:'two'}))])
  assert.equal(attempts.filter(r=>r.status==='fulfilled'&&r.value.committed).length,1)
  await settled(h);assert.equal(calls,1);assert.equal(h.task().runOrder.length,1)
  const selection={runId:h.run().runId,baseSha256:h.run().result.sha256}
  await h.service.saveV340ResultDraft(h.command({...selection,body:'A'}));const stale=h.state().revision
  await h.service.saveV340ResultDraft(h.command({...selection,body:'B'}))
  assert.equal((await h.service.saveV340ResultDraft(h.command({...selection,expectedRevision:stale,body:null}))).reason,'revision-conflict')
  assert.equal(h.run().resultDraft.body,'B')
  await h.service.saveV340ResultDraft(h.command({...selection,body:null}));assert.equal(h.run().resultDraft,null);assert.equal(h.run().reviewStatus,'not-reviewed')
})

test('snapshot, artifact and scope corruption are rejected without recomputing trusted hashes',async t=>{
  const h=await setup(t);await h.service.createV340Run(h.command({requestKey:'one'}));const run=await settled(h)
  for(const mutate of [r=>{r.tasks.new.v340.runs[run.runId].inputSnapshot.draft.textInputs.research_request_text='tampered'},r=>{r.tasks.new.v340.runs[run.runId].result.body+='drift'},r=>{r.tasks.new.v340.runs[run.runId].workspaceId='other'},r=>{r.tasks.new.workflowId='Flow-2-6'},r=>{r.tasks.new.v340.runs[run.runId].requestKey='changed-request'}]){
    const bad=structuredClone(h.state());mutate(bad);assert.throws(()=>parseStoredWorkbenchRecord('a',bad))
  }
  await assert.rejects(()=>h.service.saveV340ResultDraft(h.command({runId:run.runId,baseSha256:'f'.repeat(64),body:'wrong base'})))
})

test('reopened prepared run becomes unknown without dispatch and remains locked; late success is ignored',async t=>{
  const pending=deferred();let calls=0
  const h=await setup(t,{evidenceKind:'synthetic',generate(){calls++;return pending.promise}})
  await h.service.createV340Run(h.command({requestKey:'one'}));await tick();const id=h.run().runId
  const crashImage=JSON.parse(await readFile(h.disk.file,'utf8'))
  await h.service.stopV340Run(h.command({runId:id}));pending.resolve(completed());await tick();await tick()
  assert.equal(h.run().status,'unknown');assert.equal(h.run().result,null);assert.equal(calls,1);assert.equal(hasPendingUnifiedRun(h.state().tasks.new),true)
  await h.service.closeV340Runtime();await h.repository.close()
  // Restore only this synthetic crash image after closing the old owner; never two writers.
  await h.disk.seed(crashImage)
  const reopened=await openOasisWorkbenchRepository(h.disk.storageDomain)
  const observed=runtime(reopened,{evidenceKind:'synthetic',generate(){assert.fail('must not replay')}})
  await observed.observeV340Run({workspaceId:'a',taskId:'new',runId:id});assert.equal(reopened.get('a').tasks.new.v340.runs[id].status,'unknown')
  await assert.rejects(()=>observed.createV340Run({workspaceId:'a',taskId:'new',expectedRevision:reopened.get('a').revision,requestKey:'two'}),/未决/)
  await observed.closeV340Runtime();await reopened.close()
})

test('byte limits reject multibyte drafts without truncation and a known completed invalid document is failed',async t=>{
  const oversized={source:'local-skill',textInputs:{a:'汉'.repeat(300000),b:'汉'.repeat(300000),c:'汉'.repeat(300000)},filePaths:{},configuration:{}}
  assert.equal(v340DraftSchema.safeParse(oversized).success,false)
  const h=await setup(t,{evidenceKind:'synthetic',generate:async()=>({status:'completed',output:{}})})
  await h.service.createV340Run(h.command({requestKey:'bad-output'}));const run=await settled(h)
  assert.equal(run.status,'failed');assert.equal(run.failureCode,'INVALID_OUTPUT');assert.equal(run.result,null)
})

test('request keys cannot be rebound to another task or changed input, and drafts are locked while unresolved',async t=>{
  const h=await setup(t);await h.service.createV340Run(h.command({requestKey:'one'}));await settled(h)
  await h.service.updateV340Draft(h.command({draft:draft('new input')}))
  await assert.rejects(()=>h.service.createV340Run(h.command({requestKey:'one'})),/标识/)
  await h.service.createV340Task(h.command({taskId:'other',nodeId:'Flow-1-1',title:'other'}))
  await assert.rejects(()=>h.service.createV340Run(h.command({taskId:'other',requestKey:'one'})),/标识/)
  const pending=await setup(t,{evidenceKind:'synthetic',generate:()=>new Promise(()=>{})})
  await pending.service.createV340Run(pending.command({requestKey:'pending'}))
  await assert.rejects(()=>pending.service.updateV340Draft(pending.command({draft:draft('changed','oasis-api')})),/未决/)
})

test('same run ID in different Workspaces cannot share stop, result or source; synthetic API never claims real execution',async t=>{
  const d=await diskFixture(t),repo=await openOasisWorkbenchRepository(d.storageDomain)
  const waits={a:deferred(),b:deferred()},service=runtime(repo,{evidenceKind:'synthetic',generate:({workspaceId})=>waits[workspaceId].promise},{uuidFactory:()=> 'de20b1a0-dcca-461e-91b1-0f5555555555'})
  t.after(async()=>{await service.closeV340Runtime();await repo.close()})
  const cmd=(workspaceId,extra={})=>({workspaceId,taskId:'new',expectedRevision:repo.get(workspaceId).revision,...extra})
  for(const id of ['a','b']){
    await service.createV340Task(cmd(id,{nodeId:'Flow-1-1',title:id}))
    await service.updateV340Draft(cmd(id,{draft:draft('scope-'+id,id==='a'?'local-skill':'oasis-api')}))
    await service.createV340Run(cmd(id,{requestKey:'same-key'}))
  }
  await tick();const runId=repo.get('a').tasks.new.v340.activeRunId
  await service.stopV340Run(cmd('a',{runId}));assert.equal(repo.get('b').tasks.new.v340.runs[runId].status,'prepared')
  waits.a.resolve(completed());waits.b.resolve(completed())
  for(let n=0;n<40&&repo.get('b').tasks.new.v340.runs[runId].status==='prepared';n++)await tick()
  const b=repo.get('b').tasks.new.v340.runs[runId];assert.equal(b.status,'completed');assert.equal(b.source,'oasis-api');assert.equal(b.evidenceKind,'synthetic')
  assert.match(b.result.body,/scope-b/);assert.doesNotMatch(b.result.body,/scope-a/);assert.equal(repo.get('a').tasks.new.v340.runs[runId].result,null)
  await service.createV340Task(cmd('b',{taskId:'second',nodeId:'Flow-1-1',title:'second'}))
  await assert.rejects(()=>service.createV340Run(cmd('b',{taskId:'second',requestKey:'another-key'})),/标识冲突/)
})

test('stop, close and transport rejection stay unknown and never wait for an abort-ignoring executor',async t=>{
  for(const behavior of ['stop','close','reject']){
    const h=await setup(t,{evidenceKind:'synthetic',generate:()=>behavior==='reject'?Promise.reject(Error('secret backend diagnostic')):new Promise(()=>{})})
    await h.service.createV340Run(h.command({requestKey:'one'}));await tick()
    if(behavior==='stop')await h.service.stopV340Run(h.command({runId:h.run().runId}))
    if(behavior==='close')await h.service.closeV340Runtime()
    await settled(h);assert.equal(h.run().status,'unknown');assert.equal(h.run().result,null);assert.ok(!JSON.stringify(h.run()).includes('secret backend'))
  }
})

test('failed admission never dispatches, failed publication stays unresolved until observation',async t=>{
  let calls=0;const pending=deferred();const h=await setup(t,{evidenceKind:'synthetic',generate(){calls++;return pending.promise}})
  h.disk.failWrites=true;await assert.rejects(()=>h.service.createV340Run(h.command({requestKey:'one'})));assert.equal(calls,0)
  h.disk.failWrites=false;await h.service.createV340Run(h.command({requestKey:'one'}));await tick();h.disk.failWrites=true;pending.resolve(completed());await tick();await tick()
  h.disk.failWrites=false;assert.equal(h.run().status,'prepared');assert.equal(calls,1)
  await h.service.observeV340Run({workspaceId:'a',taskId:'new',runId:h.run().runId});assert.equal(h.run().status,'unknown')
})

test('closing immediately after durable admission prevents a queued executor dispatch',async t=>{
  let calls=0
  const h=await setup(t,{evidenceKind:'synthetic',generate(){calls++;return completed()}})
  await h.service.createV340Run(h.command({requestKey:'closing'}))
  await h.service.closeV340Runtime()
  assert.equal(calls,0);assert.equal(h.run().status,'unknown');assert.equal(h.run().result,null)
})

test('legacy and v340 unresolved runs block each other without modifying legacy evidence',async t=>{
  const old=await fixtureHarness({localGeneration:{enabled:true,evidenceKind:'native-offline',resolveContext:()=>({sessionId:'session-a',route:{provider:'offline',model:'text'}}),instruction:{version:'public',body:'public'},adapter:{generate:()=>new Promise(()=>{})}}})
  t.after(()=>old.repository.close())
  const service=runtime(old.repository,{evidenceKind:'synthetic',generate:()=>new Promise(()=>{})})
  t.after(()=>service.closeV340Runtime())
  await service.createV340Task({workspaceId:'workspace-a',taskId:'new',nodeId:'Flow-1-1',title:'new',expectedRevision:old.state().revision})
  await service.createV340Run({workspaceId:'workspace-a',taskId:'new',expectedRevision:old.state().revision,requestKey:'new-one'})
  await assert.rejects(()=>old.service.createLocalRun(old.command({sessionId:'session-a'})),/未决/)
  const saved=structuredClone(old.state().tasks['task-a']);assert.equal(saved.generation.inputSchemaVersion,'1')
  const editable=old.draft();editable.taskOrder=editable.taskOrder.filter(id=>id!=='new');delete editable.tasks.new
  await assert.rejects(()=>old.repository.replaceEditable('workspace-a',old.state().revision,editable),/unresolved/)
  await service.closeV340Runtime();assert.deepEqual(old.state().tasks['task-a'],saved)
  const reverse=await fixtureHarness({localGeneration:{enabled:true,evidenceKind:'native-offline',resolveContext:()=>({sessionId:'session-a',route:{provider:'offline',model:'text'}}),instruction:{version:'public',body:'public'},adapter:{generate:()=>new Promise(()=>{})}}})
  t.after(()=>reverse.repository.close());const newer=runtime(reverse.repository);t.after(()=>newer.closeV340Runtime())
  await newer.createV340Task({workspaceId:'workspace-a',taskId:'new',nodeId:'Flow-1-1',title:'new',expectedRevision:reverse.state().revision})
  await reverse.service.createLocalRun(reverse.command({sessionId:'session-a'}))
  await assert.rejects(()=>newer.createV340Run({workspaceId:'workspace-a',taskId:'new',expectedRevision:reverse.state().revision,requestKey:'new-one'}),/未决/)
})

test('production executor remains disabled and strict Host RPC exposes drafts/observation only',async t=>{
  const d=await diskFixture(t),repo=await openOasisWorkbenchRepository(d.storageDomain);t.after(()=>repo.close())
  const service=createWorkbenchService({repository:repo,materialManager:{confirm(){},refresh(){},recheckAll(){}}})
  const handler=createWorkbenchRpcHandler(service)
  const created=await handler('workflow/v340/task/create',{workspaceId:'a',taskId:'new',expectedRevision:0,nodeId:'Flow-1-1',title:'新版'})
  assert.equal(created.ok,true);assert.equal(created.value.committed,true)
  const saved=await handler('workflow/v340/task/draft',{workspaceId:'a',taskId:'new',expectedRevision:repo.get('a').revision,draft:draft()})
  assert.equal(saved.ok,true)
  await assert.rejects(()=>service.createV340Run({workspaceId:'a',taskId:'new',expectedRevision:repo.get('a').revision,requestKey:'no-real-call'}),/未启用/)
  const unsafe=runtime(repo,{evidenceKind:'native-model',generate(){assert.fail('real executor must remain disabled')}})
  await assert.rejects(()=>unsafe.createV340Run({workspaceId:'a',taskId:'new',expectedRevision:repo.get('a').revision,requestKey:'not-native'}),/未启用/)
  await unsafe.closeV340Runtime()
  assert.equal((await handler('workflow/v340/run/create',{workspaceId:'a'})).ok,false)
  for(const patch of [{expectedRevision:-1},{nodeId:'unknown'},{jwt:'must-not-echo'}]){
    const response=await handler('workflow/v340/task/create',{workspaceId:'a',taskId:'other',expectedRevision:repo.get('a').revision,nodeId:'Flow-1-1',title:'new',...patch})
    assert.equal(response.ok,false);assert.ok(!JSON.stringify(response).includes('must-not-echo'))
  }
  assert.equal(service.getV340Catalog().nodes.every(n=>!n.sources['local-skill'].enabled&&!n.sources['oasis-api'].enabled),true)
})

test('explicit project file bytes are frozen before execution and later file changes cannot rewrite the run',async t=>{
  const d=await diskFixture(t),repo=await openOasisWorkbenchRepository(d.storageDomain),pending=deferred()
  const materials=createWorkspaceMaterialManager({workspaceRegistry:{get:id=>id==='a'?{path:d.root,async status(){return 'ok'}}:undefined}})
  const service=runtime(repo,{evidenceKind:'synthetic',generate:()=>pending.promise},{preparation:createV340PreparationService({materialManager:materials})})
  t.after(async()=>{await service.closeV340Runtime();await repo.close()})
  await writeFile(join(d.root,'material.md'),'实际传入原文')
  await service.createV340Task({workspaceId:'a',taskId:'new',expectedRevision:0,nodeId:'Flow-1-1',title:'文件输入'})
  await service.updateV340Draft({workspaceId:'a',taskId:'new',expectedRevision:repo.get('a').revision,draft:{...draft(),filePaths:{research_request_file:'material.md'}}})
  await service.createV340Run({workspaceId:'a',taskId:'new',expectedRevision:repo.get('a').revision,requestKey:'file-request'})
  await writeFile(join(d.root,'material.md'),'已被外部修改')
  pending.resolve(completed());const task=()=>repo.get('a').tasks.new.v340
  for(let n=0;n<40&&task().runs[task().activeRunId].status==='prepared';n++)await tick()
  const run=task().runs[task().activeRunId]
  assert.equal(run.status,'completed');assert.equal(run.inputSnapshot.prepared.values.research_request_file.body,'实际传入原文')
  assert.equal(run.inputSnapshot.prepared.receipts.research_request_file.sha256,hash('实际传入原文'))
  assert.match(run.result.body,/实际传入原文/);assert.doesNotMatch(run.result.body,/已被外部修改/)
})

test('an old unresolved API execution blocks v340 and retains its original request and input hash',async t=>{
  const h=await setup(t)
  const old=parseStoredWorkbenchRecord('a',createV3Record('a')).tasks['task-a']
  const provider={apiBaseOrigin:'https://oasis-staging.example',apiId:132,apiEndpoint:'claims-v1',apiProcess:'整理,撰写',folderId:8,price:3}
  const formValues={User_input:'公开合成旧输入'}
  const execution={executionId:'old-api',requestKey:'old-unknown',status:'wait-stopped',inputSha:computeOasisRemoteInputSha256({providerSnapshot:provider,formValues,inputRefs:[]}),formValues,
    apiBaseOrigin:provider.apiBaseOrigin,serviceSnapshot:{apiId:132,apiEndpoint:'claims-v1',apiProcess:'整理,撰写',schemaHash:'b'.repeat(64)},
    folderSnapshot:{folderId:8,folderName:'测试项目'},priceSnapshot:{price:3,balance:20},materialSnapshots:[],uploadedFiles:[],
    safeError:{code:'WAIT_STOPPED',message:'本地等待已停止'},createdAt:NOW,updatedAt:NOW,submittedAt:NOW,completedAt:null}
  await h.repository.mutate('a',h.state().revision,current=>{const next=structuredClone(current);next.tasks['task-a']={...old,remoteExecutionOrder:['old-api'],remoteExecutions:{'old-api':execution}};next.taskOrder.push('task-a');return next})
  const prior=structuredClone(h.state().tasks['task-a'])
  await assert.rejects(()=>h.service.createV340Run(h.command({requestKey:'must-not-dispatch'})),/未决/)
  assert.deepEqual(h.state().tasks['task-a'],prior)
})

test('concurrent observations during durable admission keep the live run owned and retain its completed result',async t=>{
  let calls=0,observations
  const h=await setup(t,{evidenceKind:'synthetic',generate(){calls++;return completed()}})
  h.disk.afterPut=(workspaceId,value)=>{
    const state=value.tasks.new.v340,runId=state.activeRunId
    if(!observations&&runId&&state.runs[runId].status==='prepared')
      observations=Promise.all(Array.from({length:3},()=>h.service.observeV340Run({workspaceId,taskId:'new',runId})))
  }
  await h.service.createV340Run(h.command({requestKey:'observed-during-commit'}))
  assert.ok(observations);await observations
  const run=await settled(h)
  assert.equal(calls,1);assert.equal(run.status,'completed');assert.equal(run.failureCode,null)
  assert.match(run.result.body,/公开合成正文/);assert.equal(run.reviewStatus,'not-reviewed')
  const current=h.state();await h.service.closeV340Runtime();await h.repository.close()
  const reopened=await openOasisWorkbenchRepository(h.disk.storageDomain)
  assert.deepEqual(reopened.get('a'),current);await reopened.close()
})

test('close drains an in-flight admission before returning and prevents its executor dispatch',async t=>{
  const preparing=deferred(),release=deferred();let calls=0
  const preparation=createV340PreparationService()
  const h=await setup(t,{evidenceKind:'synthetic',generate(){calls++;return completed()}},{preparation:{async prepareV340(input){preparing.resolve();await release.promise;return preparation.prepareV340(input)}}})
  const admission=h.service.createV340Run(h.command({requestKey:'closing-during-prepare'}));await preparing.promise
  let closeFinished=false;const closing=h.service.closeV340Runtime().then(()=>{closeFinished=true})
  await tick();const returnedBeforeAdmission=closeFinished
  release.resolve();await admission;await closing;await settled(h)
  assert.equal(returnedBeforeAdmission,false);assert.equal(calls,0)
  assert.equal(h.run().status,'unknown');assert.equal(h.run().failureCode,'ABORTED');assert.equal(h.run().result,null)
})

test('ambiguous admission write failure releases ownership so observation recovers without dispatch or replay',async t=>{
  let calls=0
  const h=await setup(t,{evidenceKind:'synthetic',generate(){calls++;return completed()}})
  h.disk.afterPut=()=>{throw Error('synthetic failure after durable write')}
  await assert.rejects(()=>h.service.createV340Run(h.command({requestKey:'ambiguous-write'})),/after durable write/)
  h.disk.afterPut=null
  assert.equal(h.run().status,'prepared');assert.equal(calls,0)
  await h.service.observeV340Run({workspaceId:'a',taskId:'new',runId:h.run().runId})
  assert.equal(h.run().status,'unknown');assert.equal(h.run().failureCode,'INTERRUPTED')
  await assert.rejects(()=>h.service.createV340Run(h.command({requestKey:'no-replay'})),/未决/)
  assert.equal(calls,0)
})

test('long cumulative documents persist, reopen and feed the next node without losing manually edited upstream bytes',async t=>{
  const h=await setup(t)
  await h.service.updateV340Draft(h.command({draft:draft('x'.repeat(299000))}))
  await h.service.createV340Run(h.command({requestKey:'long-document'}));const run=await settled(h)
  assert.equal(run.status,'completed');assert.ok(run.result.body.length>300000)
  assert.ok(Buffer.byteLength(run.result.body)<1024*1024);assert.equal(run.result.sha256,hash(run.result.body))
  assert.equal(inspectV340Document({filename:run.result.fileName,body:run.result.body,sha256:run.result.sha256},'Flow-1-1').status,'accepted')
  const materials=createWorkspaceMaterialManager({workspaceRegistry:{get:id=>id==='a'?{path:h.disk.root,async status(){return 'ok'}}:undefined}})
  const prepare=createV340PreparationService({materialManager:materials})
  const path=join(h.disk.root,run.result.fileName)
  await writeFile(path,run.result.body)
  const command={workspaceId:'a',nodeId:'Flow-1-2',confirmed:true,filePaths:{upstream_md_file:run.result.fileName}}
  const prepared=await prepare.prepareV340(command)
  assert.equal(prepared.prepared.upstream.status,'accepted');assert.equal(prepared.prepared.values.upstream_md_file.body,run.result.body)
  const next=assembleV340Document({nodeId:'Flow-1-2',workflowRunUid:'de20b1a0-dcca-461e-91b1-0f5555555555',generatedAt:NOW,prepared:prepared.prepared,output})
  assert.equal(next.snapshot.upstream_file_sha256,run.result.sha256)
  assert.equal(next.snapshot.contents.find(item=>item.source_input_id==='research_request_text').content_markdown,'x'.repeat(299000))
  const edited=run.result.body.replace('## 核心结论','## 人工修改的核心结论')
  await writeFile(path,edited);const changed=await prepare.prepareV340(command)
  assert.equal(changed.prepared.upstream.status,'warning')
  const continued=assembleV340Document({nodeId:'Flow-1-2',workflowRunUid:'de20b1a0-dcca-461e-91b1-0f6666666666',generatedAt:NOW,prepared:changed.prepared,output})
  assert.equal(continued.snapshot.contents.find(item=>item.content_id.startsWith('host/upstream/')).content_markdown,edited)
  assert.equal(continued.snapshot.manual_edit_manifest.at(-1).source_hash,hash(edited))
  await h.service.closeV340Runtime()
  const downstream=runtime(h.repository,undefined,{preparation:prepare})
  try{
    for(const [taskId,body]of [['next-original',run.result.body],['next-edited',edited]]){
      await writeFile(path,body)
      const cmd=extra=>({workspaceId:'a',taskId,expectedRevision:h.state().revision,...extra})
      await downstream.createV340Task(cmd({nodeId:'Flow-1-2',title:taskId}))
      await downstream.updateV340Draft(cmd({draft:{source:'local-skill',textInputs:{},filePaths:{upstream_md_file:run.result.fileName},configuration:{}}}))
      await downstream.createV340Run(cmd({requestKey:taskId}))
      const nextRun=()=>{const state=h.state().tasks[taskId].v340;return state.runs[state.activeRunId]}
      for(let n=0;n<40&&nextRun().status==='prepared';n++)await tick()
      assert.equal(nextRun().status,'completed');assert.equal(nextRun().result.snapshot.upstream_file_sha256,hash(body))
      assert.equal(nextRun().inputSnapshot.prepared.values.upstream_md_file.body,body)
      if(taskId==='next-edited')assert.equal(nextRun().result.snapshot.contents.find(item=>item.content_id.startsWith('host/upstream/')).content_markdown,edited)
    }
  }finally{await downstream.closeV340Runtime()}
  assert.deepEqual(h.run(),run)
  const current=h.state();await h.service.closeV340Runtime();await h.repository.close()
  const reopened=await openOasisWorkbenchRepository(h.disk.storageDomain)
  assert.deepEqual(reopened.get('a'),current);await reopened.close()
})

test('exactly 1 MiB UTF-8 cumulative output persists and one byte more fails explicitly without altering the prior result',async t=>{
  const cap=1024*1024,uid='de20b1a0-dcca-461e-91b1-0f5555555555'
  const assemble=(text,core)=>assembleV340Document({nodeId:'Flow-1-1',workflowRunUid:uid,generatedAt:NOW,prepared:prepareV340Inputs('Flow-1-1',{research_request_text:text}),output:{...output,core_result_markdown:core}})
  const initialText='x'.repeat(299000),base=assemble(initialText,'汉')
  // The core occurs three times; each extra Han character adds nine UTF-8 bytes.
  const remaining=cap-Buffer.byteLength(base.body),core='汉'.repeat(1+Math.floor(remaining/9)),text=initialText+'x'.repeat(remaining%9)
  const exact=assemble(text,core);assert.equal(Buffer.byteLength(exact.body),cap)
  assert.equal(inspectV340Document({filename:exact.fileName,body:exact.body,sha256:exact.sha256},'Flow-1-1').status,'accepted')
  assert.throws(()=>assemble(text+'x',core),/V340_INVALID_DOCUMENT/)
  const h=await setup(t,{evidenceKind:'synthetic',generate:async()=>({status:'completed',output:{...output,core_result_markdown:core}})})
  await h.service.updateV340Draft(h.command({draft:draft(text)}))
  await h.service.createV340Run(h.command({requestKey:'exact-limit'}));const first=await settled(h)
  assert.equal(first.status,'completed');assert.equal(Buffer.byteLength(first.result.body),cap)
  await h.service.saveV340ResultDraft(h.command({runId:first.runId,baseSha256:first.result.sha256,body:first.result.body}))
  assert.equal(h.run().resultDraft.body,first.result.body)
  const saved=structuredClone(h.run())
  await h.service.updateV340Draft(h.command({draft:draft(text+'x')}))
  await h.service.createV340Run(h.command({requestKey:'one-byte-too-large'}));const second=await settled(h)
  assert.equal(second.status,'failed');assert.equal(second.failureCode,'INVALID_OUTPUT');assert.equal(second.result,null)
  assert.deepEqual(h.task().runs[first.runId],saved);assert.equal(hasPendingUnifiedRun(h.state().tasks.new),false)
  const current=h.state();await h.service.closeV340Runtime();await h.repository.close()
  const reopened=await openOasisWorkbenchRepository(h.disk.storageDomain)
  assert.deepEqual(reopened.get('a'),current);await reopened.close()
})

test('long result edit drafts save through strict RPC, reopen and retain hash and stale-discard protection',async t=>{
  const h=await setup(t)
  await h.service.updateV340Draft(h.command({draft:draft('x'.repeat(110000))}))
  await h.service.createV340Run(h.command({requestKey:'long-edit'}));const run=await settled(h)
  assert.equal(run.status,'completed');assert.ok(run.result.body.length>100000)
  const original=structuredClone(run.result),rpc=createWorkbenchRpcHandler(h.service),stale=h.state().revision
  const base={runId:run.runId,baseSha256:run.result.sha256}
  const saved=await rpc('workflow/v340/result/draft',h.command({...base,body:run.result.body}))
  assert.equal(saved.ok,true);assert.equal(saved.value.committed,true)
  const edited=run.result.body+'\n人工追加，尚未审核。'
  const updated=await rpc('workflow/v340/result/draft',h.command({...base,body:edited}))
  assert.equal(updated.ok,true);assert.equal(updated.value.committed,true)
  const staleDiscard=await rpc('workflow/v340/result/draft',h.command({...base,expectedRevision:stale,body:null}))
  assert.equal(staleDiscard.value.committed,false);assert.equal(staleDiscard.value.reason,'revision-conflict')
  const wrongBase=await rpc('workflow/v340/result/draft',h.command({...base,baseSha256:'f'.repeat(64),body:null}))
  assert.equal(wrongBase.ok,false);assert.equal(h.run().resultDraft.body,edited)
  assert.deepEqual(h.run().result,original);assert.equal(h.run().reviewStatus,'not-reviewed')
  const current=h.state();await h.service.closeV340Runtime();await h.repository.close()
  const repo=await openOasisWorkbenchRepository(h.disk.storageDomain),service=runtime(repo)
  t.after(async()=>{await service.closeV340Runtime();await repo.close()})
  assert.deepEqual(repo.get('a'),current)
  await service.saveV340ResultDraft({workspaceId:'a',taskId:'new',runId:run.runId,expectedRevision:repo.get('a').revision,baseSha256:original.sha256,body:null})
  const restored=repo.get('a').tasks.new.v340.runs[run.runId]
  assert.equal(restored.resultDraft,null);assert.deepEqual(restored.result,original);assert.equal(restored.reviewStatus,'not-reviewed')
})

test('document and edit schemas enforce the same UTF-8 limit while ordinary material limits remain unchanged',async t=>{
  const cap=1024*1024,within='汉'.repeat(Math.floor(cap/3))+'x',above=within+'y'
  assert.equal(Buffer.byteLength(within),cap);assert.equal(Buffer.byteLength(above),cap+1)
  const h=await setup(t);await h.service.createV340Run(h.command({requestKey:'byte-contract'}));const run=await settled(h)
  const command=body=>h.command({runId:run.runId,baseSha256:run.result.sha256,body})
  assert.equal(v340Commands['result/draft'].safeParse(command(within)).success,true)
  assert.equal(v340Commands['result/draft'].safeParse(command(above)).success,false)
  assert.equal(v340RunSchema.safeParse({...run,result:{...run.result,body:above}}).success,false)
  await h.service.saveV340ResultDraft(command(within))
  assert.equal(h.run().resultDraft.body,within);const current=h.state()
  await assert.rejects(()=>h.service.saveV340ResultDraft(command(above)),/无效/)
  assert.deepEqual(h.state(),current)
  const ordinary='x'.repeat(300001)
  assert.throws(()=>prepareV340Inputs('Flow-1-1',{research_request_file:{filename:'普通材料.md',body:ordinary,sha256:hash(ordinary)}}))
})

test('larger edit drafts still obey the 8 MiB record cap without truncating or evicting saved evidence',async t=>{
  const h=await setup(t),body='x'.repeat(1024*1024)
  for(let n=0;n<8;n++){
    await h.service.createV340Run(h.command({requestKey:'capacity-'+n}));const run=await settled(h)
    assert.equal(run.status,'completed')
    const command=h.command({runId:run.runId,baseSha256:run.result.sha256,body})
    if(n<7)await h.service.saveV340ResultDraft(command)
    else{
      const before=h.state();await assert.rejects(()=>h.service.saveV340ResultDraft(command),/workspace data must not exceed/)
      assert.deepEqual(h.state(),before)
    }
  }
  const state=h.task();assert.equal(state.runOrder.length,8)
  for(const id of state.runOrder.slice(0,7))assert.equal(state.runs[id].resultDraft.body,body)
  const before=h.state();await assert.rejects(()=>h.service.createV340Run(h.command({requestKey:'ninth'})),/上限/)
  assert.deepEqual(h.state(),before)
})

test('close aborts already active work while it drains another Workspace admission',async t=>{
  const preparing=deferred(),release=deferred();let signal,calls=0
  const preparation=createV340PreparationService()
  const h=await setup(t,{evidenceKind:'synthetic',generate(input){calls++;signal=input.signal;return new Promise(()=>{})}},{preparation:{async prepareV340(input){if(input.workspaceId==='b'){preparing.resolve();await release.promise}return preparation.prepareV340(input)}}})
  await h.service.createV340Run(h.command({requestKey:'active-a'}));await tick();assert.ok(signal)
  const command=extra=>({workspaceId:'b',taskId:'new',expectedRevision:h.repository.get('b').revision,...extra})
  await h.service.createV340Task(command({nodeId:'Flow-1-1',title:'second workspace'}))
  const admitted=h.service.createV340Run(command({requestKey:'closing-b'}));await preparing.promise
  const closing=h.service.closeV340Runtime();await tick();const abortedBeforeAdmission=signal.aborted
  release.resolve();await admitted;await closing
  assert.equal(abortedBeforeAdmission,true);assert.equal(calls,1)
  assert.equal(h.run().status,'unknown');const b=h.repository.get('b').tasks.new.v340
  assert.equal(b.runs[b.activeRunId].status,'unknown');assert.equal(b.runs[b.activeRunId].result,null)
})

test('a stop committed before the admission continuation resumes prevents the queued dispatch',async t=>{
  const durable=deferred(),resume=deferred(),guard=createWorkspaceOperationGuard();let calls=0
  const workspaceOperations={...guard,async run(workspaceId,operation){const result=await guard.run(workspaceId,operation);durable.resolve();await resume.promise;return result}}
  const h=await setup(t,{evidenceKind:'synthetic',generate(){calls++;return completed()}},{workspaceOperations})
  const admitted=h.service.createV340Run(h.command({requestKey:'stop-before-owner'}));await durable.promise
  await h.service.stopV340Run(h.command({runId:h.run().runId}))
  assert.equal(h.run().status,'unknown');assert.equal(calls,0)
  resume.resolve();await admitted;await tick();await tick()
  assert.equal(calls,0);assert.equal(h.run().failureCode,'ABORTED');assert.equal(h.run().result,null)
})

test('approved legacy evidence survives the full new lifecycle including stop, late response and reopen',async t=>{
  const disk=await diskFixture(t)
  for(const source of [createStoredV2Record('a',1,{withEvidence:true}),createV3Record('a',1,{withEvidence:true}),parseStoredWorkbenchRecord('a',createV3Record('a',1,{withEvidence:true}))]){
    const original=structuredClone(source),oldRun=original.tasks['task-a'].runs['run-a']
    oldRun.review={status:'approved',note:'保留逐字审核结论',updatedAt:NOW}
    oldRun.writebacks=[{writebackId:'legacy-saved',artifactId:oldRun.result.artifact.artifactId,relativeDirectory:'.',files:[{relativePath:'旧版.md',sha256:oldRun.result.artifact.sha256,mediaType:'text/markdown'},{relativePath:'旧回执.json',sha256:'a'.repeat(64),mediaType:'application/json'}],reviewStatus:'approved',committedAt:NOW}]
    await disk.seed({a:original});const repo=await openOasisWorkbenchRepository(disk.storageDomain),expected=repo.get('a').tasks['task-a'],pending=deferred()
    let calls=0;const service=runtime(repo,{evidenceKind:'synthetic',generate:()=>++calls===1?completed():pending.promise})
    const command=extra=>({workspaceId:'a',taskId:'new',expectedRevision:repo.get('a').revision,...extra})
    const check=()=>assert.deepEqual(repo.get('a').tasks['task-a'],expected)
    const run=()=>{const state=repo.get('a').tasks.new.v340;return state.runs[state.activeRunId]}
    await service.createV340Task(command({nodeId:'Flow-1-1',title:'混合新版'}));check()
    await service.updateV340Draft(command({draft:draft('x'.repeat(299000))}));check()
    await service.createV340Run(command({requestKey:'completed'}))
    for(let n=0;n<40&&run().status==='prepared';n++)await tick()
    assert.equal(run().status,'completed');check()
    await service.saveV340ResultDraft(command({runId:run().runId,baseSha256:run().result.sha256,body:run().result.body+'\n独立新版人工编辑'}));check()
    await service.createV340Run(command({requestKey:'unresolved'}));await tick();check()
    await service.stopV340Run(command({runId:run().runId}));pending.resolve(completed());await tick();await tick();check()
    assert.equal(run().status,'unknown');assert.equal(run().result,null)
    const snapshot=repo.get('a');await service.closeV340Runtime();await repo.close()
    const reopened=await openOasisWorkbenchRepository(disk.storageDomain);assert.deepEqual(reopened.get('a'),snapshot);assert.deepEqual(reopened.get('a').tasks['task-a'],expected);await reopened.close()
  }
})
