import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import * as api from '../src/m06-fast39-result.js'

const x = JSON.parse(await readFile(new URL('../../../docs/business-baseline/fast39-result-contract-candidate-4/examples.json', import.meta.url)))
const clone = value => structuredClone(value)
const options = () => ({ fragment: { structured_result: clone(x.structured_result) }, requestKey: x.structured_result.request_key,
  frozenDeliverySha256: 'b'.repeat(64), originalEnqueueFact: 'unknown', registry: clone(x.source_registry_internal) })
function inspect(patch = {}) { return api.inspectM06Fast39Fragment({ ...options(), ...patch }) }
function errorFragment(patch) { return { structured_result_error: { ...clone(x.zero_claim_error), ...patch } } }

test('normal evidence keeps exactly one original six-string fragment and only backend-reported byte receipt', () => {
  assert.equal(typeof api.inspectM06Fast39Fragment, 'function')
  const input = options(), before = clone(input), result = api.inspectM06Fast39Fragment(input)
  assert.equal(result.status, 'completed')
  assert.equal(result.code, null)
  assert.deepEqual(result.evidence.fragment, input.fragment)
  assert.equal(result.evidence.frozen_delivery_sha256, 'b'.repeat(64))
  assert.equal(result.evidence.original_enqueue_fact, 'unknown')
  assert.equal(result.evidence.validation.provider_receipt, 'backend_reported_bytes_not_recomputed_by_client')
  assert.equal(result.evidence.validation.anchor, 'reported_self_consistent_original_outline_not_independently_available')
  assert.equal(result.evidence.validation.support, 'not_assessed')
  assert.equal(Object.hasOwn(result.evidence, 'received_outputs'), false)
  assert.equal(Object.hasOwn(result.evidence, 'raw_response_sha256'), false)
  assert.equal(Object.hasOwn(result.evidence, 'quality_report'), false)
  assert.deepEqual(input, before)
})

test('execution and correlation states take precedence over content and never fabricate a completed artifact', () => {
  for (const [provider_status, execution_outcome, code, status] of [
    ['failed', 'failed', 'FAST39_PROVIDER_FAILED', 'failed'],
    ['stopped', 'failed', 'FAST39_PROVIDER_STOPPED', 'failed'],
    ['running', 'pending', 'FAST39_PROVIDER_PENDING', 'submission-unknown'],
    ['unknown', 'unknown', 'FAST39_PROVIDER_STATUS_UNKNOWN', 'submission-unknown'],
  ]) {
    const fragment = errorFragment({ phase: 'execution', provider_status, execution_outcome, code })
    const r = inspect({ fragment })
    assert.equal(r.status, status); assert.equal(r.code, code)
    assert.deepEqual(r.evidence.fragment, fragment)
  }
  const r = inspect({ fragment: errorFragment({ phase: 'correlation', provider_status: 'failed', execution_outcome: 'uncorrelated',
    workflow_run_id: null, code: 'FAST39_RUN_ID_INVALID' }) })
  assert.equal(r.status, 'submission-unknown')
})

test('invalid phase/outcome/code combinations and non-2xx provider receipts are refused', () => {
  assert.equal(typeof api.inspectM06Fast39Fragment, 'function')
  for (const patch of [{ phase: 'content', provider_status: 'failed' }, { phase: 'execution', code: 'FAST39_NO_SUPPORTED_CLAIM' },
    { phase: 'correlation', workflow_run_id: x.structured_result.workflow_run_id }, { raw_response_sha256: 'a'.repeat(64) }]) {
    assert.throws(() => inspect({ fragment: errorFragment(patch) }), { code: 'FAST39_RESULT_FIELDS_INVALID' })
  }
  for (const status of [199, 300, 401, 403]) {
    const o = options(); o.fragment.structured_result.provider_response_receipt.http_status = status
    assert.throws(() => api.inspectM06Fast39Fragment(o), { code: 'FAST39_RESULT_FIELDS_INVALID' })
  }
})

test('missing response has no enhanced receipt and does not imply cancellation or retry', () => {
  assert.equal(typeof api.inspectM06Fast39Fragment, 'function')
  const r = inspect({ fragment: undefined })
  assert.equal(r.status, 'submission-unknown'); assert.equal(r.evidence, null)
  assert.equal(r.code, 'FAST39_RESPONSE_UNAVAILABLE')
})

test('request/run binding conflicts cannot record another execution receipt', () => {
  assert.equal(typeof api.inspectM06Fast39Fragment, 'function')
  assert.throws(() => inspect({ requestKey: 'other-request' }), { code: 'FAST39_BINDING_MISMATCH' })
  assert.throws(() => inspect({ expectedWorkflowRunId: '11111111-1111-1111-1111-111111111111' }), { code: 'FAST39_BINDING_MISMATCH' })
  const o = options(); o.fragment.structured_result.workflow_run_id = 'not-a-run-id'
  assert.throws(() => api.inspectM06Fast39Fragment(o), { code: 'FAST39_RESULT_FIELDS_INVALID' })
})

test('client content error preserves provider succeeded and the exact received strings without defaults', () => {
  const o = options(); o.fragment.structured_result.outputs.claims_text = ''
  const r = api.inspectM06Fast39Fragment(o), e = r.evidence
  assert.equal(r.status, 'failed'); assert.equal(r.code, 'FAST39_NO_SUPPORTED_CLAIM')
  assert.equal(e.fragment.structured_result_error.provider_status, 'succeeded')
  assert.equal(e.fragment.structured_result_error.execution_outcome, 'succeeded')
  assert.equal(e.fragment.structured_result_error.retention, 'enhanced_fragment_preserved')
  assert.deepEqual(e.received_outputs, o.fragment.structured_result.outputs)
  const p = options(); delete p.fragment.structured_result.outputs.dependency_tree
  p.fragment.structured_result.outputs.injected = 'not an output'
  const r2 = api.inspectM06Fast39Fragment(p)
  assert.equal(Object.hasOwn(r2.evidence.received_outputs, 'dependency_tree'), false)
  assert.equal(Object.hasOwn(r2.evidence.received_outputs, 'injected'), false)
})

test('oversized or escaped-overflow output subsets are dropped whole, with bounded hash-only error evidence', () => {
  for (const text of ['汉'.repeat(90000), '😀'.repeat(50001)]) {
    const o = options(); o.fragment.structured_result.outputs.claims_text = text
    const before = clone(o.fragment), r = api.inspectM06Fast39Fragment(o)
    assert.equal(r.status, 'failed'); assert.equal(r.code, 'FAST39_RESULT_TOO_LARGE')
    assert.equal(r.evidence.fragment.structured_result_error.retention, 'hash_only_not_persisted')
    assert.equal(Object.hasOwn(r.evidence, 'received_outputs'), false)
    assert.equal(r.evidence.validation.capacity, 'rejected')
    assert.deepEqual(o.fragment, before)
  }
  const o = options()
  for (const key of Object.keys(o.fragment.structured_result.outputs)) o.fragment.structured_result.outputs[key] = '\t'.repeat(99000)
  const r = api.inspectM06Fast39Fragment(o)
  assert.equal(Object.hasOwn(r.evidence, 'received_outputs'), false)
  assert.equal(r.evidence.fragment.structured_result_error.retention, 'hash_only_not_persisted')
  assert.ok(Buffer.byteLength(JSON.stringify(r.evidence)) < 4096)
})

test('capacity fallback retains original execution phase/outcome for nonterminal receipts', () => {
  const r = inspect({ fragment: errorFragment({ phase: 'execution', provider_status: 'running', execution_outcome: 'pending', code: 'FAST39_PROVIDER_PENDING' }) })
  const small = api.shrinkM06Fast39Evidence(r.evidence)
  assert.equal(small.fragment.structured_result_error.phase, 'execution')
  assert.equal(small.fragment.structured_result_error.execution_outcome, 'pending')
  assert.equal(small.fragment.structured_result_error.code, 'FAST39_PROVIDER_PENDING')
  assert.equal(small.fragment.structured_result_error.retention, 'hash_only_not_persisted')
  assert.equal(small.validation.capacity, 'rejected')
})
