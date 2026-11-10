import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { prepareV340Inputs } from '../src/v340-document.js'
import { normalizeApiDetail, createOasisApiClient } from '../src/oasis-api-contract.js'
const api = await import('../src/m06-api-contract-adapter.js').catch(() => ({}))
const hash = value => createHash('sha256').update(value).digest('hex')
const file = body => ({ filename: 'public.md', body, sha256: hash(body) })
const values = { disclosure_file: file('文件原文'), disclosure_text: ' 文本补充 ', drawings_file: file('文字图示'),
  drawings_text: '不是实际图像', claim_requirements_file: file('要求文件'), claim_requirements_text: '要求补充', user_input: '不补造事实' }
const prepared = () => prepareV340Inputs('Flow-2-6', values)
const ids = ['upstream_md_file','disclosure_file','disclosure_text','drawings_file','drawings_text','claim_requirements_file','claim_requirements_text','user_input']
const metadata = () => normalizeApiDetail({ id: 101, name: 'offline-m06-only', api_type: 'Workflow', is_async: 0, price: 1,
  input_schema: ids.map(id => ({ type: 'paragraph', en_name: id, cn_name: id })),
  output_schema: [{ type: 'paragraph', en_name: 'm06_output_json', cn_name: '结构结果' }] })
const context = { workspaceId:'w', workspacePath:'/synthetic-workspace', environmentKind:'production',
  apiBaseOrigin:'https://lzhxpy.oasisintwrite.com', accountId:7, folderId:8 }
function binding(detail = metadata()) { return { ...context, apiId:101, catalogEntryId:101, apiEndpoint:'offline-m06-only', apiProcess:'offline-only',
  schemaHash:api.m06ApiDetailFingerprint(detail), folderName:'synthetic', confirmedAt:'2026-10-29T00:00:00.000Z' } }
function delivery() { return { version:'flow26-m06-api-binding-1', contractSHA256:api.M06_API_CONTRACT_SHA256,
  resourceSHA256:'26ec83ae26f26783fb4b56abf7b1ac75081214770d0cefaaf2ca0fd0ec56deca',
  service:Object.fromEntries(['apiBaseOrigin','apiId','catalogEntryId','apiEndpoint','apiProcess','schemaHash'].map(key=>[key,binding()[key]])),
  workflow:{applicationId:'synthetic-app',version:'synthetic-1',dslSHA256:'a'.repeat(64)},
  acceptanceReceiptSHA256:'b'.repeat(64), status:'accepted-for-integration' } }

test('M06 adapter preserves file/text coexistence and missing upstream without legacy field remapping', () => {
  assert.equal(typeof api.encodeM06ApiInputs,'function')
  const inputs=api.encodeM06ApiInputs(prepared())
  assert.equal(Object.hasOwn(inputs,'upstream_md_file'),false)
  assert.equal(inputs.disclosure_text,' 文本补充 ')
  assert.deepEqual(JSON.parse(inputs.disclosure_file),file('文件原文'))
  assert.deepEqual(JSON.parse(inputs.drawings_file),file('文字图示'))
  assert.deepEqual(JSON.parse(inputs.claim_requirements_file),file('要求文件'))
  assert.equal(Object.hasOwn(inputs,'technical_solutions'),false)
})
test('M06 adapter refuses forged prepared receipts, PDF evidence stripping and escaped payload overflow', () => {
  assert.equal(typeof api.buildM06ApiCreateBody,'function')
  const bad=structuredClone(prepared());bad.values.disclosure_text='篡改';assert.throws(()=>api.encodeM06ApiInputs(bad))
  const pdf=structuredClone(prepared());pdf.values.disclosure_file.extraction={};assert.throws(()=>api.encodeM06ApiInputs(pdf))
  const large={};for(const id of ['disclosure_file','drawings_file','claim_requirements_file'])large[id]=file('\\'.repeat(300000))
  assert.throws(()=>api.buildM06ApiCreateBody({prepared:prepareV340Inputs('Flow-2-6',large),key:'offline',binding:binding(),delivery:delivery(),context,detail:metadata()}))
})
test('binding admission rejects legacy service, scope drift, schema/price drift and unaccepted delivery', () => {
  assert.equal(typeof api.assertM06ApiContractBinding,'function')
  const args={binding:binding(),delivery:delivery(),context,detail:metadata()}
  assert.doesNotThrow(()=>api.assertM06ApiContractBinding(args))
  for(const patch of [{context:{...context,accountId:9}},{context:{...context,folderId:9}},
    {context:{...context,workspacePath:'/other'}},{detail:{...metadata(),price:2}},
    {detail:{...metadata(),id:39}},{delivery:{...delivery(),status:'candidate'}},
    {delivery:{...delivery(),service:{...delivery().service,apiId:102}}},
    {delivery:{...delivery(),contractSHA256:'0'.repeat(64)}}])assert.throws(()=>api.assertM06ApiContractBinding({...args,...patch}))
})
test('M06 seven-field response rejects legacy prose, result files, unknown keys and wrong original key', () => {
  assert.equal(typeof api.parseM06ApiResult,'function')
  const output={summary:'结构夹具，未评估',core_result_markdown:'仅测试结构',updates:[],tables:{},terms_master:[],warnings:[],model_completions:[]}
  const result={resolved:true,result:{key:'original',answerText:JSON.stringify(output),fileUrls:[]}}
  assert.deepEqual(api.parseM06ApiResult(result,'original'),output)
  for(const response of [{resolved:false,receipt:{key:'original'}},{...result,result:{...result.result,key:'other'}},
    {...result,result:{...result.result,answerText:'旧正文'}},{...result,result:{...result.result,fileUrls:['https://example.invalid/x.docx']}},
    {...result,result:{...result.result,answerText:JSON.stringify({...output,extra:true})}}])assert.throws(()=>api.parseM06ApiResult(response,'original'))
  assert.throws(()=>api.parseM06ApiResult({...result,result:{...result.result,key:undefined}},undefined))
})
test('M06 body passes actual API transport unchanged and has independent request-body hash', async () => {
  assert.equal(typeof api.buildM06ApiCreateBody,'function')
  const body=api.buildM06ApiCreateBody({prepared:prepared(),key:'original',binding:binding(),delivery:delivery(),context,detail:metadata()})
  let seen
  const client=createOasisApiClient({baseUrl:context.apiBaseOrigin,environmentKind:context.environmentKind,resolveToken:async()=>'offline-fixture',fetchImpl:async(url,init)=>{
    seen={url,body:JSON.parse(init.body)};return new Response(JSON.stringify({data:{key:'original',answer_text:'legacy prose'}}),{status:200}) }})
  const response=await client.createWorkflow({id:body.request.id,key:body.request.key,inputs:body.request.inputs,apiProcess:body.request.api_process,folderId:body.request.folder_id})
  assert.deepEqual(seen.body,body.request);assert.equal(body.requestSHA256,hash(JSON.stringify(seen.body)))
  assert.notEqual(body.requestSHA256,prepared().inputHash)
  assert.throws(()=>api.parseM06ApiResult(response,'original'))
})
