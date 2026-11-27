import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,realpath,readFile,readdir,rm,chmod,stat} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createM06EvidenceRecorder} from '../src/m06-recorded-host-013.js'

const sample=()=>({schemaVersion:1,runId:'synthetic-diagnostic-run',deadlineMs:300000,elapsedMs:11,
  settledPhase:'assemble',cause:'completed',localDeadlineObserved:false,localAbortObserved:false,
  calleeTimeoutObserved:false,streamEntered:true,terminalSeen:true,firstChunkElapsedMs:3,firstTextElapsedMs:3,
  chunkCount:2,phases:[{phase:'consume',enteredElapsedMs:3,elapsedMs:7}],usage:{inputTokens:7,outputTokens:2,totalTokens:9}})
const event=()=>({kind:'diagnostic',runId:'synthetic-diagnostic-run',requestKeySHA256:'1'.repeat(64),diagnostic:sample()})
async function sink(t){
  const directory=await realpath(await mkdtemp(join(tmpdir(),'m06-diag-sink-')))
  t.after(()=>rm(directory,{recursive:true,force:true}))
  return {directory,write:await createM06EvidenceRecorder(directory)}
}
test('diagnostic uses a private exclusive file without changing the request or response format',async t=>{
  const h=await sink(t),e=event();await h.write(e)
  const names=await readdir(h.directory);assert.equal(names.length,1);assert.match(names[0],/^diagnostic-[a-f0-9]{64}\.json$/)
  const path=join(h.directory,names[0]);assert.equal((await stat(path)).mode&0o777,0o600)
  const stored=JSON.parse(await readFile(path,'utf8'));assert.deepEqual(stored.event,e)
  await assert.rejects(h.write(e));assert.equal((await readdir(h.directory)).length,1)
})
test('diagnostic validation rejects extra data, invalid counters and mismatched run identity',async t=>{
  const h=await sink(t)
  for(const mutate of [
    e=>{e.diagnostic.raw='PUBLIC_PRIVATE_CANARY'},e=>{e.diagnostic.usage.outputTokens=Infinity},
    e=>{e.diagnostic.phases[0].elapsedMs=-1},e=>{e.diagnostic.firstTextElapsedMs=NaN},
    e=>{e.diagnostic.runId='different-run'},e=>{e.requestKeySHA256='raw key'},
    e=>{e.diagnostic.phases=Array(17).fill({phase:'consume',enteredElapsedMs:0,elapsedMs:0})},
    e=>{e.diagnostic.toJSON=()=>({raw:'PUBLIC_PRIVATE_CANARY'})},
  ]){const e=event();mutate(e);await assert.rejects(h.write(e))}
  assert.deepEqual(await readdir(h.directory),[])
})
test('diagnostic validation rejects accessors and proxies without evaluating their getters',async t=>{
  const h=await sink(t);let accesses=0
  const e=event();Object.defineProperty(e.diagnostic,'cause',{get(){accesses++;return 'completed'}})
  await assert.rejects(h.write(e));assert.equal(accesses,0)
  const proxy=event();proxy.diagnostic=new Proxy(proxy.diagnostic,{get(){accesses++;throw Error('PUBLIC_PRIVATE_CANARY')}})
  await assert.rejects(h.write(proxy));assert.equal(accesses,0)
  assert.deepEqual(await readdir(h.directory),[])
})
test('diagnostic writes recheck directory permissions at every terminal record',async t=>{
  const h=await sink(t)
  for(const mode of [0o755,0o777]){
    await chmod(h.directory,mode);await assert.rejects(h.write(event()));assert.deepEqual(await readdir(h.directory),[])
  }
  await chmod(h.directory,0o700);await h.write(event())
  assert.equal((await readdir(h.directory)).length,1)
})
