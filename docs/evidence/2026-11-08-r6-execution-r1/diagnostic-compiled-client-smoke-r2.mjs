// Compiled registration only; no DOM, App or Host activation.
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname,resolve,join} from 'node:path'
import {fileURLToPath} from 'node:url'
import vm from 'node:vm'
const evidence=dirname(fileURLToPath(import.meta.url)),root=resolve(evidence,'../../..')
const proof=JSON.parse(readFileSync(join(evidence,'diagnostic-candidate-identity-r2.json'))),req=createRequire(join(root,'packages/oasis-professional-service/package.json'))
const map=JSON.parse(readFileSync(join(proof.unpack,'lib/client.js.map')))
let ownSources=0,zodSources=0
for(const[i,source]of map.sources.entries()){
 const token='packages/oasis-professional-service/src/',at=source.indexOf(token)
 if(at>=0){assert.equal(map.sourcesContent[i],readFileSync(join(proof.unpack,'src',source.slice(at+token.length)),'utf8'));ownSources++}
 else{assert.ok(source.includes('/zod/'));zodSources++}
}
assert.equal(ownSources,51);assert.equal(zodSources,17)
let descriptor;const external=[],rpc=[],registered=[]
const context=vm.createContext({window:{__ModuleLoader__:{load:v=>descriptor=v}},console,AbortController,structuredClone,TextEncoder,TextDecoder,setTimeout,clearTimeout})
new vm.Script(readFileSync(join(proof.unpack,'lib/client.js'),'utf8')).runInContext(context)
const api=descriptor.factory(id=>{external.push(id);if(id==='@deepseek-ai/dsh-client-ui-primitives')return{MarkdownText:()=>null};assert.ok(['react','react-dom','react-dom/client','react/jsx-runtime'].includes(id));return req(id)})
const dispose=api.apply({connection:{rpc:{call:async(...args)=>{rpc.push(args);throw Error('unexpected request')}}},slots:{inject(_name,fn){return fn()},register(options){registered.push(options.name);return()=>{}}}})
await dispose();assert.equal(rpc.length,0);assert.ok(!registered.includes('details'))
const result={archiveSHA256:proof.archiveSHA256,ownSources,zodSources,sourceMapMatchesArchive:true,sourceMapPaths:'local build-relative paths; publication normalization not claimed',registered,external,rpcCount:0,scope:'compiled registration only, not native UI acceptance'}
writeFileSync(join(evidence,'diagnostic-compiled-client-smoke-r2.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result))
