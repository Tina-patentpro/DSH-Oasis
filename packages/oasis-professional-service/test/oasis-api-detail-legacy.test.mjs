import assert from 'node:assert/strict'
import test from 'node:test'
import { createOasisApiClient, assertNoForbiddenCredentialFields, normalizeApiDetail } from '../src/oasis-api-contract.js'

const detail = { id: 39, name: 'claims', api_type: 'Workflow', is_async: 0, price: 3, input_schema: [], output_schema: [] }
function clientFor(payload) {
  return createOasisApiClient({
    baseUrl: 'https://oasis-staging.example', resolveToken: async () => 'synthetic-only',
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => payload }),
  })
}

test('detail endpoint removes only exact empty placeholders without mutating the response', async () => {
  for (const api_key of [null, '']) for (const credentials of [null, '']) {
    for (const wrapped of [true, false]) {
      const data = Object.freeze({ ...detail, api_key, credentials })
      const payload = wrapped ? Object.freeze({ code: 200, data }) : data
      const before = structuredClone(payload)
      const result = await clientFor(payload).getApiDetail('claims')
      assert.deepEqual(result.raw, detail)
      assert.deepEqual(payload, before)
      assertNoForbiddenCredentialFields(result)
    }
  }
  assert.deepEqual((await clientFor({ data: detail }).getApiDetail('claims')).raw, detail)
})

test('detail rejects nonempty, whitespace, nonstring and nested credential values', async () => {
  for (const field of ['api_key', 'credentials']) {
    for (const value of ['SYNTHETIC_SECRET', ' ', 0, false, [], {}, undefined]) {
      await assert.rejects(clientFor({ data: { ...detail, [field]: value } }).getApiDetail('claims'), error => {
        assert.equal(error.code, 'FORBIDDEN_CREDENTIAL_FIELD')
        assert.equal(String(error).includes('SYNTHETIC_SECRET'), false)
        return true
      })
    }
  }
  for (const patch of [{ apiKey: '' }, { API_KEY: null }, { credentials: '', nested: { api_key: null } }, { input_schema: [{ credentials: '' }] }]) {
    await assert.rejects(clientFor({ data: { ...detail, ...patch } }).getApiDetail('claims'), { code: 'FORBIDDEN_CREDENTIAL_FIELD' })
  }
  await assert.rejects(clientFor({ data: detail, api_key: null }).getApiDetail('claims'), { code: 'FORBIDDEN_CREDENTIAL_FIELD' })
})

test('other response endpoints and shared validators remain strict', async () => {
  const data = { ...detail, api_key: null, credentials: '' }
  for (const call of [c => c.getUserDetail(), c => c.getCategoryCatalog(), c => c.createWorkflow({ id: 39, key: 'test', inputs: {}, apiProcess: '', folderId: 1 })]) {
    await assert.rejects(call(clientFor({ data })), { code: 'FORBIDDEN_CREDENTIAL_FIELD' })
  }
  assert.throws(() => assertNoForbiddenCredentialFields(data), { code: 'FORBIDDEN_CREDENTIAL_FIELD' })
  assert.throws(() => normalizeApiDetail({ data }), { code: 'FORBIDDEN_CREDENTIAL_FIELD' })
})

test('outbound inputs reject even empty credential placeholders before fetch', async () => {
  let calls = 0
  const client = createOasisApiClient({ baseUrl: 'https://oasis-staging.example', resolveToken: async () => 'synthetic-only', fetchImpl: async () => { calls++; throw Error('must not fetch') } })
  await assert.rejects(client.createWorkflow({ id: 39, key: 'test', inputs: { api_key: null }, apiProcess: '', folderId: 1 }), { code: 'FORBIDDEN_CREDENTIAL_FIELD' })
  assert.equal(calls, 0)
})
