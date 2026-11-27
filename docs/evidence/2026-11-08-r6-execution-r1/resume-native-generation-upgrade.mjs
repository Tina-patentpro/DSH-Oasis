// Resume only the already-confirmed controller handoff; never replay it.
import fs from 'node:fs/promises'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const project=process.cwd(),evidence=join(project,'docs/evidence/2026-11-08-r6-execution-r1')
const identity=JSON.parse(await fs.readFile(join(evidence,'native-generation-bundle-identity-r2.json')))
const handoff=JSON.parse(await fs.readFile(join(evidence,'native-generation-controller-handoff.json')))
const root=identity.fixedRoot,state=JSON.parse(await fs.readFile(join(root,'installation.json')))
assert.equal(state.current,'f03100c7f31b5100e886374e61aac07132421a5107365cfc2baa38996bec58bc')
assert.equal(state.controlFiles['scripts/f-installed-runtime.mjs'],identity.controllerSHA256)
assert.equal(handoff.newControllerSHA256,identity.controllerSHA256)
const hash=async p=>createHash('sha256').update(await fs.readFile(p)).digest('hex')
const business=join(root,'data/home/storages/oasis_workbench.json'),before=await hash(business)
assert.equal(before,'ea5d5e2f294e5d19f269684438b23993e2f95b6caf4c4ef45115d189c6becca8')
const credentialHash=await hash(join(root,'data/home/.credentials.yaml'))
const api=await import(pathToFileURL(join(root,'control/scripts/f-installed-runtime.mjs')))
const upgraded=await api.upgradeFInstallation(root,{bundle:identity.bundle,expectedSHA256:identity.bundleSHA256,expectedCurrent:state.current})
assert.equal(upgraded.current,identity.bundleSHA256);assert.equal(upgraded.realCallBudget,1)
assert.equal(await hash(business),before);assert.equal(await hash(join(root,'data/home/.credentials.yaml')),credentialHash)
const spec=await api.withInstalledLaunchSpec(root,async s=>{
 assert.equal(s.nativeM06Generation,true);assert.equal(s.nativeBusinessRecovery,false)
 assert.equal(s.env.OASIS_NATIVE_BUSINESS_RECOVERY,undefined);assert.equal(s.env.DEEPSEEK_API_KEY,undefined)
 return{current:s.current,mode:'nativeM06Generation',budget:s.realCallBudget,exe:s.exe,credentialsInEnvironment:false,spawned:false}
})
await fs.writeFile(join(evidence,'native-generation-upgrade-result.json'),JSON.stringify({status:'EXISTING_DEVELOPMENT_INSTALLATION_NORMAL_M06_ENTRY_PREPARED',...upgraded,spec,businessUnchanged:true,businessSHA256:before,credentialBytesUnchangedByUpgrade:true,AppHostStarted:false,realModelCalls:0,oldReleasesRetained:true,resumedAfter:'ESM controller URL cache; first upgrade rejected before addRelease; handoff not repeated'},null,2)+'\n',{flag:'wx'})
console.log('PASS: same development root upgraded to exact normal entry; original business/credential bytes preserved; no App or model call')
