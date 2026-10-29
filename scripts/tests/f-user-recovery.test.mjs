import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import cp from 'node:child_process'
import {join,resolve,dirname} from 'node:path'
import {EventEmitter} from 'node:events'
import {setup,save,hash} from './f-installed-fixture.mjs'
import {installFBundle} from '../f-installed-runtime.mjs'
import {runInstallerTransaction} from '../f-installer-transaction.mjs'
const api=await import('../f-user-recovery.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return{};throw e})
const files=['scripts/f-installed-runtime.mjs','patches/storage-json-single-owner/installed-lease.mjs','patches/storage-json-single-owner/ownership.mjs','scripts/f-installer-transaction.mjs','scripts/f-user-recovery.mjs']
async function userRoot(t,{failure=false,provision=true}={}){
 assert.equal(typeof api.installPersistentRecovery,'function','persistent recovery installer required')
 const h=setup(t);await installFBundle({...h.v3,root:h.root})
 // A binary boundary only: use the running interpreter in a private proxy so
 // clean-source tests need no ignored tools; Electron must remain Node here.
 const quote=s=>"'"+s.replaceAll("'","'\\''")+"'"
 save(join(h.root,'control/node'),'#!/bin/sh\nexport ELECTRON_RUN_AS_NODE=1\nexec '+quote(process.execPath)+' "$@"\n');fs.chmodSync(join(h.root,'control/node'),0o755)
 const state=JSON.parse(fs.readFileSync(join(h.root,'installation.json')));state.nodeSHA256=hash(join(h.root,'control/node'));save(join(h.root,'installation.json'),state)
 h.source=join(h.base,'installer-source');h.expectedFiles={}
 for(const p of files){const q=join(h.source,p);fs.mkdirSync(dirname(q),{recursive:true});fs.copyFileSync(resolve(p),q);h.expectedFiles[p]=hash(q)}
 if(provision)h.tool=await api.installPersistentRecovery({root:h.root,sourceRoot:h.source,expectedFiles:h.expectedFiles})
 h.data=join(h.root,'data/home/storages/public.json');save(h.data,'PUBLIC UNSENT DRAFT AND UNKNOWN');h.dataSHA=hash(h.data)
 if(failure){const original=cp.spawn;cp.spawn=()=>{const c=new EventEmitter();c.pid=99999999;process.nextTick(()=>{fs.mkdirSync(join(h.root,'releases',h.v4.expectedSHA256));save(join(h.root,'releases',h.v4.expectedSHA256,'partial.txt'),'PUBLIC FAILURE');fs.rmSync(join(h.root,'data/home/profiles/desktop'),{recursive:true});c.emit('close',1,null)});return c}
  try{h.failed=await runInstallerTransaction({root:h.root,...h.v4,expectedCurrent:h.v3.expectedSHA256,transactionRoot:join(h.root,'installer-transactions','user-public-failure')})}finally{cp.spawn=original}
 }
 return h
}
test('installed command lists recovery without its developer or package source directory',async t=>{
 const h=await userRoot(t);fs.renameSync(h.source,h.source+'-unavailable')
 assert.equal(api.verifyPersistentRecovery(h.root,h.tool.id).root,h.root)
 const r=cp.spawnSync('/bin/sh',[h.tool.launcher,'--list'],{encoding:'utf8',env:{...process.env,NODE_OPTIONS:'--require=/PUBLIC-MUST-NOT-LOAD'}})
 assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/没有可恢复/)
})
test('command rejects a changed helper before importing its executable contents',async t=>{
 const h=await userRoot(t),p=join(h.tool.directory,'scripts/f-user-recovery.mjs')
 fs.writeFileSync(p,"import fs from 'node:fs';fs.writeFileSync("+JSON.stringify(h.data)+",'UNSAFE IMPORT');\n")
 const r=cp.spawnSync('/bin/sh',[h.tool.launcher,'--list'],{encoding:'utf8'})
 assert.equal(r.status,1);assert.equal(hash(h.data),h.dataSHA)
})
test('command refuses a changed interpreter before executing its code',async t=>{
 const h=await userRoot(t)
 fs.writeFileSync(join(h.root,'control/node'),'#!/bin/sh\nprintf UNSAFE > '+JSON.stringify(h.data)+'\n');fs.chmodSync(join(h.root,'control/node'),0o755)
 const r=cp.spawnSync('/bin/sh',[h.tool.launcher,'--list'],{encoding:'utf8'})
 assert.equal(r.status,1);assert.equal(hash(h.data),h.dataSHA)
})
test('a caller-provided hash cannot approve a companion controller different from the installed fixed controller',async t=>{
 const h=await userRoot(t,{provision:false}),p=join(h.source,'scripts/f-installed-runtime.mjs');fs.appendFileSync(p,'\n// foreign controller revision\n');h.expectedFiles['scripts/f-installed-runtime.mjs']=hash(p)
 await assert.rejects(()=>api.installPersistentRecovery({root:h.root,sourceRoot:h.source,expectedFiles:h.expectedFiles}),/controller|control.*identity/)
 assert.equal(fs.existsSync(join(h.root,'恢复DSH-Oasis.command')),false);assert.equal(hash(h.data),h.dataSHA)
})
test('persistent source, root and launcher identities cannot be silently reapproved',async t=>{
 const h=await userRoot(t);fs.appendFileSync(h.tool.launcher,'\n# foreign edit\n')
 assert.throws(()=>api.verifyPersistentRecovery(h.root,h.tool.id),/launcher|identity|hash/)
 assert.throws(()=>api.verifyPersistentRecovery(h.base,h.tool.id),/root|identity|ENOENT/)
 assert.equal(hash(h.data),h.dataSHA)
})
test('only original published transaction hashes are offered and tampered journals refuse',async t=>{
 const h=await userRoot(t,{failure:true}),rows=api.listUserRecoveries(h.root,h.tool.id)
 assert.equal(rows.length,1);assert.equal(rows[0].transactionSHA256,h.failed.transactionSHA256)
 fs.appendFileSync(join(h.failed.transactionRoot,'transaction.json'),' ')
 await assert.rejects(()=>api.prepareUserRecovery({root:h.root,toolId:h.tool.id,receipt:rows[0]}),/hash|identity|drift/)
 assert.equal(hash(h.data),h.dataSHA);assert.equal(fs.existsSync(join(h.failed.transactionRoot,'recovery-result.json')),false)
})
test('an unpublished journal cannot be adopted by computing its current hash',async t=>{
 const h=await userRoot(t,{failure:true});for(const p of fs.readdirSync(join(h.root,'installer-receipts')))fs.unlinkSync(join(h.root,'installer-receipts',p))
 assert.deepEqual(api.listUserRecoveries(h.root,h.tool.id),[]);assert.ok(fs.existsSync(join(h.failed.transactionRoot,'transaction.json')))
})
test('a foreign root owner is rejected before acquiring either installed writer lock',async t=>{
 const h=await userRoot(t,{provision:false}),stat=fs.statSync,open=fs.openSync;let enters=0
 t.mock.method(fs,'statSync',function(p,...args){const s=stat.call(this,p,...args);return p===h.root?new Proxy(s,{get:(v,k)=>k==='uid'?process.getuid()+1:Reflect.get(v,k)}):s})
 t.mock.method(fs,'openSync',function(p,...args){if(p===join(h.root,'startup.lock')||p===join(h.root,'data/startup.lock'))enters++;return open.call(this,p,...args)})
 await assert.rejects(()=>api.installPersistentRecovery({root:h.root,sourceRoot:h.source,expectedFiles:h.expectedFiles}),/owner|identity/)
 assert.equal(enters,0);assert.equal(hash(h.data),h.dataSHA)
})
test('receipt metadata cannot change the user preview of its original pinned journal',async t=>{
 const h=await userRoot(t,{failure:true}),old=api.listUserRecoveries(h.root,h.tool.id)[0],record=JSON.parse(fs.readFileSync(old.receiptPath));record.beforeCurrent='0'.repeat(64)
 const raw=JSON.stringify(record,null,2)+'\n',path=join(h.root,'installer-receipts',record.id+'.'+(await import('node:crypto')).createHash('sha256').update(raw).digest('hex')+'.json');fs.unlinkSync(old.receiptPath);fs.writeFileSync(path,raw)
 await assert.rejects(async()=>{const receipt=api.listUserRecoveries(h.root,h.tool.id)[0];await api.prepareUserRecovery({root:h.root,toolId:h.tool.id,receipt})},/journal|identity/)
 assert.equal(hash(h.data),h.dataSHA);assert.equal(fs.existsSync(join(h.failed.transactionRoot,'recovery-result.json')),false)
})
test('interactive preview can be cancelled without changing the failed Profile, candidate or data',async t=>{
 const h=await userRoot(t,{failure:true}),rows=api.listUserRecoveries(h.root,h.tool.id),answers=[rows[0].id,''],messages=[]
 const r=await api.runRecoveryCli({root:h.root,toolId:h.tool.id,args:[],question:async()=>answers.shift(),write:s=>messages.push(s)})
 assert.equal(r.exitCode,0);assert.match(messages.join(''),/取消/);assert.equal(hash(h.data),h.dataSHA);assert.ok(fs.existsSync(join(h.root,'releases',h.v4.expectedSHA256)));assert.equal(fs.existsSync(join(h.failed.transactionRoot,'recovery-result.json')),false)
})
test('ordinary terminal recovery uses a numbered choice and a plain confirmation while retaining the exact plan binding',async t=>{
 const h=await userRoot(t,{failure:true}),answers=['1','恢复'],messages=[]
 const result=await api.runRecoveryCli({root:h.root,toolId:h.tool.id,args:[],question:async()=>answers.shift(),write:s=>messages.push(s)})
 assert.equal(result.exitCode,0);assert.equal(result.result.current,h.v3.expectedSHA256);assert.equal(hash(h.data),h.dataSHA)
 const consent=JSON.parse(fs.readFileSync(join(h.failed.transactionRoot,'user-recovery-confirmation.json')))
 assert.equal(consent.userAnswer,'恢复');assert.equal(consent.selectedReceiptId,'user-public-failure');assert.match(consent.planSHA256,/^[a-f0-9]{64}$/)
 assert.equal(messages.join('').includes(h.failed.transactionSHA256),false,'normal user flow should not require implementation hashes')
})
test('exact plan confirmation restores explicitly and preserves its consent and public data',async t=>{
 const h=await userRoot(t,{failure:true}),receipt=api.listUserRecoveries(h.root,h.tool.id)[0],prepared=await api.prepareUserRecovery({root:h.root,toolId:h.tool.id,receipt})
 await assert.rejects(()=>api.applyUserRecovery({root:h.root,toolId:h.tool.id,prepared,confirmation:'RESTORE WRONG'}),/confirm|确认/)
 assert.equal(fs.existsSync(join(h.failed.transactionRoot,'recovery-result.json')),false)
 const result=await api.applyUserRecovery({root:h.root,toolId:h.tool.id,prepared,confirmation:'RESTORE '+prepared.sha256.slice(0,12)})
 assert.equal(result.current,h.v3.expectedSHA256);assert.equal(hash(h.data),h.dataSHA)
 const consent=JSON.parse(fs.readFileSync(join(h.failed.transactionRoot,'user-recovery-confirmation.json')))
 assert.equal(consent.planSHA256,prepared.sha256);assert.equal(consent.toolId,h.tool.id);assert.ok(fs.existsSync(join(h.failed.transactionRoot,'quarantined-release/partial.txt')))
})
