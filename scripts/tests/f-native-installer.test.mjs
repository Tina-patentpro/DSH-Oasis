import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import cp from 'node:child_process'
import {join} from 'node:path'
import {setup,save} from './f-installed-fixture.mjs'
import {createHash} from 'node:crypto'
import {tmpdir} from 'node:os'
import {resolve} from 'node:path'
import {executeNativeInstallerRequest} from '../f-installer-transaction.mjs'
const api=await import('../f-native-installer.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return{};throw e})
function spec(t){const h=setup(t),allowedRoot=join(h.base,'private-targets');fs.mkdirSync(allowedRoot);return{...h.v3,allowedRoot,root:join(allowedRoot,"public root ' one"),out:join(h.base,'Controlled Installer.pkg'),action:'install'}}
test('native Installer uses the system current-user domain and argv-safe resource bootstrap',t=>{
 assert.equal(typeof api.nativeInstallerPlan,'function','native PKG plan required');const s=spec(t),r=api.nativeInstallerPlan(s)
 assert.match(r.distribution,/enable_currentUserHome="true"/);assert.match(r.distribution,/enable_localSystem="false"/)
 assert.match(r.postinstall,/exec "\$SCRIPT_DIR\/resources\/bundle\/payload\/node\/bin\/node"/)
 assert.equal(r.postinstall.includes(s.root),false);assert.equal(r.request.realCallBudget,0)
 assert.equal(r.request.ownerUid,process.getuid())
})
test('native package refuses a different execution identity before creating the target',async t=>{
 const s=spec(t),p=join(s.allowedRoot,'request.json'),request={schemaVersion:1,root:s.root,allowedRoot:s.allowedRoot,action:'install',bundleSHA256:s.expectedSHA256,ownerUid:process.getuid()+1,realCallBudget:0};save(p,request)
 const sha=createHash('sha256').update(fs.readFileSync(p)).digest('hex')
 await assert.rejects(()=>executeNativeInstallerRequest(p,sha),/identity|owner|user/)
 assert.equal(fs.existsSync(s.root),false)
})
test('a valid native request records the actual target-user execution alongside the installed data',async t=>{
 const s=spec(t),plan=api.nativeInstallerPlan(s),p=join(s.allowedRoot,'request.json')
 fs.cpSync(s.bundle,join(s.allowedRoot,'bundle'),{recursive:true});save(p,plan.raw)
 const result=await executeNativeInstallerRequest(p,plan.requestSHA256);assert.equal(result.current,s.expectedSHA256)
 const receipt=join(s.root,'data/evidence','native-request-'+plan.request.transactionId+'.json')
 assert.ok(fs.existsSync(receipt),'native execution receipt must exist')
 const actual=JSON.parse(fs.readFileSync(receipt));assert.equal(actual.uid,process.getuid());assert.equal(actual.requestSHA256,plan.requestSHA256)
})
test('PackageKit /tmp aliases are canonicalized before verifying bundled resources',async t=>{
 const s=spec(t),plan=api.nativeInstallerPlan(s),p=join(s.allowedRoot,'request.json'),alias=join(s.allowedRoot,'..','request-alias')
 fs.cpSync(s.bundle,join(s.allowedRoot,'bundle'),{recursive:true});save(p,plan.raw);fs.symlinkSync(s.allowedRoot,alias)
 const result=await executeNativeInstallerRequest(join(alias,'request.json'),plan.requestSHA256)
 assert.equal(result.current,s.expectedSHA256)
})
test('the native CLI still executes when PackageKit supplies a symlinked /tmp script path',t=>{
 const dir=fs.mkdtempSync(join(tmpdir(),'native-entry-alias-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}))
 const alias=join(dir,'companion');fs.symlinkSync(resolve('scripts'),alias)
 const r=cp.spawnSync(process.execPath,[join(alias,'f-installer-transaction.mjs'),'--invalid-public-argument'],{encoding:'utf8'})
 assert.equal(r.status,1,'an alias must not silently skip the CLI and report success');assert.match(r.stderr,/Use --package/)
})
test('native package builds with fixed system tools, carries exact original bundle and separate companion',async t=>{
 assert.equal(typeof api.buildNativeInstaller,'function');const s=spec(t),original=cp.execFileSync,calls=[]
 t.mock.method(cp,'execFileSync',function(command,args,options){
  if(['/usr/bin/pkgbuild','/usr/bin/productbuild'].includes(command)){calls.push({command,args});fs.writeFileSync(args.at(-1),'PUBLIC native package process boundary');return Buffer.from('')}
  return original.call(this,command,args,options)
 })
 const r=await api.buildNativeInstaller(s);assert.equal(calls.length,2);assert.ok(fs.existsSync(r.package));assert.ok(r.sha256)
 assert.deepEqual(fs.readFileSync(join(r.resources,'bundle/bundle.json')),fs.readFileSync(join(s.bundle,'bundle.json')))
 assert.ok(fs.existsSync(join(r.resources,'companion/scripts/f-installer-transaction.mjs')))
 assert.equal(fs.existsSync(join(r.resources,'bundle/payload/controller/scripts/f-installer-transaction.mjs')),false)
})
test('installer refuses a target outside the declared private root and invalid upgrade identity',t=>{
 assert.equal(typeof api.nativeInstallerPlan,'function');const s=spec(t)
 assert.throws(()=>api.nativeInstallerPlan({...s,root:'/Applications/DSH Desktop.app'}),/target|root/)
 assert.throws(()=>api.nativeInstallerPlan({...s,action:'upgrade'}),/current|revision/)
 assert.equal(fs.existsSync(s.out),false)
})
