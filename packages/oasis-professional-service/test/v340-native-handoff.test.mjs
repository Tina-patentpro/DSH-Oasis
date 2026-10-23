import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile,writeFile,symlink,rm,mkdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {resultFixture} from './v340-result-fixture.mjs'
import {createWorkbenchStore} from '../src/client/workbench-store.js'
import {createConversationDraftBridge} from '../src/client/conversation-draft-bridge.js'
import {openOasisWorkbenchRepository} from '../src/workbench-repository.js'
import {recordToWorkspaceState} from '../src/client/workbench-model.js'
import {PanelPages} from '../src/client/PanelPages.js'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createWorkbenchRemote} from '../src/client/workbench-remote.js'
import {createWorkbenchService} from '../src/workbench-service.js'
import {createWorkspaceMaterialManager} from '../src/workspace-materials.js'
import {formatV340ConversationDraft} from '../src/v340-runtime-contract.js'

const hash=s=>createHash('sha256').update(s).digest('hex')
const target=f=>({runId:f.run().runId,versionId:f.run().runId,resultSha256:f.run().result.sha256})
async function approve(f,c=target(f)){await f.service.reviewV340Result(f.command({...c,confirmed:true}));return c}
async function save(f,c=target(f)){
 const plan=await f.service.prepareV340Save(f.command(c));await f.service.commitV340Save({confirmationToken:plan.confirmationToken})
 return{file:plan.manifest.files.find(x=>x.mediaType==='text/markdown'),saved:f.run().resultVersions.find(v=>v.versionId===c.versionId).writebacks.at(-1)}
}
async function bridgeClient(t,f,remote=f.remote){
 let session='s',input={phase:'plain',draft:'',draftRev:0,occurrences:[],imageIds:[]}
 const bridge=createConversationDraftBridge(()=>({status:'ready',currentSessionId:session,workspaceItems:[{workspaceId:'a',sessionIds:['s']}]}))
 bridge.register({sessionId:'s',workspaceId:'a',read:()=>input,inputActions:{setDraft(text){input={...input,draft:text,draftRev:input.draftRev+1}},submit(){assert.fail('must not send')}}})
 const opened=[],nativeFiles={captureSavedFileTarget:id=>({workspaceId:id}),openSavedFile(_t,file){opened.push(file);return true}}
 const store=createWorkbenchStore({remote,conversationDrafts:bridge,nativeFiles,saveDelayMs:0});t.after(()=>store.dispose())
 store.syncWorkspaces([{workspaceId:'a'}]);await store.hydrateWorkspace('a')
 return{store,opened,input:()=>input,setInput:value=>{input=value},switchSession:()=>{session='other'}}
}

for(const source of ['local-skill','oasis-api'])test(`native handoff ${source}: exact reviewed version RPC draft and saved Markdown are read-only across reopen`,async t=>{
 const f=await resultFixture(t,source),c=await approve(f),{file,saved}=await save(f,c),before=await readFile(f.file)
 assert.equal(typeof f.service.prepareV340ConversationDraft,'function')
 const ref=await f.remote.v340('result/conversation-draft',f.command(c))
 assert.ok(ref.text.endsWith(f.run().result.body));assert.ok(ref.text.includes(c.resultSha256));assert.equal(ref.versionId,c.versionId)
 const open=await f.remote.v340('result/saved-file',f.command({...c,writebackId:saved.writebackId}))
 assert.equal(open.absolutePath,file.absolutePath);assert.equal(open.kind,'current-file');assert.equal(open.matchesReviewed,true)
 assert.equal(open.currentSha256,c.resultSha256);assert.equal(file.relativePath.endsWith('_OIW.md'),source==='oasis-api')
 assert.deepEqual(await readFile(f.file),before)
 const record=structuredClone(f.record());await f.repository.close();const reopened=await openOasisWorkbenchRepository(f.storageDomain)
 assert.deepEqual(reopened.get('a'),record);await reopened.close()
})

test('current file edits do not acquire reviewed status; fixed draft still contains the immutable reviewed body',async t=>{
 const f=await resultFixture(t),c=await approve(f),{file,saved}=await save(f,c),body='用户修改后的当前文件'
 assert.equal(typeof f.service.resolveV340SavedFile,'function')
 await writeFile(file.absolutePath,body)
 const open=await f.service.resolveV340SavedFile(f.command({...c,writebackId:saved.writebackId}))
 assert.equal(open.matchesReviewed,false);assert.equal(open.currentSha256,hash(body));assert.equal(open.kind,'current-file')
 const ref=await f.service.prepareV340ConversationDraft(f.command(c));assert.ok(ref.text.endsWith(f.run().result.body));assert.equal(ref.text.includes(body),false)
})

test('handoffs reject stale, unreviewed, foreign, edited and unresolved selections without changing disk',async t=>{
 const f=await resultFixture(t),c=target(f)
 assert.equal(typeof f.service.prepareV340ConversationDraft,'function')
 await assert.rejects(()=>f.service.prepareV340ConversationDraft(f.command(c)),e=>e.code==='V340_REVIEW_REQUIRED')
 await approve(f,c);const before=await readFile(f.file)
 for(const patch of [{expectedRevision:0},{workspaceId:'b'},{taskId:'foreign'},{versionId:'foreign'},{resultSha256:'f'.repeat(64)}])await assert.rejects(()=>f.service.prepareV340ConversationDraft({...f.command(c),...patch}))
 assert.deepEqual(await readFile(f.file),before)
 await f.service.saveV340ResultDraft(f.command({runId:c.runId,baseSha256:c.resultSha256,body:'未处理旧稿'}))
 await assert.rejects(()=>f.service.prepareV340ConversationDraft(f.command(c)),e=>e.code==='V340_RESULT_LOCKED')
 await f.service.saveV340ResultDraft(f.command({runId:c.runId,baseSha256:c.resultSha256,body:null}))
 await f.repository.mutate('a',f.record().revision,r=>{const next=structuredClone(r),run=next.tasks.new.v340.runs[c.runId];run.status='unknown';run.failureCode='INTERRUPTED';run.result=null;delete run.resultVersions;return next})
 await assert.rejects(()=>f.service.prepareV340ConversationDraft(f.command(c)),e=>e.code==='V340_RESULT_UNAVAILABLE')
})

test('client projects native open and inserts a fixed version once without submit or overwriting composer',async t=>{
 const f=await resultFixture(t),c=await approve(f),{saved}=await save(f,c),h=await bridgeClient(t,f)
 assert.equal(typeof h.store.useV340InConversation,'function')
 await h.store.openV340SavedFile('a','new',c,saved.writebackId);assert.equal(h.opened.length,1)
 await h.store.useV340InConversation('a','new',c);assert.ok(h.input().draft.endsWith(f.run().result.body))
 await assert.rejects(()=>h.store.useV340InConversation('a','new',c));assert.equal(h.opened.length,1)
})

test('reviewed result page exposes fixed draft, current file opening and the existing Markdown export confirmation',async t=>{
 const f=await resultFixture(t),c=await approve(f);await save(f,c)
 const state={...recordToWorkspaceState(f.record()),v340Catalog:f.service.getV340Catalog(),conversationUnavailableReason:null}
 const html=renderToStaticMarkup(createElement(PanelPages,{state,savedFileUnavailableReason:null,v340Actions:{useReference(){},openSaved(){}}}))
 assert.match(html,/使用固定审核版本/);assert.match(html,/打开当前文件/);assert.match(html,/Markdown导出/)
})

test('long reviewed versions refuse inline overflow and expose the entire immutable copy/export fallback',async t=>{
 const f=await resultFixture(t),c=target(f),body='x'.repeat(60000)
 await f.service.saveV340ResultDraft(f.command({runId:c.runId,baseSha256:c.resultSha256,body,format:'core-markdown'}))
 await f.service.editV340Result(f.command({runId:c.runId,versionId:c.versionId,baseSha256:c.resultSha256,draftSha256:hash(body),requestKey:'long-copy'}))
 const v=f.run().resultVersions.at(-1),selection={...c,versionId:v.versionId,resultSha256:v.result.sha256};await approve(f,selection)
 const before=await readFile(f.file)
 await assert.rejects(()=>f.service.prepareV340ConversationDraft(f.command(selection)),e=>e.code==='V340_REFERENCE_TOO_LARGE')
 assert.deepEqual(await readFile(f.file),before)
 const state={...recordToWorkspaceState(f.record()),v340Catalog:f.service.getV340Catalog(),conversationUnavailableReason:null}
 const html=renderToStaticMarkup(createElement(PanelPages,{state,v340Actions:{useReference(){}}}))
 assert.match(html,/固定审核版本全文（可复制）/);assert.match(html,/未截断/);assert.match(html,/readonly/)
 await save(f,selection)
})

test('saved-file resolution refuses a foreign receipt and redirected Markdown without modifying disk',async t=>{
 const f=await resultFixture(t),c=await approve(f),{file,saved}=await save(f,c),disk=await readFile(f.file)
 await assert.rejects(()=>f.service.resolveV340SavedFile(f.command({...c,writebackId:'foreign'})))
 await rm(file.absolutePath);await writeFile(file.absolutePath+'.target','不能打开重定向文件');await symlink(file.absolutePath+'.target',file.absolutePath)
 await assert.rejects(()=>f.service.resolveV340SavedFile(f.command({...c,writebackId:saved.writebackId})))
 assert.deepEqual(await readFile(f.file),disk)
})

for(const scenario of ['session','composer','version-away-back','dirty','disposed'])test(`late fixed reference ${scenario} cannot change composer`,async t=>{
 const f=await resultFixture(t),c=await approve(f)
 let start,release;const started=new Promise(r=>{start=r}),gate=new Promise(r=>{release=r})
 const remote={...f.remote,async v340(...args){const result=await f.remote.v340(...args);start();await gate;return result}}
 const h=await bridgeClient(t,f,remote),pending=h.store.useV340InConversation('a','new',c)
 const rejected=scenario==='disposed'?null:assert.rejects(pending);await started
 if(scenario==='session')h.switchSession()
 if(scenario==='composer')h.setInput({...h.input(),draft:'用户后来输入',draftRev:1})
 if(scenario==='version-away-back')h.store.selectV340Version('a','new',c.runId,c.versionId)
 if(scenario==='dirty'){
  // Save is queued behind the read; its local shadow must already invalidate insertion.
  void h.store.saveV340ResultDraft('a','new',{runId:c.runId,versionId:c.versionId,baseSha256:c.resultSha256},'新编辑').catch(()=>{})
 }
 if(scenario==='disposed'){const disposing=h.store.dispose();release();await disposing;assert.equal(await pending,false);assert.equal(h.input().draft,'');return}
 release();await rejected
 assert.equal(h.input().draft,scenario==='composer'?'用户后来输入':'')
})

test('late native open after a version selection change does not call the native file interface',async t=>{
 const f=await resultFixture(t),c=await approve(f),{saved}=await save(f,c)
 let start,release;const started=new Promise(r=>{start=r}),gate=new Promise(r=>{release=r})
 const remote={...f.remote,async v340(...args){const result=await f.remote.v340(...args);start();await gate;return result}},h=await bridgeClient(t,f,remote)
 const pending=h.store.openV340SavedFile('a','new',c,saved.writebackId),rejected=assert.rejects(pending)
 await started;h.store.selectV340Version('a','new',c.runId,c.versionId);release();await rejected;assert.deepEqual(h.opened,[])
})

test('RPC rejects rebound identity and contradictory current-file review status',async t=>{
 const f=await resultFixture(t),c=await approve(f),{saved}=await save(f,c),command=f.command({...c,writebackId:saved.writebackId})
 for(const mutate of [v=>{v.versionId='foreign'},v=>{v.workspaceId='b'},v=>{v.artifactId='sha256:'+'f'.repeat(64)},v=>{v.matchesReviewed=false}]){
  const remote=createWorkbenchRemote({rpc:{async call(_ch,endpoint,payload){const response=await f.handler(endpoint.replace('oasis-workbench/',''),payload);mutate(response.value);return response}}})
  await assert.rejects(()=>remote.v340('result/saved-file',command))
 }
})

test('Workspace root rebinding during file verification cannot return the previous project path',async t=>{
 const f=await resultFixture(t),c=await approve(f),{file,saved}=await save(f,c)
 const other=f.root+'/other';await mkdir(other);await writeFile(other+'/'+file.relativePath,f.run().result.body)
 let root=f.root
 const registry={get:id=>id==='a'?{path:root,async status(){return'ok'}}:undefined},materials=createWorkspaceMaterialManager({workspaceRegistry:registry})
 const service=createWorkbenchService({repository:f.repository,workspaceRegistry:registry,materialManager:{...materials,async inspect(...args){const ref=await materials.inspect(...args);root=other;return ref}}})
 t.after(()=>service.closeV340Runtime())
 await assert.rejects(()=>service.resolveV340SavedFile(f.command({...c,writebackId:saved.writebackId})))
})

test('fixed draft preserves exactly 150000 characters and rejects one character more without truncation',async t=>{
 const f=await resultFixture(t),c=target(f),n=150000-formatV340ConversationDraft(c,f.run().result.body).length+f.task().draft.textInputs.research_request_text.length
 for(const extra of [0,1]){
  await f.service.updateV340Draft(f.command({draft:{...f.task().draft,textInputs:{research_request_text:'x'.repeat(n+extra)}}}))
  await f.service.createV340Run(f.command({requestKey:'limit-'+extra}))
  const end=Date.now()+5000;while(f.run().status==='prepared'&&Date.now()<end)await new Promise(r=>setTimeout(r,5));assert.equal(f.run().status,'completed')
  const next=await approve(f),expected=formatV340ConversationDraft(next,f.run().result.body);assert.equal(expected.length,150000+extra)
  if(extra)await assert.rejects(()=>f.service.prepareV340ConversationDraft(f.command(next)),e=>e.code==='V340_REFERENCE_TOO_LARGE')
  else assert.equal((await f.service.prepareV340ConversationDraft(f.command(next))).text,expected)
 }
})
