import fs from 'node:fs'
import cp from 'node:child_process'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const project=process.cwd(),evidence=join(project,'docs/evidence/2026-11-08-r6-execution-r1')
const previous=JSON.parse(fs.readFileSync(join(evidence,'native-generation-bundle-identity-r2.json')))
const work=join(project,'.local/m06-native-generation-proxy-fix-20261108-r1'),bundle=join(work,'bundle')
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
assert.equal(hash(join(previous.bundle,'bundle.json')),previous.bundleSHA256)
assert.equal(fs.existsSync(work),false)
fs.mkdirSync(work,{mode:0o700});cp.execFileSync('/bin/cp',['-cRp',previous.bundle,bundle],{stdio:'pipe'})
const controller=join(bundle,'payload/controller/scripts/f-installed-runtime.mjs')
const source=fs.readFileSync(join(project,'scripts/f-installed-runtime.mjs'),'utf8')
assert.equal(source.split("'oasis-professional-service':'0.0.1'").length,2)
fs.writeFileSync(controller,source.replace("'oasis-professional-service':'0.0.1'","'oasis-professional-service':'0.1.0-rc.3'"))
const file=join(bundle,'bundle.json'),manifest=JSON.parse(fs.readFileSync(file))
manifest.files['controller/scripts/f-installed-runtime.mjs']=hash(controller)
manifest.derivation={parentBundleSHA256:previous.bundleSHA256,reason:'Host-only api.deepseek.com proxy exception; no new call authorization; original UNKNOWN retained'}
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n')
const bundleSHA256=hash(file),api=await import(pathToFileURL(controller))
api.verifyFBundle(bundle,bundleSHA256);api.verifySignedInstallationApp(join(bundle,'payload/App/DSH Desktop.app'))
const result={status:'PROXY_FIX_CANDIDATE_OFFLINE_VERIFIED',bundle,bundleSHA256,controller,controllerSHA256:hash(controller),previousBundleSHA256:previous.bundleSHA256,previousControllerSHA256:previous.controllerSHA256,archiveSHA256:previous.archiveSHA256,packageVersion:previous.packageVersion,packageMembers:125,fixedRoot:previous.fixedRoot,changedPayloadFiles:['controller/scripts/f-installed-runtime.mjs'],newModelCallsAuthorized:0,AppStarted:false}
fs.writeFileSync(join(evidence,'native-proxy-fix-bundle-identity.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify(result,null,2))
