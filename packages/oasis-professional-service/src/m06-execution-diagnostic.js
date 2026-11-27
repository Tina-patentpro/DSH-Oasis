import {z} from 'zod'
import {types} from 'node:util'
import {localExecutionSummarySchema,normalizeLocalExecutionSummary} from './local-run-summary.js'

const phases=['preparation','prepare-call','route-validation','admission-recheck','stream-enter','stream-next','consume','assemble','settle']
const ms=z.number().int().min(0).max(2147483647)
const causes=['completed','local-deadline','local-abort','callee-timeout','output-contract','adapter-failure','unattributed']
export const m06ExecutionDiagnosticSchema=z.object({
  schemaVersion:z.literal(1),runId:z.string().min(1).max(256),deadlineMs:ms.positive(),elapsedMs:ms,
  settledPhase:z.enum(phases),cause:z.enum(causes),localDeadlineObserved:z.boolean(),localAbortObserved:z.boolean(),
  calleeTimeoutObserved:z.boolean(),streamEntered:z.boolean(),terminalSeen:z.boolean(),
  firstChunkElapsedMs:ms.nullable(),firstTextElapsedMs:ms.nullable(),
  chunkCount:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  phases:z.array(z.object({phase:z.enum(phases),enteredElapsedMs:ms,elapsedMs:ms}).strict()).max(16),
  usage:localExecutionSummarySchema.shape.usage,
}).strict()

export function ownDiagnosticValue(value,key){
  if(types.isProxy(value))return undefined
  try{return Object.getOwnPropertyDescriptor(value,key)?.value}catch{return undefined}
}
function freeze(value){
  if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value)}
  return value
}
// The sink accepts only data properties. Never run an untrusted getter/toJSON/proxy.
export function parseM06ExecutionDiagnostic(value){
  let nodes=0
  function copy(item,depth=0){
    if(++nodes>256||depth>5)throw Error('Invalid execution diagnostic')
    if(item===null||['string','number','boolean','undefined'].includes(typeof item))return item
    if(typeof item!=='object'||types.isProxy(item))throw Error('Invalid execution diagnostic')
    const array=Array.isArray(item)
    if(Object.getPrototypeOf(item)!==(array?Array.prototype:Object.prototype))throw Error('Invalid execution diagnostic')
    const keys=Reflect.ownKeys(item)
    if(keys.length>(array?17:20))throw Error('Invalid execution diagnostic')
    const result=array?[]:{}
    for(const key of keys){
      const descriptor=Object.getOwnPropertyDescriptor(item,key)
      if(typeof key!=='string'||!Object.hasOwn(descriptor,'value'))throw Error('Invalid execution diagnostic')
      if(array&&key==='length'){if(descriptor.value>16)throw Error('Invalid execution diagnostic');continue}
      if(array&&!/^(0|[1-9][0-9]*)$/.test(key))throw Error('Invalid execution diagnostic')
      if(key==='__proto__')throw Error('Invalid execution diagnostic')
      result[key]=copy(descriptor.value,depth+1)
    }
    return result
  }
  return freeze(m06ExecutionDiagnosticSchema.parse(copy(value)))
}

export function createM06ExecutionDiagnostic(runId,deadlineMs){
  const start=performance.now(),stats=new Map()
  let phase='preparation',entered=start,firstChunk=null,firstText=null,chunks=0,calleeTimeout=false
  let localDeadline=false,localAbort=false
  const duration=value=>Math.min(2147483647,Math.max(0,Math.floor(value)))
  const stamp=()=>duration(performance.now()-start)
  stats.set(phase,{phase,enteredElapsedMs:0,elapsedMs:0})
  function mark(next){
    const now=performance.now()
    stats.get(phase).elapsedMs+=Math.max(0,now-entered)
    phase=next;entered=now
    if(!stats.has(next))stats.set(next,{phase:next,enteredElapsedMs:stamp(),elapsedMs:0})
  }
  return {
    mark,
    stop(code){if(code==='TIMED_OUT')localDeadline=true;if(code==='ABORTED')localAbort=true},
    callee(error){if(ownDiagnosticValue(error,'code')==='TIMEOUT')calleeTimeout=true},
    get calleeTimeoutObserved(){return calleeTimeout},
    chunk(value){
      if(firstChunk===null)firstChunk=stamp()
      if(chunks<Number.MAX_SAFE_INTEGER)chunks++
      const type=ownDiagnosticValue(value,'type'),block=ownDiagnosticValue(value,'block')
      const text=type==='text-delta'?ownDiagnosticValue(value,'text')
        :type==='block-end'&&ownDiagnosticValue(block,'type')==='text'?ownDiagnosticValue(block,'text'):undefined
      if(firstText===null&&typeof text==='string'&&text.length>0)firstText=stamp()
    },
    finish(cause,{streamEntered,terminalSeen,summary}){
      const settledPhase=phase;mark('settle')
      const usage=normalizeLocalExecutionSummary(summary).usage
      return parseM06ExecutionDiagnostic({schemaVersion:1,runId,deadlineMs,elapsedMs:stamp(),settledPhase,cause,
        localDeadlineObserved:localDeadline,localAbortObserved:localAbort,calleeTimeoutObserved:calleeTimeout,
        streamEntered,terminalSeen,firstChunkElapsedMs:firstChunk,firstTextElapsedMs:firstText,chunkCount:chunks,
        phases:[...stats.values()].map(s=>({...s,elapsedMs:duration(s.elapsedMs)})),...(usage?{usage}:{})})
    },
  }
}
