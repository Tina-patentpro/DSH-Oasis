import fs from 'node:fs'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const project=process.cwd(),evidence=join(project,'docs/evidence/2026-11-08-r6-execution-r1')
const id=JSON.parse(fs.readFileSync(join(evidence,'native-proxy-fix-bundle-identity.json'))),root=id.fixedRoot
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const protectedPaths=['data/home/storages/oasis_workbench.json','data/home/.credentials.yaml']
const before=Object.fromEntries(protectedPaths.map(p=>[p,hash(join(root,p))]))
fs.writeFileSync(join(evidence,'native-proxy-fix-install-intent.json'),JSON.stringify({id,before,AppStarts:0,realModelCalls:0,newCallAuthorization:false},null,2)+'\n',{flag:'wx'})
const {handoffFInstalledController}=await import(pathToFileURL(join(project,'scripts/f-installed-controller-handoff.mjs')))
const handoff=await handoffFInstalledController({root,expectedCurrent:id.previousBundleSHA256,expectedOldControllerSHA256:id.previousControllerSHA256,bundle:id.bundle,expectedBundleSHA256:id.bundleSHA256,expectedNewControllerSHA256:id.controllerSHA256})
fs.writeFileSync(join(evidence,'native-proxy-fix-controller-handoff.json'),JSON.stringify(handoff,null,2)+'\n',{flag:'wx'})
const api=await import(pathToFileURL(join(root,'control/scripts/f-installed-runtime.mjs')).href+'?controller='+id.controllerSHA256)
const installed=await api.upgradeFInstallation(root,{bundle:id.bundle,expectedSHA256:id.bundleSHA256,expectedCurrent:id.previousBundleSHA256})
const launch=await api.withInstalledLaunchSpec(root,async s=>{
 assert.equal(s.env.NO_PROXY,'localhost,127.0.0.1,::1,api.deepseek.com')
 assert.ok(s.args.includes('--proxy-bypass-list=localhost;127.0.0.1;[::1]'))
 assert.equal(s.env.DEEPSEEK_API_KEY,undefined)
 return{current:s.current,noProxy:s.env.NO_PROXY,browserBypass:'localhost;127.0.0.1;[::1]',AppStarted:false}
})
for(const p of protectedPaths)assert.equal(hash(join(root,p)),before[p],p)
const result={status:'PROXY_FIX_INSTALLED_OFFLINE',installed,launch,businessAndCredentialBytesUnchanged:true,AppStarts:0,newModelCalls:0,authorizationRemainingCalls:0,originalRunStatus:'unknown',originalRequestKey:'07e23fdf-2864-4f6a-aef0-426aa49ec56e',oldReleasesRetained:true}
fs.writeFileSync(join(evidence,'native-proxy-fix-install-result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify(result,null,2))
