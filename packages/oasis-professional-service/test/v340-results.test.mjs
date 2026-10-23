import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {resultFixture} from './v340-result-fixture.mjs'
import {openOasisWorkbenchRepository} from '../src/workbench-repository.js'
const hash=v=>createHash('sha256').update(v).digest('hex')

for(const source of ['local-skill','oasis-api'])test(`${source}: persisted edit creates immutable pending version, explicit review and no-overwrite root save survive reopen`,async t=>{
 const h=await resultFixture(t,source),original=structuredClone(h.run()),runId=h.run().runId,baseSha256=h.run().result.sha256
 assert.equal(typeof h.service.editV340Result,'function','version editing must be connected')
 await h.service.saveV340ResultDraft(h.command({runId,baseSha256,body:'人工修订正文\n 保留空白 ',format:'core-markdown'}))
 await h.service.editV340Result(h.command({runId,versionId:runId,baseSha256,draftSha256:hash('人工修订正文\n 保留空白 '),requestKey:'edit-one'}))
 assert.deepEqual(h.run().result,original.result)
 const version=h.run().resultVersions.at(-1),versionId=version.versionId,resultSha256=version.result.sha256
 assert.equal(version.parentVersionId,runId);assert.equal(version.review.status,'not-reviewed')
 assert.equal(version.result.snapshot.current_result.core_result_markdown,'人工修订正文\n 保留空白 ')
 assert.ok(version.result.snapshot.manual_edit_manifest.length)
 assert.equal(h.run().resultDraft,null)
 const target={runId,versionId,resultSha256}
 await assert.rejects(()=>h.service.prepareV340Save(h.command(target)))
 await assert.rejects(()=>h.service.reviewV340Result(h.command({...target,confirmed:false})))
 await h.service.reviewV340Result(h.command({...target,confirmed:true}))
 const plan=await h.service.prepareV340Save(h.command(target))
 assert.equal(plan.manifest.relativeDirectory,'.')
 const main=plan.manifest.files.find(f=>f.mediaType==='text/markdown')
 if(source==='oasis-api')assert.match(main.relativePath,/_OIW\.md$/)
 const committed=await h.service.commitV340Save({confirmationToken:plan.confirmationToken})
 assert.equal(committed.committed,true)
 assert.equal(await readFile(join(h.root,main.relativePath),'utf8'),version.result.body)
 await assert.rejects(()=>h.service.commitV340Save({confirmationToken:plan.confirmationToken}))
 await assert.rejects(()=>h.service.prepareV340Save(h.command(target)))
 const state=structuredClone(h.record());await h.repository.close()
 const reopened=await openOasisWorkbenchRepository(h.storageDomain);assert.deepEqual(reopened.get('a'),state);await reopened.close()
})

test('stale edits/reviews, pending drafts and stale save confirmations cannot approve or publish another version',async t=>{
 const h=await resultFixture(t),runId=h.run().runId,baseSha256=h.run().result.sha256
 assert.equal(typeof h.service.reviewV340Result,'function')
 const target={runId,versionId:runId,resultSha256:baseSha256}
 await h.service.saveV340ResultDraft(h.command({runId,baseSha256,body:'待保存修订',format:'core-markdown'}))
 await assert.rejects(()=>h.service.reviewV340Result(h.command({...target,confirmed:true})))
 await assert.rejects(()=>h.service.editV340Result(h.command({runId,versionId:runId,baseSha256,draftSha256:'a'.repeat(64),requestKey:'edit'})))
 await h.service.saveV340ResultDraft(h.command({runId,baseSha256,body:null,format:'core-markdown'}))
 await h.service.reviewV340Result(h.command({...target,confirmed:true}))
 const plan=await h.service.prepareV340Save(h.command(target))
 await h.service.saveV340ResultDraft(h.command({runId,baseSha256,body:'新编辑使确认失效',format:'core-markdown'}))
 const result=await h.service.commitV340Save({confirmationToken:plan.confirmationToken})
 assert.equal(result.committed,false)
 await assert.rejects(()=>readFile(join(h.root,plan.manifest.files[0].relativePath)))
 const before=JSON.stringify(h.record())
 const response=await h.handler('workflow/v340/result/review',h.command({...target,confirmed:true,resultSha256:'b'.repeat(64)}))
 assert.equal(response.ok,false);assert.equal(JSON.stringify(h.record()),before)
})

test('existing file is never overwritten and RPC does not expose a generation route',async t=>{
 const h=await resultFixture(t)
 assert.equal(typeof h.service.prepareV340Save,'function')
 const target={runId:h.run().runId,versionId:h.run().runId,resultSha256:h.run().result.sha256}
 await h.service.reviewV340Result(h.command({...target,confirmed:true}))
 await writeFile(join(h.root,h.run().result.fileName),'已有用户文件')
 await assert.rejects(()=>h.service.prepareV340Save(h.command(target)))
 assert.equal(await readFile(join(h.root,h.run().result.fileName),'utf8'),'已有用户文件')
 assert.equal((await h.handler('workflow/v340/run/create',{})).ok,false)
})

test('published files survive an index write failure and RPC returns a recovery manifest',async t=>{
 const h=await resultFixture(t),target={runId:h.run().runId,versionId:h.run().runId,resultSha256:h.run().result.sha256}
 await h.service.reviewV340Result(h.command({...target,confirmed:true}))
 const plan=await h.service.prepareV340Save(h.command(target));h.failWrites=true
 const response=await h.handler('workflow/v340/result/commit-save',{confirmationToken:plan.confirmationToken})
 assert.equal(response.ok,false);assert.equal(response.error.code,'WRITEBACK_COMMITTED_INDEX_FAILED')
 const main=response.error.details.manifest.files.find(f=>f.mediaType==='text/markdown')
 assert.equal(await readFile(join(h.root,main.relativePath),'utf8'),h.run().result.body)
 assert.equal(h.run().resultVersions[0].writebacks.length,0)
 assert.equal(JSON.stringify(response).includes(h.root),false)
 h.failWrites=false
})

test('each version keeps its own persisted draft; editing one does not clear another',async t=>{
 const h=await resultFixture(t),runId=h.run().runId,originalSha=h.run().result.sha256
 await h.service.saveV340ResultDraft(h.command({runId,baseSha256:originalSha,body:'修订一',format:'core-markdown'}))
 await h.service.editV340Result(h.command({runId,versionId:runId,baseSha256:originalSha,draftSha256:hash('修订一'),requestKey:'first'}))
 const second=h.run().resultVersions[1]
 await h.service.saveV340ResultDraft(h.command({runId,baseSha256:originalSha,body:'原版本未提交草稿',format:'core-markdown'}))
 await h.service.saveV340ResultDraft(h.command({runId,baseSha256:second.result.sha256,body:'第二版本未提交草稿',format:'core-markdown'}))
 assert.equal(h.run().coreResultDrafts[runId].body,'原版本未提交草稿')
 assert.equal(h.run().coreResultDrafts[second.versionId].body,'第二版本未提交草稿')
 await h.service.editV340Result(h.command({runId,versionId:second.versionId,baseSha256:second.result.sha256,draftSha256:hash('第二版本未提交草稿'),requestKey:'second'}))
 assert.equal(h.run().coreResultDrafts[runId].body,'原版本未提交草稿')
})

test('candidate count config accepts a positive integer and rejects invalid values',async t=>{
 const h=await resultFixture(t)
 await h.service.createV340Task({workspaceId:'a',taskId:'search',expectedRevision:h.record().revision,nodeId:'Flow-1-3',title:'检索'})
 for(const max_fetch of [0,-1,1.5,'5'])await assert.rejects(()=>h.service.updateV340Draft({workspaceId:'a',taskId:'search',expectedRevision:h.record().revision,
   draft:{source:'local-skill',textInputs:{},filePaths:{},configuration:{max_fetch}}}))
 await h.service.updateV340Draft({workspaceId:'a',taskId:'search',expectedRevision:h.record().revision,
   draft:{source:'local-skill',textInputs:{},filePaths:{},configuration:{max_fetch:5}}})
 assert.equal(h.record().tasks.search.v340.draft.configuration.max_fetch,5)
})

test('millisecond admission time remains compatible with the seconds-only business filename',async t=>{
 const h=await resultFixture(t,'local-skill',{clock:()=> '2026-10-22T01:00:00.123Z'})
 assert.equal(h.run().status,'completed')
 assert.equal(h.run().createdAt,'2026-10-22T01:00:00.123Z')
 assert.equal(h.run().result.snapshot.generated_at,'2026-10-22T09:00:00+08:00')
})
