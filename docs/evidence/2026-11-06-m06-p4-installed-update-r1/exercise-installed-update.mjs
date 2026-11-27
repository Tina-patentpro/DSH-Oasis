import fs from 'node:fs/promises';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import * as api from '../../../scripts/f-installed-runtime.mjs';
const folder=dirname(fileURLToPath(import.meta.url)),repoRoot=resolve(folder,'../../..');
const spec=JSON.parse(await fs.readFile(join(folder,'update-spec.json'),'utf8'));
const root=spec.root,workspaceId='p4-unknown-workspace',taskId='p4-unknown-task';
const storage=join(root,'data/home/storages'),businessFile=join(storage,'oasis_workbench.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
const hash=async p=>sha(await fs.readFile(p));
const save=async(name,v)=>fs.writeFile(join(folder,name),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const stages=[],log=(stage,details={})=>{stages.push({stage,time:new Date().toISOString(),...details});console.log(JSON.stringify(stages.at(-1)));};
let realFetchAttempts=0,syntheticInitialExecutions=0,postSeedDispatchAttempts=0,appSpawnAttempts=0;
globalThis.fetch=()=>{realFetchAttempts++;throw Error('No real calls authorized');};
cp.spawn=()=>{appSpawnAttempts++;throw Error('No application spawn authorized');};
async function withSdk(callback){
 return api.withInstalledWriter(root,'sdk',async report=>{
  const release=join(root,'releases',report.current),previousEnv={};
  for(const [key,value]of Object.entries(report.env)){previousEnv[key]=process.env[key];process.env[key]=value;}
  let backend,facility,repository,service;
  try{
   const appRequire=createRequire(join(release,'App/DSH Desktop.app/Contents/Resources/app/package.json'));
   const {JsonStorageBackend}=await import(pathToFileURL(appRequire.resolve('@deepseek-ai/dsh-storage-json')).href);
   const {createSingleOwnerJsonBackend}=await import(pathToFileURL(join(release,'components/c5/index.mjs')).href);
   backend=await createSingleOwnerJsonBackend(storage,JsonStorageBackend);
   const pkg=join(release,'components/c3');
   const {openOasisWorkbenchRepository}=await import(pathToFileURL(join(pkg,'src/workbench-repository.js')).href);
   const {createWorkbenchService}=await import(pathToFileURL(join(pkg,'src/workbench-service.js')).href);
   const {DomainFacility}=await import(pathToFileURL(appRequire.resolve('@deepseek-ai/dsh-storage-domain')).href);
   // Real Domain -> descriptor -> real backend. Only Context event delivery is a sink.
   facility=new DomainFacility({storage:{backend:{get:name=>{assert.equal(name,'json');return backend;}}},
    emit(){},logger:{warn:message=>{throw Error(message);},error:message=>{throw Error(message);}}},{backend:'json'});
   repository=await openOasisWorkbenchRepository(facility);
   const record=()=>repository.get(workspaceId),command=extra=>({workspaceId,taskId,expectedRevision:record().revision,...extra});
   const registry={get:id=>id===workspaceId?{path:join(root,'data/workspace-a'),async status(){return'ok';}}:undefined};
   service=createWorkbenchService({repository,workspaceRegistry:registry,
    v340Executor:{evidenceKind:'synthetic',async generate(){
     if(syntheticInitialExecutions===0){syntheticInitialExecutions++;return{status:'unknown',code:'EXECUTION_UNCONFIRMED'};}
     postSeedDispatchAttempts++;throw Error('UNKNOWN must never redispatch');
    }}});
   return await callback({report,release,pkg,repository,service,record,command});
  }finally{
   await service?.closeV340Runtime();await repository?.close();await facility?.closeAll();await backend?.close();
   for(const [key,value]of Object.entries(previousEnv))if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
 });
}
async function observeLocked(expectedRecord,label){
 let output;
 await withSdk(async({report,service,record,command})=>{
  const initial=record();if(expectedRecord)assert.deepEqual(initial,expectedRecord);
  const task=initial.tasks[taskId],runId=task.v340.activeRunId,unknown=structuredClone(task.v340.runs[runId]);
  assert.equal(unknown.status,'unknown');assert.equal(unknown.evidenceKind,'synthetic');
  await service.observeV340Run({workspaceId,taskId,runId});
  assert.deepEqual(record(),initial,'observe UNKNOWN must not alter or redispatch');
  await assert.rejects(()=>service.updateV340Draft(command({draft:{source:'local-skill',textInputs:{disclosure_text:'do not replace unknown input'},filePaths:{},configuration:{}}})),e=>e.code==='V340_RUN_UNRESOLVED');
  await assert.rejects(()=>service.createV340Run(command({requestKey:'new-dispatch-'+label})),e=>e.code==='WORKSPACE_GENERATION_ACTIVE');
  await service.createV340Run(command({requestKey:unknown.requestKey}));
  assert.deepEqual(record(),initial,'replayed request must return existing UNKNOWN without mutation');
  assert.equal(postSeedDispatchAttempts,0);
  output={current:report.current,record:initial,unknown,checks:{observePreserved:true,inputEditRefused:true,newRunRefused:true,sameKeyDidNotRedispatch:true}};
 });
 log(label,{current:output.current,status:output.unknown.status});return output;
}

let base;
if(process.argv[2]==='--resume-installed-base'){
 base=api.checkFInstallation(root);assert.equal(base.current,spec.base.expectedSHA256);
 await assert.rejects(()=>fs.stat(businessFile),e=>e.code==='ENOENT');
 log('resume-known-base-after-descriptor-boundary-failure',{current:base.current,businessFileAbsent:true});
}else{
 assert.equal(process.argv[2],undefined);log('install-base-begin');base=await api.installFBundle({...spec.base,root});
}
assert.equal(base.current,spec.base.expectedSHA256);
log('install-base-complete',{current:base.current});
let seeded,runId;
await withSdk(async({service,record,command})=>{
 await service.createV340Task(command({nodeId:'Flow-2-6',title:'P4 synthetic UNKNOWN preservation fixture; no real request'}));
 await service.updateV340Draft(command({draft:{source:'local-skill',textInputs:{disclosure_text:'公开合成材料，仅用于UNKNOWN更新保全，不用于生成或申报。'},filePaths:{},configuration:{}}}));
 await service.createV340Run(command({requestKey:'p4-synthetic-unknown-no-real-call'}));
 runId=record().tasks[taskId].v340.activeRunId;
 for(let i=0;i<100&&record().tasks[taskId].v340.runs[runId].status==='prepared';i++)await new Promise(ok=>setTimeout(ok,2));
 assert.equal(record().tasks[taskId].v340.runs[runId].status,'unknown');seeded=structuredClone(record());
 const stateBefore=await hash(join(root,'installation.json'));
 await assert.rejects(()=>api.upgradeFInstallation(root,{...spec.target,expectedCurrent:spec.base.expectedSHA256}),e=>e.code==='F_INSTALL_BUSY');
 assert.equal(await hash(join(root,'installation.json')),stateBefore);
 assert.equal(api.checkFInstallation(root).current,spec.base.expectedSHA256);
});
assert.equal(syntheticInitialExecutions,1);const beforeSHA=await hash(businessFile);
await fs.writeFile(join(root,'data/workspace-a/public-note.md'),'PUBLIC note before update\n',{flag:'wx'});
await save('synthetic-unknown-before.json',{classification:'SYNTHETIC_UNKNOWN_CREATED_VIA_PUBLIC_SERVICE_ON_ACTUAL_INSTALLED_BACKEND',record:seeded,storageFile:businessFile,storageSHA256:beforeSHA,realRequest:false});
log('unknown-seeded-busy-upgrade-refused',{runId,businessSHA256:beforeSHA});
const before=await observeLocked(seeded,'before-upgrade-reopen');
assert.equal(await hash(businessFile),beforeSHA);
log('upgrade-begin');
const upgraded=await api.upgradeFInstallation(root,{...spec.target,expectedCurrent:spec.base.expectedSHA256});
assert.equal(upgraded.current,spec.target.expectedSHA256);assert.equal(await hash(businessFile),beforeSHA);
log('upgrade-complete',{current:upgraded.current});
const after=await observeLocked(seeded,'after-upgrade-reopen');assert.equal(await hash(businessFile),beforeSHA);
await fs.appendFile(join(root,'data/workspace-a/public-note.md'),'PUBLIC later edit after upgrade\n');
const noteSHA=await hash(join(root,'data/workspace-a/public-note.md'));
log('rollback-begin');
const rolled=await api.rollbackFInstallation(root,{releaseId:spec.base.expectedSHA256,expectedCurrent:spec.target.expectedSHA256});
assert.equal(rolled.current,spec.base.expectedSHA256);assert.equal(await hash(businessFile),beforeSHA);
assert.equal(await hash(join(root,'data/workspace-a/public-note.md')),noteSHA);
const rollback=await observeLocked(seeded,'after-rollback-reopen');
assert.equal(await hash(businessFile),beforeSHA);assert.equal(await hash(join(root,'data/workspace-a/public-note.md')),noteSHA);
for(const path of ['startup.lock','data/startup.lock'])await assert.rejects(()=>fs.stat(join(root,path)),e=>e.code==='ENOENT');
assert.equal(realFetchAttempts,0);assert.equal(postSeedDispatchAttempts,0);assert.equal(appSpawnAttempts,0);
const result={scope:'ACTUAL_INSTALLED_CONTROLLER_AND_STORAGE_BACKEND_WITH_PUBLIC_SYNTHETIC_UNKNOWN_NO_APP',root,
 base,upgraded,rolledBack:rolled,fixture:{workspaceId,taskId,runId,evidenceKind:'synthetic',realRequest:false,businessSHA256:beforeSHA},
 before,after,rollback,busyUpgradeRefused:true,businessBytesPreserved:true,laterNotePreserved:true,laterNoteSHA256:noteSHA,
 syntheticInitialExecutions,postSeedDispatchAttempts,realFetchAttempts,appSpawnAttempts,locksReleased:true,
 exactTargetArchiveSHA256:spec.archiveSHA256,targetProgramRetained:join(root,'releases',spec.target.expectedSHA256),
 appRuntimeAccepted:false,professionalOrUserAccepted:false,releaseAccepted:false,stages};
await save('installed-update-result.json',result);log('completed',{businessSHA256:beforeSHA,syntheticInitialExecutions,postSeedDispatchAttempts,appSpawnAttempts,realFetchAttempts});
