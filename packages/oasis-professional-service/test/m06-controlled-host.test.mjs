import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { apply as applyDefault } from '../src/index.js'
import { parseStoredWorkbenchRecord } from '../src/workbench-domain.js'
import {setupM06ControlledHost as host,controlledEntry as controlled} from './helpers/m06-controlled-host-harness.mjs'
const hash = value => createHash('sha256').update(value).digest('hex')


test('ordinary Host exposes no candidate preparation or generation path', async t => {
  const f = await host(t, { candidate: false })
  for (const suffix of ['candidate/prepare', 'candidate/run', 'run/create']) {
    assert.equal(f.routes.has('/api/oasis-workbench/workflow/v340/' + suffix), false)
  }
  const catalog = await f.rpc('workflow/v340/catalog', {})
  assert.equal(catalog.ok, true); assert.equal(catalog.value.dispatchEnabled, false)
  assert.ok(catalog.value.nodes.every(node => node.m06Candidate === undefined))
  assert.equal(f.calls.adapter, 0); assert.equal(f.calls.credentials, 0)
})

test('controlled Host goes through registered Fetch confirmation and installed native SDK exactly once', async t => {
  const f = await host(t)
  const catalog = await f.rpc('workflow/v340/catalog', {})
  assert.equal(catalog.ok, true); assert.equal(catalog.value.dispatchEnabled, false)
  const node = catalog.value.nodes.find(node => node.nodeId === 'Flow-2-6')
  assert.equal(node.m06Candidate.skillVersion, '0.1.3')
  assert.equal(node.m06Candidate.skillId, 'm06-claims-draft')
  assert.equal(catalog.value.nodes.filter(node => node.m06Candidate).length, 1)
  const bootstrap = await f.rpc('professional/bootstrap', {})
  assert.equal(bootstrap.ok, true); assert.equal(bootstrap.value.remoteEnabled, false)
  const legacy = await f.rpc('workflow/catalog', {})
  assert.equal(legacy.value.localGenerationEnabled, false)
  assert.equal(legacy.value.apiExecutionAvailable, false)
  const before = await f.state(), preview = await f.preview()
  assert.equal(preview.ok, true)
  assert.equal(preview.value.businessSkillVersion, '0.1.3')
  assert.equal(preview.value.sessionId, 's'); assert.equal(preview.value.expectedRevision, before.revision)
  assert.deepEqual(await f.state(), before, 'preparation is read-only')
  assert.equal(f.calls.adapter, 0); assert.equal(f.calls.credentials, 0)
  const started = await f.submit(preview.value)
  assert.equal(started.ok, true, JSON.stringify(started))
  let record, run
  for (let i = 0; i < 500; i++) {
    record = await f.state(); run = Object.values(record.tasks.t.v340.runs)[0]
    if (run?.status !== 'prepared') break
    await new Promise(resolve => setTimeout(resolve, 1))
  }
  assert.equal(run.status, 'completed')
  assert.equal(run.nativeCandidate.businessSkillVersion, '0.1.3')
  assert.equal(hash(f.actualCall.system), '169bdbe8741986a7a4408506f732f73f293655014fc3d8f4a622b34012574558')
  assert.equal(run.nativeCandidate.systemSHA256, hash(f.actualCall.system))
  const sent = JSON.parse(f.actualCall.messages[0].content[0].text)
  assert.equal(sent.values.disclosure_text, '公开合成阀体：壳体内置弹簧与阀芯。')
  assert.equal(sent.receipts.disclosure_text.sha256, hash(sent.values.disclosure_text))
  parseStoredWorkbenchRecord('w', structuredClone(record))
  assert.equal(f.calls.adapter, 1); assert.equal(f.h.seen.prepare, 0)
  assert.equal((await f.submit(preview.value)).ok, true)
  assert.equal(f.calls.adapter, 1)
  assert.equal(f.calls.credentials, 0); assert.equal(f.calls.network, 0)
  if(process.env.OASIS_M06_CONTROLLED_HOST_EVIDENCE_DIR)await writeFile(join(process.env.OASIS_M06_CONTROLLED_HOST_EVIDENCE_DIR,'registered-host-observation.json'),
    JSON.stringify({scope:'REGISTERED_FETCH_AND_INSTALLED_SDK_OFFLINE_NOT_ACTUAL_APP_OR_REAL_PROVIDER',
      catalog,preview,preparedResponse:started,record,actualSystem:f.actualCall.system,
      actualRequest:f.actualCall.messages[0].content[0].text,actualMessageId:f.actualCall.messages[0].id,
      counts:{...f.calls},harnessFakePrepare:f.h.seen.prepare,registeredPaths:[...f.routes.keys()]},null,2)+'\n',{flag:'wx'})
  await f.dispose(); assert.equal(f.routes.size, 0); assert.equal(f.calls.tools, 0)
})

test('the explicit package subpath loads the controlled Host while the ordinary export stays distinct',async()=>{
  const module=await import('oasis-professional-service/m06-controlled-host-013')
  assert.equal(module.apply,controlled.apply);assert.notEqual(module.apply,applyDefault)
  assert.ok(['llm','sessions','sessionProjections','agentDefaultModel'].every(id=>module.inject.includes(id)))
})

test('controlled entry refuses missing native context before routes or credentials',async t=>{
  let capture
  await assert.rejects(()=>host(t,{beforeApply(ctx,calls,routes){capture={calls,routes};ctx.sessions=undefined}}),/M06受控入口需要/)
  assert.equal(capture.routes.size,0);assert.equal(capture.calls.credentials,0);assert.equal(capture.calls.adapter,0)
})

test('controlled entry never falls back to legacy fixture mode even at a non-admitted fixture path',async t=>{
  const old=process.env.OASIS_UNIFIED_FIXTURE;process.env.OASIS_UNIFIED_FIXTURE='1'
  let capture
  try{
    await assert.rejects(()=>host(t,{beforeApply(_ctx,calls,routes){capture={calls,routes}}}),/不能混用旧合成模式/)
    assert.equal(capture.routes.size,0);assert.equal(capture.calls.credentials,0);assert.equal(capture.calls.adapter,0)
  }finally{if(old===undefined)delete process.env.OASIS_UNIFIED_FIXTURE;else process.env.OASIS_UNIFIED_FIXTURE=old}
})

test('controlled Host rejects route drift and incomplete confirmation before persistence or SDK dispatch', async t => {
  const f = await host(t), preview = await f.preview()
  assert.equal(preview.ok, true)
  const before = await f.state()
  const missing = await f.submit(preview.value, { candidate: undefined })
  assert.equal(missing.ok, false); assert.equal(missing.error.code, 'bad-request')
  f.h.route.model = 'different-after-confirmation'
  const changed = await f.submit(preview.value)
  assert.equal(changed.ok, false)
  assert.deepEqual(await f.state(), before)
  assert.equal(f.calls.adapter, 0); assert.equal(f.calls.credentials, 0)
})

test('controlled preparation rejects stale revision, API source and unsupported node without a call', async t => {
  const f = await host(t)
  assert.equal((await f.preview({ expectedRevision: 0 })).ok, false)
  let current = await f.state(), draft = structuredClone(current.tasks.t.v340.draft)
  draft.source = 'oasis-api'
  assert.equal((await f.rpc('workflow/v340/task/draft', { workspaceId: 'w', taskId: 't', expectedRevision: current.revision, draft })).ok, true)
  assert.equal((await f.preview()).ok, false)
  current = await f.state()
  assert.equal((await f.rpc('workflow/v340/task/create', { workspaceId: 'w', taskId: 'other', expectedRevision: current.revision,
    nodeId: 'Flow-2-7', title: 'outside controlled candidate' })).ok, true)
  assert.equal((await f.preview({ taskId: 'other' })).ok, false)
  assert.equal(f.calls.adapter, 0); assert.equal(f.calls.credentials, 0)
})
