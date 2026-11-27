import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,realpath,readdir,readFile,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {setupM06ControlledHost} from './helpers/m06-controlled-host-harness.mjs'
const url=new URL('../src/m06-recorded-host-013.js',import.meta.url)
const entry=await import(url).catch(error=>{
  if(error.code==='ERR_MODULE_NOT_FOUND'&&error.url===url.href)return {}
  throw error
})

test('Config and RPC cannot override the recorded engineering deadline or diagnostics',async t=>{
  const directory=await realpath(await mkdtemp(join(tmpdir(),'m06-host-control-'))),old=process.env.OASIS_M06_EVIDENCE_DIR
  process.env.OASIS_M06_EVIDENCE_DIR=directory
  t.after(async()=>{if(old===undefined)delete process.env.OASIS_M06_EVIDENCE_DIR;else process.env.OASIS_M06_EVIDENCE_DIR=old;await rm(directory,{recursive:true,force:true})})
  const f=await setupM06ControlledHost(t,{applyHost:ctx=>entry.apply(ctx,{timeoutMs:1,captureDiagnostics:false})})
  const invalid=await f.preview({timeoutMs:1,captureDiagnostics:false})
  assert.equal(invalid.ok,false);assert.equal(f.calls.adapter,0);assert.deepEqual(await readdir(directory),[])
  const ready=await f.preview();assert.equal(ready.ok,true);assert.equal(f.calls.adapter,0)
  assert.equal((await f.submit(ready.value)).ok,true)
  for(let n=0;n<500;n++){
    const run=Object.values((await f.state()).tasks.t.v340.runs)[0]
    if(run?.status!=='prepared'){assert.equal(run.status,'completed');break}
    await new Promise(resolve=>setTimeout(resolve,1))
  }
  const name=(await readdir(directory)).find(n=>n.startsWith('diagnostic-'))
  assert.ok(name)
  const captured=JSON.parse(await readFile(join(directory,name),'utf8'))
  assert.equal(captured.event.diagnostic.deadlineMs,300000)
  assert.equal(f.calls.adapter,1);assert.equal(f.calls.network,0);await f.dispose()
})
test('recorded Host connects the local sink to the real registered RPC and DSH SDK offline adapter',async t=>{
  assert.equal(typeof entry.apply,'function','recorded engineering entry is missing')
  const directory=await realpath(await mkdtemp(join(tmpdir(),'m06-host-record-'))),old=process.env.OASIS_M06_EVIDENCE_DIR
  process.env.OASIS_M06_EVIDENCE_DIR=directory
  t.after(async()=>{if(old===undefined)delete process.env.OASIS_M06_EVIDENCE_DIR;else process.env.OASIS_M06_EVIDENCE_DIR=old;await rm(directory,{recursive:true,force:true})})
  const f=await setupM06ControlledHost(t,{applyHost:entry.apply})
  const preview=await f.preview();assert.equal(preview.ok,true)
  assert.deepEqual(await readdir(directory),[],'preparation cannot fabricate actual execution evidence')
  assert.equal((await f.submit(preview.value)).ok,true)
  let run
  for(let n=0;n<500;n++){
    run=Object.values((await f.state()).tasks.t.v340.runs)[0]
    if(run?.status!=='prepared')break
    await new Promise(resolve=>setTimeout(resolve,1))
  }
  assert.equal(run.status,'completed')
  const names=await readdir(directory);assert.equal(names.length,3)
  const events=await Promise.all(names.map(async name=>JSON.parse(await readFile(join(directory,name),'utf8'))))
  const request=events.find(x=>x.event.kind==='request').event,response=events.find(x=>x.event.kind==='response').event
  assert.equal(request.run.runId,run.runId);assert.equal(request.system,f.actualCall.system)
  assert.equal(request.requestText,f.actualCall.messages[0].content[0].text)
  assert.equal(response.runId,run.runId);assert.equal(response.status,'completed')
  const diagnostic=events.find(x=>x.event.kind==='diagnostic').event
  assert.equal(diagnostic.runId,run.runId);assert.equal(diagnostic.diagnostic.runId,run.runId)
  assert.equal(diagnostic.diagnostic.deadlineMs,300000)
  assert.equal(diagnostic.diagnostic.cause,'completed');assert.equal(diagnostic.diagnostic.terminalSeen,true)
  assert.equal(Object.hasOwn(response,'diagnostic'),false);assert.equal(Object.hasOwn(run,'diagnostic'),false)
  assert.equal(JSON.parse(response.body).summary,'公开合成结论，未验证专业质量')
  assert.equal(f.calls.adapter,1);assert.equal(f.calls.credentials,0);assert.equal(f.calls.network,0)
  if(process.env.OASIS_M06_EVIDENCE_TEST_EXPORT){
    for(const name of names)await writeFile(join(process.env.OASIS_M06_EVIDENCE_TEST_EXPORT,name),await readFile(join(directory,name)),{flag:'wx',mode:0o600})
    await writeFile(join(process.env.OASIS_M06_EVIDENCE_TEST_EXPORT,'synthetic-rpc-observation.json'),JSON.stringify({
      scope:'REGISTERED_RPC_DSH_SDK_OFFLINE_NOT_ACTUAL_APP_OR_PROVIDER',run,counts:f.calls,
      capturedFiles:names,requestMatchesOfflineCall:true,realProviderCalls:0},null,2)+'\n',{flag:'wx',mode:0o600})
  }
  await f.dispose()
})
