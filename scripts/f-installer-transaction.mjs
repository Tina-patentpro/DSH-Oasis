/** Explicit companion to the frozen R3 controller. Never restores business data or retries an upgrade. */
import fs from 'node:fs'
import cp from 'node:child_process'
import {join,resolve,dirname,basename} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash,randomUUID} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import * as runtime from './f-installed-runtime.mjs'
import {canonicalDirectory,assertInstalledPath,assertInstalledDataRoots,acquireInstalledLease} from '../patches/storage-json-single-owner/installed-lease.mjs'
import {acquireJsonRootOwnership} from '../patches/storage-json-single-owner/ownership.mjs'
const script=fileURLToPath(import.meta.url)
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const clone=(a,b)=>fs.cpSync(a,b,{recursive:true,dereference:false,verbatimSymlinks:true,force:false,errorOnExist:true,mode:fs.constants.COPYFILE_FICLONE})
function syncDir(p){const fd=fs.openSync(p,'r');try{fs.fsyncSync(fd)}finally{fs.closeSync(fd)}}
function save(p,x){const fd=fs.openSync(p,'wx',0o600);try{fs.writeFileSync(fd,typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x,null,2)+'\n');fs.fsyncSync(fd)}finally{fs.closeSync(fd)};syncDir(dirname(p))}
function tree(root,ignore=[]){
 const out={}
 function walk(p,key=''){for(const name of fs.readdirSync(p).sort()){
  const q=join(p,name),rel=key?key+'/'+name:name;if(ignore.includes(rel))continue;const s=fs.lstatSync(q)
  if(s.isSymbolicLink())out[rel]={type:'link',target:fs.readlinkSync(q)}
  else if(s.isDirectory())walk(q,rel)
  else if(s.isFile()&&s.nlink===1)out[rel]={type:'file',sha256:hash(q),mode:s.mode&0o777}
  else throw Error('unsupported transaction file identity')
 }}walk(root);return out
}
function syncTree(root){for(const [p,row]of Object.entries(tree(root)))if(row.type==='file'){const fd=fs.openSync(join(root,p),'r');try{fs.fsyncSync(fd)}finally{fs.closeSync(fd)}};syncDir(root)}
function txPath(root,tx,{create=false}={}){
 canonicalDirectory(root);const parent=join(root,'installer-transactions')
 if(dirname(tx)!==parent||!/^[-\w]{1,80}$/.test(basename(tx)))throw Error('explicit installer transaction path required')
 if(create){if(!fs.existsSync(parent))fs.mkdirSync(parent,{mode:0o700});assertInstalledPath(root,parent);fs.mkdirSync(tx,{mode:0o700})}
 assertInstalledPath(root,tx);return tx
}
function journal(root,tx,expected){
 txPath(root,tx);const p=assertInstalledPath(root,join(tx,'transaction.json'),{directory:false})
 if(hash(p)!==expected)throw Error('transaction manifest hash mismatch')
 const j=read(p),before=read(assertInstalledPath(root,join(tx,'before-installation.json'),{directory:false}))
 if(j.schemaVersion!==1||j.root!==root||j.transactionRoot!==tx||j.beforeStateSHA256!==hash(join(tx,'before-installation.json'))||before.current!==j.beforeCurrent||before.releases[j.targetRelease]||!isDeepStrictEqual(j.profile,tree(assertInstalledPath(root,join(tx,'before-profile')))))throw Error('transaction before-image identity drift')
 for(const path of runtime.installationControlFiles)if(hash(assertInstalledPath(root,join(root,'control',path),{directory:false}))!==before.controlFiles[path])throw Error('transaction controller drift')
 if(hash(assertInstalledPath(root,join(root,'control/node'),{directory:false}))!==before.nodeSHA256)throw Error('transaction node drift')
 const release=assertInstalledPath(root,join(root,'releases',j.beforeCurrent)),receipt=assertInstalledPath(root,join(release,'receipt.json'),{directory:false})
 if(hash(receipt)!==before.releases[j.beforeCurrent])throw Error('transaction original receipt drift')
 const r=read(receipt)
 if(!isDeepStrictEqual(r.profile,j.profile)||!isDeepStrictEqual(r.program,tree(release,['receipt.json','profile-snapshot']))||!isDeepStrictEqual(r.profile,tree(assertInstalledPath(root,join(release,'profile-snapshot')))))throw Error('original release/source drift')
 assertInstalledDataRoots(root);return{j,before}
}
export async function runInstallerTransaction({root,bundle,expectedSHA256,expectedCurrent,transactionRoot}){
 const input=runtime.verifyFBundle(bundle,expectedSHA256)
 if(expectedSHA256===expectedCurrent)throw Error('explicit different upgrade release required')
 await runtime.withInstalledWriter(root,'maintenance',async report=>{
  if(report.current!==expectedCurrent)throw Error('installer current revision conflict')
  txPath(root,transactionRoot,{create:true});clone(join(root,'data/home/profiles/desktop'),join(transactionRoot,'before-profile'));syncTree(join(transactionRoot,'before-profile'))
  save(join(transactionRoot,'before-installation.json'),fs.readFileSync(join(root,'installation.json')))
  save(join(transactionRoot,'transaction.json'),{schemaVersion:1,root,transactionRoot,beforeCurrent:expectedCurrent,beforeStateSHA256:hash(join(transactionRoot,'before-installation.json')),targetRelease:input.id,profile:tree(join(transactionRoot,'before-profile')),bundle,realCallBudget:0})
 })
 const transactionSHA256=hash(join(transactionRoot,'transaction.json')),argv=[join(root,'control/scripts/f-installed-runtime.mjs'),'--upgrade',root,bundle,expectedSHA256,expectedCurrent]
 save(join(transactionRoot,'dispatch.json'),{argv,node:join(root,'control/node'),dispatchedAtUTC:new Date().toISOString(),transactionSHA256,dispatches:1})
 const out=fs.openSync(join(transactionRoot,'upgrade.stdout.log'),'wx',0o600),err=fs.openSync(join(transactionRoot,'upgrade.stderr.log'),'wx',0o600)
 let exit
 try{
  const child=cp.spawn(join(root,'control/node'),argv,{detached:true,cwd:root,env:{PATH:'/usr/bin:/bin',COREPACK_ENABLE_NETWORK:'0',LANG:'en_US.UTF-8',LC_ALL:'en_US.UTF-8'},stdio:['ignore',out,err],shell:false})
  const result=new Promise((ok,fail)=>{child.once('error',fail);child.once('close',(code,signal)=>ok({code,signal}))})
  save(join(transactionRoot,'child.json'),{pid:child.pid,processGroup:child.pid,startedAtUTC:new Date().toISOString()})
  exit=await result
 }catch(e){exit={code:null,signal:null,spawnError:e.message}}
 finally{fs.closeSync(out);fs.closeSync(err)}
 let currentValid=false,current=null
 try{const r=runtime.checkFInstallation(root);currentValid=true;current=r.current}catch{}
 const result={...exit,exitCode:exit.code??1,currentValid,current,transactionSHA256,transactionRoot,dispatches:1,outcome:exit.code===0&&current===expectedSHA256?'SUCCEEDED':'FAILED_OR_UNKNOWN_NO_RETRY'}
 save(join(transactionRoot,'outcome.json'),result);return result
}
function ownerAlive(record){
 if(!Number.isSafeInteger(record.pid)||record.pid<=0||typeof record.startTime!=='string')throw Error('invalid recorded lock owner')
 try{return cp.execFileSync('/bin/ps',['-p',String(record.pid),'-o','lstart='],{env:{PATH:'/usr/bin:/bin',LC_ALL:'C'},encoding:'utf8',timeout:3000}).trim()===record.startTime}
 catch(e){if(e.status===1)return false;throw e}
}
function observation(root,j,includeLocks=true){
 const state=read(assertInstalledPath(root,join(root,'installation.json'),{directory:false})),locks=[]
 for(const name of includeLocks?['startup.lock','data/startup.lock']:[]){
  const p=join(root,name)
  if(fs.existsSync(p)){assertInstalledPath(root,p,{directory:false});const r=read(p),s=fs.lstatSync(p);if(r.root!==root||r.current!==state.current||ownerAlive(r))throw Error('active or mismatched installer lock owner');locks.push({path:p,sha256:hash(p),dev:s.dev,ino:s.ino})}
 }
 if(locks.length===1)throw Error('partial lock pair requires separate investigation')
 if(locks.length===2&&!isDeepStrictEqual(read(locks[0].path),read(locks[1].path)))throw Error('installer lock pair mismatch')
 const profile=join(root,'data/home/profiles/desktop'),candidate=join(root,'releases',j.targetRelease),marker=join(root,'RECOVERY_REQUIRED')
 return{stateSHA256:hash(join(root,'installation.json')),current:state.current,locks,profileSHA256:fs.existsSync(profile)?digest(tree(assertInstalledPath(root,profile))):null,candidateSHA256:fs.existsSync(candidate)?digest(tree(assertInstalledPath(root,candidate))):null,markerSHA256:fs.existsSync(marker)?hash(assertInstalledPath(root,marker,{directory:false})):null}
}
export async function prepareInstallerRecovery({root,transactionRoot,expectedTransactionSHA256}){
 const {j}=journal(root,transactionRoot,expectedTransactionSHA256)
 if(fs.existsSync(join(transactionRoot,'recovery-result.json')))throw Error('transaction already recovered')
 const outcomePath=join(transactionRoot,'outcome.json'),childPath=join(transactionRoot,'child.json')
 if(fs.existsSync(outcomePath)&&read(assertInstalledPath(root,outcomePath,{directory:false})).outcome==='SUCCEEDED')throw Error('a successful installer transaction cannot authorize failure recovery')
 // A dead parent may leave pnpm descendants. All members of the owned group must end.
 if(fs.existsSync(childPath)){
  const child=read(assertInstalledPath(root,childPath,{directory:false}))
  if(!Number.isSafeInteger(child.pid)||child.pid<=0||child.pid!==child.processGroup)throw Error('invalid installer process group')
  try{process.kill(-child.processGroup,0);throw Error('installer process group may still be alive')}catch(e){if(e.code!=='ESRCH')throw e}
 }
 const observed=observation(root,j)
 if(observed.current!==j.beforeCurrent||observed.stateSHA256!==j.beforeStateSHA256)throw Error('installer transaction superseded; current state changed from before-image')
 let valid
 try{valid=runtime.checkFInstallation(root)}catch{}
 if(valid&&valid.current!==j.beforeCurrent)throw Error('a valid new current must not be treated as failed recovery')
 if(valid&&!observed.candidateSHA256)throw Error('no failed candidate to recover')
 const plan={schemaVersion:1,root,transactionRoot,transactionSHA256:expectedTransactionSHA256,restoreProfile:!valid,observed}
 return{plan,sha256:digest(plan)}
}
export async function applyInstallerRecovery({plan,expectedPlanSHA256}){
 if(digest(plan)!==expectedPlanSHA256||plan.schemaVersion!==1)throw Error('recovery plan hash mismatch')
 const {root,transactionRoot:tx}=plan,{j,before}=journal(root,tx,plan.transactionSHA256)
 const fresh=await prepareInstallerRecovery({root,transactionRoot:tx,expectedTransactionSHA256:plan.transactionSHA256})
 if(!isDeepStrictEqual(fresh.plan,plan))throw Error('recovery observation changed; prepare a new explicit plan')
 for(const [i,row]of plan.observed.locks.entries()){
  const p=row.path,s=fs.lstatSync(p);if(s.dev!==row.dev||s.ino!==row.ino||hash(p)!==row.sha256||ownerAlive(read(p)))throw Error('recorded lock owner changed')
  save(join(tx,'stale-lock-'+i+'.json'),fs.readFileSync(p));fs.unlinkSync(p);syncDir(dirname(p))
 }
 const lease=acquireInstalledLease(root,'maintenance');let owner
 const marker=join(root,'RECOVERY_REQUIRED');let markerSHA,recoveryStarted=false
 try{
  assertInstalledDataRoots(root);owner=await acquireJsonRootOwnership(join(root,'data/home/storages'))
  // A supported writer can finish between preparation and acquisition. Own locks
  // now belong to this recovery; all other input identities must still match.
  const {locks:priorLocks,...expected}=plan.observed,{locks:ownLocks,...observed}=observation(root,j,false)
  if(!isDeepStrictEqual(observed,expected))throw Error('recovery observation changed during lease acquisition')
  recoveryStarted=true
  if(fs.existsSync(marker)){save(join(tx,'original-recovery-marker.json'),fs.readFileSync(marker));markerSHA=hash(marker)}
  else{save(marker,{reason:'explicit installer recovery incomplete',transactionSHA256:plan.transactionSHA256});markerSHA=hash(marker)}
  if(plan.restoreProfile){
   const profile=join(root,'data/home/profiles/desktop')
   if(fs.existsSync(profile))fs.renameSync(profile,join(tx,'failed-profile'))
   clone(join(tx,'before-profile'),profile);syncTree(profile)
   const tmp=join(root,'installation.recovery-'+randomUUID()+'.tmp');save(tmp,fs.readFileSync(join(tx,'before-installation.json')));fs.renameSync(tmp,join(root,'installation.json'));syncDir(root)
  }
  const candidate=join(root,'releases',j.targetRelease)
  if(fs.existsSync(candidate)){
   if(before.releases[j.targetRelease]||digest(tree(candidate))!==plan.observed.candidateSHA256)throw Error('failed candidate drift before quarantine')
   fs.renameSync(candidate,join(tx,'quarantined-release'));syncDir(dirname(candidate));syncDir(tx)
  }
  if(hash(marker)!==markerSHA)throw Error('recovery marker changed')
  fs.unlinkSync(marker);syncDir(root)
  const result=runtime.checkFInstallation(root);save(join(tx,'recovery-result.json'),{current:result.current,restoredProfile:plan.restoreProfile,realCallBudget:0,completedAtUTC:new Date().toISOString()});return result
 }catch(e){if(recoveryStarted&&!fs.existsSync(marker))save(marker,{reason:'explicit installer recovery failed',transactionSHA256:plan.transactionSHA256});throw e}
 finally{owner?.release();lease.release()}
}
export async function executeNativeInstallerRequest(requestPath,expectedSHA256){
 requestPath=fs.realpathSync(requestPath)
 if(hash(requestPath)!==expectedSHA256)throw Error('native installer request hash mismatch')
 const request=read(requestPath),base=canonicalDirectory(request.allowedRoot),root=request.root
 if(request.schemaVersion!==1||request.ownerUid!==fs.statSync(base).uid||process.getuid()!==request.ownerUid)throw Error('native installer must run as its recorded target user; privileged identity not accepted')
 if(dirname(root)!==base||!/^[-\w .']{1,100}$/.test(basename(root))||request.realCallBudget!==0)throw Error('native installer target outside explicit test root')
 const bundle=join(dirname(requestPath),'bundle')
 if(!/^[-\w]{1,80}$/.test(request.transactionId??''))throw Error('explicit native installer transaction identity required')
 let result
 if(request.action==='install')result=await runtime.installFBundle({root,bundle,expectedSHA256:request.bundleSHA256})
 else if(request.action==='upgrade')result=await runInstallerTransaction({root,bundle,expectedSHA256:request.bundleSHA256,expectedCurrent:request.expectedCurrent,transactionRoot:join(root,'installer-transactions',request.transactionId)})
 else throw Error('explicit native installer action required')
 save(join(root,'data/evidence','native-request-'+request.transactionId+'.json'),{schemaVersion:1,uid:process.getuid(),gid:process.getgid(),pid:process.pid,parentPid:process.ppid,requestSHA256:expectedSHA256,root,action:request.action,completedAtUTC:new Date().toISOString(),exitCode:result.exitCode??0,realCallBudget:0})
 return result
}
if(process.argv[1]&&fs.realpathSync(process.argv[1])===script){
 const [action,p,h,...extra]=process.argv.slice(2)
 if(action!=='--package'||!p||!h||extra.length){console.error('Use --package exact-request.json expectedSHA256');process.exitCode=1}
 else executeNativeInstallerRequest(p,h).then(r=>{console.log(JSON.stringify(r));process.exitCode=r.exitCode??0}).catch(e=>{console.error(e.message);process.exitCode=1})
}
