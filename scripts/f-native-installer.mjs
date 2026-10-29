/** Native macOS product archive, scoped to an explicitly approved private test root. No signing identity is inferred. */
import fs from 'node:fs'
import cp from 'node:child_process'
import {join,resolve,dirname,basename,isAbsolute} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash,randomUUID} from 'node:crypto'
import {canonicalDirectory} from '../patches/storage-json-single-owner/installed-lease.mjs'
import {verifyFBundle,verifySignedInstallationApp,installationFileHash as hash,installationControlFiles} from './f-installed-runtime.mjs'
import {recoverySourceFiles} from './f-user-recovery.mjs'
const script=fileURLToPath(import.meta.url),repo=resolve(dirname(script),'..')
const save=(p,x)=>fs.writeFileSync(p,typeof x==='string'?x:JSON.stringify(x,null,2)+'\n',{flag:'wx',mode:0o600})
const clone=(a,b)=>{const args=['-cRp',a,b];const stdout=cp.execFileSync('/bin/cp',args,{env:{PATH:'/usr/bin:/bin'},encoding:'utf8'});return{command:'/bin/cp',args,stdout}}
export function nativeInstallerPlan({root,allowedRoot,expectedSHA256,action='install',expectedCurrent,persistentRecovery=false}){
 canonicalDirectory(allowedRoot)
 if(fs.statSync(allowedRoot).uid!==process.getuid())throw Error('native package must be built by its explicit target owner')
 if(!isAbsolute(root)||resolve(root)!==root||dirname(root)!==allowedRoot||!/^[-\w .']{1,100}$/.test(basename(root)))throw Error('native installer target outside explicit private root')
 if(!/^[a-f0-9]{64}$/.test(expectedSHA256??''))throw Error('explicit native installer bundle identity required')
 if(!['install','upgrade','rollback'].includes(action)||action!=='install'&&(!/^[a-f0-9]{64}$/.test(expectedCurrent??'')||expectedCurrent===expectedSHA256))throw Error('explicit installer action/current revision required')
 const durable=persistentRecovery||action==='rollback'
 const request={schemaVersion:durable?2:1,root,allowedRoot,ownerUid:process.getuid(),ownerGid:process.getgid(),action,bundleSHA256:expectedSHA256,...action!=='install'?{expectedCurrent}:{} ,transactionId:randomUUID(),realCallBudget:0,...durable?{recoveryFiles:Object.fromEntries(recoverySourceFiles.map(p=>[p,hash(join(repo,p))]))}:{}}
 const raw=JSON.stringify(request,null,2)+'\n',requestSHA256=createHash('sha256').update(raw).digest('hex'),id='com.oasis.f.controlled-installer.'+requestSHA256.slice(0,24)
 const runner=action==='rollback'?'resources/runner-node':'resources/bundle/payload/node/bin/node'
 const postinstall=`#!/bin/sh\nset -eu\nPATH=/usr/bin:/bin\nexport PATH\nSCRIPT_DIR=$(CDPATH= cd -- "$(/usr/bin/dirname -- "$0")" && pwd)\nunset NODE_OPTIONS NODE_PATH ELECTRON_RUN_AS_NODE DYLD_INSERT_LIBRARIES DYLD_LIBRARY_PATH LD_PRELOAD\nexec "$SCRIPT_DIR/${runner}" "$SCRIPT_DIR/resources/companion/scripts/f-installer-transaction.mjs" --package "$SCRIPT_DIR/resources/request.json" '${requestSHA256}'\n`
 const distribution=`<?xml version="1.0" encoding="utf-8"?>\n<installer-gui-script minSpecVersion="2"><title>DSH-Oasis 受控离线安装</title><options customize="never" hostArchitectures="arm64"/><domains enable_anywhere="false" enable_currentUserHome="true" enable_localSystem="false"/><choices-outline><line choice="default"/></choices-outline><choice id="default" visible="false"><pkg-ref id="${id}"/></choice><pkg-ref id="${id}" version="0.1.0" auth="none" onConclusion="None">component.pkg</pkg-ref></installer-gui-script>\n`
 return{request,raw,requestSHA256,id,postinstall,distribution}
}
export async function buildNativeInstaller(spec){
 if(spec.persistentRecovery===false)throw Error('new native packages require persistent recovery')
 const plan=nativeInstallerPlan({...spec,persistentRecovery:true}),input=verifyFBundle(spec.bundle,spec.expectedSHA256),out=spec.out
 if(!isAbsolute(out)||resolve(out)!==out||fs.realpathSync(dirname(out))!==dirname(out)||fs.existsSync(out)||!out.endsWith('.pkg'))throw Error('canonical absent native package output required')
 verifySignedInstallationApp(join(input.payload,'App/DSH Desktop.app'))
 const work=out+'.build';fs.mkdirSync(work,{mode:0o700});const scripts=join(work,'Scripts'),resources=join(scripts,'resources');fs.mkdirSync(resources,{recursive:true,mode:0o700})
 let staging
 if(plan.request.action==='rollback'){
  staging=clone(join(input.payload,'node/bin/node'),join(resources,'runner-node'));fs.copyFileSync(join(spec.bundle,'bundle.json'),join(resources,'target-bundle.json'))
 }else{
  staging=clone(spec.bundle,join(resources,'bundle'));verifyFBundle(join(resources,'bundle'),spec.expectedSHA256)
 }
 for(const file of recoverySourceFiles){
  const dest=join(resources,'companion',file);fs.mkdirSync(dirname(dest),{recursive:true,mode:0o700});fs.copyFileSync(join(repo,file),dest)
 }
 save(join(resources,'request.json'),plan.raw);save(join(scripts,'postinstall'),plan.postinstall);fs.chmodSync(join(scripts,'postinstall'),0o755)
 save(join(work,'Distribution.xml'),plan.distribution)
 const commands=[['/usr/bin/pkgbuild',['--nopayload','--identifier',plan.id,'--version','0.1.0','--scripts',scripts,join(work,'component.pkg')]],['/usr/bin/productbuild',['--distribution',join(work,'Distribution.xml'),'--package-path',work,out]]]
 const results=[]
 for(const [command,args]of commands){const stdout=cp.execFileSync(command,args,{cwd:work,env:{PATH:'/usr/bin:/bin:/usr/sbin:/sbin',HOME:work,LANG:'en_US.UTF-8',LC_ALL:'en_US.UTF-8'},encoding:'utf8'});results.push({command,args,stdout})}
 const intermediate=join(work,'component.pkg'),componentIntermediate={path:intermediate,sha256:hash(intermediate),retiredAfterSuccessfulProductbuild:true};fs.unlinkSync(intermediate)
 const result={package:out,sha256:hash(out),resources,requestSHA256:plan.requestSHA256,request:plan.request,staging,componentIntermediate,payloadMode:plan.request.action==='rollback'?'REGISTERED_RELEASE_REFERENCE':'FULL_FIXED_BUNDLE',commands:results,signed:false,notarized:false,formalReleaseAccepted:false,realCallBudget:0}
 save(join(work,'build-receipt.json'),result);return result
}
if(process.argv[1]&&resolve(process.argv[1])===script){
 const [action,path,...extra]=process.argv.slice(2)
 if(action!=='--build'||!path||extra.length){console.error('Use --build exact-spec.json');process.exitCode=1}
 else buildNativeInstaller(JSON.parse(fs.readFileSync(path,'utf8'))).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1})
}
