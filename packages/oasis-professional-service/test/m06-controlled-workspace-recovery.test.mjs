import test from 'node:test'
import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {createWorkbenchStore} from '../src/client/workbench-store.js'
import {createWorkbenchRemote} from '../src/client/workbench-remote.js'
import {setupM06ControlledHost} from './helpers/m06-controlled-host-harness.mjs'

for(const restore of ['after-response','before-response'])test(`removed Workspace can prepare again when restored ${restore}`,async t=>{
  const host=await setupM06ControlledHost(t),requests=[]
  let release,arrived,hold=true
  const gate=new Promise(r=>release=r),entered=new Promise(r=>arrived=r)
  t.after(()=>release())
  const remote=createWorkbenchRemote({rpc:{async call(_channel,method,payload){
    requests.push(method);const value=await host.rpc(method.slice('oasis-workbench/'.length),payload)
    if(hold&&method.endsWith('candidate/prepare')){hold=false;arrived();await gate}
    return value
  }}})
  const store=createWorkbenchStore({remote,saveDelayMs:0,getGenerationSession:()=> 's'})
  t.after(()=>store.dispose())
  store.syncWorkspaces([{workspaceId:'w'}]);await store.hydrateWorkspace('w');await store.loadWorkflowCatalog('w')
  store.activatePage('w','t');await store.flushWorkspace('w')
  const old=store.prepareV340Candidate('w','t'),rejected=assert.rejects(old)
  await entered;store.syncWorkspaces([])
  if(restore==='before-response'){
    store.syncWorkspaces([{workspaceId:'w'}])
    await assert.rejects(()=>store.prepareV340Candidate('w','t'),/正在进行/)
  }
  release();await rejected
  if(restore==='after-response')store.syncWorkspaces([{workspaceId:'w'}])
  const op=store.getWorkspaceState('w').pageOperations.t
  assert.equal(op.v340CandidatePreview,null)
  assert.equal(op.v340CandidatePreparing,false,'finished preparation must release its retained Workspace state')
  assert.equal(op.activeOperation,null)
  const preview=await store.prepareV340Candidate('w','t')
  assert.equal(preview.businessSkillVersion,'0.1.3')
  assert.equal(requests.filter(x=>x.endsWith('candidate/prepare')).length,2)
  assert.equal(requests.filter(x=>x.endsWith('candidate/run')).length,0)
  assert.equal(host.calls.adapter,0);assert.equal(host.calls.network,0);assert.equal(host.calls.credentials,0)
  store.syncWorkspaces([])
  await assert.rejects(async()=>store.prepareV340Candidate('w','t'))
  store.syncWorkspaces([{workspaceId:'w'}])
  await store.prepareV340Candidate('w','t')
  assert.equal(host.calls.adapter,0)
  if(process.env.OASIS_M06_RECOVERY_EVIDENCE_DIR)await writeFile(join(process.env.OASIS_M06_RECOVERY_EVIDENCE_DIR,`${restore}-observation.json`),JSON.stringify({restore,requests,counts:host.calls,operation:store.getWorkspaceState('w').pageOperations.t},null,2)+'\n',{flag:'wx'})
})

for(const admitted of [false,true])test(`removed Workspace retains UNKNOWN after lost run reply; admitted=${admitted}`,async t=>{
  const host=await setupM06ControlledHost(t),requests=[]
  let release,arrived
  const gate=new Promise(r=>release=r),entered=new Promise(r=>arrived=r)
  t.after(()=>release())
  const remote=createWorkbenchRemote({rpc:{async call(_channel,method,payload){
    requests.push(method)
    if(method.endsWith('candidate/run')){
      if(admitted)await host.rpc(method.slice('oasis-workbench/'.length),payload)
      arrived();await gate;throw Error('synthetic lost run reply while Workspace absent')
    }
    return host.rpc(method.slice('oasis-workbench/'.length),payload)
  }}})
  const store=createWorkbenchStore({remote,saveDelayMs:0,getGenerationSession:()=> 's'})
  t.after(()=>store.dispose())
  store.syncWorkspaces([{workspaceId:'w'}]);await store.hydrateWorkspace('w');await store.loadWorkflowCatalog('w')
  store.activatePage('w','t');await store.flushWorkspace('w');await store.prepareV340Candidate('w','t')
  const run=store.confirmV340Candidate('w','t'),rejected=assert.rejects(run,/synthetic lost/)
  await entered;store.syncWorkspaces([]);release();await rejected;store.syncWorkspaces([{workspaceId:'w'}])
  let op=store.getWorkspaceState('w').pageOperations.t
  assert.equal(op.v340CandidateSubmitting,false,'finished transport must release its retained Workspace state')
  assert.equal(op.v340CandidateUnconfirmed,true)
  const key=op.v340CandidateRequestKey;assert.equal(typeof key,'string')
  await assert.rejects(()=>store.prepareV340Candidate('w','t'))
  await store.reconcileV340Candidate('w','t');op=store.getWorkspaceState('w').pageOperations.t
  assert.equal(op.v340CandidateUnconfirmed,!admitted);assert.equal(op.v340CandidateRequestKey,key)
  assert.equal(requests.filter(x=>x.endsWith('candidate/run')).length,1)
  assert.equal(host.calls.adapter,admitted?1:0);assert.equal(host.calls.network,0);assert.equal(host.calls.credentials,0)
  if(process.env.OASIS_M06_RECOVERY_EVIDENCE_DIR)await writeFile(join(process.env.OASIS_M06_RECOVERY_EVIDENCE_DIR,`unknown-${admitted}-observation.json`),JSON.stringify({admitted,requests,counts:host.calls,operation:op},null,2)+'\n',{flag:'wx'})
})
