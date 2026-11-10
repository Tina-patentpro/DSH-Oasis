import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { openOasisWorkbenchRepository } from '../src/workbench-repository.js'
import { parseWorkbenchRecord } from '../src/workbench-domain.js'
import { inspectM06Fast39Fragment, assertM06Fast39RecordCapacity } from '../src/m06-fast39-result.js'
import { storageFixture } from './m06-fast39-storage-fixture.mjs'
const examples = JSON.parse(await readFile(new URL('../../../docs/business-baseline/fast39-result-contract-candidate-4/examples.json', import.meta.url)))

test('strict existing execution owner admits C4 error evidence and refuses contradictory status, key or duplicate owner', async t => {
  const h = await storageFixture(t, examples), state = structuredClone(h.record()), execution = state.tasks['task-a'].remoteExecutions['execution-fast39']
  const r = inspectM06Fast39Fragment({ fragment: { structured_result_error: { ...examples.zero_claim_error, request_key: execution.requestKey } },
    requestKey: execution.requestKey, frozenDeliverySha256: h.delivery.frozenDeliverySha256, originalEnqueueFact: 'unknown' })
  Object.assign(execution, { status: 'failed', fast39Result: r.evidence, safeError: { code: r.code, message: '合成错误' } })
  assert.doesNotThrow(() => parseWorkbenchRecord('workspace-a', state))
  for (const change of [x => { x.status = 'submission-unknown' }, x => { x.fast39Result.fragment.structured_result_error.request_key = 'foreign' },
    x => { x.fast39Result.raw_response_sha256 = 'a'.repeat(64) }, x => { x.fast39Result.received_outputs = { invented: 'not an output' } }]) {
    const bad = structuredClone(state); change(bad.tasks['task-a'].remoteExecutions['execution-fast39'])
    assert.throws(() => parseWorkbenchRecord('workspace-a', bad))
  }
})

test('real transport → C4 consumer → repository → serialized reopen preserves six outputs and old response hash meaning', async t => {
  const h = await storageFixture(t, examples)
  assert.equal(typeof h.service.acceptFast39Response, 'function')
  const response = await h.transport(), r = await h.service.acceptFast39Response(h.command(response.result))
  assert.equal(r.committed, true); assert.equal(h.execution().status, 'completed')
  assert.deepEqual(h.execution().fast39Result.fragment, h.fragment)
  const task = h.record().tasks['task-a'], run = task.runs[task.activeRunId]
  assert.equal(run.result.answerText, h.outputs.output)
  assert.equal(run.review.status, 'not-reviewed')
  assert.notEqual(run.result.responseSha, h.fragment.structured_result.provider_response_receipt.sha256)
  assert.equal(Object.hasOwn(run, 'fast39Result'), false)
  const before = readFileSync(h.file)
  await h.repository.close(); h.repository = await openOasisWorkbenchRepository(h.storageDomain)
  assert.deepEqual(h.execution().fast39Result.fragment.structured_result.outputs, h.outputs)
  assert.deepEqual(readFileSync(h.file), before)
  assert.equal(h.fakeCreates, 1); assert.equal(h.newRequests, 0)
})

test('default unactivated consumer refuses before credentials; exact frozen scope and current ownership are mandatory', async t => {
  const h = await storageFixture(t, examples), result = (await h.transport()).result
  assert.equal(typeof h.service.acceptFast39Response, 'function')
  const bytes = readFileSync(h.file)
  await assert.rejects(h.serviceFor(null).acceptFast39Response(h.command(result)), { code: 'FAST39_BINDING_REQUIRED' })
  for (const patch of [{ accountId: 202 }, { folderId: 1 }, { apiId: 1 }, { catalogEntryId: 1 }, { schemaHash: 'a'.repeat(64) },
    { workspaceId: 'foreign' }, { inputSha: 'a'.repeat(64) }, { workflowId: 'other' }]) {
    await assert.rejects(h.serviceFor({ ...h.delivery, ...patch }).acceptFast39Response(h.command(result)))
    assert.deepEqual(readFileSync(h.file), bytes)
  }
  h.userId = 202
  await assert.rejects(h.service.acceptFast39Response(h.command(result)), { code: 'REMOTE_ACCOUNT_MISMATCH' })
  h.userId = 101; h.workspacePath += '-changed'
  await assert.rejects(h.service.acceptFast39Response(h.command(result)), { code: 'WORKSPACE_ROOT_CHANGED' })
  assert.deepEqual(readFileSync(h.file), bytes); assert.equal(h.newRequests, 0)
})

test('pending, content failure and missing response preserve execution truth without creating runs', async t => {
  for (const kind of ['pending', 'content', 'missing']) {
    const h = await storageFixture(t, examples), result = (await h.transport()).result
    if (kind === 'pending') result.enhancedFragment = { structured_result_error: { ...examples.zero_claim_error,
      request_key: h.execution().requestKey, phase: 'execution', provider_status: 'running', execution_outcome: 'pending', code: 'FAST39_PROVIDER_PENDING' } }
    if (kind === 'content') result.enhancedFragment.structured_result.outputs.claims_text = ''
    if (kind === 'missing') delete result.enhancedFragment
    await h.service.acceptFast39Response(h.command(result))
    assert.equal(h.execution().status, kind === 'content' ? 'failed' : 'submission-unknown')
    assert.deepEqual(h.record().tasks['task-a'].runOrder, [])
    if (kind === 'content') assert.equal(h.execution().fast39Result.fragment.structured_result_error.execution_outcome, 'succeeded')
    if (kind === 'missing') assert.equal(Object.hasOwn(h.execution(), 'fast39Result'), false)
    assert.equal(h.newRequests, 0)
  }
})

test('same receipt is idempotent and conflicting late receipt cannot replace the original owner', async t => {
  const h = await storageFixture(t, examples), result = (await h.transport()).result
  await h.service.acceptFast39Response(h.command(result))
  const bytes = readFileSync(h.file), writes = h.writes
  await h.service.acceptFast39Response(h.command(result))
  assert.equal(h.writes, writes); assert.deepEqual(readFileSync(h.file), bytes)
  const foreign = structuredClone(result); foreign.enhancedFragment.structured_result.workflow_run_id = '11111111-1111-1111-1111-111111111111'
  await assert.rejects(h.service.acceptFast39Response(h.command(foreign)))
  assert.deepEqual(readFileSync(h.file), bytes); assert.equal(h.newRequests, 0)
})

test('full serialized legacy headroom selects a small hash-only error instead of truncating or creating an artifact', async t => {
  const h = await storageFixture(t, examples), result = (await h.transport()).result
  await h.pad(1048576 - 4500)
  const originalOutput = structuredClone(result.enhancedFragment.structured_result.outputs)
  await h.service.acceptFast39Response(h.command(result))
  assert.equal(h.execution().status, 'failed')
  assert.equal(h.execution().safeError.code, 'FAST39_RESULT_TOO_LARGE')
  assert.equal(h.execution().fast39Result.fragment.structured_result_error.retention, 'hash_only_not_persisted')
  assert.equal(Object.hasOwn(h.execution().fast39Result, 'received_outputs'), false)
  assert.deepEqual(h.record().tasks['task-a'].runOrder, [])
  assert.deepEqual(result.enhancedFragment.structured_result.outputs, originalOutput)
  assert.ok(Buffer.byteLength(JSON.stringify(h.record())) <= 1048576)
})

test('if even the small receipt cannot fit, preserve exact pre-dispatch bytes and require manual handling', async t => {
  const h = await storageFixture(t, examples), result = (await h.transport()).result
  await h.pad(1048576 - 100)
  const before = readFileSync(h.file), writes = h.writes
  await assert.rejects(h.service.acceptFast39Response(h.command(result)), { code: 'FAST39_RESULT_PERSISTENCE_FAILED' })
  assert.deepEqual(readFileSync(h.file), before); assert.equal(h.writes, writes)
  assert.equal(h.execution().status, 'submitting'); assert.equal(h.newRequests, 0)
})

test('revision conflict and actual disk failure cannot overwrite or silently retry a received result', async t => {
  const h = await storageFixture(t, examples), result = (await h.transport()).result
  const command = h.command(result), before = readFileSync(h.file)
  const conflict = await h.service.acceptFast39Response({ ...command, expectedRevision: command.expectedRevision - 1 })
  assert.equal(conflict.committed, false); assert.deepEqual(readFileSync(h.file), before)
  h.failWrites = true
  await assert.rejects(h.service.acceptFast39Response(command), /synthetic disk failure/)
  assert.deepEqual(readFileSync(h.file), before); assert.equal(h.newRequests, 0)
})

test('serialized normal evidence rechecks its reported anchor hash and C4 rendering independently of legacy projection', async t => {
  const h = await storageFixture(t, examples), result = (await h.transport()).result
  await h.service.acceptFast39Response(h.command(result))
  for (const change of [normal => {
    const report = JSON.parse(normal.outputs.quality_report); report.outline_anchor.sha256 = 'a'.repeat(64)
    normal.outputs.quality_report = JSON.stringify(report)
  }, normal => { normal.outputs.output += '\n未与原结果配对的文字' }]) {
    const tampered = structuredClone(h.record()); change(tampered.tasks['task-a'].remoteExecutions['execution-fast39'].fast39Result.fragment.structured_result)
    assert.throws(() => parseWorkbenchRecord('workspace-a', tampered))
  }
})

test('sealed pending receipt is preserved through continue/stop and later legacy results are not queried', async t => {
  const h = await storageFixture(t, examples), result = (await h.transport()).result
  result.enhancedFragment = { structured_result_error: { ...examples.zero_claim_error, request_key: h.execution().requestKey,
    phase: 'execution', provider_status: 'running', execution_outcome: 'pending', code: 'FAST39_PROVIDER_PENDING' } }
  await h.service.acceptFast39Response(h.command(result))
  const bytes = readFileSync(h.file)
  await h.service.continue(h.command(result)); await h.service.stop(h.command(result))
  assert.deepEqual(readFileSync(h.file), bytes); assert.equal(h.newRequests, 0)
  await assert.rejects(h.service.acceptFast39Response(h.command((await h.transport()).result)), { code: 'FAST39_RECEIPT_ALREADY_RECORDED' })
  assert.deepEqual(readFileSync(h.file), bytes)
})

test('captured context cannot be changed by caller edits and ownership is rechecked after awaits', async t => {
  const h = await storageFixture(t, examples), result = (await h.transport()).result
  h.delivery.accountId = 202; h.delivery.packetText += '\n'
  await h.service.acceptFast39Response(h.command(result))
  assert.equal(h.execution().status, 'completed')
  const other = await storageFixture(t, examples), response = (await other.transport()).result, bytes = readFileSync(other.file)
  other.runtime.assertCurrent = async () => { other.workspacePath += '-changed' }
  await assert.rejects(other.service.acceptFast39Response(other.command(response)), { code: 'WORKSPACE_ROOT_CHANGED' })
  assert.deepEqual(readFileSync(other.file), bytes)
})

test('a parallel revision committed while authority is checked is preserved without result overwrite', async t => {
  const h = await storageFixture(t, examples), result = (await h.transport()).result, command = h.command(result)
  h.runtime.assertCurrent = async () => {
    await h.repository.mutate('workspace-a', h.record().revision, current => {
      const next = structuredClone(current); next.tasks['task-a'].title = '并行修改保留'; return next
    })
  }
  const r = await h.service.acceptFast39Response(command)
  assert.equal(r.committed, false); assert.equal(h.record().tasks['task-a'].title, '并行修改保留')
  assert.equal(h.execution().status, 'submitting'); assert.equal(h.newRequests, 0)
})

test('foreign response keys and invalid receipt status do not mutate original storage', async t => {
  const h = await storageFixture(t, examples), result = (await h.transport()).result, bytes = readFileSync(h.file)
  for (const change of [r => { r.key = 'other-request' },
    r => { r.enhancedFragment.structured_result.provider_response_receipt.http_status = 403 }]) {
    const changed = structuredClone(result); change(changed)
    await assert.rejects(h.service.acceptFast39Response(h.command(changed)))
    assert.deepEqual(readFileSync(h.file), bytes)
  }
})

test('whole workspace byte overflow is classified before schema parsing so bounded receipt fallback remains possible', () => {
  // Capacity-owner probe only: the large opaque v340 container is deliberately
  // not a product fixture. It proves 8MiB classification, not schema acceptance.
  const candidate = { schemaVersion: 4, workspaceId: 'capacity-probe', tasks: { probe: { v340: { opaque: '汉'.repeat(2800000) } } } }
  assert.throws(() => assertM06Fast39RecordCapacity(candidate), { code: 'FAST39_RESULT_TOO_LARGE' })
})

test('receive-only persistence shares the workspace guard with import and binding changes', async t => {
  const h = await storageFixture(t, examples), result = (await h.transport()).result, bytes = readFileSync(h.file)
  await h.workspaceOperations.run('workspace-a', async () => {
    await assert.rejects(h.service.acceptFast39Response(h.command(result)), { code: 'WORKSPACE_OPERATION_BUSY' })
    assert.deepEqual(readFileSync(h.file), bytes)
  })
  await h.service.acceptFast39Response(h.command(result))
  assert.equal(h.execution().status, 'completed'); assert.equal(h.newRequests, 0)
})
