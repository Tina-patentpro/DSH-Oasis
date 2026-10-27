import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,realpathSync,writeFileSync,readFileSync,rmSync,existsSync,symlinkSync,mkdirSync,unlinkSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
const api=await import('../f-development-assembly.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const baseAdmission=resolve('.local/f-reference-attachments-20261027/admission-R7.json')
function fixture(){const parent=realpathSync(mkdtempSync(join(tmpdir(),'f-assembly-')));return{parent,root:join(parent,'profile'),spec:{baseAdmission,root:join(parent,'profile'),checkpoint3:resolve('.local/f-orphan-assembly-20261027/conversation3')},close(){rmSync(parent,{recursive:true,force:true})}}}
function materialize(f){
 const profile=join(f.root,'home/profiles/desktop'),home=join(f.parent,'private-home');mkdirSync(home)
 const env={HOME:home,PATH:resolve('tools/node-v24.21.0-darwin-arm64/bin')+':/usr/bin:/bin',NPM_CONFIG_USERCONFIG:'/dev/null',npm_config_manage_package_manager_versions:'false',COREPACK_ENABLE_NETWORK:'0',CI:'true'}
 for(const mode of ['--lockfile-only','--frozen-lockfile'])execFileSync(resolve('tools/bin/pnpm'),['install','--offline','--ignore-scripts','--config.manage-package-manager-versions=false','--store-dir='+join(f.parent,'store'),mode],{cwd:profile,env,stdio:'pipe'})
}
function editPin(f,fn){const path=join(f.root,'evidence/f-assembly.json'),pin=JSON.parse(readFileSync(path));fn(pin);writeFileSync(path,JSON.stringify(pin))}
test('the supported assembly is reproducible, model-disabled and uses the reviewed guard and checkpoint',()=>{
 const f=fixture();try{const result=api.createFAssembly(f.spec);const report=api.verifyFAssembly(f.root)
 assert.equal(result.root,f.root);assert.equal(report.mode,'NO_MODEL_F_ASSEMBLY');assert.equal(report.realCallBudget,0);assert.equal(report.mandatoryComponents,3)
 assert.equal(existsSync(join(f.root,'home/.credentials.yaml')),false);assert.equal(existsSync(join(f.root,'home/storages/oasis_workbench.json')),false)
 }finally{f.close()}
})
test('the supported assembly must select the exact notification-safe version3 artifact',()=>{
 const f=fixture();try{const pin=api.createFAssembly(f.spec);assert.equal(pin.conversationVersion,'0.2.0-rc.2.oasis-draft.3');assert.equal(pin.packagePaths[0],f.spec.checkpoint3)}finally{f.close()}
})
test('a missing version3 capability cannot silently fall back to the older checkpoint',()=>{
 const f=fixture();try{delete f.spec.checkpoint3;assert.throws(()=>api.createFAssembly(f.spec),/checkpoint|version3/);assert.equal(existsSync(f.root),false)}finally{f.close()}
})
test('a forged or changed base admission is refused before creating an output',()=>{
 const f=fixture();try{const copy=JSON.parse(readFileSync(baseAdmission));delete copy.files[Object.keys(copy.files)[0]];const path=join(f.parent,'forged.json');writeFileSync(path,JSON.stringify(copy));f.spec.baseAdmission=path
 assert.throws(()=>api.createFAssembly(f.spec),/reviewed|identity/);assert.equal(existsSync(f.root),false)
 }finally{f.close()}
})
test('removing the mandatory guarded backend or checkpoint rejects startup admission',()=>{
 const f=fixture();try{api.createFAssembly(f.spec);const p=join(f.root,'home/profiles/desktop/package.json'),raw=readFileSync(p,'utf8'),manifest=JSON.parse(raw)
 delete manifest.dependencies['dsh-storage-json-single-owner'];writeFileSync(p,JSON.stringify(manifest));assert.throws(()=>api.verifyFAssembly(f.root),/drift|guard|mandatory/)
 writeFileSync(p,raw);const y=join(f.root,'home/profiles/desktop/cordis.patch.yml');writeFileSync(y,readFileSync(y,'utf8').replace('- id: ui-conversation','- id: omitted-conversation'));assert.throws(()=>api.verifyFAssembly(f.root),/drift|checkpoint|mandatory/)
 }finally{f.close()}
})
test('an existing output or aliased parent is not overwritten',()=>{
 const f=fixture();try{api.createFAssembly(f.spec);assert.throws(()=>api.createFAssembly(f.spec),/exists|existing/)
 const link=join(f.parent,'alias');symlinkSync(f.root,link);assert.throws(()=>api.createFAssembly({...f.spec,root:join(link,'nested')}),/canonical|link/);assert.equal(existsSync(join(f.root,'nested')),false)
 }finally{f.close()}
})
test('an explicitly named temporary recovery fixture must match its frozen files before output creation',()=>{
 const f=fixture();try{f.spec.fixture={id:'f-legacy-recovery-proof',path:f.parent,files:{'package.json':'0'.repeat(64)}}
 assert.throws(()=>api.createFAssembly(f.spec),/fixture|identity|ENOENT/);assert.equal(existsSync(f.root),false)
 }finally{f.close()}
})
test('recomputing local pins cannot select a different backend than the reviewed composition',()=>{
 const f=fixture();try{api.createFAssembly(f.spec);const pp=join(f.root,'home/profiles/desktop/package.json'),ap=join(f.root,'evidence/f-assembly.json'),pkg=JSON.parse(readFileSync(pp)),pin=JSON.parse(readFileSync(ap));const fake=join(f.parent,'fake-guard');mkdirSync(fake);writeFileSync(join(fake,'cordis.patch.yml'),'- id: storage-json\n  disabled: true\n- insert:\n    - id: storage-json-single-owner\n')
 pkg.dependencies['dsh-storage-json-single-owner']='link:'+fake;writeFileSync(pp,JSON.stringify(pkg));pin.packagePaths[1]=fake;pin.files[pp]=createHash('sha256').update(readFileSync(pp)).digest('hex');writeFileSync(ap,JSON.stringify(pin))
 assert.throws(()=>api.verifyFAssembly(f.root),/reviewed|composition|mandatory/)
 }finally{f.close()}
})
test('recomputing local pins cannot enable stock-json after the no-model composition',()=>{
 const f=fixture();try{api.createFAssembly(f.spec);const yp=join(f.root,'home/profiles/desktop/cordis.patch.yml'),ap=join(f.root,'evidence/f-assembly.json'),pin=JSON.parse(readFileSync(ap));writeFileSync(yp,readFileSync(yp,'utf8')+'\n- id: storage-json\n  disabled: false\n');pin.files[yp]=createHash('sha256').update(readFileSync(yp)).digest('hex');writeFileSync(ap,JSON.stringify(pin))
 assert.throws(()=>api.verifyFAssembly(f.root),/composition|configuration|mandatory/)
 }finally{f.close()}
})
for(const field of ['app','node'])test('F-LA-A01: the actual '+field+' must remain the reviewed execution source',()=>{
 const f=fixture();try{api.createFAssembly(f.spec);editPin(f,pin=>{pin[field]=join(f.parent,'unreviewed')});assert.throws(()=>api.verifyFAssembly(f.root),/execution|reviewed|identity/)}finally{f.close()}
})
test('F-LA-A02: a materialized boolean alone is not physical admission',()=>{
 const f=fixture();try{api.createFAssembly(f.spec);editPin(f,pin=>{pin.materialized=true});assert.throws(()=>api.verifyFAssembly(f.root,{requireMaterialized:true}),/material|metadata|pin/)}finally{f.close()}
})
test('F-LA-A02: four arbitrary metadata files and three links cannot be sealed',()=>{
 const f=fixture();try{const pin=api.createFAssembly(f.spec),profile=join(f.root,'home/profiles/desktop'),nm=join(profile,'node_modules');mkdirSync(nm)
 for(const name of ['pnpm-lock.yaml','node_modules/.modules.yaml','node_modules/.pnpm-workspace-state-v1.json','node_modules/.package-map.json'])writeFileSync(join(profile,name),'{}\n')
 for(const [index,id]of ['@deepseek-ai/dsh-client-ui-conversation','dsh-storage-json-single-owner','dsh-desktop-host-file-path-bridge'].entries()){mkdirSync(join(nm,id,'..'),{recursive:true});symlinkSync(pin.packagePaths[index],join(nm,id))}
 assert.throws(()=>api.sealFAssembly(f.root),/material|metadata|lock|resolution/)
 }finally{f.close()}
})
test('F-LA-A02: actual fixed-pnpm materialization is admitted, and later guard link replacement is refused',()=>{
 const f=fixture();try{api.createFAssembly(f.spec);materialize(f);api.sealFAssembly(f.root);assert.equal(api.verifyFAssembly(f.root,{requireMaterialized:true}).materialized,true)
 const link=join(f.root,'home/profiles/desktop/node_modules/dsh-storage-json-single-owner'),foreign=join(f.parent,'foreign');mkdirSync(foreign);unlinkSync(link);symlinkSync(foreign,link)
 assert.throws(()=>api.verifyFAssembly(f.root,{requireMaterialized:true}),/resolution|dependency|material/)
 }finally{f.close()}
})
test('F-LA-A02: deleting a required materialization pin cannot weaken verification',()=>{
 const f=fixture();try{api.createFAssembly(f.spec);materialize(f);api.sealFAssembly(f.root);editPin(f,pin=>{delete pin.files[join(f.root,'home/profiles/desktop/node_modules/.package-map.json')]});assert.throws(()=>api.verifyFAssembly(f.root,{requireMaterialized:true}),/pin|metadata/)}finally{f.close()}
})
test('F-LA-A02: a self-repinned package map cannot redirect the fixed manifest resolution',()=>{
 const f=fixture();try{api.createFAssembly(f.spec);materialize(f);api.sealFAssembly(f.root);const path=join(f.root,'home/profiles/desktop/node_modules/.package-map.json'),map=JSON.parse(readFileSync(path));map.packages['.'].dependencies['dsh-storage-json-single-owner']='.';writeFileSync(path,JSON.stringify(map));editPin(f,pin=>{pin.files[path]=createHash('sha256').update(readFileSync(path)).digest('hex')});assert.throws(()=>api.verifyFAssembly(f.root,{requireMaterialized:true}),/resolution|material/)}finally{f.close()}
})
for(const [name,kind,value]of [
 ['workspace nodeLinker','workspace','packages: [.]\nnodeLinker: isolated\nautoInstallPeers: false\n'],
 ['workspace automatic peers','workspace','packages: [.]\nnodeLinker: hoisted\nautoInstallPeers: true\n'],
 ['workspace explicit path limit','workspace','packages: [.]\nnodeLinker: hoisted\nautoInstallPeers: false\nvirtualStoreDirMaxLength: 121\n'],
 ['modules path limit','modules',null],
 ['workspace-state effective settings','state',null],
 ['managed empty root','root','- insert: []\n'],
])test('F-LA-A02 effective config: self-repinning '+name+' still refuses startup',()=>{
 const f=fixture();try{api.createFAssembly(f.spec);materialize(f);api.sealFAssembly(f.root)
 const profile=join(f.root,'home/profiles/desktop'),path=join(profile,kind==='workspace'?'pnpm-workspace.yaml':kind==='modules'?'node_modules/.modules.yaml':kind==='state'?'node_modules/.pnpm-workspace-state-v1.json':'cordis.yml')
 if(value!==null)writeFileSync(path,value);else{const data=JSON.parse(readFileSync(path));if(kind==='modules')data.virtualStoreDirMaxLength=121;else data.settings.virtualStoreDirMaxLength=121;writeFileSync(path,JSON.stringify(data))}
 editPin(f,pin=>{pin.files[path]=createHash('sha256').update(readFileSync(path)).digest('hex')});assert.throws(()=>api.verifyFAssembly(f.root,{requireMaterialized:true}),/configuration|material|workspace|layout/)
 }finally{f.close()}
})
for(const [name,relativePath,value]of [
 ['machine patch','home/cordis.patch.yml','- insert: []\n'],
 ['other active Profile','userdata/profile-selection/state.json','{"version":2,"active":"other-profile"}\n'],
 ['market provider override','userdata/desktop-market/state.json','{"version":1,"requested":"dshmarket","legacyDefaulted":false}\n'],
 ['plugin management overrides','userdata/plugin-management/state.json','{"version":1,"profiles":{"desktop":{"disabledBundles":["dsh-storage-json-single-owner"]}}}\n'],
])test('the supported no-model entry refuses '+name+' outside its fixed composition',()=>{
 const f=fixture();try{api.createFAssembly(f.spec);const path=join(f.root,relativePath);mkdirSync(join(path,'..'),{recursive:true});writeFileSync(path,value);assert.throws(()=>api.verifyFAssembly(f.root),/override|Profile|market|machine|configuration/)}finally{f.close()}
})
