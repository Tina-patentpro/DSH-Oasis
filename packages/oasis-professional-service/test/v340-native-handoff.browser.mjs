import {createElement as h,act,StrictMode,useSyncExternalStore} from 'react'
import {createRoot} from 'react-dom/client'
import {PanelPages} from '../src/client/PanelPages.js'
import {createWorkbenchStore} from '../src/client/workbench-store.js'
import {createWorkbenchRemote} from '../src/client/workbench-remote.js'
import {createConversationDraftBridge} from '../src/client/conversation-draft-bridge.js'

export async function runV340NativeHandoffBrowserTests(){
 globalThis.IS_REACT_ACT_ENVIRONMENT=true
 const results=[]
 for(const source of ['local-skill','oasis-api','long']){
  let input={phase:'plain',draft:'',draftRev:0,occurrences:[],imageIds:[]}
  const requests=[],opened=[]
  const bridge=createConversationDraftBridge(()=>({status:'ready',currentSessionId:'s',workspaceItems:[{workspaceId:'a',sessionIds:['s']}]}))
  bridge.register({sessionId:'s',workspaceId:'a',read:()=>input,inputActions:{setDraft(text){input={...input,draft:text,draftRev:input.draftRev+1}},submit(){throw Error('must not send')}}})
  const remote=createWorkbenchRemote({rpc:{async call(_ch,endpoint,payload){requests.push(endpoint);return(await fetch(`/rpc?source=${source}`,{method:'POST',body:JSON.stringify({endpoint,payload})})).json()}}})
  const store=createWorkbenchStore({remote,saveDelayMs:0,conversationDrafts:bridge,nativeFiles:{captureSavedFileTarget:id=>({workspaceId:id}),openSavedFile(target,file){if(target.workspaceId!==file.workspaceId)return false;opened.push(file);return true}}})
  const container=document.createElement('section');container.style.borderTop='1px solid #ccc';document.body.append(container);const root=createRoot(container)
  const check=(ok,message)=>{if(!ok)throw Error(message)},button=label=>[...container.querySelectorAll('button')].find(b=>b.textContent===label)
  async function click(label){await act(async()=>{const b=button(label);check(b&&!b.disabled,'missing enabled '+label);b.click();await new Promise(r=>setTimeout(r,30));await store.whenSettled('a')})}
  function Panel(){const state=useSyncExternalStore(store.subscribe,()=>store.getWorkspaceState('a'));return h(PanelPages,{state:{...state,conversationUnavailableReason:bridge.unavailableReason('a')},savedFileUnavailableReason:null,
   v340Actions:{review:(p,t,c)=>store.reviewV340Result('a',p,t,c),prepareSave:(p,t)=>store.prepareV340Save('a',p,t),confirmSave:(p,v)=>store.setV340SaveConfirmation('a',p,v),commitSave:p=>store.commitV340Save('a',p),
    useReference:(p,t)=>store.useV340InConversation('a',p,t),openSaved:(p,t,w)=>store.openV340SavedFile('a',p,t,w)}})}
  try{
   store.syncWorkspaces([{workspaceId:'a'}]);await store.hydrateWorkspace('a');await store.loadWorkflowCatalog('a');await act(async()=>root.render(h(StrictMode,null,h(Panel))))
   await click('查看结果')
   if(source!=='long'){await click('审核此版本');await click('确认审核此版本')}
   const page=store.getWorkspaceState('a').pages[0],run=page.v340.runs[page.v340.activeRunId],version=run.resultVersions.find(v=>v.versionId===(run.activeVersionId??run.runId))
   if(source==='long'){
    check(button('使用固定审核版本').disabled,'long reference should be disabled')
    check(container.querySelector('[aria-label="固定审核版本全文（可复制）"]').value===version.result.body,'copy fallback lost bytes')
    check(container.textContent.includes('未截断'),'missing limit explanation')
   }else{
    await click('使用固定审核版本');check(input.draft.endsWith(version.result.body),'fixed draft lost body');check(button('使用固定审核版本').disabled,'existing composer should block overwrite')
   }
   await click('准备保存当前版本');check(button('确认保存文件').disabled,'save must need consent')
   await act(async()=>container.querySelector('input[type=checkbox]').click());await click('确认保存文件');await click('打开当前文件')
   check(opened.length===1&&opened[0].matchesReviewed,'original file mismatch')
   await fetch(`/change?source=${source}`,{method:'POST'});await click('打开当前文件')
   check(opened.length===2&&!opened[1].matchesReviewed,'changed file acquired review')
   check(container.textContent.includes('原审核结论不适用于当前文件'),'missing changed-file warning')
   check(!requests.some(x=>x.endsWith('run/create')),'unexpected generation request')
   results.push({source,status:'passed',checks:source==='long'?'full readonly copy + overflow guard + Markdown save/open/change; no real native host':'React DOM/StrictMode + real RPC/disk: reviewed fixed draft, no overwrite/send, Markdown save and current-file drift warning; native interface synthetic'})
  }catch(error){results.push({source,status:'failed',message:error.message})}
  finally{await act(async()=>root.unmount());await store.dispose();bridge.dispose();container.remove()}
 }
 return results
}
