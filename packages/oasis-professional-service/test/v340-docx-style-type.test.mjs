import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

// Real binary decisions from the offline candidate; no Host/format capability is enabled.
const root=new URL('../../../',import.meta.url)
const python=fileURLToPath(new URL('tools/bin/python3',root))
const checker=process.env.OASIS_DOCX_NUMBERING_CHECKER??fileURLToPath(new URL('scripts/check-v340-docx-numbering.py',root))
const directory=new URL('./fixtures/v340-docx-style-type/',import.meta.url)
const manifest=JSON.parse(await readFile(new URL('manifest.json',directory),'utf8'))
// Literal user-visible outcomes, independently derived from the frozen DOCX parts.
const cases=[
 ['missing-type-default-1','reject'],['missing-type-default-true','reject'],['missing-type-default-on','reject'],
 ['explicit-plain-over-default-1','eligible'],['explicit-plain-over-default-true','eligible'],['explicit-plain-over-default-on','eligible'],
 ['missing-type-direct-zero-1','eligible'],['missing-type-direct-zero-true','eligible'],['missing-type-direct-zero-on','eligible'],
 ['missing-type-unused-0','eligible'],['missing-type-unused-false','eligible'],['missing-type-unused-off','eligible'],
 ['missing-type-leaf-zero-1','eligible'],['missing-type-leaf-zero-true','eligible'],['missing-type-leaf-zero-on','eligible'],
 ['missing-type-explicit-manual','eligible'],['character-default-does-not-conflict','reject'],['false-default-unused-alongside-true','reject'],
 ['missing-type-false-explicit-0','reject'],['missing-type-false-explicit-false','reject'],['missing-type-false-explicit-off','reject'],
 ['missing-type-plain-over-default','eligible'],['missing-base-type-leaf-zero','eligible'],
 ['invalid-empty-type','reject',2],['invalid-unknown-type','reject',2],
 ['unused-character-default','eligible'],['unused-table-default','eligible'],['unused-numbering-default','eligible'],
]
assert.deepEqual(manifest.fixtures.map(f=>f.id).sort(),cases.map(([id])=>id).sort())
const sha=b=>createHash('sha256').update(b).digest('hex')
for(const [id,want,exit=0]of cases)test(`D0 style type ${id}: ${want}`,async()=>{
 const fixture=manifest.fixtures.find(f=>f.id===id),file=new URL(fixture.file,directory),bytes=await readFile(file)
 assert.equal(sha(bytes),fixture.sha256);assert.equal(bytes.length,fixture.bytes)
 assert.equal(fixture.expected,want);assert.equal(fixture.exit,exit)
 const child=spawnSync(python,['-B','-I',checker],{input:bytes,encoding:'utf8',timeout:5000,maxBuffer:65536})
 assert.ifError(child.error);assert.equal(child.signal,null);assert.equal(child.stderr,'');assert.equal(child.status,exit)
 const result=JSON.parse(child.stdout)
 assert.equal(result.scope,'offline-numbering-policy-only');assert.equal(result.dispatchEnabled,false);assert.equal(result.decision,want)
 if(exit===2)assert.equal(result.reason,'invalid-docx-numbering-metadata')
 else if(want==='eligible')assert.equal(result.reason,'no-effective-automatic-numbering')
 else assert.ok(['effective-automatic-numbering','unresolved-numbering'].includes(result.reason))
 assert.equal(child.stdout.includes('一种阀体'),false,'decision must not expose source text')
 assert.equal(sha(await readFile(file)),fixture.sha256,'source DOCX must remain unchanged')
})
