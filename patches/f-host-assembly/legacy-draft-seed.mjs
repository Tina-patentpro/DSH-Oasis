// Browser-only, explicit recovery into our checkpoint DB. No upload or submit.
export async function seedLegacyDraft({pack,store,fences,validate,digest=async bytes=>
 [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join(''),
 live,ownerMatches,activeSessionId}){
 const key=JSON.stringify([pack.workspaceId,pack.sessionId])
 const allowed=()=>live()&&ownerMatches()&&activeSessionId()!==pack.sessionId
 if(!allowed())return {status:'blocked'}
 const attachments=[]
 for(const item of pack.attachments){
  const bytes=Uint8Array.from(atob(item.base64),c=>c.charCodeAt(0))
  if(bytes.byteLength!==item.bytes||await digest(bytes)!==item.sha256)throw Error('legacy recovery file identity mismatch')
  attachments.push({kind:'file',file:new File([bytes],item.name,{type:item.type,lastModified:0})})
 }
 // Hashing cannot authorize writes against the state from before hashing.
 if(!allowed())return {status:'blocked'}
 if(await store.get(key)||fences.get(key)!==null)return {status:'present'}
 if(!allowed()||fences.get(key)!==null)return {status:'blocked'}
 const generation=crypto.randomUUID(),record=validate({schemaVersion:1,workspaceId:pack.workspaceId,sessionId:pack.sessionId,generation,draft:pack.draft,occurrences:[],attachments},pack.workspaceId,pack.sessionId)
 try{
  fences.set(key,generation)
  await store.addIfAbsent(key,record)
  return {status:fences.get(key)===generation?'seeded':'superseded'}
 }catch(error){
  // Never remove a newer writer's fence when our insertion lost a race.
  if(fences.get(key)===generation)fences.remove(key)
  return {status:error.name==='ConstraintError'?'present':'failed',...(error.name==='ConstraintError'?{}:{message:error.message})}
 }
}

export function createLegacyRecoverySeedStore(indexedDB=globalThis.indexedDB){
 return {async addIfAbsent(key,record){
  const db=await new Promise((resolve,reject)=>{
   const request=indexedDB.open('dsh.native-draft-checkpoints',1)
   let blocked=false
   request.onupgradeneeded=()=>request.result.createObjectStore('drafts')
   request.onerror=()=>reject(request.error)
   request.onblocked=()=>{blocked=true;reject(Error('legacy recovery database blocked'))}
   request.onsuccess=()=>{if(blocked)request.result.close();else resolve(request.result)}
  })
  try{await new Promise((resolve,reject)=>{
   const tx=db.transaction('drafts','readwrite'),request=tx.objectStore('drafts').add(record,key)
   tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(request.error??tx.error??Error('legacy recovery transaction failed'))
  })}finally{db.close()}
 }}
}
