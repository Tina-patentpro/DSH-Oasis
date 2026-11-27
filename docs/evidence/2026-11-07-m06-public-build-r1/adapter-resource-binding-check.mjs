// Offline material binding only. No client/transport or credentials created.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { writeFile } from 'node:fs/promises'
const source = pathToFileURL(resolve('src') + '/')
const api = await import(new URL('m06-api-contract-adapter.js', source))
const { normalizeApiDetail } = await import(new URL('oasis-api-contract.js', source))
const { prepareV340Inputs } = await import(new URL('v340-document.js', source))
const ids = ['upstream_md_file','disclosure_file','disclosure_text','drawings_file','drawings_text','claim_requirements_file','claim_requirements_text','user_input']
const detail = normalizeApiDetail({ id: 101, name: 'offline-m06-only', api_type: 'Workflow', is_async: 0, price: 1,
  input_schema: ids.map(id => ({ type: 'paragraph', en_name: id, cn_name: id })),
  output_schema: [{ type: 'paragraph', en_name: 'm06_output_json', cn_name: '结构结果' }] })
const context = { workspaceId:'w', workspacePath:'/synthetic-workspace', environmentKind:'production',
  apiBaseOrigin:'https://lzhxpy.oasisintwrite.com', accountId:7, folderId:8 }
const binding = { ...context, apiId:101, catalogEntryId:101, apiEndpoint:'offline-m06-only', apiProcess:'offline-only',
  schemaHash:api.m06ApiDetailFingerprint(detail), folderName:'synthetic', confirmedAt:'2026-11-07T00:00:00.000Z' }
const delivery = { version:'flow26-m06-api-binding-1', contractSHA256:api.M06_API_CONTRACT_SHA256,
  resourceSHA256:'e06aa1523338af87b255cbdcb428ae7e693765791820dedc94f69a26ddc37f1d',
  service:Object.fromEntries(['apiBaseOrigin','apiId','catalogEntryId','apiEndpoint','apiProcess','schemaHash'].map(key=>[key,binding[key]])),
  workflow:{applicationId:'synthetic-app',version:'synthetic-1',dslSHA256:'a'.repeat(64)},
  acceptanceReceiptSHA256:'b'.repeat(64), status:'accepted-for-integration' }
const args = { binding, delivery, context, detail }
assert.doesNotThrow(() => api.assertM06ApiContractBinding(args))
assert.throws(() => api.assertM06ApiContractBinding({ ...args, delivery: { ...delivery,
  resourceSHA256:'26ec83ae26f26783fb4b56abf7b1ac75081214770d0cefaaf2ca0fd0ec56deca' } }), { code:'M06_API_CONTRACT_MISMATCH' })
assert.throws(() => api.assertM06ApiContractBinding({ ...args, context: { ...context, folderId:9 } }), { code:'M06_API_CONTRACT_MISMATCH' })
const prepared = prepareV340Inputs('Flow-2-6', { disclosure_text:'公开合成：底座设导向槽。', user_input:'仅校验，不发送。' })
const built = api.buildM06ApiCreateBody({ ...args, prepared, key:'offline-public-binding' })
assert.equal(built.request.inputs.disclosure_text, '公开合成：底座设导向槽。')
assert.equal(built.requestSHA256, createHash('sha256').update(JSON.stringify(built.request)).digest('hex'))
await writeFile(new URL('./adapter-resource-binding-check.json', import.meta.url), JSON.stringify({
  scope:'actual archive material adapter, synthetic binding only; not producer/server authorization',
  acceptedNewResource:true, rejectedOldResource:true, rejectedWrongFolder:true,
  bodyConstructedLocally:true, requestsSent:0, resourceSHA256:delivery.resourceSHA256,
}, null, 2) + '\n')
console.log('actual archive API material binding PASS; new resource accepted; old resource/folder drift rejected; 0 requests')
