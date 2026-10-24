import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { setupNative, MODEL_OUTPUT, NOW } from './helpers/v340-native-harness.mjs'
import { assembleV340Document, inspectV340Document, prepareV340Inputs } from '../src/v340-document.js'
import { createWorkbenchService } from '../src/workbench-service.js'
import { openOasisWorkbenchRepository } from '../src/workbench-repository.js'
import { canonicalJson } from '../src/local-mock-runner.js'

const hash=body=>createHash('sha256').update(body).digest('hex')
const cores={dense:'`x'.repeat(150000),plain:'x'.repeat(300000)}
const emptyDraft=()=>({source:'local-skill',textInputs:{},filePaths:{},configuration:{}})
const output=core=>({...MODEL_OUTPUT,summary:'合成反例',core_result_markdown:core})
const command=core=>({nodeId:'Flow-1-1',workflowRunUid:'12345678-1234-4234-8234-123456789abc',generatedAt:NOW,prepared:prepareV340Inputs('Flow-1-1',{}),output:output(core)})
const identities={dense:{gzip:'cb16cdc9e5f88befd604ce8ac7dbbf75ee7df9c60b8020fbc7d786e29074f5e9',body:'408ed879315726f10b63868bb96cdd63082f304770c748ade384aabf74dfdcff'},plain:{gzip:'0b7f0a81bf4a497c5c057ec186df4b78fa91386b3352379b456199d11e46e4fc',body:'928429d7a660a2fe0127404143fefb4790705b85f3a42601315bccdc05d62d23'}}
async function fixture(kind){
 const bytes=await readFile(new URL('./fixtures/v340-backtick-fence/'+kind+'.json.gz',import.meta.url));assert.equal(hash(bytes),identities[kind].gzip)
 const file=JSON.parse(gunzipSync(bytes));assert.equal(hash(file.body),identities[kind].body);assert.equal(file.sha256,identities[kind].body)
 assert.equal(Buffer.byteLength(file.body),907625);return file
}

for(const kind of ['dense','plain'])test(kind+' legal 300000-byte native core completes without changing the field or document limit',async t=>{
 const core=cores[kind],h=await setupNative(t,{nodeId:'Flow-1-1',draft:emptyDraft(),output:output(core),timeoutMs:2000})
 await h.create();const r=await h.settle();assert.equal(r.status,'completed');assert.equal(r.result.snapshot.current_result.core_result_markdown,core)
 assert.ok(Buffer.byteLength(r.result.body)<1048576);assert.equal(h.seen.prepare,1);assert.equal(h.seen.stream,1)
 assert.equal(inspectV340Document({filename:r.result.fileName,body:r.result.body,sha256:r.result.sha256},'Flow-1-1').status,'accepted')
 await h.create();assert.equal(h.seen.stream,1)
 const before=canonicalJson(h.repository.get('w'));await h.repository.close();const reopened=await openOasisWorkbenchRepository(h.disk)
 try{assert.equal(canonicalJson(reopened.get('w')),before)}finally{await reopened.close()}
})

for(const kind of ['dense','plain'])test(kind+' legal long edit creates a re-reviewable version and saves exact Markdown on disk',async t=>{
 const h=await setupNative(t,{nodeId:'Flow-1-1',draft:emptyDraft()});await h.create();const r=await h.settle();assert.equal(r.status,'completed')
 const workbench=createWorkbenchService({repository:h.repository,workspaceRegistry:h.ctx.workspaceRegistry,clock:()=>NOW});t.after(()=>workbench.closeV340Runtime())
 const cmd=extra=>h.command({runId:r.runId,...extra}),core=cores[kind]
 await workbench.saveV340ResultDraft(cmd({baseSha256:r.result.sha256,format:'core-markdown',body:core}))
 await workbench.editV340Result(cmd({versionId:r.runId,baseSha256:r.result.sha256,draftSha256:hash(core),requestKey:'long-edit'}))
 const versions=h.run().resultVersions;assert.equal(versions.length,2);assert.equal(versions[0].result.sha256,r.result.sha256)
 const v=versions[1],target={versionId:v.versionId,resultSha256:v.result.sha256}
 assert.equal(v.result.snapshot.current_result.core_result_markdown,core);assert.ok(Buffer.byteLength(v.result.body)<1048576)
 assert.equal(v.review.status,'not-reviewed');await assert.rejects(()=>workbench.prepareV340Save(cmd(target)))
 await workbench.reviewV340Result(cmd({...target,confirmed:true}));const plan=await workbench.prepareV340Save(cmd(target))
 await workbench.commitV340Save({confirmationToken:plan.confirmationToken})
 const saved=h.run().resultVersions[1],md=saved.writebacks[0].files.find(f=>f.mediaType==='text/markdown')
 const body=await readFile(join(h.root,md.relativePath),'utf8');assert.equal(body,v.result.body);assert.equal(hash(body),v.result.sha256)
 assert.equal(inspectV340Document({filename:v.result.fileName,body,sha256:hash(body)},'Flow-1-1').status,'accepted')
 const before=canonicalJson(h.repository.get('w'));await h.repository.close();const reopened=await openOasisWorkbenchRepository(h.disk)
 try{assert.equal(canonicalJson(reopened.get('w')),before)}finally{await reopened.close()}
})

for(const kind of ['dense','plain'])test(kind+' pre-fix-format upstream retains its exact hash and enters the actual adjacent native node',async t=>{
 const file=await fixture(kind),inspected=inspectV340Document(file,'Flow-1-1')
 assert.equal(inspected.status,'accepted');assert.deepEqual(inspected.issues,[]);assert.equal(inspected.snapshot.current_result.core_result_markdown,cores[kind])
 const h=await setupNative(t,{nodeId:'Flow-1-2',draft:emptyDraft(),timeoutMs:2000});await writeFile(join(h.root,file.filename),file.body)
 await h.service.updateV340Draft(h.command({draft:{...emptyDraft(),filePaths:{upstream_md_file:file.filename}}}))
 await h.create();const r=await h.settle();assert.equal(r.status,'completed');assert.equal(r.inputSnapshot.preparedEncoding,'values-v1')
 assert.equal(r.result.snapshot.upstream_file_sha256,file.sha256);assert.equal(r.result.snapshot.input_history.length,2)
 assert.ok(r.result.snapshot.contents.some(c=>c.content_markdown===cores[kind]))
 const sent=JSON.parse(h.seen.options.messages[0].content[0].text)
 assert.equal(sent.values.upstream_md_file.body,file.body);assert.equal(sent.receipts.upstream_md_file.status,'accepted')
 assert.equal(hash(await readFile(join(h.root,file.filename),'utf8')),file.sha256);assert.equal(h.seen.stream,1)
})

const historical=JSON.parse(await readFile(new URL('./fixtures/v340-backtick-fence/historical-small.json',import.meta.url),'utf8'))
for(const sample of historical)test('historical '+sample.name+' keeps the exact existing fence width and document digest',()=>{
 const doc=assembleV340Document(command(sample.core)),fence='`'.repeat(sample.width)
 assert.equal(doc.sha256,sample.sha256);assert.ok(doc.body.includes('## 核心结果\n\n'+fence+'text\n'+sample.core+'\n'+fence+'\n'))
 assert.equal(inspectV340Document({filename:doc.fileName,body:doc.body,sha256:doc.sha256},'Flow-1-1').status,'accepted')
})
test('one 100000-backtick run uses a longer delimiter and remains a valid unchanged document',()=>{
 const core='`'.repeat(100000),doc=assembleV340Document(command(core)),delimiter='`'.repeat(100001)
 assert.ok(doc.body.includes(delimiter+'text\n'+core+'\n'+delimiter));assert.ok(Buffer.byteLength(doc.body)<1048576)
 assert.equal(inspectV340Document({filename:doc.fileName,body:doc.body,sha256:doc.sha256},'Flow-1-1').status,'accepted')
})

for(const [kind,core]of [['field overflow','x'.repeat(300001)],['UTF-8 document overflow','中'.repeat(120000)],['delimiter expansion overflow','`'.repeat(300000)]])test(kind+' still fails native output without publishing a partial result',async t=>{
 const h=await setupNative(t,{nodeId:'Flow-1-1',draft:emptyDraft(),output:output(core),timeoutMs:2000});await h.create();const r=await h.settle()
 assert.equal(r.status,'failed');assert.equal(r.failureCode,'INVALID_OUTPUT');assert.equal(r.result,null);assert.equal(h.seen.stream,1)
})
test('altering a frozen upstream body without its hash still fails before structural interpretation',async()=>{
 const file=await fixture('dense');assert.throws(()=>inspectV340Document({...file,body:file.body+'\n改动'},'Flow-1-1'))
})
