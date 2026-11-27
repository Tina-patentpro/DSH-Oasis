import fs from 'node:fs'
import cp from 'node:child_process'
import {join,relative} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const P=process.cwd(),E=join(P,'docs/evidence/2026-11-08-r6-execution-r1')
const prior=JSON.parse(fs.readFileSync(join(E,'native-proxy-fix-bundle-identity.json')))
const candidate=JSON.parse(fs.readFileSync(join(E,'diagnostic-candidate-identity-r2.json')))
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const work=join(P,'.local/m06-execution-summary-20261108-r2'),bundle=join(work,'bundle'),payload=join(bundle,'payload')
assert.equal(hash(join(prior.bundle,'bundle.json')),prior.bundleSHA256)
assert.equal(hash(candidate.archive),candidate.archiveSHA256)
assert.equal(fs.existsSync(bundle),false)
cp.execFileSync('/bin/cp',['-cRp',prior.bundle,bundle],{stdio:'pipe'})
for(const file of candidate.members){const source=join(candidate.unpack,file.path);assert.equal(hash(source),file.sha256);fs.copyFileSync(source,join(payload,'components/c3',file.path))}
const profile=join(payload,'profile-template.json'),template=JSON.parse(fs.readFileSync(profile))
template.nativeM06Generation.archiveSHA256=candidate.archiveSHA256
for(const file of Object.keys(template.nativeM06Generation.guardedFiles))template.nativeM06Generation.guardedFiles[file]=hash(join(payload,'components/c3',file))
fs.writeFileSync(profile,JSON.stringify(template,null,2)+'\n')
const controller=join(payload,'controller/scripts/f-installed-runtime.mjs'),source=fs.readFileSync(join(P,'scripts/f-installed-runtime.mjs'),'utf8')
assert.equal(source.split("'oasis-professional-service':'0.0.1'").length,2)
fs.writeFileSync(controller,source.replace("'oasis-professional-service':'0.0.1'","'oasis-professional-service':'0.1.0-rc.4'"))
const manifestPath=join(bundle,'bundle.json'),manifest=JSON.parse(fs.readFileSync(manifestPath)),old=manifest.files,files={},links={}
function walk(dir){for(const name of fs.readdirSync(dir).sort()){
 const path=join(dir,name),key=relative(payload,path),stat=fs.lstatSync(path)
 if(stat.isDirectory())walk(path)
 else if(stat.isSymbolicLink())links[key]=fs.readlinkSync(path)
 else if(stat.isFile())files[key]=hash(path)
 else throw Error('Unsupported bundle member')
}}walk(payload)
manifest.files=files;manifest.links=links;manifest.derivation={parentBundleSHA256:prior.bundleSHA256,reason:'Private rc4 safe execution-summary diagnostic fix; no new model call permission; same fixed runtime and resource'}
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n')
const bundleSHA256=hash(manifestPath),api=await import(pathToFileURL(controller))
api.verifyFBundle(bundle,bundleSHA256);api.verifySignedInstallationApp(join(payload,'App/DSH Desktop.app'))
const changed=Object.keys(files).filter(k=>files[k]!==old[k]);assert.equal(changed.length,9)
const result={status:'PRIVATE_RC4_DIAGNOSTIC_BUNDLE_OFFLINE_VERIFIED',bundle,bundleSHA256,controller,controllerSHA256:hash(controller),archive:candidate.archive,archiveSHA256:candidate.archiveSHA256,packageVersion:candidate.packageVersion,packageMembers:125,fixedRoot:prior.fixedRoot,previousBundleSHA256:prior.bundleSHA256,previousControllerSHA256:prior.controllerSHA256,changedPayloadFiles:changed,unchangedPayloadFiles:Object.keys(files).length-changed.length,linksUnchanged:JSON.stringify(links)===JSON.stringify(JSON.parse(fs.readFileSync(join(prior.bundle,'bundle.json'))).links),AppStarts:0,newModelCalls:0,publicationAuthorized:false}
fs.writeFileSync(join(E,'diagnostic-bundle-identity-r2.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify(result,null,2))
