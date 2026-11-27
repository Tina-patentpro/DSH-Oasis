import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';

const folder=path.dirname(fileURLToPath(import.meta.url));
const input=JSON.parse(fs.readFileSync(path.join(folder,'assembly-inputs.json'),'utf8'));
const provider=fs.realpathSync(path.join(input.installation,'node_modules/dsh-storage-json-single-owner'));
const lease=await import(pathToFileURL(path.join(provider,'installed-lease.mjs')).href);
const ownership=await import(pathToFileURL(path.join(provider,'ownership.mjs')).href);
const storageRoot=path.join(input.root,'home/storages');
let refused;
try {lease.assertInstalledLease(storageRoot,{});assert.fail('missing installed lease must refuse');}
catch(error) {refused=error.message;assert.match(refused,/installed writer lease required/);}
const first=await ownership.acquireJsonRootOwnership(storageRoot);
const code=`import {acquireJsonRootOwnership} from ${JSON.stringify(pathToFileURL(path.join(provider,'ownership.mjs')).href)};
try { const owner=await acquireJsonRootOwnership(process.argv[1]);owner.release();console.log(JSON.stringify({unexpectedOwner:true}));process.exitCode=2; }
catch(error){console.log(JSON.stringify({code:error.code}));process.exitCode=error.code==='DSH_STORAGE_ROOT_BUSY'?0:3;}`;
const child=spawnSync(process.execPath,['--input-type=module','-e',code,storageRoot],
  {encoding:'utf8',env:{PATH:'/usr/bin:/bin',HOME:path.join(input.root,'user')}});
assert.equal(child.status,0,child.stderr);
assert.equal(JSON.parse(child.stdout).code,'DSH_STORAGE_ROOT_BUSY');
first.release();
const after=await ownership.acquireJsonRootOwnership(storageRoot);after.release();
const result={scope:'ACTUAL_FIXED_PROVIDER_LEASE_REFUSAL_AND_CROSS_PROCESS_METADATA_OWNERSHIP_NO_BACKEND_APPLY',
  provider,storageRoot,installedLeaseRefused:refused,secondProcess:JSON.parse(child.stdout),
  childExit:child.status,childStderr:child.stderr,reacquiredAfterRelease:true,
  createdOwnershipMetadataOnly:true,businessBackendOpened:false,pluginApplyInvoked:false,
  installedLayoutReady:false,reason:'Current launcher uses root/home; fixed installed provider requires root/data/home and an actual installed writer lease. No lease or installation receipt is fabricated.'};
fs.writeFileSync(path.join(folder,'storage-owner-result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
