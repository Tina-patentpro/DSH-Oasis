import test from 'node:test'
import assert from 'node:assert/strict'
import {resultFixture} from './v340-result-fixture.mjs'
import {createWorkbenchStore} from '../src/client/workbench-store.js'
import {recordToWorkspaceState} from '../src/client/workbench-model.js'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {PanelPages} from '../src/client/PanelPages.js'

test('client retains v340 projection and loads its catalog without pretending sources are executable',async t=>{
 const h=await resultFixture(t)
 assert.ok(recordToWorkspaceState(h.record()).pages[0].v340,'model must project Host-owned v340 state')
 const store=createWorkbenchStore({remote:h.remote,saveDelayMs:0});t.after(()=>store.dispose())
 store.syncWorkspaces([{workspaceId:'a'}]);await store.hydrateWorkspace('a');await store.loadWorkflowCatalog('a')
 assert.equal(store.getWorkspaceState('a').v340Catalog.nodes.length,14)
 assert.equal(typeof store.saveV340Draft,'function')
 assert.equal(h.calls.some(x=>x.endsWith('run/create')),false)
})

test('PanelPages renders the shared versioned input/result page and unavailable source reason',async t=>{
 const h=await resultFixture(t),state=recordToWorkspaceState(h.record())
 const catalog=h.service.getV340Catalog()
 const html=renderToStaticMarkup(createElement(PanelPages,{state:{...state,catalogStatus:'ready',workflows:[],v340Catalog:catalog}}))
 assert.match(html,/研究请求/)
 assert.match(html,/公开原始正文/)
 assert.match(html,/审核此版本/)
 assert.match(html,/新版原生模型接线及实际验收待完成/)
 assert.doesNotMatch(html,/当前任务引用的工作流版本不在/)
})

test('real RPC/store saves an edit draft, creates a new version, reviews fixed hash, and publishes with confirmation',async t=>{
 const h=await resultFixture(t)
 const store=createWorkbenchStore({remote:h.remote,saveDelayMs:0});t.after(()=>store.dispose())
 store.syncWorkspaces([{workspaceId:'a'}]);await store.hydrateWorkspace('a')
 assert.equal(typeof store.v340Action,'function','client commands must be connected')
 const run=h.run(),target={runId:run.runId,versionId:run.runId,baseSha256:run.result.sha256}
 await store.v340Action('a','new','result/draft',{runId:run.runId,baseSha256:target.baseSha256,body:'客户端修订',format:'core-markdown'})
 await store.editV340Result('a','new',target)
 const edited=h.run().resultVersions.at(-1)
 const selected={runId:run.runId,versionId:edited.versionId,resultSha256:edited.result.sha256}
 await store.reviewV340Result('a','new',selected,{workspaceId:'a',revision:store.getWorkspaceState('a').revision,...selected})
 await store.prepareV340Save('a','new',selected)
 const operation=store.getWorkspaceState('a').pageOperations.new
 assert.ok(operation.v340SavePlan)
 await assert.rejects(()=>store.commitV340Save('a','new'))
 store.setV340SaveConfirmation('a','new',true)
 await store.commitV340Save('a','new')
 assert.equal(h.run().resultVersions.at(-1).writebacks.length,1)
 assert.equal(store.getWorkspaceState('a').pages[0].v340.runs[run.runId].resultVersions.at(-1).review.status,'approved')
})

test('rapid input saves serialize, failure preserves the latest local draft and blocks destructive reload',async t=>{
 const h=await resultFixture(t),store=createWorkbenchStore({remote:h.remote,saveDelayMs:0});t.after(()=>store.dispose())
 store.syncWorkspaces([{workspaceId:'a'}]);await store.hydrateWorkspace('a')
 const base=h.task().draft
 const one=store.saveV340Draft('a','new',{...base,textInputs:{research_request_text:'一'}})
 const two=store.saveV340Draft('a','new',{...base,textInputs:{research_request_text:'一二'}})
 await Promise.all([one,two]);assert.equal(h.task().draft.textInputs.research_request_text,'一二')
 h.failWrites=true
 await assert.rejects(()=>store.saveV340Draft('a','new',{...base,textInputs:{research_request_text:'失败也要保留'}}))
 assert.equal(store.getWorkspaceState('a').pageOperations.new.v340InputDraft.textInputs.research_request_text,'失败也要保留')
 await assert.rejects(()=>store.reloadWorkspace('a'))
 h.failWrites=false
 await store.saveV340Draft('a','new',store.getWorkspaceState('a').pageOperations.new.v340InputDraft)
 assert.equal(h.task().draft.textInputs.research_request_text,'失败也要保留')
})

test('unpersisted local result edit and a switched selected version invalidate review',async t=>{
 const h=await resultFixture(t),store=createWorkbenchStore({remote:h.remote,saveDelayMs:0});t.after(()=>store.dispose())
 store.syncWorkspaces([{workspaceId:'a'}]);await store.hydrateWorkspace('a')
 const run=h.run(),target={runId:run.runId,versionId:run.runId,resultSha256:run.result.sha256}
 h.failWrites=true
 await assert.rejects(()=>store.saveV340ResultDraft('a','new',{runId:target.runId,versionId:target.versionId,baseSha256:target.resultSha256},'未写盘的修订'))
 h.failWrites=false
 const confirmation={workspaceId:'a',revision:store.getWorkspaceState('a').revision,...target}
 await assert.rejects(()=>store.reviewV340Result('a','new',target,confirmation))
 assert.equal(h.run().resultVersions,undefined)
})

test('closing a versioned task hides only its tab and reopening preserves all Host evidence',async t=>{
 const h=await resultFixture(t),store=createWorkbenchStore({remote:h.remote});t.after(()=>store.dispose())
 store.syncWorkspaces([{workspaceId:'a'}]);await store.hydrateWorkspace('a')
 const before=JSON.stringify(h.record())
 store.closePage('a','new')
 assert.equal(store.getWorkspaceState('a').closedV340Tabs.includes('new'),true)
 assert.equal(store.getWorkspaceState('a').pages.length,1)
 assert.equal(JSON.stringify(h.record()),before)
 store.activatePage('a','new')
 assert.equal(store.getWorkspaceState('a').closedV340Tabs.includes('new'),false)
})

test('revision conflict exposes local drafts and explicit discard permits safe reload without changing Host evidence',async t=>{
 const h=await resultFixture(t),store=createWorkbenchStore({remote:h.remote});t.after(()=>store.dispose())
 store.syncWorkspaces([{workspaceId:'a'}]);await store.hydrateWorkspace('a')
 await h.repository.mutate('a',h.record().revision,record=>({...record,panelMode:'normal'}))
 await assert.rejects(()=>store.saveV340Draft('a','new',{...h.task().draft,textInputs:{research_request_text:'冲突保留文本'}}))
 const state=store.getWorkspaceState('a');assert.equal(state.syncStatus,'conflict')
 const html=renderToStaticMarkup(createElement(PanelPages,{state}))
 assert.match(html,/冲突保留文本/)
 assert.match(html,/放弃此新版本地草稿/)
 const before=JSON.stringify(h.record()),op=state.pageOperations.new
 store.discardV340LocalDrafts('a','new',{input:op.v340InputDraft,edits:op.v340Edits})
 await store.reloadWorkspace('a')
 assert.equal(JSON.stringify(h.record()),before)
 assert.equal(store.getWorkspaceState('a').syncStatus,'ready')
})
