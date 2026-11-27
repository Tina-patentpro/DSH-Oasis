import test from 'node:test'
import assert from 'node:assert/strict'
import {getEventListeners} from 'node:events'
import {BlockAssembler,createUserMessage} from '@deepseek-ai/dsh-llm'
import {createDshV340GenerationAdapter} from '../src/dsh-generation-adapter.js'
import {createM06ExecutionDiagnostic,ownDiagnosticValue} from '../src/m06-execution-diagnostic.js'

const PRIVATE='PUBLIC_CANARY_MUST_NOT_ENTER_DIAGNOSTICS'
const text=value=>({type:'text-delta',index:0,text:value})
const finish=kind=>({type:'finish',reason:{kind}})
const nextTurn=()=>new Promise(resolve=>setImmediate(resolve))

test('diagnostic collection never reflects into live or revoked Proxy metadata',()=>{
  let traps=0
  const hostile=new Proxy({}, {getOwnPropertyDescriptor(_target,key){
    traps++
    return {configurable:true,enumerable:true,writable:true,value:key==='code'?'TIMEOUT':key==='type'?'text-delta':PRIVATE}
  },getPrototypeOf(){traps++;throw Error(PRIVATE)},ownKeys(){traps++;throw Error(PRIVATE)}})
  const revoked=Proxy.revocable({},{});revoked.revoke()
  const trace=createM06ExecutionDiagnostic('proxy-synthetic-run',300000)
  for(const value of [hostile,revoked.proxy]){
    assert.equal(ownDiagnosticValue(value,'code'),undefined)
    trace.callee(value);trace.chunk(value)
  }
  const result=trace.finish('unattributed',{streamEntered:true,terminalSeen:false,summary:{}})
  assert.equal(traps,0)
  assert.equal(result.calleeTimeoutObserved,false)
  assert.equal(result.firstTextElapsedMs,null)
  assert.equal(result.cause,'unattributed')
  assert.ok(!JSON.stringify(result).includes(PRIVATE))
})

test('Proxy error at adapter preparation cannot spoof a callee timeout',async()=>{
  let traps=0
  const error=new Proxy({}, {getOwnPropertyDescriptor(){traps++;return {configurable:true,value:'TIMEOUT'}}})
  const h=harness({prepare(){throw error}}),result=await h.adapter.generate(input())
  assert.equal(traps,0)
  assert.equal(result.status,'failed');assert.equal(result.code,'GENERATION_FAILED')
  assert.equal(result.diagnostic.calleeTimeoutObserved,false)
  assert.equal(result.diagnostic.cause,'unattributed')
  assert.equal(h.calls.stream,0)
})
function input(signal=new AbortController().signal){
  return {runId:'synthetic-run',sessionId:'synthetic-session',instruction:{version:'V3.4.0',body:PRIVATE},
    route:{provider:'synthetic',model:'synthetic-model',maxTokens:32768},signal,assertCurrent:()=>{},
    requestText:JSON.stringify({businessVersion:'V3.4.0',nodeId:'Flow-2-6',runId:'synthetic-run',data:PRIVATE})}
}
function harness({timeoutMs=1000,captureDiagnostics=true,prepare,stream,chunks=[text('public body'),finish('stop')]}={}){
  const calls={prepare:0,stream:0,returned:0}
  let preparedSignal
  const llm={async prepareCall(route,signal){
    calls.prepare++;preparedSignal=signal
    if(prepare)await prepare(signal)
    return {config:{...route},stream(options){
      calls.stream++
      return stream?stream(options):(async function*(){yield* chunks})()
    }}
  }}
  const adapter=createDshV340GenerationAdapter({llm,BlockAssembler,createUserMessage,timeoutMs,captureDiagnostics})
  return {adapter,calls,get preparedSignal(){return preparedSignal}}
}

test('diagnostic retains safe terminal milestones and counts, never body, reasoning or metadata',async()=>{
  let getters=0
  const usage={inputTokens:4,outputTokens:5,totalTokens:9,extra:PRIVATE}
  Object.defineProperty(usage,'reasoningTokens',{get(){getters++;throw Error(PRIVATE)}})
  const h=harness({chunks:[{type:'reasoning-delta',index:1,text:PRIVATE},text(PRIVATE),
    {type:'usage',usage}, {...finish('stop'),raw:{secret:PRIVATE}}]})
  const r=await h.adapter.generate(input())
  assert.equal(r.status,'completed');assert.equal(r.body,PRIVATE)
  assert.ok(r.diagnostic,'trusted diagnostic was not produced')
  assert.equal(r.diagnostic.cause,'completed')
  assert.equal(r.diagnostic.runId,'synthetic-run')
  assert.equal(r.diagnostic.deadlineMs,1000)
  assert.equal(r.diagnostic.streamEntered,true);assert.equal(r.diagnostic.terminalSeen,true)
  assert.equal(r.diagnostic.chunkCount,4)
  assert.ok(Number.isSafeInteger(r.diagnostic.firstChunkElapsedMs))
  assert.ok(Number.isSafeInteger(r.diagnostic.firstTextElapsedMs))
  assert.deepEqual(r.diagnostic.usage,{inputTokens:4,outputTokens:5,totalTokens:9})
  assert.doesNotMatch(JSON.stringify(r.diagnostic),new RegExp(PRIVATE))
  assert.equal(getters,0)
  assert.ok(Object.isFrozen(r.diagnostic)&&Object.isFrozen(r.diagnostic.phases))
  assert.ok(r.diagnostic.phases.length<=16)
  assert.equal(r.executionSummary.diagnostic,undefined)
  assert.equal(h.calls.prepare,1);assert.equal(h.calls.stream,1)
})

test('end-only text is observed as text without retaining its final block content in diagnostics',async()=>{
  const h=harness({chunks:[{type:'block-end',index:0,block:{type:'text',text:PRIVATE}},finish('stop')]})
  const r=await h.adapter.generate(input())
  assert.equal(r.status,'completed');assert.equal(r.body,PRIVATE)
  assert.ok(Number.isSafeInteger(r.diagnostic.firstTextElapsedMs),'end-only final text was not observed')
  assert.doesNotMatch(JSON.stringify(r.diagnostic),new RegExp(PRIVATE))
})

for(const mode of ['prepare','iterator','finish'])test('callee TIMEOUT remains unknown and records only observed callee cause: '+mode,async()=>{
  const error=Object.assign(Error(PRIVATE),{code:'TIMEOUT',headers:{authorization:PRIVATE}})
  const opts=mode==='prepare'?{prepare(){throw error}}:mode==='iterator'?{stream(){return{
    [Symbol.asyncIterator](){return this},next(){throw error},return(){return {done:true}}
  }}}:{chunks:[text(PRIVATE),{type:'finish',reason:{kind:'error',failure:error}}]}
  const h=harness(opts),r=await h.adapter.generate(input())
  assert.equal(r.status,'unknown');assert.equal(r.code,'TIMED_OUT');assert.equal(r.body,undefined)
  assert.ok(r.diagnostic)
  assert.equal(r.diagnostic.cause,'callee-timeout');assert.equal(r.diagnostic.calleeTimeoutObserved,true)
  assert.equal(r.diagnostic.localDeadlineObserved,false)
  assert.equal(r.diagnostic.firstTextElapsedMs===null,mode!=='finish')
  assert.doesNotMatch(JSON.stringify(r.diagnostic),new RegExp(PRIVATE))
  assert.equal(h.calls.prepare,1)
})

test('local deadline bounds stalled prepare and records no invented stream or first token',async()=>{
  let late
  const h=harness({timeoutMs:15,prepare:()=>new Promise(resolve=>{late=resolve})})
  const r=await h.adapter.generate(input())
  assert.equal(r.status,'unknown');assert.equal(r.code,'TIMED_OUT')
  assert.ok(r.diagnostic);assert.equal(r.diagnostic.cause,'local-deadline')
  assert.equal(r.diagnostic.localDeadlineObserved,true);assert.equal(r.diagnostic.calleeTimeoutObserved,false)
  assert.equal(r.diagnostic.streamEntered,false);assert.equal(r.diagnostic.firstChunkElapsedMs,null)
  assert.equal(r.diagnostic.firstTextElapsedMs,null);assert.equal(h.preparedSignal.aborted,true)
  const before=JSON.stringify(r);late();await nextTurn()
  assert.equal(JSON.stringify(r),before);assert.equal(h.calls.stream,0)
})

test('deadline settles noncooperative stream and cleanup without publishing late body',async()=>{
  let late,returned=0
  const h=harness({timeoutMs:15,stream:()=>({[Symbol.asyncIterator](){return this},
    next:()=>new Promise(resolve=>{late=resolve}),return(){returned++;return new Promise(()=>{})}})})
  const r=await h.adapter.generate(input())
  assert.equal(r.status,'unknown');assert.equal(r.body,undefined);assert.ok(r.diagnostic)
  assert.equal(r.diagnostic.cause,'local-deadline');assert.equal(r.diagnostic.streamEntered,true)
  assert.equal(r.diagnostic.terminalSeen,false)
  const before=JSON.stringify(r);late({done:false,value:text(PRIVATE)});await nextTurn()
  assert.equal(JSON.stringify(r),before);assert.equal(returned,1)
})

test('abort before admission starts nothing; abort while preparing is observed locally only',async()=>{
  const before=new AbortController();before.abort()
  const early=harness();const rejected=await early.adapter.generate(input(before.signal))
  assert.equal(rejected.code,'ABORTED');assert.equal(early.calls.prepare,0)
  const controller=new AbortController()
  const h=harness({prepare:()=>new Promise(()=>{})})
  const p=h.adapter.generate(input(controller.signal));await nextTurn();controller.abort(PRIVATE)
  const r=await p
  assert.equal(r.status,'unknown');assert.equal(r.code,'ABORTED');assert.ok(r.diagnostic)
  assert.equal(r.diagnostic.cause,'local-abort');assert.equal(r.diagnostic.localAbortObserved,true)
  assert.equal(getEventListeners(controller.signal,'abort').length,0)
  assert.doesNotMatch(JSON.stringify(r),new RegExp(PRIVATE))
})

test('diagnostic and error classification never evaluate hostile code getters',async()=>{
  let getters=0
  const error={message:PRIVATE,get code(){getters++;return 'TIMEOUT'}}
  const h=harness({prepare(){throw error}}),r=await h.adapter.generate(input())
  assert.equal(getters,0,'untrusted error getter evaluated')
  assert.equal(r.code,'GENERATION_FAILED');assert.ok(r.diagnostic)
  assert.equal(r.diagnostic.cause,'unattributed');assert.equal(r.diagnostic.calleeTimeoutObserved,false)
  assert.doesNotMatch(JSON.stringify(r),new RegExp(PRIVATE))
})

test('terminal format rejection and nonterminal truncation retain separate diagnostic limits',async()=>{
  for(const [chunks,status,terminal] of [[[text(PRIVATE),finish('max-tokens')],'failed',true],[[text(PRIVATE)],'unknown',false]]){
    const r=await harness({chunks}).adapter.generate(input())
    assert.equal(r.status,status);assert.equal(r.code,'INVALID_OUTPUT');assert.equal(r.body,undefined)
    assert.ok(r.diagnostic);assert.equal(r.diagnostic.cause,'output-contract')
    assert.equal(r.diagnostic.terminalSeen,terminal)
    assert.doesNotMatch(JSON.stringify(r.diagnostic),new RegExp(PRIVATE))
  }
})

test('ordinary deadline still settles at120s while a trusted300s wait can finish after120s',async t=>{
  t.mock.timers.enable({apis:['setTimeout']})
  // Default is tested through the actual public factory, not this helper's1000ms default.
  let routeSignal
  const ordinary=createDshV340GenerationAdapter({BlockAssembler,createUserMessage,
    llm:{async prepareCall(route,signal){routeSignal=signal;return{config:route,stream:()=>({[Symbol.asyncIterator](){return this},next:()=>new Promise(()=>{})})}}}})
  let done=false
  const p=ordinary.generate(input()).then(r=>{done=true;return r});await nextTurn()
  t.mock.timers.tick(119999);await nextTurn();assert.equal(done,false)
  t.mock.timers.tick(1);const normal=await p;assert.equal(normal.code,'TIMED_OUT');assert.equal(routeSignal.aborted,true)
  let release
  const trusted=harness({timeoutMs:300000,stream:()=> (async function*(){await new Promise(resolve=>{release=resolve});yield text('late public body');yield finish('stop')})()})
  const p2=trusted.adapter.generate(input());await nextTurn();t.mock.timers.tick(120001);await nextTurn()
  assert.equal(trusted.preparedSignal.aborted,false);release()
  const r=await p2;assert.equal(r.status,'completed');assert.equal(r.body,'late public body')
  assert.ok(r.diagnostic);assert.equal(r.diagnostic.deadlineMs,300000)
})

test('same-turn deadline and abort retain observed flags without claiming an exclusive provider cause',async t=>{
  t.mock.timers.enable({apis:['setTimeout']})
  const controller=new AbortController(),h=harness({timeoutMs:20,prepare:()=>new Promise(()=>{})})
  const p=h.adapter.generate(input(controller.signal));await nextTurn()
  setTimeout(()=>controller.abort(),20)
  t.mock.timers.tick(20)
  const r=await p
  assert.equal(r.status,'unknown');assert.equal(r.code,'TIMED_OUT')
  assert.equal(r.diagnostic.cause,'local-deadline')
  assert.equal(r.diagnostic.localDeadlineObserved,true);assert.equal(r.diagnostic.localAbortObserved,true)
  assert.equal(r.diagnostic.calleeTimeoutObserved,false)
})

test('concurrent run diagnostics and late chunks cannot cross into the next result',async()=>{
  let late,count=0
  const h=harness({timeoutMs:20,stream(){
    if(++count===1)return{[Symbol.asyncIterator](){return this},next:()=>new Promise(resolve=>{late=resolve}),return(){return {done:true}}}
    return(async function*(){yield text('second run only');yield finish('stop')})()
  }})
  const first=h.adapter.generate(input());await nextTurn()
  const secondInput=input();secondInput.runId='synthetic-run-two'
  secondInput.requestText=JSON.stringify({businessVersion:'V3.4.0',nodeId:'Flow-2-6',runId:'synthetic-run-two',data:'public second'})
  const second=await h.adapter.generate(secondInput),original=await first
  assert.equal(second.body,'second run only');assert.equal(second.diagnostic.runId,'synthetic-run-two')
  assert.equal(original.status,'unknown');assert.equal(original.diagnostic.runId,'synthetic-run')
  const before=JSON.stringify([original,second]);late({done:false,value:text(PRIVATE)});await nextTurn()
  assert.equal(JSON.stringify([original,second]),before)
})

test('diagnostics require an explicit trusted boolean and are absent by default',async()=>{
  const off=harness({captureDiagnostics:false}),r=await off.adapter.generate(input())
  assert.equal(r.status,'completed');assert.equal(Object.hasOwn(r,'diagnostic'),false)
  const bad=harness({captureDiagnostics:'user supplied'}),badResult=await bad.adapter.generate(input())
  assert.equal(badResult.code,'INVALID_INPUT');assert.equal(bad.calls.prepare,0)
})
