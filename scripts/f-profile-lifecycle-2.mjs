/** Revision 2: fixed no-model Profile lifecycle, with common data-root link checks. */
import fs from 'node:fs'
import childProcess from 'node:child_process'
import {resolve,join,dirname,isAbsolute,relative,sep} from 'node:path'
import {fileURLToPath} from 'node:url'
import {randomUUID} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {createFAssembly,verifyFAssembly,sealFAssembly} from './f-development-assembly.mjs'
import {fileHash,acquireLaunchLock,assertConfined,makeLaunchSpec,startOwnedChild} from './macos-development-launch.mjs'
import {acquireJsonRootOwnership} from '../patches/storage-json-single-owner/ownership.mjs'
const script=fileURLToPath(import.meta.url),repo=resolve(dirname(script),'..')
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const encode=x=>JSON.stringify(x,null,2)+'\n'
const save=(p,x)=>fs.writeFileSync(p,encode(x),{flag:'wx',mode:0o600})
const fail=(code,message)=>Object.assign(Error(message),{code})
const metadata=['pnpm-lock.yaml','node_modules/.modules.yaml','node_modules/.pnpm-workspace-state-v1.json','node_modules/.package-map.json']
const idOK=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)
function sources(){return Object.fromEntries([script,join(repo,'scripts/f-development-assembly.mjs'),join(repo,'scripts/macos-development-launch.mjs'),join(repo,'patches/storage-json-single-owner/ownership.mjs'),join(repo,'tools/bin/pnpm'),join(repo,'tools/pnpm-11.8.0/bin/pnpm.mjs')].map(p=>[p,fileHash(p)]))}
function atomic(p,x){const temp=p+'.'+randomUUID()+'.tmp';save(temp,x);fs.renameSync(temp,p)}
function canonical(root){if(!isAbsolute(root)||fs.realpathSync(root)!==resolve(root))throw Error('canonical management root required');return resolve(root)}
function directory(root,path){
 if(dirname(path)!==root)assertConfined(root,dirname(path))
 if(!fs.existsSync(path))fs.mkdirSync(path,{mode:0o700})
 return assertConfined(root,path)
}
function specOnly(spec){
 if(!spec||Object.keys(spec).some(k=>!['baseAdmission','checkpoint3','checkpoint4'].includes(k)))throw Error('only fixed base and explicit checkpoint are supported; fixtures/overrides refused')
 return spec
}
function tree(root){
 const out={}
 function walk(dir){for(const name of fs.readdirSync(dir).sort()){
  const path=join(dir,name),key=relative(root,path),stat=fs.lstatSync(path)
  if(stat.isSymbolicLink()){
   if(!key.startsWith('node_modules'+sep))throw Error('Profile link outside node_modules refused')
   out[key]={type:'link',target:fs.readlinkSync(path)}
  }else if(stat.isDirectory())walk(path)
  else if(stat.isFile()&&stat.nlink===1)out[key]={type:'file',sha256:fileHash(path)}
  else throw Error('unsupported Profile file identity')
 }}
 walk(root);return out
}
function copyProfile(from,to){fs.cpSync(from,to,{recursive:true,dereference:false,verbatimSymlinks:true,errorOnExist:true,force:false})}
function receipt(root,state,id){
 if(!idOK(id)||!state.releases[id])throw Error('explicit known release required')
 const dir=assertConfined(root,join(root,'releases',id)),path=assertConfined(root,join(dir,'receipt.json'))
 if(fileHash(path)!==state.releases[id])throw Error('release receipt drift')
 const row=read(path),desktop=assertConfined(root,join(dir,'desktop')),admission=assertConfined(root,join(dir,'admission.json'))
 if(row.id!==id||row.runtime!==state.runtime||row.admissionSHA256!==fileHash(admission)||!isDeepStrictEqual(tree(desktop),row.profile))throw Error('release snapshot drift')
 return{row,desktop,admission}
}
function stateFor(root){
 root=canonical(root)
 const state=read(assertConfined(root,join(root,'managed-profile.json')))
 if(state.schemaVersion!==1||state.mode!=='NO_MODEL_F_PROFILE_LIFECYCLE'||state.root!==root||state.runtime!==join(root,'runtime')||!idOK(state.current)||!isDeepStrictEqual(state.controllerInputs,sources()))throw Error('managed Profile source/policy drift')
 assertConfined(root,state.runtime)
 if(fs.existsSync(join(root,'RECOVERY_REQUIRED')))throw Error('incomplete Profile recovery; startup refused')
 return state
}
function validateDataRoots(root,runtime){
 // Metadata only: never read credentials or the contents of user/session/artifact files.
 function inspect(path,deep=false){
  let stat
  try{stat=fs.lstatSync(path)}catch(error){if(error.code==='ENOENT')return;throw error}
  if(stat.isSymbolicLink())throw Error('internal data root link refused')
  assertConfined(root,path)
  if(!stat.isDirectory())throw Error('internal data root must be a directory')
  if(!deep)return
  function walk(dir){for(const name of fs.readdirSync(dir)){
   const child=join(dir,name);let entry
   try{entry=fs.lstatSync(child)}catch(error){if(error.code==='ENOENT')continue;throw error}
   if(entry.isSymbolicLink())throw Error('internal data root descendant link refused')
   if(entry.isDirectory())walk(child)
  }}
  walk(path)
 }
 for(const name of ['user','home','userdata','cache','temp','evidence','workspace-a','workspace-b'])inspect(join(runtime,name))
 for(const name of ['storages','sessions','attachments'])inspect(join(runtime,'home',name),true)
}
export function checkManagedProfile(root){
 const state=stateFor(root),snapshot=receipt(root,state,state.current),path=join(state.runtime,'evidence/f-assembly.json')
 if(fileHash(assertConfined(root,path))!==snapshot.row.admissionSHA256||!isDeepStrictEqual(tree(assertConfined(root,join(state.runtime,'home/profiles/desktop'))),snapshot.row.profile))throw Error('active Profile differs from current release')
 const report=verifyFAssembly(state.runtime,{requireMaterialized:true}),pin=read(path)
 if(pin.fixture)throw Error('managed Profile cannot load a test fixture')
 validateDataRoots(root,state.runtime)
 return{...report,managementRoot:root,current:state.current,conversationVersion:pin.conversationVersion,releaseIds:Object.keys(state.releases)}
}
function gate(root){
 root=canonical(root);let first,second
 try{
  first=acquireLaunchLock(root)
  if(fs.existsSync(join(root,'runtime')))second=acquireLaunchLock(assertConfined(root,join(root,'runtime')))
 }catch(error){first?.();if(error.code==='EEXIST')throw fail('F_PROFILE_BUSY','managed Profile busy or explicit stale marker; no writer entered');throw error}
 return()=>{second?.();first()}
}
export async function withManagedWriter(root,role,callback){
 if(!['desktop','sdk','recovery','maintenance'].includes(role)||typeof callback!=='function')throw Error('explicit supported writer required')
 const release=gate(root)
 try{const report=checkManagedProfile(root);return await callback({root:report.root,current:report.current})}finally{release()}
}
function materialize(root,profile){
 const home=directory(root,join(root,'build-home'))
 directory(root,join(root,'build-cache'));directory(root,join(root,'build-store'))
 const env={HOME:home,PATH:join(repo,'tools/node-v24.21.0-darwin-arm64/bin')+':/usr/bin:/bin',NPM_CONFIG_USERCONFIG:'/dev/null',npm_config_manage_package_manager_versions:'false',COREPACK_ENABLE_NETWORK:'0',CI:'true',XDG_CACHE_HOME:join(root,'build-cache')}
 for(const mode of ['--lockfile-only','--frozen-lockfile'])childProcess.execFileSync(join(repo,'tools/bin/pnpm'),['install','--offline','--ignore-scripts','--config.manage-package-manager-versions=false','--store-dir='+join(root,'build-store'),mode],{cwd:profile,env,stdio:'pipe'})
}
function saveRelease(root,runtime,id){
 const parent=directory(root,join(root,'releases')),dir=directory(root,join(parent,id))
 const desktop=join(runtime,'home/profiles/desktop'),admission=join(runtime,'evidence/f-assembly.json')
 copyProfile(desktop,join(dir,'desktop'));fs.copyFileSync(admission,join(dir,'admission.json'),fs.constants.COPYFILE_EXCL)
 const row={id,runtime,admissionSHA256:fileHash(admission),profile:tree(desktop)}
 if(!isDeepStrictEqual(tree(join(dir,'desktop')),row.profile))throw Error('snapshot copy mismatch')
 save(join(dir,'receipt.json'),row);return fileHash(join(dir,'receipt.json'))
}
export async function installManagedProfile({root,spec}){
 specOnly(spec);root=resolve(root)
 if(fs.realpathSync(dirname(root))!==dirname(root))throw Error('canonical parent without links required')
 if(fs.existsSync(root))throw Error('management output already exists')
 fs.mkdirSync(root,{mode:0o700});const release=gate(root)
 try{
  const runtime=join(root,'runtime');createFAssembly({...spec,root:runtime})
  const runtimeRelease=acquireLaunchLock(runtime)
  try{
   materialize(root,join(runtime,'home/profiles/desktop'));sealFAssembly(runtime)
   const id=randomUUID(),hash=saveRelease(root,runtime,id)
   save(join(root,'managed-profile.json'),{schemaVersion:1,mode:'NO_MODEL_F_PROFILE_LIFECYCLE',root,runtime,current:id,releases:{[id]:hash},controllerInputs:sources()})
  }finally{runtimeRelease()}
  return checkManagedProfile(root)
 }finally{release()}
}
function restore(runtime,snapshot){
 const profile=join(runtime,'home/profiles/desktop');fs.rmSync(profile,{recursive:true});copyProfile(snapshot.desktop,profile)
 const value=read(snapshot.admission);atomic(join(runtime,'evidence/f-assembly.json'),value)
 verifyFAssembly(runtime,{requireMaterialized:true})
}
async function maintenance(root,expectedCurrent,action){
 return withManagedWriter(root,'maintenance',async({root:runtime,current})=>{
  if(current!==expectedCurrent)throw Error('current revision conflict')
  const state=stateFor(root),previous=receipt(root,state,current),storage=directory(root,join(runtime,'home/storages')),owner=await acquireJsonRootOwnership(storage)
  let mutated=false
  try{return await action({runtime,state,previous,markMutating:()=>{mutated=true}})}
  catch(error){
   if(!mutated)throw error
   try{restore(runtime,previous);atomic(join(root,'managed-profile.json'),state)}
   catch{try{save(join(root,'RECOVERY_REQUIRED'),{reason:'restore failed; explicit recovery required'})}catch{};throw fail('F_PROFILE_RECOVERY_REQUIRED','Profile recovery incomplete; startup refused')}
   throw error
  }finally{owner.release()}
 })
}
export async function upgradeManagedProfile(root,{spec,expectedCurrent}){
 specOnly(spec)
 return maintenance(root,expectedCurrent,async({runtime,state,markMutating})=>{
  const id=randomUUID(),stage=directory(root,join(root,'staging'))
  const staged=join(stage,id),pin=createFAssembly({...spec,root:staged}),source=join(staged,'home/profiles/desktop'),profile=join(runtime,'home/profiles/desktop')
  markMutating();fs.rmSync(profile,{recursive:true});copyProfile(source,profile);materialize(root,profile)
  const prefix=source+sep;pin.root=runtime
  pin.files=Object.fromEntries(Object.entries(pin.files).map(([path,hash])=>[path.startsWith(prefix)?profile+sep+path.slice(prefix.length):path,hash]))
  for(const name of metadata)pin.files[join(profile,name)]=fileHash(join(profile,name))
  pin.materialized=true;atomic(join(runtime,'evidence/f-assembly.json'),pin);verifyFAssembly(runtime,{requireMaterialized:true})
  const hash=saveRelease(root,runtime,id)
  atomic(join(root,'managed-profile.json'),{...state,current:id,releases:{...state.releases,[id]:hash}})
  return checkManagedProfile(root)
 })
}
export async function rollbackManagedProfile(root,{releaseId,expectedCurrent}){
 return maintenance(root,expectedCurrent,async({runtime,state,markMutating})=>{
  const target=receipt(root,state,releaseId);markMutating();restore(runtime,target)
  atomic(join(root,'managed-profile.json'),{...state,current:releaseId});return checkManagedProfile(root)
 })
}
export async function startManagedProfile(root){
 return withManagedWriter(root,'desktop',async({root:runtime})=>{
  const pin=read(join(runtime,'evidence/f-assembly.json'))
  if(fs.realpathSync(process.execPath)!==fs.realpathSync(pin.node))throw Error('use pinned Node')
  const spec=makeLaunchSpec({root:runtime,app:pin.app,node:pin.node,acceptance:true});delete spec.env.OASIS_UNIFIED_FIXTURE
  const prefix=join(root,'launch-'+randomUUID()),out=fs.openSync(prefix+'.stdout.log','wx',0o600),err=fs.openSync(prefix+'.stderr.log','wx',0o600)
  let child;const stop=()=>child?.kill('SIGTERM');process.on('SIGTERM',stop);process.on('SIGINT',stop)
  try{
   child=startOwnedChild(spec,{stdio:['ignore',out,err]});await new Promise((ok,no)=>{child.once('spawn',ok);child.once('error',no)})
   save(prefix+'.json',{root,runtime,pid:child.pid,startedAtUTC:new Date().toISOString()});console.log(JSON.stringify({pid:child.pid,root,runtime}))
   const result=await new Promise(ok=>child.once('exit',(code,signal)=>ok({code,signal,endedAtUTC:new Date().toISOString()})))
   save(prefix+'.exit.json',result);if(result.code!==0)throw Error('managed Desktop exited abnormally');return result
  }finally{process.off('SIGTERM',stop);process.off('SIGINT',stop);fs.closeSync(out);fs.closeSync(err)}
 })
}
async function main(){
 const [action,input,arg,expected,...extra]=process.argv.slice(2);if(extra.length||!input)throw Error('explicit lifecycle action and management root required')
 let result
 if(action==='--install'&&arg&&!expected)result=await installManagedProfile({root:input,spec:read(arg)})
 else if(action==='--check'&&!arg)result=checkManagedProfile(input)
 else if(action==='--upgrade'&&arg&&expected)result=await upgradeManagedProfile(input,{spec:read(arg),expectedCurrent:expected})
 else if(action==='--rollback'&&arg&&expected)result=await rollbackManagedProfile(input,{releaseId:arg,expectedCurrent:expected})
 else if(action==='--start'&&!arg)result=await startManagedProfile(input)
 else throw Error('Use --install root spec.json / --check root / --start root / --upgrade root spec.json expectedCurrent / --rollback root releaseId expectedCurrent')
 console.log(JSON.stringify(result))
}
if(process.argv[1]&&resolve(process.argv[1])===script)main().catch(error=>{console.error(error.code??'F_PROFILE_FAILURE',error.message);process.exitCode=1})
