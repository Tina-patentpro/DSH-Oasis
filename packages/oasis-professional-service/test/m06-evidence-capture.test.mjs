import test from 'node:test'
import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {createHash} from 'node:crypto'
import {setupNative,Assembler,MODEL_OUTPUT,NOW} from './helpers/v340-native-harness.mjs'
import {createM06BusinessNativeCandidate013} from '../src/v340-native-model.js'
import {createV340RuntimeService} from '../src/v340-runtime-service.js'
import {prepareV340Inputs,assembleV340Document} from '../src/v340-document.js'
import {restoreV340Prepared} from '../src/v340-input-snapshot.js'

const sha=text=>createHash('sha256').update(text).digest('hex')
async function fixture(t,options={}){
  const h=await setupNative(t,options)
  await h.service.closeV340Runtime()
  const parent=assembleV340Document({nodeId:'Flow-1-5',workflowRunUid:'61616161-6161-4161-8161-616161616161',generatedAt:NOW,
    prepared:prepareV340Inputs('Flow-1-5',{technical_disclosure_text:'Public synthetic guide and slider; no real case.'}),output:MODEL_OUTPUT})
  await writeFile(join(h.root,parent.fileName),parent.body,{flag:'wx'})
  const executor=createM06BusinessNativeCandidate013({ctx:h.ctx,native:{BlockAssembler:Assembler,createUserMessage:v=>({role:'user',...v})},
    timeoutMs:1000,recordEvidence:options.recordEvidence,captureDiagnostics:options.captureDiagnostics??false})
  const service=createV340RuntimeService({repository:h.repository,preparation:h.preparation,executor,clock:()=>NOW})
  await service.updateV340Draft(h.command({draft:{source:'local-skill',configuration:{},textInputs:{},filePaths:{upstream_md_file:parent.fileName}}}))
  return {...h,executor,service,async start(){
    const preview=await service.prepareV340CandidateConfirmation(h.command({sessionId:'s',confirmed:true}))
    return service.createV340Run(h.command({requestKey:'evidence-one',candidate:{sessionId:'s',confirmed:true,sha256:preview.sha256}}))
  },async done(){const run=await h.settle();await service.closeV340Runtime();return run}}
}

test('controlled capture binds actual run and exact sent bytes before native preparation, then safe response counters',async t=>{
  const events=[]
  const body=JSON.stringify(MODEL_OUTPUT)
  const f=await fixture(t,{recordEvidence:async event=>{events.push(event)},onPrepare:()=>{
    assert.equal(events.length,1,'request capture must finish before provider preparation')
  },stream:async function*(){
    yield {type:'reasoning-delta',index:1,text:'DO_NOT_CAPTURE_PRIVATE_REASONING'}
    yield {type:'text-delta',index:0,text:body}
    yield {type:'usage',usage:{inputTokens:101,outputTokens:21,totalTokens:122,apiKey:'DO_NOT_CAPTURE_SECRET'}}
    yield {type:'finish',reason:{kind:'stop'}}
  }})
  await f.start();const run=await f.done()
  assert.equal(run.status,'completed')
  assert.equal(events.length,2)
  const [request,response]=events
  assert.equal(request.kind,'request');assert.equal(response.kind,'response')
  assert.equal(request.run.runId,run.runId);assert.equal(request.run.workflowRunUid,run.workflowRunUid)
  assert.equal(request.run.requestKey,'evidence-one');assert.equal(request.run.inputSha256,run.inputSha256)
  assert.deepEqual(request.run.inputSnapshot,run.inputSnapshot)
  assert.equal(request.system,f.seen.options.system)
  assert.equal(request.requestText,f.seen.options.messages[0].content[0].text)
  assert.equal(sha(request.system),run.nativeCandidate.systemSHA256)
  assert.equal(sha(request.requestText),run.nativeCandidate.requestSHA256)
  assert.equal(Object.isFrozen(request.run.inputSnapshot),true)
  assert.equal(response.runId,run.runId);assert.equal(response.body,body)
  assert.equal(response.status,'completed')
  assert.deepEqual(response.executionSummary,{finishKind:'stop',usage:{inputTokens:101,outputTokens:21,totalTokens:122}})
  assert.equal(JSON.stringify(events).includes('DO_NOT_CAPTURE_'),false)
  assert.equal(f.seen.prepare,1);assert.equal(f.seen.stream,1)
})

test('request capture rejection blocks native preparation',async t=>{
  const f=await fixture(t,{recordEvidence:async()=>{throw Error('synthetic capture disk failure')}})
  await f.start();const run=await f.done()
  assert.equal(run.status,'failed')
  assert.equal(f.seen.prepare,0);assert.equal(f.seen.stream,0)
})

test('diagnostic capture failure keeps UNKNOWN, publishes no body and consumes the run once',async t=>{
  const events=[]
  const f=await fixture(t,{captureDiagnostics:true,recordEvidence:async event=>{
    events.push(event);if(event.kind==='diagnostic')throw Error('PUBLIC_PRIVATE_CANARY')
  }})
  await f.start();const run=await f.done()
  assert.equal(run.status,'unknown');assert.equal(f.seen.prepare,1);assert.equal(f.seen.stream,1)
  assert.deepEqual(events.map(e=>e.kind),['request','diagnostic'])
  const result=await f.executor.generate({...run,candidateRun:{...structuredClone(run),status:'prepared'},
    prepared:restoreV340Prepared(run.inputSnapshot),signal:new AbortController().signal})
  assert.equal(result.status,'unknown');assert.equal(f.seen.prepare,1);assert.equal(events.length,2)
})

test('native candidate records a callee TIMEOUT diagnostic separately from unchanged safe response',async t=>{
  const events=[]
  const f=await fixture(t,{captureDiagnostics:true,recordEvidence:async event=>events.push(event),
    stream:async function*(){throw Object.assign(Error('PUBLIC_PRIVATE_CANARY'),{code:'TIMEOUT'})}})
  await f.start();const run=await f.done()
  assert.equal(run.status,'unknown');assert.equal(events.length,3)
  const diagnostic=events[1],response=events[2]
  assert.equal(diagnostic.kind,'diagnostic');assert.equal(diagnostic.diagnostic.cause,'callee-timeout')
  assert.match(diagnostic.requestKeySHA256,/^[a-f0-9]{64}$/)
  assert.equal(response.kind,'response');assert.equal(response.code,'TIMED_OUT')
  assert.equal(Object.hasOwn(response,'diagnostic'),false);assert.equal(Object.hasOwn(response,'body'),false)
  assert.equal(JSON.stringify(events).includes('PUBLIC_PRIVATE_CANARY'),false)
})

test('response capture rejection keeps UNKNOWN and the same run cannot dispatch again',async t=>{
  const events=[]
  const f=await fixture(t,{recordEvidence:async event=>{events.push(event);if(event.kind==='response')throw Error('synthetic response write failure')}})
  await f.start();const run=await f.done()
  assert.equal(run.status,'unknown')
  assert.equal(f.seen.prepare,1);assert.equal(f.seen.stream,1)
  const result=await f.executor.generate({...run,candidateRun:{...structuredClone(run),status:'prepared'},
    prepared:restoreV340Prepared(run.inputSnapshot),signal:new AbortController().signal})
  assert.equal(result.status,'unknown')
  assert.equal(f.seen.prepare,1);assert.equal(f.seen.stream,1);assert.equal(events.length,2)
})

test('transport uncertainty is captured with safe stage and never raw provider error',async t=>{
  const events=[]
  const f=await fixture(t,{recordEvidence:async event=>{events.push(event)},stream:async function*(){throw Error('DO_NOT_CAPTURE_AUTH_HEADER')}})
  await f.start();const run=await f.done()
  assert.equal(run.status,'unknown')
  assert.equal(events.length,2)
  assert.equal(events[1].status,'unknown');assert.equal(events[1].code,'GENERATION_FAILED')
  assert.deepEqual(events[1].executionSummary,{failureStage:'stream'})
  assert.equal('body' in events[1],false)
  assert.equal(JSON.stringify(events).includes('DO_NOT_CAPTURE_AUTH_HEADER'),false)
})

test('trusted direct-injection probe cannot add raw runtime metadata to a captured request',async t=>{
  const f=await fixture(t);await f.start();const run=await f.done(),events=[]
  const executor=createM06BusinessNativeCandidate013({ctx:f.ctx,native:{BlockAssembler:Assembler,createUserMessage:v=>({role:'user',...v})},
    recordEvidence:async event=>events.push(event)})
  // A direct probe, not another admitted runtime run or a real provider request.
  const result=await executor.generate({...run,candidateRun:{...structuredClone(run),status:'prepared',
    rawError:'DO_NOT_CAPTURE_RAW_RUNTIME',headers:{authorization:'DO_NOT_CAPTURE_RAW_RUNTIME'}},
    prepared:restoreV340Prepared(run.inputSnapshot),signal:new AbortController().signal})
  assert.equal(result.status,'completed')
  assert.equal(events.length,2)
  assert.equal(JSON.stringify(events).includes('DO_NOT_CAPTURE_RAW_RUNTIME'),false)
})
