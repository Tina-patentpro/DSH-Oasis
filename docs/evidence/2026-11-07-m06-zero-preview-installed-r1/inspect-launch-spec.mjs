// Bounded offline preparation: the callback never launches the executable.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {dirname,join} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
const evidence=dirname(fileURLToPath(import.meta.url))
const input=JSON.parse(fs.readFileSync(join(evidence,'installation-spec.json'),'utf8'))
const root=input.root,release=join(root,'releases',input.target.expectedSHA256)
const {withInstalledLaunchSpec}=await import(pathToFileURL(join(root,'control/scripts/f-installed-runtime.mjs')).href)
const {acquireJsonRootOwnership}=await import(pathToFileURL(join(root,'control/patches/storage-json-single-owner/ownership.mjs')).href)
const template=JSON.parse(fs.readFileSync(join(release,'profile-template.json'),'utf8'))
const activePatch=JSON.parse(fs.readFileSync(join(root,'data/home/profiles/desktop/cordis.patch.yml'),'utf8'))
assert.equal(activePatch.find(p=>p.id==='desktop-shell').config.port,57619)
assert.deepEqual(template.nativeZeroGeneration,input.new_zero_policy)
const before=fs.existsSync(join(root,'data/home/storages/oasis_workbench.json'))
assert.equal(before,false)
let report
await withInstalledLaunchSpec(root,async spec=>{
 assert.equal(spec.nativeZeroGeneration,true)
 assert.equal(spec.realCallBudget,0)
 assert.equal(spec.current,input.target.expectedSHA256)
 assert.equal(spec.env.OASIS_NATIVE_ZERO_GENERATION,'1')
 assert.equal(spec.env.DSH_OASIS_INSTALL_ROOT,root)
 assert.equal(spec.env.DSH_HOME,join(root,'data/home'))
 assert.equal(spec.env.HOME,join(root,'data/user'))
 assert.equal(spec.cwd,release)
 assert.equal(spec.exe,join(release,'App/DSH Desktop.app/Contents/MacOS/DSH Desktop'))
 assert.equal(spec.shell,false)
 for(const key of ['NODE_OPTIONS','NODE_PATH','OPENAI_API_KEY','ANTHROPIC_API_KEY'])assert.equal(Object.hasOwn(spec.env,key),false)
 assert.equal(fs.existsSync(join(root,'startup.lock')),true)
 assert.equal(fs.existsSync(join(root,'data/startup.lock')),true)
 const owner=await acquireJsonRootOwnership(join(root,'data/home/storages'))
 owner.release()
 report={root,current:spec.current,archiveSHA256:input.archiveSHA256,exe:spec.exe,args:spec.args,cwd:spec.cwd,
  HOME:spec.env.HOME,DSH_HOME:spec.env.DSH_HOME,ownershipEnvironmentBound:!!spec.env.DSH_OASIS_WRITER_NONCE,
  nativeZeroGeneration:spec.nativeZeroGeneration,realCallBudget:spec.realCallBudget,
  businessBudget:template.nativeZeroGeneration.budget,port:57619,profileAndReleaseAnchorsMatch:true,
  writerLocksObserved:true,providerOwnershipAcquiredAndReleased:true,AppOrHostLaunchInvoked:false}
})
assert.equal(fs.existsSync(join(root,'startup.lock')),false)
assert.equal(fs.existsSync(join(root,'data/startup.lock')),false)
// Prove the provider metadata transaction has actually released its OS lock.
const released=await acquireJsonRootOwnership(join(root,'data/home/storages'))
released.release()
assert.equal(fs.existsSync(join(root,'data/home/storages/oasis_workbench.json')),false)
report.writerLocksReleased=true
report.providerOwnershipReacquiredAfterRelease=true
report.businessStateCreated=false
report.oldProfileOrCredentialCopied=false
fs.writeFileSync(join(evidence,'launch-spec-inspection.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify({status:'OFFLINE_INSTALLED_SPEC_VERIFIED',current:report.current,AppOrHostLaunchInvoked:false,writerLocksReleased:true}))
