const assert=require('node:assert/strict')
const {spawn}=require('node:child_process')
const {createHash,randomUUID,randomBytes}=require('node:crypto')
const {once}=require('node:events')
const {readFileSync,writeFileSync,existsSync,appendFileSync}=require('node:fs')
const {resolve,join}=require('node:path')
const {pathToFileURL}=require('node:url')
const [scope,phase]=process.argv.slice(2),root=resolve(scope),data=join(root,'dsh-home'),profile=join(data,'profiles/desktop')
assert(['draft','edit-save','recover'].includes(phase))
const app='/Users/tinadong7036/Applications/DSH NEXT.app',archive=join(app,'Contents/Resources/app.asar')
const sha=v=>createHash('sha256').update(v).digest('hex'),read=p=>JSON.parse(readFileSync(p,'utf8'))
const write=(name,v)=>writeFileSync(join(root,name),JSON.stringify(v,null,2)+'\n',{flag:'wx',mode:0o600})
const binding=read(join(root,'binding.json')),out=phase+'-return.json'
assert(!existsSync(join(root,out)));if(existsSync(join(data,'.credentials.yaml')))assert(!readFileSync(join(data,'.credentials.yaml'),'utf8').includes('DEEPSEEK_API_KEY'),'model key must remain absent')
const nativeToken=randomBytes(32).toString('base64url'),headers={'x-dsh-desktop-renderer':nativeToken}
const safe=v=>String(v).replaceAll(nativeToken,'[redacted]').replace(/([?&]token=)[^\s"]+/g,'$1[redacted]')
const child=spawn(join(app,'Contents/MacOS/DSH NEXT'),['--require',join(__dirname,'no-outbound.cjs'),'--expose-internals',join(archive,'lib/host.js'),archive,profile,join(app,'Contents/Resources/runtime',process.arch,'primary-runtime')],{cwd:profile,env:{...process.env,ELECTRON_RUN_AS_NODE:'1',DSH_HOME:data,DSH_NEXT_NATIVE_TOKEN:nativeToken,DSH_TELEMETRY_DISABLED:'1',OASIS_NEXT_TEXT_TEST:'1',OASIS_NO_COST_ROOT:root,OASIS_NO_COST_PHASE:phase},stdio:['ignore','pipe','pipe','ipc']})
child.stdout.on('data',x=>process.stdout.write(safe(x)));child.stderr.on('data',x=>process.stderr.write(safe(x)))
const exited=once(child,'exit'),deadline=setTimeout(()=>child.kill('SIGTERM'),90000)
async function main(){
 try{
  const ready=await new Promise((ok,bad)=>{child.on('message',m=>{if(m.type==='ready')ok(m)});child.once('error',bad);child.once('exit',code=>bad(Error('Host not ready '+code)))})
  const url=new URL(ready.url);assert.equal(url.hostname,'127.0.0.1')
  const login=await fetch(url,{redirect:'manual',headers});assert.equal(login.status,303);const cookie=login.headers.get('set-cookie').split(';')[0];await login.body?.cancel()
  const prefix='oasis-workbench/workflow/v340/'
  const allowed=new Set(['oasis-workbench/state/get',...['result/draft','result/edit','result/review','result/prepare-save','result/commit-save','result/preview-file','result/saved-file'].map(x=>prefix+x)])
  async function rpc(method,payload){
   assert(allowed.has(method),'recovery forbids task creation, generation and unrelated operations')
   const rpcId=randomUUID();appendFileSync(join(root,'rpc-audit.jsonl'),JSON.stringify({phase,method,payloadSha256:sha(JSON.stringify(payload))})+'\n',{mode:0o600})
   const reply=await fetch(url.origin+'/api/'+method,{method:'POST',headers:{...headers,cookie,origin:url.origin,'content-type':'application/json'},body:JSON.stringify({type:'client-request',rpcId,method,payload}),signal:AbortSignal.timeout(12000)})
   assert.equal(reply.status,200);const x=await reply.json();assert.equal(x.rpcId,rpcId)
   if(!x.result.ok){const err=Error(x.result.error.code);err.code=x.result.error.code;throw err}return x.result.value
  }
  const state=()=>rpc('oasis-workbench/state/get',{workspaceId:binding.workspaceId})
  const command=async x=>({workspaceId:binding.workspaceId,taskId:binding.taskId,expectedRevision:(await state()).revision,runId:binding.runId,...x})
  const getRun=s=>s.tasks[binding.taskId].v340.runs[binding.runId]
  let initial=await state(),run=getRun(initial);assert.equal(run.status,'completed');assert.equal(run.requestKey,binding.requestKey);assert.equal(run.result.sha256,binding.resultSha256);assert.equal(sha(run.result.body),binding.resultSha256)
  assert.equal(run.nativeCandidate.version,'v340-native-candidate-9');assert.equal(initial.tasks[binding.taskId].v340.runOrder.length,1)
  const sourceVersion=run.resultVersions.find(x=>x.versionId===binding.sourceVersionId);assert(sourceVersion);assert.equal(sourceVersion.result.sha256,binding.sourceResultSha256);assert.equal(sourceVersion.review.status,'approved')
  const original=structuredClone(sourceVersion.result),originalSnapshot=JSON.stringify(original.snapshot),initialRunResult=structuredClone(run.result)
  const patch=read(join(__dirname,'m02-structure.json')),audit=read(join(__dirname,'../../docs/evidence/2026-11-27-m02-content-review-r4/content-rereview.json'))
  assert.equal(sha(readFileSync(join(__dirname,'m02-structure.json'))),audit.patchFileSha256)
  const pending=async(body)=>rpc(prefix+'result/draft',await command({baseSha256:original.sha256,body,format:'core-markdown'}))
  const reject=async(method,payload,code)=>{try{await rpc(prefix+method,payload)}catch(e){if(code)assert.equal(e.code,code);return e.code}throw Error('Expected operation rejected')}
  if(phase==='draft'){
   const corrected=readFileSync(join(__dirname,'reviewed-core.md'),'utf8')
   assert.equal(sha(corrected),audit.coreSha256);assert.match(corrected,/Host 原始生成凭证 v340-native-candidate-9/)
   assert.match(corrected,/S2-A/);assert.match(corrected,/S2-B/)
   writeFileSync(join(root,'corrected-core.md'),corrected,{flag:'wx',mode:0o600})
   await pending(corrected)
   const after=getRun(await state());assert.equal(after.coreResultDrafts[binding.sourceVersionId].body,corrected);assert.equal(JSON.stringify(after.resultVersions.find(x=>x.versionId===binding.sourceVersionId).result.snapshot),originalSnapshot)
   write(out,{phase,runId:binding.runId,requestKey:binding.requestKey,sourceSha256:original.sha256,coreDraftSha256:sha(corrected),originalUnchanged:true,runCount:1,newModelPosts:0})
  }else if(phase==='edit-save'){
   const prior=read(join(root,'draft-return.json')),core=readFileSync(join(root,'corrected-core.md'),'utf8')
   assert.equal(sha(run.coreResultDrafts[binding.sourceVersionId].body),prior.coreDraftSha256);assert.equal(run.coreResultDrafts[binding.sourceVersionId].body,core)
   assert.equal(sha(core),audit.coreSha256)
   const editRequestKey='m02-content-r4-'+randomUUID();write('edit-intent.json',{editRequestKey,runId:binding.runId,baseSha256:original.sha256,draftSha256:sha(core)})
   const staleEdit=await reject('result/edit',await command({versionId:binding.sourceVersionId,baseSha256:original.sha256,draftSha256:'0'.repeat(64),requestKey:editRequestKey+'-stale'}),'V340_EDIT_STALE')
   await rpc(prefix+'result/edit',await command({versionId:binding.sourceVersionId,baseSha256:original.sha256,draftSha256:sha(core),requestKey:editRequestKey,m02Structure:patch}))
   run=getRun(await state());const version=run.resultVersions.at(-1),target={versionId:version.versionId,resultSha256:version.result.sha256}
   assert.equal(version.parentVersionId,binding.sourceVersionId);assert.equal(version.review.status,'not-reviewed');assert.equal(run.result.sha256,initialRunResult.sha256)
   assert.equal(version.result.snapshot.current_result.core_result_markdown,core)
   for(const name of ['model_completions','terms_master','input_history'])assert.deepEqual(version.result.snapshot[name],original.snapshot[name])
   for(const row of patch.replacements)assert.deepEqual(version.result.snapshot.tables[row.table].rows.find(x=>x.row_id===row.rowId).data,row.data)
   assert.equal(version.result.snapshot.revisions.length-original.snapshot.revisions.length,10)
   const unreviewedSave=await reject('result/prepare-save',await command(target),'V340_REVIEW_REQUIRED')
   const wrongHashReview=await reject('result/review',await command({...target,resultSha256:original.sha256,confirmed:true}),'V340_RESULT_STALE')
   await rpc(prefix+'result/review',await command({...target,confirmed:true}))
   const plan=await rpc(prefix+'result/prepare-save',await command(target)),file=plan.manifest.files.find(x=>x.mediaType==='text/markdown')
   assert.equal(plan.manifest.relativeDirectory,'.');assert(!file.relativePath.endsWith('_OIW.md'))
   const workspace=JSON.parse(readFileSync(join(__dirname,'../dsh-m02-pair-r2-20261127/live/batch.json'))).cases[0].workspace
   const targetPath=join(workspace,file.relativePath);assert(!existsSync(targetPath),'new revision save must not overwrite')
   await rpc(prefix+'result/commit-save',{confirmationToken:plan.confirmationToken})
   run=getRun(await state());const saved=run.resultVersions.find(x=>x.versionId===target.versionId),receipt=saved.writebacks[0]
   const preview=await rpc(prefix+'result/preview-file',await command({...target,writebackId:receipt.writebackId}))
   assert(preview.matchesReviewed);assert.equal(preview.text,version.result.body);assert.equal(sha(readFileSync(targetPath)),target.resultSha256)
   const resolved=await rpc(prefix+'result/saved-file',await command({...target,writebackId:receipt.writebackId}));assert.equal(resolved.absolutePath,targetPath)
   const consumedToken=await reject('result/commit-save',{confirmationToken:plan.confirmationToken})
   write(out,{phase,runId:binding.runId,requestKey:binding.requestKey,sourceSha256:original.sha256,versionId:version.versionId,parentVersionId:version.parentVersionId,resultSha256:target.resultSha256,coreSha256:sha(core),coreCharacters:Array.from(core).length,review:saved.review,writebackId:receipt.writebackId,savedPath:targetPath,files:receipt.files,reviewedAndSaved:true,draftRecovered:true,originalUnchanged:run.result.sha256===initialRunResult.sha256,sourceSnapshotUnchanged:JSON.stringify(run.resultVersions.find(x=>x.versionId===binding.sourceVersionId).result.snapshot)===originalSnapshot,sourceVersionId:binding.sourceVersionId,sourceReviewPreserved:true,revisedRows:10,contentAuditVerdict:audit.rereviewVerdict,sourceFactsAndHistoryRetained:true,rejections:{staleEdit,unreviewedSave,wrongHashReview,consumedToken},newModelPosts:0})
  }else{
   const prior=read(join(root,'edit-save-return.json')),version=run.resultVersions.find(x=>x.versionId===prior.versionId)
   assert.equal(run.activeVersionId,version.versionId);assert.equal(version.review.status,'approved');assert.equal(version.review.sha256,prior.resultSha256);assert.equal(version.result.sha256,prior.resultSha256)
   assert(!run.coreResultDrafts?.[binding.sourceVersionId]);assert.equal(version.writebacks.length,1)
   const target={versionId:version.versionId,resultSha256:version.result.sha256,writebackId:prior.writebackId}
   const preview=await rpc(prefix+'result/preview-file',await command(target));assert(preview.matchesReviewed);assert.equal(preview.text,version.result.body);assert.equal(sha(readFileSync(prior.savedPath)),prior.resultSha256)
   assert.equal(sha(run.result.body),initialRunResult.sha256);assert.equal(JSON.stringify(run.resultVersions.find(x=>x.versionId===binding.sourceVersionId).result.snapshot),originalSnapshot)
   for(const row of patch.replacements)assert.deepEqual(version.result.snapshot.tables[row.table].rows.find(x=>x.row_id===row.rowId).data,row.data)
   write(out,{phase,runId:binding.runId,versionId:version.versionId,resultSha256:prior.resultSha256,recovered:true,activeVersionRecovered:true,reviewRecovered:true,writebackRecovered:true,previewMatches:true,originalUnchanged:true,runCount:1,newModelPosts:0})
  }
  console.log('No-cost M02',phase,'passed')
 }finally{if(child.connected)child.send({type:'shutdown'});const [code]=await exited;clearTimeout(deadline);assert.equal(code,0)}
}
main().catch(e=>{console.error(safe(e.stack??e));process.exitCode=1})
