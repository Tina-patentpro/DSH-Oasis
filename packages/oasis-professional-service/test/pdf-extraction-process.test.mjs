import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { createPdfExtractionSession } from '../src/pdf-extraction-process.js'

const digest = value => createHash('sha256').update(value).digest('hex')
const bytes = Buffer.from('%PDF-public-unit-input')
function result(input = bytes) {
  const body = 'D0 public synthetic valve - page 1\n公开合成阀体：壳体与弹簧。'
  return { body, rawSHA256:digest(input), textSHA256:digest(body),
    locations:[{locator:{kind:'pdf-page',page:1},startUTF16:0,endUTF16:34},
      {locator:{kind:'pdf-page',page:2},startUTF16:35,endUTF16:48}],
    pages:2, objects:11, decodedBytes:718, parser:'pypdf/6.10.0',
    isolation:{mechanism:'seccomp-bpf-aarch64-v1',open:'EPERM',socket:'EPERM',exec:'EPERM',clone:'EPERM',
      memoryMax:268435456,memorySwapMax:0,pidsMax:1,kernelAlarmSeconds:5} }
}
function fixture() {
  const child = new EventEmitter()
  child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough()
  let launches=0,stops=0,reclaims=0
  const job={child,terminate:async()=>{stops++;queueMicrotask(()=>child.emit('close',null,'SIGKILL'))},
    reclaim:async()=>{reclaims++}}
  return {child,job,launch:()=>{launches++;return job},counts:()=>({launches,stops,reclaims}),
    respond:value=>{child.stdout.end(JSON.stringify(value));child.emit('close',0,null)}}
}

test('returns verified complete text only after close and successful reclamation; input copied',async()=>{
  const f=fixture(), source=Buffer.from(bytes), session=createPdfExtractionSession({launch:f.launch})
  const pending=session.extract(source);source.fill(0)
  f.respond(result())
  assert.deepEqual(await pending,result());assert.deepEqual(f.counts(),{launches:1,stops:0,reclaims:1})
})
test('same bytes, both hashes, UTF16 page coverage and isolation declaration are all checked',async()=>{
  for(const mutate of [r=>r.rawSHA256=digest('different'),r=>r.textSHA256=digest('different'),
    r=>r.locations[1].startUTF16=34,r=>r.pages=3,r=>r.isolation.memoryMax=0,
    r=>r.body+='\ud800',r=>r.extra='untrusted']){
    const f=fixture(),pending=createPdfExtractionSession({launch:f.launch}).extract(bytes),r=result();mutate(r)
    f.respond(r);await assert.rejects(pending,{code:'V340_PDF_INVALID_RESULT'});assert.equal(f.counts().reclaims,1)
  }
})
test('stdout and stderr are capped before accumulation and never return partial text',async()=>{
  for(const [stream,limit] of [['stdout',2097152],['stderr',16384]]){
    const f=fixture(),pending=createPdfExtractionSession({launch:f.launch}).extract(bytes)
    f.child[stream].write(Buffer.alloc(limit+1,120))
    await assert.rejects(pending,{code:'V340_EXTRACTION_LIMIT'})
    assert.deepEqual(f.counts(),{launches:1,stops:1,reclaims:1})
  }
})
test('cancel stops and reclaims the job; pre-cancel never launches',async()=>{
  const f=fixture(),controller=new AbortController(),session=createPdfExtractionSession({launch:f.launch})
  const pending=session.extract(bytes,{signal:controller.signal});controller.abort()
  await assert.rejects(pending,{code:'V340_EXTRACTION_CANCELLED'});assert.equal(f.counts().reclaims,1)
  await assert.rejects(session.extract(bytes,{signal:controller.signal}),{code:'V340_EXTRACTION_CANCELLED'})
  assert.equal(f.counts().launches,1)
})
test('worker 5s and preparation 15s budgets are enforced without starting another worker',async t=>{
  t.mock.timers.enable({apis:['setTimeout']})
  let now=0
  const f=fixture(),session=createPdfExtractionSession({launch:f.launch,now:()=>now})
  const pending=session.extract(bytes);t.mock.timers.tick(5000)
  await assert.rejects(pending,{code:'V340_EXTRACTION_TIMEOUT'});assert.equal(f.counts().reclaims,1)
  now=15000;await assert.rejects(session.extract(bytes),{code:'V340_EXTRACTION_TIMEOUT'})
  assert.equal(f.counts().launches,1)
})
test('concurrent worker, invalid header and oversized input fail before dispatch',async()=>{
  const f=fixture(),session=createPdfExtractionSession({launch:f.launch})
  for(const raw of [Buffer.from('not a PDF'),Buffer.alloc(1048577)])
    await assert.rejects(session.extract(raw))
  const first=session.extract(bytes)
  await assert.rejects(session.extract(bytes),{code:'V340_EXTRACTION_BUSY'})
  f.respond(result());await first;assert.equal(f.counts().launches,1)
})
test('reclamation failure, nonzero exit and worker error cannot become successful extraction',async()=>{
  const f=fixture();f.job.reclaim=async()=>{throw Error('PRIVATE')}
  const session=createPdfExtractionSession({launch:f.launch})
  const pending=session.extract(bytes);f.respond(result())
  await assert.rejects(pending,e=>e.code==='V340_PDF_RECLAIM_FAILED'&&!String(e).includes('PRIVATE'))
  await assert.rejects(session.extract(bytes),{code:'V340_PDF_RECLAIM_FAILED'})
  assert.equal(f.counts().launches,1)
  const g=fixture(),failed=createPdfExtractionSession({launch:g.launch}).extract(bytes)
  g.child.stdout.end(JSON.stringify({error:'V340_EXTRACTION_UNSUPPORTED'}));g.child.emit('close',2,null)
  await assert.rejects(failed,{code:'V340_EXTRACTION_FAILED'});assert.equal(g.counts().reclaims,1)
})
test('delayed close cannot beat an elapsed deadline by cancelling the pending timer',async()=>{
  let now=0
  const f=fixture(),session=createPdfExtractionSession({launch:f.launch,now:()=>now})
  const pending=session.extract(bytes);now=5001;f.respond(result())
  await assert.rejects(pending,{code:'V340_EXTRACTION_TIMEOUT'});assert.equal(f.counts().reclaims,1)
})
test('worker/stream errors stop the job; absent close poisons the session even if reclaim returns',async t=>{
  for(const channel of ['worker','stdout','stderr','stdin']){
    const f=fixture(),pending=createPdfExtractionSession({launch:f.launch}).extract(bytes)
    ;(channel==='worker'?f.child:f.child[channel]).emit('error',Error('PRIVATE'))
    await assert.rejects(pending,{code:'V340_EXTRACTION_FAILED'})
    assert.equal(f.counts().stops,1);assert.equal(f.counts().reclaims,1)
  }
  t.mock.timers.enable({apis:['setTimeout']})
  const f=fixture();f.job.terminate=async()=>{}
  const session=createPdfExtractionSession({launch:f.launch}),controller=new AbortController()
  const pending=session.extract(bytes,{signal:controller.signal});controller.abort()
  t.mock.timers.tick(1000)
  await assert.rejects(pending,{code:'V340_PDF_RECLAIM_FAILED'})
  await assert.rejects(session.extract(bytes),{code:'V340_PDF_RECLAIM_FAILED'})
  assert.equal(f.counts().launches,1)
})
