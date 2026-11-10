import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import cp from 'node:child_process'
import {join,relative} from 'node:path'
import {EventEmitter} from 'node:events'
import {setup,save,hash} from './f-installed-fixture.mjs'
import * as api from '../f-installed-runtime.mjs'
import {assertInstalledLease,acquireInstalledLease} from '../../patches/storage-json-single-owner/installed-lease.mjs'

function zeroBundle(h,change=()=>{}) {
 const f=h.v3,payload=join(f.bundle,'payload'),p=join(payload,'profile-template.json');
 const template=JSON.parse(fs.readFileSync(p));
 for(const name of ['src/index.js','src/workbench-rpc.js'])save(join(payload,'components/c3',name),'// PUBLIC guard boundary '+name+'\n');
 template.nativeZeroGeneration={schemaVersion:1,policy:'m06-native-zero-generation-installed-v1',
  archiveSHA256:'c'.repeat(64),budget:{model:0,api:0,upload:0,payment:0},
  guardedFiles:Object.fromEntries(['src/index.js','src/workbench-rpc.js'].map(n=>[n,hash(join(payload,'components/c3',n))]))};
 change(template.nativeZeroGeneration);save(p,template);
 // Explicit upstream preparation boundary. The controller must run it before sealing,
 // never after the active Profile has been frozen, and must propagate failure.
 const app=join(payload,'App/DSH Desktop.app/Contents/Resources/app');
 save(join(app,'package.json'),{type:'module'});
 save(join(app,'lib/profile.js'),`import fs from 'node:fs';import {join} from 'node:path';
 export function prepareDesktopProfile(_v,home){
  fs.writeFileSync(join(home,'profiles/desktop/cordis.yml'),'[]\\n# PUBLIC preparation boundary\\n');
  return {requiresDependencyMigration:false,port:57619,networkExposure:'loopback'};
 }\n`);
 const m=JSON.parse(fs.readFileSync(join(f.bundle,'bundle.json')));m.files={};
 function walk(dir){for(const n of fs.readdirSync(dir)){const x=join(dir,n);if(fs.lstatSync(x).isDirectory())walk(x);else m.files[relative(payload,x)]=hash(x);}}walk(payload);
 save(join(f.bundle,'bundle.json'),m);f.expectedSHA256=hash(join(f.bundle,'bundle.json'));return f;
}
function runPreparationWithRealNode(t){
 const before=cp.execFileSync;
 t.mock.method(cp,'execFileSync',function(cmd,args,options){
  if(cmd.endsWith('/node/bin/node')&&args[0]==='--input-type=module')return before.call(this,process.execPath,args,options);
  return before.call(this,cmd,args,options);
 });
}

// Catches sealing before Desktop preparation, absent zero marker, wrong cwd/data root,
// leaked parent credentials, and releasing the actual writer lease before callback exit.
test('installed zero spec uses sealed prepared Profile and live writer without spawning App',async t=>{
 const h=setup(t),f=zeroBundle(h);runPreparationWithRealNode(t);
 await api.installFBundle({...f,root:h.root});
 assert.equal(fs.readFileSync(join(h.root,'data/home/profiles/desktop/cordis.yml'),'utf8'),'[]\n# PUBLIC preparation boundary\n');
 assert.equal(typeof api.withInstalledLaunchSpec,'function');
 t.mock.method(cp,'spawn',()=>{throw Error('App must not spawn during spec check')});
 await api.withInstalledLaunchSpec(h.root,async spec=>{
  assert.equal(spec.nativeZeroGeneration,true);assert.equal(spec.env.OASIS_NATIVE_ZERO_GENERATION,'1');
  assert.equal(spec.env.OASIS_UNIFIED_FIXTURE,undefined);assert.equal(spec.env.OPENAI_API_KEY,undefined);
  assert.equal(spec.env.DSH_HOME,join(h.root,'data/home'));
  assert.equal(spec.cwd,join(h.root,'releases',f.expectedSHA256));
  assert.equal(spec.env.NO_PROXY,'localhost,127.0.0.1,::1');assert.equal(spec.shell,false);
  assert.equal(assertInstalledLease(join(spec.env.DSH_HOME,'storages'),spec.env).current,f.expectedSHA256);
  assert.throws(()=>acquireInstalledLease(h.root,'sdk'),{code:'F_INSTALL_BUSY'});
 });
 for(const n of ['startup.lock','data/startup.lock'])assert.equal(fs.existsSync(join(h.root,n)),false);
 assert.equal(api.checkFInstallation(h.root).current,f.expectedSHA256);
 await assert.rejects(()=>api.withInstalledLaunchSpec(h.root,async()=>{throw Error('PUBLIC callback error')}),/PUBLIC callback error/);
 assert.equal(fs.existsSync(join(h.root,'startup.lock')),false);
 let observed;
 t.mock.method(cp,'spawn',(_cmd,_args,options)=>{
  observed=options;
  assertInstalledLease(join(options.env.DSH_HOME,'storages'),options.env);
  const child=new EventEmitter();child.pid=process.pid;child.kill=()=>{};
  process.nextTick(()=>child.emit('close',0,null));return child;
 });
 assert.equal((await api.startFInstallation(h.root)).code,0);
 assert.equal(observed.env.OASIS_NATIVE_ZERO_GENERATION,'1');
 assert.equal(observed.cwd,join(h.root,'releases',f.expectedSHA256));
 assert.equal(fs.existsSync(join(h.root,'data/startup.lock')),false);
});

// A fresh bundle hash must not authorize nonzero calls or a missing/wrong guard.
test('installed zero policy rejects nonzero budgets and incorrect guard bindings before creating root',async t=>{
 const h=setup(t),f=zeroBundle(h,p=>{p.budget.api=1});
 await assert.rejects(()=>api.installFBundle({...f,root:h.root}),/zero|budget|policy/);
 assert.equal(fs.existsSync(h.root),false);
});
test('installed zero policy rejects rehashed wrong guard before creating root',async t=>{
 const h=setup(t),f=zeroBundle(h,p=>{p.guardedFiles['src/workbench-rpc.js']='f'.repeat(64)});
 await assert.rejects(()=>api.installFBundle({...f,root:h.root}),/guard|drift|policy/);
 assert.equal(fs.existsSync(h.root),false);
});

test('Desktop preparation failure leaves recovery refusal and releases maintenance lease',async t=>{
 const h=setup(t),f=zeroBundle(h),before=cp.execFileSync;
 t.mock.method(cp,'execFileSync',function(cmd,args,options){
  if(args[0]==='--input-type=module')throw Error('PUBLIC preparation failed');
  return before.call(this,cmd,args,options);
 });
 await assert.rejects(()=>api.installFBundle({...f,root:h.root}),/PUBLIC preparation failed/);
 assert.equal(fs.existsSync(join(h.root,'RECOVERY_REQUIRED')),true);
 assert.equal(fs.existsSync(join(h.root,'installation.json')),false);
 for(const n of ['startup.lock','data/startup.lock'])assert.equal(fs.existsSync(join(h.root,n)),false);
});
