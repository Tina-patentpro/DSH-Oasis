// Actual archived public-sample record -> public service/RPC -> fresh local files.
// StorageDomain is a local file-backed boundary; this is not a running App/Host.
import fs from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const folder=dirname(fileURLToPath(import.meta.url)),repo=resolve(folder,'../../..');
const entry=process.env.OASIS_REVISION_PACKAGE??join(repo,'packages/oasis-professional-service');
const suffix=process.env.OASIS_REVISION_RUN_SUFFIX??'source';
const scratch=join(repo,'.local/m06-structured-revision-20261106-r1',suffix),workspace=join(scratch,'workspace');
await fs.mkdir(scratch,{recursive:true});await fs.mkdir(workspace);
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const sha=v=>createHash('sha256').update(v).digest('hex');
const save=async(n,v)=>fs.writeFile(join(folder,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const sourceRecord=join(repo,'.dsh-test/m06-live-20261030-r2/home/storages/oasis_workbench.json');
const originalBytes=await fs.readFile(sourceRecord),original=JSON.parse(originalBytes);
const sourceMap=await read(join(folder,'../2026-11-06-m06-revision-release-prep-r1/source-map.json'));
const originalMd=await fs.readFile(sourceMap.parent.path);assert.equal(sha(originalMd),sourceMap.parent.sha256);
const imported=structuredClone(original.tables.workspaces),workspaceId=Object.keys(imported)[0];
let taskId,runId,parentVersionId;
for(const [tid,t] of Object.entries(imported[workspaceId].tasks))for(const [rid,r] of Object.entries(t.v340?.runs??{}))for(const v of r.resultVersions??[])
 if(v.result.sha256===sourceMap.parent.sha256){taskId=tid;runId=rid;parentVersionId=v.versionId;}
assert.ok(taskId&&runId&&parentVersionId);
const recordsPath=join(scratch,'records.json');await fs.writeFile(recordsPath,JSON.stringify(imported),{flag:'wx'});
const storageDomain={async open(){let records=await read(recordsPath),queue=Promise.resolve();return{table(name){assert.equal(name,'workspaces');return{
 get:id=>structuredClone(records[id]),put(id,value){const next=queue.then(async()=>{const changed={...records,[id]:value};await fs.writeFile(recordsPath+'.tmp',JSON.stringify(changed));await fs.rename(recordsPath+'.tmp',recordsPath);records=changed;});queue=next.catch(()=>{});return next;}};},async close(){await queue;}};}};
const module=async n=>import(pathToFileURL(join(entry,'src',n)).href);
const {openOasisWorkbenchRepository}=await module('workbench-repository.js');
const {createWorkbenchService}=await module('workbench-service.js');
const {createWorkbenchRpcHandler}=await module('workbench-rpc.js');
const {inspectV340Document}=await module('v340-document.js');
let repository=await openOasisWorkbenchRepository(storageDomain),networkAttempts=0,generationCalls=0;
globalThis.fetch=()=>{networkAttempts++;throw Error('No real request authorized');};
const registry={get:id=>id===workspaceId?{path:workspace,async status(){return'ok';}}:undefined};
const service=createWorkbenchService({repository,workspaceRegistry:registry,v340Executor:{async generate(){generationCalls++;throw Error('Generation not authorized');}}});
const rpc=createWorkbenchRpcHandler(service,{m06Candidate013:true});
const record=()=>repository.get(workspaceId),run=()=>record().tasks[taskId].v340.runs[runId];
const parent=structuredClone(run().resultVersions.find(v=>v.versionId===parentVersionId));
assert.equal(parent.result.body,originalMd.toString('utf8'));assert.equal(parent.review.status,'approved');
const beforeRun=structuredClone(run());
const command=extra=>({workspaceId,taskId,expectedRevision:record().revision,...extra});
const steps=[];
async function call(endpoint,payload,expect=true){const r=await rpc('workflow/v340/'+endpoint,payload);steps.push({endpoint,ok:r.ok,error:r.error?.code});assert.equal(r.ok,expect,JSON.stringify(r));return r.value??r.error;}
await fs.writeFile(join(workspace,parent.result.fileName),originalMd,{flag:'wx'});
const proposal=await fs.readFile(join(folder,'../2026-11-06-m06-revision-release-prep-r1/m06-revision-proposal.md'),'utf8');
const core=proposal.slice(proposal.indexOf('## 一 '),proposal.indexOf('## 五 ')).replaceAll('本建议稿','本人工修订稿')+
 '\n## 保留事项\n\n仅保留源已明确的延伸属性，权2的实质进一步限定及回退价值待论证。原12项警示保留，锁止实现、支持和专业/用户接受仍开放；本次只更新指定T2/T4行，未完成全表语义认证。\n';
await fs.writeFile(join(folder,'m06-revision-core-'+suffix+'.md'),core,{flag:'wx'});
const selectedSources=sourceMap.rows.map(r=>({inputId:r.source_input_id,sourceSha256:r.source_original.sha256,quote:r.quote,start:r.quote_utf16_start,end:r.quote_utf16_end}));
const rows=parent.result.snapshot.tables;
const replacement=(table,rowId,fields,sources)=>{const before=rows[table].rows.find(r=>r.row_id===rowId);assert.ok(before);return{table,rowId,beforeSha256:sha(JSON.stringify(before)),data:{...before.data,...fields},sources};};
const structure={schemaVersion:1,reason:'MC01回退待论证；MC02回填原有延伸属性并对照T2/T4；MC03逐项材料出处，非充分支持接受',replacements:[
 replacement('T2','t2-f002',{'本次权项去向':'权1明写沿同一方向延伸；不推导直线、截面、端部或角度'},[selectedSources[1]]),
 replacement('T2','t2-f003',{'本次权项去向':'配合并沿槽移动在权1；位于槽中暂留权2，实质新增限定和回退价值待论证'},[selectedSources[2],selectedSources[4]]),
 replacement('T4','t4-claim1',{'本次正文对应':'权1已明写导向槽沿同一方向延伸，保留F-001—004原关系','来源定位':selectedSources.slice(0,4),'支持结论':'文字出处已定位；锁止具体实现、功能概括及充分支持仍待补，不等于未来说明书已经支持'},selectedSources.slice(0,4)),
 replacement('T4','t4-claim2',{'技术作用':'位置文字暂留；相对权1的实质进一步限定及回退价值待论证','概括层级':'位置表达，实质收窄未证','支持结论':'drawings_file文字出处已定位；未核真实图像，支持充分性及范围影响待论证','来源定位':[selectedSources[4]]},[selectedSources[4]])]};
await save('structured-edit-'+suffix+'.json',structure);
await call('result/draft',command({runId,baseSha256:parent.result.sha256,body:core,format:'core-markdown'}));
await call('result/edit',command({runId,versionId:parentVersionId,baseSha256:parent.result.sha256,draftSha256:sha(core),requestKey:'m06-p3-editorial-'+suffix,m06Structure:structure}));
const next=structuredClone(run().resultVersions.at(-1));assert.equal(next.review.status,'not-reviewed');
const target={runId,versionId:next.versionId,resultSha256:next.result.sha256};
const unreviewed=await call('result/prepare-save',command(target),false);assert.equal(unreviewed.code,'V340_REVIEW_REQUIRED');
assert.deepEqual(run().resultVersions.find(v=>v.versionId===parentVersionId),parent);
assert.deepEqual(next.result.snapshot.warnings.slice(0,12),parent.result.snapshot.warnings);assert.equal(parent.result.snapshot.warnings.length,12);
for(const t of ['T1','T3','T5','T6'])assert.deepEqual(next.result.snapshot.tables[t],parent.result.snapshot.tables[t]);
assert.deepEqual(run().inputSnapshot,beforeRun.inputSnapshot);assert.equal(run().inputSha256,beforeRun.inputSha256);
await call('result/review',command({...target,confirmed:true}));
const plan=await call('result/prepare-save',command(target));await call('result/commit-save',{confirmationToken:plan.confirmationToken});
const fixed=await call('result/conversation-draft',command(target));assert.ok(fixed.text.includes(next.result.body));
const current=run().resultVersions.find(v=>v.versionId===next.versionId),wb=current.writebacks.at(-1);
const saved=await call('result/saved-file',command({...target,writebackId:wb.writebackId}));assert.equal(saved.matchesReviewed,true);
const body=await fs.readFile(saved.absolutePath);assert.equal(sha(body),next.result.sha256);
assert.equal(inspectV340Document({filename:next.result.fileName,body:body.toString('utf8'),sha256:next.result.sha256},'Flow-2-6').status,'accepted');
assert.equal(sha(await fs.readFile(join(workspace,parent.result.fileName))),parent.result.sha256);
const beforeReopen=record();await service.closeV340Runtime();await repository.close();repository=await openOasisWorkbenchRepository(storageDomain);
assert.deepEqual(record(),beforeReopen);await repository.close();
assert.equal(sha(await fs.readFile(sourceRecord)),sha(originalBytes));assert.equal(sha(await fs.readFile(sourceMap.parent.path)),sourceMap.parent.sha256);
assert.equal(generationCalls,0);assert.equal(networkAttempts,0);
const result={scope:'PUBLIC_SERVICE_RPC_ON_COPIED_PUBLIC_SAMPLE_RECORD_NOT_APP_RUNTIME',entry,scratch,workspace,
 sourceRecord:{path:sourceRecord,sha256:sha(originalBytes)},parent:{versionId:parentVersionId,sha256:parent.result.sha256,reviewPreserved:true},
 revision:{versionId:next.versionId,sha256:next.result.sha256,fileName:next.result.fileName,savedFile:saved.absolutePath,writeback:wb,
 engineeringReview:'approved exact hash; not professional/user acceptance',inheritedWarningCount:12,totalWarnings:next.result.snapshot.warnings.length,changedRows:4},
 steps,sourceInputSnapshotPreserved:true,otherTablesPreserved:true,parentFilePreserved:true,reopenExact:true,
 generationCalls,networkAttempts,applicationStarted:false,conversationSent:false,professionalAcceptance:'PENDING',userAcceptance:'PENDING'};
await save('public-revision-'+suffix+'-result.json',result);console.log(JSON.stringify({scope:result.scope,versionId:next.versionId,sha256:next.result.sha256,steps:steps.length,warnings:result.revision.totalWarnings,generationCalls,networkAttempts}));
