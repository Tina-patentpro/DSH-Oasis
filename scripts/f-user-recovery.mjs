/** Installation-local, explicitly confirmed upgrade recovery. Never starts an App or generation. */
import fs from 'node:fs'
import {join,dirname,basename,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {createInterface} from 'node:readline/promises'
import * as runtime from './f-installed-runtime.mjs'
import {canonicalDirectory,assertInstalledPath} from '../patches/storage-json-single-owner/installed-lease.mjs'
export const recoverySourceFiles=[...runtime.installationControlFiles,'scripts/f-installer-transaction.mjs','scripts/f-user-recovery.mjs']
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const digest=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex')
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'))
const save=(p,x)=>fs.writeFileSync(p,typeof x==='string'?x:JSON.stringify(x,null,2)+'\n',{flag:'wx',mode:0o600})
const help='DSH-Oasis升级恢复\n\n先退出DSH Desktop，再双击安装目录的“恢复DSH-Oasis.command”。选择已记录的升级事务，查看预览，输入屏幕上的确认词后才执行。直接回车取消。\n只恢复对应程序/Profile和安装状态，不回填会话、附件或业务文件，不重新发起生成，不自动启动App。\n没有记录的旧事务、新装/回退中断、部分锁或输入变化请保留现场联系支持，不要删除锁/marker或重发升级。\n'
function owned(root,p,{directory=false}={}){assertInstalledPath(root,p,{directory});if(fs.lstatSync(p).uid!==process.getuid())throw Error('persistent recovery owner identity mismatch');return p}
function headerFor(root,files){
 canonicalDirectory(root);if(fs.statSync(root).uid!==process.getuid())throw Error('persistent recovery root owner mismatch')
 const state=read(owned(root,join(root,'installation.json')))
 const control=Object.fromEntries(runtime.installationControlFiles.map(p=>[p,hash(owned(root,join(root,'control',p)))]))
 if(!isDeepStrictEqual(control,state.controlFiles)||hash(owned(root,join(root,'control/node')))!==state.nodeSHA256)throw Error('persistent recovery control identity mismatch')
 return{schemaVersion:1,root,ownerUid:process.getuid(),nodeSHA256:state.nodeSHA256,controlFiles:control,files:{...files,'README.txt':digest(help)}}
}
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'"
function launcherFor(header,id){
 // Validate the interpreter in the shell; validate every module before importing it.
 const encoded=Buffer.from(JSON.stringify(header)).toString('base64')
 const js=`import fs from 'node:fs';import{join}from'node:path';import{createHash}from'node:crypto';import{pathToFileURL}from'node:url';try{const h=JSON.parse(Buffer.from('${encoded}','base64')),root=process.argv[1],dir=join(root,'maintenance','${id}'),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');if(root!==h.root||fs.realpathSync(root)!==root||process.getuid()!==h.ownerUid)throw Error('root identity mismatch');const check=(p,expected)=>{let at=root;for(const part of p.slice(root.length+1).split('/')){at=join(at,part);const s=fs.lstatSync(at);if(s.isSymbolicLink()||s.uid!==h.ownerUid)throw Error('source identity mismatch')}const s=fs.lstatSync(p);if(!s.isFile()||s.nlink!==1||sha(p)!==expected)throw Error('source hash mismatch')};for(const[p,v]of Object.entries(h.controlFiles))check(join(root,'control',p),v);for(const[p,v]of Object.entries(h.files))check(join(dir,p),v);const m=JSON.parse(fs.readFileSync(join(dir,'manifest.json')));if(m.id!=='${id}'||JSON.stringify(m.header)!==JSON.stringify(h)||sha(join(root,'恢复DSH-Oasis.command'))!==m.launcherSHA256)throw Error('launcher identity mismatch');const api=await import(pathToFileURL(join(dir,'scripts/f-user-recovery.mjs')));const r=await api.runRecoveryCli({root,toolId:'${id}',args:process.argv.slice(2)});process.exitCode=r.exitCode}catch(e){console.error('恢复入口已拒绝：'+e.message);process.exitCode=1}`
 return '#!/bin/sh\nset -eu\nPATH=/usr/bin:/bin\nexport PATH\nHERE=$(CDPATH= cd -- "$(/usr/bin/dirname -- "$0")" && pwd -P)\n'+
  '[ "$HERE" = '+quote(header.root)+' ] && [ ! -L "$0" ] && [ ! -L "$HERE/control" ] && [ ! -L "$HERE/control/node" ] || exit 1\n'+
  'NODE_SUM=$(/usr/bin/env -i PATH=/usr/bin:/bin /usr/bin/shasum -a 256 "$HERE/control/node")\n[ "${NODE_SUM%% *}" = '+quote(header.nodeSHA256)+' ] || { printf "%s\\n" "恢复入口已拒绝：Node已变化" >&2; exit 1; }\n'+
  'exec /usr/bin/env -i PATH=/usr/bin:/bin HOME="$HERE/data/user" LANG=en_US.UTF-8 COREPACK_ENABLE_NETWORK=0 "$HERE/control/node" --input-type=module -e '+quote(js)+' "$HERE" "$@"\n'
}
export async function installPersistentRecovery({root,sourceRoot,expectedFiles}){
 canonicalDirectory(sourceRoot)
 canonicalDirectory(root);if(fs.statSync(root).uid!==process.getuid())throw Error('persistent recovery root owner mismatch before writer admission')
 if(!isDeepStrictEqual(Object.keys(expectedFiles??{}).sort(),[...recoverySourceFiles].sort()))throw Error('explicit recovery source identities required')
 for(const p of recoverySourceFiles)if(hash(assertInstalledPath(sourceRoot,join(sourceRoot,p),{directory:false}))!==expectedFiles[p])throw Error('recovery source hash mismatch')
 return runtime.withInstalledWriter(root,'maintenance',async()=>{
  const header=headerFor(root,expectedFiles),id=digest(header),parent=join(root,'maintenance'),directory=join(parent,id),launcher=join(root,'恢复DSH-Oasis.command'),text=launcherFor(header,id)
  for(const p of runtime.installationControlFiles)if(header.files[p]!==header.controlFiles[p])throw Error('recovery companion controller identity mismatch')
  if(fs.existsSync(launcher)){owned(root,launcher);if(fs.readFileSync(launcher,'utf8')!==text)throw Error('persistent launcher identity conflict')}
  if(!fs.existsSync(parent))fs.mkdirSync(parent,{mode:0o700});owned(root,parent,{directory:true})
  if(fs.existsSync(directory))return verifyPersistentRecovery(root,id)
  fs.mkdirSync(directory,{mode:0o700})
  for(const p of recoverySourceFiles){const q=join(directory,p);fs.mkdirSync(dirname(q),{recursive:true,mode:0o700});fs.copyFileSync(join(sourceRoot,p),q)}
  save(join(directory,'README.txt'),help);save(join(directory,'manifest.json'),{header,id,launcherSHA256:digest(text)})
  if(!fs.existsSync(launcher)){save(launcher,text);fs.chmodSync(launcher,0o755)}
  return verifyPersistentRecovery(root,id)
 })
}
export function verifyPersistentRecovery(root,id){
 if(!/^[a-f0-9]{64}$/.test(id??''))throw Error('persistent recovery identity required')
 canonicalDirectory(root);if(fs.statSync(root).uid!==process.getuid())throw Error('persistent recovery root identity mismatch')
 const directory=join(root,'maintenance',id),manifest=read(owned(root,join(directory,'manifest.json'))),h=manifest.header
 if(h?.root!==root||h.ownerUid!==process.getuid()||digest(h)!==id||manifest.id!==id||!isDeepStrictEqual(Object.keys(h.files??{}).sort(),[...recoverySourceFiles,'README.txt'].sort()))throw Error('persistent recovery manifest identity mismatch')
 const files=Object.fromEntries(recoverySourceFiles.map(p=>[p,h.files[p]]))
 if(!isDeepStrictEqual(headerFor(root,files),h))throw Error('persistent recovery control identity drift')
 for(const[p,v]of Object.entries(h.files))if(hash(owned(root,join(directory,p)))!==v)throw Error('persistent recovery source hash mismatch')
 const launcher=owned(root,join(root,'恢复DSH-Oasis.command'))
 if(hash(launcher)!==manifest.launcherSHA256||fs.readFileSync(launcher,'utf8')!==launcherFor(h,id))throw Error('persistent recovery launcher hash mismatch')
 return{root,id,directory,launcher,manifest}
}
export function listUserRecoveries(root,toolId){
 const tool=verifyPersistentRecovery(root,toolId),parent=join(root,'installer-receipts');if(!fs.existsSync(parent))return[];owned(root,parent,{directory:true});const rows=[]
 for(const name of fs.readdirSync(parent).sort()){
  const match=/^([-\w]{1,80})\.([a-f0-9]{64})\.json$/.exec(name);if(!match)throw Error('unrecognized installer receipt identity')
  const path=owned(root,join(parent,name));if(hash(path)!==match[2])throw Error('installer receipt hash mismatch');const r=read(path)
  if(r.schemaVersion!==1||r.root!==root||r.id!==match[1]||r.transactionRoot!==join(root,'installer-transactions',r.id)||r.sourceSHA256!==tool.manifest.header.files['scripts/f-installer-transaction.mjs'])throw Error('installer receipt identity mismatch')
  const tx=assertInstalledPath(root,r.transactionRoot),journal=owned(root,join(tx,'transaction.json')),outcome=join(tx,'outcome.json')
  if(![r.transactionSHA256,r.beforeCurrent,r.targetRelease].every(x=>/^[a-f0-9]{64}$/.test(x??''))||hash(journal)!==r.transactionSHA256)throw Error('published journal hash identity mismatch')
  const j=read(journal);if(j.root!==root||j.transactionRoot!==r.transactionRoot||j.beforeCurrent!==r.beforeCurrent||j.targetRelease!==r.targetRelease||j.recordedAtUTC!==r.recordedAtUTC||!Number.isFinite(Date.parse(r.recordedAtUTC)))throw Error('published journal metadata identity mismatch')
  if(fs.existsSync(join(tx,'recovery-result.json')))continue
  if(fs.existsSync(outcome)&&read(owned(root,outcome)).outcome==='SUCCEEDED')continue
  rows.push({...r,receiptPath:path,receiptSHA256:match[2]})
 }
 return rows
}
export async function prepareUserRecovery({root,toolId,receipt}){
 const rows=listUserRecoveries(root,toolId),original=rows.find(r=>r.id===receipt?.id)
 if(!original||!isDeepStrictEqual(original,receipt))throw Error('published recovery receipt changed')
 const api=await import('./f-installer-transaction.mjs'),prepared=await api.prepareInstallerRecovery({root,transactionRoot:receipt.transactionRoot,expectedTransactionSHA256:receipt.transactionSHA256})
 return{...prepared,receipt}
}
export async function applyUserRecovery({root,toolId,prepared,confirmation,interaction}){
 verifyPersistentRecovery(root,toolId)
 if(confirmation!=='RESTORE '+prepared.sha256.slice(0,12))throw Error('explicit plan confirmation required')
 const rows=listUserRecoveries(root,toolId)
 if(!rows.some(r=>isDeepStrictEqual(r,prepared.receipt))||prepared.plan.root!==root||prepared.plan.transactionRoot!==prepared.receipt.transactionRoot||prepared.plan.transactionSHA256!==prepared.receipt.transactionSHA256)throw Error('published recovery plan identity mismatch')
 if(interaction&&(interaction.answer!=='恢复'||interaction.receiptId!==prepared.receipt.id))throw Error('invalid user selection confirmation')
 const api=await import('./f-installer-transaction.mjs')
 return api.applyInstallerRecovery({plan:prepared.plan,expectedPlanSHA256:prepared.sha256,userConsent:{toolId,planSHA256:prepared.sha256,confirmation,...interaction?{userAnswer:interaction.answer,selectedReceiptId:interaction.receiptId}:{}}})
}
export async function runRecoveryCli({root,toolId,args=[],question,write=s=>process.stdout.write(s+'\n')}){
 if(args.length&&!(args.length===1&&args[0]==='--list'))throw Error('only --list or interactive recovery supported')
 const rows=listUserRecoveries(root,toolId)
 write('DSH-Oasis 升级恢复：请先退出应用。此入口不重新派发生成，也不自动启动应用。')
 if(!rows.length){write('没有可恢复的已记录升级事务。旧未记录事务请保留现场联系支持。');return{exitCode:0}}
 rows.forEach((r,i)=>write((i+1)+'. 未完成的升级，记录时间：'+new Date(r.recordedAtUTC).toLocaleString('zh-CN')))
 if(args[0]==='--list')return{exitCode:0}
 let terminal;if(!question){terminal=createInterface({input:process.stdin,output:process.stdout});question=q=>terminal.question(q)}
 try{
  const selected=await question('输入要处理的编号；直接回车取消：'),receipt=/^[1-9]\d*$/.test(selected)?rows[Number(selected)-1]:rows.find(r=>r.id===selected)
  if(!selected){write('已取消，未执行恢复。');return{exitCode:0}}if(!receipt)throw Error('选择的事务不在已记录列表中')
  write('正在只读核对所选事务与安装状态……')
  const prepared=await prepareUserRecovery({root,toolId,receipt}),token='RESTORE '+prepared.sha256.slice(0,12)
  write('恢复预览：处理所选升级，恢复到这次升级开始前的版本；修复运行配置：'+(prepared.plan.restoreProfile?'是':'否')+'；保留会话、附件和业务文件；归档失败程序和锁。')
  const confirmation=await question('确认以上恢复请输入“恢复”；直接回车取消：')
  if(!confirmation){write('已取消，未执行恢复。');return{exitCode:0}}
  if(confirmation!=='恢复')throw Error('确认词不符，未执行恢复')
  const result=await applyUserRecovery({root,toolId,prepared,confirmation:token,interaction:{answer:confirmation,receiptId:receipt.id}});write('恢复已完成。可由用户手动启动应用。');return{exitCode:0,result}
 }finally{terminal?.close()}
}
