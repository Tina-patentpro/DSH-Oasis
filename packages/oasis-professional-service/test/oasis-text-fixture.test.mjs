import assert from 'node:assert/strict'
import test from 'node:test'
import { startFixture, FIXTURE_TOKEN, FIXTURE_SERVICE } from '../../../tests/fixtures/oasis-api-phase4-server.mjs'
import { createOasisApiClient } from '../src/oasis-api-contract.js'

const textInput = () => ({
  id: FIXTURE_SERVICE.id, key: 'd2-synthetic-text-only', inputs: { topic: 'Synthetic text acceptance' },
  apiProcess: FIXTURE_SERVICE.process, folderId: FIXTURE_SERVICE.folderId,
})

test('D2 text-only service completes once with no upload or file result', async () => {
  const fixture = await startFixture({ textOnly: true })
  const client = createOasisApiClient({ baseUrl: fixture.origin, resolveToken: async () => FIXTURE_TOKEN })
  try {
    const detail = await client.getApiDetail(FIXTURE_SERVICE.endpoint)
    assert.deepEqual(detail.inputFields.map((field) => field.fieldId), ['topic'])
    const result = await client.createWorkflow(textInput())
    assert.equal(result.resolved, true)
    assert.equal(result.result.answerText, 'Synthetic Phase 4 result; no real service was called.')
    assert.deepEqual(result.result.fileUrls, [])
    assert.equal(fixture.snapshot().counts.create, 1)
    assert.equal(fixture.snapshot().counts.upload ?? 0, 0)
    assert.deepEqual(fixture.snapshot().violations, [])
  } finally { await fixture.close() }
})

test('D2 text-only lost response retains the original key without a second create', async () => {
  const fixture = await startFixture({ textOnly: true, scenario: 'lost-create' })
  const client = createOasisApiClient({ baseUrl: fixture.origin, resolveToken: async () => FIXTURE_TOKEN })
  try {
    await assert.rejects(client.createWorkflow(textInput()))
    const result = await client.queryProcess(textInput().key)
    assert.equal(result.status, 'completed')
    assert.equal(fixture.snapshot().counts.create, 1)
    assert.equal(fixture.snapshot().counts.query, 1)
    assert.equal(fixture.snapshot().counts.upload ?? 0, 0)
    assert.deepEqual(fixture.snapshot().violations, [])
  } finally { await fixture.close() }
})

test('D2 text-only refuses unexpected material; default fixture still requires material', async () => {
  for (const textOnly of [false, true]) {
    const fixture = await startFixture({ textOnly })
    try {
      const input = textInput()
      const body = { id: input.id, key: input.key, inputs: input.inputs, api_process: input.apiProcess, folder_id: input.folderId }
      if (textOnly) body.inputs.material = { type: 'document', transfer_method: 'remote_url', url: `${fixture.origin}/files/material.txt` }
      const response = await fetch(fixture.origin + '/api/apicategories/create', {
        method: 'POST', headers: { authorization: `Bearer ${FIXTURE_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(body),
      })
      assert.equal(response.status, 400)
    } finally { await fixture.close() }
  }
})
