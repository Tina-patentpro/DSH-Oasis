import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import cp from 'node:child_process'
import {join,resolve} from 'node:path'
import {EventEmitter} from 'node:events'
import {pathToFileURL} from 'node:url'
import {setup,save,hash} from './f-installed-fixture.mjs'
import {installFBundle,checkFInstallation,upgradeFInstallation} from '../f-installed-runtime.mjs'
import {acquireInstalledLease} from '../../patches/storage-json-single-owner/installed-lease.mjs'
const api=await import('../f-installer-transaction.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return{};throw e})
async function prepared(t,{damage=false,committed=false}={}){
 assert.equal(typeof api.runInstallerTransaction,'function','durable installer transaction required')
 const h=setup(t);await installFBundle({...h.v3,root:h.root});const data=join(h.root,'data/home/storages/public.json');save(data,'PUBLIC UNKNOWN AFTER UPGRADE EDIT')
 const original=cp.spawn;let dispatches=0
 t.mock.method(cp,'spawn',()=>{
  dispatches++;const child=new EventEmitter();child.pid=99999999
  process.nextTick(async()=>{
   if(committed)await upgradeFInstallation(h.root,{...h.v4,expectedCurrent:h.v3.expectedSHA256})
   else{
    fs.mkdirSync(join(h.root,'releases',h.v4.expectedSHA256));save(join(h.root,'releases',h.v4.expectedSHA256,'partial.txt'),'PUBLIC interrupted candidate')
    if(damage)fs.rmSync(join(h.root,'data/home/profiles/desktop'),{recursive:true})
   }
   child.emit('close',committed?0:1,null)
  });return child
 })
 const tx=join(h.root,'installer-transactions','public-tx')
 const result=await api.runInstallerTransaction({root:h.root,...h.v4,expectedCurrent:h.v3.expectedSHA256,transactionRoot:tx})
 t.mock.restoreAll(); // restore spawn before creating any genuine dead-owner process
 return{...h,data,tx,result,dispatches,original}
}
test('failed upgrade retains one durable dispatch and offers quarantine without reverting valid current',async t=>{
 const h=await prepared(t);assert.equal(h.dispatches,1);assert.equal(h.result.exitCode,1)
 const plan=await api.prepareInstallerRecovery({root:h.root,transactionRoot:h.tx,expectedTransactionSHA256:h.result.transactionSHA256})
 assert.equal(plan.plan.restoreProfile,false)
 const r=await api.applyInstallerRecovery({plan:plan.plan,expectedPlanSHA256:plan.sha256})
 assert.equal(r.current,h.v3.expectedSHA256);assert.equal(fs.readFileSync(h.data,'utf8'),'PUBLIC UNKNOWN AFTER UPGRADE EDIT')
 assert.equal(fs.existsSync(join(h.root,'releases',h.v4.expectedSHA256)),false)
 assert.equal(fs.readFileSync(join(h.tx,'quarantined-release/partial.txt'),'utf8'),'PUBLIC interrupted candidate')
})
test('interrupted Profile explicitly restores original while archiving exact dead-owner locks and preserving data',async t=>{
 const h=await prepared(t,{damage:true})
 const code="import {acquireInstalledLease} from "+JSON.stringify(pathToFileURL(resolve('patches/storage-json-single-owner/installed-lease.mjs')).href)+";acquireInstalledLease(process.argv[1],'maintenance')"
 cp.execFileSync(process.execPath,['--input-type=module','-e',code,h.root])
 const originalLocks=['startup.lock','data/startup.lock'].map(p=>fs.readFileSync(join(h.root,p)))
 const plan=await api.prepareInstallerRecovery({root:h.root,transactionRoot:h.tx,expectedTransactionSHA256:h.result.transactionSHA256});assert.equal(plan.plan.restoreProfile,true)
 await api.applyInstallerRecovery({plan:plan.plan,expectedPlanSHA256:plan.sha256})
 assert.equal(checkFInstallation(h.root).current,h.v3.expectedSHA256)
 assert.equal(fs.readFileSync(h.data,'utf8'),'PUBLIC UNKNOWN AFTER UPGRADE EDIT')
 assert.deepEqual(fs.readFileSync(join(h.tx,'stale-lock-0.json')),originalLocks[0]);assert.deepEqual(fs.readFileSync(join(h.tx,'stale-lock-1.json')),originalLocks[1])
})
test('alive owner and a changed recovery observation refuse without discarding failures',async t=>{
 const h=await prepared(t,{damage:true}),lease=acquireInstalledLease(h.root,'sdk')
 await assert.rejects(()=>api.prepareInstallerRecovery({root:h.root,transactionRoot:h.tx,expectedTransactionSHA256:h.result.transactionSHA256}),/alive|active|owner/);lease.release()
 const plan=await api.prepareInstallerRecovery({root:h.root,transactionRoot:h.tx,expectedTransactionSHA256:h.result.transactionSHA256})
 fs.appendFileSync(join(h.root,'installation.json'),' ')
 await assert.rejects(()=>api.applyInstallerRecovery({plan:plan.plan,expectedPlanSHA256:plan.sha256}),/changed|observation|drift/)
 assert.ok(fs.existsSync(join(h.root,'releases',h.v4.expectedSHA256)))
})
test('a recovery copy failure leaves a blocking marker and immutable before-image',async t=>{
 const h=await prepared(t,{damage:true}),plan=await api.prepareInstallerRecovery({root:h.root,transactionRoot:h.tx,expectedTransactionSHA256:h.result.transactionSHA256})
 const before=hash(join(h.tx,'before-installation.json')),original=fs.cpSync
 t.mock.method(fs,'cpSync',function(from,to,...args){if(to===join(h.root,'data/home/profiles/desktop'))throw Error('PUBLIC restore denied');return original.call(this,from,to,...args)})
 await assert.rejects(()=>api.applyInstallerRecovery({plan:plan.plan,expectedPlanSHA256:plan.sha256}),/restore denied/)
 assert.ok(fs.existsSync(join(h.root,'RECOVERY_REQUIRED')));assert.equal(hash(join(h.tx,'before-installation.json')),before)
})
test('successful upgrades cannot be repurposed to overwrite a later broken Profile',async t=>{
 const h=await prepared(t,{committed:true});assert.equal(h.result.outcome,'SUCCEEDED')
 fs.rmSync(join(h.root,'data/home/profiles/desktop'),{recursive:true})
 await assert.rejects(()=>api.prepareInstallerRecovery({root:h.root,transactionRoot:h.tx,expectedTransactionSHA256:h.result.transactionSHA256}),/succeeded|successful/)
})
test('an exited direct child does not authorize recovery while its recorded process group remains alive',async t=>{
 const h=await prepared(t,{damage:true}),pgid=Number(cp.execFileSync('/bin/ps',['-p',String(process.pid),'-o','pgid='],{encoding:'utf8'}).trim())
 save(join(h.tx,'child.json'),{pid:pgid,processGroup:pgid})
 await assert.rejects(()=>api.prepareInstallerRecovery({root:h.root,transactionRoot:h.tx,expectedTransactionSHA256:h.result.transactionSHA256}),/group|alive/)
})
