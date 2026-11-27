import fs from 'node:fs/promises'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'

const project=process.cwd(),evidence=join(project,'docs/evidence/2026-11-08-r6-execution-r1')
const identity=JSON.parse(await fs.readFile(join(evidence,'native-generation-bundle-identity-r2.json')))
const authorization=JSON.parse(await fs.readFile(join(evidence,'authorization-real-generation.json')))
assert.equal(authorization.maxCalls,1);assert.equal(authorization.maxOutputTokens,8192)
const root=identity.fixedRoot,oldCurrent='f03100c7f31b5100e886374e61aac07132421a5107365cfc2baa38996bec58bc'
const hash=async p=>createHash('sha256').update(await fs.readFile(p)).digest('hex')
const business=join(root,'data/home/storages/oasis_workbench.json'),before=await hash(business)
assert.equal(before,'ea5d5e2f294e5d19f269684438b23993e2f95b6caf4c4ef45115d189c6becca8')
const credentialHash=await hash(join(root,'data/home/.credentials.yaml'))
const intent={root,oldCurrent,newCurrent:identity.bundleSHA256,oldControllerSHA256:'0398b0c882b3a78186239ab43872a3b67944d65fa60b886a84a27cf3b23fa085',newControllerSHA256:identity.controllerSHA256,authorization:'current R6 goal and explicit one-call reply',AppHostStarted:false,realModelCalls:0}
await fs.writeFile(join(evidence,'native-generation-upgrade-intent.json'),JSON.stringify(intent,null,2)+'\n',{flag:'wx'})
const {handoffFInstalledController}=await import(pathToFileURL(join(project,'scripts/f-installed-controller-handoff.mjs')))
const handoff=await handoffFInstalledController({root,expectedCurrent:oldCurrent,expectedOldControllerSHA256:intent.oldControllerSHA256,bundle:identity.bundle,expectedBundleSHA256:identity.bundleSHA256,expectedNewControllerSHA256:identity.controllerSHA256})
await fs.writeFile(join(evidence,'native-generation-controller-handoff.json'),JSON.stringify(handoff,null,2)+'\n',{flag:'wx'})
const api=await import(pathToFileURL(join(root,'control/scripts/f-installed-runtime.mjs')).href+'?controller='+identity.controllerSHA256)
const upgraded=await api.upgradeFInstallation(root,{bundle:identity.bundle,expectedSHA256:identity.bundleSHA256,expectedCurrent:oldCurrent})
assert.equal(upgraded.current,identity.bundleSHA256)
assert.equal(upgraded.realCallBudget,1)
assert.equal(await hash(business),before)
assert.equal(await hash(join(root,'data/home/.credentials.yaml')),credentialHash)
const spec=await api.withInstalledLaunchSpec(root,async s=>{
 assert.equal(s.nativeM06Generation,true);assert.equal(s.nativeBusinessRecovery,false)
 assert.equal(s.env.OASIS_NATIVE_BUSINESS_RECOVERY,undefined);assert.equal(s.env.DEEPSEEK_API_KEY,undefined)
 assert.equal(s.env.HTTP_PROXY,undefined);assert.equal(s.cwd,join(root,'releases',identity.bundleSHA256))
 return{current:s.current,mode:'nativeM06Generation',budget:s.realCallBudget,exe:s.exe,credentialsInEnvironment:false,browserStillLoopbackProxied:s.args.includes('--proxy-server=http://127.0.0.1:9'),spawned:false}
})
const result={status:'EXISTING_DEVELOPMENT_INSTALLATION_NORMAL_M06_ENTRY_PREPARED',...upgraded,spec,businessUnchanged:true,businessSHA256:before,credentialBytesUnchangedByUpgrade:true,AppHostStarted:false,realModelCalls:0,oldReleasesRetained:true}
await fs.writeFile(join(evidence,'native-generation-upgrade-result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify(result,null,2))
