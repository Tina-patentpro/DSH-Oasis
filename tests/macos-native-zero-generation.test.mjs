import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,realpathSync,existsSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as launch from '../scripts/macos-development-launch.mjs';

function fixture(t) {
  const root=realpathSync(mkdtempSync(join(tmpdir(),'oasis-zero-')));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  for(const name of ['user','home','userdata','cache','temp','evidence','workspace-a','workspace-b'])mkdirSync(join(root,name));
  const app=join(root,'App');mkdirSync(app);
  const guard=join(root,'guard.js'),host=join(root,'host.js');writeFileSync(guard,'bound guard');writeFileSync(host,'bound host');
  return {root,app,node:process.execPath,guard,host};
}

// Catches removing fixture without imposing the independent native-zero mode.
test('native zero generation removes fixture without allowing model or API destinations',t=>{
  const f=fixture(t),spec=launch.makeLaunchSpec({...f,nativeZeroGeneration:true});
  assert.equal(spec.env.OASIS_UNIFIED_FIXTURE,undefined);
  assert.equal(spec.env.OASIS_NATIVE_ZERO_GENERATION,'1');
  assert.equal(spec.env.NO_PROXY,'127.0.0.1,localhost,::1');
  assert.equal(spec.env.DEEPSEEK_BASE_URL,undefined);
  assert.equal(spec.env.HTTPS_PROXY,'http://127.0.0.1:9');
  for(const key of ['DEEPSEEK_API_KEY','OPENAI_API_KEY','NODE_OPTIONS','NODE_PATH'])assert.equal(spec.env[key],undefined);
  assert.equal(spec.env.DSH_HOME,join(f.root,'home'));
  assert.ok(spec.args.includes('--proxy-server=http://127.0.0.1:9'));
});

test('native zero and real acceptance cannot be combined',t=>{
  const f=fixture(t);
  assert.throws(()=>launch.makeLaunchSpec({...f,nativeZeroGeneration:true,realAcceptance:true}),/exclusive/i);
});

test('native zero admission rejects incomplete composition, nonzero budgets and missing guard binding',t=>{
  const f=fixture(t);assert.equal(typeof launch.assertNativeZeroGenerationAdmission,'function');
  const pin={policy:'native-zero-generation-private-profile-v1',runtime_ready:true,
    native_zero_generation:{protocol:1,budget:{model:0,api:0,upload:0,payment:0},guardedFiles:[f.guard,f.host]},
    files:{[f.guard]:launch.fileHash(f.guard),[f.host]:launch.fileHash(f.host)}};
  assert.doesNotThrow(()=>launch.assertNativeZeroGenerationAdmission(pin));
  assert.throws(()=>launch.assertNativeZeroGenerationAdmission({...pin,runtime_ready:false}),/ready/i);
  assert.throws(()=>launch.assertNativeZeroGenerationAdmission({...pin,native_zero_generation:{...pin.native_zero_generation,budget:{...pin.native_zero_generation.budget,api:1}}}),/budget/i);
  assert.throws(()=>launch.assertNativeZeroGenerationAdmission({...pin,native_zero_generation:{...pin.native_zero_generation,guardedFiles:[]}}),/guard/i);
  assert.throws(()=>launch.assertNativeZeroGenerationAdmission({...pin,files:{}}),/guard/i);
});

test('CLI rejects a bound but unready native-zero candidate without starting or materializing a Profile',t=>{
  const repo=fileURLToPath(new URL('../',import.meta.url));
  const root=realpathSync(mkdtempSync(join(repo,'.dsh-test/zero-cli-')));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const admission=join(root,'admission.json');
  writeFileSync(admission,JSON.stringify({root,policy:'native-zero-generation-private-profile-v1',runtime_ready:false}));
  const result=spawnSync(process.execPath,[resolve(repo,'scripts/macos-development-launch.mjs'),'--check','--native-zero-generation',admission],{encoding:'utf8',env:{PATH:'/usr/bin:/bin'}});
  assert.equal(result.status,1);assert.match(result.stderr,/composition is not ready/);
  assert.equal(result.stdout,'');assert.equal(existsSync(join(root,'startup.lock')),false);
  assert.deepEqual(readdirSync(root),['admission.json']);
});
