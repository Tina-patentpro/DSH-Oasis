const fixtureOrigin=new URL(import.meta.url).origin,revision=new URL(import.meta.url).searchParams.get('revision')==='3'?3:4
const api=await import('/checkpoint-'+revision+'.mjs'),store=api.createDraftCheckpointStore()
let handle,input,workspaceId,sessionId,key,reads=0,writes=0,restores=0,notes=[],attachments=new Map(),subscribers=new Set()
const fenceKey=()=> 'dsh.native-draft-fence.'+key
const summary=()=>({revision,workspaceId,sessionId,reads,writes,restores,notes:[...notes],draft:input?.draft??'',attachmentCount:input?.attachmentIds.length??0,locksAvailable:typeof navigator.locks?.request==='function'})
const update=draft=>{input={...input,draft,draftRev:input.draftRev+1};for(const fn of subscribers)fn()}
async function execute(action,args={}){
 if(action==='init'){workspaceId=args.workspaceId;sessionId=args.sessionId;key=JSON.stringify([workspaceId,sessionId]);input={draft:'',draftRev:0,phase:'plain',occurrences:[],attachmentIds:[]};return summary()}
 if(action==='seed'){
  const file=new File(['PUBLIC COMMITTED FILE'],'public-committed.md',{type:'text/markdown',lastModified:0})
  await store.put(key,{schemaVersion:1,workspaceId,sessionId,generation:'COMMITTED',draft:'PUBLIC COMMITTED DRAFT',occurrences:[],attachments:[{kind:'file',file}]});localStorage.setItem(fenceKey(),'COMMITTED');return summary()
 }
 if(action==='bind'){
  handle=api.bindDraftCheckpoint({workspaceId,sessionId,currentWorkspace:()=>workspaceId,
   shell:{state:{getSnapshot:()=>input,subscribe(fn){subscribers.add(fn);return()=>subscribers.delete(fn)}},notify:(_level,note)=>notes.push(note),
    restoreCheckpoint(draft,occurrences,ids,rev){if(input.draftRev!==rev)return false;restores++;input={...input,draft,occurrences,attachmentIds:ids};for(const fn of subscribers)fn();return true}},
   conversation:{resolveDraftAttachments:ids=>ids.map(id=>attachments.get(id)).filter(Boolean),releaseDraftAttachment:id=>attachments.delete(id),
    restoreCheckpointAttachments(records){return records.map((record,i)=>{const id='PUBLIC-'+i;attachments.set(id,record);return id})}},
   store:{get:async k=>{reads++;return store.get(k)},put:async(k,v)=>{writes++;return store.put(k,v)}}})
  await handle.ready;return summary()
 }
 if(action==='edit'){update(args.draft);await handle.flush();return summary()}
 if(action==='close'){handle?.dispose();await handle?.closed;handle=null;return summary()}
 if(action==='summary')return summary()
 if(action==='read'){
  const record=await store.get(key);return{draft:record?.draft,generation:record?.generation,fence:localStorage.getItem(fenceKey()),files:await Promise.all((record?.attachments??[]).map(async a=>({name:a.file.name,bytes:a.file.size,text:await a.file.text()})))}
 }
 if(action==='uncommitted'){
  // Deliberately hold a real transaction after request success, before commit.
  localStorage.setItem(fenceKey(),'UNCOMMITTED')
  const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('dsh.native-draft-checkpoints',1);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})
  return new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite'),table=tx.objectStore('drafts'),q=table.put({schemaVersion:1,workspaceId,sessionId,generation:'UNCOMMITTED',draft:'PUBLIC MUST NOT COMMIT',occurrences:[],attachments:[]},key)
   q.onerror=()=>reject(q.error);q.onsuccess=()=>{const keep=()=>{const read=table.get(key);read.onsuccess=keep};keep();resolve({requestSucceeded:true,transactionCompleted:false})}
   tx.oncomplete=()=>{document.title='UNEXPECTED COMMIT';db.close()};tx.onabort=()=>db.close()
  })
 }
 throw Error('unknown public fixture action')
}
addEventListener('message',async event=>{if(event.source!==parent||event.origin!==fixtureOrigin||!event.data?.fixture)return;try{parent.postMessage({fixture:true,id:event.data.id,value:await execute(event.data.action,event.data.args)},fixtureOrigin)}catch(error){parent.postMessage({fixture:true,id:event.data.id,error:String(error.message)},fixtureOrigin)}})
parent.postMessage({fixture:true,ready:true,revision},fixtureOrigin)
