import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {setupM06ControlledHost as host} from './helpers/m06-controlled-host-harness.mjs';

const entry=process.env.OASIS_TEST_ZERO_ARCHIVE_ENTRY
  ? await import(pathToFileURL(process.env.OASIS_TEST_ZERO_ARCHIVE_ENTRY).href) : undefined;
const ordinaryEntry=entry
  ? await import(new URL('./index.js',pathToFileURL(process.env.OASIS_TEST_ZERO_ARCHIVE_ENTRY)).href) : undefined;
function zeroMode(t) {
  const old=process.env.OASIS_NATIVE_ZERO_GENERATION;
  process.env.OASIS_NATIVE_ZERO_GENERATION='1';
  t.after(()=>{if(old===undefined)delete process.env.OASIS_NATIVE_ZERO_GENERATION;else process.env.OASIS_NATIVE_ZERO_GENERATION=old;});
}

// Catches a guard removed, applied after payload parsing, or absent on one registered path.
test('zero-generation Host rejects every non-readonly Fetch endpoint before business or credential work',async t=>{
  zeroMode(t);
  let modelPreparations=0;
  const f=await host(t,{entry,beforeApply:ctx=>{ctx.llm={prepareCall(){modelPreparations++;assert.fail('no model preparation');}};}});
  const before=structuredClone(await f.state());
  const allowed=new Set(['state/get','workflow/catalog','workflow/v340/catalog','workflow/v340/prepare']);
  const rejected=[];
  for(const path of f.routes.keys()) {
    const endpoint=path.slice('/api/oasis-workbench/'.length);
    if(allowed.has(endpoint))continue;
    const result=await f.rpc(endpoint,{});
    assert.equal(result.ok,false,endpoint);
    assert.equal(result.error.code,'NATIVE_ZERO_GENERATION',endpoint);
    rejected.push(endpoint);
  }
  assert.ok(rejected.includes('workflow/v340/candidate/run'));
  assert.ok(rejected.includes('workflow/v340/candidate/prepare'));
  assert.ok(rejected.includes('account/login'));
  assert.ok(rejected.includes('task/start-api'));
  assert.equal((await f.preview()).error.code,'NATIVE_ZERO_GENERATION','valid confirmation also stops before native credential inspection');
  assert.equal((await f.submit({sha256:'a'.repeat(64)})).error.code,'NATIVE_ZERO_GENERATION','valid run shape also stops before persistence');
  assert.deepEqual(await f.state(),before);
  assert.equal(modelPreparations,0);
  assert.equal(f.calls.adapter,0);assert.equal(f.calls.credentials,0);assert.equal(f.calls.network,0);
  const catalog=await f.rpc('workflow/v340/catalog',{});
  assert.equal(catalog.ok,true);
  assert.equal(catalog.value.nodes.filter(n=>n.m06Candidate).length,1);
  const invalidPreparation=await f.rpc('workflow/v340/prepare',{});
  assert.equal(invalidPreparation.error.code,'bad-request','readonly preparation still uses its real validation');
  const preparation=await f.rpc('workflow/v340/prepare',{workspaceId:'w',nodeId:'Flow-2-6',confirmed:true,
    textInputs:{disclosure_text:'公开合成阀体：壳体内置弹簧与阀芯。'}});
  assert.equal(preparation.ok,true);
  assert.equal(preparation.value.evidenceKind,'input-preparation');
  assert.equal(preparation.value.dispatchEnabled,false);
  assert.deepEqual(await f.state(),before,'readonly input preparation creates no run or business revision');
  if(process.env.OASIS_TEST_ZERO_OBSERVATION) {
    const {writeFile}=await import('node:fs/promises');
    await writeFile(process.env.OASIS_TEST_ZERO_OBSERVATION,JSON.stringify({scope:'REGISTERED_HOST_WITH_SYNTHETIC_EXTERNAL_SERVICES_NOT_RUNNING_APP',
      entry:process.env.OASIS_TEST_ZERO_ARCHIVE_ENTRY??'source',rejectedEndpoints:rejected,recordUnchanged:true,
      modelPreparations,adapterCalls:f.calls.adapter,credentialCalls:f.calls.credentials,fetchAttempts:f.calls.network},null,2)+'\n',{flag:'wx'});
  }
});

test('ordinary Host refuses the zero-generation marker instead of silently running unguarded',async t=>{
  zeroMode(t);
  await assert.rejects(host(t,{candidate:false,entry:ordinaryEntry}),/zero-generation.*controlled/i);
});

test('zero-generation marker does not allow controlled Host to bypass missing native context',async t=>{
  zeroMode(t);
  await assert.rejects(host(t,{entry,beforeApply:ctx=>{delete ctx.sessions;}}),/原生模型上下文/);
});
