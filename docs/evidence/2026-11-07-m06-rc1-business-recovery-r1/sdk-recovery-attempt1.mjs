// Bounded evidence runner for the approved R4-01 case, not a production entry.
import fs from 'node:fs/promises'
import syncfs from 'node:fs'
import cp from 'node:child_process'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import {join,dirname,resolve} from 'node:path'
import {pathToFileURL,fileURLToPath} from 'node:url'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'
const self=fileURLToPath(import.meta.url),evidence=dirname(self),repo=resolve(evidence,'../../..')
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'))
const auth=await read(join(evidence,'authorization.json'))
const specimen=await read(join(repo,'docs/business-baseline/m06-rc1-business-recovery-case-r1.json'))
const root=auth.root,storage=join(root,'data/home/storages'),business=join(storage,'oasis_workbench.json')
const stage=process.argv[2],workspaceId=specimen.workspaceId,taskId=specimen.taskId
assert.ok(['create','cold','negatives','lease-busy','lease-free'].includes(stage))
assert.equal(root,specimen.proposedIsolatedRoot)
const sha=x=>createHash('sha256').update(x).digest('hex')
const fileHash=async p=>sha(await fs.readFile(p))
const save=(name,value)=>fs.writeFile(join(evidence,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'})
const counters={syntheticExecutions:0,unexpectedDispatches:0,fetchAttempts:0,socketAttempts:0,disallowedProcessAttempts:0,leaseChildren:0}
const deny=key=>()=>{counters[key]++;throw Error(`Unauthorized effect: ${key}`)}
globalThis.fetch=deny('fetchAttempts')
http.request=http.get=https.request=https.get=deny('socketAttempts')
net.connect=net.createConnection=net.Socket.prototype.connect=tls.connect=deny('socketAttempts')
const rawExec=cp.execFileSync
cp.execFileSync=(file,args,options)=>{
 if(file==='/bin/ps')return rawExec(file,args,options)
 if(file===process.execPath&&args[0]===self&&['lease-busy','lease-free'].includes(args[1])&&args.length===2){counters.leaseChildren++;return rawExec(file,args,options)}
 return deny('disallowedProcessAttempts')()
}
cp.spawn=cp.spawnSync=cp.exec=cp.execSync=cp.execFile=cp.fork=deny('disallowedProcessAttempts')
const api=await import(pathToFileURL(join(root,'control/scripts/f-installed-runtime.mjs')).href)
const journal=async(event,details={})=>fs.appendFile(join(evidence,stage+'-journal.jsonl'),JSON.stringify({event,at:new Date().toISOString(),pid:process.pid,...details})+'\n')
function child(mode){
 const env={HOME:join(root,'data/user'),DSH_HOME:join(root,'data/home'),PATH:dirname(process.execPath)+':/usr/bin:/bin',LANG:'en_US.UTF-8',LC_ALL:'en_US.UTF-8',DSH_TELEMETRY_DISABLED:'1',COREPACK_ENABLE_NETWORK:'0',CI:'true'}
 return JSON.parse(cp.execFileSync(process.execPath,[self,mode],{env,cwd:root,encoding:'utf8',timeout:15000}))
}
async function withSdk(callback){
 return api.withInstalledWriter(root,'sdk',async report=>{
  assert.equal(report.current,auth.bundleSHA256)
  assert.equal(report.realCallBudget,0)
  const release=join(root,'releases',report.current),pkg=join(release,'components/c3'),oldEnv={}
  for(const [key,value] of Object.entries(report.env)){oldEnv[key]=process.env[key];process.env[key]=value}
  let backend,facility,repository,service
  try{
   const appRequire=createRequire(join(release,'App/DSH Desktop.app/Contents/Resources/app/package.json'))
   const {JsonStorageBackend}=await import(pathToFileURL(appRequire.resolve('@deepseek-ai/dsh-storage-json')).href)
   const {DomainFacility}=await import(pathToFileURL(appRequire.resolve('@deepseek-ai/dsh-storage-domain')).href)
   const {createSingleOwnerJsonBackend}=await import(pathToFileURL(join(release,'components/c5/index.mjs')).href)
   backend=await createSingleOwnerJsonBackend(storage,JsonStorageBackend)
   facility=new DomainFacility({storage:{backend:{get:name=>{assert.equal(name,'json');return backend}}},emit(){},logger:{warn:m=>{throw Error(m)},error:m=>{throw Error(m)}}},{backend:'json'})
   const {openOasisWorkbenchRepository}=await import(pathToFileURL(join(pkg,'src/workbench-repository.js')).href)
   const {createWorkbenchService}=await import(pathToFileURL(join(pkg,'src/workbench-service.js')).href)
   repository=await openOasisWorkbenchRepository(facility)
   const workspaceRegistry={get:id=>id===workspaceId?{path:join(root,'data/workspace-a'),async status(){return'ok'}}:id===specimen.otherWorkspaceId?{path:join(root,'data/workspace-b'),async status(){return'ok'}}:undefined}
   service=createWorkbenchService({repository,workspaceRegistry,v340Executor:{evidenceKind:'synthetic',async generate(){
    if(stage==='create'&&counters.syntheticExecutions===0){counters.syntheticExecutions++;await journal('synthetic-executor-once');return structuredClone(specimen.syntheticExecutorResponse)}
    counters.unexpectedDispatches++;throw Error('No redispatch permitted')
   }}})
   const record=()=>repository.get(workspaceId),command=extra=>({workspaceId,taskId,expectedRevision:record().revision,...extra})
   const run=()=>{const t=record().tasks[taskId].v340;return t.runs[t.activeRunId]}
   return await callback({repository,service,record,command,run,pkg,release})
  }finally{
   await service?.closeV340Runtime();await repository?.close();await facility?.closeAll();await backend?.close()
   for(const [key,value]of Object.entries(oldEnv))if(value===undefined)delete process.env[key];else process.env[key]=value
  }
 })
}
async function create(){
 assert.equal(syncfs.existsSync(business),false,'must not seed twice or overwrite existing business state')
 await save('attempt-start.json',{pid:process.pid,requestKey:specimen.initialRequestKey,caseSHA256:auth.caseSHA256,startedAt:new Date().toISOString(),syntheticOnly:true})
 return withSdk(async({service,record,command,run})=>{
  for(const [name,args]of [['createV340Task',{nodeId:specimen.nodeId,title:'公开合成业务稿恢复，非真实生成'}],['updateV340Draft',{draft:specimen.draft}],['createV340Run',{requestKey:specimen.initialRequestKey}]]){
   const r=await service[name](command(args));assert.equal(r.committed,true,name);await journal(name,{recordRevision:record().revision})
  }
  for(let n=0;n<500&&run().status==='prepared';n++)await new Promise(ok=>setTimeout(ok,10))
  await save('initial-run-observation.json',{record:record(),syntheticExecutions:counters.syntheticExecutions})
  assert.equal(run().status,'completed','do not retry an unknown/failed initial run')
  assert.equal(run().evidenceKind,'synthetic');assert.equal(counters.syntheticExecutions,1)
  const original=structuredClone(run().result),runId=run().runId
  assert.equal(original.snapshot.deliverable_status,'not_recommended_for_filing')
  assert.ok(original.snapshot.warnings.some(w=>w.warning_id==='host-Flow-2-6-missing-upstream_md_file'&&w.status==='open'))
  assert.ok(original.snapshot.warnings.some(w=>w.model_completion==='未评估'))
  const parent={runId,versionId:runId,resultSha256:original.sha256}
  assert.equal((await service.reviewV340Result(command({...parent,confirmed:true}))).committed,true)
  assert.equal((await service.saveV340ResultDraft(command({runId,baseSha256:original.sha256,body:specimen.editedCoreBody,format:'core-markdown'}))).committed,true)
  assert.equal((await service.editV340Result(command({runId,versionId:runId,baseSha256:original.sha256,draftSha256:specimen.editedCoreBodySHA256,requestKey:specimen.editRequestKey}))).committed,true)
  const edited=run().resultVersions.at(-1),versionId=edited.versionId
  assert.equal(edited.parentVersionId,runId);assert.equal(edited.review.status,'not-reviewed')
  assert.deepEqual(run().result,original);assert.equal(run().resultVersions[0].review.status,'approved')
  assert.deepEqual(edited.result.snapshot.tables,original.snapshot.tables)
  assert.deepEqual(edited.result.snapshot.warnings.slice(0,original.snapshot.warnings.length),original.snapshot.warnings)
  const target={runId,versionId,resultSha256:edited.result.sha256}
  await assert.rejects(()=>service.prepareV340Save(command(target)),e=>e.code==='V340_REVIEW_REQUIRED')
  await journal('unreviewed-revision-save-refused',{versionId})
  assert.equal((await service.reviewV340Result(command({...target,confirmed:true}))).committed,true)
  const prepared=await service.prepareV340Save(command(target))
  assert.equal((await service.commitV340Save({confirmationToken:prepared.confirmationToken})).committed,true)
  const version=run().resultVersions.find(v=>v.versionId===versionId),saved=version.writebacks.at(-1),file=saved.files.find(f=>f.mediaType==='text/markdown')
  assert.equal(saved.artifactId,'sha256:'+target.resultSha256)
  const absolutePath=join(root,'data/workspace-a',file.relativePath)
  assert.equal(await fileHash(absolutePath),target.resultSha256)
  assert.equal(file.relativePath.includes('_OIW'),false)
  await save('before-close-record.json',record())
  const identity={workspaceId,taskId,runId,workflowRunUid:run().workflowRunUid,inputSha256:run().inputSha256,catalogResourceSHA256:run().inputSnapshot.resourceSHA256,versionId,resultSha256:target.resultSha256,recordRevision:record().revision,writebackId:saved.writebackId,relativePath:file.relativePath,absolutePath,syntheticExecutions:1,professionalAcceptance:false,userAcceptance:false}
  await save('runtime-identities.json',identity)
  const busy=child('lease-busy');assert.equal(busy.refused,true);assert.equal(busy.code,'F_INSTALL_BUSY')
  await save('lease-busy-observation.json',busy)
  await journal('review-edit-save-complete',{runId,versionId,recordRevision:record().revision})
  return{identity,busyWriterRefused:true,originalResultPreserved:true,editedInitiallyNotReviewed:true,reviewRequiredBeforeSave:true,publicSaveCommitted:true}
 })
}
async function cold(){
 const expected=await read(join(evidence,'before-close-record.json')),identity=await read(join(evidence,'runtime-identities.json')),before=await fileHash(business)
 const result=await withSdk(async({record,run,service,command})=>{
  assert.deepEqual(record(),expected)
  const version=run().resultVersions.find(v=>v.versionId===identity.versionId)
  assert.equal(version.review.status,'approved');assert.equal(version.result.sha256,identity.resultSha256)
  assert.equal(await fileHash(identity.absolutePath),identity.resultSha256)
  const saved=await service.resolveV340SavedFile(command({runId:identity.runId,versionId:identity.versionId,resultSha256:identity.resultSha256,writebackId:identity.writebackId}))
  assert.equal(saved.matchesReviewed,true);assert.equal(saved.currentSha256,identity.resultSha256)
  assert.equal(run().status,'completed');assert.equal(counters.syntheticExecutions,0)
  return{recordExactlyRestored:true,runId:identity.runId,versionId:identity.versionId,recordRevision:record().revision,reviewAndWritebackRestored:true,currentFileMatchesReviewed:true,originalPid:JSON.parse(await fs.readFile(join(evidence,'attempt-start.json'),'utf8')).pid,coldPid:process.pid}
 })
 assert.equal(await fileHash(business),before)
 assert.notEqual(result.originalPid,result.coldPid)
 return{...result,businessSHA256:before,businessBytesUnchanged:true}
}
async function negatives(){
 const identity=await read(join(evidence,'runtime-identities.json')),before=await fileHash(business)
 return withSdk(async({record,run,service,command})=>{
  const target={runId:identity.runId,versionId:identity.versionId,resultSha256:identity.resultSha256},savedRecord=structuredClone(record())
  await assert.rejects(()=>service.prepareV340Save({...command(target),workspaceId:specimen.otherWorkspaceId,expectedRevision:0}),e=>e.code==='V340_RESULT_UNAVAILABLE')
  const stale=await service.reviewV340Result({...command({...target,confirmed:true}),expectedRevision:record().revision-1})
  assert.equal(stale.committed,false);assert.equal(stale.reason,'revision-conflict')
  await assert.rejects(()=>service.prepareV340Save({...command(target),expectedRevision:record().revision-1}),e=>e.code==='REVISION_CONFLICT')
  await assert.rejects(()=>service.prepareV340Save(command(target)),e=>e.code==='WRITEBACK_TARGET_EXISTS')
  assert.deepEqual(record(),savedRecord);assert.equal(await fileHash(business),before)
  assert.equal(await fileHash(identity.absolutePath),identity.resultSha256)
  await fs.appendFile(identity.absolutePath,specimen.externalFileEditSuffix)
  const current=await service.resolveV340SavedFile(command({...target,writebackId:identity.writebackId}))
  assert.equal(current.kind,'current-file');assert.equal(current.matchesReviewed,false)
  assert.equal(current.currentSha256,await fileHash(identity.absolutePath));assert.notEqual(current.currentSha256,identity.resultSha256)
  const draft=await service.prepareV340ConversationDraft(command(target))
  assert.ok(draft.text.includes(run().resultVersions.find(v=>v.versionId===identity.versionId).result.body))
  assert.ok(draft.text.includes(identity.resultSha256));assert.equal(draft.text.includes('RC1_RECOVERY_USER_FILE_EDIT_R1'),false)
  assert.deepEqual(record(),savedRecord);assert.equal(await fileHash(business),before)
  return{crossWorkspaceRefused:true,staleReviewRefused:true,staleSaveRefused:true,noOverwriteRefused:true,businessBytesUnchanged:true,currentFileMatchesReviewed:false,currentFileSHA256:current.currentSha256,fixedReviewSHA256:identity.resultSha256,fixedVersionDraftOnly:true,messageSent:false}
 })
}
try{
 let result
 if(stage.startsWith('lease-')){
  const {acquireInstalledLease}=await import(pathToFileURL(join(root,'control/patches/storage-json-single-owner/installed-lease.mjs')).href)
  let lease,error
  try{lease=acquireInstalledLease(root,'sdk')}catch(e){error=e}
  finally{lease?.release()}
  if(stage==='lease-busy'){assert.equal(error?.code,'F_INSTALL_BUSY');result={refused:true,code:error.code,businessBackendOpened:false}}
  else{assert.equal(error,undefined);result={reacquiredAndReleased:true,businessBackendOpened:false}}
 }else{
  await journal('stage-start')
  result=await ({create,cold,negatives}[stage])()
  assert.equal(syncfs.existsSync(join(root,'startup.lock')),false);assert.equal(syncfs.existsSync(join(root,'data/startup.lock')),false)
  const free=child('lease-free');assert.equal(free.reacquiredAndReleased,true)
  await journal('stage-complete')
  result={...result,writerReacquiredAfterClose:true,writerAndProviderReleased:true}
 }
 assert.equal(counters.fetchAttempts,0);assert.equal(counters.socketAttempts,0);assert.equal(counters.disallowedProcessAttempts,0);assert.equal(counters.unexpectedDispatches,0)
 const receipt={stage,pid:process.pid,result,counters,AppOrHostStarted:false,realModelApiUploadPayment:false}
 if(!stage.startsWith('lease-'))await save(stage+'-result.json',receipt)
 console.log(JSON.stringify(receipt))
}catch(error){
 await save(stage+'-failure-'+Date.now()+'.json',{stage,pid:process.pid,message:error.message,stack:error.stack,counters,businessFileExists:syncfs.existsSync(business),noRetryAuthorized:true})
 console.error(error.stack);process.exitCode=1
}
