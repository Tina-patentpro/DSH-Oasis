// Actual installed rc.3, public SDK/read-only business checks; no App or Host apply.
import fs from 'node:fs/promises'
import cp from 'node:child_process'
import assert from 'node:assert/strict'
import {dirname,join,resolve} from 'node:path'
import {createRequire} from 'node:module'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'
const evidence=dirname(fileURLToPath(import.meta.url)),project=resolve(evidence,'../../..')
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),binding=await read(join(evidence,'target-binding.json'))
const identity=await read(join(project,'docs/evidence/2026-11-08-m06-recovery-ui-gap-r1/bundle-identity.json')),scope=identity.scope,root=binding.root
const counters={network:0,disallowedProcess:0},deny=k=>()=>{counters[k]++;throw Error('Offline installed verification refused '+k)}
globalThis.fetch=deny('network');http.request=http.get=https.request=https.get=deny('network')
net.connect=net.createConnection=net.Socket.prototype.connect=tls.connect=deny('network')
const exec=cp.execFileSync;cp.execFileSync=(file,args,options)=>file==='/bin/ps'?exec(file,args,options):deny('disallowedProcess')()
cp.spawn=cp.spawnSync=cp.exec=cp.execSync=cp.execFile=cp.fork=deny('disallowedProcess')
const sha=b=>createHash('sha256').update(b).digest('hex'),hash=async p=>sha(await fs.readFile(p))
const business=join(root,'data/home/storages/oasis_workbench.json'),before=await hash(business)
assert.equal(before,'ea5d5e2f294e5d19f269684438b23993e2f95b6caf4c4ef45115d189c6becca8')
const api=await import(pathToFileURL(join(root,'control/scripts/f-installed-runtime.mjs')).href)
const release=join(root,'releases',binding.bundleSHA256),component=join(release,'components/c3')
const installed=async name=>import(pathToFileURL(join(component,'src',name)).href)
const {loadNativeBusinessRecoveryScope}=await installed('m06-native-business-recovery.js')
const specProof=await api.withInstalledLaunchSpec(root,async spec=>{
 assert.equal(spec.current,binding.bundleSHA256);assert.equal(spec.nativeBusinessRecovery,true);assert.equal(spec.nativeZeroGeneration,false)
 assert.equal(spec.env.OASIS_NATIVE_BUSINESS_RECOVERY,'1');assert.equal(spec.env.OASIS_NATIVE_ZERO_GENERATION,undefined)
 assert.deepEqual(await loadNativeBusinessRecoveryScope({env:spec.env}),scope)
 return {trustedScopeAndLiveLease:true,preparedLaunchSpecOnly:true,spawned:false}
})
const result=await api.withInstalledWriter(root,'sdk',async report=>{
 assert.equal(report.current,binding.bundleSHA256)
 const previous={};for(const[k,v]of Object.entries(report.env)){previous[k]=process.env[k];process.env[k]=v}
 const req=createRequire(join(release,'App/DSH Desktop.app/Contents/Resources/app/package.json')),load=async name=>import(pathToFileURL(req.resolve(name)).href)
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
  const handler=createWorkbenchRpcHandler(service,null,null,null,{m06Candidate013:true,nativeBusinessRecovery:mode}),record=repository.get(scope.workspaceId),run=record.tasks[scope.taskId].v340.runs[scope.runId]
  assert.equal(record.revision,15);assert.equal(record.activeTaskId,scope.taskId);assert.equal(run.resultVersions.length,3)
  assert.equal(run.activeVersionId,'revision-f87ff184-abf4-4b04-94ab-5253f4c70ce7')
  assert.deepEqual(run.resultVersions.map(v=>v.result.snapshot.warnings.length),[7,9,11])
  assert.equal((await handler('state/get',{workspaceId:scope.workspaceId})).ok,true)
  const catalog=await handler('workflow/catalog',{});assert.equal(catalog.ok,true);assert.equal(catalog.value.localGenerationEnabled,false);assert.equal(catalog.value.apiExecutionAvailable,false)
  const nodes=await handler('workflow/v340/catalog',{});assert.equal(nodes.ok,true);assert.equal(nodes.value.nativeBusinessRecovery.policy,scope.policy)
  const fileResults=[]
  for(const [version,matches]of [[run.resultVersions[1],false],[run.resultVersions[2],true]]){
   assert.equal(version.review.status,'approved')
   const target={workspaceId:scope.workspaceId,taskId:scope.taskId,runId:scope.runId,expectedRevision:record.revision,versionId:version.versionId,resultSha256:version.result.sha256}
   const opened=await handler('workflow/v340/result/saved-file',{...target,writebackId:version.writebacks[0].writebackId})
   assert.equal(opened.ok,true);assert.equal(opened.value.matchesReviewed,matches)
   const draft=await handler('workflow/v340/result/conversation-draft',target);assert.equal(draft.ok,true);assert.ok(draft.value.text.includes(version.result.sha256))
   fileResults.push({versionId:version.versionId,reviewedSHA256:version.result.sha256,currentSHA256:opened.value.currentSha256,matchesReviewed:matches,fixedMaterialsFormattedOnly:true})
  }
  const forbidden=['state/replace','workflow/v340/candidate/run','account/status','import/open','workflow/v340/run/observe']
  for(const endpoint of forbidden)assert.equal((await handler(endpoint,{})).ok,false)
  assert.equal((await handler('state/get',{workspaceId:'unbound-workspace'})).ok,false)
  assert.deepEqual(repository.get(scope.workspaceId),record)
  const {recordToWorkspaceState}=await installed('client/workbench-model.js'),{PanelPages}=await installed('client/PanelPages.js'),{PanelChrome}=await installed('client/PanelChrome.js'),{FunctionCenter}=await installed('client/FunctionCenter.js')
  const {renderToStaticMarkup}=await load('react-dom/server')
  const state={...recordToWorkspaceState(record),activePageId:null,catalogStatus:'ready',v340Catalog:{...service.getV340Catalog(),nativeBusinessRecovery:{schemaVersion:1,policy:scope.policy}}}
  const view=PanelPages({state,showFunctionCenter:false,v340Actions:{resume(){},create(){throw Error('creation refused')}},onImport(){throw Error('import refused')}})
  assert.equal(view.type,FunctionCenter)
  const html=renderToStaticMarkup(view);assert.match(html,/重新打开 原生业务恢复合成样例/);assert.match(html,/<button[^>]*disabled=""[^>]*>从网站导入<\/button>/)
  const elements=e=>!e||typeof e!=='object'?[]:[e,...[e.props?.children].flat(Infinity).flatMap(elements)]
  const create=elements(PanelChrome({state,onCreatePage(){throw Error('creation refused')}})).find(e=>e.props?.['data-testid']==='oasis-new-page')
  assert.equal(create.props.disabled,true);assert.equal(create.props.onClick,undefined)
  const sessions=await context.sessionPersistence.list();assert.equal(sessions.length,2)
  return {status:'ACTUAL_INSTALLED_RC3_READONLY_COMPOSITION_CHECKED',pid:process.pid,bundleSHA256:report.current,archiveSHA256:binding.archiveSHA256,actualInstalledBusinessCode:true,sourceFallback:false,actualOfficialWorkspaceRegistry:true,recordRevision:record.revision,activeTaskId:record.activeTaskId,activeVersionId:run.activeVersionId,versionCount:run.resultVersions.length,warningCounts:[7,9,11],fileResults,forbiddenEndpointsRefused:forbidden,retainedSessionCount:sessions.length,UIFixObservedAsSSR:true,nativeUIRetested:false,scopeProof:specProof,counters,AppHostBoot:false,newBusinessRuns:0}
 }finally{
  await service?.closeV340Runtime();await repository?.close();await context?.fiber.dispose();await facility?.closeAll();await backend?.close()
  for(const[k,v]of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v
 }
})
result.businessSHA256=await hash(business);assert.equal(result.businessSHA256,before)
await fs.writeFile(join(evidence,'installed-readonly-result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify(result))
