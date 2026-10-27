import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { createRequire } from 'node:module'

const asset = new URL('../../patches/desktop-2.0.17/host-file-path-bridge.js', import.meta.url)
function boot(scope) {
  // Before the repair, the page has no compatibility bootstrap at all.
  let code = ''
  try { code = readFileSync(asset, 'utf8') } catch (error) { if (error.code !== 'ENOENT') throw error }
  runInNewContext(code, scope)
  return scope
}

test('selected disk File reaches the existing native resolver with its receiver and Unicode path unchanged', () => {
  const selected = new File(['public'], '公开.md')
  const native = { getPathForFile(file) {
    assert.equal(this, native)
    if (file !== selected) throw new TypeError('not the selected disk File')
    return '/public/工程/公开.md'
  } }
  const scope = boot({ dshDesktop: { protocolVersion: 1 }, __DSH_DESKTOP_FILE_PATH__: native })
  assert.equal(typeof scope.__DSH_HOST_PATHS__?.pathFor, 'function')
  assert.equal(scope.__DSH_HOST_PATHS__.pathFor(selected), '/public/工程/公开.md')
})

test('Windows native paths are forwarded without Unix-only normalization', () => {
  const selected = new File(['public'], '公开.md')
  const scope = boot({ dshDesktop: { protocolVersion: 1 }, __DSH_DESKTOP_FILE_PATH__: {
    getPathForFile(file) { if (file !== selected) throw Error('foreign File'); return String.raw`C:\公开\公开.md` },
  } })
  assert.equal(scope.__DSH_HOST_PATHS__?.pathFor(selected), String.raw`C:\公开\公开.md`)
})

test('ordinary Web or missing native capability leaves the upstream upload path untouched', () => {
  for (const scope of [{}, { dshDesktop: { protocolVersion: 1 } }, { __DSH_DESKTOP_FILE_PATH__: { getPathForFile() { throw Error('must not call') } } }]) {
    boot(scope)
    assert.equal(Object.hasOwn(scope, '__DSH_HOST_PATHS__'), false)
  }
})

test('an existing host-path owner is preserved without invoking the Desktop capability', () => {
  const existing = { pathFor: () => '/existing/owner.md' }
  const scope = boot({ dshDesktop: { protocolVersion: 1 }, __DSH_HOST_PATHS__: existing,
    __DSH_DESKTOP_FILE_PATH__: { getPathForFile() { throw Error('must not replace owner') } },
  })
  assert.equal(scope.__DSH_HOST_PATHS__, existing)
  assert.equal(scope.__DSH_HOST_PATHS__.pathFor(new File([], 'x')), '/existing/owner.md')
})

test('empty native path stays empty instead of guessing from the browser File name', () => {
  const scope = boot({ dshDesktop: { protocolVersion: 1 }, __DSH_DESKTOP_FILE_PATH__: { getPathForFile: () => '' } })
  assert.equal(scope.__DSH_HOST_PATHS__?.pathFor(new File(['public'], '/invented/path.md')), '')
})

test('native File rejection propagates rather than falling back to a fabricated path', () => {
  const nativeError = new TypeError('not a disk-backed File')
  const scope = boot({ dshDesktop: { protocolVersion: 1 }, __DSH_DESKTOP_FILE_PATH__: { getPathForFile() { throw nativeError } } })
  assert.throws(() => scope.__DSH_HOST_PATHS__?.pathFor({ name: '/arbitrary/string.md' }), error => error === nativeError)
})

test('bootstrap is idempotent and cannot replace its installed capability object', () => {
  const scope = boot({ dshDesktop: { protocolVersion: 1 }, __DSH_DESKTOP_FILE_PATH__: { getPathForFile: () => '' } })
  const installed = scope.__DSH_HOST_PATHS__
  assert.equal(typeof installed?.pathFor, 'function')
  boot(scope)
  assert.equal(scope.__DSH_HOST_PATHS__, installed)
  assert.equal(Object.isFrozen(installed), true)
  assert.equal(Object.getOwnPropertyDescriptor(scope, '__DSH_HOST_PATHS__').writable, false)
})

test('the public index-inject event emits the working bootstrap as a head script', async () => {
  const host = await import('../../patches/desktop-2.0.17/host-file-path-bridge.mjs')
  assert.equal(typeof host.apply, 'function')
  const require = createRequire(new URL('../../packages/oasis-professional-service/package.json', import.meta.url))
  const { Context } = require('@deepseek-ai/cordis')
  const ctx = new Context()
  host.apply(ctx)
  const rows = []
  ctx.emit('webserver/index-inject', rows)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].kind, 'script')
  assert.equal(rows[0].placement, 'head')
  const scope = { dshDesktop: { protocolVersion: 1 }, __DSH_DESKTOP_FILE_PATH__: { getPathForFile: () => '/public/selected.md' } }
  runInNewContext(rows[0].text, scope)
  assert.equal(scope.__DSH_HOST_PATHS__?.pathFor(new File([], 'selected.md')), '/public/selected.md')
})
