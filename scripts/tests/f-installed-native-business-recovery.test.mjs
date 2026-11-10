import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import cp from 'node:child_process'
import {join,relative} from 'node:path'
import {setup,save,hash} from './f-installed-fixture.mjs'
import * as api from '../f-installed-runtime.mjs'
function candidate(t,h,change=()=>{}){
 const f=h.v3,payload=join(f.bundle,'payload'),file=join(payload,'profile-template.json'),template=JSON.parse(fs.readFileSync(file))
 const guards=['src/index.js','src/workbench-rpc.js','src/workbench-connection.js','src/m06-native-business-recovery.js','src/v340-runtime-contract.js','lib/client.js']
 for(const name of guards)save(join(payload,'components/c3',name),'PUBLIC guarded boundary '+name)
 template.nativeBusinessRecovery={schemaVersion:1,policy:'m06-native-business-recovery-v1',archiveSHA256:'c'.repeat(64),budget:{model:0,api:0,upload:0,payment:0},guardedFiles:Object.fromEntries(guards.map(n=>[n,hash(join(payload,'components/c3',n))])),scope:{schemaVersion:1,policy:'m06-native-business-recovery-v1',root:h.root,workspaceId:'w',workspacePath:join(h.root,'data/workspace-a'),taskId:'t',runId:'r',inputSha256:'d'.repeat(64)}}
 template.patch.push({insert:[{id:'oasis-professional-service-m06-native-recovery',name:'@OASIS_RELEASE_ROOT@/components/c3/src/m06-native-business-recovery-host.js'}]})
 const app=join(payload,'App/DSH Desktop.app/Contents/Resources/app');save(join(app,'package.json'),{type:'module'});save(join(app,'lib/profile.js'),`export function prepareDesktopProfile(){return {requiresDependencyMigration:false,port:57619,networkExposure:'loopback'}}`)
 change(template);save(file,template)
 const manifest=JSON.parse(fs.readFileSync(join(f.bundle,'bundle.json')));manifest.files={}
 function walk(p){for(const n of fs.readdirSync(p)){const f2=join(p,n);if(fs.lstatSync(f2).isDirectory())walk(f2);else manifest.files[relative(payload,f2)]=hash(f2)}}walk(payload);save(join(f.bundle,'bundle.json'),manifest);f.expectedSHA256=hash(join(f.bundle,'bundle.json'))
 const before=cp.execFileSync;t.mock.method(cp,'execFileSync',function(cmd,args,options){if(cmd.endsWith('/node/bin/node')&&args[0]==='--input-type=module')return before.call(this,process.execPath,args,options);return before.call(this,cmd,args,options)})
 return f
}
test('recovery launch spec carries exclusive zero-real policy and does not launch App',async t=>{
 const h=setup(t),f=candidate(t,h);await api.installFBundle({...f,root:h.root})
 t.mock.method(cp,'spawn',()=>assert.fail('App may not be started'))
 await api.withInstalledLaunchSpec(h.root,async spec=>{
  assert.equal(spec.nativeBusinessRecovery,true)
  assert.equal(spec.env.OASIS_NATIVE_BUSINESS_RECOVERY,'1')
  assert.equal(spec.env.OASIS_NATIVE_ZERO_GENERATION,undefined)
  assert.equal(spec.realCallBudget,0)
 })
 assert.equal(fs.existsSync(join(h.root,'startup.lock')),false)
})
for(const [label,change]of [
 ['budget',t=>t.nativeBusinessRecovery.budget.model=1],
 ['guard drift',t=>t.nativeBusinessRecovery.guardedFiles['src/index.js']='e'.repeat(64)],
 ['mixed mode',t=>t.nativeZeroGeneration={}],
 ['foreign root',t=>t.nativeBusinessRecovery.scope.workspacePath='/tmp/other'],
])test('recovery installation rejects '+label,async t=>{
 const h=setup(t),f=candidate(t,h,change);await assert.rejects(api.installFBundle({...f,root:h.root}));assert.equal(fs.existsSync(join(h.root,'installation.json')),false)
})
