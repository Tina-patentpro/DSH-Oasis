import {createElement as h,act,StrictMode,useSyncExternalStore} from 'react'
import {createRoot} from 'react-dom/client'
import {PanelPages} from '../src/client/PanelPages.js'
import {createWorkbenchStore} from '../src/client/workbench-store.js'
import {createWorkbenchRemote} from '../src/client/workbench-remote.js'

export async function runV340P2BrowserTests(){
 globalThis.IS_REACT_ACT_ENVIRONMENT=true
 const results=[]
 for(const scenario of ['empty','catalog','legacy']){
  const requests=[],remote=createWorkbenchRemote({rpc:{async call(_c,endpoint,payload){requests.push(endpoint);return(await fetch(`/rpc?source=${scenario}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({endpoint,payload})})).json()}}})
  let attempts=0
  const scoped=scenario==='catalog'?{...remote,async getV340Catalog(...args){if(++attempts===1)throw Error('synthetic transient');return remote.getV340Catalog(...args)}}:remote
  const store=createWorkbenchStore({remote:scoped,saveDelayMs:0}),container=document.createElement('section');document.querySelector('#demo').append(container)
  const root=createRoot(container),check=(v,message)=>{if(!v)throw Error(message)}
  const button=text=>[...container.querySelectorAll('button')].find(b=>b.textContent===text)
  const actions={create:node=>{void store.createV340Task('a',node).catch(()=>{})},retryCatalog:()=>store.loadV340Catalog('a'),
   saveEditDraft:(p,t,b)=>store.saveV340ResultDraft('a',p,t,b),edit:(p,t)=>store.editV340Result('a',p,t),selectVersion:(p,r,v)=>store.selectV340Version('a',p,r,v)}
  function Panel(){const state=useSyncExternalStore(store.subscribe,()=>store.getWorkspaceState('a'));return h(PanelPages,{state,showFunctionCenter:scenario==='empty'&&state.activePageId===null,v340Actions:actions})}
  async function click(text){await act(async()=>{const b=button(text);check(b&&!b.disabled,'missing/enabled '+text);b.click();await new Promise(r=>setTimeout(r,15));await store.whenSettled('a')})}
  try{
   store.syncWorkspaces([{workspaceId:'a'}]);await store.hydrateWorkspace('a');await store.loadWorkflowCatalog('a');await act(async()=>root.render(h(StrictMode,null,h(Panel))))
   if(scenario==='empty'){
    const card=[...container.querySelectorAll('button')].find(b=>b.textContent.includes('输入与结果'))
    await act(async()=>{check(card,'first task card missing');card.click();card.click();await new Promise(r=>setTimeout(r,15));await store.whenSettled('a')})
    const state=store.getWorkspaceState('a');check(state.pages.length===1&&!!state.activePageId,'first task not activated');check(requests.filter(x=>x.endsWith('task/create')).length===1,'duplicate task creation')
    check(container.querySelector('[aria-label="共同输入与结果"]'),'new shared page missing')
   }else if(scenario==='catalog'){
    check(container.textContent.includes('新版目录读取失败'),'catalog error hidden');check(store.getWorkspaceState('a').workflows.length>0,'legacy catalog lost')
    const draft=JSON.stringify(store.getWorkspaceState('a').pages[0].v340.draft)
    await click('重试新版目录');await act(async()=>{await store.loadV340Catalog('a')})
    check(container.querySelector('[aria-label="研究请求文本"]'),'fields did not recover');check(JSON.stringify(store.getWorkspaceState('a').pages[0].v340.draft)===draft,'retry changed draft')
   }else{
    await click('查看结果')
    const raw=container.querySelector('[aria-label="旧草稿原文"]'),before=raw?.value
    check(raw?.readOnly&&before.includes('旧整稿恢复合成文本'),'legacy full text not recoverable')
    check(button('审核此版本').disabled,'legacy draft must not be silently approved')
    await click('编辑结果');check(container.querySelector('[aria-label="修订结果"]').value==='公开原始正文','legacy full document was inferred as core')
    await act(async()=>{const field=container.querySelector('[aria-label="修订结果"]');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(field,'明确的新核心正文');field.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,10));await store.whenSettled('a')})
    await click('保存为新版本');check(container.textContent.includes('明确的新核心正文'),'new core version missing');await click('版本 1')
    check(container.querySelector('[aria-label="旧草稿原文"]').value===before,'legacy original was overwritten')
   }
   results.push({scenario,status:'passed',checks:scenario==='empty'?'空项目首次创建/激活，双击仅一份任务':scenario==='catalog'?'目录失败可见、明确重试恢复，旧目录与草稿保持':'旧整稿只读恢复、新核心另存、切回旧稿逐字保持'})
  }catch(error){results.push({scenario,status:'failed',message:error.message})}
  finally{
   // Keep the last real recovery component visible as this temporary fixture's proof.
   if(scenario!=='legacy'){await act(async()=>root.unmount());await store.dispose();container.remove()}
  }
 }
 return results
}
