// Offline registration check only; no App, DOM, native Host or generation starts.
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname,resolve,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import vm from 'node:vm'
const evidence=dirname(fileURLToPath(import.meta.url)),root=resolve(evidence,'../../..')
const proof=JSON.parse(readFileSync(join(evidence,'package-member-inspection.json'),'utf8'))
const require=createRequire(join(root,'packages/oasis-professional-service/package.json'))
const bundle=readFileSync(join(proof.unpack,'lib/client.js'),'utf8')
const map=JSON.parse(readFileSync(join(proof.unpack,'lib/client.js.map'),'utf8'))
for(const rel of [...proof.changed_source,...proof.new_source].filter(p=>p.startsWith('src/client/'))){
 const i=map.sources.findIndex(s=>s.endsWith('/'+rel)||s===rel)
 assert.notEqual(i,-1,`missing map input ${rel}`)
 assert.equal(map.sourcesContent[i],readFileSync(join(proof.unpack,rel),'utf8'))
}
const external=[],rpc=[],registered=[];let descriptor
const context=vm.createContext({window:{__ModuleLoader__:{load(value){descriptor=value}}},console,AbortController,structuredClone,TextEncoder,TextDecoder,setTimeout,clearTimeout})
new vm.Script(bundle,{filename:'actual-archive-client.js'}).runInContext(context)
assert.equal(descriptor.id,'oasis-professional-service')
const api=descriptor.factory(id=>{
 external.push(id)
 // Native Markdown renderer is a named injected boundary, not business logic.
 if(id==='@deepseek-ai/dsh-client-ui-primitives')return {MarkdownText:()=>null}
 assert.ok(['react','react-dom','react-dom/client','react/jsx-runtime'].includes(id),id)
 return require(id)
})
assert.equal(typeof api.apply,'function')
const dispose=api.apply({connection:{rpc:{call:async(...args)=>{rpc.push(args);throw Error('unexpected request')}}},slots:{
 inject(_name,fn){return fn()},register(options){registered.push(options.name);return()=>{}},
}})
assert.ok(registered.includes('shell.overlay'))
assert.ok(registered.includes('settings.section'))
assert.ok(registered.includes('conversation.input.right'))
assert.ok(!registered.includes('details'))
await dispose()
assert.equal(rpc.length,0)
writeFileSync(join(evidence,'compiled-client-smoke.json'),JSON.stringify({archive_sha256:proof.sha256,external,registered,rpc_count:rpc.length,source_map_matches_changed_client_source:true,native_renderer:'explicit inert test injection',evidence:'compiled registration smoke only; no DOM/App/Host acceptance'},null,2)+'\n')
console.log('compiled registration smoke passed; no RPC; changed client map inputs match archive bytes')
