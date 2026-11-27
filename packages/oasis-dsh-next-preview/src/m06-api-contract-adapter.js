import { z } from 'zod'
import { canonicalJson } from './local-mock-runner.js'
import { getV340Node, freezeV340, v340Hash } from './v340-catalog.js'
import { prepareV340Inputs, parseV340ModelOutput } from './v340-document.js'
import { workspaceApiBindingSchema } from './oasis-workspace-binding.js'
import { buildWorkflowCreateBody } from './oasis-api-contract.js'
import { M06_PUBLIC_RESOURCE_SHA256 as M06_BUSINESS_013_RESOURCE_SHA256 } from './m06-public-resources-r1.js'

// Fixed consumer proposal. A matching hash is an identity, never server authorization.
export const M06_API_CONTRACT_SHA256 = '5dae3e9cd2b2f52562e01e4dc0dca9dca325a5ee64db933022404995d8bbde62'
const ids = getV340Node('Flow-2-6').inputs.map(input => input.id)
const sha = z.string().regex(/^[a-f0-9]{64}$/)
const label = z.string().min(1).max(256).refine(value=>value.trim()===value)
const deliverySchema = z.object({ version:z.literal('flow26-m06-api-binding-1'),
  contractSHA256:z.literal(M06_API_CONTRACT_SHA256), resourceSHA256:z.literal(M06_BUSINESS_013_RESOURCE_SHA256),
  service:z.object({apiBaseOrigin:z.string().max(2048),apiId:z.number().int().nonnegative(),
    catalogEntryId:z.number().int().nonnegative(),apiEndpoint:label,apiProcess:z.string().max(4000),schemaHash:sha}).strict(),
  workflow:z.object({applicationId:label,version:label,dslSHA256:sha}).strict(),
  acceptanceReceiptSHA256:sha,status:z.literal('accepted-for-integration') }).strict()
const fail = () => { throw Object.assign(new Error('M06 API合同或当前项目绑定不匹配；未获准派发。'), { code:'M06_API_CONTRACT_MISMATCH' }) }
const utf8 = value => Buffer.byteLength(value,'utf8')

// This fingerprint matches the existing remote service's detailWithoutRaw convention.
export function m06ApiDetailFingerprint(detail) {
  const {id,name,apiType,price,modelName,executionMode,inputFields,outputFields}=detail
  return v340Hash(canonicalJson({id,name,apiType,price,modelName,executionMode,inputFields,outputFields}))
}

// Trusted Host-side delivery/context only. This is not an RPC accepting user-supplied approval.
// The caller must verify the actual producer receipt and resolve current account/folder authority.
export function assertM06ApiContractBinding({ binding, delivery, context, detail }) {
  try {
    const b=workspaceApiBindingSchema.parse(binding)
    deliverySchema.parse(delivery)
    for(const [key,value] of Object.entries(delivery.service))if(b[key]!==value)fail()
    for(const key of ['workspaceId','workspacePath','environmentKind','apiBaseOrigin','accountId','folderId'])if(b[key]!==context[key])fail()
    if(b.apiId!==detail.id||b.apiEndpoint!==detail.name||b.schemaHash!==m06ApiDetailFingerprint(detail)
      ||detail.apiType!=='Workflow'||detail.executionMode!=='sync'||!Number.isSafeInteger(b.catalogEntryId))fail()
    if(detail.inputFields.length!==ids.length||detail.inputFields.some((field,i)=>field.fieldId!==ids[i]||field.type!=='paragraph')
      ||detail.outputFields.length!==1||detail.outputFields[0].fieldId!=='m06_output_json'||detail.outputFields[0].type!=='paragraph')fail()
    return freezeV340({binding:structuredClone(b),delivery:structuredClone(delivery)})
  } catch { fail() }
}

export function encodeM06ApiInputs(prepared) {
  try {
    if(prepared.nodeId!=='Flow-2-6'||canonicalJson(prepareV340Inputs('Flow-2-6',prepared.values))!==canonicalJson(prepared))fail()
    const inputs={};let total=0
    for(const id of ids){
      if(prepared.receipts[id].status==='not_provided')continue
      const value=prepared.values[id],file=id.endsWith('_file'),body=file?value.body:value
      if(!body.isWellFormed()||body.includes('\0')||utf8(body)>1048576||id!=='upstream_md_file'&&body.length>300000)fail()
      total+=utf8(body)
      if(file&&(!value.filename.isWellFormed()||v340Hash(body)!==value.sha256))fail()
      inputs[id]=file?JSON.stringify(value):body
    }
    if(total>2097152)fail()
    return freezeV340(inputs)
  } catch { fail() }
}

// Produces an exact request for the existing client; does not dispatch, store credentials,
// consume confirmation/budget or install a new source in the ordinary Host.
export function buildM06ApiCreateBody({ prepared, key, binding, delivery, context, detail }) {
  const accepted=assertM06ApiContractBinding({binding,delivery,context,detail})
  const request=buildWorkflowCreateBody({id:accepted.binding.apiId,key,inputs:encodeM06ApiInputs(prepared),
    apiProcess:accepted.binding.apiProcess,folderId:accepted.binding.folderId})
  const bytes=JSON.stringify(request)
  if(utf8(bytes)>2097152)fail()
  return freezeV340({request,requestSHA256:v340Hash(bytes),inputHash:prepared.inputHash,
    bindingSHA256:v340Hash(canonicalJson(accepted)),contractSHA256:M06_API_CONTRACT_SHA256})
}

// Full seven-field validation, then the existing cumulative assembler must still check
// source claims and retain Host warnings. Parsing does not certify professional quality.
export function parseM06ApiResult(response, originalKey) {
  try {
    if(typeof originalKey!=='string'||originalKey.trim().length===0||response.resolved!==true||response.result.key!==originalKey||response.result.fileUrls.length!==0
      ||typeof response.result.answerText!=='string'||utf8(response.result.answerText)>2097152)fail()
    return freezeV340(parseV340ModelOutput(JSON.parse(response.result.answerText)))
  } catch { throw Object.assign(new Error('M06 API未返回可验证的七字段结果；保留原运行与响应。'), {code:'M06_API_RESULT_UNCONFIRMED'}) }
}
