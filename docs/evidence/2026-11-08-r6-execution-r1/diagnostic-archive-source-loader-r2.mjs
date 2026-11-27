// Actual candidate implementations, fixed existing peers; no source fallback.
import {registerHooks} from 'node:module'
import {readFileSync,writeFileSync} from 'node:fs'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {dirname,join,resolve} from 'node:path'
const evidence=dirname(fileURLToPath(import.meta.url)),root=resolve(evidence,'../../..')
const proof=JSON.parse(readFileSync(join(evidence,'diagnostic-candidate-identity-r2.json')))
const original=pathToFileURL(join(root,'packages/oasis-professional-service/src')+'/').href
const archived=pathToFileURL(join(proof.unpack,'src')+'/').href,peerParent=new URL('index.js',original).href,observed=new Set()
registerHooks({resolve(specifier,context,next){
 const local=/^(file:|\.|\/)/.test(specifier),url=local?new URL(specifier,context.parentURL??import.meta.url).href:null
 const mapped=url?.startsWith(original)?archived+url.slice(original.length):specifier
 const peerContext=!local&&!specifier.startsWith('node:')&&context.parentURL?.startsWith(archived)?{...context,parentURL:peerParent}:context
 let result=next(mapped,peerContext)
 if(result.url.startsWith(original))result=next(archived+result.url.slice(original.length),context)
 if(result.url.startsWith(original))throw Error('Original business implementation fallback refused')
 if(result.url.startsWith(archived))observed.add(result.url)
 return result
}})
process.on('exit',()=>writeFileSync(join(evidence,`diagnostic-r2-archive-loads-${process.pid}.json`),JSON.stringify({original,archived,loaded:[...observed].sort(),fixedPeersOnly:true,implementationStubs:false},null,2)+'\n'))
