import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createOasisApiClient } from '../src/oasis-api-contract.js'
import { parseWorkbenchRecord, computeOasisRemoteResponseSha256 } from '../src/workbench-domain.js'
import { openOasisWorkbenchRepository } from '../src/workbench-repository.js'
import { storageFixture } from './m06-fast39-storage-fixture.mjs'

const examples = JSON.parse(readFileSync(new URL('../../../docs/business-baseline/fast39-result-contract-candidate-4/examples.json', import.meta.url)))
const bridge = fileURLToPath(new URL('../../../../绿洲慧写-后台4.0/.local/fast39-shared-api-task0-20261105/tests/render_fast39_mock_response.py', import.meta.url))
const backendSource = fileURLToPath(new URL('../../../../绿洲慧写-后台4.0/.local/fast39-shared-api-task0-20261105/candidate-r1/source/', import.meta.url))

async function paired(t, change = () => {}) {
  const h = await storageFixture(t, examples), runId = examples.structured_result.workflow_run_id
  const provider = { workflow_run_id: runId, data: { id: runId, status: 'succeeded', outputs: structuredClone(h.outputs) } }
  change(provider)
  const payload = { provider_result: provider, request_key: h.execution().requestKey,
    inputs: { ...h.context.directFields, User_input: h.context.User_input,
      Technical_Disclosure_file: [{ type: 'document', transfer_method: 'remote_url', url: h.execution().uploadedFiles[0].url }] },
    api_process: h.delivery.apiProcess, origin: h.delivery.apiBaseOrigin,
    workspace_id: h.delivery.workspaceId, frozen_delivery_sha256: h.delivery.frozenDeliverySha256 }
  const backend = JSON.parse(execFileSync('python3', [bridge], { input: JSON.stringify(payload), encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } }))
  assert.deepEqual(backend.parse_events, ['content', 'json'])
  assert.equal(backend.actual_function_source_root, backendSource.slice(0, -1))
  for (const [name, digest] of Object.entries(backend.actual_function_source_sha256)) {
    assert.equal(digest, createHash('sha256').update(readFileSync(backendSource + name)).digest('hex'))
  }
  assert.equal(backend.fake_http_posts, 1); assert.equal(backend.queued_original_saves, 1)
  assert.equal(backend.legacy_result_same_object, true); assert.equal(backend.executed_financial_tasks, 0)
  assert.equal(backend.real_network_calls, 0); assert.equal(backend.production_module_started, false)
  const fragment = backend.handler_response.structured_result ?? backend.handler_response.structured_result_error
  assert.equal(fragment.provider_response_receipt.sha256, createHash('sha256').update(backend.provider_body_utf8).digest('hex'))
  assert.equal(fragment.provider_response_receipt.byte_length, Buffer.byteLength(backend.provider_body_utf8))
  let transportPosts = 0
  const client = createOasisApiClient({ baseUrl: h.delivery.apiBaseOrigin, resolveToken: async () => 'synthetic-only',
    fetchImpl: async () => { transportPosts++; return new Response(JSON.stringify(backend.handler_response), { status: 200 }) } })
  const response = await client.createWorkflow({ id: h.delivery.apiId, key: h.execution().requestKey,
    inputs: payload.inputs, apiProcess: payload.api_process, folderId: h.delivery.folderId })
  assert.equal(transportPosts, 1)
  return { h, backend, result: response.result }
}

test('actual backend handler prefixed legacy body and six outputs survive DSH transport, persistence and cold reopen', async t => {
  const { h, backend, result } = await paired(t)
  assert.equal(result.answerText, '结果: ' + h.outputs.output)
  assert.notEqual(result.answerText, h.outputs.output)
  assert.equal((await h.service.acceptFast39Response(h.command(result))).committed, true)
  assert.equal(h.execution().status, 'completed')
  const run = h.record().tasks['task-a'].runs['run-fast39']
  assert.equal(run.result.answerText, backend.handler_response.answer_text)
  assert.deepEqual(run.result.fileUrls, [])
  assert.equal(run.result.responseSha, computeOasisRemoteResponseSha256({ answerText: result.answerText, fileUrls: [] }))
  assert.notEqual(run.result.responseSha, backend.provider_sha256)
  assert.equal(run.review.status, 'not-reviewed')
  assert.deepEqual(h.execution().fast39Result.fragment.structured_result.outputs, h.outputs)
  const bytes = readFileSync(h.file)
  await h.repository.close(); h.repository = await openOasisWorkbenchRepository(h.storageDomain)
  assert.equal(h.execution().status, 'completed'); assert.deepEqual(readFileSync(h.file), bytes)
  assert.equal(h.newRequests, 0)
  if (process.env.OASIS_FAST39_PAIRING_CAPTURE) writeFileSync(process.env.OASIS_FAST39_PAIRING_CAPTURE,
    JSON.stringify({ kind: 'synthetic backend-function-to-DSH pairing; not deployed or professional acceptance',
      backend, normalized_result: result, reopened_record: h.record() }, null, 2) + '\n')
})

test('legacy body and C4 rendering retain independent integrity checks after backend pairing', async t => {
  const { h, result } = await paired(t)
  await h.service.acceptFast39Response(h.command(result))
  for (const change of [r => { r.tasks['task-a'].runs['run-fast39'].result.answerText += '\n修改' },
    r => { r.tasks['task-a'].remoteExecutions['execution-fast39'].fast39Result.fragment.structured_result.outputs.output += '\n修改' },
    r => { r.tasks['task-a'].remoteExecutions['execution-fast39'].fast39Result.fragment.structured_result.outputs.pending_confirmation += '\n修改' }]) {
    const changed = structuredClone(h.record()); change(changed)
    assert.throws(() => parseWorkbenchRecord('workspace-a', changed))
  }
})

for (const [label, change, status, phase, code] of [
  ['known provider failure', p => { p.data.status = 'failed' }, 'failed', 'execution', 'FAST39_PROVIDER_FAILED'],
  ['pending provider', p => { p.data.status = 'running' }, 'submission-unknown', 'execution', 'FAST39_PROVIDER_PENDING'],
  ['conflicting run ID', p => { p.data.id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }, 'submission-unknown', 'correlation', 'FAST39_RUN_ID_INVALID'],
  ['invalid sixth output', p => { p.data.outputs.quality_status = null }, 'failed', 'content', 'FAST39_RESULT_FIELDS_INVALID'],
  ['zero claims', p => { p.data.outputs.claims_text = '' }, 'failed', 'content', 'FAST39_NO_SUPPORTED_CLAIM'],
  ['UTF16 overflow', p => { p.data.outputs.dependency_tree = '😀'.repeat(50001) }, 'failed', 'content', 'FAST39_RESULT_TOO_LARGE'],
]) test(`actual backend ${label} preserves original queue fact and DSH bounded error receipt without completed artifact`, async t => {
  const { h, result } = await paired(t, change)
  const response = await h.service.acceptFast39Response(h.command(result))
  assert.equal(response.committed, true); assert.equal(h.execution().status, status)
  const error = h.execution().fast39Result.fragment.structured_result_error
  assert.equal(error.phase, phase); assert.equal(error.code, code)
  assert.equal(h.execution().fast39Result.original_enqueue_fact, 'unknown')
  assert.deepEqual(h.record().tasks['task-a'].runOrder, [])
  assert.equal(h.newRequests, 0)
})
