import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID,createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {resultFixture} from './v340-result-fixture.mjs'
import {createWorkbenchService} from '../src/workbench-service.js'
import {createWorkbenchStore} from '../src/client/workbench-store.js'
import {openOasisWorkbenchRepository} from '../src/workbench-repository.js'
import {assembleV340Document,inspectV340Document} from '../src/v340-document.js'
import {createElement as h} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {PanelPages} from '../src/client/PanelPages.js'
const hash=s=>createHash('sha256').update(s).digest('hex')
const target=f=>({runId:f.run().runId,versionId:f.run().runId,resultSha256:f.run().result.sha256})
const editCommand=(f,c,body,key)=>f.command({runId:c.runId,versionId:c.versionId,baseSha256:c.resultSha256,draftSha256:hash(body),requestKey:key})
async function client(t,f,remote=f.remote){const store=createWorkbenchStore({remote,saveDelayMs:0});t.after(()=>store.dispose());store.syncWorkspaces([{workspaceId:'a'}]);await store.hydrateWorkspace('a');return store}
const output={summary:'公开合成结论',core_result_markdown:'下游正文',updates:[],tables:{},terms_master:[],warnings:[],model_completions:[]}

for(const source of ['local-skill','oasis-api'])test(`P2-E ${source}: saved 817KB upstream remains accepted and passes adjacent handoff without a whole-file copy`,async t=>{
 const f=await resultFixture(t),service=createWorkbenchService({repository:f.repository,workspaceRegistry:f.workspaceRegistry,v340Executor:{evidenceKind:'synthetic',generate:async()=>({status:'completed',output:{...output,core_result_markdown:'x'.repeat(270000)}})}});t.after(()=>service.closeV340Runtime())
 const command=extra=>({workspaceId:'a',taskId:'long',expectedRevision:f.record().revision,...extra})
 await service.createV340Task(command({nodeId:'Flow-1-1',title:'公开长稿'}));await service.updateV340Draft(command({draft:{source,textInputs:{research_request_text:'公开输入'},filePaths:{},configuration:{}}}));await service.createV340Run(command({requestKey:'long'}))
 const run=()=>{const s=f.record().tasks.long.v340;return s.runs[s.activeRunId]}
 const end=Date.now()+5000;while(run().status==='prepared'&&Date.now()<end)await new Promise(r=>setTimeout(r,5));assert.equal(run().status,'completed')
 const r=run(),original=structuredClone(r.result),c={runId:r.runId,versionId:r.runId,resultSha256:r.result.sha256}
 await service.reviewV340Result(command({...c,confirmed:true}));const plan=await service.prepareV340Save(command(c));await service.commitV340Save({confirmationToken:plan.confirmationToken})
 const file=plan.manifest.files.find(x=>x.mediaType==='text/markdown');assert.equal(await readFile(file.absolutePath,'utf8'),original.body)
 const {prepared}=await service.prepareV340({workspaceId:'a',nodeId:'Flow-1-2',confirmed:true,filePaths:{upstream_md_file:file.relativePath},textInputs:{},configuration:{}})
 assert.equal(prepared.upstream.status,'accepted');assert.deepEqual(prepared.upstream.issues,[])
 const next=assembleV340Document({nodeId:'Flow-1-2',workflowRunUid:randomUUID(),generatedAt:new Date().toISOString(),prepared,output})
 assert.ok(Buffer.byteLength(next.body)<350000)
 assert.equal(next.snapshot.contents.some(x=>x.content_markdown===original.body),false)
 assert.deepEqual(run().result,original);assert.equal(file.sha256,original.sha256)
})

test('P2-E only the exact canonical filename and one uppercase _OIW suffix are accepted',async t=>{
 const f=await resultFixture(t),r=f.run().result,file={filename:r.fileName,body:r.body,sha256:r.sha256}
 assert.equal(inspectV340Document({...file,filename:r.fileName.replace(/\.md$/,'_OIW.md')},'Flow-1-1').status,'accepted')
 for(const filename of ['renamed.md',r.fileName.replace(/\.md$/,'_OIW_OIW.md'),r.fileName.replace(/\.md$/,'_oiw.md')])assert.ok(inspectV340Document({...file,filename},'Flow-1-1').issues.includes('identity'))
 assert.throws(()=>inspectV340Document({...file,body:r.body+'changed'},'Flow-1-1'))
})

test('P2-C untagged whole-document draft is recovery-only; explicit core edit preserves it and original evidence across reopen',async t=>{
 const f=await resultFixture(t),c=target(f),legacy=f.run().result.body+'\n旧整稿追加',original=structuredClone(f.run().result)
 await f.service.saveV340ResultDraft(f.command({runId:c.runId,baseSha256:c.resultSha256,body:legacy}))
 const oldDraft=structuredClone(f.run().resultDraft),before=JSON.stringify(f.record())
 await assert.rejects(()=>f.service.editV340Result(editCommand(f,c,legacy,'legacy')),e=>e.code==='V340_DRAFT_FORMAT_REQUIRED')
 assert.equal(JSON.stringify(f.record()),before)
 const store=await client(t,f);await store.loadWorkflowCatalog('a')
 const html=renderToStaticMarkup(h(PanelPages,{state:store.getWorkspaceState('a')}));assert.match(html,/旧草稿格式未确认/);assert.match(html,/旧整稿追加/);assert.match(html,/readonly/)
 await store.saveV340ResultDraft('a','new',{runId:c.runId,versionId:c.versionId,baseSha256:c.resultSha256},'明确的新核心正文')
 await store.editV340Result('a','new',{runId:c.runId,versionId:c.versionId,baseSha256:c.resultSha256})
 const v=f.run().resultVersions.at(-1);assert.equal(v.result.snapshot.current_result.core_result_markdown,'明确的新核心正文');assert.equal(v.review.status,'not-reviewed')
 assert.deepEqual(f.run().resultDraft,oldDraft);assert.deepEqual(f.run().result,original)
 await f.service.reviewV340Result(f.command({runId:c.runId,versionId:v.versionId,resultSha256:v.result.sha256,confirmed:true}))
 await store.dispose();const record=structuredClone(f.record());await f.repository.close();const reopened=await openOasisWorkbenchRepository(f.storageDomain);assert.deepEqual(reopened.get('a'),record);await reopened.close()
})

test('P2-C old per-version drafts are never overwritten or discarded by explicit new-core draft operations',async t=>{
 const f=await resultFixture(t),c=target(f),legacy='未标格式的旧版本草稿'
 await f.repository.mutate('a',f.record().revision,record=>{const next=structuredClone(record),run=next.tasks.new.v340.runs[c.runId];run.resultDrafts={[c.versionId]:{baseSha256:c.resultSha256,body:legacy,updatedAt:run.completedAt}};return next})
 const original=structuredClone(f.run().resultDrafts)
 for(const body of ['新核心',null])await f.service.saveV340ResultDraft(f.command({runId:c.runId,baseSha256:c.resultSha256,body,format:'core-markdown'}))
 assert.deepEqual(f.run().resultDrafts,original)
 await assert.rejects(()=>f.service.editV340Result(editCommand(f,c,legacy,'legacy')),e=>e.code==='V340_DRAFT_FORMAT_REQUIRED')
})

test('P2-C a valid core draft cannot hide a corrupted legacy draft base for the same version',async t=>{
 const f=await resultFixture(t),c=target(f)
 await f.service.saveV340ResultDraft(f.command({runId:c.runId,baseSha256:c.resultSha256,body:'核心草稿',format:'core-markdown'}))
 const before=JSON.stringify(f.record())
 await assert.rejects(()=>f.repository.mutate('a',f.record().revision,record=>{
   const next=structuredClone(record),run=next.tasks.new.v340.runs[c.runId]
   run.resultDrafts={[c.versionId]:{baseSha256:'f'.repeat(64),body:'损坏的旧基准',updatedAt:run.completedAt}}
   return next
 }))
 assert.equal(JSON.stringify(f.record()),before)
})

test('P2-B 310000-character core draft publishes within 1MiB; oversized final candidate keeps draft and original',async t=>{
 const f=await resultFixture(t),c=target(f),body='x'.repeat(310000),original=structuredClone(f.run().result)
 await f.service.saveV340ResultDraft(f.command({runId:c.runId,baseSha256:c.resultSha256,body,format:'core-markdown'}))
 await f.service.editV340Result(editCommand(f,c,body,'large'))
 const v=f.run().resultVersions.at(-1);assert.equal(v.result.snapshot.current_result.core_result_markdown,body);assert.ok(Buffer.byteLength(v.result.body)<1024*1024)
 assert.deepEqual(f.run().result,original)
 const tooLarge='x'.repeat(360000)
 await f.service.saveV340ResultDraft(f.command({runId:c.runId,baseSha256:v.result.sha256,body:tooLarge,format:'core-markdown'}));const before=JSON.stringify(f.record())
 await assert.rejects(()=>f.service.editV340Result(editCommand(f,{...c,versionId:v.versionId,resultSha256:v.result.sha256},tooLarge,'overflow')))
 assert.equal(JSON.stringify(f.record()),before)
})

test('P2-B new human drafts enforce UTF-8 bytes and NUL safety without loosening model output limits',async t=>{
 const f=await resultFixture(t),c=target(f)
 for(const body of ['中'.repeat(350000),'contains\0NUL'])await assert.rejects(()=>f.service.saveV340ResultDraft(f.command({runId:c.runId,baseSha256:c.resultSha256,body,format:'core-markdown'})))
 assert.throws(()=>assembleV340Document({nodeId:'Flow-1-1',workflowRunUid:randomUUID(),generatedAt:new Date().toISOString(),prepared:f.run().inputSnapshot.prepared,output:{...output,core_result_markdown:'x'.repeat(310000)}}))
})

test('P2-A empty Workspace creates and activates the first V340 task without a chooser; errors are visible and retryable',async t=>{
 const f=await resultFixture(t);await f.repository.mutate('a',f.record().revision,r=>({...r,tasks:{},taskOrder:[],activeTaskId:null}))
 const store=await client(t,f);await store.loadWorkflowCatalog('a');f.failWrites=true
 await assert.rejects(()=>store.createV340Task('a','Flow-1-1'))
 const state=store.getWorkspaceState('a');assert.ok(state.v340CreateError)
 assert.match(renderToStaticMarkup(h(PanelPages,{state,showFunctionCenter:true,v340Actions:{create:()=>{}}})),/新版任务创建未完成/)
 f.failWrites=false;await store.createV340Task('a','Flow-1-1')
 assert.equal(f.record().taskOrder.length,1);assert.equal(store.getWorkspaceState('a').activePageId,f.record().taskOrder[0]);assert.equal(store.getWorkspaceState('a').v340CreateError,null)
 assert.equal(f.record().tasks[f.record().taskOrder[0]].v340.draft.source,'local-skill')
})

test('P2-D transient V340 catalog failure is visible, leaves legacy catalog and local drafts intact, and retries successfully',async t=>{
 const f=await resultFixture(t);let attempts=0
 const remote={...f.remote,async getV340Catalog(...args){if(++attempts===1)throw Error('synthetic transient');return f.remote.getV340Catalog(...args)}}
 const store=await client(t,f,remote);await store.loadWorkflowCatalog('a')
 const before=JSON.stringify(f.task().draft),state=store.getWorkspaceState('a');assert.equal(state.catalogStatus,'ready');assert.ok(state.workflows.length);assert.equal(state.v340CatalogStatus,'error')
 assert.match(renderToStaticMarkup(h(PanelPages,{state,v340Actions:{retryCatalog:()=>{}}})),/重试新版目录/)
 await store.loadWorkflowCatalog('a');assert.equal(store.getWorkspaceState('a').v340Catalog.nodes.length,14);assert.equal(store.getWorkspaceState('a').v340CatalogStatus,'ready')
 assert.equal(JSON.stringify(f.task().draft),before);assert.equal(f.calls.some(x=>x.endsWith('run/create')),false)
})
