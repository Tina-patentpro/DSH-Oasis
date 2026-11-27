import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,realpath,chmod,readdir,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createM06EvidenceRecorder} from '../src/m06-recorded-host-013.js'

for(const kind of ['request','response'])for(const mode of [0o755,0o777])test(`${kind} capture rejects a directory that became nonprivate (${mode.toString(8)})`,async t=>{
  const root=await realpath(await mkdtemp(join(tmpdir(),'m06-mode-')))
  t.after(()=>rm(root,{recursive:true,force:true}))
  const record=await createM06EvidenceRecorder(root)
  await chmod(root,mode)
  const event=kind==='request'?{kind,run:{runId:'synthetic-permission-change'},system:'public instructions',requestText:'public synthetic material'}
    :{kind,runId:'synthetic-permission-change',status:'completed',body:'public synthetic response',executionSummary:{finishKind:'stop'}}
  await assert.rejects(()=>record(event),
    /M06_CONTROLLED_EVIDENCE_UNAVAILABLE/)
  assert.deepEqual(await readdir(root),[],'a directory that lost its private mode must not receive an evidence file')
})
