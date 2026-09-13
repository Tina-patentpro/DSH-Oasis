import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeOasisOrigin, normalizeOasisFileUrl } from '../src/oasis-origin-policy.js'
import { normalizeOasisRuntimeConfig } from '../src/oasis-runtime-config.js'
import { createOasisApiClient } from '../src/oasis-api-contract.js'

const origin = 'https://lzhxpy.oasisintwrite.com'

test('production origin requires explicit mode and exact HTTPS default port', () => {
  assert.throws(() => normalizeOasisOrigin(origin), /production/)
  assert.equal(normalizeOasisOrigin(origin, 'API', 'production'), origin)
  for (const url of ['http://lzhxpy.oasisintwrite.com', `${origin}:444`, 'https://other.example', 'https://118.190.217.223']) {
    assert.throws(() => normalizeOasisOrigin(url, 'API', 'production'))
  }
  assert.throws(() => normalizeOasisOrigin('https://test.example', 'API', 'invalid'))
})

test('runtime retains explicit mode without borrowing a credential origin', () => {
  const config = normalizeOasisRuntimeConfig({ environmentKind: 'production', apiBaseUrl: origin })
  assert.equal(config.environmentKind, 'production')
  assert.equal(config.credentialBound, false)
  assert.equal(normalizeOasisRuntimeConfig({ environmentKind: 'production', apiBaseUrl: origin, credentialOrigin: origin }).credentialBound, true)
  assert.throws(() => normalizeOasisRuntimeConfig({ apiBaseUrl: origin }))
})

test('explicit online client uses fixed API and separately allowlisted HTTPS files', async () => {
  const calls = []
  const make = url => createOasisApiClient({ environmentKind: 'production', baseUrl: origin,
    downloadOrigins: ['https://files.example'], resolveToken: async () => 'synthetic-only',
    fetchImpl: async (endpoint, init) => { calls.push(endpoint); assert.equal(init.redirect, 'error'); return new Response(JSON.stringify({ data: { url } }), { status: 200 }) },
  })
  const file = { bytes: new Uint8Array([1]), fileName: 'test.txt', mediaType: 'text/plain' }
  assert.equal(await make('https://files.example/a.txt').uploadFile(file), 'https://files.example/a.txt')
  assert.equal(calls[0], `${origin}/api/user/upload`)
  for (const url of ['http://files.example/a.txt', 'https://unlisted.example/a.txt', `${origin}/a.txt?token=x`]) {
    await assert.rejects(make(url).uploadFile(file), { code: 'UNTRUSTED_REMOTE_URL' })
  }
  assert.equal(normalizeOasisFileUrl(`${origin}/a.txt`, 'production'), `${origin}/a.txt`)
  assert.throws(() => normalizeOasisFileUrl(`${origin}/a.txt`))
})
