import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {setup,save,hash} from './f-installed-fixture.mjs'
import {installFBundle,checkFInstallation,withInstalledWriter} from '../f-installed-runtime.mjs'
import {acquireJsonRootOwnership} from '../../patches/storage-json-single-owner/ownership.mjs'
const helper=await import('../f-installed-controller-handoff.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
async function prepared(t){
 const h=setup(t);await installFBundle({...h.v3,root:h.root})
 const script=join(h.v4.bundle,'payload/controller/scripts/f-installed-runtime.mjs')
 fs.appendFileSync(script,'\n// Explicit second fixture controller identity.\n')
 const manifest=join(h.v4.bundle,'bundle.json'),m=JSON.parse(fs.readFileSync(manifest))
 m.files['controller/scripts/f-installed-runtime.mjs']=hash(script);fs.writeFileSync(manifest,JSON.stringify(m,null,2)+'\n')
 const state=join(h.root,'installation.json'),control=join(h.root,'control/scripts/f-installed-runtime.mjs'),business=join(h.root,'data/workspace-a/retained.md')
 save(business,'PUBLIC retained original business bytes\n')
 return {...h,state,control,business,beforeState:fs.readFileSync(state),beforeControl:fs.readFileSync(control),args:{root:h.root,expectedCurrent:h.v3.expectedSHA256,expectedOldControllerSHA256:hash(control),bundle:h.v4.bundle,expectedBundleSHA256:hash(manifest),expectedNewControllerSHA256:hash(script)},newAPI:await import(pathToFileURL(script).href)}
}
function unchanged(h){assert.deepEqual(fs.readFileSync(h.state),h.beforeState);assert.deepEqual(fs.readFileSync(h.control),h.beforeControl);assert.equal(fs.readFileSync(h.business,'utf8'),'PUBLIC retained original business bytes\n');checkFInstallation(h.root)}
test('handoff preserves receipt and business bytes, records originals, and releases ownership',async t=>{
 assert.equal(typeof helper.handoffFInstalledController,'function','journaled controller handoff must exist')
 const h=await prepared(t),r=await helper.handoffFInstalledController(h.args)
 assert.equal(hash(h.control),h.args.expectedNewControllerSHA256)
 assert.equal(h.newAPI.checkFInstallation(h.root).current,h.args.expectedCurrent)
 assert.equal(fs.readFileSync(h.business,'utf8'),'PUBLIC retained original business bytes\n')
 assert.deepEqual(fs.readFileSync(join(r.journal,'before/installation.json')),h.beforeState)
 assert.deepEqual(fs.readFileSync(join(r.journal,'before/control/scripts/f-installed-runtime.mjs')),h.beforeControl)
 assert.deepEqual(JSON.parse(fs.readFileSync(h.state)).releases,JSON.parse(h.beforeState).releases)
 assert.equal(fs.existsSync(join(h.root,'startup.lock')),false)
 assert.equal(fs.existsSync(join(h.root,'RECOVERY_REQUIRED')),false)
 assert.equal(JSON.parse(fs.readFileSync(join(r.journal,'result.json'))).status,'CONTROLLER_HANDOFF_CHECKED')
 const oldReceipt=fs.readFileSync(join(h.root,'releases',h.args.expectedCurrent,'receipt.json'))
 const upgraded=await h.newAPI.upgradeFInstallation(h.root,{bundle:h.args.bundle,expectedSHA256:h.args.expectedBundleSHA256,expectedCurrent:h.args.expectedCurrent})
 assert.equal(upgraded.current,h.args.expectedBundleSHA256)
 assert.deepEqual(fs.readFileSync(join(h.root,'releases',h.args.expectedCurrent,'receipt.json')),oldReceipt)
 assert.equal(fs.readFileSync(h.business,'utf8'),'PUBLIC retained original business bytes\n')
})
for(const field of ['expectedOldControllerSHA256','expectedNewControllerSHA256','expectedBundleSHA256','expectedCurrent'])test('refuses mismatched '+field+' before mutation',async t=>{
 assert.equal(typeof helper.handoffFInstalledController,'function')
 const h=await prepared(t);await assert.rejects(helper.handoffFInstalledController({...h.args,[field]:'0'.repeat(64)}));unchanged(h)
})
test('existing installed writer prevents handoff without mutation',async t=>{
 assert.equal(typeof helper.handoffFInstalledController,'function')
 const h=await prepared(t)
 await withInstalledWriter(h.root,'sdk',async()=>{await assert.rejects(helper.handoffFInstalledController(h.args),{code:'F_INSTALL_BUSY'})})
 unchanged(h)
})
test('state write failure restores exact original control and installation bytes',async t=>{
 assert.equal(typeof helper.handoffFInstalledController,'function')
 const h=await prepared(t),rename=fs.renameSync;let injected=false
 t.mock.method(fs,'renameSync',function(from,to){if(to===h.state&&!injected){injected=true;throw Error('PUBLIC single metadata write failure')}return rename.call(this,from,to)})
 await assert.rejects(helper.handoffFInstalledController(h.args),/PUBLIC single metadata write failure/)
 assert.equal(injected,true);unchanged(h)
 assert.equal(fs.existsSync(join(h.root,'RECOVERY_REQUIRED')),false)
})
test('preexisting recovery marker is never removed',async t=>{
 assert.equal(typeof helper.handoffFInstalledController,'function')
 const h=await prepared(t),p=join(h.root,'RECOVERY_REQUIRED');save(p,'PUBLIC prior failure\n')
 await assert.rejects(helper.handoffFInstalledController(h.args),/recovery incomplete/)
 assert.equal(fs.readFileSync(p,'utf8'),'PUBLIC prior failure\n');assert.deepEqual(fs.readFileSync(h.state),h.beforeState);assert.deepEqual(fs.readFileSync(h.control),h.beforeControl)
})
test('rollback failure retains recovery marker and releases the installed lease',async t=>{
 const h=await prepared(t),rename=fs.renameSync
 t.mock.method(fs,'renameSync',function(from,to){if(to===h.state)throw Error('PUBLIC persistent metadata failure');return rename.call(this,from,to)})
 await assert.rejects(helper.handoffFInstalledController(h.args),/recovery incomplete/)
 assert.equal(fs.existsSync(join(h.root,'RECOVERY_REQUIRED')),true)
 assert.equal(fs.existsSync(join(h.root,'startup.lock')),false)
 assert.throws(()=>checkFInstallation(h.root),/recovery incomplete/)
 assert.equal(fs.readFileSync(h.business,'utf8'),'PUBLIC retained original business bytes\n')
})
test('snapshot read failure releases JSON ownership before propagating the error',async t=>{
 const h=await prepared(t),storage=join(h.root,'data/home/storages'),read=fs.readFileSync;let injected=false
 t.mock.method(fs,'readFileSync',function(path,...args){
  if(path===h.control&&!injected&&fs.existsSync(join(storage,'.dsh-json-single-owner.sqlite'))){injected=true;throw Error('PUBLIC snapshot read failure')}
  return read.call(this,path,...args)
 })
 await assert.rejects(helper.handoffFInstalledController(h.args),/PUBLIC snapshot read failure/)
 assert.equal(injected,true);unchanged(h)
 const owner=await acquireJsonRootOwnership(storage);owner.release()
 assert.equal(fs.existsSync(join(h.root,'startup.lock')),false)
})
