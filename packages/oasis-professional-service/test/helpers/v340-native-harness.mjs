import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, realpath, readFile, writeFile, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { openOasisWorkbenchRepository } from '../../src/workbench-repository.js'
import { createV340RuntimeService } from '../../src/v340-runtime-service.js'
import { createV340PreparationService } from '../../src/v340-preparation.js'
import { prepareV340Inputs, assembleV340Document } from '../../src/v340-document.js'
import { getV340Catalog, v340Hash } from '../../src/v340-catalog.js'
import { parseStoredWorkbenchRecord } from '../../src/workbench-domain.js'
import { canonicalJson } from '../../src/local-mock-runner.js'
import { createWorkbenchService } from '../../src/workbench-service.js'
import { createWorkspaceMaterialManager } from '../../src/workspace-materials.js'
const url = new URL('../../src/v340-native-model.js', import.meta.url)
const api = await import(url).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url === url.href) return {}
  throw error
})
export const NOW='2026-10-23T08:00:00.000Z'
export const MODEL_OUTPUT={summary:'公开合成结论，未验证专业质量',core_result_markdown:'1. 一种公开测试用阀体，包括壳体和弹簧。',updates:[],tables:{},terms_master:[],warnings:[],model_completions:[]}
const draft=(patch={})=>({source:'local-skill',textInputs:{disclosure_text:'公开合成阀体：壳体内置弹簧与阀芯。',drawings_text:'图1：壳体和阀芯。',claim_requirements_text:'关注阀芯结构。',user_input:'仅根据公开合成材料撰写。'},filePaths:{},configuration:{},...patch})
export class Assembler {data=new Map();push(c){if(c.type==='text-delta')this.data.set(c.index,(this.data.get(c.index)??'')+c.text);if(c.type==='block-end')this.data.set(c.index,c.block.text)}blocks(){return [...this.data.values()].map(text=>({type:'text',text}))}}
const finish={type:'finish',reason:{kind:'stop'}}
const text=body=>({type:'text-delta',index:0,text:body})
export const tick=()=>new Promise(r=>setImmediate(r))
export const defer=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return{promise,resolve}}
export async function setupNative(t, options={}) {
  assert.equal(typeof api.createV340NativeCandidate,'function')
  const root=await realpath(await mkdtemp(join(tmpdir(),'v340-native-candidate-'))),file=join(root,'records.json');await writeFile(file,'{}')
  const disk={file,fail:false,afterPut:null,async open(){let records=JSON.parse(await readFile(file,'utf8'));return{table(){return{get:id=>structuredClone(records[id]),async put(id,value){if(disk.fail)throw Error('synthetic disk failure');const next={...records,[id]:value};await writeFile(file+'.tmp',JSON.stringify(next));await rename(file+'.tmp',file);records=next;await disk.afterPut?.(id,value)}}},async close(){}}}}
  const repository=await openOasisWorkbenchRepository(disk,{clock:()=>NOW})
  const route={provider:'synthetic-native-test',model:'fixture-model'},seen={prepare:0,stream:0,options:null}
  const workspace={id:'w',path:root,sessionIds:['s'],async status(){return'ok'}},session={id:'s',header:{cwd:root},requestHeader(){return undefined}}
  const ctx={workspaceRegistry:{get:id=>id==='w'?workspace:null,list:()=>[workspace]},sessions:{get:id=>id==='s'?session:null},sessionProjections:{stateOf:()=>({pending:{...route}})},agentDefaultModel:{currentSelection:()=>({...route})},llm:{async prepareCall(config,signal){seen.prepare++;await options.onPrepare?.();return{config:{...config},stream(call){seen.stream++;seen.options=call;return options.stream?options.stream(call):(async function*(){yield text(JSON.stringify(options.output??MODEL_OUTPUT));yield finish})()}}}}}
  const executor=api.createV340NativeCandidate({nodeId:options.nodeId??'Flow-2-6',ctx,native:{BlockAssembler:Assembler,createUserMessage:v=>({role:'user',...v})},timeoutMs:options.timeoutMs??200})
  const preparation=createV340PreparationService({materialManager:createWorkspaceMaterialManager({workspaceRegistry:ctx.workspaceRegistry})})
  const service=createV340RuntimeService({repository,preparation,executor:options.wrapExecutor?.(executor)??executor,clock:()=>NOW})
  const command=extra=>({workspaceId:'w',taskId:'t',expectedRevision:repository.get('w').revision,...extra})
  await service.createV340Task(command({nodeId:options.nodeId??'Flow-2-6',title:'新版候选'}))
  await service.updateV340Draft(command({draft:options.draft??draft()}))
  const task=()=>repository.get('w').tasks.t.v340,run=()=>task().runs[task().activeRunId]
  const confirm=async()=>{const d=task().draft;const ready=await preparation.prepareV340({workspaceId:'w',nodeId:task().nodeId,confirmed:true,textInputs:d.textInputs,filePaths:d.filePaths,configuration:d.configuration});return executor.prepareConfirmation({workspaceId:'w',taskId:'t',sessionId:'s',expectedRevision:repository.get('w').revision,prepared:ready.prepared})}
  const create=async(key='request-one',candidate)=>service.createV340Run(command({requestKey:key,candidate:candidate??{sessionId:'s',confirmed:true,sha256:(await confirm()).sha256}}))
  const settle=async()=>{for(let n=0;n<500&&run()?.status==='prepared';n++)await new Promise(r=>setTimeout(r,1));return run()}
  t.after(async()=>{await service.closeV340Runtime();await repository.close();await rm(root,{recursive:true,force:true})})
  return{root,file,disk,repository,service,preparation,executor,ctx,workspace,session,route,seen,command,task,run,confirm,create,settle}
}
