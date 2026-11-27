import fs from 'node:fs';
import assert from 'node:assert/strict';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import * as api from '../../../scripts/f-installed-runtime.mjs';
const folder=dirname(fileURLToPath(import.meta.url)),read=p=>JSON.parse(fs.readFileSync(p));
const spec=read(join(folder,'update-spec.json')),history=read(join(folder,'installed-update-result.json'));
const root=spec.root,target=spec.target.expectedSHA256,release=join(root,'releases',target),profile=join(root,'data/home/profiles/desktop');
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const recheck=process.argv[2]==='--verify-selected-target';
assert.ok(recheck||process.argv[2]===undefined);
const save=(name,v)=>fs.writeFileSync(join(folder,recheck?name.replace('.json','-recheck.json'):name),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
let fetchAttempts=0;globalThis.fetch=()=>{fetchAttempts++;throw Error('Offline composition cannot fetch');};
const before=api.checkFInstallation(root);assert.equal(before.current,recheck?target:spec.base.expectedSHA256);
// Select a sealed, already installed release. No re-install, overwrite or new dispatch.
const selected=recheck?before:await api.rollbackFInstallation(root,{releaseId:target,expectedCurrent:before.current});
assert.equal(selected.current,target);
assert.equal(sha(join(root,'data/home/storages/oasis_workbench.json')),history.fixture.businessSHA256);
assert.equal(sha(join(root,'data/workspace-a/public-note.md')),history.laterNoteSHA256);
const observation=await api.withInstalledLaunchSpec(root,async launch=>{
 assert.equal(launch.nativeZeroGeneration,true);assert.equal(launch.env.OASIS_NATIVE_ZERO_GENERATION,'1');
 assert.equal(launch.env.OASIS_UNIFIED_FIXTURE,undefined);assert.equal(launch.env.NO_PROXY,'localhost,127.0.0.1,::1');
 assert.equal(launch.env.DSH_HOME,join(root,'data/home'));assert.equal(launch.cwd,release);
 const app=join(release,'App/DSH Desktop.app/Contents/Resources/app'),appRequire=createRequire(join(app,'package.json'));
 const metadata=['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','cordis.patch.yml','cordis.yml'];
 const before=Object.fromEntries(metadata.map(n=>[n,sha(join(profile,n))]));
 const {prepareDesktopProfile}=await import(pathToFileURL(join(app,'lib/profile.js')).href);
 const prepared=prepareDesktopProfile('1',launch.env.DSH_HOME,'darwin','desktop',undefined,
  {requested:'disabled',effective:'disabled',legacyDefaulted:true},{lanAddresses:[],aaEnabled:false});
 const include=await import(pathToFileURL(appRequire.resolve('@deepseek-ai/cordis-plugin-include')).href);
 const warnings=[],entries=include.applyEntryPatches([],prepared.patches,(...args)=>warnings.push(args));
 const hosts=entries.filter(x=>x.disabled!==true&&String(x.id).includes('oasis-professional-service'));
 assert.equal(hosts.length,1);assert.equal(hosts[0].id,'oasis-professional-service-m06-controlled-013');
 assert.equal(fileURLToPath(hosts[0].name),join(release,'components/c3/src/m06-controlled-host-013.js'));
 assert.equal(prepared.port,57619);assert.equal(prepared.networkExposure,'loopback');assert.equal(prepared.requiresDependencyMigration,false);
 assert.ok(entries.some(x=>x.disabled!==true&&x.config?.host==='127.0.0.1'&&x.config.port===57619));
 assert.deepEqual(warnings,[]);assert.deepEqual(Object.fromEntries(metadata.map(n=>[n,sha(join(profile,n))])),before);
 const pair=req=>({host:fs.realpathSync(req.resolve('oasis-professional-service/m06-controlled-host-013')),client:fs.realpathSync(req.resolve('oasis-professional-service/client'))});
 const appPair=pair(appRequire),profilePair=pair(createRequire(join(profile,'package.json')));assert.deepEqual(appPair,profilePair);
 assert.equal(appPair.host,join(release,'components/c3/src/m06-controlled-host-013.js'));
 assert.equal(appPair.client,join(release,'components/c3/lib/client.js'));
 let linkCount=0;
 for(const scope of [release,profile])for(const [name,value] of Object.entries(read(join(scope,'package.json')).dependencies)){
  const actual=fs.realpathSync(join(scope,'node_modules',name));assert.equal(actual,fs.realpathSync(fileURLToPath(new URL(value.slice(5),pathToFileURL(scope+'/')))));
  assert.ok(actual.startsWith(release+'/'));linkCount++;
 }
 assert.equal(linkCount,604);
 return {scope:'ACTUAL_TARGET_INSTALLED_COMPOSITION_AND_ZERO_SPEC_NO_APP',root,current:target,archiveSHA256:spec.archiveSHA256,
  port:prepared.port,networkExposure:prepared.networkExposure,requiresDependencyMigration:prepared.requiresDependencyMigration,warnings,
  activeBusiness:hosts,appPair,profilePair,linkCount,profileMetadataPreserved:true,zeroMarker:true,fixtureAbsent:true,
  realCallBudget:0,fetchAttempts,applicationStarted:false,businessBytesPreserved:true,laterNotePreserved:true};
});
assert.equal(fetchAttempts,0);assert.equal(fs.existsSync(join(root,'startup.lock')),false);assert.equal(fs.existsSync(join(root,'data/startup.lock')),false);
observation.finalCheck=api.checkFInstallation(root);save('target-composition-result.json',observation);
const pins={};
for(const p of [join(root,'installation.json'),join(root,'control/scripts/f-installed-runtime.mjs'),join(release,'receipt.json'),join(release,'profile-template.json'),join(release,'pnpm-lock.yaml'),spec.archive,join(spec.target.bundle,'bundle.json'),join(release,'components/c3/src/index.js'),join(release,'components/c3/src/workbench-rpc.js'),join(release,'components/c3/src/v340-document.js'),join(release,'components/c3/src/v340-result-service.js'),join(release,'components/c3/src/v340-runtime-contract.js'),...['package.json','pnpm-lock.yaml','cordis.patch.yml'].map(n=>join(profile,n))])pins[p]=sha(p);
save('installed-admission-candidate.json',{policy:'m06-native-zero-generation-installed-v1',runtime_ready:true,
 readiness_scope:'offline installed composition/spec only, actual App/Host/UI not verified',root,current:target,
 fixture_state:'synthetic UNKNOWN only; not a real unknown transaction',app_start_authorized_this_task:false,
 native_zero_generation:{protocol:1,budget:{model:0,api:0,upload:0,payment:0},guardedFiles:['src/index.js','src/workbench-rpc.js'].map(n=>join(release,'components/c3',n))},files:pins});
console.log(JSON.stringify({current:target,links:observation.linkCount,port:observation.port,warnings:observation.warnings,fetchAttempts,applicationStarted:false}));
