import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readMacComponentInput } from './helpers/mac-component-inputs.mjs'
import vm from 'node:vm'

const require = createRequire(fileURLToPath(new URL('../packages/oasis-professional-service/package.json', import.meta.url)))
const { source } = readMacComponentInput('sidebar')
// Only expose native internals inside this test VM; no production private API use.
const code = source.replace('exports.apply = apply;', 'exports.service = createBetterSidebarService; exports.store = createSidebarStore; exports.tabs = builtinTabs; exports.leaves = allLeaves; exports.apply = apply;')
let native
const storage = new Map()
const localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) }
vm.runInNewContext(code, { console, URL, structuredClone, AbortController,
  setTimeout, clearTimeout, localStorage,
  window: { innerWidth: 1600, localStorage, setTimeout, clearTimeout, __ModuleLoader__: { load({ factory }) {
    native = factory(id => id === '@deepseek-ai/dsh-client-ui-primitives' ? {} : require(id))
  } } } })

test('safe native file opens cannot dedupe onto an ordinary preview and retain scoped metadata', () => {
  const store = native.store()
  store.setSession('session-a')
  const service = native.service(store)
  service.registerTab(native.tabs({})[0])
  service.openFile({ sessionId: 'session-a' }, '/workspace/result.md')
  service.openFile({ sessionId: 'session-a' }, '/workspace/result.md', 'Result', { safePreview: true })
  const tabs = () => native.leaves(store.getSnapshot().state.bottomSplits).flatMap(leaf => leaf.tabs).filter(tab => tab.type === 'editor' && tab.path)
  assert.equal(tabs().length, 2, 'unsafe existing preview must not receive the safe open')
  assert.equal(tabs().filter(tab => tab.meta?.safePreview === true).length, 1)
  service.openFile({ sessionId: 'session-a' }, '/workspace/result.md', 'Result', { safePreview: true })
  assert.equal(tabs().length, 2, 'repeated safe open focuses the existing safe tab')
  const roundtrip = JSON.parse(JSON.stringify(store.getSnapshot().state))
  assert.equal(native.leaves(roundtrip.bottomSplits).flatMap(leaf => leaf.tabs).some(tab => tab.meta?.safePreview === true), true)
  service.openFile({ sessionId: 'session-b' }, '/other/result.md', 'Other', { safePreview: true })
  assert.equal(tabs().some(tab => tab.path === '/other/result.md'), false)
  assert.ok(service.features.includes('safeFilePreview'))
})
