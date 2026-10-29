import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import cp from 'node:child_process'
import {join,dirname,relative,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
import {EventEmitter} from 'node:events'
const api=await import('../f-installed-runtime.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const save=(p,x)=>{fs.mkdirSync(dirname(p),{recursive:true});fs.writeFileSync(p,typeof x==='string'?x:JSON.stringify(x,null,2)+'\n')}
function bundle(base,label){
 const dir=join(base,label),payload=join(dir,'payload');fs.mkdirSync(payload,{recursive:true})
 for(const [from,to]of [['scripts/f-installed-runtime.mjs','controller/scripts/f-installed-runtime.mjs'],['patches/storage-json-single-owner/installed-lease.mjs','controller/patches/storage-json-single-owner/installed-lease.mjs'],['patches/storage-json-single-owner/ownership.mjs','controller/patches/storage-json-single-owner/ownership.mjs']])save(join(payload,to),fs.readFileSync(resolve(from),'utf8'))
 save(join(payload,'node/bin/node'),'PUBLIC fake Node boundary');save(join(payload,'pnpm/bin/pnpm.mjs'),'PUBLIC fake pnpm boundary');save(join(payload,'App/DSH Desktop.app/Contents/Info.plist'),'PUBLIC signature boundary')
 const components={};for(const [i,name]of ['@deepseek-ai/dsh-client-ui-primitives','@deepseek-ai/dsh-web-frontend','dsh-better-sidebar','oasis-professional-service','dsh-desktop-host-file-path-bridge','dsh-storage-json-single-owner','@deepseek-ai/dsh-client-ui-conversation'].entries()){
  components[name]='components/c'+i;const version=name.endsWith('primitives')||name.endsWith('frontend')?'0.2.0-rc.2.oasis-mac.1':name==='dsh-better-sidebar'?'0.24.1':name.endsWith('conversation')?'0.2.0-rc.2.oasis-draft.'+(label==='v3'?3:4):name==='dsh-storage-json-single-owner'?'0.0.1.oasis-installed.1':'0.0.1'
  save(join(payload,components[name],'package.json'),{name,version,type:'module',main:'index.mjs'});save(join(payload,components[name],'index.mjs'),'export const publicFixture=true\n')
  if(name==='dsh-storage-json-single-owner'){
   const old=fs.readFileSync(resolve('patches/storage-json-single-owner/index.mjs'),'utf8')
   save(join(payload,components[name],'index.mjs'),"import { assertInstalledLease } from './installed-lease.mjs'\n"+old.replace('  const ownership = await acquireJsonRootOwnership(root)','  assertInstalledLease(root)\n  const ownership = await acquireJsonRootOwnership(root)'))
   save(join(payload,components[name],'installed-lease.mjs'),fs.readFileSync(resolve('patches/storage-json-single-owner/installed-lease.mjs'),'utf8'))
  }
 }
 save(join(payload,'package.json'),{name:'oasis-f-installation-runtime',private:true,packageManager:'pnpm@11.8.0',dependencies:Object.fromEntries(Object.entries(components).map(([k,v])=>[k,'link:./'+v]))})
 save(join(payload,'pnpm-workspace.yaml'),'packages:\n  - .\nnodeLinker: hoisted\nautoInstallPeers: false\n')
 const disabled=['desktop-updates','session-telemetry-otel','llm-pi-ai','llm-deepseek','llm-deepseek-account','session-title-llm','goal-round-driver','deepseek-account','web-search-deepseek','account-controller','oasis-professional-service']
 save(join(payload,'profile-template.json'),{manifest:{name:'oasis-f-installed-profile',private:true,packageManager:'pnpm@11.8.0',dsh:{profile:{bundles:['@deepseek-ai/dsh-base','@deepseek-ai/dsh-web-app','dsh-better-sidebar','oasis-professional-service','dsh-desktop-host-file-path-bridge','dsh-storage-json-single-owner']}}},components,patch:disabled.map(id=>({id,disabled:true})),checkpoint:label==='v3'?3:4})
 const files={},links={};function walk(p){for(const name of fs.readdirSync(p)){const f=join(p,name);if(fs.statSync(f).isDirectory())walk(f);else files[relative(payload,f)]=hash(f)}}walk(payload)
 save(join(dir,'bundle.json'),{schemaVersion:1,kind:'OASIS_F_OFFLINE_BUNDLE',publicFixtureLabel:label,realCallBudget:0,versions:{desktop:'2.0.17',dsh:'0.2.0-rc.2',cordis:'4.0.4',sidebar:'0.24.1',node:'24.21.0',pnpm:'11.8.0'},checkpoint:label==='v3'?3:4,files,links})
 return{bundle:dir,expectedSHA256:hash(join(dir,'bundle.json'))}
}
function setup(t){
 assert.equal(typeof api.installFBundle,'function','installed layout controller must exist')
 const base=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'f-install-unit-')));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));let failNext=false,failProfile=false,codesign=0,pnpm=0
 const original=cp.execFileSync;t.mock.method(cp,'execFileSync',function(command,args,options){
  if(command==='/usr/bin/codesign'){codesign++;return Buffer.from('TeamIdentifier=UM3Z9G5DNH\n')}
  if(command==='/usr/bin/plutil')return Buffer.from('2.0.17\n')
  if(command.endsWith('/node/bin/node')&&args[0]?.endsWith('/pnpm/bin/pnpm.mjs')){
   pnpm++;if(failNext||failProfile&&options.cwd.endsWith('/home/profiles/desktop')){failNext=false;failProfile=false;throw Error('PUBLIC PNPM MATERIALIZATION FAILURE')}
   const at=options.cwd,m=JSON.parse(fs.readFileSync(join(at,'package.json'),'utf8'));save(join(at,'pnpm-lock.yaml'),'PUBLIC fixed materialization')
   for(const [name,value]of Object.entries(m.dependencies??{})){const target=resolve(at,value.slice(5)),link=join(at,'node_modules',name);fs.mkdirSync(dirname(link),{recursive:true});if(!fs.existsSync(link))fs.symlinkSync(relative(dirname(link),target),link)}
   save(join(at,'node_modules/.modules.yaml'),{});save(join(at,'node_modules/.package-map.json'),{packages:{}});save(join(at,'node_modules/.pnpm-workspace-state-v1.json'),{})
   return Buffer.from('')
  }
  return original.call(this,command,args,options)
 })
 const v3=bundle(base,'v3'),v4=bundle(base,'v4'),root=join(base,'installed')
 return{base,root,v3,v4,fail(){failNext=true},failProfile(){failProfile=true},counts:()=>({codesign,pnpm})}
}

export {setup,bundle,save,hash}
