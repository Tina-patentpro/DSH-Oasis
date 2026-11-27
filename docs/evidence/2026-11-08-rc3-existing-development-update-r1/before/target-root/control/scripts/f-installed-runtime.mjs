/** Fixed Mac offline-installation candidate. No model/API dispatch or automatic stale-lock takeover. */
import fs from 'node:fs'
import cp from 'node:child_process'
import {join,resolve,dirname,relative,sep,isAbsolute} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {createHash,randomUUID} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {canonicalDirectory,assertInstalledPath,assertInstalledDataRoots,acquireInstalledLease,assertInstalledLease,installedGateSHA256} from '../patches/storage-json-single-owner/installed-lease.mjs'
import {acquireJsonRootOwnership} from '../patches/storage-json-single-owner/ownership.mjs'
const script=fileURLToPath(import.meta.url)
export const installationVersions=Object.freeze({desktop:'2.0.17',dsh:'0.2.0-rc.2',cordis:'4.0.4',sidebar:'0.24.1',node:'24.21.0',pnpm:'11.8.0'})
export const installationControlFiles=['scripts/f-installed-runtime.mjs','patches/storage-json-single-owner/installed-lease.mjs','patches/storage-json-single-owner/ownership.mjs']
export const installedProviderIndexSHA256='88c6bc7569efab14771daeb6a3e1a084a1c26ecef577db66f8505f2d9d9df56e'
const disabledPlugins=['desktop-updates','session-telemetry-otel','llm-pi-ai','llm-deepseek','llm-deepseek-account','session-title-llm','goal-round-driver','deepseek-account','web-search-deepseek','account-controller','oasis-professional-service']
const componentVersions=checkpoint=>({'@deepseek-ai/dsh-client-ui-primitives':'0.2.0-rc.2.oasis-mac.1','@deepseek-ai/dsh-web-frontend':'0.2.0-rc.2.oasis-mac.1','dsh-better-sidebar':'0.24.1','oasis-professional-service':'0.1.0-rc.2','dsh-desktop-host-file-path-bridge':'0.0.1','dsh-storage-json-single-owner':'0.0.1.oasis-installed.1','@deepseek-ai/dsh-client-ui-conversation':'0.2.0-rc.2.oasis-draft.'+checkpoint})
const metadata=['pnpm-lock.yaml','node_modules/.modules.yaml','node_modules/.package-map.json','node_modules/.pnpm-workspace-state-v1.json']
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
export const installationFileHash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const idOK=id=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id)
const save=(p,x)=>fs.writeFileSync(p,typeof x==='string'?x:JSON.stringify(x,null,2)+'\n',{flag:'wx',mode:0o600})
const copy=(from,to)=>fs.cpSync(from,to,{recursive:true,dereference:false,verbatimSymlinks:true,force:false,errorOnExist:true,mode:fs.constants.COPYFILE_FICLONE})
function atomic(p,x){const tmp=p+'.'+randomUUID()+'.tmp';save(tmp,x);fs.renameSync(tmp,p)}
function inside(root,path){return path===root||path.startsWith(root+sep)}
function fileTree(root,{ignore=[]}={}){
 const out={}
 function walk(dir){for(const name of fs.readdirSync(dir).sort()){
  const p=join(dir,name),key=relative(root,p),st=fs.lstatSync(p)
  if(ignore.some(x=>key===x||key.startsWith(x+sep)))continue
  if(st.isSymbolicLink())out[key]={type:'link',target:fs.readlinkSync(p)}
  else if(st.isDirectory())walk(p)
  else if(st.isFile()&&st.nlink===1)out[key]={type:'file',sha256:installationFileHash(p),mode:st.mode&0o777}
  else throw Error('unsupported installation file identity')
 }}walk(root);return out
}
function validateProgramLinks(root,tree){for(const [key,row]of Object.entries(tree))if(row.type==='link'){
 const p=join(root,key),target=fs.realpathSync(p)
 if(!inside(root,target))throw Error('installed program link escapes release')
}}
export function verifySignedInstallationApp(app){
 cp.execFileSync('/usr/bin/codesign',['--verify','--deep','--strict','-R','=anchor apple generic and certificate leaf[subject.OU] = "UM3Z9G5DNH"',app],{stdio:'pipe'})
 const version=cp.execFileSync('/usr/bin/plutil',['-extract','CFBundleShortVersionString','raw','-o','-',join(app,'Contents/Info.plist')],{encoding:'utf8'}).toString().trim()
 if(version!==installationVersions.desktop)throw Error('fixed signed App version mismatch')
}
function nativeZeroPolicy(release,template){
 if(!Object.hasOwn(template,'nativeZeroGeneration'))return false
 const p=template.nativeZeroGeneration,guards=['src/index.js','src/workbench-rpc.js']
 if(p?.schemaVersion!==1||p.policy!=='m06-native-zero-generation-installed-v1'||!idOK(p.archiveSHA256)
  ||!isDeepStrictEqual(p.budget,{model:0,api:0,upload:0,payment:0})
  ||!isDeepStrictEqual(Object.keys(p.guardedFiles??{}).sort(),guards.toSorted()))throw Error('installed native zero budget/guard policy mismatch')
 for(const file of guards)if(!idOK(p.guardedFiles[file])||installationFileHash(join(release,template.components['oasis-professional-service'],file))!==p.guardedFiles[file])throw Error('installed native zero guard drift')
 return true
}
function nativeRecoveryPolicy(release,template){
 if(!Object.hasOwn(template,'nativeBusinessRecovery'))return false
 const p=template.nativeBusinessRecovery,s=p?.scope,guards=['src/index.js','src/workbench-rpc.js','src/workbench-connection.js','src/m06-native-business-recovery.js','src/v340-runtime-contract.js','lib/client.js']
 if(template.nativeZeroGeneration||p?.schemaVersion!==1||p.policy!=='m06-native-business-recovery-v1'||!idOK(p.archiveSHA256)
  ||!isDeepStrictEqual(p.budget,{model:0,api:0,upload:0,payment:0})||!isDeepStrictEqual(Object.keys(p.guardedFiles??{}).sort(),guards.toSorted())
  ||s?.schemaVersion!==1||s.policy!==p.policy||typeof s.root!=='string'||!isAbsolute(s.root)||resolve(s.root)!==s.root
  ||s.workspacePath!==join(s.root,'data/workspace-a')||!['workspaceId','taskId','runId'].every(k=>typeof s[k]==='string'&&s[k].trim()===s[k]&&s[k].length>0)||!idOK(s.inputSha256))throw Error('installed native recovery policy mismatch')
 for(const file of guards)if(!idOK(p.guardedFiles[file])||installationFileHash(join(release,template.components['oasis-professional-service'],file))!==p.guardedFiles[file])throw Error('installed native recovery guard drift')
 const entries=[]
 function scan(v){if(Array.isArray(v))return v.forEach(scan);if(!v||typeof v!=='object')return
  if(typeof v.id==='string'&&v.id.startsWith('oasis-professional-service-')&&v.disabled!==true)entries.push(v)
  Object.values(v).forEach(scan)
 }scan(template.patch)
 if(entries.length!==1||entries[0].id!=='oasis-professional-service-m06-native-recovery'||entries[0].name!=='@OASIS_RELEASE_ROOT@/'+template.components['oasis-professional-service']+'/src/m06-native-business-recovery-host.js')throw Error('installed recovery entry mismatch')
 return true
}
function verifyPolicy(payload,manifest){
 const template=read(assertInstalledPath(payload,join(payload,'profile-template.json'),{directory:false})),expected=componentVersions(manifest.checkpoint)
 if(template.checkpoint!==manifest.checkpoint||!isDeepStrictEqual(Object.keys(template.components??{}).sort(),Object.keys(expected).sort())||template.manifest?.packageManager!=='pnpm@11.8.0'||template.manifest?.scripts)throw Error('installed component/profile policy mismatch')
 for(const [name,version]of Object.entries(expected)){
  const path=resolve(payload,template.components[name])
  if(!inside(payload,path)||isAbsolute(template.components[name]))throw Error('installed component outside payload root')
  const pkg=read(assertInstalledPath(payload,join(path,'package.json'),{directory:false}))
  if(pkg.name!==name||pkg.version!==version)throw Error('installed component version policy mismatch')
 }
 const bundles=template.manifest?.dsh?.profile?.bundles??[]
 for(const id of ['@deepseek-ai/dsh-base','@deepseek-ai/dsh-web-app','dsh-better-sidebar','oasis-professional-service','dsh-desktop-host-file-path-bridge','dsh-storage-json-single-owner'])if(!bundles.includes(id))throw Error('installed mandatory bundle policy missing')
 const found=new Set()
 function scan(v){if(Array.isArray(v))return v.forEach(scan);if(!v||typeof v!=='object')return
  if(disabledPlugins.includes(v.id)){if(v.disabled!==true)throw Error('installed no-model policy override');found.add(v.id)}
  Object.values(v).forEach(scan)
 }scan(template.patch)
 if(disabledPlugins.some(id=>!found.has(id)))throw Error('installed no-model policy missing')
 const guard=join(payload,template.components['dsh-storage-json-single-owner'])
 if(installationFileHash(join(guard,'index.mjs'))!==installedProviderIndexSHA256||installationFileHash(join(guard,'installed-lease.mjs'))!==installedGateSHA256())throw Error('installed provider lease policy drift')
 nativeZeroPolicy(payload,template)
 nativeRecoveryPolicy(payload,template)
}
export function verifyFBundle(bundle,expectedSHA256){
 canonicalDirectory(bundle)
 if(!idOK(expectedSHA256)||installationFileHash(assertInstalledPath(bundle,join(bundle,'bundle.json'),{directory:false}))!==expectedSHA256)throw Error('bundle manifest hash mismatch')
 const manifest=read(join(bundle,'bundle.json')),payload=assertInstalledPath(bundle,join(bundle,'payload'))
 if(manifest.schemaVersion!==1||manifest.kind!=='OASIS_F_OFFLINE_BUNDLE'||manifest.realCallBudget!==0||!isDeepStrictEqual(manifest.versions,installationVersions)||![3,4].includes(manifest.checkpoint))throw Error('unsupported fixed installation bundle')
 const tree=fileTree(payload),files={},links={}
 for(const [key,row]of Object.entries(tree))if(row.type==='file')files[key]=row.sha256;else links[key]=row.target
 if(!isDeepStrictEqual(files,manifest.files)||!isDeepStrictEqual(links,manifest.links))throw Error('bundle payload file/link drift')
 validateProgramLinks(payload,tree)
 if(installationFileHash(join(payload,'controller/scripts/f-installed-runtime.mjs'))!==installationFileHash(script)
  ||installationFileHash(join(payload,'controller/patches/storage-json-single-owner/installed-lease.mjs'))!==installedGateSHA256())throw Error('bundle controller/gate source mismatch')
 verifyPolicy(payload,manifest)
 return{manifest,payload,id:expectedSHA256}
}
function validateNodeModules(root,cwd){
 for(const name of metadata)assertInstalledPath(root,join(cwd,name),{directory:false})
 const manifest=read(join(cwd,'package.json'))
 for(const [name,value]of Object.entries(manifest.dependencies??{})){
  if(!value.startsWith('link:'))throw Error('only fixed installed runtime links are accepted')
  const expected=fs.realpathSync(resolve(cwd,value.slice(5))),actual=fs.realpathSync(join(cwd,'node_modules',name))
  if(expected!==actual||!inside(root,actual))throw Error('installed dependency target mismatch')
 }
 const map=read(join(cwd,'node_modules/.package-map.json'))
 if(!map.packages||typeof map.packages!=='object')throw Error('invalid fixed pnpm package map')
 for(const pkg of Object.values(map.packages))if(pkg.url){
  const url=new URL(pkg.url,pathToFileURL(join(cwd,'node_modules/.package-map.json')))
  if(url.protocol!=='file:'||!inside(root,fs.realpathSync(fileURLToPath(url))))throw Error('installed module map escapes installation')
 }
}
function materialize(root,release,cwd){
 for(const name of ['build-home','build-cache','build-store']){fs.mkdirSync(join(root,name),{recursive:true,mode:0o700});assertInstalledPath(root,join(root,name))}
 const env={HOME:join(root,'build-home'),PATH:join(release,'node/bin')+':/usr/bin:/bin',COREPACK_ENABLE_NETWORK:'0',NPM_CONFIG_USERCONFIG:'/dev/null',NPM_CONFIG_GLOBALCONFIG:'/dev/null',npm_config_manage_package_manager_versions:'false',CI:'true',XDG_CACHE_HOME:join(root,'build-cache')}
 for(const flag of ['--lockfile-only','--frozen-lockfile'])cp.execFileSync(join(release,'node/bin/node'),[join(release,'pnpm/bin/pnpm.mjs'),'install','--offline','--ignore-scripts','--config.manage-package-manager-versions=false','--store-dir='+join(root,'build-store'),flag],{cwd,env,stdio:'pipe'})
 validateNodeModules(root,cwd)
}
function profilePath(root){return join(root,'data/home/profiles/desktop')}
function applyTemplate(value,release){
 if(typeof value==='string')return value.replaceAll('@OASIS_RELEASE_ROOT@',release)
 if(Array.isArray(value))return value.map(v=>applyTemplate(v,release))
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,applyTemplate(v,release)]))
 return value
}
function activate(root,release){
 const template=read(join(release,'profile-template.json')),profile=profilePath(root)
 fs.mkdirSync(dirname(profile),{recursive:true,mode:0o700});assertInstalledPath(root,dirname(profile))
 if(fs.existsSync(profile)){assertInstalledPath(root,profile);fs.rmSync(profile,{recursive:true})}
 fs.mkdirSync(profile,{mode:0o700})
 const dependencies=Object.fromEntries(Object.entries(template.components).map(([name,path])=>{
  const target=resolve(release,path);if(!inside(release,target))throw Error('installed component escapes release');return[name,'link:'+target]
 }))
 save(join(profile,'package.json'),{...template.manifest,dependencies});save(join(profile,'cordis.yml'),'[]\n')
 save(join(profile,'cordis.patch.yml'),applyTemplate(template.patch,release));save(join(profile,'pnpm-workspace.yaml'),fs.readFileSync(join(release,'pnpm-workspace.yaml'),'utf8'))
 materialize(root,release,profile)
 const nativeZeroGeneration=nativeZeroPolicy(release,template),nativeBusinessRecovery=nativeRecoveryPolicy(release,template)
 if(nativeBusinessRecovery&&template.nativeBusinessRecovery.scope.root!==root)throw Error('installed recovery root mismatch')
 if(nativeZeroGeneration||nativeBusinessRecovery){
  // Prepare configuration only, before finishRelease seals the active Profile.
  // This fixed Node subprocess never invokes Desktop, Host boot or plugin apply.
  const program=`import {pathToFileURL} from 'node:url';
   globalThis.fetch=()=>{throw Error('offline Desktop preparation cannot fetch')};
   const [modulePath,home]=process.argv.slice(1);
   const {prepareDesktopProfile}=await import(pathToFileURL(modulePath).href);
   const p=prepareDesktopProfile('1',home,'darwin','desktop',undefined,
    {requested:'disabled',effective:'disabled',legacyDefaulted:true},{lanAddresses:[],aaEnabled:false});
   console.log(JSON.stringify({requiresDependencyMigration:p.requiresDependencyMigration,port:p.port,networkExposure:p.networkExposure}));`
  const result=JSON.parse(cp.execFileSync(join(release,'node/bin/node'),['--input-type=module','--eval',program,join(release,'App/DSH Desktop.app/Contents/Resources/app/lib/profile.js'),join(root,'data/home')],
   {cwd:release,env:{...installedEnvironment(root),...(nativeZeroGeneration?{OASIS_NATIVE_ZERO_GENERATION:'1'}:{OASIS_NATIVE_BUSINESS_RECOVERY:'1'})},encoding:'utf8',stdio:'pipe'}))
  if(result.requiresDependencyMigration!==false||result.networkExposure!=='loopback'||!Number.isSafeInteger(result.port))throw Error('installed native zero Desktop preparation incomplete')
 }
}
function controls(root){return Object.fromEntries(installationControlFiles.map(p=>[p,installationFileHash(assertInstalledPath(root,join(root,'control',p),{directory:false}))]))}
function stateFor(root){
 canonicalDirectory(root)
 const state=read(assertInstalledPath(root,join(root,'installation.json'),{directory:false}))
 if(state.schemaVersion!==1||state.mode!=='OASIS_F_INSTALLED'||state.root!==root||!idOK(state.current)||!isDeepStrictEqual(state.controlFiles,controls(root))
  ||state.controlFiles['scripts/f-installed-runtime.mjs']!==installationFileHash(script)||state.gateSHA256!==installedGateSHA256()
  ||state.nodeSHA256!==installationFileHash(join(root,'control/node')))throw Error('installed controller/source identity mismatch')
 if(fs.existsSync(join(root,'RECOVERY_REQUIRED')))throw Error('installed recovery incomplete; startup refused')
 assertInstalledDataRoots(root)
 if(fs.existsSync(join(root,'data/home/cordis.patch.yml'))||fs.existsSync(join(root,'data/userdata/plugin-management/state.json')))throw Error('unsupported installed configuration override')
 for(const [name,expected]of [['profile-selection/state.json',{version:2,active:'desktop'}],['desktop-market/state.json',{version:1,requested:'disabled',legacyDefaulted:false}]]){
  const p=join(root,'data/userdata',name)
  if(fs.existsSync(p)&&!isDeepStrictEqual(read(assertInstalledPath(root,p,{directory:false})),expected))throw Error('unsupported installed Profile/market override')
 }
 return state
}
function receipt(root,state,id){
 if(!idOK(id)||!state.releases[id])throw Error('explicit known installed release required')
 const dir=assertInstalledPath(root,join(root,'releases',id)),p=assertInstalledPath(root,join(dir,'receipt.json'),{directory:false})
 if(installationFileHash(p)!==state.releases[id])throw Error('installed release receipt drift')
 const r=read(p),program=fileTree(dir,{ignore:['receipt.json','profile-snapshot']})
 if(r.id!==id||!isDeepStrictEqual(program,r.program)||!isDeepStrictEqual(fileTree(assertInstalledPath(root,join(dir,'profile-snapshot'))),r.profile))throw Error('installed release program/snapshot drift')
 validateProgramLinks(dir,program)
 return{dir,row:r}
}
export function checkFInstallation(root){
 const state=stateFor(root),current=receipt(root,state,state.current),profile=assertInstalledPath(root,profilePath(root))
 if(!isDeepStrictEqual(fileTree(profile),current.row.profile))throw Error('active installed Profile differs from current receipt')
 validateNodeModules(root,profile);validateNodeModules(root,current.dir)
 const template=read(join(current.dir,'profile-template.json'))
 for(const [name,path]of Object.entries(template.components))if(fs.realpathSync(join(profile,'node_modules',name))!==fs.realpathSync(join(current.dir,path)))throw Error('installed mandatory component mismatch')
 return{status:'F_INSTALLED_CANDIDATE_CHECKED',root,dataRoot:join(root,'data'),current:state.current,checkpoint:current.row.checkpoint,releases:Object.keys(state.releases),realCallBudget:0,arbitraryLegacyWriterEnforced:false,outerInstallerReleaseAccepted:false}
}
export async function withInstalledWriter(root,role,callback){
 if(typeof callback!=='function')throw Error('installed writer callback required')
 const lease=acquireInstalledLease(root,role)
 try{const report=checkFInstallation(root);return await callback({...report,env:lease.env,home:join(root,'data/home')})}finally{lease.release()}
}
function addRelease(root,input){
 const release=join(root,'releases',input.id)
 if(fs.existsSync(release))throw Error('release already exists; explicit recovery/rollback required')
 copy(input.payload,release);materialize(root,release,release)
 for(const [p,hash]of Object.entries(input.manifest.files))if(installationFileHash(join(release,p))!==hash)throw Error('installed payload source drift during materialization')
 verifyPolicy(release,input.manifest)
 return release
}
function finishRelease(root,input,dir){
 copy(profilePath(root),join(dir,'profile-snapshot'))
 const row={id:input.id,checkpoint:input.manifest.checkpoint,program:fileTree(dir,{ignore:['profile-snapshot']}),profile:fileTree(profilePath(root))}
 save(join(dir,'receipt.json'),row);return installationFileHash(join(dir,'receipt.json'))
}
export async function installFBundle({bundle,expectedSHA256,root}){
 const input=verifyFBundle(bundle,expectedSHA256)
 if(!isAbsolute(root)||resolve(root)!==root||fs.realpathSync(dirname(root))!==dirname(root))throw Error('canonical new installation parent required')
 if(fs.existsSync(root))throw Error('installation root already exists')
 verifySignedInstallationApp(join(input.payload,'App/DSH Desktop.app'))
 fs.mkdirSync(root,{mode:0o700})
 for(const name of ['data','releases'])fs.mkdirSync(join(root,name),{mode:0o700})
 const lease=acquireInstalledLease(root,'maintenance')
 try{
  copy(join(input.payload,'controller'),join(root,'control'));fs.copyFileSync(join(input.payload,'node/bin/node'),join(root,'control/node'),fs.constants.COPYFILE_FICLONE);fs.chmodSync(join(root,'control/node'),0o755)
  for(const name of ['user','home','userdata','cache','temp','evidence','workspace-a','workspace-b'])fs.mkdirSync(join(root,'data',name),{recursive:true,mode:0o700})
  const release=addRelease(root,input);activate(root,release)
  const r=finishRelease(root,input,release)
  save(join(root,'installation.json'),{schemaVersion:1,mode:'OASIS_F_INSTALLED',root,current:input.id,releases:{[input.id]:r},controlFiles:controls(root),gateSHA256:installedGateSHA256(),nodeSHA256:installationFileHash(join(root,'control/node'))})
  return checkFInstallation(root)
 }catch(error){try{save(join(root,'RECOVERY_REQUIRED'),{reason:'initial installation failed; no automatic retry'})}catch{};throw error}
 finally{lease.release()}
}
function restoreProfile(root,target){
 const path=profilePath(root)
 if(fs.existsSync(path))fs.rmSync(assertInstalledPath(root,path),{recursive:true})
 copy(join(target.dir,'profile-snapshot'),path)
}
async function maintenance(root,expectedCurrent,action){
 return withInstalledWriter(root,'maintenance',async()=>{
  const state=stateFor(root)
  if(state.current!==expectedCurrent)throw Error('installed current revision conflict')
  const previous=receipt(root,state,state.current),storage=join(root,'data/home/storages')
  assertInstalledPath(root,storage,{missing:true,deep:true});const owner=await acquireJsonRootOwnership(storage);let mutated=false
  try{return await action({state,previous,mutating:()=>{mutated=true}})}
  catch(error){
   if(mutated)try{restoreProfile(root,previous);atomic(join(root,'installation.json'),state);checkFInstallation(root)}
   catch{try{save(join(root,'RECOVERY_REQUIRED'),{reason:'installed Profile restore failed'})}catch{};throw Error('installed recovery incomplete; explicit repair required')}
   throw error
  }finally{owner.release()}
 })
}
export async function upgradeFInstallation(root,{bundle,expectedSHA256,expectedCurrent}){
 return maintenance(root,expectedCurrent,async({state,mutating})=>{
  const input=verifyFBundle(bundle,expectedSHA256);verifySignedInstallationApp(join(input.payload,'App/DSH Desktop.app'))
  const release=addRelease(root,input);mutating();activate(root,release)
  const h=finishRelease(root,input,release);atomic(join(root,'installation.json'),{...state,current:input.id,releases:{...state.releases,[input.id]:h}})
  return checkFInstallation(root)
 })
}
export async function rollbackFInstallation(root,{releaseId,expectedCurrent}){
 return maintenance(root,expectedCurrent,async({state,mutating})=>{
  const target=receipt(root,state,releaseId);verifySignedInstallationApp(join(target.dir,'App/DSH Desktop.app'));mutating();restoreProfile(root,target)
  atomic(join(root,'installation.json'),{...state,current:releaseId});return checkFInstallation(root)
 })
}
function installedEnvironment(root,leaseEnv={}){
 const dataRoot=join(root,'data'),home=join(dataRoot,'user'),node=join(root,'control/node')
 return{...leaseEnv,PATH:dirname(node)+':/usr/bin:/bin:/usr/sbin:/sbin',HOME:home,CFFIXED_USER_HOME:home,ZDOTDIR:home,DSH_HOME:join(dataRoot,'home'),TMPDIR:join(dataRoot,'temp'),MAC_CHROMIUM_TMPDIR:join(dataRoot,'temp'),XDG_CACHE_HOME:join(dataRoot,'cache'),XDG_CONFIG_HOME:join(home,'.config'),XDG_DATA_HOME:join(home,'.local/share'),NPM_CONFIG_USERCONFIG:'/dev/null',NPM_CONFIG_GLOBALCONFIG:'/dev/null',NPM_CONFIG_CACHE:join(dataRoot,'cache/npm'),COREPACK_ENABLE_NETWORK:'0',npm_config_manage_package_manager_versions:'false',DSH_TELEMETRY_DISABLED:'1',HTTP_PROXY:'http://127.0.0.1:9',HTTPS_PROXY:'http://127.0.0.1:9',ALL_PROXY:'http://127.0.0.1:9',NO_PROXY:'localhost,127.0.0.1,::1',SHELL:'/bin/zsh',LANG:'en_US.UTF-8',LC_ALL:'en_US.UTF-8',CI:'true'}
}
export async function withInstalledLaunchSpec(root,callback){
 if(typeof callback!=='function')throw Error('installed launch spec callback required')
 return withInstalledWriter(root,'desktop',async({current,dataRoot,env:leaseEnv})=>{
  const release=join(root,'releases',current),template=read(join(release,'profile-template.json'))
  const nativeZeroGeneration=nativeZeroPolicy(release,template),nativeBusinessRecovery=nativeRecoveryPolicy(release,template),env=installedEnvironment(root,leaseEnv)
  if(nativeZeroGeneration)env.OASIS_NATIVE_ZERO_GENERATION='1'
  if(nativeBusinessRecovery){if(template.nativeBusinessRecovery.scope.root!==root)throw Error('installed recovery root mismatch');env.OASIS_NATIVE_BUSINESS_RECOVERY='1'}
  assertInstalledLease(join(dataRoot,'home/storages'),env)
  // Loader rows resolve from the release; every writable directory uses data/.
  return await callback({root,current,dataRoot,nativeZeroGeneration,nativeBusinessRecovery,realCallBudget:0,
   exe:join(release,'App/DSH Desktop.app/Contents/MacOS/DSH Desktop'),args:['--user-data-dir='+join(dataRoot,'userdata'),'--proxy-server=http://127.0.0.1:9','--proxy-bypass-list=localhost;127.0.0.1;[::1]','--disable-background-networking'],cwd:release,env,shell:false})
 })
}
export async function startFInstallation(root){
 return withInstalledLaunchSpec(root,async({current,dataRoot,...spec})=>{
  const prefix=join(dataRoot,'evidence','installed-launch-'+randomUUID())
  const out=fs.openSync(prefix+'.stdout.log','wx',0o600),err=fs.openSync(prefix+'.stderr.log','wx',0o600);let child
  const stop=()=>child?.kill('SIGTERM');process.on('SIGINT',stop);process.on('SIGTERM',stop)
  try{
   // The client registry resolves Loader rows relative to the launch directory.
   // Only the release owns runtime modules; data remains at the explicit HOME paths.
   child=cp.spawn(spec.exe,spec.args,{cwd:spec.cwd,env:spec.env,stdio:['ignore',out,err],shell:spec.shell})
   const exitPromise=new Promise((ok,fail)=>{child.once('error',fail);child.once('close',(code,signal)=>ok({code,signal}))})
   save(prefix+'.json',{root,current,pid:child.pid,launcherPid:process.pid,startedAtUTC:new Date().toISOString()});console.log(JSON.stringify({root,current,pid:child.pid,prefix}))
   const exit=await exitPromise;save(prefix+'.exit.json',{...exit,endedAtUTC:new Date().toISOString()});return exit
  }finally{process.off('SIGINT',stop);process.off('SIGTERM',stop);fs.closeSync(out);fs.closeSync(err)}
 })
}
async function main(){
 const [action,...args]=process.argv.slice(2);let result
 if(action==='--install'&&args.length===3)result=await installFBundle({bundle:args[0],expectedSHA256:args[1],root:args[2]})
 else if(action==='--upgrade'&&args.length===4)result=await upgradeFInstallation(args[0],{bundle:args[1],expectedSHA256:args[2],expectedCurrent:args[3]})
 else if(action==='--rollback'&&args.length===3)result=await rollbackFInstallation(args[0],{releaseId:args[1],expectedCurrent:args[2]})
 else if(action==='--check'&&args.length===1)result=checkFInstallation(args[0])
 else if(action==='--start'&&args.length===1){result=await startFInstallation(args[0]);process.exitCode=result.code??1}
 else throw Error('Use explicit --install bundle sha root; --upgrade root bundle sha current; --rollback root target current; --check/--start root')
 console.log(JSON.stringify(result))
}
if(process.argv[1]&&resolve(process.argv[1])===script)main().catch(error=>{console.error(error.message);process.exitCode=1})
