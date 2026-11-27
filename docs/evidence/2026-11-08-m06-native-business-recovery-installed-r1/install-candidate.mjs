import fs from 'node:fs'
import assert from 'node:assert/strict'
import {join,dirname,resolve} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
const evidence=dirname(fileURLToPath(import.meta.url)),project=resolve(evidence,'../../..')
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const save=(name,x)=>fs.writeFileSync(join(evidence,name),JSON.stringify(x,null,2)+'\n',{flag:'wx',mode:0o600})
const auth=read(join(evidence,'authorization.json')),identity=read(join(evidence,'bundle-identity.json'))
assert.equal(sha(identity.archive),auth.archiveSHA256)
const frozen=read(join(project,'docs/evidence/2026-11-08-m06-native-business-recovery-offline-r1/candidate-identity.json'))
const expected=Object.fromEntries(frozen.members.map(m=>[m.path,m.sha256]))
assert.deepEqual(read(join(evidence,'installed-package-expected.json')),expected)
for(const [p,h]of Object.entries(expected))assert.equal(sha(join(identity.bundle,'payload/components/c3',p)),h)
for(const row of read(join(evidence,'protected-before.json')))assert.equal(sha(row.path),row.sha256,row.path)
const controller=await import(pathToFileURL(identity.controller).href)
const checked=controller.verifyFBundle(identity.bundle,identity.bundleSHA256)
assert.equal(checked.id,identity.bundleSHA256)
save('bundle-verify-result.json',{status:'EXACT_RC2_BUNDLE_VERIFIED',bundleSHA256:checked.id,archiveSHA256:auth.archiveSHA256,memberCount:Object.keys(expected).length,controllerSHA256:sha(identity.controller),AppHostBoot:false})
const {handoffFInstalledController}=await import(pathToFileURL(join(project,'scripts/f-installed-controller-handoff.mjs')).href)
const handoff=await handoffFInstalledController({root:auth.root,expectedCurrent:auth.expectedCurrent,expectedOldControllerSHA256:auth.expectedOldControllerSHA256,bundle:identity.bundle,expectedBundleSHA256:identity.bundleSHA256,expectedNewControllerSHA256:identity.controllerSHA256})
save('controller-handoff-result.json',handoff)
const upgraded=await controller.upgradeFInstallation(auth.root,{bundle:identity.bundle,expectedSHA256:identity.bundleSHA256,expectedCurrent:auth.expectedCurrent})
assert.equal(upgraded.current,identity.bundleSHA256)
save('installation-upgrade-result.json',{...upgraded,AppHostBoot:false,modelAPIUploadFees:0})
for(const row of read(join(evidence,'protected-before.json')))assert.equal(sha(row.path),row.sha256,row.path)
console.log(JSON.stringify({current:upgraded.current,handoffJournal:handoff.journal,AppHostBoot:false,realCallBudget:0}))
