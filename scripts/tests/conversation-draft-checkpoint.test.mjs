import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { Script, runInNewContext } from 'node:vm'
import { randomUUID } from 'node:crypto'
import { patchConversationDraftCheckpoint } from '../../patches/dsh-0.2.0-rc.2/conversation-draft-checkpoint.mjs'

const root=fileURLToPath(new URL('../..',import.meta.url))
const app=root+'/.local/oasis-follow-up-20261026/desktop217-recovery/mounted/DSH Desktop.app/Contents/Resources/app'
const sdk=createRequire(app+'/package.json')
const original=readFileSync(sdk.resolve('@deepseek-ai/dsh-client-ui-conversation/client'),'utf8')
const patched=patchConversationDraftCheckpoint(original)
const cordis=await import(pathToFileURL(sdk.resolve('@deepseek-ai/cordis')))
// The fixed SDK browser Store is statically linked, so its Node artifact's
// dependencies are materialized in the already-frozen source runtime.
const store=await import(pathToFileURL(root+'/.local/test-runtimes/dsh-0.2.0-rc.2-639ed015/deepseek-harness-639ed015397290b3745d163aafe02ffee4aa3f84/packages/client/store/lib/index.js'))
function controllerClass(text){
 const start=text.indexOf('//#region lib/types/client/service.js'),end=text.indexOf('//#endregion',start)
 assert.ok(start>=0&&end>start)
 // Characterize the actual fixed package class, excluding unrelated UI/CSS
 // assembly. No method is replaced and the production artifact is unchanged.
 return runInNewContext(text.slice(start,end)+'\nConversationController',{
  _deepseek_ai_cordis:cordis,_deepseek_ai_dsh_client_store:store,randomUUID,URL,File,Blob,AbortController,setTimeout,clearTimeout,
 })
}
test('fixed-byte patch refuses changed upstream and repeated application',()=>{
 assert.throws(()=>patchConversationDraftCheckpoint(original+' '),/upstream mismatch/)
 assert.throws(()=>patchConversationDraftCheckpoint(patched),/upstream mismatch/)
 new Script(patched)
})
test('the original fixed native class lacks cold attachment recovery while the paired patch restores Blob bytes without upload',async()=>{
 assert.equal(typeof controllerClass(original).prototype.restoreCheckpointAttachments,'undefined')
 const Controller=controllerClass(patched),ctx=new cordis.Context();let uploads=0
 ctx.provide('fileUpload',{upload(){uploads++;assert.fail('restore must not upload')}})
 const service=new Controller(ctx,{input:{},blocks:{},maxConcurrentFileUploads:1})
 try{
  const file=new File([new Blob(['PUBLIC_BLOB_公开'])],'公开.md',{type:'text/markdown',lastModified:12345})
  const [id]=service.restoreCheckpointAttachments([{kind:'file',file}]),[restored]=service.resolveDraftAttachments([id])
  assert.equal(restored.file.name,'公开.md');assert.equal(restored.file.type,'text/markdown');assert.equal(restored.file.lastModified,12345)
  assert.equal(await restored.file.text(),'PUBLIC_BLOB_公开');assert.equal(uploads,0)
  const state=service.fileUploads.getSnapshot()[id];assert.equal(state.status,'error');assert.equal('receiptId' in state,false)
  service.releaseDraftAttachment(id);assert.equal(service.resolveDraftAttachments([id]).length,0)
 }finally{await ctx.fiber.dispose()}
})
test('only an explicit retry creates a fresh local test receipt after a file is restored',async()=>{
 const Controller=controllerClass(patched),ctx=new cordis.Context();let uploads=0
 ctx.provide('fileUpload',{async upload(session,file){uploads++;assert.equal(session,'public-session');assert.equal(await file.text(),'kept bytes');return{ok:true,value:{receiptId:'fresh-synthetic-receipt',file:{attachmentId:'synthetic-file',name:'kept.md',bytes:10}}}}})
 const service=new Controller(ctx,{input:{},blocks:{},maxConcurrentFileUploads:1})
 try{
  const [id]=service.restoreCheckpointAttachments([{kind:'file',file:new File(['kept bytes'],'kept.md')}])
  assert.equal(uploads,0);assert.equal(service.fileUploads.getSnapshot()[id].status,'error')
  service.retryFileUpload('public-session',id)
  for(let i=0;i<20&&service.fileUploads.getSnapshot()[id].status==='uploading';i++)await new Promise(setImmediate)
  assert.equal(uploads,1);assert.equal(service.fileUploads.getSnapshot()[id].status,'ready')
  assert.equal(service.fileUploads.getSnapshot()[id].receiptId,'fresh-synthetic-receipt')
 }finally{await ctx.fiber.dispose()}
})

test('F-DR-A01: Workspace carry never uploads a restored file or carries a previous Session receipt',async()=>{
 const Controller=controllerClass(patched),ctx=new cordis.Context(),calls=[]
 ctx.provide('fileUpload',{async upload(session,file){calls.push(session);return{ok:true,value:{receiptId:'fresh-'+session,file:{attachmentId:'public-file',name:file.name,bytes:file.size}}}}})
 const service=new Controller(ctx,{input:{},blocks:{},maxConcurrentFileUploads:1})
 const settle=async id=>{for(let n=0;n<20&&service.fileUploads.getSnapshot()[id].status==='uploading';n++)await new Promise(setImmediate)}
 try{
  const [id]=service.restoreCheckpointAttachments([{kind:'file',file:new File(['public'],'carry.md')}])
  service.rebindDraftFiles('B',[id]);await settle(id)
  assert.equal(calls.length,0,'Workspace carry must require an explicit retry');assert.equal(service.fileUploads.getSnapshot()[id].status,'error')
  service.retryFileUpload('B',id);await settle(id);assert.deepEqual(calls,['B']);assert.equal(service.fileUploads.getSnapshot()[id].receiptId,'fresh-B')
  service.rebindDraftFiles('C',[id]);await settle(id)
  assert.deepEqual(calls,['B']);assert.equal(service.fileUploads.getSnapshot()[id].status,'error');assert.equal('receiptId'in service.fileUploads.getSnapshot()[id],false)
  service.retryFileUpload('C',id);await settle(id);assert.deepEqual(calls,['B','C']);assert.equal(service.fileUploads.getSnapshot()[id].receiptId,'fresh-C')
 }finally{await ctx.fiber.dispose()}
})
test('Workspace carry retires an outstanding explicit upload so its late receipt cannot make the new Session ready',async()=>{
 const Controller=controllerClass(patched),ctx=new cordis.Context();let release,signal,calls=0
 const gate=new Promise(resolve=>{release=resolve})
 ctx.provide('fileUpload',{async upload(_session,file,_name,abort){calls++;signal=abort;await gate;return{ok:true,value:{receiptId:'late-A',file:{attachmentId:'public-file',name:file.name,bytes:file.size}}}}})
 const service=new Controller(ctx,{input:{},blocks:{},maxConcurrentFileUploads:1})
 try{
  const [id]=service.restoreCheckpointAttachments([{kind:'file',file:new File(['public'],'late.md')}]);service.retryFileUpload('A',id)
  assert.equal(calls,1);service.rebindDraftFiles('B',[id]);assert.equal(signal.aborted,true)
  release();for(let n=0;n<5;n++)await new Promise(setImmediate)
  assert.equal(calls,1);assert.equal(service.fileUploads.getSnapshot()[id].status,'error');assert.equal('receiptId'in service.fileUploads.getSnapshot()[id],false)
 }finally{release();await ctx.fiber.dispose()}
})

test('ordinary newly picked files retain the fixed native upload and Workspace carry behavior',async()=>{
 const Controller=controllerClass(patched),ctx=new cordis.Context(),calls=[]
 ctx.provide('fileUpload',{async upload(session,file){calls.push(session);return{ok:true,value:{receiptId:'ordinary-'+session,file:{attachmentId:'ordinary-file',name:file.name,bytes:file.size}}}}})
 const service=new Controller(ctx,{input:{},blocks:{},maxConcurrentFileUploads:1})
 const settle=async id=>{for(let n=0;n<20&&service.fileUploads.getSnapshot()[id].status==='uploading';n++)await new Promise(setImmediate)}
 try{
  const [file]=service.createDrafts('A',[new File(['public'],'ordinary.md')]);await settle(file.id)
  assert.deepEqual(calls,['A']);service.rebindDraftFiles('B',[file.id]);await settle(file.id)
  assert.deepEqual(calls,['A','B']);assert.equal(service.fileUploads.getSnapshot()[file.id].receiptId,'ordinary-B')
 }finally{await ctx.fiber.dispose()}
})
