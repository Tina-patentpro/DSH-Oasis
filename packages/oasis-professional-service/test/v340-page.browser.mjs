import {createElement as h,act,StrictMode,useSyncExternalStore} from 'react'
import {createRoot} from 'react-dom/client'
import {PanelPages} from '../src/client/PanelPages.js'
import {createWorkbenchStore} from '../src/client/workbench-store.js'
import {createWorkbenchRemote} from '../src/client/workbench-remote.js'

export async function runV340BrowserTests(){
 globalThis.IS_REACT_ACT_ENVIRONMENT=true
 const results=[]
 for(const source of ['local-skill','oasis-api']){
  const requests=[]
  const remote=createWorkbenchRemote({rpc:{async call(_channel,endpoint,payload){
   requests.push(endpoint)
   const response=await fetch(`/rpc?source=${source}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({endpoint,payload})});return response.json()
  }}})
  const store=createWorkbenchStore({remote,saveDelayMs:0}),container=document.createElement('section');document.body.append(container)
  const root=createRoot(container)
  const check=(condition,message)=>{if(!condition)throw Error(message)}
  const button=text=>[...container.querySelectorAll('button')].find(b=>b.textContent===text)
  const settle=()=>store.whenSettled('a')
  async function click(text){await act(async()=>{const b=button(text);check(b&&!b.disabled,'missing/enabled '+text);b.click();await new Promise(r=>setTimeout(r,30));await settle()})}
  async function input(label,value){await act(async()=>{const field=container.querySelector(`[aria-label="${label}"]`);check(field,'missing '+label)
   Object.getOwnPropertyDescriptor(field instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(field,value)
   field.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,10));await settle()})}
  const actions={saveDraft:(p,d)=>store.saveV340Draft('a',p,d),saveEditDraft:(p,t,b)=>store.saveV340ResultDraft('a',p,t,b),edit:(p,t)=>store.editV340Result('a',p,t),
   review:(p,t,c)=>store.reviewV340Result('a',p,t,c),selectVersion:(p,r,v)=>store.selectV340Version('a',p,r,v),prepareSave:(p,t)=>store.prepareV340Save('a',p,t),
   confirmSave:(p,v)=>store.setV340SaveConfirmation('a',p,v),commitSave:p=>store.commitV340Save('a',p)}
  function Panel(){const state=useSyncExternalStore(store.subscribe,()=>store.getWorkspaceState('a'));return h(PanelPages,{state,v340Actions:actions})}
  try{
   store.syncWorkspaces([{workspaceId:'a'}]);await store.hydrateWorkspace('a');await store.loadWorkflowCatalog('a')
   await act(async()=>root.render(h(StrictMode,null,h(Panel))))
   await input('研究请求文本','逐字输入\n  保留空白')
   check(store.getWorkspaceState('a').pages[0].v340.draft.textInputs.research_request_text==='逐字输入\n  保留空白','input not persisted')
   await click('查看结果');await click('编辑结果');await input('修订结果',`${source} DOM人工修订\n  保留空白`)
   check(button('审核此版本').disabled,'draft must block review')
   await click('保存为新版本');await click('版本 1');await click('版本 2')
   check(container.textContent.includes(`${source} DOM人工修订`),'version switched to wrong content')
   await click('审核此版本')
   check(!store.getWorkspaceState('a').pages[0].v340.runs[store.getWorkspaceState('a').pages[0].v340.activeRunId].resultVersions.at(-1).review.status.includes('approved'),'entry must not approve')
   await click('取消审核');await click('审核此版本');await click('版本 1')
   check(!button('确认审核此版本'),'switching version must invalidate review confirmation')
   await click('版本 2');await click('审核此版本')
   await act(async()=>{const confirm=button('确认审核此版本');confirm.click();confirm.click();await new Promise(r=>setTimeout(r,20));await settle()})
   check(requests.filter(e=>e.endsWith('result/review')).length===1,'double confirmation called Host twice')
   await click('准备保存当前版本')
   check(button('确认保存文件').disabled,'save must require confirmation')
   await act(async()=>{container.querySelector('input[type=checkbox]').click()})
   await click('确认保存文件')
   check(container.textContent.includes('已保存：'),'save receipt missing')
   const before=store.getWorkspaceState('a').pages[0].v340
   await act(async()=>root.unmount());await store.dispose()
   const reopened=createWorkbenchStore({remote,saveDelayMs:0});reopened.syncWorkspaces([{workspaceId:'a'}]);await reopened.hydrateWorkspace('a')
   check(JSON.stringify(reopened.getWorkspaceState('a').pages[0].v340)===JSON.stringify(before),'reopen changed versions/review/save')
   await reopened.dispose()
   results.push({source,status:'passed',checks:'real React DOM/StrictMode + RPC/disk: input, edit, version, explicit review, no-overwrite save, reopen'})
  }catch(error){results.push({source,status:'failed',message:error.message})}
  finally{try{root.unmount()}catch{};await store.dispose();container.remove()}
 }
 return results
}
