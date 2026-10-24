import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Offline D0 policy only. This checker is not imported by Host or distributed in the plugin.
const root=new URL('../../../',import.meta.url)
const python=fileURLToPath(new URL('tools/bin/python3',root))
const checker=process.env.OASIS_DOCX_NUMBERING_CHECKER??fileURLToPath(new URL('scripts/check-v340-docx-numbering.py',root))
const fixtures=new URL('./fixtures/v340-docx-numbering/',import.meta.url)
const manifest=JSON.parse(await readFile(new URL('manifest.json',fixtures),'utf8'))
const decisions={direct:'reject',style:'reject','style-chain':'reject','default-style':'reject',
  'ilvl-only-inherits-id':'reject',restart:'reject',multilevel:'reject',bullet:'reject','used-style-cycle':'reject',
  'manual-plain':'eligible','manual-unused-definitions':'eligible','unused-numbering-style':'eligible',
  'unused-restart-multilevel':'eligible','direct-zero-disables':'eligible','style-zero-disables':'eligible','unused-list-style-cycle':'eligible'}
assert.deepEqual(manifest.fixtures.map(f=>f.id).sort(),Object.keys(decisions).sort())
const hash=b=>createHash('sha256').update(b).digest('hex')
function check(bytes){
 const result=spawnSync(python,['-B','-I',checker],{input:bytes,encoding:'utf8',timeout:5000,maxBuffer:65536})
 assert.ifError(result.error);assert.equal(result.signal,null);assert.equal(result.stderr,'')
 const value=JSON.parse(result.stdout)
 assert.equal(value.scope,'offline-numbering-policy-only');assert.equal(value.dispatchEnabled,false)
 return{exit:result.status,value}
}
for(const [id,want]of Object.entries(decisions))test('D0 numbering policy '+id+' returns '+want,async()=>{
 const entry=manifest.fixtures.find(f=>f.id===id),bytes=await readFile(new URL(entry.file,fixtures))
 assert.equal(hash(bytes),entry.sha256);assert.equal(bytes.length,entry.bytes);assert.equal(entry.expected,want)
 const {exit,value}=check(bytes);assert.equal(exit,0);assert.equal(value.decision,want)
 if(want==='reject')assert.ok(['effective-automatic-numbering','unresolved-numbering'].includes(value.reason))
 else assert.equal(value.reason,'no-effective-automatic-numbering')
 assert.equal(hash(bytes),entry.sha256,'policy must not mutate source bytes')
 assert.equal(JSON.stringify(value).includes('一种阀体'),false,'policy result must not return source text')
})
test('D0 numbering policy refuses over-1MiB stdin without returning an eligible result',()=>{
 const {exit,value}=check(Buffer.alloc(1048577,120));assert.equal(exit,2);assert.equal(value.decision,'reject');assert.equal(value.reason,'input-limit')
})
test('D0 numbering policy refuses malformed ZIP instead of silently classifying it as plain text',()=>{
 const {exit,value}=check(Buffer.from('not a DOCX'));assert.equal(exit,2);assert.equal(value.decision,'reject');assert.equal(value.reason,'invalid-docx-numbering-metadata')
})
test('D0 numbering policy refuses DTD even when XML uses UTF-16 encoding',async()=>{
 const f=manifest.invalidFixtures[0],bytes=await readFile(new URL(f.file,fixtures));assert.equal(hash(bytes),f.sha256)
 const {exit,value}=check(bytes);assert.equal(exit,2);assert.equal(value.decision,'reject');assert.equal(value.reason,'invalid-docx-numbering-metadata')
})
