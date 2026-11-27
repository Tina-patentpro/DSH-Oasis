import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';

// Bounded offline check of the actual copied Desktop preparer. No boot/apply/spawn.
const folder=path.dirname(fileURLToPath(import.meta.url));
const input=JSON.parse(fs.readFileSync(path.join(folder,'assembly-inputs.json'),'utf8'));
const specs=JSON.parse(fs.readFileSync(path.join(folder,'link-targets.json'),'utf8'));
const appRoot=path.join(input.app,'Contents/Resources/app');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const readJSON=file=>JSON.parse(fs.readFileSync(file,'utf8'));
let fetchAttempts=0;
globalThis.fetch=()=>{fetchAttempts++;throw Error('Offline assembly must not fetch');};
assert.equal(process.env.DSH_HOME,path.join(input.root,'home'));
assert.equal(process.env.OASIS_NATIVE_ZERO_GENERATION,'1');
const desktop=await import(pathToFileURL(path.join(appRoot,'lib/profile.js')).href);
const before={};
for(const name of ['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','cordis.patch.yml'])
  before[name]=fs.readFileSync(path.join(input.profile,name),'utf8');
fs.writeFileSync(path.join(folder,'profile-before-prepare.json'),JSON.stringify(before,null,2)+'\n',{flag:'wx'});
const prepared=desktop.prepareDesktopProfile('1',path.join(input.root,'home'),'darwin','desktop',undefined,
  {requested:'disabled',effective:'disabled',legacyDefaulted:true},{lanAddresses:[],aaEnabled:false});
const appRequire=createRequire(path.join(appRoot,'package.json'));
const boot=await import(pathToFileURL(appRequire.resolve('@deepseek-ai/dsh-app-boot')).href);
const include=await import(pathToFileURL(appRequire.resolve('@deepseek-ai/cordis-plugin-include')).href);
const warnings=[];
const entries=include.applyEntryPatches([],prepared.patches,(...args)=>warnings.push(args));
const business=entries.filter(e=>String(e.id).includes('oasis-professional-service'));
const active=business.filter(e=>e.disabled!==true);
assert.equal(active.length,1);
assert.equal(active[0].id,'oasis-professional-service-m06-controlled-013');
assert.equal(active[0].name,'oasis-professional-service/m06-controlled-host-013');
assert.equal(business.find(e=>e.id==='oasis-professional-service').disabled,true);
const profilePkg=path.join(input.profile,'package.json');
const profileRequire=createRequire(profilePkg);
const desktopProfile=await import(pathToFileURL(path.join(appRoot,'lib/profile-hhId3Pkk.js')).href);
assert.equal(desktopProfile.a(),path.join(appRoot,'package.json'));
const overlay=await import(pathToFileURL(path.join(appRoot,'lib/package-overlay-Ca250500.js')).href);
const selection=overlay.i('oasis-professional-service',{installPackageUrl:pathToFileURL(desktopProfile.a()).href,
  profilePackageUrl:pathToFileURL(profilePkg).href});
const selectedRoot=fs.realpathSync(selection.selected.packageDir);
const archiveRoot=path.dirname(path.dirname(input.archive));
const archiveInfo=readJSON(path.join(folder,'../2026-11-06-m06-native-zero-generation-r1/archive-inspection.json'));
assert.equal(selectedRoot,archiveInfo.unpacked_root);
const resolvePair=req=>({host:fs.realpathSync(req.resolve('oasis-professional-service/m06-controlled-host-013')),
  client:fs.realpathSync(req.resolve('oasis-professional-service/client'))});
const appPair=resolvePair(appRequire),profilePair=resolvePair(profileRequire);
assert.deepEqual(appPair,profilePair);
assert.equal(appPair.host,path.join(selectedRoot,'src/m06-controlled-host-013.js'));
assert.equal(appPair.client,path.join(selectedRoot,'lib/client.js'));
const oasisLayer=prepared.profile.layers.find(layer=>layer.packageName==='oasis-professional-service');
assert.equal(fs.realpathSync(oasisLayer.packageDir),selectedRoot);
assert.equal(prepared.requiresDependencyMigration,false);
assert.equal(prepared.port,57619);
assert.equal(prepared.networkExposure,'loopback');
const webserver=entries.filter(e=>e.disabled!==true&&e.config?.port===57619);
assert.ok(webserver.some(e=>e.config.host==='127.0.0.1'));
const dangerous=entries.filter(e=>e.disabled!==true&&/^(llm-(pi-ai|deepseek|deepseek-account)|session-title-llm|goal-round-driver|session-telemetry-otel|deepseek-account|web-search-deepseek|account-controller)$/.test(String(e.id)));
assert.deepEqual(dangerous,[]);
const linkChecks=specs.map(s=>{
  const scope=s.scope==='installation'?input.installation:input.profile;
  const actual=fs.realpathSync(path.join(scope,'node_modules',s.name));
  assert.equal(actual,fs.realpathSync(s.new_target),s.name);
  assert.equal(hash(fs.readFileSync(path.join(actual,'package.json'))),s.target_manifest_sha256,s.name);
  return {scope:s.scope,name:s.name,actual};
});
for(const name of ['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','cordis.patch.yml'])
  assert.equal(fs.readFileSync(path.join(input.profile,name),'utf8'),before[name],`preparer changed ${name}`);
assert.equal(fetchAttempts,0);
const result={scope:'ACTUAL_FIXED_DESKTOP_PROFILE_PREPARATION_AND_RESOLUTION_NO_BOOT',
  app:input.app,desktopInstallAnchor:desktopProfile.a(),profile:input.profile,
  rootConfig:prepared.rootConfig,bareModuleBaseUrl:prepared.bareModuleBaseUrl,
  port:prepared.port,networkExposure:prepared.networkExposure,mode:prepared.mode,
  requiresDependencyMigration:prepared.requiresDependencyMigration,
  market:prepared.market,settingsDocument:prepared.settingsDocument,
  activeBusiness:active,selection,appPair,profilePair,linkCount:linkChecks.length,
  dangerousActive:dangerous,warnings,skippedOptionalEntries:prepared.skippedOptionalEntries,
  profileLayers:prepared.profile.layers.map(l=>({packageName:l.packageName,packageDir:l.packageDir})),
  webserver,fetchAttempts,hostStarted:false,pluginApplyInvoked:false,
  credentialsRead:false,originalProfileWritten:false};
fs.writeFileSync(path.join(folder,'desktop-preparation-result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(folder,'effective-entries.json'),JSON.stringify(entries,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(folder,'link-checks.json'),JSON.stringify(linkChecks,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({scope:result.scope,port:result.port,host:appPair.host,client:appPair.client,
  links:linkChecks.length,migrationRequired:prepared.requiresDependencyMigration,warnings,fetchAttempts}));
