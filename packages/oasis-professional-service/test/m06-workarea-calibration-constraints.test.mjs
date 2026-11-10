import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import * as adapter from '../src/m06-workarea-material-packet.js'
import {prepareV340Inputs} from '../src/v340-document.js'
const sha=b=>createHash('sha256').update(b).digest('hex')
const prepared=JSON.parse(fs.readFileSync(new URL('../../../docs/evidence/2026-10-29-m06-public-calibration-input-r2.json',import.meta.url))).prepared
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/m06-fast39-r1-calibration-20261031.json',import.meta.url)))
function prepare(p=prepared){
  assert.equal(typeof adapter.prepareM06WorkareaConstrainedCalibration,'function','explicit R2 semantic constraints are missing')
  return adapter.prepareM06WorkareaConstrainedCalibration(p)
}
function inspect(response=fixture.response,p=prepared){
  assert.equal(typeof adapter.inspectM06WorkareaCalibrationResult,'function','bounded response inspection is missing')
  return adapter.inspectM06WorkareaCalibrationResult({prepared:p,response,requestKey:fixture.response.result.key})
}
test('R1 frozen material encoding and actual failed response retain their original bytes',()=>{
  assert.equal(adapter.prepareM06WorkareaMaterialPacket(prepared).document.sha256,'08fc183cf6f2482151d31105cfd22dbe151908b2bba9f4aaf628ef099d540c16')
  assert.equal(sha(fixture.response.result.answerText),fixture.answerSHA256)
  assert.equal(fixture.answerSHA256,'81a7ca8eeb01c0156e66b9cc64f17bfa24c5200c5596dfd5f6959f7cae6fe06f')
})
test('R2 separates technical evidence from requirements and makes no-new-facts and warning obligations explicit',()=>{
  const r=prepare(),packet=JSON.parse(new TextDecoder().decode(r.document.bytes))
  assert.equal(r.proposalVersion,'m06-workarea-material-packet-2')
  assert.deepEqual({...packet.materialValues,...r.textInputs},prepared.values)
  assert.deepEqual(packet.receipts,prepared.receipts)
  assert.deepEqual(packet.inputWarnings,prepared.warnings)
  assert.equal(packet.inputHash,prepared.inputHash)
  assert.equal(packet.semanticContract.allowNewTechnicalFacts,false)
  assert.deepEqual(packet.semanticContract.requirementInputIds,['claim_requirements_file','claim_requirements_text'])
  assert.equal(packet.semanticContract.technicalSourceInputIds.includes('claim_requirements_text'),false)
  assert.equal(packet.semanticContract.technicalSourceInputIds.includes('user_input'),false)
  assert.deepEqual(r.requiredMissingInputLines,['未提供：upstream_md_file'])
  assert.match(r.apiTextInputs.User_input,/不得补造/)
  assert.match(r.apiTextInputs.User_input,/技术特征来源/)
  assert.match(r.apiTextInputs.User_input,/材料已明确声明的缺失、未提供和未核实事项/)
  assert.ok(r.apiTextInputs.User_input.includes(prepared.values.user_input))
  assert.ok(!r.apiTextInputs.User_input.includes(prepared.values.disclosure_file.body.trim()))
  assert.ok(!r.apiTextInputs.User_input.includes(prepared.values.claim_requirements_text))
  assert.equal(r.document.sha256,sha(r.document.bytes))
  assert.equal(r.dispatchEnabled,false)
})
test('the actual hallucinated Fast39 response fails output obligations without changing raw text or inventing evaluations',()=>{
  const original=structuredClone(fixture.response),r=inspect()
  assert.equal(r.status,'contract-mismatch')
  assert.deepEqual(r.missingSections,['权利要求草稿','材料缺项与未确认事项','技术特征来源'])
  assert.deepEqual(r.missingInputWarningLines,['未提供：upstream_md_file'])
  assert.equal(r.answerText,fixture.response.result.answerText)
  assert.equal(r.answerSHA256,fixture.answerSHA256)
  assert.equal(r.sourceConsistency,'not-assessed')
  assert.equal(r.reviewState,'not-reviewed')
  assert.deepEqual(r.hostInputWarnings,prepared.warnings)
  assert.equal(r.assessments.risks,'not-assessed')
  assert.equal(r.assessments.questions,'not-assessed')
  assert.equal(r.approved,false)
  assert.equal(r.retryAllowed,false)
  assert.deepEqual(fixture.response,original)
})
test('format compliance never certifies technical support or approval, including a disguised hallucinated answer',()=>{
  const response=structuredClone(fixture.response)
  response.result.answerText=`## 权利要求草稿\n${response.result.answerText}\n\n## 材料缺项与未确认事项\n- 未提供：upstream_md_file\n\n## 技术特征来源\n声称全部来自disclosure_file。\n`
  const r=inspect(response)
  assert.equal(r.status,'requires-source-review')
  assert.equal(r.sourceConsistency,'not-assessed')
  assert.equal(r.approved,false)
  assert.equal(r.dispatchEnabled,false)
  assert.equal(r.retryAllowed,false)
})
test('quoted or fenced warning headings and empty sections cannot fulfil output obligations',()=>{
  const response=structuredClone(fixture.response)
  response.result.answerText='```md\n## 权利要求草稿\n1. 文稿\n## 材料缺项与未确认事项\n- 未提供：upstream_md_file\n## 技术特征来源\n来源\n```\n'
  assert.equal(inspect(response).status,'contract-mismatch')
  response.result.answerText='## 权利要求草稿\n\n## 材料缺项与未确认事项\n- 未提供：upstream_md_file\n\n## 技术特征来源\n'
  assert.deepEqual(inspect(response).missingSections,['权利要求草稿','技术特征来源'])
})
test('unknown, wrong-key, file-only and malformed responses remain unaccepted with no retry',()=>{
  const unknown=inspect({resolved:false,receipt:{key:fixture.response.result.key}})
  assert.equal(unknown.status,'unknown');assert.equal(unknown.retryAllowed,false)
  const wrong=structuredClone(fixture.response);wrong.result.key='another-key'
  assert.throws(()=>inspect(wrong),{code:'M06_CALIBRATION_INVALID'})
  const files=structuredClone(fixture.response);files.result.fileUrls=['https://example.com/a.md']
  assert.equal(inspect(files).status,'contract-mismatch')
  const malformed=structuredClone(fixture.response);malformed.result.answerText='\ud800'
  assert.throws(()=>inspect(malformed),{code:'M06_CALIBRATION_INVALID'})
})
test('changed input receipts fail closed; optional missing materials and manual instruction remain explicit',()=>{
  const tampered=structuredClone(prepared);tampered.values.disclosure_text+=' changed'
  assert.throws(()=>prepare(tampered))
  const p=prepareV340Inputs('Flow-2-6',{disclosure_text:'仅公开结构'})
  const r=prepare(p),packet=JSON.parse(new TextDecoder().decode(r.document.bytes))
  assert.deepEqual(r.textInputs,{})
  assert.equal(Object.hasOwn(packet.materialValues,'user_input'),false)
  assert.equal(Object.hasOwn(packet.materialValues,'upstream_md_file'),false)
  assert.ok(r.requiredMissingInputLines.includes('未提供：upstream_md_file'))
  assert.equal(r.dispatchEnabled,false)
})
