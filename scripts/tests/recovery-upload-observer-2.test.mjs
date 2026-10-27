import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {createServer,request} from 'node:http'
import {observeRecoveryUploads} from './fixtures/recovery-upload-observer-2.mjs'

test('P2 regression: malformed request target cannot crash the observed HTTP server',()=>{
 const script=`import {createServer,request} from 'node:http';import {observeRecoveryUploads} from ${JSON.stringify(new URL('./fixtures/recovery-upload-observer-2.mjs',import.meta.url).href)};
 const rows=[],server=createServer((req,res)=>res.end('handled'));await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port,close=observeRecoveryUploads({port,write:r=>rows.push(r)});
 const result=await new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port,method:'POST',path:'http://[?auditToken=QUERY_ONLY_MARKER'},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>resolve({status:res.statusCode,text}))});req.on('error',reject);req.end('public-probe')});close();await new Promise(r=>server.close(r));console.log(JSON.stringify({result,last:rows.at(-1)}));`
 const p=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',env:process.env})
 assert.equal(p.status,0,p.stderr);assert.doesNotMatch(p.stdout+p.stderr,/QUERY_ONLY_MARKER|auditToken/);const r=JSON.parse(p.stdout)
 assert.deepEqual(r.result,{status:200,text:'handled'});assert.equal(r.last.unclassifiedRequests,1);assert.equal(r.last.binaryUploadStarts,0)
})

test('v2 records exact upload path and evidence failures without changing body or response',async()=>{
 const rows=[],bodies=[];let fail=true
 const server=createServer((req,res)=>{let body='';req.on('data',b=>body+=b);req.on('end',()=>{bodies.push(body);res.end('handled')})});await new Promise(r=>server.listen(0,'127.0.0.1',r))
 const port=server.address().port,close=observeRecoveryUploads({port,write:r=>{if(r.kind==='request'&&fail){fail=false;throw Error('evidence disk failure')}rows.push(r)}})
 const send=path=>new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port,method:'POST',path},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>resolve(text))});req.on('error',reject);req.end('public-body')})
 try{assert.equal(await send('/unrelated?token=private'),'handled');assert.equal(await send('/api/session/uploadFileBinary?sessionId=private'),'handled');close()
  assert.deepEqual(bodies,['public-body','public-body']);assert.equal(rows.at(-1).binaryUploadStarts,1);assert.equal(rows.at(-1).requests,2);assert.equal(rows.at(-1).unclassifiedRequests,0);assert.equal(rows.at(-1).evidenceWriteFailures,1)
  assert.doesNotMatch(JSON.stringify(rows),/private|public-body|token|sessionId|disk failure/)
 }finally{close();await new Promise(r=>server.close(r))}
})
