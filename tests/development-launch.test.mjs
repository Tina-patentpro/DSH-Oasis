import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, renameSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { assertS6UiAdmission, makeLaunchSpec } from '../scripts/development-launch.mjs'
function fixture() {
  const root=mkdtempSync(join(tmpdir(),'oasis-admission-v3-'))
  const checkedFiles={}
  for(const name of ['home/profiles/desktop/cordis.yml','home/profiles/desktop/cordis.patch.yml','evidence/candidate-pin.json','evidence/profile-installation-pin.json','launch.mjs']){
    const path=join(root,name);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,'synthetic immutable');checkedFiles[name]=createHash('sha256').update(readFileSync(path)).digest('hex')
  }
  const settings=join(root,'home/settings.yaml');writeFileSync(settings,'oasis-professional-service: {}\n')
  const path=join(root,'evidence/s6-ui-20260920/admission.json');mkdirSync(dirname(path),{recursive:true})
  const proof={mode:'s6-ui-check',admissionVersion:3,home:join(root,'home'),apiPolicy:'release-fixed-explicit-user-actions',nativeModelPolicy:'user-confirmed-generation',settingsPolicy:'dsh-native-mutable',checkedFiles}
  const save=()=>writeFileSync(path,JSON.stringify(proof));save()
  return {root,settings,path,proof,save}
}
test('v3 admits normal settings saves without renewing immutable code proof',()=>{
  const f=fixture();assert.doesNotThrow(()=>assertS6UiAdmission(f.root))
  writeFileSync(f.settings,'oasis-professional-service:\n  websiteProjectLinks: []\n# ordinary native save\n')
  assert.doesNotThrow(()=>assertS6UiAdmission(f.root))
})
test('v3 refuses old proof, incomplete pins, unsafe policies and immutable drift',()=>{
  for(const change of [f=>f.proof.admissionVersion=2,f=>delete f.proof.checkedFiles['launch.mjs'],f=>f.proof.settingsPolicy='anything',f=>f.proof.home='C:\\daily',f=>f.proof.apiPolicy='unrestricted']){
    const f=fixture();change(f);f.save();assert.throws(()=>assertS6UiAdmission(f.root))
  }
  const f=fixture();writeFileSync(join(f.root,'launch.mjs'),'changed');assert.throws(()=>assertS6UiAdmission(f.root),/changed/)
})
test('settings path must remain a confined ordinary file',()=>{
  const f=fixture();f.proof.checkedFiles['../outside']='a'.repeat(64);f.save();assert.throws(()=>assertS6UiAdmission(f.root))
  const g=fixture();renameSync(g.settings,g.settings+'.before');mkdirSync(g.settings)
  assert.throws(()=>assertS6UiAdmission(g.root),/ordinary file/)
  const h=fixture();h.proof.checkedFiles['home/settings.yaml']=createHash('sha256').update(readFileSync(h.settings)).digest('hex');h.save()
  assert.throws(()=>assertS6UiAdmission(h.root),/admission/i)
  const j=fixture();renameSync(join(j.root,'home'),join(j.root,'original-home'))
  symlinkSync(join(j.root,'original-home'),join(j.root,'home'),'junction')
  assert.throws(()=>assertS6UiAdmission(j.root),/Link\/junction/)
})
test('default synthetic and explicit UI launch retain the same isolated Home and filtered environment',()=>{
  const env={SystemRoot:'C:\\Windows',NODE_OPTIONS:'bad',OASIS_NATIVE_OFFLINE:'1'}
  const base=makeLaunchSpec(env,'D:\\dev'),ui=makeLaunchSpec(env,'D:\\dev',{s6UiCheck:true})
  assert.equal(base.env.OASIS_UNIFIED_FIXTURE,'1');assert.equal(ui.env.OASIS_UNIFIED_FIXTURE,undefined)
  assert.equal(ui.env.NODE_OPTIONS,undefined);assert.equal(ui.env.OASIS_NATIVE_OFFLINE,undefined)
  assert.equal(base.env.DSH_HOME,ui.env.DSH_HOME)
})
