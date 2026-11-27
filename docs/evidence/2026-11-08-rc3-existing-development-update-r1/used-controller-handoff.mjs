/** Offline controller identity handoff only; never starts an App or applies a Host plugin. */
import fs from 'node:fs'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash,randomUUID} from 'node:crypto'
import {canonicalDirectory,assertInstalledPath} from '../patches/storage-json-single-owner/installed-lease.mjs'
import {acquireJsonRootOwnership} from '../patches/storage-json-single-owner/ownership.mjs'
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const bytes=x=>Buffer.isBuffer(x)?x:Buffer.from(JSON.stringify(x,null,2)+'\n')
function save(p,x){fs.writeFileSync(p,bytes(x),{flag:'wx',mode:0o600})}
function atomic(p,x){const temp=p+'.'+randomUUID()+'.tmp';try{save(temp,x);fs.renameSync(temp,p)}finally{if(fs.existsSync(temp))fs.unlinkSync(temp)}}
const id=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)
export async function handoffFInstalledController({root,expectedCurrent,expectedOldControllerSHA256,bundle,expectedBundleSHA256,expectedNewControllerSHA256}){
 if(![expectedCurrent,expectedOldControllerSHA256,expectedBundleSHA256,expectedNewControllerSHA256].every(id)||expectedOldControllerSHA256===expectedNewControllerSHA256)throw Error('explicit distinct controller and bundle identities required')
 canonicalDirectory(root);canonicalDirectory(bundle)
 const key='scripts/f-installed-runtime.mjs',control=assertInstalledPath(root,join(root,'control',key),{directory:false}),incoming=assertInstalledPath(bundle,join(bundle,'payload/controller',key),{directory:false}),statePath=join(root,'installation.json')
 if(hash(control)!==expectedOldControllerSHA256||hash(incoming)!==expectedNewControllerSHA256)throw Error('controller handoff source hash mismatch')
 const oldAPI=await import(pathToFileURL(control).href),newAPI=await import(pathToFileURL(incoming).href)
 oldAPI.checkFInstallation(root);newAPI.verifyFBundle(bundle,expectedBundleSHA256)
 // This transaction changes one controller, not its gate, ownership implementation or Node.
 for(const p of oldAPI.installationControlFiles.filter(p=>p!==key))if(hash(join(root,'control',p))!==hash(join(bundle,'payload/controller',p)))throw Error('controller handoff cannot change gate or ownership implementation')
 if(hash(join(root,'control/node'))!==hash(join(bundle,'payload/node/bin/node')))throw Error('controller handoff cannot change Node')
 return oldAPI.withInstalledWriter(root,'maintenance',async()=>{
  const stateBytes=fs.readFileSync(statePath),state=JSON.parse(stateBytes)
  if(state.current!==expectedCurrent||hash(control)!==expectedOldControllerSHA256)throw Error('installed current/controller revision conflict')
  const owner=await acquireJsonRootOwnership(join(root,'data/home/storages'))
  let journal,marked=false,mutated=false
  const marker=join(root,'RECOVERY_REQUIRED'),transaction=randomUUID()
  const ownsMarker=()=>fs.existsSync(marker)&&read(marker).controllerHandoff===transaction
  let originals
  try{
   originals=new Map(oldAPI.installationControlFiles.map(p=>[p,fs.readFileSync(join(root,'control',p))]))
   oldAPI.checkFInstallation(root);newAPI.verifyFBundle(bundle,expectedBundleSHA256)
   if(!fs.readFileSync(statePath).equals(stateBytes))throw Error('installed metadata changed before handoff')
   const evidence=assertInstalledPath(root,join(root,'data/evidence'))
   journal=join(evidence,'controller-handoff-'+transaction);fs.mkdirSync(journal,{mode:0o700})
   fs.mkdirSync(join(journal,'before'),{mode:0o700});save(join(journal,'before/installation.json'),stateBytes)
   for(const [p,content]of originals){const target=join(journal,'before/control',p);fs.mkdirSync(join(target,'..'),{recursive:true,mode:0o700});save(target,content)}
   save(join(journal,'request.json'),{schemaVersion:1,root,expectedCurrent,expectedOldControllerSHA256,expectedNewControllerSHA256,bundle,expectedBundleSHA256,transaction,startedAtUTC:new Date().toISOString(),realCallBudget:0,AppHostBoot:false})
   save(marker,{controllerHandoff:transaction,reason:'controller handoff incomplete; startup refused',journal});marked=true
   mutated=true;atomic(control,fs.readFileSync(incoming))
   const controlFiles=Object.fromEntries(oldAPI.installationControlFiles.map(p=>[p,hash(assertInstalledPath(root,join(root,'control',p),{directory:false}))]))
   if(controlFiles[key]!==expectedNewControllerSHA256)throw Error('controller changed during handoff')
   atomic(statePath,{...state,controlFiles})
   if(!ownsMarker())throw Error('controller handoff recovery marker changed')
   fs.unlinkSync(marker);marked=false
   const report=newAPI.checkFInstallation(root)
   const result={status:'CONTROLLER_HANDOFF_CHECKED',journal,root,current:report.current,oldControllerSHA256:expectedOldControllerSHA256,newControllerSHA256:expectedNewControllerSHA256,endedAtUTC:new Date().toISOString(),realCallBudget:0,AppHostBoot:false}
   save(join(journal,'result.json'),result);return result
  }catch(error){
   if(mutated){
    try{
     // Exact snapshots, not regenerated expected hashes, are the rollback authority.
     if(!fs.existsSync(marker)){save(marker,{controllerHandoff:transaction,reason:'controller handoff rollback',journal});marked=true}
     if(!ownsMarker())throw Error('foreign recovery marker prevents rollback')
     for(const [p,content]of originals)atomic(join(root,'control',p),content)
     atomic(statePath,stateBytes);fs.unlinkSync(marker);marked=false;oldAPI.checkFInstallation(root)
     save(join(journal,'result.json'),{status:'CONTROLLER_HANDOFF_ROLLED_BACK',failure:error.message,endedAtUTC:new Date().toISOString()})
    }catch(rollbackError){
     if(!fs.existsSync(marker))save(marker,{controllerHandoff:transaction,reason:'controller rollback incomplete',journal})
     throw new Error('controller handoff recovery incomplete; explicit repair required',{cause:rollbackError})
    }
   }else if(marked&&ownsMarker()){fs.unlinkSync(marker);marked=false}
   throw error
  }finally{owner.release()}
 })
}
