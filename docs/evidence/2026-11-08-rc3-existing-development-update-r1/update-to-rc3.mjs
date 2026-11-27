// Exact existing-installation update only. No App/Host startup or new business execution.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
const evidence=dirname(fileURLToPath(import.meta.url)),project=resolve(evidence,'../../..')
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const save=(name,value)=>fs.writeFileSync(join(evidence,name),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600})
const binding=read(join(evidence,'target-binding.json')),prepared=join(project,'docs/evidence/2026-11-08-m06-recovery-ui-gap-r1')
const identity=read(join(prepared,'bundle-identity.json')),candidate=read(join(prepared,'candidate-identity.json'))
assert.equal(binding.root,identity.scope.root)
assert.equal(binding.expectedCurrent,identity.baseBundleSHA256)
assert.equal(binding.bundleSHA256,identity.bundleSHA256);assert.equal(binding.newControllerSHA256,identity.controllerSHA256)
assert.equal(sha(identity.archive),binding.archiveSHA256)
assert.equal(sha(join(binding.root,'installation.json')),sha(join(evidence,'before/target-root/installation.json')))
for(const row of read(join(evidence,'protected-before.json')))assert.equal(sha(row.path),row.sha256,row.path)
for(const row of candidate.members)assert.equal(sha(join(identity.bundle,'payload/components/c3',row.path)),row.sha256,row.path)
const controller=await import(pathToFileURL(identity.controller).href)
const bundle=controller.verifyFBundle(identity.bundle,binding.bundleSHA256)
save('bundle-check-before.json',{status:'EXACT_RC3_BUNDLE_CHECKED',bundleSHA256:bundle.id,archiveSHA256:binding.archiveSHA256,controllerSHA256:sha(identity.controller),members:candidate.memberCount,AppHostBoot:false})
const helper=join(project,'scripts/f-installed-controller-handoff.mjs')
assert.equal(sha(helper),bundle.manifest.source.controllerAdaptation.preparedHandoffHelperSHA256)
fs.copyFileSync(helper,join(evidence,'used-controller-handoff.mjs'),fs.constants.COPYFILE_EXCL)
const {handoffFInstalledController}=await import(pathToFileURL(helper).href)
const handoff=await handoffFInstalledController({root:binding.root,expectedCurrent:binding.expectedCurrent,expectedOldControllerSHA256:binding.expectedOldControllerSHA256,bundle:identity.bundle,expectedBundleSHA256:binding.bundleSHA256,expectedNewControllerSHA256:binding.newControllerSHA256})
save('controller-handoff-result.json',{...handoff,helperSHA256:sha(helper)})
const result=await controller.upgradeFInstallation(binding.root,{bundle:identity.bundle,expectedSHA256:binding.bundleSHA256,expectedCurrent:binding.expectedCurrent})
assert.equal(result.current,binding.bundleSHA256)
save('upgrade-result.json',{...result,packageVersion:'0.1.0-rc.3',archiveSHA256:binding.archiveSHA256,controllerSHA256:binding.newControllerSHA256,AppHostBoot:false,newInstallationRoot:false,newBusinessExecutions:0,modelAPIUploadFees:0,endedAtUTC:new Date().toISOString()})
for(const row of read(join(evidence,'protected-before.json')))assert.equal(sha(row.path),row.sha256,row.path)
console.log(JSON.stringify({status:'EXISTING_DEVELOPMENT_INSTALLATION_UPDATED_TO_RC3',root:binding.root,current:result.current,controllerHandoffJournal:handoff.journal,AppHostBoot:false,newEnvironment:false}))
