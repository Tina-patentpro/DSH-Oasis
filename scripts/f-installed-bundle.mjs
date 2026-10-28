/** Build only from an explicit retained source2 release; never copy Profile/user data or old node_modules. */
import fs from 'node:fs'
import {join,resolve,dirname,relative,isAbsolute,sep} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
import {isDeepStrictEqual} from 'node:util'
import {checkManagedProfile} from './f-profile-lifecycle-2.mjs'
import {canonicalDirectory} from '../patches/storage-json-single-owner/installed-lease.mjs'
import {installationFileHash as hash,installationVersions,installationControlFiles,installedProviderIndexSHA256,verifyFBundle,verifySignedInstallationApp} from './f-installed-runtime.mjs'
const script=fileURLToPath(import.meta.url),repo=resolve(dirname(script),'..')
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const save=(p,x)=>fs.writeFileSync(p,typeof x==='string'?x:JSON.stringify(x,null,2)+'\n',{flag:'wx',mode:0o600})
const clone=(from,to)=>fs.cpSync(from,to,{recursive:true,dereference:false,verbatimSymlinks:true,force:false,errorOnExist:true,mode:fs.constants.COPYFILE_FICLONE})
const layouts={
 '@deepseek-ai/dsh-client-ui-primitives':['lib','LICENSE','README.zh.md','README.i18n.yaml'],
 '@deepseek-ai/dsh-web-frontend':['dist','LICENSE'],
 'dsh-better-sidebar':['lib','locale','icon.svg','cordis.patch.yml','LICENSE','README.md','README_EN.md'],
 'oasis-professional-service':['src','lib','docs/api/oasis-professional-service-baseline.json','cordis.patch.yml'],
 'dsh-desktop-host-file-path-bridge':['host-file-path-bridge.js','host-file-path-bridge.mjs','cordis.patch.yml'],
 'dsh-storage-json-single-owner':['index.mjs','ownership.mjs','cordis.patch.yml'],
 '@deepseek-ai/dsh-client-ui-conversation':['lib'],
}
function cleanSourceTree(path){
 const st=fs.lstatSync(path)
 if(st.isSymbolicLink()||!st.isDirectory()&&!st.isFile())throw Error('runtime resource link/type refused')
 if(st.isDirectory())for(const name of fs.readdirSync(path))cleanSourceTree(join(path,name))
}
function rewriteSpec(value,source,target,relocations){
 if(typeof value!=='string'||!/^link:|^file:/.test(value))return value
 const colon=value.indexOf(':'),prefix=value.slice(0,colon+1),old=resolve(source,value.slice(colon+1))
 const match=[...relocations].sort((a,b)=>b[0].length-a[0].length).find(([from])=>old===from||old.startsWith(from+sep))
 if(!match)throw Error('unbound local runtime dependency: '+value)
 return prefix+relative(target,join(match[1],relative(match[0],old)))
}
export function projectRuntimeComponent({source,target,relocations}){
 canonicalDirectory(source)
 if(fs.existsSync(target))throw Error('component output already exists')
 const before=hash(join(source,'package.json')),manifest=read(join(source,'package.json')),names=layouts[manifest.name]
 if(!names)throw Error('explicit supported runtime component required')
 const projected=structuredClone(manifest)
 for(const field of ['dependencies','peerDependencies','devDependencies','optionalDependencies'])if(projected[field])projected[field]=Object.fromEntries(Object.entries(projected[field]).map(([name,value])=>[name,rewriteSpec(value,source,target,relocations)]))
 const selected=names.filter(name=>fs.existsSync(join(source,name)))
 for(const name of selected)cleanSourceTree(join(source,name))
 let guard
 if(manifest.name==='dsh-storage-json-single-owner'){
  if(hash(join(source,'index.mjs'))!=='9d1c8da0ed70accc2b679bccbfc72c9a353f96573155fbef0951ff4df5c71bdc')throw Error('reviewed storage provider source drift')
  guard="import { assertInstalledLease } from './installed-lease.mjs'\n"+fs.readFileSync(join(source,'index.mjs'),'utf8').replace('  const ownership = await acquireJsonRootOwnership(root)','  assertInstalledLease(root)\n  const ownership = await acquireJsonRootOwnership(root)')
  projected.version='0.0.1.oasis-installed.1'
 }
 projected.files=['package.json',...selected,...(guard?['installed-lease.mjs']:[])]
 projected.oasisInstallationProjection={schemaVersion:1,sourceManifestSHA256:before,oldDependencyMetadataCopied:false}
 fs.mkdirSync(target,{recursive:true,mode:0o700})
 for(const name of selected){const dest=join(target,name);fs.mkdirSync(dirname(dest),{recursive:true,mode:0o700});clone(join(source,name),dest)}
 if(guard){fs.writeFileSync(join(target,'index.mjs'),guard);fs.copyFileSync(join(repo,'patches/storage-json-single-owner/installed-lease.mjs'),join(target,'installed-lease.mjs'));if(hash(join(target,'index.mjs'))!==installedProviderIndexSHA256)throw Error('installed provider projection mismatch')}
 save(join(target,'package.json'),projected)
 return{source,sourceManifestSHA256:before,installedManifestSHA256:hash(join(target,'package.json')),name:manifest.name,copied:selected,excluded:fs.readdirSync(source).filter(name=>name!=='package.json'&&!selected.some(p=>p===name||p.startsWith(name+'/')))}
}
function sourceRelease(managedRoot,releaseId){
 if(typeof releaseId!=='string'||!/^[-0-9a-f]{36}$/.test(releaseId))throw Error('explicit retained source2 release required')
 canonicalDirectory(managedRoot);checkManagedProfile(managedRoot)
 const state=read(join(managedRoot,'managed-profile.json')),dir=join(managedRoot,'releases',releaseId),receiptPath=join(dir,'receipt.json')
 if(!state.releases[releaseId]||hash(receiptPath)!==state.releases[releaseId])throw Error('unknown/source2 release receipt drift')
 const receipt=read(receiptPath),admissionPath=join(dir,'admission.json'),pin=read(admissionPath)
 if(receipt.id!==releaseId||hash(admissionPath)!==receipt.admissionSHA256||pin.fixture||pin.mode!=='NO_MODEL_F_ASSEMBLY'||pin.realCallBudget!==0||!pin.materialized)throw Error('unsupported source2 release admission')
 const prefix=join(pin.root,'home/profiles/desktop')
 for(const [path,expected]of Object.entries(pin.files)){
  const mapped=path.startsWith(prefix+sep)?join(dir,'desktop',relative(prefix,path)):path
  if(hash(mapped)!==expected)throw Error('retained source2 pin drift: '+mapped)
 }
 return{dir,pin,receipt,admissionPath}
}
function appDependencies(app){
 const modules=join(app,'Contents/Resources/app/node_modules'),out={}
 for(const name of fs.readdirSync(modules).sort()){
  if(name.startsWith('.'))continue
  if(name.startsWith('@'))for(const child of fs.readdirSync(join(modules,name)).sort()){
   const p=join(modules,name,child);if(fs.existsSync(join(p,'package.json')))out[name+'/'+child]=p
  }else{const p=join(modules,name);if(fs.existsSync(join(p,'package.json')))out[name]=p}
 }return out
}
function packageFiles(root){
 const files={},links={}
 function walk(dir){for(const name of fs.readdirSync(dir).sort()){
  const p=join(dir,name),key=relative(root,p),st=fs.lstatSync(p)
  if(st.isSymbolicLink())links[key]=fs.readlinkSync(p)
  else if(st.isDirectory())walk(p)
  else if(st.isFile())files[key]=hash(p)
  else throw Error('unsupported payload entry')
 }}walk(root);return{files,links}
}
function replacePaths(value,mapping){
 if(Array.isArray(value))return value.map(x=>replacePaths(x,mapping))
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replacePaths(v,mapping)]))
 if(typeof value==='string'){
  const match=[...mapping].sort((a,b)=>b[0].length-a[0].length).find(([from])=>value===from||value.startsWith(from+'/'))
  if(match)return '@OASIS_RELEASE_ROOT@/'+match[1]+value.slice(match[0].length)
  if(isAbsolute(value))throw Error('unbound absolute execution/configuration path')
 }return value
}
export function bindInstalledClientEntries(patch,components){
 const out=structuredClone(patch)
 // Host import overlays do not cover the client's synchronous Loader scan.
 // Desktop force-enables its canonical conversation row after Profile patches;
 // its version overlay already selects our package. A second row is a conflict.
 const conversation=out.findIndex(row=>row.id==='ui-conversation')
 if(conversation>=0)out[conversation]={id:'ui-conversation',name:'@deepseek-ai/dsh-client-ui-conversation'}
 for(const [id,name]of [['better-sidebar','dsh-better-sidebar']]){
  const disabled={id,name,disabled:true},index=out.findIndex(row=>row.id===id)
  if(index<0)out.push(disabled);else out[index]=disabled
  out.push({insert:[{id:'oasis-installed-'+id,name:'@OASIS_RELEASE_ROOT@/'+components[name]+'/lib/index.js'}]})
 }
 return out
}
export async function buildFInstallationBundle({managedRoot,releaseId,out}){
 const source=sourceRelease(managedRoot,releaseId)
 if(!isAbsolute(out)||resolve(out)!==out||fs.realpathSync(dirname(out))!==dirname(out)||fs.existsSync(out))throw Error('canonical absent bundle output required')
 const checkpoint=Number(source.pin.conversationVersion.split('.').at(-1))
 if(![3,4].includes(checkpoint))throw Error('only reviewed checkpoint3/4 supported')
 verifySignedInstallationApp(source.pin.app)
 const oldProfile=join(source.dir,'desktop'),profile=read(join(oldProfile,'package.json')),sources=Object.fromEntries(Object.entries(profile.dependencies).map(([name,spec])=>{
  if(!spec.startsWith('link:')||!layouts[name])throw Error('unbound Profile component');return[name,canonicalDirectory(spec.slice(5))]
 }))
 if(!isDeepStrictEqual(Object.keys(sources).sort(),Object.keys(layouts).sort()))throw Error('incomplete source2 component set')
 fs.mkdirSync(out,{mode:0o700});const payload=join(out,'payload');fs.mkdirSync(payload,{mode:0o700})
 const app=join(payload,'App/DSH Desktop.app');fs.mkdirSync(dirname(app));clone(source.pin.app,app)
 for(const name of ['bin/node','LICENSE','README.md']){const from=join(repo,'tools/node-v24.21.0-darwin-arm64',name);if(fs.existsSync(from)){const to=join(payload,'node',name);fs.mkdirSync(dirname(to),{recursive:true});clone(from,to)}}
 clone(join(repo,'tools/pnpm-11.8.0'),join(payload,'pnpm'))
 for(const name of installationControlFiles){const to=join(payload,'controller',name);fs.mkdirSync(dirname(to),{recursive:true});fs.copyFileSync(join(repo,name),to)}
 const components=Object.fromEntries(Object.keys(sources).map((name,i)=>[name,'components/c'+i]))
 const relocations=[[source.pin.app,app],...Object.entries(sources).map(([name,path])=>[path,join(payload,components[name])])]
 const projections=Object.entries(sources).map(([name,path])=>projectRuntimeComponent({source:path,target:join(payload,components[name]),relocations}))
 const deps=appDependencies(app),dependencies=Object.fromEntries(Object.entries(deps).map(([name,path])=>[name,'link:./'+relative(payload,path)]))
 // React DOM is an existing fixed candidate dependency, absent from the vendor top-level tree.
 const extras=[],pending=[['react-dom',sources['oasis-professional-service']]],seen=new Set()
 while(pending.length){const [name,parent]=pending.shift();if(seen.has(name))continue;seen.add(name)
  const require=createRequire(join(parent,'package.json')),original=dirname(require.resolve(name+'/package.json')),pkg=read(join(original,'package.json'))
  if(deps[name]){if(read(join(deps[name],'package.json')).version!==pkg.version)throw Error('runtime dependency version conflict: '+name);continue}
  if(!original.startsWith(sources['oasis-professional-service']+'/node_modules/'))throw Error('extra dependency outside retained candidate')
  const target=join(payload,'runtime-extra',name);fs.mkdirSync(target,{recursive:true});const copied=[]
  for(const entry of fs.readdirSync(original).sort())if(entry!=='node_modules'&&!entry.startsWith('.')){cleanSourceTree(join(original,entry));clone(join(original,entry),join(target,entry));copied.push(entry)}
  dependencies[name]='link:./'+relative(payload,target);extras.push({name,version:pkg.version,source:original,copied})
  for(const dep of Object.keys({...pkg.dependencies,...pkg.peerDependencies}))pending.push([dep,original])
 }
 for(const [name,path]of Object.entries(components))dependencies[name]='link:./'+path
 save(join(payload,'package.json'),{name:'oasis-f-installation-runtime',private:true,packageManager:'pnpm@11.8.0',dependencies})
 save(join(payload,'pnpm-workspace.yaml'),fs.readFileSync(join(oldProfile,'pnpm-workspace.yaml'),'utf8'))
 const require=createRequire(join(source.pin.app,'Contents/Resources/app/package.json')),yaml=require('yaml')
 const mapping=Object.entries(sources).map(([name,path])=>[path,components[name]])
 const patch=bindInstalledClientEntries(replacePaths(yaml.parse(fs.readFileSync(join(oldProfile,'cordis.patch.yml'),'utf8'),{schema:'core',uniqueKeys:true,maxAliasCount:0}),mapping),components)
 for(const row of patch)if(row.id==='desktop-shell')row.config.port=57593
 const {dependencies:_oldDependencies,...manifest}=profile
 save(join(payload,'profile-template.json'),{manifest,components,patch,checkpoint})
 save(join(payload,'NOTICE.installation-candidate.md'),'Local offline installation candidate only. Vendor App signature/resources and bundled licence files retained. Outer installer signing, final notices/distribution acceptance, arbitrary legacy writers and upstream/cross-platform upgrades remain unverified. No user Profile, credentials or runtime data included.\n')
 sourceRelease(managedRoot,releaseId)
 const descriptor={schemaVersion:1,kind:'OASIS_F_OFFLINE_BUNDLE',realCallBudget:0,versions:installationVersions,checkpoint,source:{managedRoot,releaseId,admissionSHA256:hash(source.admissionPath),receiptSHA256:hash(join(source.dir,'receipt.json'))},projections,extras,...packageFiles(payload)}
 save(join(out,'bundle.json'),descriptor);const sha=hash(join(out,'bundle.json'));verifyFBundle(out,sha)
 return{bundle:out,expectedSHA256:sha,checkpoint,files:Object.keys(descriptor.files).length,links:Object.keys(descriptor.links).length,sourceRelease:releaseId}
}
if(process.argv[1]&&resolve(process.argv[1])===script){
 const [action,path,...extra]=process.argv.slice(2)
 if(action!=='--build'||!path||extra.length){console.error('Use --build explicit-spec.json');process.exitCode=1}
 else buildFInstallationBundle(read(path)).then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e.message);process.exitCode=1})
}
