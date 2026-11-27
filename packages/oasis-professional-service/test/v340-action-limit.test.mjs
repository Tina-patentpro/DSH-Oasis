import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {resultFixture} from './v340-result-fixture.mjs'
import {recordToWorkspaceState} from '../src/client/workbench-model.js'
import {V340GenerationPage} from '../src/client/V340GenerationPage.js'
import {inspectV340Document} from '../src/v340-document.js'

const notice='本版本不自动删除结构记录或撤回技术事实；正文修改后，相关表格和依据仍需核对。'
const hash=s=>createHash('sha256').update(s).digest('hex')
function withoutCurrentWarning(record,runId){
 const run=record.tasks.new.v340.runs[runId]
 for(const version of run.resultVersions){
  const old=version.result,snapshot=structuredClone(old.snapshot)
  snapshot.warnings=snapshot.warnings.filter(w=>!w.warning_id.startsWith('host-Flow-2-6-m06-limited-'))
  const body=old.body.replace(JSON.stringify(old.snapshot,null,2),JSON.stringify(snapshot,null,2)).replace(JSON.stringify(old.snapshot.warnings,null,2),JSON.stringify(snapshot.warnings,null,2))
  version.result={...old,body,snapshot,sha256:hash(body)};version.review.sha256=hash(body)
  assert.equal(inspectV340Document({filename:old.fileName,body,sha256:hash(body)},'Flow-2-6').status,'accepted')
 }
 run.result=structuredClone(run.resultVersions[0].result)
 return record
}

for(const source of ['local-skill','oasis-api'])for(const scenario of ['approved','historical','edited-long']){
 test(`M06 ${source} ${scenario}: current limitation is beside fixed copy/save actions without rewriting body`,async t=>{
  t.mock.method(globalThis,'fetch',()=>assert.fail('No business network call belongs in this component test'))
  const h=await resultFixture(t,source,{nodeId:'Flow-2-6'}),runId=h.run().runId
  if(scenario==='edited-long'){
   const base=h.run().result.sha256,body='PUBLIC_COPY_'.repeat(14000)
   await h.service.saveV340ResultDraft(h.command({runId,baseSha256:base,body,format:'core-markdown'}))
   await h.service.editV340Result(h.command({runId,versionId:runId,baseSha256:base,draftSha256:hash(body),requestKey:'action-notice-child'}))
  }
  let version=h.run().resultVersions?.at(-1)??{versionId:runId,result:h.run().result}
  await h.service.reviewV340Result(h.command({runId,versionId:version.versionId,resultSha256:version.result.sha256,confirmed:true}))
  let record=structuredClone(h.record())
  if(scenario==='historical')record=withoutCurrentWarning(record,runId)
  const state=recordToWorkspaceState(record),page=state.pages[0],selected=record.tasks.new.v340.runs[runId].resultVersions.at(-1)
  const before=JSON.stringify(record),originalBody=selected.result.body
  const html=renderToStaticMarkup(createElement(V340GenerationPage,{page,state:{...state,syncStatus:'ready',conversationUnavailableReason:null},node:h.service.getV340Catalog().nodes.find(n=>n.nodeId==='Flow-2-6'),operation:{v340Selection:{runId,versionId:selected.versionId}}}))
  const actions=html.split('aria-label="项目回写"')[1]??''
  assert.ok(actions.includes(notice),'Current M06 capability limitation must be inside the copy/save action area; a distant top note or copy-size warning is insufficient')
  if(scenario==='edited-long')assert.ok(actions.indexOf(notice)<actions.indexOf('固定审核版本全文（可复制）'))
  assert.equal(JSON.stringify(record),before);assert.equal(selected.result.body,originalBody)
  if(scenario==='historical')assert.equal(selected.result.body.includes('host-Flow-2-6-m06-limited-'),false)
  assert.equal(h.generationCalls,1)
 })
}

test('non-M06 copy/save actions do not acquire M06-specific policy text',async t=>{
 const h=await resultFixture(t),runId=h.run().runId
 await h.service.reviewV340Result(h.command({runId,versionId:runId,resultSha256:h.run().result.sha256,confirmed:true}))
 const state=recordToWorkspaceState(h.record()),page=state.pages[0]
 const html=renderToStaticMarkup(createElement(V340GenerationPage,{page,state:{...state,syncStatus:'ready',conversationUnavailableReason:null},node:h.service.getV340Catalog().nodes.find(n=>n.nodeId==='Flow-1-1')}))
 assert.equal((html.split('aria-label="项目回写"')[1]??'').includes(notice),false)
})
