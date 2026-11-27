import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {dirname,join} from 'node:path'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'
const evidence=dirname(fileURLToPath(import.meta.url)),read=async p=>JSON.parse(await fs.readFile(p,'utf8'))
const auth=await read(join(evidence,'authorization.json')),proof=await read(join(evidence,'candidate-identity.json')),scope=await read(join(evidence,'recovery-scope.json')),fixture=await read(join(evidence,'fixture-preparation-result.json'))
const stage=process.argv[2];assert.ok(['select','cold'].includes(stage))
const counters={network:0,dispatches:0},deny=()=>{counters.network++;throw Error('Network refused')}
globalThis.fetch=deny;http.request=http.get=https.request=https.get=deny;net.connect=net.createConnection=net.Socket.prototype.connect=tls.connect=deny
const sha=x=>createHash('sha256').update(x).digest('hex'),root=auth.root,business=join(root,'data/home/storages/oasis_workbench.json')
const api=await import(pathToFileURL(join(root,'control/scripts/f-installed-runtime.mjs')).href)
const before=sha(await fs.readFile(business))
const result=await api.withInstalledWriter(root,'sdk',async report=>{
 const previous={};for(const[k,v]of Object.entries(report.env)){previous[k]=process.env[k];process.env[k]=v}
 const release=join(root,'releases',report.current),req=createRequire(join(release,'App/DSH Desktop.app/Contents/Resources/app/package.json'))
 const load=async n=>import(pathToFileURL(req.resolve(n)).href),candidate=async n=>import(pathToFileURL(join(proof.unpack,'src',n)).href)
 const {Context}=await load('@deepseek-ai/cordis'),{JsonStorageBackend}=await load('@deepseek-ai/dsh-storage-json'),{DomainFacility}=await load('@deepseek-ai/dsh-storage-domain'),{default:Jsonl}=await load('@deepseek-ai/dsh-session-persistence-jsonl'),{WorkspaceRegistry}=await load('@deepseek-ai/dsh-workspace')
 const {createSingleOwnerJsonBackend}=await import(pathToFileURL(join(release,'components/c5/index.mjs')).href)
 let backend,facility,context,repository,service
 try{
  backend=await createSingleOwnerJsonBackend(join(root,'data/home/storages'),JsonStorageBackend)
  facility=new DomainFacility({storage:{backend:{get:n=>{assert.equal(n,'json');return backend}}},emit(){},logger:{warn:m=>{throw Error(m)},error:m=>{throw Error(m)}}},{backend:'json'})
  context=new Context();context.provide('storageDomain',facility);await context.plugin(Jsonl,{root:join(root,'data/home/sessions')});await context.plugin(WorkspaceRegistry)
  const {openOasisWorkbenchRepository}=await candidate('workbench-repository.js'),{createWorkbenchService}=await candidate('workbench-service.js'),{createWorkbenchRpcHandler}=await candidate('workbench-rpc.js'),{createM06NativeBusinessRecovery}=await candidate('m06-native-business-recovery.js')
  repository=await openOasisWorkbenchRepository(facility);service=createWorkbenchService({repository,workspaceRegistry:context.workspaceRegistry})
  const mode=createM06NativeBusinessRecovery({repository,workspaceRegistry:context.workspaceRegistry,scope});await mode.validate()
  const handler=createWorkbenchRpcHandler(service,null,null,null,{m06Candidate013:true,nativeBusinessRecovery:mode})
  const prior=repository.get(scope.workspaceId)
  if(stage==='select'){
   assert.equal(prior.activeTaskId,null)
   const selected=await handler('workflow/v340/task/select',{workspaceId:scope.workspaceId,taskId:scope.taskId,expectedRevision:prior.revision})
   assert.equal(selected.ok,true);assert.deepEqual(selected.value.current.tasks,prior.tasks)
   assert.equal(selected.value.current.revision,prior.revision+1)
  }else{
   const previous=await read(join(evidence,'native-fixture-select-result.json'));assert.equal(prior.revision,previous.recordRevision)
   assert.equal(prior.activeTaskId,scope.taskId);assert.equal(before,previous.businessSHA256)
  }
  const record=repository.get(scope.workspaceId),target={workspaceId:scope.workspaceId,taskId:scope.taskId,expectedRevision:record.revision,...fixture.target}
  const opened=await handler('workflow/v340/result/saved-file',{...target,writebackId:fixture.writebackId})
  assert.equal(opened.ok,true);assert.equal(opened.value.matchesReviewed,false);assert.equal(opened.value.currentSha256,fixture.currentFileSHA256)
  const draft=await handler('workflow/v340/result/conversation-draft',target)
  assert.equal(draft.ok,true);assert.ok(draft.value.text.includes(fixture.reviewedResultSHA256))
  assert.equal((await handler('state/get',{workspaceId:(await read(join(evidence,'workspace-create-result.json'))).otherWorkspaceId})).ok,false)
  for(const endpoint of ['state/replace','workflow/v340/candidate/run','account/status','import/open','workflow/v340/run/observe'])assert.equal((await handler(endpoint,{})).ok,false)
  await assert.rejects(service.createV340Run({...target,requestKey:'must-not-dispatch'}),e=>e.code==='V340_EXECUTION_DISABLED')
  const unchanged=repository.get(scope.workspaceId);assert.deepEqual(unchanged.tasks,prior.tasks)
  return{stage,pid:process.pid,archiveSHA256:proof.archiveSHA256,actualAuthorityWorkspaceId:scope.workspaceId,recordRevision:unchanged.revision,activeTaskId:unchanged.activeTaskId,reviewedAndCurrentFileDistinguished:true,fixedConversationDraftPreparedOnly:true,allForbiddenOperationsRefused:true,counters,newBusinessExecutions:0,AppHostBoot:false,installedNewCandidate:false}
 }finally{
  await service?.closeV340Runtime();await repository?.close();await context?.fiber.dispose();await facility?.closeAll();await backend?.close()
  for(const[k,v]of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v
 }
})
result.businessSHA256=sha(await fs.readFile(business))
if(stage==='cold')assert.equal(result.businessSHA256,before)
await fs.writeFile(join(evidence,`native-fixture-${stage}-result.json`),JSON.stringify(result,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify(result))
