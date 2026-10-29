import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import cp from 'node:child_process'
import {join,resolve,dirname} from 'node:path'
import {setup,save,hash} from './f-installed-fixture.mjs'
import {installFBundle} from '../f-installed-runtime.mjs'
import {installPersistentRecovery,recoverySourceFiles} from '../f-user-recovery.mjs'
import {nativeInstallerPlan} from '../f-native-installer.mjs'
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'"
function hostilePath(base){
 const bin=join(base,'hostile-bin'),marker=join(base,'dirname-executed');fs.mkdirSync(bin)
 save(join(bin,'dirname'),'#!/bin/sh\nprintf unsafe > '+quote(marker)+'\nexec /usr/bin/dirname "$@"\n');fs.chmodSync(join(bin,'dirname'),0o755)
 return{marker,env:{PATH:bin+':/usr/bin:/bin',HOME:base}}
}
test('persistent launcher never resolves inherited PATH code before rejecting a changed Node',async t=>{
 const h=setup(t);await installFBundle({...h.v3,root:h.root});const source=join(h.base,'source'),expectedFiles={}
 for(const p of recoverySourceFiles){const q=join(source,p);fs.mkdirSync(dirname(q),{recursive:true});fs.copyFileSync(resolve(p),q);expectedFiles[p]=hash(q)}
 const tool=await installPersistentRecovery({root:h.root,sourceRoot:source,expectedFiles}),attack=hostilePath(h.base),nodeMarker=join(h.base,'node-executed')
 save(join(h.root,'control/node'),'#!/bin/sh\nprintf unsafe > '+quote(nodeMarker)+'\n');fs.chmodSync(join(h.root,'control/node'),0o755)
 const result=cp.spawnSync('/bin/sh',[tool.launcher,'--list'],{encoding:'utf8',env:attack.env})
 assert.equal(result.status,1);assert.match(result.stderr,/Node/);assert.equal(fs.existsSync(nodeMarker),false)
 assert.equal(fs.existsSync(attack.marker),false,'PATH-selected code must not run before Node validation')
})
test('native postinstall never resolves inherited PATH code before reaching its exact runner',t=>{
 const h=setup(t),allowedRoot=join(h.base,'allowed');fs.mkdirSync(allowedRoot)
 const plan=nativeInstallerPlan({root:join(allowedRoot,'public-root'),allowedRoot,expectedSHA256:'a'.repeat(64),persistentRecovery:true}),path=join(h.base,'postinstall'),attack=hostilePath(h.base)
 save(path,plan.postinstall);const result=cp.spawnSync('/bin/sh',[path],{encoding:'utf8',env:attack.env})
 assert.notEqual(result.status,0);assert.match(result.stderr,/resources\/bundle\/payload\/node\/bin\/node/,'fixture deliberately has no runner; shell must reach that exact boundary')
 assert.equal(fs.existsSync(attack.marker),false,'PATH-selected code must not run in native shell preamble')
})
