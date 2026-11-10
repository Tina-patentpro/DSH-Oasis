import {v340CatalogResponseSchema,v340ReadonlyPreparedSchema} from '../v340-runtime-contract.js'

export function selectV340Entry({catalog,nodeId,openPreview,createTask}){
 if(catalog?.nativeZeroGeneration===true){
  if(nodeId!=='Flow-2-6')throw Error('零生成模式仅开放M06只读预览')
  return openPreview()
 }
 return createTask(nodeId)
}

// View-local memory only. Never a task, revision, business cache or persisted draft.
export function createV340ZeroPreview({workspaceId,catalog,prepare}){
 const bound=v340CatalogResponseSchema.parse(catalog)
 if(bound.nativeZeroGeneration!==true||!workspaceId||typeof prepare!=='function')throw Error('缺少可信零生成上下文')
 const node=bound.nodes.find(n=>n.nodeId==='Flow-2-6'),listeners=new Set()
 let snapshot=Object.freeze({draft:{source:'local-skill',textInputs:{},filePaths:{},configuration:{}},confirmed:false,busy:false,result:null,error:null}),epoch=0,abort
 const publish=patch=>{snapshot=Object.freeze({...snapshot,...patch});for(const f of listeners)f()}
 return Object.freeze({
  node,getSnapshot:()=>snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},
  setInput(id,value){
   if(snapshot.busy)throw Error('只读准备正在进行')
   const field=node.inputs.find(f=>f.id===id)
   if(!field||typeof value!=='string')throw Error('未知预览输入')
   const channel=id.endsWith('_file')?'filePaths':field.channel==='配置'?'configuration':'textInputs',draft=structuredClone(snapshot.draft)
   if(value==='')delete draft[channel][id];else draft[channel][id]=value
   epoch++;publish({draft,confirmed:false,result:null,error:null})
  },
  setConfirmed(value){if(!snapshot.busy)publish({confirmed:value===true})},
  cancel(){epoch++;abort?.abort();publish({busy:false,result:null,confirmed:false})},
  async prepare(){
   if(snapshot.busy)throw Error('只读准备正在进行')
   if(!snapshot.confirmed)throw Error('请先确认本项目材料读取范围')
   const current=++epoch;abort=new AbortController();const signal=abort.signal
   const {textInputs,filePaths,configuration}=structuredClone(snapshot.draft)
   publish({busy:true,result:null,error:null})
   try{
    const result=v340ReadonlyPreparedSchema.parse(await prepare({workspaceId,nodeId:'Flow-2-6',confirmed:true,textInputs,filePaths,configuration},signal))
    if(current!==epoch||signal.aborted)return null
    if(result.workspaceId!==workspaceId||result.nodeId!=='Flow-2-6'||result.prepared.nodeId!=='Flow-2-6')throw Error('只读准备身份不一致')
    publish({result});return result
   }catch(error){if(current!==epoch||signal.aborted)return null;publish({error:'材料准备未完成，请核对项目与输入。'});throw error}
   finally{if(current===epoch)publish({busy:false})}
  },
 })
}
