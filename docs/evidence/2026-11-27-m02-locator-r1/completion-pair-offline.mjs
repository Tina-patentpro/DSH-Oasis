import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {prepareV340Inputs,assembleV340Document} from '../../../.local/dsh-m02-locator-r1-20261127/package/src/v340-document.js'
const e=new URL('./',import.meta.url)
const batch=JSON.parse(await readFile(new URL('../../../.local/dsh-next-field-diagnostics-20261112/offline/batch.json',import.meta.url),'utf8'))
const source=batch.cases.find(c=>c.id==='M02').expectedValues
const prepared=prepareV340Inputs('Flow-1-2',source)
const output={summary:'独立合成配对反例',core_result_markdown:'关于 P1 的机构假设待验证。',tables:{},terms_master:[],warnings:[],
 updates:[{content_id:'hypothesis-1',content_markdown:'条件分离仅为待验证方向。',content_origin:'model_completed',
  source_input_id:'none',source_hash:'none',source_locator:'本节点假设',trust_status:'hypothesis_to_verify',
  last_updated_flow:'Flow-1-2',revision_reason:'离线诊断合成样例'}],
 model_completions:[{content_id:'hypothesis-1',content_origin:'model_completed',completion_basis:'公开合成 P1',
  assumptions:'机构实现未知',confidence:'待验证',affected_section:'候选方向',human_confirmation_status:'pending'}]}
const parameters={nodeId:'Flow-1-2',workflowRunUid:'2b44b1d9-cecc-4307-9030-ce76e12d775c',generatedAt:'2026-11-27T04:30:00Z',prepared}
const valid=assembleV340Document({...parameters,output})
assert.equal(valid.snapshot.model_completions.length,1)
const orphan=structuredClone(output);orphan.updates=[]
let orphanIssue
assert.throws(()=>assembleV340Document({...parameters,output:orphan}),error=>{
 orphanIssue=error.fieldIssue
 return error.fieldIssue?.code==='orphan-completion'&&JSON.stringify(error.fieldIssue.path)===JSON.stringify(['model_completions',0,'content_id'])
})
const missing=structuredClone(output);missing.model_completions=[]
let missingIssue
assert.throws(()=>assembleV340Document({...parameters,output:missing}),error=>{
 missingIssue=error.fieldIssue
 return error.fieldIssue?.code==='missing-completion'&&JSON.stringify(error.fieldIssue.path)===JSON.stringify(['updates',0,'content_id'])
})
await writeFile(new URL('completion-pair-offline.json',e),JSON.stringify({
 syntheticExamples:true,actualFailedContentRecovered:false,pairedPositiveAccepted:true,
 orphanRejected:orphanIssue,missingRejected:missingIssue,modelRequests:0,
 order:'组装器先检查 model_completions 与 updates 的配对，再进入 updates 的原文定位校验。本次真实 orphan-completion 未验证到 source_locator 阶段。'
},null,2)+'\n',{flag:'wx'})
console.log('Offline completion pair accepted; orphan and missing pair rejected with the expected paths.')
