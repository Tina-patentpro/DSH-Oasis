import { canonicalJson } from './local-mock-runner.js'
import { getV340Catalog, getV340Node, v340Hash } from './v340-catalog.js'
import { prepareV340Inputs, inspectV340Document } from './v340-document.js'
import {getV340Versions} from './v340-runtime-contract.js'
import {restoreV340Prepared} from './v340-input-snapshot.js'
import {assertV340NativeCandidate} from './v340-native-model.js'

export const v340InputHash=snapshot=>v340Hash(canonicalJson(snapshot))
export function validateV340Draft(nodeId,draft){
  const node=getV340Node(nodeId)
  for(const [entries,accepts]of [[draft.textInputs,f=>!f.id.endsWith('_file')&&f.channel!=='配置'],[draft.filePaths,f=>f.id.endsWith('_file')],[draft.configuration,f=>f.channel==='配置']])
    for(const id of Object.keys(entries)){const field=node.inputs.find(f=>f.id===id);if(!field||!accepts(field))throw Error('V340 draft channel mismatch')}
  // Validate configuration/text semantically without reading draft file paths.
  prepareV340Inputs(nodeId,{...draft.textInputs,...draft.configuration})
}
export function assertV340Integrity(record){
  for(const task of Object.values(record.tasks)){
    const state=task.v340;if(!state)continue
    validateV340Draft(state.nodeId,state.draft)
    for(const run of Object.values(state.runs)){
      const input=run.inputSnapshot
      if(run.evidenceKind==='native-model-candidate')assertV340NativeCandidate(run)
      if(run.workspaceId!==record.workspaceId||run.taskId!==task.taskId||input.workspaceId!==record.workspaceId||input.taskId!==task.taskId
        ||input.runId!==run.runId||run.runId!==`v340-${run.workflowRunUid}`||input.workflowRunUid!==run.workflowRunUid||input.requestKey!==run.requestKey||input.capturedAt!==run.createdAt
        ||input.nodeId!==state.nodeId||input.source!==run.source||input.draft.source!==run.source
        ||input.resourceSHA256!==getV340Catalog().resourceSHA256||v340InputHash(input)!==run.inputSha256)throw Error('V340 input integrity mismatch')
      validateV340Draft(state.nodeId,input.draft)
      if(['prepared','unknown'].includes(run.status)&&canonicalJson(state.draft)!==canonicalJson(input.draft))throw Error('V340 pending input integrity mismatch')
      const prepared=restoreV340Prepared(input)
      if(canonicalJson(prepareV340Inputs(state.nodeId,prepared.values))!==canonicalJson(prepared))throw Error('V340 prepared integrity mismatch')
      for(const [id,value]of Object.entries({...input.draft.textInputs,...input.draft.configuration}))
        if(value!==''&&canonicalJson(prepared.values[id])!==canonicalJson(value))throw Error('V340 draft snapshot integrity mismatch')
      const fileIds=Object.keys(prepared.values).filter(id=>id.endsWith('_file'))
      if(fileIds.length!==Object.keys(input.draft.filePaths).length||fileIds.some(id=>!Object.hasOwn(input.draft.filePaths,id)))throw Error('V340 file snapshot integrity mismatch')
      if(run.result){
        const result=run.result
        const inspected=inspectV340Document({filename:result.fileName,body:result.body,sha256:result.sha256},state.nodeId)
        if(inspected.status!=='accepted'||canonicalJson(inspected.snapshot)!==canonicalJson(result.snapshot)
          ||result.snapshot.workflow_run_uid!==run.workflowRunUid||result.snapshot.input_history.at(-1)?.input_sha256!==prepared.inputHash
          ||Date.parse(result.snapshot.generated_at)!==Math.floor(Date.parse(run.createdAt)/1000)*1000)throw Error('V340 result integrity mismatch')
      }
      for(const version of run.resultVersions??[]){
        const result=version.result,inspected=inspectV340Document({filename:result.fileName,body:result.body,sha256:result.sha256},state.nodeId)
        if(inspected.status!=='accepted'||canonicalJson(inspected.snapshot)!==canonicalJson(result.snapshot))throw Error('V340 version integrity mismatch')
        if(version.parentVersionId!==null){
          const parent=getV340Versions(run).find(v=>v.versionId===version.parentVersionId),edit=result.snapshot.manual_edit_manifest.at(-1)
          if(!parent||edit?.source_file_sha256!==parent.result.sha256||edit.after_sha256!==v340Hash(result.snapshot.current_result.core_result_markdown)
            ||version.versionId!==`revision-${result.snapshot.workflow_run_uid}`)throw Error('V340 edit provenance mismatch')
        }
        for(const saved of version.writebacks){
          if(saved.artifactId!==`sha256:${result.sha256}`||saved.files.find(f=>f.mediaType==='text/markdown')?.sha256!==result.sha256)throw Error('V340 saved version mismatch')
        }
      }
    }
  }
  return record
}
