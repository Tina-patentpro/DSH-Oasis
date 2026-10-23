import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rename, rm, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { openOasisWorkbenchRepository } from '../src/workbench-repository.js'
import { createV340RuntimeService } from '../src/v340-runtime-service.js'
import { createV340PreparationService } from '../src/v340-preparation.js'
import { createWorkspaceMaterialManager } from '../src/workspace-materials.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { hasPendingUnifiedRun } from '../src/generation-contract.js'
import { inspectV340Document, prepareV340Inputs } from '../src/v340-document.js'
import { v340Commands, v340RunSchema } from '../src/v340-runtime-contract.js'
import { NOW } from './workbench-fixtures.mjs'

const emptySha256='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
const hash=body=>createHash('sha256').update(body).digest('hex')
const runFor=record=>record.tasks.new.v340.runs[record.tasks.new.v340.activeRunId]
const fixtureBytes=status=>readFile(new URL(`./fixtures/v340-pre-p2-empty-upstream/${status}.json`,import.meta.url),'utf8')

// Real repository over temporary JSON storage; writes use the fixed DSH domain's shared queue.
async function diskFixture(t,bytes='{}') {
  const root=await realpath(await mkdtemp(join(tmpdir(),'v340-legacy-upstream-'))),file=join(root,'records.json')
  await writeFile(file,bytes)
  const disk={root,file,puts:0,storageDomain:{async open(){
    let records=JSON.parse(await readFile(file,'utf8')),writes=Promise.resolve()
    return {table(){return {get:id=>structuredClone(records[id]),put(id,value){
      const pending=writes.then(async()=>{
        const next={...records,[id]:value}
        await writeFile(file+'.tmp',JSON.stringify(next));await rename(file+'.tmp',file)
        records=next;disk.puts++
      })
      writes=pending.catch(()=>{});return pending
    }}},async close(){await writes}}
  }}}
  t.after(()=>rm(root,{recursive:true,force:true}))
  return disk
}

async function openFixture(t,status) {
  const bytes=await fixtureBytes(status),original=JSON.parse(bytes).a,disk=await diskFixture(t,bytes)
  const repository=await openOasisWorkbenchRepository(disk.storageDomain,{clock:()=>NOW})
  t.after(()=>repository.close())
  return {bytes,original,disk,repository}
}

for(const status of ['prepared','unknown','failed']) {
  test(`pre-repair empty-upstream ${status} record and approved legacy evidence reopen without writes`,async t=>{
    const h=await openFixture(t,status),current=h.repository.get('a'),run=runFor(current)
    assert.deepEqual(current,h.original)
    assert.equal(run.status,status)
    assert.equal(run.inputSnapshot.prepared.values.upstream_md_file.body,'')
    assert.equal(run.inputSnapshot.prepared.receipts.upstream_md_file.sha256,emptySha256)
    assert.equal(run.inputSnapshot.prepared.upstream.status,'warning')
    assert.deepEqual(run.inputSnapshot.prepared.upstream.issues,['structure'])
    assert.equal(current.tasks['task-a'].runs['run-a'].review.status,'approved')
    assert.equal(current.tasks['task-a'].runs['run-a'].writebacks[0].files.length,2)
    const rpc=createWorkbenchRpcHandler({getState:id=>h.repository.get(id)})
    const response=await rpc('state/get',{workspaceId:'a'})
    assert.equal(response.ok,true);assert.deepEqual(response.value,h.original)
    assert.equal(hasPendingUnifiedRun(current.tasks.new),status!=='failed')
    await h.repository.close()
    const reopened=await openOasisWorkbenchRepository(h.disk.storageDomain);t.after(()=>reopened.close())
    assert.deepEqual(reopened.get('a'),h.original)
    await reopened.close()
    assert.equal(await readFile(h.disk.file,'utf8'),h.bytes)
    assert.equal(h.disk.puts,0)
  })

  test(`pre-repair empty-upstream ${status} observation and stop retain frozen evidence without replay`,async t=>{
    const h=await openFixture(t,status);let calls=0
    const service=createV340RuntimeService({repository:h.repository,preparation:createV340PreparationService(),clock:()=>NOW,
      executor:{evidenceKind:'synthetic',generate(){calls++;throw Error('old request must not be replayed')}}})
    t.after(()=>service.closeV340Runtime())
    const run=runFor(h.original),identity={workspaceId:'a',taskId:'new',runId:run.runId}
    const rpc=createWorkbenchRpcHandler(service)
    const observed=await rpc('workflow/v340/run/observe',identity)
    assert.equal(observed.ok,true)
    let current=h.repository.get('a'),expected=structuredClone(run)
    if(status==='prepared')Object.assign(expected,{status:'unknown',failureCode:'INTERRUPTED',completedAt:NOW})
    assert.deepEqual(runFor(current),expected)
    assert.deepEqual(current.tasks['task-a'],h.original.tasks['task-a'])
    const afterObserve=await readFile(h.disk.file,'utf8'),puts=h.disk.puts
    for(let n=0;n<2;n++){
      assert.equal((await rpc('workflow/v340/run/observe',identity)).ok,true)
      assert.equal((await rpc('workflow/v340/run/stop',{...identity,expectedRevision:h.repository.get('a').revision})).ok,true)
      await service.createV340Run({workspaceId:'a',taskId:'new',expectedRevision:h.repository.get('a').revision,requestKey:run.requestKey})
    }
    assert.equal(await readFile(h.disk.file,'utf8'),afterObserve);assert.equal(h.disk.puts,puts)
    if(status!=='failed'){
      await assert.rejects(()=>service.updateV340Draft({workspaceId:'a',taskId:'new',expectedRevision:current.revision,
        draft:{source:'local-skill',textInputs:{},filePaths:{},configuration:{}}}),/未决/)
      await assert.rejects(()=>service.createV340Run({workspaceId:'a',taskId:'new',expectedRevision:current.revision,requestKey:'do-not-retry'}),/未决/)
    }
    assert.equal(calls,0)
    current=h.repository.get('a')
    assert.deepEqual(current.tasks['task-a'],h.original.tasks['task-a']);assert.deepEqual(runFor(current),expected)
    assert.deepEqual(runFor(current).inputSnapshot,run.inputSnapshot);assert.equal(runFor(current).inputSha256,run.inputSha256)
    await service.closeV340Runtime();await h.repository.close()
    const reopened=await openOasisWorkbenchRepository(h.disk.storageDomain);t.after(()=>reopened.close())
    assert.deepEqual(reopened.get('a'),current)
  })
}

test('stopping a pre-repair empty-upstream prepared record preserves its input and approved saved evidence',async t=>{
  const h=await openFixture(t,'prepared');let calls=0
  const service=createV340RuntimeService({repository:h.repository,preparation:createV340PreparationService(),clock:()=>NOW,
    executor:{evidenceKind:'synthetic',generate(){calls++;throw Error('stop must not dispatch')}}})
  t.after(()=>service.closeV340Runtime())
  const run=runFor(h.original),cmd={workspaceId:'a',taskId:'new',runId:run.runId,expectedRevision:h.original.revision}
  const stale=await service.stopV340Run({...cmd,expectedRevision:cmd.expectedRevision-1})
  assert.equal(stale.committed,false);assert.equal(await readFile(h.disk.file,'utf8'),h.bytes)
  await service.stopV340Run(cmd)
  const current=h.repository.get('a')
  assert.deepEqual(runFor(current),{...run,status:'unknown',failureCode:'ABORTED',completedAt:NOW})
  assert.deepEqual(current.tasks['task-a'],h.original.tasks['task-a'])
  await service.observeV340Run({workspaceId:'a',taskId:'new',runId:run.runId})
  assert.deepEqual(h.repository.get('a'),current);assert.equal(calls,0)
  await service.closeV340Runtime();await h.repository.close()
  const reopened=await openOasisWorkbenchRepository(h.disk.storageDomain);t.after(()=>reopened.close())
  assert.deepEqual(reopened.get('a'),current)
})

test('actual empty upstream material keeps the historical structure warning and prepared fingerprint',async t=>{
  const disk=await diskFixture(t);await writeFile(join(disk.root,'empty.md'),'')
  const materials=createWorkspaceMaterialManager({workspaceRegistry:{get:id=>id==='a'?{path:disk.root,async status(){return 'ok'}}:undefined}})
  const service=createV340PreparationService({materialManager:materials})
  const response=await service.prepareV340({workspaceId:'a',nodeId:'Flow-1-2',confirmed:true,textInputs:{},configuration:{},filePaths:{upstream_md_file:'empty.md'}})
  const previous=runFor(JSON.parse(await fixtureBytes('prepared')).a).inputSnapshot.prepared
  assert.deepEqual(response.prepared,previous)
  assert.equal(response.dispatchEnabled,false);assert.equal(disk.puts,0)
})

test('empty upstream compatibility does not admit empty results or empty saved edit drafts',async()=>{
  const run=runFor(JSON.parse(await fixtureBytes('prepared')).a)
  const result={body:'x',fileName:'result.md',sha256:hash('x'),snapshot:{}}
  const completed={...run,status:'completed',failureCode:null,completedAt:NOW,result}
  assert.equal(v340RunSchema.safeParse(completed).success,true)
  assert.equal(v340RunSchema.safeParse({...completed,result:{...result,body:'',sha256:emptySha256}}).success,false)
  const cmd={workspaceId:'a',taskId:'new',runId:run.runId,expectedRevision:4,baseSha256:result.sha256}
  assert.equal(v340Commands['result/draft'].safeParse({...cmd,body:'x'}).success,true)
  assert.equal(v340Commands['result/draft'].safeParse({...cmd,body:''}).success,false)
  assert.equal(v340Commands['result/draft'].safeParse({...cmd,body:null}).success,true)
  assert.equal(v340RunSchema.safeParse({...completed,resultDraft:{body:'',baseSha256:result.sha256,updatedAt:NOW}}).success,false)
})

test('upstream compatibility still rejects oversized UTF-8, NUL and forged hashes without rewriting old records',async t=>{
  const body='汉'.repeat(349526)
  assert.throws(()=>inspectV340Document({filename:'large.md',body,sha256:hash(body)},'Flow-1-1'))
  for(const file of [{filename:'empty.md',body:'',sha256:'f'.repeat(64)},{filename:'nul.md',body:'\0',sha256:hash('\0')}])
    assert.throws(()=>prepareV340Inputs('Flow-1-2',{upstream_md_file:file}))
  const bytes=await fixtureBytes('unknown'),record=JSON.parse(bytes)
  runFor(record.a).inputSnapshot.prepared.values.upstream_md_file.sha256='f'.repeat(64)
  const corrupted=JSON.stringify(record),disk=await diskFixture(t,corrupted)
  const repo=await openOasisWorkbenchRepository(disk.storageDomain);t.after(()=>repo.close())
  assert.throws(()=>repo.get('a'),/integrity mismatch/)
  assert.equal(await readFile(disk.file,'utf8'),corrupted);assert.equal(disk.puts,0)
})
