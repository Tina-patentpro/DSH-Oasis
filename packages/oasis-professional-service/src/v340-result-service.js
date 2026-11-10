import {randomUUID} from 'node:crypto'
import {v340Commands,getV340Versions,getV340ResultDrafts,V340_LIMITS,V340_CONVERSATION_TEXT_LIMIT,formatV340ConversationDraft} from './v340-runtime-contract.js'
import {reviseV340Document,m06StructuredEditHash} from './v340-document.js'
import {restoreV340Prepared} from './v340-input-snapshot.js'
import {v340Hash} from './v340-catalog.js'
import {hasPendingUnifiedRun} from './generation-contract.js'
import {isOasisRemoteExecutionUnresolved} from './workbench-contract.js'
import {WorkspaceMaterialError} from './workspace-materials.js'

const fail=(code,message,details={})=>{throw new WorkspaceMaterialError(code,message,details)}
const busy=record=>Object.values(record.tasks).some(t=>hasPendingUnifiedRun(t)||Object.values(t.remoteExecutions).some(isOasisRemoteExecutionUnresolved))
function selected(record,input){
 const run=record.tasks[input.taskId]?.v340?.runs[input.runId]
 if(!run||run.status!=='completed'||!run.result)fail('V340_RESULT_UNAVAILABLE','所选结果不可用。')
 const versions=getV340Versions(run),version=versions.find(v=>v.versionId===input.versionId)
 if(!version||version.result.sha256!==(input.resultSha256??input.baseSha256))fail('V340_RESULT_STALE','结果版本或哈希已变化。')
 return{run,versions,version}
}
function allow(record,run,versionId){if(busy(record)||getV340ResultDrafts(run)[versionId])fail('V340_RESULT_LOCKED','有未决运行或未保存结果编辑，请先处理原记录。')}
export function createV340ResultService({repository,writebackManager,materialManager,clock=()=>new Date().toISOString(),uuidFactory=randomUUID}){
 const parse=(name,input)=>{const p=v340Commands[name].safeParse(input);if(!p.success)fail('V340_INVALID_INPUT','结果操作输入无效。');return p.data}
 const manager=()=>{if(!writebackManager)fail('V340_SAVE_UNAVAILABLE','当前项目保存不可用。');return writebackManager}
 return{
  async editV340Result(input){
   const c=parse('result/edit',input)
   return repository.mutate(c.workspaceId,c.expectedRevision,record=>{
    const {run,versions,version}=selected(record,c)
    const draft=getV340ResultDrafts(run)[c.versionId]
    const prior=versions.find(v=>v.editRequestKey===c.requestKey)
    if(prior){const manifest=prior.result.snapshot.manual_edit_manifest.at(-1);if(prior.parentVersionId!==c.versionId||manifest?.after_sha256!==c.draftSha256
      ||(manifest?.structured_edit_sha256??'none')!==m06StructuredEditHash(c.m06Structure))fail('V340_EDIT_CONFLICT','修订请求已绑定其他内容。');return record}
    if(draft&&draft.format!=='core-markdown')fail('V340_DRAFT_FORMAT_REQUIRED','旧草稿格式未确认，请先复制保留，并明确另起核心正文编辑。')
    if(busy(record)||versions.length>=8||!draft||draft.baseSha256!==c.baseSha256||v340Hash(draft.body)!==c.draftSha256)fail('V340_EDIT_STALE','编辑草稿已变化或版本已达上限；原草稿保留。')
    const uid=uuidFactory(),versionId=`revision-${uid}`,now=clock()
    if(versions.some(v=>v.versionId===versionId))fail('V340_EDIT_CONFLICT','版本标识冲突。')
    const result=reviseV340Document(version.result,{workflowRunUid:uid,generatedAt:now,body:draft.body,m06Structure:c.m06Structure,
      ...(c.m06Structure===undefined?{}:{prepared:restoreV340Prepared(run.inputSnapshot)})})
    const next=structuredClone(record),target=next.tasks[c.taskId].v340.runs[c.runId]
    target.resultVersions=[...structuredClone(versions),{versionId,parentVersionId:c.versionId,editRequestKey:c.requestKey,result,createdAt:now,
      review:{status:'not-reviewed',sha256:result.sha256,updatedAt:now},writebacks:[]}]
    target.activeVersionId=versionId
    if(target.coreResultDrafts)delete target.coreResultDrafts[c.versionId]
    return next
   })
  },
  async reviewV340Result(input){
   const c=parse('result/review',input)
   return repository.mutate(c.workspaceId,c.expectedRevision,record=>{
    const {run,versions,version}=selected(record,c);allow(record,run,c.versionId)
    if(version.review.status==='approved')return record
    const next=structuredClone(record),target=next.tasks[c.taskId].v340.runs[c.runId]
    target.resultVersions=structuredClone(versions);target.resultVersions.find(v=>v.versionId===c.versionId).review={status:'approved',sha256:c.resultSha256,updatedAt:clock()}
    return next
   })
  },
  async prepareV340Save(input){
   const c=parse('result/prepare-save',input),record=repository.get(c.workspaceId)
   if(record.revision!==c.expectedRevision)fail('REVISION_CONFLICT','请刷新当前版本后重新确认。')
   const {run,version}=selected(record,c);allow(record,run,c.versionId)
   if(version.review.status!=='approved')fail('V340_REVIEW_REQUIRED','请选择已明确审核的固定版本。')
   const result=version.result
   return manager().prepare({workspaceId:c.workspaceId,taskId:c.taskId,runId:c.runId,expectedRevision:c.expectedRevision,
    inputSha256:run.inputSha256,workflowId:run.nodeId,workflowVersion:'V3.4.0',mode:'v340',reviewStatus:'approved',relativeDirectory:'.',
    artifact:{body:result.body,sha256:result.sha256,artifactId:`sha256:${result.sha256}`,mediaType:'text/markdown',suggestedFileName:result.fileName},
    outputFileName:run.source==='oasis-api'?result.fileName.replace(/\.md$/,'_OIW.md'):result.fileName,
    v340:{nodeId:run.nodeId,source:run.source,evidenceKind:run.evidenceKind,versionId:c.versionId,sourceRunUid:run.workflowRunUid}})
  },
  async prepareV340ConversationDraft(input){
   const c=parse('result/conversation-draft',input),record=repository.get(c.workspaceId)
   if(record.revision!==c.expectedRevision)fail('REVISION_CONFLICT','请刷新当前版本后重新准备资料。')
   const {run,version}=selected(record,c);allow(record,run,c.versionId)
   if(version.review.status!=='approved')fail('V340_REVIEW_REQUIRED','请选择已明确审核的固定版本。')
   const text=formatV340ConversationDraft(c,version.result.body)
   if(text.length>V340_CONVERSATION_TEXT_LIMIT)fail('V340_REFERENCE_TOO_LARGE','固定版本全文超过对话草稿上限；请复制完整正文或导出Markdown并打开。未插入或截断正文。')
   return{...c,artifactId:`sha256:${c.resultSha256}`,text}
  },
  async resolveV340SavedFile(input){
   const c=parse('result/saved-file',input),record=repository.get(c.workspaceId)
   if(record.revision!==c.expectedRevision)fail('REVISION_CONFLICT','请刷新当前版本后重新打开。')
   const {run,version}=selected(record,c);allow(record,run,c.versionId)
   if(version.review.status!=='approved')fail('V340_REVIEW_REQUIRED','请选择已明确审核的固定版本。')
   const saved=version.writebacks.find(w=>w.writebackId===c.writebackId),file=saved?.files.find(f=>f.mediaType==='text/markdown')
   if(!file||saved.artifactId!==`sha256:${c.resultSha256}`||file.sha256!==c.resultSha256)fail('WRITEBACK_NOT_FOUND','未找到当前固定版本的保存回执。')
   if(!materialManager)fail('V340_SAVE_UNAVAILABLE','安全文件读取不可用。')
   const absolutePath=await manager().resolveSavedFile(c.workspaceId,file.relativePath)
   const current=await materialManager.inspect(c.workspaceId,file.relativePath,{acceptedExtensions:['.md'],maxFileBytes:V340_LIMITS.documentBytes,contentReadMode:'metadata-only'},absolutePath)
   if(await manager().resolveSavedFile(c.workspaceId,file.relativePath)!==absolutePath)fail('V340_SAVE_STALE','项目根目录已变化，请重新打开当前项目文件。')
   if(repository.get(c.workspaceId).revision!==c.expectedRevision)fail('REVISION_CONFLICT','任务已变化，请重新打开。')
   return{...c,artifactId:saved.artifactId,absolutePath,kind:'current-file',currentSha256:current.sha256,matchesReviewed:current.sha256===c.resultSha256}
  },
  async commitV340Save(input){
   const c=parse('result/commit-save',input),m=manager(),plan=m.consume(c.confirmationToken)
   const info=plan.metadata.execution
   if(info?.mode!=='v340')fail('V340_SAVE_STALE','保存确认不属于新版结果。')
   let published
   try{return await repository.mutate(plan.workspaceId,plan.expectedRevision,async record=>{
    const target={taskId:plan.taskId,runId:plan.runId,versionId:info.versionId,resultSha256:plan.artifactId.replace('sha256:','')}
    const {run,versions,version}=selected(record,target);allow(record,run,info.versionId)
    if(version.review.status!=='approved'||version.writebacks.length>=16)fail('V340_SAVE_STALE','审核或保存状态已变化。')
    published=await m.publish(plan)
    const next=structuredClone(record),saved=next.tasks[plan.taskId].v340.runs[plan.runId]
    saved.resultVersions=structuredClone(versions);saved.resultVersions.find(v=>v.versionId===info.versionId).writebacks.push(published)
    return next
   })}catch(error){
    if(!published)throw error
    fail('WRITEBACK_COMMITTED_INDEX_FAILED','文件已发布，但保存回执尚未写入；请保留恢复清单，不要覆盖或重试。',{
     manifest:{schemaVersion:1,workspaceId:plan.workspaceId,taskId:plan.taskId,runId:plan.runId,artifactId:plan.artifactId,relativeDirectory:'.',files:published.files}})
   }
  },
 }
}
