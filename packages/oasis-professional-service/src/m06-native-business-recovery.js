import fs from 'node:fs'
import {isAbsolute,relative,sep,join,resolve,dirname} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {z} from 'zod'
import {v340Commands,v340Id,getV340Versions} from './v340-runtime-contract.js'
import {hasPendingUnifiedRun} from './generation-contract.js'
import {isOasisRemoteExecutionUnresolved} from './workbench-contract.js'

export const nativeBusinessRecoveryMarker=Object.freeze({schemaVersion:1,policy:'m06-native-business-recovery-v1'})
export const nativeBusinessRecoveryEndpoints=Object.freeze([
 'state/get','workflow/catalog','workflow/v340/catalog','workflow/v340/task/select',
 'workflow/v340/result/draft','workflow/v340/result/edit','workflow/v340/result/review',
 'workflow/v340/result/prepare-save','workflow/v340/result/commit-save',
 'workflow/v340/result/conversation-draft','workflow/v340/result/saved-file',
])
const scopeSchema=z.object({...Object.fromEntries(Object.entries(nativeBusinessRecoveryMarker).map(([k,v])=>[k,z.literal(v)])),
 root:z.string(),workspaceId:v340Id,workspacePath:z.string(),taskId:v340Id,runId:v340Id,inputSha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict()
const selectionSchema=z.object({workspaceId:v340Id,taskId:v340Id,expectedRevision:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)}).strict()
const getSchema=z.object({workspaceId:v340Id}).strict()
const fail=()=>{throw Object.assign(Error('本次仅开放绑定项目的合成业务恢复，操作范围或状态已变化。'),{code:'NATIVE_BUSINESS_RECOVERY_DENIED'})}
function canonical(path){
 try{if(!isAbsolute(path)||fs.realpathSync(path)!==path||!fs.lstatSync(path).isDirectory()||fs.lstatSync(path).isSymbolicLink())fail()}catch{fail()}
 return path
}
const inside=(root,path)=>{const r=relative(root,path);return r!=='..'&&!r.startsWith('..'+sep)&&!isAbsolute(r)}
const clone=x=>Object.freeze(structuredClone(x))

export const nativeBusinessRecoveryGuardFiles=Object.freeze(['src/index.js','src/workbench-rpc.js','src/workbench-connection.js','src/m06-native-business-recovery.js','src/v340-runtime-contract.js','lib/client.js'])
export async function loadNativeBusinessRecoveryScope({env=process.env,moduleFile=fileURLToPath(import.meta.url)}={}){
 const invalid=()=>{throw Object.assign(Error('本地业务恢复安装策略或租约无效，未开放任何业务动作。'),{code:'NATIVE_BUSINESS_RECOVERY_INVALID'})}
 try{
  if(env.OASIS_NATIVE_BUSINESS_RECOVERY!=='1'||env.OASIS_NATIVE_ZERO_GENERATION==='1'||env.OASIS_UNIFIED_FIXTURE==='1'||env.OASIS_NATIVE_OFFLINE==='1')invalid()
  const root=resolve(dirname(moduleFile),'../../../../..')
  if(root!==env.DSH_OASIS_INSTALL_ROOT)invalid()
  canonical(root)
  const digest=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
  const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
  const state=read(join(root,'installation.json')),release=join(root,'releases',state.current),template=read(join(release,'profile-template.json'))
  const component=template.components?.['oasis-professional-service']
  if(component!=='components/c3'||moduleFile!==join(release,component,'src/m06-native-business-recovery.js'))invalid()
  const gatePath=join(root,'control/patches/storage-json-single-owner/installed-lease.mjs')
  if(digest(gatePath)!==state.gateSHA256||state.controlFiles?.['patches/storage-json-single-owner/installed-lease.mjs']!==state.gateSHA256)invalid()
  const gate=await import(pathToFileURL(gatePath).href)
  gate.assertInstalledPath(root,gatePath,{directory:false})
  gate.assertInstalledLease(join(root,'data/home/storages'),env)
  const policy=template.nativeBusinessRecovery
  if(template.nativeZeroGeneration||policy?.schemaVersion!==1||policy.policy!==nativeBusinessRecoveryMarker.policy
    ||!/^[a-f0-9]{64}$/.test(policy.archiveSHA256??'')||JSON.stringify(policy.budget)!==JSON.stringify({model:0,api:0,upload:0,payment:0})
    ||Object.keys(policy.guardedFiles??{}).sort().join()!==[...nativeBusinessRecoveryGuardFiles].sort().join())invalid()
  for(const f of nativeBusinessRecoveryGuardFiles){const p=join(release,component,f);gate.assertInstalledPath(root,p,{directory:false});if(digest(p)!==policy.guardedFiles[f])invalid()}
  const scope=scopeSchema.parse(policy.scope)
  if(scope.root!==root||scope.workspacePath!==join(root,'data/workspace-a'))invalid()
  gate.assertInstalledPath(root,scope.workspacePath)
  return clone(scope)
 }catch{invalid()}
}

// Only trusted Host composition calls this constructor. Browser payloads never supply scope.
export function createM06NativeBusinessRecovery({repository,workspaceRegistry,scope:input}){
 const scope=clone(scopeSchema.parse(input)),tokens=new Map()
 canonical(scope.root);canonical(scope.workspacePath)
 if(!inside(scope.root,scope.workspacePath))fail()
 async function authoritative(){
  canonical(scope.root);canonical(scope.workspacePath)
  const entity=workspaceRegistry.get(scope.workspaceId)
  if(entity?.id!==scope.workspaceId||entity.path!==scope.workspacePath||await entity.status()!=='ok')fail()
  const record=repository.get(scope.workspaceId),task=record.tasks[scope.taskId],run=task?.v340?.runs[scope.runId]
  if(task?.v340?.nodeId!=='Flow-2-6'||run?.status!=='completed'||run.source!=='local-skill'||run.evidenceKind!=='synthetic'
    ||run.inputSha256!==scope.inputSha256||run.workspaceId!==scope.workspaceId||run.taskId!==scope.taskId)fail()
  if(Object.values(record.tasks).some(t=>hasPendingUnifiedRun(t)||Object.values(t.remoteExecutions).some(isOasisRemoteExecutionUnresolved)))fail()
  return{record,task,run}
 }
 async function selectV340Task(input){
  const c=selectionSchema.parse(input)
  if(c.workspaceId!==scope.workspaceId||c.taskId!==scope.taskId)fail()
  await authoritative()
  return repository.mutate(c.workspaceId,c.expectedRevision,async record=>{
   const current=await authoritative()
   if(current.record.revision!==record.revision)fail()
   return record.activeTaskId===c.taskId?record:{...record,activeTaskId:c.taskId}
  })
 }
 function wrap(dispatch){
  return async(endpoint,payload)=>{
   if(!nativeBusinessRecoveryEndpoints.includes(endpoint))return{ok:false,error:{code:'NATIVE_BUSINESS_RECOVERY_DENIED',message:'本次业务恢复未开放此操作。',details:{}}}
   try{
    const {record,run}=await authoritative()
    if(endpoint==='workflow/v340/task/select')return{ok:true,value:await selectV340Task(payload)}
    if(endpoint==='state/get'){
     if(getSchema.parse(payload).workspaceId!==scope.workspaceId)fail()
    }else if(endpoint.startsWith('workflow/v340/result/')){
     const action=endpoint.slice('workflow/v340/'.length),c=v340Commands[action].parse(payload)
     if(action==='result/commit-save'){
      const remembered=tokens.get(c.confirmationToken)
      tokens.delete(c.confirmationToken)
      if(!remembered||remembered.revision!==record.revision||remembered.workspaceId!==scope.workspaceId)fail()
     }else{
      if(c.workspaceId!==scope.workspaceId||c.taskId!==scope.taskId||c.runId!==scope.runId)fail()
      const versions=getV340Versions(run)
      if(action==='result/draft'){
       if(c.format!=='core-markdown'||versions.filter(v=>v.result.sha256===c.baseSha256).length!==1)fail()
      }else if(!versions.some(v=>v.versionId===c.versionId&&v.result.sha256===(c.resultSha256??c.baseSha256)))fail()
      if(action==='result/edit'&&c.m06Structure!==undefined)fail()
     }
    }
    const result=await dispatch(endpoint,payload)
    if(result.ok&&endpoint==='workflow/v340/result/prepare-save'){
     const current=await authoritative()
     if(current.record.revision!==record.revision)fail()
     tokens.set(result.value.confirmationToken,clone({workspaceId:scope.workspaceId,taskId:scope.taskId,runId:scope.runId,
      versionId:payload.versionId,resultSha256:payload.resultSha256,revision:record.revision,workspacePath:scope.workspacePath}))
    }
    if(result.ok&&endpoint==='workflow/v340/catalog')return{ok:true,value:{...result.value,nativeBusinessRecovery:nativeBusinessRecoveryMarker,
     nodes:result.value.nodes.map(({m06Candidate,...node})=>node)}}
    if(result.ok&&endpoint==='workflow/catalog')return{ok:true,value:{...result.value,apiExecutionAvailable:false,localGenerationEnabled:false,localGenerationKind:null}}
    return result
   }catch(error){
    return{ok:false,error:{code:error?.code==='NATIVE_BUSINESS_RECOVERY_DENIED'?error.code:'NATIVE_BUSINESS_RECOVERY_INVALID',message:'本次恢复范围或输入无效；原记录保留。',details:{}}}
   }
  }
 }
 return Object.freeze({wrap,selectV340Task,validate:authoritative})
}
