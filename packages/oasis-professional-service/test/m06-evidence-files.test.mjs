import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,realpath,readFile,stat,readdir,symlink,mkdir,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
const url=new URL('../src/m06-recorded-host-013.js',import.meta.url)
const module=await import(url).catch(error=>{
  if(error.code==='ERR_MODULE_NOT_FOUND'&&error.url===url.href)return {}
  throw error
})
async function directory(t){const root=await realpath(await mkdtemp(join(tmpdir(),'m06-evidence-')));t.after(()=>rm(root,{recursive:true,force:true}));return root}
function requireRecorder(){assert.equal(typeof module.createM06EvidenceRecorder,'function','controlled evidence files are not implemented')}
test('private evidence files preserve the received snapshot and never overwrite an existing run event',async t=>{
  requireRecorder();const root=await directory(t),record=await module.createM06EvidenceRecorder(root)
  const event={kind:'request',run:{runId:'synthetic/run-1',requestKey:'once'},system:'fixed public instructions',requestText:'public data'}
  await record(event)
  const [name]=await readdir(root);assert.match(name,/^request-[a-f0-9]{64}\.json$/)
  const bytes=await readFile(join(root,name)),saved=JSON.parse(bytes)
  assert.deepEqual(saved.event,event);assert.equal(saved.schemaVersion,1)
  assert.equal((await stat(join(root,name))).mode&0o777,0o600)
  await assert.rejects(()=>record({...event,system:'must not replace'}))
  assert.deepEqual(await readFile(join(root,name)),bytes)
})
test('a symlink or replaced evidence directory is refused before writing',async t=>{
  requireRecorder();const root=await directory(t),real=join(root,'real'),link=join(root,'link')
  await mkdir(real,{mode:0o700});await symlink(real,link)
  await assert.rejects(()=>module.createM06EvidenceRecorder(link))
  const record=await module.createM06EvidenceRecorder(real)
  await rm(real,{recursive:true});await symlink(root,real)
  await assert.rejects(()=>record({kind:'response',runId:'one',status:'unknown',executionSummary:{}}))
  assert.deepEqual((await readdir(root)).sort(),['link','real'])
})
test('unsupported event fields cannot silently become an extra log channel',async t=>{
  requireRecorder();const root=await directory(t),record=await module.createM06EvidenceRecorder(root)
  await assert.rejects(()=>record({kind:'response',runId:'one',status:'unknown',executionSummary:{},headers:{authorization:'not a real credential'}}))
  assert.deepEqual(await readdir(root),[])
})
