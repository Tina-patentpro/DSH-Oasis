import assert from 'node:assert/strict'
import test from 'node:test'
import { captureOasisRuntimeCredential, normalizeOasisRuntimeConfig } from '../src/oasis-runtime-config.js'

function fixture() {
  const settings = { environmentKind: 'non-production', apiBaseUrl: 'https://oasis-staging.example',
    credentialOrigin: 'https://oasis-staging.example', credentialRef: 'OASIS_USER_JWT',
    downloadOrigins: ['https://files-staging.example'] }
  let token = 'synthetic-account-a', reads = 0
  const credentials = { async resolve() { reads += 1; return { value: token } } }
  const scope = { get: () => settings }
  return { settings, scope, credentials, setToken: value => { token = value }, get reads() { return reads },
    capture: () => captureOasisRuntimeCredential(scope, credentials, normalizeOasisRuntimeConfig(settings)) }
}

test('S6 captured credentials never serialize and unchanged requests retain the same token', async () => {
  const f = fixture(), resolveToken = await f.capture()
  assert.equal(await resolveToken(), 'synthetic-account-a')
  assert.equal(await resolveToken(), 'synthetic-account-a')
  assert.equal(JSON.stringify({ resolveToken }), '{}')
  assert.equal(f.reads, 3)
})

for (const [key, value] of [
  ['apiBaseUrl', 'https://other-staging.example'],
  ['credentialOrigin', 'https://other-staging.example'],
  ['credentialRef', 'OTHER_USER_JWT'],
  ['environmentKind', 'production'],
  ['downloadOrigins', ['https://other-files.example']],
]) test(`S6 ${key} drift is rejected before resolving a new credential`, async () => {
  const f = fixture(), resolveToken = await f.capture(), reads = f.reads
  f.settings[key] = value
  await assert.rejects(resolveToken(), { code: 'REMOTE_RUNTIME_CHANGED' })
  assert.equal(f.reads, reads)
})

test('S6 observed account change permanently invalidates the old operation', async () => {
  const f = fixture(), resolveToken = await f.capture()
  f.setToken('synthetic-account-b')
  await assert.rejects(resolveToken(), { code: 'REMOTE_RUNTIME_CHANGED' })
  f.setToken('synthetic-account-a')
  await assert.rejects(resolveToken(), { code: 'REMOTE_RUNTIME_CHANGED' })
})

test('S6 settings changed during credential capture cannot produce a usable resolver', async () => {
  const f = fixture()
  f.credentials.resolve = async () => {
    f.settings.downloadOrigins = ['https://other-files.example']
    return { value: 'synthetic-account-a' }
  }
  await assert.rejects(f.capture(), { code: 'REMOTE_RUNTIME_CHANGED' })
})

test('S6 settings changed during per-request credential check are rejected', async () => {
  const f = fixture(), resolveToken = await f.capture()
  f.credentials.resolve = async () => {
    f.settings.apiBaseUrl = 'https://other-staging.example'
    return { value: 'synthetic-account-a' }
  }
  await assert.rejects(resolveToken(), { code: 'REMOTE_RUNTIME_CHANGED' })
})

test('S6 download order and unrelated generation preferences do not retarget the operation', async () => {
  const f = fixture()
  f.settings.downloadOrigins.push('https://second-files.example')
  const resolveToken = await f.capture()
  f.settings.downloadOrigins.reverse()
  f.settings.defaultGenerationSource = 'oasis-api'
  assert.equal(await resolveToken(), 'synthetic-account-a')
})
