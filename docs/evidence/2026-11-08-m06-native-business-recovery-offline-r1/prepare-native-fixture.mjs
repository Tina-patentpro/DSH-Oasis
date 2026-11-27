// One explicitly derived fixture in the authoritative P1 Workspace; never replay old SDK run.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import {createHash,randomUUID} from 'node:crypto'
import {createRequire} from 'node:module'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {dirname,join,resolve} from 'node:path'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'
const evidence=dirname(fileURLToPath(import.meta.url)),repo=resolve(evidence,'../../..')
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'))
const auth=await read(join(evidence,'authorization.json')),authority=await read(join(evidence,'workspace-create-result.json'))
const root=auth.root,business=join(root,'data/home/storages/oasis_workbench.json')
const exists=await fs.stat(business).then(()=>true,()=>false);assert.equal(exists,false,'No automatic replay or overwrite of fixture')
const casePath=join(repo,'docs/business-baseline/m06-rc1-business-recovery-case-r1.json'),specimen=await read(casePath)
const hash=x=>createHash('sha256').update(x).digest('hex'),counters={syntheticExecutions:0,network:0}
const deny=()=>{counters.network++;throw Error('No network during derived fixture preparation')}
globalThis.fetch=deny;http.request=http.get=https.request=https.get=deny;net.connect=net.createConnection=net.Socket.prototype.connect=tls.connect=deny
const save=(name,value)=>fs.writeFile(join(evidence,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'})
await save('fixture-attempt-start.json',{at:new Date().toISOString(),pid:process.pid,sourceCasePath:casePath,sourceCaseSHA256:hash(await fs.readFile(casePath)),workspaceId:authority.workspaceId,syntheticOnly:true})
const api=await import(pathToFileURL(join(root,'control/scripts/f-installed-runtime.mjs')).href)
const result=await api.withInstalledWriter(root,'sdk',async report=>{
 const oldEnv={};for(const[k,v]of Object.entries(report.env)){oldEnv[k]=process.env[k];process.env[k]=v}
 const release=join(root,'releases',report.current),pkg=join(release,'components/c3')
 const req=createRequire(join(release,'App/DSH Desktop.app/Contents/Resources/app/package.json'))
 const load=async n=>import(pathToFileURL(req.resolve(n)).href)
 const {Context}=await load('@deepseek-ai/cordis'),{JsonStorageBackend}=await load('@deepseek-ai/dsh-storage-json'),{DomainFacility}=await load('@deepseek-ai/dsh-storage-domain')
 const {default:Jsonl}=await load('@deepseek-ai/dsh-session-persistence-jsonl'),{WorkspaceRegistry}=await load('@deepseek-ai/dsh-workspace')
 const {createSingleOwnerJsonBackend}=await import(pathToFileURL(join(release,'components/c5/index.mjs')).href)
 const {openOasisWorkbenchRepository}=await import(pathToFileURL(join(pkg,'src/workbench-repository.js')).href)
 const {createWorkbenchService}=await import(pathToFileURL(join(pkg,'src/workbench-service.js')).href)
 let backend,facility,context,repository,service
 try{
  backend=await createSingleOwnerJsonBackend(join(root,'data/home/storages'),JsonStorageBackend)
  facility=new DomainFacility({storage:{backend:{get:n=>{assert.equal(n,'json');return backend}}},emit(){},logger:{warn:m=>{throw Error(m)},error:m=>{throw Error(m)}}},{backend:'json'})
  context=new Context();context.provide('storageDomain',facility)
  await context.plugin(Jsonl,{root:join(root,'data/home/sessions')});await context.plugin(WorkspaceRegistry)
  assert.equal(context.workspaceRegistry.get(authority.workspaceId).path,authority.workspacePath)
  repository=await openOasisWorkbenchRepository(facility)
  service=createWorkbenchService({repository,workspaceRegistry:context.workspaceRegistry,v340Executor:{evidenceKind:'synthetic',async generate(){assert.equal(counters.syntheticExecutions,0);counters.syntheticExecutions++;return structuredClone(specimen.syntheticExecutorResponse)}}})
  const workspaceId=authority.workspaceId,taskId='native-recovery-'+randomUUID(),requestKey='native-recovery-once-'+randomUUID()
  const record=()=>repository.get(workspaceId),command=x=>({workspaceId,taskId,expectedRevision:record().revision,...x})
  const run=()=>{const t=record().tasks[taskId].v340;return t.runs[t.activeRunId]}
  for(const[name,args]of [['createV340Task',{nodeId:'Flow-2-6',title:'原生业务恢复合成样例，非真实生成'}],['updateV340Draft',{draft:specimen.draft}],['createV340Run',{requestKey}]])assert.equal((await service[name](command(args))).committed,true)
  for(let n=0;n<500&&run().status==='prepared';n++)await new Promise(r=>setTimeout(r,10))
  await save('fixture-initial-record.json',{record:record(),counters})
  assert.equal(run().status,'completed');assert.equal(counters.syntheticExecutions,1)
  const original=structuredClone(run().result),runId=run().runId
  assert.equal(original.snapshot.deliverable_status,'ready_with_warnings')
  await service.reviewV340Result(command({runId,versionId:runId,resultSha256:original.sha256,confirmed:true}))
  await service.saveV340ResultDraft(command({runId,baseSha256:original.sha256,body:specimen.editedCoreBody,format:'core-markdown'}))
  await service.editV340Result(command({runId,versionId:runId,baseSha256:original.sha256,draftSha256:specimen.editedCoreBodySHA256,requestKey:'native-recovery-edit-'+randomUUID()}))
  const version=run().resultVersions.at(-1),target={runId,versionId:version.versionId,resultSha256:version.result.sha256}
  assert.equal(version.review.status,'not-reviewed');assert.equal(version.result.snapshot.deliverable_status,'not_recommended_for_filing')
  await assert.rejects(service.prepareV340Save(command(target)),e=>e.code==='V340_REVIEW_REQUIRED')
  await service.reviewV340Result(command({...target,confirmed:true}))
  const prepared=await service.prepareV340Save(command(target));assert.equal((await service.commitV340Save({confirmationToken:prepared.confirmationToken})).committed,true)
  assert.equal(record().activeTaskId,null,'selection remains a separate UI/public-command acceptance')
  const saved=run().resultVersions.at(-1).writebacks[0],md=saved.files.find(f=>f.mediaType==='text/markdown'),mdPath=join(authority.workspacePath,md.relativePath)
  assert.equal(hash(await fs.readFile(mdPath)),target.resultSha256)
  await fs.appendFile(mdPath,specimen.externalFileEditSuffix)
  assert.equal((await service.resolveV340SavedFile(command({...target,writebackId:saved.writebackId}))).matchesReviewed,false)
  const scope={schemaVersion:1,policy:'m06-native-business-recovery-v1',root,workspaceId,workspacePath:authority.workspacePath,taskId,runId,inputSha256:run().inputSha256}
  await save('recovery-scope.json',scope);await save('fixture-prepared-record.json',record())
  return{scope,target,recordRevision:record().revision,writebackId:saved.writebackId,savedFilename:md.relativePath,currentFileSHA256:hash(await fs.readFile(mdPath)),reviewedResultSHA256:target.resultSha256,originalWarnings:original.snapshot.warnings.length,editedWarnings:version.result.snapshot.warnings.length,counters,sourceCaseSHA256:hash(await fs.readFile(casePath)),oldSDKRunRecreated:false,professionalOrUserAccepted:false,appHostBoot:false}
 }finally{
  await service?.closeV340Runtime();await repository?.close();await context?.fiber.dispose();await facility?.closeAll();await backend?.close()
  for(const[k,v]of Object.entries(oldEnv))if(v===undefined)delete process.env[k];else process.env[k]=v
 }
})
result.businessSHA256=hash(await fs.readFile(business))
await save('fixture-preparation-result.json',result);console.log(JSON.stringify(result))
