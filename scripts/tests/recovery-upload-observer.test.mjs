import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer,request} from 'node:http'
import {observeRecoveryUploads} from './fixtures/recovery-upload-observer.mjs'

test('real Node HTTP channel observes upload starts without consuming or changing the request',async()=>{
 const rows=[],bodies=[]
 const server=createServer((req,res)=>{let body='';req.setEncoding('utf8');req.on('data',b=>body+=b);req.on('end',()=>{bodies.push(body);res.writeHead(201);res.end('unchanged')})})
 await new Promise(r=>server.listen(0,'127.0.0.1',r))
 const port=server.address().port,close=observeRecoveryUploads({port,write:row=>rows.push(row)})
 const send=(method,path,body='')=>new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port,method,path,headers:{'x-private':'must-not-log'}},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>resolve({status:res.statusCode,text}))});req.on('error',reject);req.end(body)})
 try{
  assert.deepEqual(await send('POST','/api/session/uploadFileBinary?sessionId=private','public-positive-control'),{status:201,text:'unchanged'})
  await send('GET','/api/session/uploadFileBinary');await send('POST','/unrelated?token=must-not-log')
  assert.deepEqual(rows.map(r=>r.kind),['subscribed','request','request','request'])
  assert.equal(rows.at(-1).binaryUploadStarts,1);assert.equal(rows.at(-1).requests,3)
  assert.deepEqual(bodies,['public-positive-control','',''])
  assert.doesNotMatch(JSON.stringify(rows),/private|public-positive-control|token|unchanged|sessionId/)
  close();await send('POST','/api/session/uploadFileBinary','after-dispose')
  assert.equal(rows.at(-1).kind,'disposed');assert.equal(rows.at(-1).binaryUploadStarts,1)
  assert.equal(rows.length,5);close();assert.equal(rows.length,5)
 }finally{close();await new Promise(r=>server.close(r))}
})

test('observer rejects missing evidence writer and non-loopback invalid port configuration',()=>{
 assert.throws(()=>observeRecoveryUploads({port:0,write(){}}),/port/)
 assert.throws(()=>observeRecoveryUploads({port:57583}),/writer/)
})
