import test from 'node:test'
import assert from 'node:assert/strict'
import { createOasisAccountService, OASIS_PRODUCT_ORIGIN } from '../src/oasis-account.js'

function harness(fetchImpl) {
  let record
  const credentials = {
    readRecord: async () => record,
    describeRecord: async () => ({ configured: !!record, writable: true }),
    modifyRecord: async (_, mutate) => { record = await mutate(record) ?? record },
    deleteRecord: async () => { record = undefined },
  }
  return { service: createOasisAccountService({ credentials, fetchImpl }), credentials, record: () => record }
}
test('login uses fixed website routes and stores secrets only in Host credentials', async () => {
  const calls = []
  const h = harness(async (url, options) => {
    calls.push({ url, options })
    return Response.json({ code: 200, data: { id: 17, username: 'tester', token: 'secret-jwt' } })
  })
  assert.equal((await h.service.status()).authenticated, false)
  assert.equal(calls.length, 0)
  const result = await h.service.login({ mode: 'password', phone: '13800000000', password: 'password', confirmed: true })
  assert.equal(calls[0].url, OASIS_PRODUCT_ORIGIN + '/api/auth/pwdlogin')
  assert.equal(calls[0].options.redirect, 'error')
  assert.deepEqual(JSON.parse(calls[0].options.body), { phone: '13800000000', password: 'password' })
  assert.equal(result.authenticated, true)
  assert.equal(JSON.stringify(result).includes('secret-jwt'), false)
  assert.equal(h.record().kind, 'grant')
  const resolve = await h.service.captureToken()
  assert.equal(await resolve(), 'secret-jwt')
  await h.service.logout({ confirmed: true })
  await assert.rejects(resolve, { code: 'REMOTE_RUNTIME_CHANGED' })
  assert.equal(calls.length, 1, 'logout is local only')
})

test('concurrent login is rejected and credentials modified during request are not overwritten', async () => {
  let resolve
  const h = harness(() => new Promise(r => { resolve = r }))
  const input = { mode: 'password', phone: '13800000000', password: 'pw', confirmed: true }
  const pending = h.service.login(input)
  while (!resolve) await new Promise(r => setImmediate(r))
  await assert.rejects(() => h.service.login(input), { code: 'ACCOUNT_BUSY' })
  await h.credentials.modifyRecord('', () => ({ kind: 'grant', payload: { origin: OASIS_PRODUCT_ORIGIN, accountId: 3, token: 'new-secret', revision: 'newer' } }))
  resolve(Response.json({ code: 200, data: { id: 1, token: 'late-secret' } }))
  await assert.rejects(pending, { code: 'REMOTE_RUNTIME_CHANGED' })
  assert.equal(h.record().payload.token, 'new-secret')
})

test('credential write errors are sanitized and failed auth never invokes automatic retries', async () => {
  let calls = 0
  const h = harness(async () => { calls++; return Response.json({ code: 200, data: { id: 1, token: 'sensitive-token' } }) })
  h.credentials.modifyRecord = async () => { throw Error('sensitive-token') }
  await assert.rejects(() => h.service.login({ mode: 'sms', phone: '13800000000', code: '123456', confirmed: true }),
    e => e.code === 'ACCOUNT_REQUEST_FAILED' && !e.message.includes('sensitive-token'))
  assert.equal(calls, 1)
  assert.equal(h.record(), undefined)
})
test('SMS is explicit and rate limited; failures never echo remote secrets', async () => {
  let calls = 0
  const h = harness(async () => { calls++; return Response.json({ code: 500, msg: 'secret-jwt' }) })
  await assert.rejects(() => h.service.sendSms({ phone: '13800000000' }), { code: 'ACCOUNT_INVALID_INPUT' })
  assert.equal(calls, 0)
  await assert.rejects(() => h.service.sendSms({ phone: '13800000000', confirmed: true }), error => !error.message.includes('secret-jwt'))
  await assert.rejects(() => h.service.sendSms({ phone: '13800000000', confirmed: true }), { code: 'SMS_COOLDOWN' })
  assert.equal(calls, 1)
})
test('SMS login uses code and account replacement invalidates captured operations', async () => {
  let index = 0
  const h = harness(async (url, options) => {
    assert.equal(url, OASIS_PRODUCT_ORIGIN + '/api/auth/login')
    assert.deepEqual(JSON.parse(options.body), { phone: '13800000000', code: '123456' })
    return Response.json({ code: 200, data: { id: ++index, username: 'test', token: 'secret-' + index } })
  })
  await h.service.login({ mode: 'sms', phone: '13800000000', code: '123456', confirmed: true })
  const resolve = await h.service.captureToken()
  await h.service.login({ mode: 'sms', phone: '13800000000', code: '123456', confirmed: true })
  await assert.rejects(resolve, { code: 'REMOTE_RUNTIME_CHANGED' })
})
test('fixture mode prevents real authentication and malformed login does not persist', async () => {
  const h = harness(async () => Response.json({ code: 200, data: { token: 'secret-jwt' } }))
  await assert.rejects(() => h.service.login({ mode: 'password', phone: '13800000000', password: 'pw', confirmed: true }), { code: 'ACCOUNT_REQUEST_FAILED' })
  assert.equal(h.record(), undefined)
  const disabled = createOasisAccountService({ enabled: false, fetchImpl: () => { throw Error('must not call') } })
  await assert.rejects(() => disabled.sendSms({ phone: '13800000000', confirmed: true }), { code: 'ACCOUNT_UNAVAILABLE' })
})
