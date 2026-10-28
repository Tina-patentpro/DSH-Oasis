import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {join,resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {createHash} from 'node:crypto'
const api=await import('../../patches/storage-json-single-owner/installed-lease.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
function setup(t){
 assert.equal(typeof api.acquireInstalledLease,'function','installed writer lease must exist')
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'installed-lease-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}))
 fs.mkdirSync(join(root,'data/home'),{recursive:true})
 const gateSHA256=createHash('sha256').update(fs.readFileSync(resolve('patches/storage-json-single-owner/installed-lease.mjs'))).digest('hex')
 fs.writeFileSync(join(root,'installation.json'),JSON.stringify({schemaVersion:1,mode:'OASIS_F_INSTALLED',root,current:'a'.repeat(64),gateSHA256}))
 return{root,storage:join(root,'data/home/storages')}
}
test('installed provider rejects missing/foreign/expired lease before constructing any backend',t=>{
 const f=setup(t);let constructed=0
 const enter=env=>{api.assertInstalledLease(f.storage,env);constructed++}
 assert.throws(()=>enter({}),/lease|installation/)
 const lease=api.acquireInstalledLease(f.root,'sdk')
 assert.throws(()=>enter({...lease.env,DSH_OASIS_WRITER_NONCE:'wrong'}),/lease/)
 assert.throws(()=>api.assertInstalledLease(join(f.root,'other'),lease.env),/root/)
 assert.equal(constructed,0);enter(lease.env);assert.equal(constructed,1)
 assert.equal(fs.existsSync(f.storage),false,'lease check must not create a missing data root')
 lease.release();assert.throws(()=>enter(lease.env));assert.equal(constructed,1)
})
test('installed lease excludes four roles and refuses stale ownership without auto-stealing',t=>{
 const f=setup(t),lease=api.acquireInstalledLease(f.root,'desktop')
 for(const role of ['desktop','sdk','recovery','maintenance'])assert.throws(()=>api.acquireInstalledLease(f.root,role),{code:'F_INSTALL_BUSY'})
 lease.release();const next=api.acquireInstalledLease(f.root,'recovery');next.release()
 fs.writeFileSync(join(f.root,'startup.lock'),'PUBLIC stale marker')
 assert.throws(()=>api.acquireInstalledLease(f.root,'maintenance'),{code:'F_INSTALL_BUSY'})
 assert.equal(fs.readFileSync(join(f.root,'startup.lock'),'utf8'),'PUBLIC stale marker')
})
test('installed provider rejects root links and descendant aliases without reading public data',t=>{
 const f=setup(t),outside=fs.mkdtempSync(join(tmpdir(),'installed-outside-'));t.after(()=>fs.rmSync(outside,{recursive:true,force:true}))
 const lease=api.acquireInstalledLease(f.root,'sdk')
 try{
  fs.symlinkSync(outside,f.storage);assert.throws(()=>api.assertInstalledLease(f.storage,lease.env),/link|canonical/);fs.unlinkSync(f.storage)
  fs.mkdirSync(f.storage);fs.symlinkSync(outside,join(f.storage,'public-link'));assert.throws(()=>api.assertInstalledLease(f.storage,lease.env),/link/)
  assert.deepEqual(fs.readdirSync(outside),[])
 }finally{lease.release()}
})
