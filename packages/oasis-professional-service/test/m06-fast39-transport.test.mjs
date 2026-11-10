import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createOasisApiClient, normalizeWorkflowCreateResult, normalizeWorkflowProgress } from '../src/oasis-api-contract.js'

const examples = JSON.parse(await readFile(new URL('../../../docs/business-baseline/fast39-result-contract-candidate-4/examples.json', import.meta.url)))
const fragment = { structured_result: examples.structured_result }
const key = examples.structured_result.request_key
const input = { id: 9876, key, inputs: {}, apiProcess: '', folderId: 7654 } // synthetic, no observed production defaults
function clientFor(data) {
  const requests = []
  const client = createOasisApiClient({ baseUrl: 'https://oasis-staging.example', downloadOrigins: ['https://files-staging.example'],
    resolveToken: async () => 'synthetic-test-only',
    fetchImpl: async (url, init) => { requests.push({ url, method: init.method }); return new Response(JSON.stringify({ data }), { status: 200 }) },
  })
  return { client, requests }
}

test('create transport keeps six exact output strings and provider receipt alongside legacy projection', async () => {
  const data = { id: 81, key, answer_text: '旧正文\r\n', file_url: ['https://files-staging.example/a.docx'], ...structuredClone(fragment) }
  const original = structuredClone(data), h = clientFor(data)
  const normalized = normalizeWorkflowCreateResult(data)
  assert.deepEqual(normalized.enhancedFragment, fragment)
  const received = await h.client.createWorkflow(input)
  assert.equal(received.resolved, true)
  assert.deepEqual(received.result.enhancedFragment, fragment)
  assert.equal(received.result.answerText, '旧正文\r\n')
  assert.deepEqual(received.result.fileUrls, ['https://files-staging.example/a.docx'])
  assert.deepEqual(data, original)
  assert.equal(h.requests.length, 1)
  assert.equal(new URL(h.requests[0].url).pathname, '/api/apicategories/create')
})

test('received error-only enhanced response is not erased into an unresolved legacy receipt', async () => {
  const error = { structured_result_error: structuredClone(examples.zero_claim_error) }
  const h = clientFor({ key: examples.zero_claim_error.request_key, answer_text: '', file_url: '', ...error })
  const result = await h.client.createWorkflow({ ...input, key: examples.zero_claim_error.request_key })
  assert.equal(result.resolved, true) // a response was received; not business success
  assert.deepEqual(result.result.enhancedFragment, error)
  assert.equal(result.result.answerText, '')
  assert.deepEqual(result.result.fileUrls, [])
  assert.equal(h.requests.length, 1)
})

test('mutually present fragments are rejected instead of silently choosing one', () => {
  assert.throws(() => normalizeWorkflowCreateResult({ key, answer_text: '旧正文', ...fragment,
    structured_result_error: examples.zero_claim_error }), { code: 'INVALID_RESPONSE' })
})

test('existing completed progress transport forwards the same fragment without inventing a recovery endpoint', () => {
  const progress = normalizeWorkflowProgress({ key, status: 'completed', answer_text: '正文', ...fragment }, key)
  assert.deepEqual(progress.result.enhancedFragment, fragment)
})

test('old responses keep the same normalized interface and do not gain synthesized enhancement', async () => {
  const h = clientFor({ id: 81, key, answer_text: '历史正文', file_url: '' })
  assert.deepEqual(await h.client.createWorkflow(input), { resolved: true, result: { recordId: 81, key, answerText: '历史正文', fileUrls: [] } })
  assert.equal(Object.hasOwn(normalizeWorkflowCreateResult('历史字符串'), 'enhancedFragment'), false)
})
