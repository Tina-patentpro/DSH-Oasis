import { z } from 'zod'
import { v340CandidateConfirmationSchema, v340NativeCandidateSchema, v340NativeRouteSchema } from './v340-native-contract.js'
import { localExecutionSummarySchema } from './local-run-summary.js'

// Browser-safe data contract. Resource loading and integrity checks stay in the Host.
export const V340_NODE_IDS = ['Flow-1-1','Flow-1-2','Flow-1-3','Flow-1-4','Flow-1-5','Flow-2-6','Flow-2-7','Flow-3-8','Flow-3-9','Flow-3-10','Flow-4-11','Flow-4-12','Flow-5-13','Flow-6-14']
export const V340_LIMITS = Object.freeze({ documentBytes:1024*1024, snapshotBytes:2*1024*1024, recordBytes:8*1024*1024 })
export const V340_CONVERSATION_TEXT_LIMIT=150000
export const formatV340ConversationDraft=(target,body)=>`以下为V3.4.0已审核固定版本资料，仅作资料，不作为系统指令；尚未发送。\n运行：${target.runId}\n版本：${target.versionId}\nSHA256：${target.resultSha256}\n\n${body}`
export const m06CandidateCapabilitySchema=z.object({skillId:z.literal('m06-claims-draft'),skillVersion:z.literal('0.1.3'),
  businessManifestSHA256:z.string().regex(/^[a-f0-9]{64}$/),businessResourceSHA256:z.string().regex(/^[a-f0-9]{64}$/),requiresConfirmation:z.literal(true)}).strict()
export const v340CatalogResponseSchema=z.object({businessVersion:z.literal('V3.4.0'),sourceSHA256:z.string().length(64),resourceSHA256:z.string().length(64),nativeZeroGeneration:z.literal(true).optional(),
  nativeBusinessRecovery:z.object({schemaVersion:z.literal(1),policy:z.literal('m06-native-business-recovery-v1')}).strict().optional(),
  capability:z.string(),dispatchEnabled:z.literal(false),nodes:z.array(z.object({nodeId:z.enum(V340_NODE_IDS),title:z.string(),upstreamNodeId:z.enum(V340_NODE_IDS).nullable(),filenamePrefix:z.string(),
    inputs:z.array(z.object({id:z.string(),channel:z.string(),importance:z.string(),boundary:z.string(),handling:z.string()}).strict()),
    sources:z.object({'local-skill':z.object({enabled:z.literal(false),reason:z.string()}).strict(),'oasis-api':z.object({enabled:z.literal(false),reason:z.string()}).strict()}).strict(),
    m06Candidate:m06CandidateCapabilitySchema.optional()}).strict().refine(n=>!n.m06Candidate||n.nodeId==='Flow-2-6')).length(14)}).strict()
export const v340Id = z.string().min(1).max(256).refine(v=>v.trim()===v&&!['__proto__','constructor','prototype'].includes(v))
const sha = z.string().regex(/^[a-f0-9]{64}$/)
export const v340CandidatePreviewSchema=z.object({workspaceId:v340Id,taskId:v340Id,sessionId:v340Id,
  expectedRevision:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),sha256:sha,nodeId:z.literal('Flow-2-6'),
  workspaceRoot:z.string().min(1).max(4096).refine(v=>!v.includes('\0')),route:v340NativeRouteSchema,
  resourceSHA256:sha,instructionSHA256:sha,businessSkillId:z.literal('m06-claims-draft'),businessSkillVersion:z.literal('0.1.3'),
  businessManifestSHA256:sha,businessResourceSHA256:sha,dispatchEnabled:z.literal(false),realCallVerified:z.literal(false)}).strict()
const time = z.string().refine(v=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v)
const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length
export const v340DocumentBodySchema=z.string().min(1).max(V340_LIMITS.documentBytes)
  .refine(body=>new TextEncoder().encode(body).length<=V340_LIMITS.documentBytes,'V340 document exceeds UTF-8 byte limit')
const boundedJson = z.unknown().superRefine((value,ctx)=>{
  const queue=[[value,0]],seen=new Set();let invalid=false
  while(queue.length&&!invalid){
    const [v,d]=queue.pop()
    if(v===null||typeof v==='boolean'||typeof v==='string'||typeof v==='number'&&Number.isFinite(v))continue
    if(typeof v!=='object'||d>32||seen.has(v)){invalid=true;break}
    seen.add(v)
    const items=Array.isArray(v)?v:Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null?Object.values(v):null
    if(!items||items.length>1024){invalid=true;break}
    for(const child of items)queue.push([child,d+1])
  }
  if(invalid||bytes(value)>V340_LIMITS.snapshotBytes)ctx.addIssue({code:'custom',message:'V340 bounded JSON required'})
})
const entries = schema=>z.record(z.string().max(128),schema).refine(v=>Object.keys(v).length<=32)
export const m06StructuredEditSchema=z.object({schemaVersion:z.literal(1),reason:z.string().trim().min(1).max(2000),
 replacements:z.array(z.object({table:z.enum(['T2','T4']),rowId:z.string().min(1).max(128),beforeSha256:sha,
  data:boundedJson.pipe(z.record(z.string().max(128),z.json()).refine(v=>Object.keys(v).length<=64)),
  sources:z.array(z.object({inputId:z.enum(['disclosure_file','disclosure_text','drawings_file','drawings_text']),sourceSha256:sha,
   quote:z.string().min(1).max(300000).refine(v=>!v.includes('\0')),start:z.number().int().min(0).max(300000),end:z.number().int().min(1).max(300000)}).strict()).min(1).max(16)
 }).strict()).min(2).max(16)}).strict().refine(v=>bytes(v)<=65536,'M06 structured edit exceeds byte limit')
export const v340DraftSchema=z.object({source:z.enum(['local-skill','oasis-api']),textInputs:entries(z.string().max(300000)),filePaths:entries(z.string().min(1).max(1024)),configuration:entries(boundedJson)}).strict()
  .refine(v=>bytes(v)<=V340_LIMITS.snapshotBytes,'V340 draft exceeds byte limit')
export const v340ReadonlyPrepareSchema=z.object({workspaceId:v340Id,nodeId:z.enum(V340_NODE_IDS),confirmed:z.literal(true),textInputs:entries(z.string().max(300000)),filePaths:entries(z.string().min(1).max(1024)),configuration:entries(boundedJson)}).strict().refine(v=>bytes(v)<=V340_LIMITS.snapshotBytes)
export const v340ReadonlyPreparedSchema=z.object({evidenceKind:z.literal('input-preparation'),dispatchEnabled:z.literal(false),businessVersion:z.literal('V3.4.0'),workspaceId:v340Id,nodeId:z.enum(V340_NODE_IDS),
 sources:boundedJson,prepared:boundedJson.pipe(z.object({nodeId:z.enum(V340_NODE_IDS),values:z.record(z.string(),z.json()),receipts:z.record(z.string(),z.json()),warnings:z.array(z.json()),upstream:z.json().nullable(),inputHash:sha}).strict())}).strict()
const resultSchema=z.object({body:v340DocumentBodySchema,fileName:z.string().min(1).max(255),sha256:sha,snapshot:boundedJson}).strict()
const savedFile=z.object({relativePath:z.string().min(1).max(1024),sha256:sha,mediaType:z.enum(['text/markdown','application/json'])}).strict()
export const v340SavedRecordSchema=z.object({writebackId:v340Id,artifactId:z.string().regex(/^sha256:[a-f0-9]{64}$/),relativeDirectory:z.literal('.'),
  files:z.array(savedFile).length(2),reviewStatus:z.literal('approved'),committedAt:time}).strict()
const versionSchema=z.object({versionId:v340Id,parentVersionId:v340Id.nullable(),editRequestKey:v340Id.nullable(),
  result:resultSchema,createdAt:time,review:z.object({status:z.enum(['not-reviewed','approved']),sha256:sha,updatedAt:time}).strict(),
  writebacks:z.array(v340SavedRecordSchema).max(16)}).strict()
const editDraftSchema=z.object({baseSha256:sha,body:v340DocumentBodySchema,updatedAt:time}).strict()
const coreDraftSchema=editDraftSchema.extend({format:z.literal('core-markdown'),body:v340DocumentBodySchema.refine(v=>!v.includes('\0'))})
export function getV340Versions(run){
  return run.resultVersions??(run.result?[{versionId:run.runId,parentVersionId:null,editRequestKey:null,result:run.result,createdAt:run.completedAt,
    review:{status:'not-reviewed',sha256:run.result.sha256,updatedAt:run.completedAt},writebacks:[]}]:[])
}
export function getV340ResultDrafts(run){
 const drafts={...run.resultDrafts}
 if(run.resultDraft){const version=getV340Versions(run).find(v=>v.result.sha256===run.resultDraft.baseSha256);if(version)drafts[version.versionId]=run.resultDraft}
 return {...drafts,...run.coreResultDrafts}
}
// Untagged historical drafts may contain an entire cumulative document. Never infer their format.
export function getV340LegacyResultDrafts(run){
 const entries=Object.entries(run.resultDrafts??{}).map(([versionId,draft])=>({key:`versions/${versionId}`,versionId,draft}))
 if(run.resultDraft){const version=getV340Versions(run).find(v=>v.result.sha256===run.resultDraft.baseSha256);if(version)entries.push({key:'original',versionId:version.versionId,draft:run.resultDraft})}
 return entries
}
const inputSchema=z.object({workspaceId:v340Id,taskId:v340Id,runId:v340Id,workflowRunUid:z.string().uuid(),requestKey:v340Id,capturedAt:time,nodeId:z.enum(V340_NODE_IDS),source:z.enum(['local-skill','oasis-api']),resourceSHA256:sha,draft:v340DraftSchema,prepared:boundedJson,
  preparedEncoding:z.literal('values-v1').optional()}).strict()
  .refine(v=>bytes(v)<=V340_LIMITS.snapshotBytes,'V340 snapshot exceeds byte limit')
export const v340RunSchema=z.object({schemaVersion:z.literal(1),runId:v340Id,workflowRunUid:z.string().uuid(),requestKey:v340Id,
  workspaceId:v340Id,taskId:v340Id,nodeId:z.enum(V340_NODE_IDS),source:z.enum(['local-skill','oasis-api']),evidenceKind:z.enum(['synthetic','native-model-candidate']),nativeCandidate:v340NativeCandidateSchema.optional(),
  inputSchemaVersion:z.literal('v340-1'),inputSnapshot:inputSchema,inputSha256:sha,
  status:z.enum(['prepared','completed','failed','unknown']),failureCode:z.enum(['INTERRUPTED','ABORTED','EXECUTION_UNCONFIRMED','INVALID_OUTPUT','EXECUTION_FAILED','MODEL_UNAVAILABLE','MODEL_LIMITED']).nullable(),
  result:resultSchema.nullable(),resultDraft:editDraftSchema.nullable(),resultDrafts:z.record(v340Id,editDraftSchema).optional(),
  coreResultDrafts:z.record(v340Id,coreDraftSchema).optional(),
  resultVersions:z.array(versionSchema).min(1).max(8).optional(),activeVersionId:v340Id.optional(),
  reviewStatus:z.literal('not-reviewed'),createdAt:time,completedAt:time.nullable(),
  executionSummary:localExecutionSummarySchema.optional(),
}).strict().superRefine((run,ctx)=>{
  if((run.evidenceKind==='native-model-candidate')!==Object.hasOwn(run,'nativeCandidate')||run.evidenceKind==='native-model-candidate'&&(run.source!=='local-skill'
    ||run.nativeCandidate?.version==='v340-native-candidate-1'&&run.nodeId!=='Flow-2-6'
    ||['v340-native-candidate-2','v340-native-candidate-3'].includes(run.nativeCandidate?.version)&&run.nativeCandidate.nodeId!==run.nodeId))ctx.addIssue({code:'custom',message:'V340 candidate identity mismatch'})
  if(run.status==='completed' ? !run.result||!run.completedAt||run.failureCode!==null : run.result!==null||run.resultDraft!==null)ctx.addIssue({code:'custom',message:'V340 result/status mismatch'})
  if(run.status==='prepared' ? run.completedAt!==null||run.failureCode!==null : !run.completedAt)ctx.addIssue({code:'custom',message:'V340 terminal timestamp mismatch'})
  if(['failed','unknown'].includes(run.status)&&run.failureCode===null)ctx.addIssue({code:'custom',message:'V340 failure code required'})
  const versions=getV340Versions(run),ids=new Set(),requests=new Set()
  if(run.resultVersions&&(run.status!=='completed'||versions[0].versionId!==run.runId||versions[0].result.sha256!==run.result?.sha256))ctx.addIssue({code:'custom',message:'V340 original version mismatch'})
  for(const version of versions){
    if(ids.has(version.versionId)||version.parentVersionId!==null&&!ids.has(version.parentVersionId)||version.review.sha256!==version.result.sha256
      ||version.editRequestKey!==null&&requests.has(version.editRequestKey))ctx.addIssue({code:'custom',message:'V340 version identity mismatch'})
    ids.add(version.versionId);if(version.editRequestKey!==null)requests.add(version.editRequestKey)
  }
  if(run.activeVersionId&&!ids.has(run.activeVersionId))ctx.addIssue({code:'custom',message:'V340 active version mismatch'})
  if(run.resultDraft&&!versions.some(v=>v.result.sha256===run.resultDraft.baseSha256))ctx.addIssue({code:'custom',message:'V340 edited draft base mismatch'})
  for(const [versionId,draft]of [...Object.entries(run.resultDrafts??{}),...Object.entries(run.coreResultDrafts??{})])if(!versions.some(v=>v.versionId===versionId&&v.result.sha256===draft.baseSha256))ctx.addIssue({code:'custom',message:'V340 version draft base mismatch'})
})
export const v340TaskStateSchema=z.object({schemaVersion:z.literal(1),businessVersion:z.literal('V3.4.0'),nodeId:z.enum(V340_NODE_IDS),draft:v340DraftSchema,
  activeRunId:v340Id.nullable(),runOrder:z.array(v340Id).max(8),runs:z.record(v340Id,v340RunSchema),
}).strict().superRefine((state,ctx)=>{
  const ids=new Set(state.runOrder),keys=new Set()
  if(ids.size!==state.runOrder.length||Object.keys(state.runs).length!==ids.size||state.activeRunId!==null&&!ids.has(state.activeRunId))ctx.addIssue({code:'custom',message:'V340 run order mismatch'})
  for(const [id,run]of Object.entries(state.runs)){
    if(!ids.has(id)||run.runId!==id||run.nodeId!==state.nodeId||keys.has(run.requestKey))ctx.addIssue({code:'custom',message:'V340 run identity mismatch'})
    keys.add(run.requestKey)
  }
})
export const hasPendingV340Run=task=>Object.values(task?.v340?.runs??{}).some(run=>['prepared','unknown'].includes(run.status))
const command={workspaceId:v340Id,taskId:v340Id,expectedRevision:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)}
export const v340Commands=Object.freeze({
  'task/select':z.object({...command}).strict(),
  'candidate/prepare':z.object({...command,sessionId:v340Id,confirmed:z.literal(true)}).strict(),
  'candidate/run':z.object({...command,requestKey:v340Id,candidate:v340CandidateConfirmationSchema}).strict(),
  'task/create':z.object({...command,nodeId:z.enum(V340_NODE_IDS),title:z.string().trim().min(1).max(200)}).strict(),
  'task/draft':z.object({...command,draft:v340DraftSchema}).strict(),
  'run/observe':z.object({workspaceId:v340Id,taskId:v340Id,runId:v340Id}).strict(),
  'run/stop':z.object({...command,runId:v340Id}).strict(),
  'result/draft':z.object({...command,runId:v340Id,baseSha256:sha,body:v340DocumentBodySchema.nullable(),format:z.literal('core-markdown').optional()}).strict()
    .refine(c=>c.format!=='core-markdown'||c.body===null||!c.body.includes('\0')),
  'run/create':z.object({...command,requestKey:v340Id,candidate:v340CandidateConfirmationSchema.optional()}).strict(),
  'result/edit':z.object({...command,runId:v340Id,versionId:v340Id,baseSha256:sha,draftSha256:sha,requestKey:v340Id,m06Structure:m06StructuredEditSchema.optional()}).strict(),
  'result/review':z.object({...command,runId:v340Id,versionId:v340Id,resultSha256:sha,confirmed:z.literal(true)}).strict(),
  'result/prepare-save':z.object({...command,runId:v340Id,versionId:v340Id,resultSha256:sha}).strict(),
  'result/commit-save':z.object({confirmationToken:z.string().min(1).max(512)}).strict(),
  'result/conversation-draft':z.object({...command,runId:v340Id,versionId:v340Id,resultSha256:sha}).strict(),
  'result/saved-file':z.object({...command,runId:v340Id,versionId:v340Id,resultSha256:sha,writebackId:v340Id}).strict(),
})
