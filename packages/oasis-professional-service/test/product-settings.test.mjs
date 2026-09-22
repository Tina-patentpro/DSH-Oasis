import test from 'node:test'
import assert from 'node:assert/strict'
import { createProductSettings } from '../src/client/product-settings.js'
import { OASIS_PRODUCT_ORIGIN } from '../src/oasis-account-contract.js'

test('product settings ignore old URLs, JWT references, default source and output preferences', async () => {
  let listener
  let value = { apiBaseUrl: 'https://old.invalid', environmentKind: 'non-production', credentialRef: 'OLD_TOKEN', defaultGenerationSource: 'oasis-api', outputDirectoryPrefix: 'old', localModelEnabled: false }
  const scope = { getSnapshot: () => ({ status: 'ready', mode: 'host', writable: true, value }), subscribe: fn => { listener = fn; return () => {} }, set: async (k, v) => { value = { ...value, [k]: v }; listener() } }
  let account = { authenticated: false, available: true, writable: true, accountId: null, revision: null, retryAfterSeconds: 0 }
  const controller = createProductSettings({ remote: { accountStatus: async () => account, accountLogin: async () => (account = { ...account, authenticated: true, accountId: 1, revision: 'r1' }) } })
  controller.bind({ settingsScope: { bind: () => scope }, remote: { $host: { isLoopback: true } }, connection: { isLoopback: true, generation: { getSnapshot: () => 1, subscribe: () => () => {} } } })
  await controller.refresh()
  assert.equal(controller.getSnapshot().apiBaseUrl, OASIS_PRODUCT_ORIGIN)
  assert.equal(controller.getSnapshot().defaultGenerationSource, 'local-skill')
  assert.equal(controller.getSnapshot().outputDirectoryPrefix, '')
  assert.equal(controller.getSnapshot().canSubmit, false)
  await controller.login({ mode: 'sms', phone: '13800000000', code: '123456', confirmed: true })
  assert.equal(controller.getSnapshot().canSubmit, true)
  assert.equal(controller.saveApiBaseUrl, undefined)
  assert.equal(controller.updateCredential, undefined)
  assert.equal(controller.savePreference, undefined)
  assert.equal(controller.saveLocalModelEnabled, undefined)
  value = { ...value, localModelEnabled: true }; listener()
  assert.equal(controller.getSnapshot().restartRequired, false)
  assert.equal(controller.getSnapshot().canSubmit, true)
  controller.dispose()
})
