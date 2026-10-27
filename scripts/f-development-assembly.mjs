/** Supported no-model F development assembly. Does not install or update the daily app/Profile. */
import {readFileSync,writeFileSync,mkdirSync,realpathSync,existsSync,openSync,closeSync} from 'node:fs'
import {resolve,join,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
import {isDeepStrictEqual} from 'node:util'
import {patchConversationDraftCheckpoint3}from'../patches/dsh-0.2.0-rc.2/conversation-draft-checkpoint-3.mjs'
import {fileHash,verifyPins,makeLaunchSpec,acquireLaunchLock,startOwnedChild} from './macos-development-launch.mjs'
const reviewedR7='e9ae83ecb2abe5bf75759fceb0e4c75266d558cd9a99ab6ee254e5205167e37e'
const script=fileURLToPath(import.meta.url)
const read=path=>JSON.parse(readFileSync(path,'utf8'))
const save=(path,value)=>writeFileSync(path,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600})
const requiredDeps=['@deepseek-ai/dsh-client-ui-conversation','dsh-storage-json-single-owner','dsh-desktop-host-file-path-bridge']
const metadataNames=['pnpm-lock.yaml','node_modules/.modules.yaml','node_modules/.pnpm-workspace-state-v1.json','node_modules/.package-map.json']
function baseFor(path){
 if(fileHash(path)!==reviewedR7)throw Error('reviewed R7 admission identity mismatch')
 const base=read(path);verifyPins(base)
 if(base.mode!=='NO_MODEL_FRESH_PROFILE'||base.approvedRealRequests!==0)throw Error('reviewed mode mismatch')
 return base
}
function composition(base,fixture,checkpoint3){
 const oldProfile=join(base.root,'home/profiles/desktop'),manifest=read(join(oldProfile,'package.json'))
 for(const key of requiredDeps)if(!manifest.dependencies[key]?.startsWith('link:'))throw Error('mandatory assembly dependency missing')
 let patch=readFileSync(join(oldProfile,'cordis.patch.yml'),'utf8')
 const probe='\n- insert:\n    - id: f-native-public-checkpoint-probe\n      name: '
 const index=patch.indexOf(probe)
 if(index<0)throw Error('reviewed observer boundary mismatch')
 patch=patch.slice(0,index).replace('port: 57563','port: 57583')
 if(!checkpoint3||realpathSync(checkpoint3)!==resolve(checkpoint3))throw Error('canonical checkpoint version3 artifact required')
 const oldConversation=manifest.dependencies['@deepseek-ai/dsh-client-ui-conversation'].slice(5)
 const expectedPackage=read(join(oldConversation,'package.json'));expectedPackage.version='0.2.0-rc.2.oasis-draft.3';expectedPackage.oasisPatchRevision='draft-checkpoint-3'
 if(JSON.stringify(read(join(checkpoint3,'package.json')))!==JSON.stringify(expectedPackage)
  ||readFileSync(join(checkpoint3,'lib/index.js'),'utf8')!==readFileSync(join(oldConversation,'lib/index.js'),'utf8')
  ||readFileSync(join(checkpoint3,'pnpm-workspace.yaml'),'utf8')!==readFileSync(join(oldConversation,'pnpm-workspace.yaml'),'utf8'))throw Error('checkpoint version3 package identity mismatch')
 const original=readFileSync(join(base.app,'Contents/Resources/app/node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js'),'utf8')
 if(readFileSync(join(checkpoint3,'lib/client.js'),'utf8')!==patchConversationDraftCheckpoint3(original))throw Error('checkpoint version3 compiled identity mismatch')
 checkMaterialization(base,checkpoint3,expectedPackage,oldConversation)
 manifest.dependencies['@deepseek-ai/dsh-client-ui-conversation']='link:'+checkpoint3
 patch=patch.replace(/^(- id: ui-conversation\n  name: )"[^\n]+"$/m,(_all,prefix)=>prefix+JSON.stringify(join(checkpoint3,'lib/index.js')))
 const fixtureFiles={}
 if(fixture){
  if(fixture.id!=='f-legacy-recovery-proof'||realpathSync(fixture.path)!==resolve(fixture.path)||JSON.stringify(Object.keys(fixture.files).sort())!==JSON.stringify(['index.mjs','lib/client.js','package.json']))throw Error('temporary recovery fixture identity mismatch')
  for(const [name,hash]of Object.entries(fixture.files)){const path=join(fixture.path,name);if(realpathSync(path)!==path||fileHash(path)!==hash)throw Error('temporary recovery fixture input identity mismatch');fixtureFiles[path]=hash}
  if(read(join(fixture.path,'package.json')).name!==fixture.id)throw Error('temporary recovery fixture package mismatch')
  patch+='\n- insert:\n    - id: '+fixture.id+'\n      name: '+JSON.stringify(join(fixture.path,'index.mjs'))+'\n'
 }
 manifest.name='dsh-profile-f-supported-assembly';
 const packagePaths=requiredDeps.map(id=>manifest.dependencies[id].slice(5))
 return {manifest,patch,packagePaths,fixtureFiles,oldProfile,checkpoint3}
}
function sourcePins(base,{packagePaths,fixtureFiles,checkpoint3}){
 const files={...fixtureFiles}
 for(const [path,hash]of Object.entries(base.files)){
  if(path.startsWith(join(base.root,'home/profiles/desktop')+'/')||path.includes('/probe/')||path.endsWith('/launch-R7.mjs'))continue
  files[path]=hash
 }
 for(const path of [script,fileURLToPath(new URL('./macos-development-launch.mjs',import.meta.url)),...packagePaths.map(p=>join(p,'package.json'))])files[path]=fileHash(path)
 for(const path of [fileURLToPath(new URL('../patches/dsh-0.2.0-rc.2/conversation-draft-checkpoint-3.mjs',import.meta.url)),fileURLToPath(new URL('../patches/f-host-assembly/legacy-draft-seed.mjs',import.meta.url)),...['package.json','lib/index.js','lib/client.js','pnpm-workspace.yaml',...metadataNames].map(name=>join(checkpoint3,name))])files[path]=fileHash(path)
 return files
}
function checkMaterialization(base,profile,manifest,reference){
 const fail=()=>{throw Error('fixed materialization metadata/resolution mismatch')}
 const require=createRequire(join(base.app,'Contents/Resources/app/package.json'))
 const yaml=require('yaml')
 const lock=yaml.parse(readFileSync(join(profile,'pnpm-lock.yaml'),'utf8'),{schema:'core',uniqueKeys:true,maxAliasCount:0})
 const modules=read(join(profile,'node_modules/.modules.yaml')),state=read(join(profile,'node_modules/.pnpm-workspace-state-v1.json')),map=read(join(profile,'node_modules/.package-map.json'))
 const referenceLock=yaml.parse(readFileSync(join(reference,'pnpm-lock.yaml'),'utf8'),{schema:'core',uniqueKeys:true,maxAliasCount:0})
 const stable=(value,excluded)=>Object.fromEntries(Object.entries(value).filter(([key])=>!excluded.includes(key)))
 // Compare the entire effective layout/settings against the same reviewed role.
 // Installation time and cache location are operational; project identity is derived below.
 if(!isDeepStrictEqual(lock.settings,referenceLock.settings)
  ||!isDeepStrictEqual(stable(modules,['prunedAt','storeDir']),stable(read(join(reference,'node_modules/.modules.yaml')),['prunedAt','storeDir']))
  ||!isDeepStrictEqual(stable(state,['lastValidatedTimestamp','projects']),stable(read(join(reference,'node_modules/.pnpm-workspace-state-v1.json')),['lastValidatedTimestamp','projects'])))fail()
 const expectedProject={name:manifest.name,...(manifest.version?{version:manifest.version}:{})}
 if(!isDeepStrictEqual(state.projects,{[profile]:expectedProject}))fail()
 if(lock?.lockfileVersion!=='9.0'||lock.settings?.autoInstallPeers!==false||lock.settings?.excludeLinksFromLockfile!==false
  ||JSON.stringify(Object.keys(lock.importers??{}))!==JSON.stringify(['.'])||lock.importers['.'].devDependencies||lock.importers['.'].optionalDependencies)fail()
 const deps=lock.importers['.'].dependencies
 if(JSON.stringify(Object.keys(deps??{}).sort())!==JSON.stringify(Object.keys(manifest.dependencies).sort()))fail()
 if(modules.packageManager!=='pnpm@11.8.0'||modules.layoutVersion!==5||modules.nodeLinker!=='hoisted'||modules.included?.dependencies!==true
  ||JSON.stringify(Object.keys(state.projects??{}))!==JSON.stringify([profile])||state.projects[profile]?.name!==manifest.name||state.settings?.nodeLinker!=='hoisted'||state.settings?.autoInstallPeers!==false)fail()
 const nm=join(profile,'node_modules'),rootMap=map.packages?.['.']
 if(!rootMap||realpathSync(resolve(nm,rootMap.url))!==profile)fail()
 const mapNames=Object.keys(rootMap.dependencies??{}).filter(name=>name!==manifest.name).sort()
 if(JSON.stringify(mapNames)!==JSON.stringify(Object.keys(manifest.dependencies).sort()))fail()
 for(const [id,specifier]of Object.entries(manifest.dependencies)){
  if(!specifier.startsWith('link:')||deps[id]?.specifier!==specifier||!deps[id]?.version?.startsWith('link:'))fail()
  const target=realpathSync(specifier.slice(5)),mapped=map.packages[rootMap.dependencies[id]]
  if(realpathSync(resolve(profile,deps[id].version.slice(5)))!==target||realpathSync(join(nm,id))!==target
   ||!mapped||realpathSync(resolve(nm,mapped.url))!==target)fail()
 }
}
export function createFAssembly(spec){
 const base=baseFor(resolve(spec.baseAdmission)),root=resolve(spec.root)
 if(realpathSync(dirname(root))!==dirname(root))throw Error('assembly requires canonical parent without links')
 if(existsSync(root))throw Error('assembly output already exists')
 const {manifest,patch,packagePaths,fixtureFiles,oldProfile,checkpoint3}=composition(base,spec.fixture,spec.checkpoint3)
 // The reviewed packages remain retained, explicit immutable inputs, not latest/market resolution.
 const pin={schemaVersion:1,mode:'NO_MODEL_F_ASSEMBLY',root,app:base.app,node:base.node,baseAdmission:resolve(spec.baseAdmission),baseAdmissionSHA256:reviewedR7,
  versions:base.versions,conversationVersion:'0.2.0-rc.2.oasis-draft.3',checkpoint3,realCallBudget:0,packagePaths,fixture:spec.fixture,files:sourcePins(base,{packagePaths,fixtureFiles,checkpoint3}),materialized:false}
 for(const name of ['user','home','userdata','cache','temp','evidence','workspace-a','workspace-b','home/profiles/desktop'])mkdirSync(join(root,name),{recursive:true})
 const profile=join(root,'home/profiles/desktop')
 save(join(profile,'package.json'),manifest);save(join(profile,'cordis.yml'),'[]\n');save(join(profile,'cordis.patch.yml'),patch)
 save(join(profile,'pnpm-workspace.yaml'),readFileSync(join(oldProfile,'pnpm-workspace.yaml'),'utf8'))
 for(const name of ['package.json','cordis.yml','cordis.patch.yml','pnpm-workspace.yaml'])pin.files[join(profile,name)]=fileHash(join(profile,name))
 save(join(root,'evidence/f-assembly.json'),pin)
 return pin
}
export function verifyFAssembly(root,{requireMaterialized=false}={}){
 root=realpathSync(root);const pin=read(join(root,'evidence/f-assembly.json'))
 if(pin.root!==root||pin.mode!=='NO_MODEL_F_ASSEMBLY'||pin.realCallBudget!==0)throw Error('mandatory assembly policy mismatch')
 const base=baseFor(pin.baseAdmission)
 if(pin.app!==base.app||pin.node!==base.node||pin.baseAdmissionSHA256!==reviewedR7||pin.conversationVersion!=='0.2.0-rc.2.oasis-draft.3'||JSON.stringify(pin.versions)!==JSON.stringify(base.versions))throw Error('reviewed execution source identity mismatch')
 verifyPins(pin)
 const profile=join(root,'home/profiles/desktop'),manifest=read(join(profile,'package.json')),patch=readFileSync(join(profile,'cordis.patch.yml'),'utf8')
 const expected=composition(base,pin.fixture,pin.checkpoint3)
 if(JSON.stringify(pin.packagePaths)!==JSON.stringify(expected.packagePaths)||JSON.stringify(manifest)!==JSON.stringify(expected.manifest)||patch!==expected.patch)throw Error('reviewed mandatory composition/configuration mismatch')
 if(readFileSync(join(profile,'cordis.yml'),'utf8')!=='[]\n'||readFileSync(join(profile,'pnpm-workspace.yaml'),'utf8')!==readFileSync(join(expected.oldProfile,'pnpm-workspace.yaml'),'utf8'))throw Error('reviewed effective workspace/root configuration mismatch')
 // These managed entry layers are consumed before/alongside the Profile patch.
 // Refuse overrides; never repair user preferences or silently select another Profile.
 if(existsSync(join(root,'home/cordis.patch.yml'))||existsSync(join(root,'userdata/plugin-management/state.json')))throw Error('unsupported machine/plugin configuration override')
 for(const [relative,expectedState]of [
  ['userdata/profile-selection/state.json',{version:2,active:'desktop'}],
  ['userdata/desktop-market/state.json',{version:1,requested:'disabled',legacyDefaulted:false}],
 ])if(existsSync(join(root,relative))&&!isDeepStrictEqual(read(join(root,relative)),expectedState))throw Error('unsupported Profile/market configuration override')
 if(pin.materialized)for(const name of metadataNames)if(!existsSync(join(profile,name)))throw Error('materialization metadata missing: '+name)
 const expectedPins=sourcePins(base,expected)
 for(const name of ['package.json','cordis.yml','cordis.patch.yml','pnpm-workspace.yaml',...(pin.materialized?metadataNames:[])])expectedPins[join(profile,name)]=fileHash(join(profile,name))
 if(JSON.stringify(Object.keys(pin.files).sort())!==JSON.stringify(Object.keys(expectedPins).sort()))throw Error('mandatory input/materialization pin set mismatch')
 for(const [path,hash]of Object.entries(expectedPins))if(pin.files[path]!==hash)throw Error('mandatory source/materialization pin mismatch')
 for(const [index,id]of requiredDeps.entries())if(manifest.dependencies[id]!=='link:'+pin.packagePaths[index])throw Error('mandatory guard/checkpoint/bridge mismatch')
 for(const id of ['dsh-storage-json-single-owner','dsh-desktop-host-file-path-bridge'])if(!manifest.dsh.profile.bundles.includes(id))throw Error('mandatory backend/bridge bundle missing')
 const guard=readFileSync(join(pin.packagePaths[1],'cordis.patch.yml'),'utf8')
 if(!guard.includes('- id: storage-json\n  disabled: true\n')||!guard.includes('id: storage-json-single-owner'))throw Error('mandatory guarded backend configuration missing')
 const conversationName=patch.match(/^- id: ui-conversation\n  name: ("[^\n]+")$/m)?.[1]
 if(!conversationName||JSON.parse(conversationName)!==pin.packagePaths[0]+'/lib/index.js')throw Error('mandatory checkpoint override missing')
 for(const id of ['desktop-updates','session-telemetry-otel','llm-pi-ai','llm-deepseek','llm-deepseek-account','session-title-llm','goal-round-driver','deepseek-account','web-search-deepseek','account-controller'])if(!patch.includes(`- id: ${id}\n  disabled: true\n`))throw Error('mandatory no-model configuration missing')
 if(requireMaterialized&&!pin.materialized)throw Error('assembly has not been frozen after fixed pnpm materialization')
 if(pin.materialized)checkMaterialization(base,profile,manifest,expected.oldProfile)
 return {status:pin.materialized?'F_ASSEMBLY_PREFLIGHT_ONLY':'F_ASSEMBLY_INPUTS_ONLY',mode:pin.mode,root,realCallBudget:0,mandatoryComponents:3,pinnedFiles:Object.keys(pin.files).length,materialized:pin.materialized}
}
export function sealFAssembly(root){
 verifyFAssembly(root);const path=join(root,'evidence/f-assembly.json'),pin=read(path)
 if(pin.materialized)throw Error('assembly already sealed; do not re-sign old admission')
 const profile=join(root,'home/profiles/desktop')
 const base=baseFor(pin.baseAdmission)
 checkMaterialization(base,profile,read(join(profile,'package.json')),join(base.root,'home/profiles/desktop'))
 for(const name of metadataNames){
  const target=join(profile,name);if(!existsSync(target))throw Error('materialization metadata missing: '+name);pin.files[target]=fileHash(target)
 }
 for(const [i,id]of requiredDeps.entries())if(realpathSync(join(profile,'node_modules',id))!==realpathSync(pin.packagePaths[i]))throw Error('materialized dependency target mismatch')
 pin.materialized=true
 // New inputs-only admission is preserved, then sealed exactly once.
 save(join(root,'evidence/f-assembly-inputs.json'),readFileSync(path,'utf8'))
 writeFileSync(path,JSON.stringify(pin,null,2)+'\n',{mode:0o600})
 return verifyFAssembly(root,{requireMaterialized:true})
}
async function main(){
 const [action,input,...extra]=process.argv.slice(2)
 if(extra.length||!input||!['--create','--seal','--check','--start'].includes(action))throw Error('Use --create spec.json or --seal/--check/--start explicit-isolated-root')
 if(action==='--create'){console.log(JSON.stringify(createFAssembly(read(input))));return}
 if(action==='--seal'){console.log(JSON.stringify(sealFAssembly(resolve(input))));return}
 const root=realpathSync(input),report=verifyFAssembly(root,{requireMaterialized:true}),pin=read(join(root,'evidence/f-assembly.json'))
 if(realpathSync(process.execPath)!==realpathSync(pin.node))throw Error('Use pinned Node')
 if(action==='--check'){console.log(JSON.stringify(report));return}
 const spec=makeLaunchSpec({root,app:pin.app,node:pin.node,acceptance:true});delete spec.env.OASIS_UNIFIED_FIXTURE
 const release=acquireLaunchLock(root),prefix=join(root,'evidence','assembly-launch-'+Date.now()),out=openSync(prefix+'.stdout.log','wx',0o600),err=openSync(prefix+'.stderr.log','wx',0o600)
 let child,stopping=false;const stop=()=>{stopping=true;child?.kill('SIGTERM')};process.on('SIGTERM',stop);process.on('SIGINT',stop)
 try{
  child=startOwnedChild(spec,{stdio:['ignore',out,err]});await new Promise((ok,fail)=>{child.once('spawn',ok);child.once('error',fail)})
  const entry={root,pid:child.pid,launcherPid:process.pid,mode:pin.mode,startedAtUTC:new Date().toISOString()};save(prefix+'.json',entry);console.log(JSON.stringify(entry))
  const exit=await new Promise(ok=>child.once('close',(code,signal)=>ok({code,signal})));save(prefix+'.exit.json',{...exit,requestedShutdown:stopping,endedAtUTC:new Date().toISOString()});process.exitCode=exit.code??1
 }finally{process.off('SIGTERM',stop);process.off('SIGINT',stop);closeSync(out);closeSync(err);release()}
}
if(process.argv[1]&&resolve(process.argv[1])===script)main().catch(error=>{console.error(error.message);process.exitCode=1})
