import fs from 'node:fs'
import cp from 'node:child_process'
import {join,resolve,relative} from 'node:path'
import {createHash} from 'node:crypto'
import {pathToFileURL} from 'node:url'

const project=process.cwd(),evidence=join(project,'docs/evidence/2026-11-08-r6-execution-r1')
const base=JSON.parse(fs.readFileSync(join(project,'docs/evidence/2026-11-08-m06-recovery-ui-gap-r1/bundle-identity.json')))
const work=join(project,'.local/m06-native-generation-20261108-r2'),bundle=join(work,'bundle')
const root=join(project,'.dsh-test/m06-native-business-recovery-20261108-r1')
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
if(fs.existsSync(work))throw Error('Candidate already exists; inspect the existing result, do not rebuild')
if(hash(join(base.bundle,'bundle.json'))!==base.bundleSHA256)throw Error('Parent bundle identity changed')
fs.mkdirSync(work,{mode:0o700})
// macOS clonefile must succeed; do not silently fall back to a full vendor copy.
cp.execFileSync('/bin/cp',['-cRp',base.bundle,bundle],{stdio:'pipe'})
const payload=join(bundle,'payload'),templatePath=join(payload,'profile-template.json'),template=JSON.parse(fs.readFileSync(templatePath))
delete template.nativeBusinessRecovery
const guards=['src/index.js','src/workbench-rpc.js','src/v340-native-model.js','src/dsh-generation-adapter.js','lib/client.js']
template.nativeM06Generation={schemaVersion:1,policy:'m06-native-generation-v1',archiveSHA256:base.archiveSHA256,root,
 provider:'deepseek-official',model:'deepseek-flash',maxTokens:8192,inputSHA256:'a34ae147caa04a87705e2b809bc2e42aa339b5c29e72f47c7e7ee0d1ea05764b',
 budget:{model:1,api:0,upload:0,payment:0},guardedFiles:Object.fromEntries(guards.map(p=>[p,hash(join(payload,'components/c3',p))]))}
const provider=template.patch.find(r=>r.id==='llm-deepseek')
provider.disabled=false;provider.config={baseURL:'https://api.deepseek.com/anthropic',maxTokens:8192,retryPolicy:{mode:'normal',maxRetries:0}}
const insert=template.patch.flatMap(row=>row.insert??[]).find(row=>row.id==='oasis-professional-service-m06-native-recovery')
if(!insert)throw Error('Parent recovery entry missing')
insert.id='oasis-professional-service-m06-native-generation';insert.name='@OASIS_RELEASE_ROOT@/components/c3/src/m06-controlled-host-013.js'
fs.writeFileSync(templatePath,JSON.stringify(template,null,2)+'\n')
const source=fs.readFileSync(join(project,'scripts/f-installed-runtime.mjs'),'utf8')
if(source.split("'oasis-professional-service':'0.0.1'").length!==2)throw Error('Exact fixed package version derivation missing')
const controller=join(payload,'controller/scripts/f-installed-runtime.mjs')
fs.writeFileSync(controller,source.replace("'oasis-professional-service':'0.0.1'","'oasis-professional-service':'0.1.0-rc.3'"))
const manifest=JSON.parse(fs.readFileSync(join(bundle,'bundle.json'))),oldFiles=manifest.files
manifest.kind='OASIS_F_NATIVE_M06_BUNDLE';manifest.realCallBudget=1
manifest.derivation={parentBundleSHA256:base.bundleSHA256,reason:'Existing normal controlled M06 entry, fixed native provider, max8192 tokens and retry0; same business archive and developer installation',authorization:'Current R6 goal and explicit credential/one-call reply'}
const files={},links={}
function walk(dir){for(const name of fs.readdirSync(dir).sort()){
 const p=join(dir,name),key=relative(payload,p),s=fs.lstatSync(p)
 if(s.isSymbolicLink())links[key]=fs.readlinkSync(p)
 else if(s.isDirectory())walk(p)
 else if(s.isFile())files[key]=hash(p)
 else throw Error('Unexpected candidate file type')
}}walk(payload)
manifest.files=files;manifest.links=links
fs.writeFileSync(join(bundle,'bundle.json'),JSON.stringify(manifest,null,2)+'\n')
const bundleSHA256=hash(join(bundle,'bundle.json')),api=await import(pathToFileURL(controller))
api.verifyFBundle(bundle,bundleSHA256);api.verifySignedInstallationApp(join(payload,'App/DSH Desktop.app'))
const changed=Object.keys(files).filter(k=>files[k]!==oldFiles[k])
if(changed.length!==2||changed.some(k=>!['profile-template.json','controller/scripts/f-installed-runtime.mjs'].includes(k)))throw Error('Unexpected payload mutation')
const result={status:'NATIVE_M06_GENERATION_CANDIDATE_OFFLINE_VERIFIED',bundle,bundleSHA256,controller,controllerSHA256:hash(controller),
 baseBundleSHA256:base.bundleSHA256,archive:base.archive,archiveSHA256:base.archiveSHA256,packageVersion:'0.1.0-rc.3',packageMembers:125,
 fixedRoot:root,scope:template.nativeM06Generation,changedPayloadFiles:changed,unchangedFileCount:Object.keys(files).length-2,
 linksUnchanged:JSON.stringify(links)===JSON.stringify(JSON.parse(fs.readFileSync(join(base.bundle,'bundle.json'))).links),
 AppHostStarted:false,realModelCalls:0,sourceControllerSHA256:hash(join(project,'scripts/f-installed-runtime.mjs'))}
fs.writeFileSync(join(evidence,'native-generation-bundle-identity-r2.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify(result,null,2))
