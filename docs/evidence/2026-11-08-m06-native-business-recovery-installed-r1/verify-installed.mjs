// Exact installed implementation and official SDK facilities; no Host apply or App spawn.
import fs from 'node:fs/promises'
import cp from 'node:child_process'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createHash} from 'node:crypto'
import {dirname,join} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'
const evidence=dirname(fileURLToPath(import.meta.url)),read=async p=>JSON.parse(await fs.readFile(p,'utf8'))
const identity=await read(join(evidence,'bundle-identity.json')),auth=await read(join(evidence,'authorization.json')),root=auth.root,scope=identity.scope
const fixture=await read(join(evidence,'../2026-11-08-m06-native-business-recovery-offline-r1/fixture-preparation-result.json'))
const stage=process.argv[2];assert.ok(['installed','cold'].includes(stage))
const counters={network:0,disallowedProcess:0,model:0,api:0,upload:0,businessExecutions:0}
const deny=key=>()=>{counters[key]++;throw Error('Offline verification refused '+key)}
globalThis.fetch=deny('network');http.request=http.get=https.request=https.get=deny('network');net.connect=net.createConnection=net.Socket.prototype.connect=tls.connect=deny('network')
const exec=cp.execFileSync
cp.execFileSync=(file,args,options)=>file==='/bin/ps'?exec(file,args,options):deny('disallowedProcess')()
cp.spawn=cp.spawnSync=cp.exec=cp.execSync=cp.execFile=cp.fork=deny('disallowedProcess')
const sha=x=>createHash('sha256').update(x).digest('hex'),fileSha=async p=>sha(await fs.readFile(p))
const api=await import(pathToFileURL(join(root,'control/scripts/f-installed-runtime.mjs')).href)
assert.equal(await fileSha(join(root,'control/scripts/f-installed-runtime.mjs')),identity.controllerSHA256)
const business=join(root,'data/home/storages/oasis_workbench.json'),before=await fileSha(business)
assert.equal(before,'560f825eab3c54449b909a3bfc57ceb2c1e8d75cf0b0d7922774f2267eada4a7')
const release=join(root,'releases',identity.bundleSHA256),component=join(release,'components/c3')
const installed=async name=>import(pathToFileURL(join(component,'src',name)).href)
const {loadNativeBusinessRecoveryScope}=await installed('m06-native-business-recovery.js')
let specProof
await api.withInstalledLaunchSpec(root,async spec=>{
 assert.equal(spec.current,identity.bundleSHA256);assert.equal(spec.nativeBusinessRecovery,true);assert.equal(spec.nativeZeroGeneration,false)
 assert.equal(spec.env.OASIS_NATIVE_BUSINESS_RECOVERY,'1');assert.equal(spec.env.OASIS_NATIVE_ZERO_GENERATION,undefined)
 assert.deepEqual(await loadNativeBusinessRecoveryScope({env:spec.env}),scope)
 specProof={leaseBoundScopeValidated:true,nativeBusinessRecovery:true,nativeZeroGeneration:false,spawned:false}
})
const result=await api.withInstalledWriter(root,'sdk',async report=>{
 assert.equal(report.current,identity.bundleSHA256)
 const previous={};for(const[k,v]of Object.entries(report.env)){previous[k]=process.env[k];process.env[k]=v}
 const req=createRequire(join(release,'App/DSH Desktop.app/Contents/Resources/app/package.json')),load=async n=>import(pathToFileURL(req.resolve(n)).href)
 const {Context}=await load('@deepseek-ai/cordis'),{JsonStorageBackend}=await load('@deepseek-ai/dsh-storage-json'),{DomainFacility}=await load('@deepseek-ai/dsh-storage-domain'),{default:Jsonl}=await load('@deepseek-ai/dsh-session-persistence-jsonl'),{WorkspaceRegistry}=await load('@deepseek-ai/dsh-workspace')
 const {createSingleOwnerJsonBackend}=await import(pathToFileURL(join(release,'components/c5/index.mjs')).href)
 let backend,facility,context,repository,service
 try{
  backend=await createSingleOwnerJsonBackend(join(root,'data/home/storages'),JsonStorageBackend)
  facility=new DomainFacility({storage:{backend:{get:n=>{assert.equal(n,'json');return backend}}},emit(){},logger:{warn:m=>{throw Error(m)},error:m=>{throw Error(m)}}},{backend:'json'})
  context=new Context();context.provide('storageDomain',facility);await context.plugin(Jsonl,{root:join(root,'data/home/sessions')});await context.plugin(WorkspaceRegistry)
  assert.ok(context.workspaceRegistry instanceof WorkspaceRegistry)
  assert.equal(context.workspaceRegistry.get(scope.workspaceId).path,scope.workspacePath)
  const {openOasisWorkbenchRepository}=await installed('workbench-repository.js'),{createWorkbenchService}=await installed('workbench-service.js'),{createWorkbenchRpcHandler}=await installed('workbench-rpc.js'),{createM06NativeBusinessRecovery}=await installed('m06-native-business-recovery.js')
  repository=await openOasisWorkbenchRepository(facility);service=createWorkbenchService({repository,workspaceRegistry:context.workspaceRegistry})
  const mode=createM06NativeBusinessRecovery({repository,workspaceRegistry:context.workspaceRegistry,scope});await mode.validate()
  const handler=createWorkbenchRpcHandler(service,null,null,null,{m06Candidate013:true,nativeBusinessRecovery:mode}),record=repository.get(scope.workspaceId)
  assert.equal(record.revision,10);assert.equal(record.activeTaskId,scope.taskId)
  const target={workspaceId:scope.workspaceId,taskId:scope.taskId,expectedRevision:record.revision,...fixture.target}
  assert.equal((await handler('state/get',{workspaceId:scope.workspaceId})).ok,true)
  const catalog=await handler('workflow/catalog',{});assert.equal(catalog.ok,true);assert.equal(catalog.value.localGenerationEnabled,false);assert.equal(catalog.value.apiExecutionAvailable,false)
  const nodeCatalog=await handler('workflow/v340/catalog',{});assert.equal(nodeCatalog.ok,true);assert.equal(nodeCatalog.value.nativeBusinessRecovery.policy,scope.policy)
  const opened=await handler('workflow/v340/result/saved-file',{...target,writebackId:fixture.writebackId})
  assert.equal(opened.ok,true);assert.equal(opened.value.matchesReviewed,false);assert.equal(opened.value.currentSha256,fixture.currentFileSHA256)
  const draft=await handler('workflow/v340/result/conversation-draft',target);assert.equal(draft.ok,true);assert.ok(draft.value.text.includes(fixture.reviewedResultSHA256))
  const denied=['state/replace','workflow/v340/candidate/run','account/status','import/open','workflow/v340/run/observe']
  for(const endpoint of denied)assert.equal((await handler(endpoint,{})).ok,false)
  assert.equal((await handler('state/get',{workspaceId:'unbound-workspace'})).ok,false)
  await assert.rejects(service.createV340Run({workspaceId:scope.workspaceId,taskId:scope.taskId,expectedRevision:record.revision,requestKey:'must-not-create'}),e=>e.code==='V340_EXECUTION_DISABLED')
  assert.deepEqual(repository.get(scope.workspaceId),record);assert.deepEqual(await context.sessionPersistence.list(),[])
  return {stage,pid:process.pid,bundleSHA256:report.current,archiveSHA256:identity.archiveSHA256,controllerSHA256:identity.controllerSHA256,recordRevision:record.revision,activeTaskId:record.activeTaskId,actualWorkspaceId:scope.workspaceId,actualInstalledBusinessCode:true,sourceFallback:false,actualOfficialWorkspaceRegistry:true,actualJsonlPersistence:true,reviewedAndCurrentFileDistinguished:true,fixedConversationDraftPreparedOnly:true,deniedEndpoints:denied,specProof,counters,AppHostBoot:false,nativeUIAccepted:false,newBusinessExecutions:0}
 }finally{
  await service?.closeV340Runtime();await repository?.close();await context?.fiber.dispose();await facility?.closeAll();await backend?.close()
  for(const[k,v]of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v
 }
})
result.businessSHA256=await fileSha(business);assert.equal(result.businessSHA256,before)
if(stage==='cold'){const prior=await read(join(evidence,'installed-result.json'));assert.notEqual(result.pid,prior.pid);assert.equal(result.businessSHA256,prior.businessSHA256);assert.equal(result.recordRevision,prior.recordRevision)}
await fs.writeFile(join(evidence,`${stage}-result.json`),JSON.stringify(result,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify(result))
