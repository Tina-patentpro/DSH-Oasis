// Explicit engineering entry only. It is not selected by Config, RPC or the ordinary Host.
import {lstat,realpath,open} from 'node:fs/promises'
import {constants} from 'node:fs'
import {isAbsolute,resolve,join} from 'node:path'
import {createHash} from 'node:crypto'
import {applyM06ControlledCandidate013} from './index.js'
import {localExecutionSummarySchema} from './local-run-summary.js'
import {parseM06ExecutionDiagnostic} from './m06-execution-diagnostic.js'
export {name,Config,inject} from './m06-controlled-host-013.js'

const runFields=['schemaVersion','runId','workflowRunUid','requestKey','workspaceId','taskId','nodeId','source',
  'evidenceKind','inputSchemaVersion','inputSnapshot','inputSha256','nativeCandidate','status','createdAt']
const responseCodes=['INVALID_INPUT','MODEL_UNAVAILABLE','MODEL_LIMITED','INVALID_OUTPUT','GENERATION_FAILED','ABORTED','TIMED_OUT']
const fail=()=>{throw new Error('M06_CONTROLLED_EVIDENCE_UNAVAILABLE')}
function fields(value,allowed){
  if(!value||Object.getPrototypeOf(value)!==Object.prototype)fail()
  for(const key of Reflect.ownKeys(value))if(!allowed.includes(key)||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value'))fail()
}
export async function createM06EvidenceRecorder(directory){
  if(typeof directory!=='string'||!isAbsolute(directory)||resolve(directory)!==directory)fail()
  const initial=await lstat(directory)
  if(!initial.isDirectory()||initial.isSymbolicLink()||(initial.mode&0o077)!==0||await realpath(directory)!==directory)fail()
  return async event=>{
    const kind=Object.getOwnPropertyDescriptor(event,'kind')?.value
    fields(event,kind==='request'?['kind','run','system','requestText']:kind==='diagnostic'
      ?['kind','runId','requestKeySHA256','diagnostic']:['kind','runId','status','body','code','executionSummary'])
    if(!['request','response','diagnostic'].includes(kind))fail()
    let safeEvent=event
    if(kind==='request'){
      fields(event.run,runFields)
      if(typeof event.system!=='string'||typeof event.requestText!=='string')fail()
    }else if(kind==='diagnostic'){
      try{
        const diagnostic=parseM06ExecutionDiagnostic(event.diagnostic)
        if(diagnostic.runId!==event.runId||typeof event.requestKeySHA256!=='string'||! /^[a-f0-9]{64}$/.test(event.requestKeySHA256))fail()
        safeEvent={kind,runId:event.runId,requestKeySHA256:event.requestKeySHA256,diagnostic}
      }catch{fail()}
    }else{
      if(!['completed','failed','unknown'].includes(event.status)||event.code!==undefined&&!responseCodes.includes(event.code))fail()
      if(event.status==='completed'?typeof event.body!=='string':Object.hasOwn(event,'body'))fail()
      localExecutionSummarySchema.parse(event.executionSummary)
    }
    const runId=kind==='request'?event.run.runId:event.runId
    if(typeof runId!=='string'||!runId.trim()||runId.length>256)fail()
    const current=await lstat(directory)
    if(!current.isDirectory()||current.isSymbolicLink()||(current.mode&0o077)!==0||current.dev!==initial.dev||current.ino!==initial.ino||await realpath(directory)!==directory)fail()
    const name=kind+'-'+createHash('sha256').update(runId).digest('hex')+'.json'
    const bytes=JSON.stringify({schemaVersion:1,capturedAt:new Date().toISOString(),event:safeEvent},null,2)+'\n'
    const handle=await open(join(directory,name),constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600)
    try{await handle.writeFile(bytes,'utf8');await handle.sync()}finally{await handle.close()}
  }
}
export async function apply(ctx,config){
  const recordEvidence=await createM06EvidenceRecorder(process.env.OASIS_M06_EVIDENCE_DIR)
  return applyM06ControlledCandidate013(ctx,config,{recordEvidence,timeoutMs:300000,captureDiagnostics:true})
}
