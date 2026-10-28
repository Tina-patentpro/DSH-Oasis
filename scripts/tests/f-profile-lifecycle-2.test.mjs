import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import childProcess from 'node:child_process'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {once} from 'node:events'
import {acquireJsonRootOwnership} from '../../patches/storage-json-single-owner/ownership.mjs'
import {acquireLaunchLock} from '../macos-development-launch.mjs'
const api=await import('../f-profile-lifecycle-2.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const spec3={baseAdmission:resolve('.local/f-reference-attachments-20261027/admission-R7.json'),checkpoint3:resolve('.local/f-orphan-assembly-20261027/conversation3')}
const spec4={baseAdmission:spec3.baseAdmission,checkpoint4:resolve('.local/f-renderer-lease-20261027/conversation4')}
async function installed(t){
 assert.equal(typeof api.installManagedProfile,'function','fixed Profile lifecycle entry must exist')
 const parent=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'f-profile-life-'))),root=join(parent,'managed');t.after(()=>fs.rmSync(parent,{recursive:true,force:true}))
 const state=await api.installManagedProfile({root,spec:spec3});return{root,runtime:join(root,'runtime'),state}
}
test('clean install materializes an exact no-model Profile and immutable initial receipt',async t=>{
 const f=await installed(t),v=api.checkManagedProfile(f.root)
 assert.equal(v.conversationVersion,'0.2.0-rc.2.oasis-draft.3');assert.equal(v.realCallBudget,0)
 assert.equal(fs.existsSync(join(f.runtime,'home/.credentials.yaml')),false)
 assert.equal(fs.existsSync(join(f.runtime,'home/storages/oasis_workbench.json')),false)
 await assert.rejects(()=>api.installManagedProfile({root:f.root,spec:spec3}),/exists/)
 assert.equal(api.checkManagedProfile(f.root).current,f.state.current)
})
test('same data root upgrade and explicit rollback retain UNKNOWN and later user edits',async t=>{
 const f=await installed(t),data=join(f.runtime,'home/storages/public-unknown.json');fs.mkdirSync(join(data,'..'),{recursive:true});fs.writeFileSync(data,'{"status":"UNKNOWN","requestId":"PUBLIC-F-28","dispatches":0}')
 const v4=await api.upgradeManagedProfile(f.root,{spec:spec4,expectedCurrent:f.state.current})
 assert.equal(api.checkManagedProfile(f.root).conversationVersion,'0.2.0-rc.2.oasis-draft.4');assert.notEqual(v4.current,f.state.current)
 fs.appendFileSync(data,'\nPUBLIC-EDIT-AFTER-UPGRADE')
 await api.rollbackManagedProfile(f.root,{releaseId:f.state.current,expectedCurrent:v4.current})
 assert.equal(api.checkManagedProfile(f.root).conversationVersion,'0.2.0-rc.2.oasis-draft.3')
 assert.equal(fs.readFileSync(data,'utf8'),'{"status":"UNKNOWN","requestId":"PUBLIC-F-28","dispatches":0}\nPUBLIC-EDIT-AFTER-UPGRADE')
})
test('every supported writer refuses before callback when another process owns the entry',async t=>{
 const f=await installed(t),child=childProcess.fork(new URL('./fixtures/managed-profile-writer-2.mjs',import.meta.url),[f.root],{execPath:process.execPath,execArgv:[],stdio:['ignore','pipe','pipe','ipc']});const closed=once(child,'close');t.after(async()=>{if(child.exitCode===null&&child.signalCode===null)child.kill();await closed})
 const [message]=await once(child,'message');assert.equal(message.acquired,true)
 let writes=0
 for(const role of ['desktop','sdk','recovery','maintenance'])await assert.rejects(()=>api.withManagedWriter(f.root,role,async()=>{writes++}),/busy|EEXIST/)
 assert.equal(writes,0);assert.throws(()=>acquireLaunchLock(f.runtime),/EEXIST/)
 child.send('release');await closed
 await api.withManagedWriter(f.root,'sdk',async()=>{writes++});assert.equal(writes,1)
})
test('maintenance rejects an existing guarded JSON owner without changing active Profile',async t=>{
 const f=await installed(t),path=join(f.runtime,'evidence/f-assembly.json'),before=fs.readFileSync(path),owner=await acquireJsonRootOwnership(join(f.runtime,'home/storages'))
 try{await assert.rejects(()=>api.upgradeManagedProfile(f.root,{spec:spec4,expectedCurrent:f.state.current}),{code:'DSH_STORAGE_ROOT_BUSY'});assert.deepEqual(fs.readFileSync(path),before)}finally{owner.release()}
})
test('a real process-boundary installation failure restores exact prior admission and Profile',async t=>{
 const f=await installed(t),path=join(f.runtime,'evidence/f-assembly.json'),before=fs.readFileSync(path);let failed=false
 const original=childProcess.execFileSync
 const mock=t.mock.method(childProcess,'execFileSync',function(command,...args){if(!failed&&command===resolve('tools/bin/pnpm')){failed=true;throw Object.assign(Error('PUBLIC injected spawn ENOSPC'),{code:'ENOSPC'})}return original.call(this,command,...args)})
 await assert.rejects(()=>api.upgradeManagedProfile(f.root,{spec:spec4,expectedCurrent:f.state.current}),/ENOSPC|materializ|spawn/)
 mock.mock.restore();assert.equal(failed,true);assert.deepEqual(fs.readFileSync(path),before);assert.equal(api.checkManagedProfile(f.root).current,f.state.current)
})
test('stale revision and tampered rollback snapshot refuse without changing the current release',async t=>{
 const f=await installed(t),v4=await api.upgradeManagedProfile(f.root,{spec:spec4,expectedCurrent:f.state.current})
 await assert.rejects(()=>api.upgradeManagedProfile(f.root,{spec:spec3,expectedCurrent:f.state.current}),/revision|current/)
 const target=join(f.root,'releases',f.state.current,'desktop/package.json');fs.appendFileSync(target,'\nPUBLIC-TAMPER')
 const activePackage=join(f.runtime,'home/profiles/desktop/package.json'),inode=fs.statSync(activePackage).ino
 await assert.rejects(()=>api.rollbackManagedProfile(f.root,{releaseId:f.state.current,expectedCurrent:v4.current}),/snapshot|drift|receipt/)
 assert.equal(fs.statSync(activePackage).ino,inode,'refusing a bad target must not rewrite the valid active Profile')
 assert.equal(api.checkManagedProfile(f.root).current,v4.current)
})
test('killed writer leaves an explicit blocking marker instead of silently stealing its ownership',async t=>{
 const f=await installed(t),child=childProcess.fork(new URL('./fixtures/managed-profile-writer-2.mjs',import.meta.url),[f.root],{execPath:process.execPath,execArgv:[],stdio:['ignore','pipe','pipe','ipc']});const closed=once(child,'close');const [message]=await once(child,'message');assert.equal(message.acquired,true);child.kill('SIGKILL');await closed
 let writes=0;await assert.rejects(()=>api.withManagedWriter(f.root,'maintenance',async()=>{writes++}),/busy|EEXIST/);assert.equal(writes,0)
 assert.equal(fs.existsSync(join(f.root,'startup.lock')),true);assert.equal(fs.existsSync(join(f.runtime,'startup.lock')),true)
})
test('a linked management parent cannot create or overwrite a target',async t=>{
 assert.equal(typeof api.installManagedProfile,'function')
 const parent=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'f-profile-alias-')));t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));const alias=join(parent,'alias');fs.symlinkSync(parent,alias)
 await assert.rejects(()=>api.installManagedProfile({root:join(alias,'new'),spec:spec3}),/canonical|link/);assert.equal(fs.existsSync(join(parent,'new')),false)
})
test('maintenance refuses an aliased data root before creating ownership metadata elsewhere',async t=>{
 const f=await installed(t),outside=join(f.root,'outside-public');fs.mkdirSync(outside)
 fs.symlinkSync(outside,join(f.runtime,'home/storages'))
 await assert.rejects(()=>api.upgradeManagedProfile(f.root,{spec:spec4,expectedCurrent:f.state.current}),/canonical|link|confined/)
 assert.deepEqual(fs.readdirSync(outside),[])
})
test('F-PL-A01: every supported callback rejects existing, dangling and descendant storage links',async t=>{
 const f=await installed(t),storage=join(f.runtime,'home/storages'),outside=join(f.root,'outside-public');fs.mkdirSync(outside);let entered=0
 for(const kind of ['existing','dangling','descendant']){
  if(kind==='descendant'){fs.mkdirSync(storage);fs.symlinkSync(outside,join(storage,'public_unit'))}
  else fs.symlinkSync(kind==='existing'?outside:join(outside,'missing'),storage)
  for(const role of ['desktop','sdk','recovery','maintenance'])await assert.rejects(()=>api.withManagedWriter(f.root,role,async()=>{entered++}),/link|canonical|confined/)
  assert.equal(entered,0);assert.deepEqual(fs.readdirSync(outside),[])
  fs.rmSync(storage,{recursive:true})
 }
})
test('F-PL-A01: check is read-only for absent data roots and rejects non-directory roots',async t=>{
 const f=await installed(t),storage=join(f.runtime,'home/storages');assert.equal(fs.existsSync(storage),false)
 api.checkManagedProfile(f.root);assert.equal(fs.existsSync(storage),false)
 fs.writeFileSync(storage,'PUBLIC-FOREIGN-FILE')
 let entered=false;await assert.rejects(()=>api.withManagedWriter(f.root,'sdk',async()=>{entered=true}),/directory|data root/);assert.equal(entered,false);assert.equal(fs.readFileSync(storage,'utf8'),'PUBLIC-FOREIGN-FILE')
})
