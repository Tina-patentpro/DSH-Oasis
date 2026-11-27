const {appendFileSync}=require('node:fs')
const {join}=require('node:path')
const root=process.env.OASIS_NO_COST_ROOT
if(!root)throw Error('Missing no-cost scope')
const original=globalThis.fetch
let blocked=0
process.on('exit',()=>appendFileSync(join(root,'egress-audit.jsonl'),JSON.stringify({phase:process.env.OASIS_NO_COST_PHASE,blockedAttempts:blocked,remoteTransports:0})+'\n',{mode:0o600}))
globalThis.fetch=async(target,options)=>{
 const url=new URL(typeof target==='string'||target instanceof URL?target:target.url)
 if(url.hostname==='127.0.0.1'||url.hostname==='localhost')return original(target,options)
 blocked++
 throw Error('No-cost recovery blocks all remote requests')
}
