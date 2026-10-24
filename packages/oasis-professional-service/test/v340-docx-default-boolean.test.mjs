import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

// These are real offline DOCX decisions, not Host integration or full-profile extraction.
const root=new URL('../../../',import.meta.url)
const python=fileURLToPath(new URL('tools/bin/python3',root))
const checker=process.env.OASIS_DOCX_NUMBERING_CHECKER??fileURLToPath(new URL('scripts/check-v340-docx-numbering.py',root))
const directory=new URL('./fixtures/v340-docx-default-boolean/',import.meta.url)
const manifest=JSON.parse(await readFile(new URL('manifest.json',directory),'utf8'))
// Literal decisions: recognize all true spellings, preserve unused false declarations,
// keep explicit style numbering active and let a real zero numId cancel inheritance.
const cases=[
 ['true-1','reject',0],['true-word','reject',0],['true-on','reject',0],
 ['false-0','eligible',0],['false-word','eligible',0],['false-off','eligible',0],
 ['direct-zero-1','eligible',0],['direct-zero-true','eligible',0],['direct-zero-on','eligible',0],
 ['leaf-zero-1','eligible',0],['leaf-zero-true','eligible',0],['leaf-zero-on','eligible',0],
 ['explicit-style-0','reject',0],['explicit-style-false','reject',0],['explicit-style-off','reject',0],
 ['absent-unused','eligible',0],['absent-explicit','reject',0],
 ['invalid-empty','reject',2],['invalid-word','reject',2],['mixed-true-defaults','reject',2],
]
assert.deepEqual(manifest.fixtures.map(f=>f.id).sort(),cases.map(([id])=>id).sort())
const sha=b=>createHash('sha256').update(b).digest('hex')
for(const [id,want,exit]of cases)test(`D0 default boolean ${id}: ${want}`,async()=>{
 const fixture=manifest.fixtures.find(f=>f.id===id),file=new URL(fixture.file,directory),bytes=await readFile(file)
 assert.equal(sha(bytes),fixture.sha256);assert.equal(bytes.length,fixture.bytes)
 assert.equal(fixture.expected,want);assert.equal(fixture.exit,exit)
 const child=spawnSync(python,['-B','-I',checker],{input:bytes,encoding:'utf8',timeout:5000,maxBuffer:65536})
 assert.ifError(child.error);assert.equal(child.signal,null);assert.equal(child.stderr,'');assert.equal(child.status,exit)
 const result=JSON.parse(child.stdout)
 assert.equal(result.scope,'offline-numbering-policy-only');assert.equal(result.dispatchEnabled,false)
 assert.equal(result.decision,want)
 assert.equal(result.reason,exit===2?'invalid-docx-numbering-metadata':want==='reject'?'effective-automatic-numbering':'no-effective-automatic-numbering')
 assert.equal(child.stdout.includes('一种阀体'),false,'decision must not expose source text')
 assert.equal(sha(await readFile(file)),fixture.sha256,'source DOCX must remain unchanged')
})
