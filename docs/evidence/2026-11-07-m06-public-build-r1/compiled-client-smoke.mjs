// VM registration only; does not start App, Host, DOM or real services.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
const evidence = dirname(fileURLToPath(import.meta.url)), root = resolve(evidence, '../../..')
const proof = JSON.parse(readFileSync(join(evidence, 'package-member-inspection.json')))
const require = createRequire(join(root, 'packages/oasis-professional-service/package.json'))
const map = JSON.parse(readFileSync(join(proof.unpack, 'lib/client.js.map')))
let ownSources = 0, zodSources = 0
for (const [i, source] of map.sources.entries()) {
  if (source.startsWith('../src/')) {
    assert.equal(map.sourcesContent[i], readFileSync(join(proof.unpack, source.slice(3)), 'utf8'))
    ownSources++
  } else { assert.ok(source.startsWith('oiw-vendor:zod/')); zodSources++ }
}
assert.ok(ownSources > 0)
assert.equal(zodSources, 17)
let descriptor
const external = [], rpc = [], registered = []
const context = vm.createContext({ window: { __ModuleLoader__: { load(value) { descriptor = value } } },
  console, AbortController, structuredClone, TextEncoder, TextDecoder, setTimeout, clearTimeout })
new vm.Script(readFileSync(join(proof.unpack, 'lib/client.js'), 'utf8'), { filename: 'public-archive-client.js' }).runInContext(context)
assert.equal(descriptor.id, 'oasis-professional-service')
const api = descriptor.factory(id => {
  external.push(id)
  if (id === '@deepseek-ai/dsh-client-ui-primitives') return { MarkdownText: () => null }
  assert.ok(['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'].includes(id), id)
  return require(id)
})
const dispose = api.apply({ connection: { rpc: { call: async (...args) => { rpc.push(args); throw Error('unexpected request') } } },
  slots: { inject(_name, fn) { return fn() }, register(options) { registered.push(options.name); return () => {} } } })
for (const name of ['shell.overlay', 'settings.section', 'conversation.input.right']) assert.ok(registered.includes(name))
assert.ok(!registered.includes('details'))
await dispose()
assert.equal(rpc.length, 0)
writeFileSync(join(evidence, 'compiled-client-smoke.json'), JSON.stringify({ archiveSHA256: proof.sha256,
  ownSources, zodSources, external, registered, rpcCount: rpc.length,
  sourceMapMatchesArchive: true, nativeRenderer: 'inert test injection', scope: 'registration only, no App/Host/UI acceptance' }, null, 2) + '\n')
console.log(`compiled archive registration PASS; ${ownSources} own map sources match; 17 Zod sources; 0 RPC`)
