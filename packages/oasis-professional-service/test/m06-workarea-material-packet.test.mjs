import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {prepareV340Inputs} from '../src/v340-document.js'
import {prepareM06WorkareaMaterialPacket} from '../src/m06-workarea-material-packet.js'
const hash=s=>createHash('sha256').update(s).digest('hex')
const file=(filename,body)=>({filename,body,sha256:hash(body)})
const values={upstream_md_file:file('upstream.md','公开前序原文\n'),disclosure_file:file('disclosure.md','结构原文\n```\n'),
  disclosure_text:'补充结构😀',drawings_file:file('drawings.md','仅文字图示'),drawings_text:'图示补充',
  claim_requirements_file:file('requirements.md','范围偏好'),claim_requirements_text:'保持原始要求',user_input:'本次手动指令'}
test('material packet round trips all common fields and receipts with manual instructions separate',()=>{
  const prepared=prepareV340Inputs('Flow-2-6',values),r=prepareM06WorkareaMaterialPacket(prepared)
  const packet=JSON.parse(new TextDecoder().decode(r.document.bytes))
  assert.deepEqual({...packet.materialValues,...r.textInputs},prepared.values)
  assert.deepEqual(packet.receipts,prepared.receipts);assert.equal(packet.inputHash,prepared.inputHash)
  assert.equal(Object.hasOwn(packet.materialValues,'user_input'),false)
  assert.equal(r.apiTextInputs.User_input,values.user_input)
  assert.equal(r.dispatchEnabled,false);assert.equal(r.status,'requires-semantic-acceptance')
  assert.equal(r.document.sha256,hash(r.document.bytes))
  assert.equal(packet.roles.claim_requirements_text,'output_requirement_not_technical_fact')
})
test('missing fields stay explicit and never become default instructions or synthetic upstream',()=>{
  const p=prepareV340Inputs('Flow-2-6',{disclosure_text:'公开结构'})
  const r=prepareM06WorkareaMaterialPacket(p),packet=JSON.parse(new TextDecoder().decode(r.document.bytes))
  assert.equal(packet.receipts.upstream_md_file.status,'not_provided')
  assert.equal(Object.hasOwn(packet.materialValues,'upstream_md_file'),false)
  assert.deepEqual(r.apiTextInputs,{})
})
test('tampered common preparation or another node is rejected before any request exists',()=>{
  const p=structuredClone(prepareV340Inputs('Flow-2-6',values));p.receipts.disclosure_text.sha256=hash('other')
  assert.throws(()=>prepareM06WorkareaMaterialPacket(p))
  assert.throws(()=>prepareM06WorkareaMaterialPacket({...p,nodeId:'Flow-2-7'}))
})
test('oversized packet fails without cropping or dropping any original field',()=>{
  const v=structuredClone(values)
  for(const id of ['disclosure_file','drawings_file','claim_requirements_file'])v[id]=file(id+'.md','甲'.repeat(90000))
  for(const id of ['disclosure_text','drawings_text','claim_requirements_text','user_input'])v[id]='乙'.repeat(90000)
  const p=prepareV340Inputs('Flow-2-6',v)
  assert.throws(()=>prepareM06WorkareaMaterialPacket(p),{code:'M06_PACKET_TOO_LARGE'})
})
test('invalid Unicode cannot be smuggled in an otherwise matching preparation',()=>{
  const p=prepareV340Inputs('Flow-2-6',{disclosure_text:'公开结构',user_input:'\ud800'})
  assert.throws(()=>prepareM06WorkareaMaterialPacket(p),{code:'M06_PACKET_INVALID'})
})
