import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import cp from 'node:child_process'
import {join,relative} from 'node:path'
import {setup,save,hash} from './f-installed-fixture.mjs'
import * as api from '../f-installed-runtime.mjs'
import {acquireInstalledLease} from '../../patches/storage-json-single-owner/installed-lease.mjs'

function candidate(t,h,change=()=>{}){
 const f=h.v3,payload=join(f.bundle,'payload'),file=join(payload,'profile-template.json'),template=JSON.parse(fs.readFileSync(file))
 const guards=['src/index.js','src/workbench-rpc.js','src/v340-native-model.js','src/dsh-generation-adapter.js','lib/client.js']
 for(const name of guards)save(join(payload,'components/c3',name),'PUBLIC normal generation boundary '+name)
 template.nativeM06Generation={schemaVersion:1,policy:'m06-native-generation-v1',archiveSHA256:'c'.repeat(64),root:h.root,
  provider:'deepseek-official',model:'deepseek-flash',maxTokens:8192,inputSHA256:'d'.repeat(64),
  budget:{model:1,api:0,upload:0,payment:0},guardedFiles:Object.fromEntries(guards.map(n=>[n,hash(join(payload,'components/c3',n))]))}
 template.patch.find(x=>x.id==='llm-deepseek').disabled=false
 template.patch.find(x=>x.id==='llm-deepseek').config={baseURL:'https://api.deepseek.com/anthropic',maxTokens:8192,retryPolicy:{mode:'normal',maxRetries:0}}
 template.patch.push({insert:[{id:'oasis-professional-service-m06-native-generation',name:'@OASIS_RELEASE_ROOT@/components/c3/src/m06-controlled-host-013.js'}]})
 const app=join(payload,'App/DSH Desktop.app/Contents/Resources/app');save(join(app,'package.json'),{type:'module'});save(join(app,'lib/profile.js'),`export function prepareDesktopProfile(){return {requiresDependencyMigration:false,port:57619,networkExposure:'loopback'}}`)
 change(template);save(file,template)
 const manifest=JSON.parse(fs.readFileSync(join(f.bundle,'bundle.json')));manifest.kind='OASIS_F_NATIVE_M06_BUNDLE';manifest.realCallBudget=1;manifest.files={}
 function walk(p){for(const n of fs.readdirSync(p)){const p2=join(p,n);if(fs.lstatSync(p2).isDirectory())walk(p2);else manifest.files[relative(payload,p2)]=hash(p2)}}walk(payload)
 save(join(f.bundle,'bundle.json'),manifest);f.expectedSHA256=hash(join(f.bundle,'bundle.json'))
 const original=cp.execFileSync;t.mock.method(cp,'execFileSync',function(cmd,args,options){if(cmd.endsWith('/node/bin/node')&&args[0]==='--input-type=module')return original.call(this,process.execPath,args,options);return original.call(this,cmd,args,options)})
 return f
}

test('explicit native M06 entry admits only its fixed one-call provider configuration and retains writer ownership',async t=>{
 const h=setup(t),f=candidate(t,h);await api.installFBundle({...f,root:h.root})
 t.mock.method(cp,'spawn',()=>assert.fail('Offline preparation must not start App'))
 await api.withInstalledLaunchSpec(h.root,async spec=>{
  assert.equal(spec.nativeM06Generation,true)
  assert.equal(spec.nativeBusinessRecovery,false)
  assert.equal(spec.realCallBudget,1)
  assert.equal(spec.env.OASIS_NATIVE_BUSINESS_RECOVERY,undefined)
  assert.equal(spec.env.OASIS_NATIVE_ZERO_GENERATION,undefined)
  assert.equal(spec.env.DEEPSEEK_API_KEY,undefined)
  assert.equal(spec.env.DSH_HOME,join(h.root,'data/home'))
  assert.equal(spec.env.HTTP_PROXY,undefined)
  // Desktop probes Chromium's fixed proxy and re-applies it to the Host.
  // Only the approved provider may bypass that synthesized proxy.
  assert.equal(spec.env.NO_PROXY,'localhost,127.0.0.1,::1,api.deepseek.com')
  assert.ok(spec.args.includes('--proxy-server=http://127.0.0.1:9'))
  assert.ok(spec.args.includes('--proxy-bypass-list=localhost;127.0.0.1;[::1]'))
  assert.equal(spec.shell,false)
  assert.throws(()=>acquireInstalledLease(h.root,'sdk'),{code:'F_INSTALL_BUSY'})
 })
 assert.equal(api.checkFInstallation(h.root).realCallBudget,1)
 assert.equal(fs.existsSync(join(h.root,'startup.lock')),false)
})

for(const [label,change]of [
 ['second model request',t=>t.nativeM06Generation.budget.model=2],
 ['API budget',t=>t.nativeM06Generation.budget.api=1],
 ['foreign root',t=>t.nativeM06Generation.root='/tmp/other'],
 ['foreign endpoint',t=>t.patch.find(x=>x.id==='llm-deepseek').config.baseURL='https://example.invalid'],
 ['provider retries',t=>t.patch.find(x=>x.id==='llm-deepseek').config.retryPolicy.maxRetries=5],
 ['output above scope',t=>t.patch.find(x=>x.id==='llm-deepseek').config.maxTokens=8193],
 ['another model provider',t=>t.patch.find(x=>x.id==='llm-pi-ai').disabled=false],
 ['mixed recovery',t=>t.nativeBusinessRecovery={}],
 ['guard drift',t=>t.nativeM06Generation.guardedFiles['src/index.js']='f'.repeat(64)],
])test('native M06 preparation rejects '+label,async t=>{
 const h=setup(t),f=candidate(t,h,change);await assert.rejects(api.installFBundle({...f,root:h.root}));assert.equal(fs.existsSync(join(h.root,'installation.json')),false)
})
