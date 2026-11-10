import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as doc from '../src/v340-document.js';
import {resultFixture} from './v340-result-fixture.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
const uid='12345678-1234-4234-8234-123456789abc';
const material='导向槽沿同一方向延伸；滑块位于槽中。';
const output={summary:'公开合成未核稿',core_result_markdown:'公开原正文',updates:[],terms_master:[],warnings:[],model_completions:[],
 tables:{T2:[{row_id:'f002',data:{feature_id:'F-002',relation:'沿同一方向延伸',destination:'旧待核'}}],
 T4:[{row_id:'claim2',data:{feature_id:'F-003',conclusion:'进一步限定'}}]}};
function setup(){
 const prepared=doc.prepareV340Inputs('Flow-2-6',{disclosure_text:material,user_input:'只作指令'});
 const parent=doc.assembleV340Document({nodeId:'Flow-2-6',workflowRunUid:uid,generatedAt:'2026-11-06T01:00:00.000Z',prepared,output});
 return {parent,prepared};
}
function patch(parent,source='disclosure_text'){
 return {schemaVersion:1,reason:'回填源属性，权2回退待论证',replacements:[
  {table:'T2',rowId:'f002',beforeSha256:hash(JSON.stringify(parent.snapshot.tables.T2.rows[0])),data:{...output.tables.T2[0].data,destination:'权1明写'},
   sources:[{inputId:source,sourceSha256:hash(material),quote:'沿同一方向延伸',start:3,end:10}]},
  {table:'T4',rowId:'claim2',beforeSha256:hash(JSON.stringify(parent.snapshot.tables.T4.rows[0])),data:{...output.tables.T4[0].data,conclusion:'实质收窄及回退价值待论证'},
   sources:[{inputId:source,sourceSha256:hash(material),quote:'滑块位于槽中',start:11,end:17}]}]};
}
const revise=(f,m06Structure)=>doc.reviseV340Document(f.parent,{workflowRunUid:'87654321-1234-4234-8234-123456789abc',generatedAt:'2026-11-06T02:00:00.000Z',body:'权1补延伸属性；权2保留但回退待论证',m06Structure,prepared:f.prepared});

// Catches ignoring the patch, mutating parent/evidence or inheriting factual acceptance.
test('M06 explicit T2/T4 replacement keeps immutable history, warnings and source identities',()=>{
 const f=setup(),before=structuredClone(f.parent),p=patch(f.parent),next=revise(f,p);
 assert.equal(next.snapshot.tables.T2.rows[0].data.destination,'权1明写');
 assert.equal(next.snapshot.tables.T4.rows[0].data.conclusion,'实质收窄及回退价值待论证');
 assert.deepEqual(f.parent,before);
 assert.deepEqual(next.snapshot.warnings.slice(0,before.snapshot.warnings.length),before.snapshot.warnings);
 assert.deepEqual(next.snapshot.input_history,before.snapshot.input_history);
 assert.deepEqual(next.snapshot.revisions.slice(-2).map(x=>x.before),[before.snapshot.tables.T2.rows[0],before.snapshot.tables.T4.rows[0]]);
 assert.equal(next.snapshot.deliverable_status,'not_recommended_for_filing');
 assert.equal(doc.inspectV340Document({filename:next.fileName,body:next.body,sha256:next.sha256},'Flow-2-6').status,'accepted');
});

for(const [label,change] of [
 ['instruction source',p=>p.replacements[0].sources[0].inputId='user_input'],
 ['wrong quote position',p=>p.replacements[0].sources[0].start=2],
 ['quote end beyond frozen text',p=>{p.replacements[0].sources[0].end=300000;p.replacements[0].sources[0].quote=material.slice(3)}],
 ['wrong source hash',p=>p.replacements[0].sources[0].sourceSha256='f'.repeat(64)],
 ['wrong parent row hash',p=>p.replacements[0].beforeSha256='f'.repeat(64)],
 ['new row',p=>p.replacements[0].rowId='new-row'],
 ['duplicate row',p=>p.replacements.push(structuredClone(p.replacements[0]))],
 ['only one table',p=>p.replacements.pop()],
 ['other table',p=>p.replacements[0].table='T3'],
])test(`M06 rejects ${label} without mutating parent`,()=>{
 const f=setup(),before=JSON.stringify(f.parent),p=patch(f.parent);change(p);
 assert.throws(()=>revise(f,p));assert.equal(JSON.stringify(f.parent),before);
});

// Catches an RPC that accepts structure but fails to bind it to request idempotency,
// the frozen run's material, or the new version's review/save barrier.
test('public edit RPC binds structure and retries to immutable revision; failed edit keeps draft',async t=>{
 const h=await resultFixture(t,'local-skill',{nodeId:'Flow-2-6',output}),runId=h.run().runId,parent=structuredClone(h.run().result);
 // The fixture's frozen actual material is 公开输入. Match it, not the live form.
 const p=patch(parent,'disclosure_text');
 for(const r of p.replacements)r.sources=[{inputId:'disclosure_text',sourceSha256:hash('公开输入'),quote:'公开输入',start:0,end:4}];
 await h.service.reviewV340Result(h.command({runId,versionId:runId,resultSha256:parent.sha256,confirmed:true}));
 await h.service.saveV340ResultDraft(h.command({runId,baseSha256:parent.sha256,body:'人工修订',format:'core-markdown'}));
 const request={runId,versionId:runId,baseSha256:parent.sha256,draftSha256:hash('人工修订'),requestKey:'structured-one',m06Structure:p};
 const before=JSON.stringify(h.record()),bad=structuredClone(request);bad.m06Structure.replacements[0].sources[0].quote='不存在';
 assert.equal((await h.handler('workflow/v340/result/edit',h.command(bad))).ok,false);
 assert.equal(JSON.stringify(h.record()),before);
 const result=await h.handler('workflow/v340/result/edit',h.command(request));assert.equal(result.ok,true);
 const version=h.run().resultVersions.at(-1);assert.equal(version.review.status,'not-reviewed');
 assert.equal(version.result.snapshot.tables.T4.rows[0].data.conclusion,'实质收窄及回退价值待论证');
 const fixed={runId,versionId:version.versionId,resultSha256:version.result.sha256};
 await assert.rejects(()=>h.service.prepareV340Save(h.command(fixed)),e=>e.code==='V340_REVIEW_REQUIRED');
 const saved=JSON.stringify(h.run());assert.equal((await h.handler('workflow/v340/result/edit',h.command(request))).ok,true);assert.equal(JSON.stringify(h.run()),saved);
 const conflict=structuredClone(request);conflict.m06Structure.reason='同键其他结构决定';
 const rejected=await h.handler('workflow/v340/result/edit',h.command(conflict));assert.equal(rejected.ok,false);assert.equal(rejected.error.code,'V340_EDIT_CONFLICT');
 assert.deepEqual(h.run().result,parent);assert.equal(h.generationCalls,1,'only initial synthetic fixture execution; edit dispatches none');
});

test('ambiguous duplicate inherited row identity refuses replacement',()=>{
 const f=setup(),parent=structuredClone(f.parent),p=patch(parent);
 parent.snapshot.tables.T2.rows.push(structuredClone(parent.snapshot.tables.T2.rows[0]));
 assert.throws(()=>revise({...f,parent},p));
});

test('structured edits cannot be applied to a different business node',()=>{
 const f=setup(),parent=structuredClone(f.parent);parent.snapshot.node_id='Flow-1-1';
 assert.throws(()=>revise({...f,parent},patch(f.parent)));
});
