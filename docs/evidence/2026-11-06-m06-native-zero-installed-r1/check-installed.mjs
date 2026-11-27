import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const folder=dirname(fileURLToPath(import.meta.url));
const input=JSON.parse(fs.readFileSync(join(folder,'candidate-inputs.json')));
const root=input.root,release=join(root,'releases',input.expectedSHA256),profile=join(root,'data/home/profiles/desktop');
const app=join(release,'App/DSH Desktop.app/Contents/Resources/app');
const read=p=>JSON.parse(fs.readFileSync(p));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const save=(name,value)=>fs.writeFileSync(join(folder,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
let fetchAttempts=0,appSpawnAttempts=0;
globalThis.fetch=()=>{fetchAttempts++;throw Error('offline check cannot fetch');};
cp.spawn=()=>{appSpawnAttempts++;throw Error('offline check must not spawn App');};
const api=await import(pathToFileURL(join(root,'control/scripts/f-installed-runtime.mjs')).href);
const gate=await import(pathToFileURL(join(release,'components/c5/installed-lease.mjs')).href);
const owner=await import(pathToFileURL(join(release,'components/c5/ownership.mjs')).href);
const storage=join(root,'data/home/storages');
assert.throws(()=>gate.assertInstalledLease(storage,{}),/lease/);
const metadataNames=['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','cordis.patch.yml','cordis.yml'];
const metadataBefore=Object.fromEntries(metadataNames.map(n=>[n,hash(join(profile,n))]));
let oldEnv;
const observation=await api.withInstalledLaunchSpec(root,async spec=>{
 assert.equal(spec.nativeZeroGeneration,true);
 assert.equal(spec.env.OASIS_NATIVE_ZERO_GENERATION,'1');
 assert.equal(spec.env.OASIS_UNIFIED_FIXTURE,undefined);
 assert.equal(spec.env.DSH_HOME,join(root,'data/home'));
 assert.equal(spec.cwd,release);assert.equal(spec.realCallBudget,0);
 assert.equal(spec.env.NO_PROXY,'localhost,127.0.0.1,::1');
 for(const n of ['OPENAI_API_KEY','DEEPSEEK_API_KEY','NODE_OPTIONS','NODE_PATH','DEEPSEEK_BASE_URL'])assert.equal(spec.env[n],undefined);
 const identity=gate.assertInstalledLease(storage,spec.env);
 assert.equal(identity.current,input.expectedSHA256);
 assert.throws(()=>gate.assertInstalledLease(storage,{...spec.env,DSH_OASIS_WRITER_NONCE:'wrong'}),/identity/);
 assert.throws(()=>gate.assertInstalledLease(join(root,'home/storages'),spec.env),/root mismatch/);
 const second=cp.spawnSync(join(root,'control/node'),['--input-type=module','--eval',
  `const {acquireInstalledLease}=await import(${JSON.stringify(pathToFileURL(join(release,'components/c5/installed-lease.mjs')).href)});
   try{acquireInstalledLease(${JSON.stringify(root)},'sdk');process.exitCode=2;}catch(e){console.log(e.code);process.exitCode=e.code==='F_INSTALL_BUSY'?0:3;}`],
  {cwd:release,env:spec.env,encoding:'utf8'});
 assert.equal(second.status,0,second.stderr);assert.match(second.stdout,/F_INSTALL_BUSY/);
 const storageOwner=await owner.acquireJsonRootOwnership(storage);
 let storageSecond;
 try{
  storageSecond=cp.spawnSync(join(root,'control/node'),['--input-type=module','--eval',
   `const {acquireJsonRootOwnership}=await import(${JSON.stringify(pathToFileURL(join(release,'components/c5/ownership.mjs')).href)});
    try{const x=await acquireJsonRootOwnership(${JSON.stringify(storage)});x.release();process.exitCode=2;}catch(e){console.log(e.code);process.exitCode=e.code==='DSH_STORAGE_ROOT_BUSY'?0:3;}`],
   {cwd:release,env:spec.env,encoding:'utf8'});
  assert.equal(storageSecond.status,0,storageSecond.stderr);assert.match(storageSecond.stdout,/DSH_STORAGE_ROOT_BUSY/);
 }finally{storageOwner.release();}
 const next=await owner.acquireJsonRootOwnership(storage);next.release();
 const desktop=await import(pathToFileURL(join(app,'lib/profile.js')).href);
 const prepared=desktop.prepareDesktopProfile('1',spec.env.DSH_HOME,'darwin','desktop',undefined,
  {requested:'disabled',effective:'disabled',legacyDefaulted:true},{lanAddresses:[],aaEnabled:false});
 assert.equal(prepared.requiresDependencyMigration,false);assert.equal(prepared.port,57619);
 assert.equal(prepared.networkExposure,'loopback');
 const appRequire=createRequire(join(app,'package.json')),profileRequire=createRequire(join(profile,'package.json'));
 const include=await import(pathToFileURL(appRequire.resolve('@deepseek-ai/cordis-plugin-include')).href);
 const warnings=[],entries=include.applyEntryPatches([],prepared.patches,(...args)=>warnings.push(args));
 const active=entries.filter(x=>x.disabled!==true&&String(x.id).includes('oasis-professional-service'));
 assert.equal(active.length,1);assert.equal(active[0].id,'oasis-professional-service-m06-controlled-013');
 assert.equal(entries.find(x=>x.id==='oasis-professional-service').disabled,true);
 assert.equal(fileURLToPath(active[0].name),join(release,'components/c3/src/m06-controlled-host-013.js'));
 assert.ok(entries.some(x=>x.disabled!==true&&x.config?.port===57619&&x.config.host==='127.0.0.1'));
 assert.deepEqual(entries.filter(x=>x.disabled!==true&&/^(llm-(pi-ai|deepseek|deepseek-account)|session-title-llm|goal-round-driver|session-telemetry-otel|deepseek-account|web-search-deepseek|account-controller)$/.test(String(x.id))),[]);
 const resolvePair=req=>({host:fs.realpathSync(req.resolve('oasis-professional-service/m06-controlled-host-013')),client:fs.realpathSync(req.resolve('oasis-professional-service/client'))});
 const appPair=resolvePair(appRequire),profilePair=resolvePair(profileRequire);
 assert.deepEqual(appPair,profilePair);
 assert.equal(appPair.host,join(release,'components/c3/src/m06-controlled-host-013.js'));
 assert.equal(appPair.client,join(release,'components/c3/lib/client.js'));
 assert.equal(fs.realpathSync(prepared.profile.layers.find(x=>x.packageName==='oasis-professional-service').packageDir),join(release,'components/c3'));
 assert.deepEqual(Object.fromEntries(metadataNames.map(n=>[n,hash(join(profile,n))])),metadataBefore);
 const linkChecks=[];
 for(const scope of [release,profile])for(const [name,target] of Object.entries(read(join(scope,'package.json')).dependencies)){
  const actual=fs.realpathSync(join(scope,'node_modules',name));
  assert.equal(actual,fs.realpathSync(fileURLToPath(new URL(target.slice(5),pathToFileURL(scope+'/')))));
  assert.ok(actual.startsWith(release+'/'));linkChecks.push({scope,name,actual});
 }
 save('effective-entries.json',entries);save('link-checks.json',linkChecks);
 oldEnv=spec.env;
 const {DSH_OASIS_WRITER_NONCE:_nonce,...publicEnv}=spec.env;
 return {scope:'ACTUAL_INSTALLED_SPEC_CONFIG_AND_COOPERATIVE_LEASE_NO_APP_START',identity,
  spec:{...spec,env:publicEnv,writerNoncePresent:true},
  appPair,profilePair,activeBusiness:active,port:prepared.port,networkExposure:prepared.networkExposure,
  requiresDependencyMigration:prepared.requiresDependencyMigration,warnings,linkCount:linkChecks.length,
  secondWriter:{exit:second.status,code:second.stdout.trim()},
  secondStorageOwner:{exit:storageSecond.status,code:storageSecond.stdout.trim()},storageOwnerReacquired:true,
  profileMetadataUnchanged:true,fetchAttempts,appSpawnAttempts,hostStarted:false,pluginApplyInvoked:false,
  credentialsRead:false,modelCalls:0,apiCalls:0,uploads:0,payments:0};
});
for(const name of ['startup.lock','data/startup.lock'])assert.equal(fs.existsSync(join(root,name)),false);
assert.throws(()=>gate.assertInstalledLease(storage,oldEnv));
await api.withInstalledLaunchSpec(root,async spec=>assert.equal(gate.assertInstalledLease(storage,spec.env).current,input.expectedSHA256));
observation.releasedLeaseRejected=true;observation.writerReacquired=true;observation.locksReleased=true;
observation.finalInstallationCheck=api.checkFInstallation(root);
assert.equal(fetchAttempts,0);assert.equal(appSpawnAttempts,0);
save('installed-observation.json',observation);
console.log(JSON.stringify({scope:observation.scope,current:input.expectedSHA256,links:observation.linkCount,
 writer:observation.secondWriter,storageOwner:observation.secondStorageOwner,locksReleased:true,
 warnings:observation.warnings,appSpawnAttempts,fetchAttempts}));
