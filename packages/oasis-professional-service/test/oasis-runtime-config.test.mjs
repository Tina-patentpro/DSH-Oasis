import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeOasisRuntimeConfig,
  OASIS_SETTINGS_NAMESPACE,
  registerOasisSettings,
  resolveOasisJwt,
} from '../src/oasis-runtime-config.js'

test('defaults to disabled non-production integration with no base URL', () => {
  assert.deepEqual(normalizeOasisRuntimeConfig({}), {
    environmentKind: 'non-production',
    apiBaseUrl: null,
    credentialRef: 'OASIS_USER_JWT',
    downloadOrigins: [],
    remoteEnabled: false,
  })
})

test('rejects the exact production origin and keeps API and download origins separate', () => {
  assert.throws(
    () => normalizeOasisRuntimeConfig({ apiBaseUrl: 'https://lzhxpy.oasisintwrite.com' }),
    /production/i,
  )
  assert.deepEqual(normalizeOasisRuntimeConfig({
    environmentKind: 'non-production',
    apiBaseUrl: 'https://oasis-staging.example/',
    credentialRef: 'OASIS_TEST_JWT',
    downloadOrigins: ['https://files-staging.example/'],
  }), {
    environmentKind: 'non-production',
    apiBaseUrl: 'https://oasis-staging.example',
    credentialRef: 'OASIS_TEST_JWT',
    downloadOrigins: ['https://files-staging.example'],
    remoteEnabled: true,
  })
})

test('registers a restart-applied DSH settings namespace without embedding a URL or secret', () => {
  let registration
  const scope = { get: () => ({}) }
  const ctx = {
    settings: {
      register(ns, schema, options) {
        registration = { ns, schema, options }
        return scope
      },
    },
  }
  assert.equal(registerOasisSettings(ctx), scope)
  assert.equal(registration.ns, OASIS_SETTINGS_NAMESPACE)
  assert.equal(registration.options.applies, 'restart')
  assert.equal(registration.options.base.apiBaseUrl, '')
  assert.equal(JSON.stringify(registration.options.base).includes('Bearer '), false)
})

test('resolves the referenced JWT once per operation and never caches it', async () => {
  const refs = []
  const credentials = {
    async resolve(ref) {
      refs.push(String(ref))
      return { value: `jwt-${refs.length}`, source: 'test' }
    },
  }
  assert.equal(await resolveOasisJwt(credentials, 'OASIS_TEST_JWT'), 'jwt-1')
  assert.equal(await resolveOasisJwt(credentials, 'OASIS_TEST_JWT'), 'jwt-2')
  assert.deepEqual(refs, ['OASIS_TEST_JWT', 'OASIS_TEST_JWT'])
})
