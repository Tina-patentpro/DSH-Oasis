import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import cp from 'node:child_process'
import {join} from 'node:path'
import {EventEmitter} from 'node:events'
import {setup,bundle,save,hash} from './f-installed-fixture.mjs'
import {installFBundle,upgradeFInstallation,checkFInstallation} from '../f-installed-runtime.mjs'
import * as api from '../f-installer-transaction.mjs'
async function failed(h,input,id,expectedCurrent,{damage=false}={}){
 const original=cp.spawn;cp.spawn=()=>{const child=new EventEmitter();child.pid=99999999;process.nextTick(()=>{fs.mkdirSync(join(h.root,'releases',input.expectedSHA256));save(join(h.root,'releases',input.expectedSHA256,'partial.txt'),'PUBLIC FAILED '+id);if(damage)fs.rmSync(join(h.root,'data/home/profiles/desktop'),{recursive:true});child.emit('close',1,null)});return child}
 try{return await api.runInstallerTransaction({root:h.root,...input,expectedCurrent,transactionRoot:join(h.root,'installer-transactions',id)})}finally{cp.spawn=original}
}
async function initial(t,{damage=false}={}){
 const h=setup(t);await installFBundle({...h.v3,root:h.root});h.data=join(h.root,'data/home/storages/public.json');save(h.data,'PUBLIC UNKNOWN AND LATER EDIT');h.dataSHA=hash(h.data);h.failure=await failed(h,h.v4,'old-failure',h.v3.expectedSHA256,{damage});return h
}
const prepare=h=>api.prepareInstallerRecovery({root:h.root,transactionRoot:h.failure.transactionRoot,expectedTransactionSHA256:h.failure.transactionSHA256})
test('F-NI-A01: a stale failed transaction cannot revert a later committed release when a newer failure breaks Profile',async t=>{
 const h=await initial(t),later=bundle(h.base,'v4-later-success');await upgradeFInstallation(h.root,{...later,expectedCurrent:h.v3.expectedSHA256});assert.equal(checkFInstallation(h.root).current,later.expectedSHA256)
 const state=hash(join(h.root,'installation.json')),newer=bundle(h.base,'v4-newer-failure');await failed(h,newer,'newer-failure',later.expectedSHA256,{damage:true})
 await assert.rejects(()=>prepare(h),/superseded|before-image|state.*differ/)
 assert.equal(hash(join(h.root,'installation.json')),state);assert.equal(hash(h.data),h.dataSHA);assert.ok(JSON.parse(fs.readFileSync(join(h.root,'installation.json'))).releases[later.expectedSHA256]);assert.equal(fs.existsSync(join(h.failure.transactionRoot,'recovery-result.json')),false)
})
test('a same-current installation-state change also invalidates an old failure before recovery',async t=>{
 const h=await initial(t,{damage:true}),path=join(h.root,'installation.json'),state=JSON.parse(fs.readFileSync(path));state.publicRevision='later-accepted-record';save(path,state);const changed=hash(path)
 await assert.rejects(()=>prepare(h),/superseded|before-image|state.*differ/);assert.equal(hash(path),changed);assert.equal(hash(h.data),h.dataSHA)
})
test('recovery rechecks non-lock inputs after acquiring the lease and leaves an intervening state untouched',async t=>{
 const h=await initial(t,{damage:true}),prepared=await prepare(h),path=join(h.root,'installation.json'),original=fs.openSync;let changed
 t.mock.method(fs,'openSync',function(p,flags,...args){if(!changed&&p===join(h.root,'startup.lock')&&flags==='wx'){fs.appendFileSync(path,' ');changed=hash(path)}return original.call(this,p,flags,...args)})
 await assert.rejects(()=>api.applyInstallerRecovery({plan:prepared.plan,expectedPlanSHA256:prepared.sha256}),/changed|observation|drift/)
 assert.ok(changed);assert.equal(hash(path),changed);assert.equal(hash(h.data),h.dataSHA);assert.equal(fs.existsSync(join(h.failure.transactionRoot,'quarantined-release')),false);assert.equal(fs.existsSync(join(h.root,'RECOVERY_REQUIRED')),false);assert.equal(fs.existsSync(join(h.root,'startup.lock')),false)
})
