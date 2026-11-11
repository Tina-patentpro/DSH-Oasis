import { randomUUID } from 'node:crypto'
import { v340Commands,getV340Versions,m06CandidateCapabilitySchema,v340CandidatePreviewSchema } from './v340-runtime-contract.js'
import { v340InputHash, validateV340Draft } from './v340-runtime-integrity.js'
import { getV340Node, getV340Catalog } from './v340-catalog.js'
import { assembleV340Document } from './v340-document.js'
import { hasPendingUnifiedRun } from './generation-contract.js'
import { isOasisRemoteExecutionUnresolved } from './workbench-contract.js'
import { canonicalJson } from './local-mock-runner.js'
import { WorkspaceMaterialError } from './workspace-materials.js'
import { createWorkspaceOperationGuard } from './workspace-operation-guard.js'
import { captureV340InputSnapshot,restoreV340Prepared } from './v340-input-snapshot.js'
import { normalizeLocalExecutionSummary } from './local-run-summary.js'

const fail=(code,message)=>{throw new WorkspaceMaterialError(code,message)}
const parse=(name,input)=>{const result=v340Commands[name].safeParse(input);if(!result.success)fail('V340_INVALID_INPUT','新版任务输入无效。');return result.data}
const busy=record=>Object.values(record.tasks).some(task=>hasPendingUnifiedRun(task)||Object.values(task.remoteExecutions).some(isOasisRemoteExecutionUnresolved))

// V3.4.0 lifecycle only. Production has no executor; synthetic injection never enables real sources.
export function createV340RuntimeService({repository,preparation,executor,clock=()=>new Date().toISOString(),uuidFactory=randomUUID,workspaceOperations=createWorkspaceOperationGuard()}){
  let closing=false
  const active=new Map(),admissions=new Set(),key=(workspaceId,runId)=>JSON.stringify([workspaceId,runId])
  // A durable prepared record may become visible before its creator resumes.
  const isOwned=(workspaceId,runId)=>active.has(key(workspaceId,runId))||[...admissions].some(work=>work.workspaceId===workspaceId)
  const candidate=executor?.evidenceKind==='native-model-candidate'&&executor?.dispatchEnabled===false&&typeof executor.prepareAdmission==='function'
  const enabled=()=>!closing&&(executor?.evidenceKind==='synthetic'||candidate)&&typeof executor.generate==='function'
  const taskFor=(record,id)=>{const task=record.tasks[id];if(!Object.hasOwn(record.tasks,id)||!task?.v340)fail('V340_TASK_NOT_FOUND','未找到当前项目的新版任务。');return task}
  const runFor=(record,taskId,runId)=>{const run=taskFor(record,taskId).v340.runs[runId];if(!run||!Object.hasOwn(taskFor(record,taskId).v340.runs,runId))fail('V340_RUN_NOT_FOUND','未找到当前任务的新版运行。');return run}
  async function settle(workspaceId,taskId,runId,change,onlyIfUnowned=false){
    for(let n=0;n<3;n++){
      const current=repository.get(workspaceId)
      const result=await repository.mutate(workspaceId,current.revision,record=>{
        const run=runFor(record,taskId,runId)
        if(run.status!=='prepared'||onlyIfUnowned&&isOwned(workspaceId,runId))return record
        const next=structuredClone(record)
        Object.assign(next.tasks[taskId].v340.runs[runId],change,{completedAt:clock()})
        next.tasks[taskId].updatedAt=clock();return next
      })
      if(result.committed)return result
    }
    fail('V340_PUBLICATION_CONFLICT','新版运行状态尚未写入；请观察原运行，不会重新派发。')
  }
  return Object.freeze({
    async prepareV340CandidateConfirmation(input){
      const {workspaceId,taskId,expectedRevision,sessionId}=parse('candidate/prepare',input)
      if(!enabled()||!candidate||!m06CandidateCapabilitySchema.safeParse(executor.m06Candidate).success
        ||typeof executor.prepareConfirmation!=='function')fail('V340_EXECUTION_DISABLED','当前Host没有受控M06候选入口。')
      return workspaceOperations.run(workspaceId,async()=>{
        const current=repository.get(workspaceId),task=taskFor(current,taskId)
        if(current.revision!==expectedRevision)fail('REVISION_CONFLICT','任务已变化，请重新核对材料。')
        if(task.v340.nodeId!=='Flow-2-6'||task.v340.draft.source!=='local-skill')fail('V340_EXECUTION_DISABLED','仅当前本地M06候选可核对。')
        if(busy(current))fail('WORKSPACE_GENERATION_ACTIVE','当前项目有未决运行，请观察原运行。')
        const draft=task.v340.draft
        const {prepared}=await preparation.prepareV340({workspaceId,nodeId:'Flow-2-6',confirmed:true,
          textInputs:draft.textInputs,filePaths:draft.filePaths,configuration:draft.configuration})
        const preview=await executor.prepareConfirmation({workspaceId,taskId,sessionId,expectedRevision,prepared})
        if(repository.get(workspaceId).revision!==expectedRevision)fail('REVISION_CONFLICT','任务已变化，请重新核对材料。')
        return v340CandidatePreviewSchema.parse({...preview,workspaceId,taskId,sessionId,expectedRevision})
      })
    },
    async createV340Task(input){
      const {workspaceId,taskId,expectedRevision,nodeId,title}=parse('task/create',input)
      return repository.mutate(workspaceId,expectedRevision,record=>{
        if(Object.hasOwn(record.tasks,taskId))fail('V340_TASK_EXISTS','任务标识已存在，不能改写旧任务。')
        getV340Node(nodeId)
        const next=structuredClone(record),now=clock()
        next.tasks[taskId]={taskId,title,workType:'cn-invention-patent',workflowId:nodeId,workflowVersion:'V3.4.0',
          formValues:{},professionalDraft:null,generation:null,inputRefs:[],activeRunId:null,runOrder:[],runs:{},remoteExecutionOrder:[],remoteExecutions:{},createdAt:now,updatedAt:now,
          v340:{schemaVersion:1,businessVersion:'V3.4.0',nodeId,draft:{source:'local-skill',textInputs:{},filePaths:{},configuration:{}},activeRunId:null,runOrder:[],runs:{}}}
        next.taskOrder.push(taskId);return next
      })
    },
    async updateV340Draft(input){
      const {workspaceId,taskId,expectedRevision,draft}=parse('task/draft',input)
      return repository.mutate(workspaceId,expectedRevision,record=>{
        const task=taskFor(record,taskId)
        if(hasPendingUnifiedRun(task))fail('V340_RUN_UNRESOLVED','当前任务有未决运行，输入及来源保持锁定。')
        try{validateV340Draft(task.v340.nodeId,draft)}catch{fail('V340_INVALID_INPUT','新版输入通道或配置无效。')}
        const next=structuredClone(record);next.tasks[taskId].v340.draft=draft;next.tasks[taskId].updatedAt=clock();return next
      })
    },
    async createV340Run(input){
      const {workspaceId,taskId,expectedRevision,requestKey,candidate:confirmation}=parse('run/create',input)
      if(!enabled())fail('V340_EXECUTION_DISABLED','新版真实执行未启用；本批仅提供持久化及合成验证。')
      let releaseAdmission
      const admission={workspaceId,done:new Promise(resolve=>{releaseAdmission=resolve})}
      admissions.add(admission)
      try{
        let admitted
        const result=await workspaceOperations.run(workspaceId,()=>repository.mutate(workspaceId,expectedRevision,async record=>{
          const task=taskFor(record,taskId),state=task.v340
          if (executor.canExecute && !executor.canExecute(state.nodeId, state.draft.source)) {
            fail('V340_EXECUTION_DISABLED', '当前离线来源仅支持权利要求初稿。')
          }
          if(candidate&&(state.nodeId!==(executor.nodeId??'Flow-2-6')||state.draft.source!=='local-skill')||!candidate&&confirmation)fail('V340_EXECUTION_DISABLED','当前来源或节点不属于本批内部候选。')
          for(const other of Object.values(record.tasks))for(const prior of Object.values(other.v340?.runs??{}))if(prior.requestKey===requestKey){
            if(other.taskId!==taskId||prior.evidenceKind!==(candidate?'native-model-candidate':'synthetic')||canonicalJson(prior.inputSnapshot.draft)!==canonicalJson(state.draft))fail('V340_IDEMPOTENCY_CONFLICT','请求标识已绑定其他任务或输入。')
            return record
          }
          if(busy(record))fail('WORKSPACE_GENERATION_ACTIVE','当前项目有未决生成，请观察原运行。')
          if(state.runOrder.length>=8)fail('V340_RUN_LIMIT','新版运行记录已达上限；不自动删除历史证据。')
          const prepared=await preparation.prepareV340({workspaceId,nodeId:state.nodeId,confirmed:true,textInputs:state.draft.textInputs,filePaths:state.draft.filePaths,configuration:state.draft.configuration})
          const uid=uuidFactory(),runId=`v340-${uid}`,now=clock()
          if(Object.values(record.tasks).some(item=>Object.hasOwn(item.v340?.runs??{},runId)))fail('V340_RUN_ID_COLLISION','运行标识冲突，未派发。')
          const snapshot=captureV340InputSnapshot({workspaceId,taskId,runId,workflowRunUid:uid,requestKey,capturedAt:now,nodeId:state.nodeId,source:state.draft.source,resourceSHA256:getV340Catalog().resourceSHA256,draft:structuredClone(state.draft),prepared:prepared.prepared})
          const nativeCandidate=candidate?await executor.prepareAdmission({inputSnapshot:structuredClone(snapshot),inputSha256:v340InputHash(snapshot),expectedRevision,confirmation}):null
          admitted={schemaVersion:1,runId,workflowRunUid:uid,requestKey,workspaceId,taskId,nodeId:state.nodeId,source:state.draft.source,evidenceKind:candidate?'native-model-candidate':'synthetic',...(nativeCandidate?{nativeCandidate}:{}),inputSchemaVersion:'v340-1',
            inputSnapshot:snapshot,inputSha256:v340InputHash(snapshot),status:'prepared',failureCode:null,result:null,resultDraft:null,reviewStatus:'not-reviewed',createdAt:now,completedAt:null}
          const next=structuredClone(record);next.tasks[taskId].v340.runs[runId]=admitted;next.tasks[taskId].v340.runOrder.push(runId);next.tasks[taskId].v340.activeRunId=runId;next.tasks[taskId].updatedAt=now;return next
        }))
        if(!result.committed||!admitted)return result
        const controller=new AbortController(),owned={controller,promise:null}
        active.set(key(workspaceId,admitted.runId),owned)
        owned.promise=Promise.resolve().then(async()=>{
          let change
          try{
            const prepared=restoreV340Prepared(admitted.inputSnapshot)
            if(closing)controller.abort()
            const stopped=new Promise(resolve=>{
              if(controller.signal.aborted)resolve({status:'unknown',code:'ABORTED'})
              else controller.signal.addEventListener('abort',()=>resolve({status:'unknown',code:'ABORTED'}),{once:true})
            })
            const execution=Promise.resolve().then(()=>{
              // Closing or a durable stop may precede this queued dispatch and owner installation.
              if(closing||controller.signal.aborted||runFor(repository.get(workspaceId),taskId,admitted.runId).status!=='prepared')return {status:'unknown',code:'ABORTED'}
              return executor.generate({runId:admitted.runId,workflowRunUid:admitted.workflowRunUid,workspaceId,taskId,nodeId:admitted.nodeId,
                source:admitted.source,prepared:structuredClone(prepared),signal:controller.signal,...(candidate?{candidateRun:structuredClone(runFor(repository.get(workspaceId),taskId,admitted.runId))}:{})})
            })
            const response=await Promise.race([execution,stopped])
            const executionSummary=normalizeLocalExecutionSummary(response?.executionSummary)
            if(response?.status==='completed'){
              delete executionSummary.failureStage
              try{change={status:'completed',failureCode:null,result:assembleV340Document({nodeId:admitted.nodeId,workflowRunUid:admitted.workflowRunUid,generatedAt:admitted.createdAt,prepared,output:response.output}),executionSummary}}
              catch{change={status:'failed',failureCode:'INVALID_OUTPUT',result:null,executionSummary:{...executionSummary,failureStage:'result-assembly'}}}
            }else change={status:response?.status==='failed'?'failed':'unknown',failureCode:response?.code==='ABORTED'?'ABORTED':response?.code==='INVALID_OUTPUT'?'INVALID_OUTPUT':response?.status==='failed'&&['MODEL_UNAVAILABLE','MODEL_LIMITED'].includes(response?.code)?response.code:response?.status==='failed'?'EXECUTION_FAILED':'EXECUTION_UNCONFIRMED',result:null,executionSummary}
          }catch{change={status:'unknown',failureCode:'EXECUTION_UNCONFIRMED',result:null}}
          await settle(workspaceId,taskId,admitted.runId,change)
        }).catch(()=>{/* Durable prepared remains unresolved after a storage failure; never redispatch. */}).finally(()=>active.delete(key(workspaceId,admitted.runId)))
        return result
      }finally{
        admissions.delete(admission);releaseAdmission()
      }
    },
    async observeV340Run(input){
      const {workspaceId,taskId,runId}=parse('run/observe',input),record=repository.get(workspaceId),run=runFor(record,taskId,runId)
      if(run.status==='prepared'&&!isOwned(workspaceId,runId))return settle(workspaceId,taskId,runId,{status:'unknown',failureCode:'INTERRUPTED',result:null},true)
      return {committed:true,current:record}
    },
    async stopV340Run(input){
      const {workspaceId,taskId,runId,expectedRevision}=parse('run/stop',input)
      const result=await repository.mutate(workspaceId,expectedRevision,record=>{
        const run=runFor(record,taskId,runId);if(run.status!=='prepared')return record
        const next=structuredClone(record);Object.assign(next.tasks[taskId].v340.runs[runId],{status:'unknown',failureCode:'ABORTED',result:null,completedAt:clock()});return next
      })
      if(result.committed)active.get(key(workspaceId,runId))?.controller.abort()
      return result
    },
    async saveV340ResultDraft(input){
      const {workspaceId,taskId,runId,expectedRevision,baseSha256,body,format}=parse('result/draft',input)
      return repository.mutate(workspaceId,expectedRevision,record=>{
        const run=runFor(record,taskId,runId)
        if(run.status!=='completed'||!getV340Versions(run).some(v=>v.result.sha256===baseSha256))fail('V340_RESULT_STALE','结果或编辑基线已变更，未保存草稿。')
        const next=structuredClone(record),target=next.tasks[taskId].v340.runs[runId]
        if(format==='core-markdown'){
          const version=getV340Versions(run).find(v=>v.result.sha256===baseSha256)
          target.coreResultDrafts??={}
          if(body===null)delete target.coreResultDrafts[version.versionId]
          else target.coreResultDrafts[version.versionId]={baseSha256,body,updatedAt:clock(),format}
        }
        else if(!run.resultVersions)target.resultDraft=body===null?null:{baseSha256,body,updatedAt:clock()}
        else{
          const version=getV340Versions(run).find(v=>v.result.sha256===baseSha256)
          target.resultDrafts??={}
          if(body===null)delete target.resultDrafts[version.versionId]
          else target.resultDrafts[version.versionId]={baseSha256,body,updatedAt:clock()}
          if(target.resultDraft?.baseSha256===baseSha256)target.resultDraft=null
        }
        return next
      })
    },
    async closeV340Runtime(){
      closing=true
      for(const work of active.values())work.controller.abort()
      await Promise.all([...admissions].map(work=>work.done))
      // Admission may have installed another owner while close was draining it.
      for(const work of active.values())work.controller.abort()
      await Promise.all([...active.values()].map(work=>work.promise))
    },
  })
}
