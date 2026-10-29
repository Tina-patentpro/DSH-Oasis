import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import cp from 'node:child_process'
import {join} from 'node:path'
import {EventEmitter} from 'node:events'
import {setup,save} from './f-installed-fixture.mjs'
import {installFBundle,upgradeFInstallation} from '../f-installed-runtime.mjs'
import {buildNativeInstaller} from '../f-native-installer.mjs'
import {executeNativeInstallerRequest} from '../f-installer-transaction.mjs'
import {verifyPersistentRecovery} from '../f-user-recovery.mjs'
function native(t){const h=setup(t),original=cp.execFileSync;t.mock.method(cp,'execFileSync',function(cmd,args,options){if(['/usr/bin/pkgbuild','/usr/bin/productbuild'].includes(cmd)){save(args.at(-1),'PUBLIC native package boundary');return'PUBLIC built'}return original.call(this,cmd,args,options)});return h}
const spec=(h,label,action,input,current)=>({...input,root:h.root,allowedRoot:h.base,out:join(h.base,label+'.pkg'),action,...current?{expectedCurrent:current}:{}})
test('native build defaults to a bound persistent recovery delivery and a new install leaves the command in its root',async t=>{
 const h=native(t),built=await buildNativeInstaller(spec(h,'install','install',h.v3))
 assert.equal(built.request.schemaVersion,2,'native delivery must opt into persistent recovery')
 assert.ok(built.request.recoveryFiles['scripts/f-user-recovery.mjs'])
 await executeNativeInstallerRequest(join(built.resources,'request.json'),built.requestSHA256)
 assert.ok(fs.existsSync(join(h.root,'恢复DSH-Oasis.command')))
 const id=fs.readdirSync(join(h.root,'maintenance'))[0];assert.equal(verifyPersistentRecovery(h.root,id).root,h.root)
})
test('a changed native companion is rejected before an installation target is created',async t=>{
 const h=native(t),built=await buildNativeInstaller(spec(h,'drift','install',h.v3))
 fs.appendFileSync(join(built.resources,'companion/scripts/f-user-recovery.mjs'),'\n// foreign source\n')
 await assert.rejects(()=>executeNativeInstallerRequest(join(built.resources,'request.json'),built.requestSHA256),/recovery source hash|executable source/)
 assert.equal(fs.existsSync(h.root),false)
})
test('native rollback carries its own interpreter and restores a registered release without replacing user data',async t=>{
 const h=native(t);await installFBundle({...h.v3,root:h.root});await upgradeFInstallation(h.root,{...h.v4,expectedCurrent:h.v3.expectedSHA256})
 const data=join(h.root,'data/home/storages/public.json');save(data,'PUBLIC V4 USER EDIT')
 const built=await buildNativeInstaller(spec(h,'rollback','rollback',h.v3,h.v4.expectedSHA256))
 assert.equal(fs.existsSync(join(built.resources,'bundle/payload')),false,'rollback must use the registered release, not reinstall its payload')
 assert.ok(fs.existsSync(join(built.resources,'runner-node')))
 const result=await executeNativeInstallerRequest(join(built.resources,'request.json'),built.requestSHA256)
 assert.equal(result.current,h.v3.expectedSHA256);assert.equal(fs.readFileSync(data,'utf8'),'PUBLIC V4 USER EDIT');assert.ok(fs.existsSync(join(h.root,'恢复DSH-Oasis.command')))
})
test('native upgrade makes its recovery command durable before dispatching the upgrade child',async t=>{
 const h=native(t);await installFBundle({...h.v3,root:h.root});const built=await buildNativeInstaller(spec(h,'upgrade','upgrade',h.v4,h.v3.expectedSHA256));let presentAtDispatch=false
 const original=cp.spawn;cp.spawn=()=>{presentAtDispatch=fs.existsSync(join(h.root,'恢复DSH-Oasis.command'));const c=new EventEmitter();c.pid=99999999;process.nextTick(async()=>{try{await upgradeFInstallation(h.root,{...h.v4,expectedCurrent:h.v3.expectedSHA256});c.emit('close',0,null)}catch(e){c.emit('error',e)}});return c}
 let result;try{result=await executeNativeInstallerRequest(join(built.resources,'request.json'),built.requestSHA256)}finally{cp.spawn=original}
 assert.equal(presentAtDispatch,true);assert.equal(result.outcome,'SUCCEEDED');assert.equal(result.current,h.v4.expectedSHA256)
})
