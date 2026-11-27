import {createElement as h,useEffect,useState,useSyncExternalStore} from 'react'
import {V340InputFields} from './V340GenerationPage.js'
import {GenerationSourceSwitch} from './GenerationSourceSwitch.js'
import {createV340ZeroPreview} from './v340-zero-preview.js'

export function V340ZeroPreview({workspaceId,catalog,prepare,onClose}){
 const [session]=useState(()=>createV340ZeroPreview({workspaceId,catalog,prepare}))
 const view=useSyncExternalStore(session.subscribe,session.getSnapshot,session.getSnapshot)
 // Cancel invalidates/aborts the captured request; StrictMode may subsequently reattach.
 useEffect(()=>()=>session.cancel(),[session])
 return h('section',{'aria-label':'M06零生成只读预览',style:{padding:20,overflow:'auto',minHeight:0}},
  h('header',null,h('h3',null,'权利要求初稿 · 只读预览'),h('button',{type:'button',onClick:onClose},'关闭预览')),
  h('p',{role:'note'},'零生成验收：仅核对输入与准备结果，不创建任务、不保存业务草稿、不生成、不登录、不上传或扣费。'),
  h('p',null,'本次视图关闭后不保留输入；已有业务记录、审核稿和未发送对话草稿保持不变。'),
  h(GenerationSourceSwitch,{value:'local-skill',disabled:true}),
  h('p',null,'读取仅限明确选择的当前项目材料；PDF/DOCX等格式的原准入条件保持。'),
  h('div',{style:{display:'grid',gap:12}},h(V340InputFields,{node:session.node,draft:view.draft,disabled:view.busy,idPrefix:workspaceId,
   onChange:(_,id,value)=>session.setInput(id,value)})),
  h('label',null,h('input',{type:'checkbox',checked:view.confirmed,disabled:view.busy,onChange:e=>session.setConfirmed(e.target.checked)}),'我已核对本次项目与材料读取范围'),
  h('button',{type:'button',disabled:view.busy||!view.confirmed,onClick:()=>{void session.prepare().catch(()=>{})}},view.busy?'正在只读核对…':'核对本项目材料（只读）'),
  h('button',{type:'button',disabled:true},'生成（零生成模式未开放）'),
  view.error?h('p',{role:'alert'},view.error):null,
  view.result?h('section',{'aria-label':'输入准备结果'},h('h4',null,'输入准备结果（未生成）'),
   h('p',null,`输入身份：${view.result.prepared.inputHash}`),
   h('pre',{style:{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}},JSON.stringify({receipts:view.result.prepared.receipts,warnings:view.result.prepared.warnings},null,2))):null)
}
