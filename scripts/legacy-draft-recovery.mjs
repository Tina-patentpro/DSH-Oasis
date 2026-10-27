/** Explicit, read-only recovery of a named historical public draft. Never scans orphan stores. */
import {readFileSync,lstatSync,realpathSync} from 'node:fs'
import {resolve,relative,sep,basename,isAbsolute,join} from 'node:path'
import {createHash} from 'node:crypto'
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
function regular(path){
 const absolute=resolve(path)
 if(realpathSync(absolute)!==absolute||lstatSync(absolute).isSymbolicLink()||!lstatSync(absolute).isFile())throw Error('recovery link or non-regular file refused')
 return absolute
}
function identified({path,sha256}){
 const raw=readFileSync(regular(path))
 if(!/^[a-f0-9]{64}$/.test(sha256)||hash(raw)!==sha256)throw Error('recovery input identity mismatch')
 return raw
}
export function prepareLegacyDraftRecovery(spec){
 if(spec?.schemaVersion!==1||!spec.workspaceId||!spec.sessionId||typeof spec.expectedDraft!=='string'||!spec.expectedDraft)throw Error('recovery evidence identity missing')
 const sourceRoot=realpathSync(spec.sourceRoot),sourceWorkspacePath=realpathSync(spec.sourceWorkspacePath)
 if(sourceRoot!==resolve(spec.sourceRoot)||sourceWorkspacePath!==resolve(spec.sourceWorkspacePath))throw Error('recovery link refused')
 const inside=(root,path)=>{const rel=relative(root,path);return rel!==''&&!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel)}
 if(!inside(sourceRoot,sourceWorkspacePath))throw Error('recovery workspace escaped source')
 const membershipPath=regular(spec.workspace.path)
 if(!inside(sourceRoot,membershipPath))throw Error('recovery ownership input escaped source')
 const membership=JSON.parse(identified(spec.workspace)),rows=membership.tables?.workspaces
 const owners=Object.entries(rows??{}).filter(([,row])=>row.sessionIds?.includes(spec.sessionId))
 if(membership.unit?.name!=='workspace'||membership.unit.version!==2||owners.length!==1||owners[0][0]!==spec.workspaceId||owners[0][1].path!==sourceWorkspacePath)throw Error('recovery ownership absent, ambiguous or mismatched')
 if(spec.target?.workspaceId!==spec.workspaceId||spec.target?.sessionId!==spec.sessionId||realpathSync(spec.target.workspacePath)!==resolve(spec.target.workspacePath))throw Error('recovery target identity mismatch')
 if(!Array.isArray(spec.evidence)||!spec.evidence.length)throw Error('recovery evidence missing')
 const evidence=spec.evidence.map(identified).map(bytes=>bytes.toString('utf8')).join('\n')
 if(!evidence.includes('Value: '+spec.expectedDraft)||!evidence.includes('row (selected)'))throw Error('recovery unsent draft evidence missing')
 if(!Array.isArray(spec.attachments)||!spec.attachments.length||spec.attachments.length>16)throw Error('recovery attachment count invalid')
 let bytes=Buffer.byteLength(spec.expectedDraft);const names=new Set()
 const attachments=spec.attachments.map(item=>{
  if(typeof item.name!=='string'||basename(item.path)!==item.name||names.has(item.name)||!evidence.includes(item.name))throw Error('recovery filename evidence missing')
  names.add(item.name)
  const path=regular(item.path)
  const original=regular(item.originalPath??item.path)
  if(!inside(sourceWorkspacePath,original)||basename(original)!==item.name)throw Error('recovery attachment escaped owning workspace')
  if(path!==original&&path!==join(sourceRoot,'home/attachments/v1/files',item.sha256.slice(0,2),item.sha256,item.name))throw Error('recovery orphan storage path mismatch')
  identified({path:original,sha256:item.sha256})
  const raw=identified(item);bytes+=raw.length
  if(raw.length!==item.bytes||bytes>32*1024*1024)throw Error('recovery byte identity or capacity mismatch')
  return {kind:'file',name:item.name,type:item.mediaType??'application/octet-stream',lastModified:0,originalLastModifiedKnown:false,bytes:raw.length,sha256:hash(raw),base64:raw.toString('base64')}
 })
 return {schemaVersion:1,workspaceId:spec.workspaceId,sessionId:spec.sessionId,sourceRoot,sourceWorkspacePath,targetWorkspacePath:resolve(spec.target.workspacePath),draft:spec.expectedDraft,occurrences:[],attachments,
  receiptPolicy:'discard-and-require-explicit-retry',attribution:'explicit-historical-evidence-recovery; not original receipt reconstruction',evidence:spec.evidence.map(({path,sha256})=>({path:regular(path),sha256}))}
}
