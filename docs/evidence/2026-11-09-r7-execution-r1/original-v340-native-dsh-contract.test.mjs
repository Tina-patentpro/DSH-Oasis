// Installed DSH contracts, in-memory Cordis context, offline provider only. No app startup or real request.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import { LlmRuntime, LlmAdapter, BlockAssembler, createUserMessage } from '@deepseek-ai/dsh-llm'
import { setupNative, MODEL_OUTPUT } from './helpers/v340-native-harness.mjs'
import { NODE_CASES } from './helpers/v340-native-cases.mjs'
import { createV340NativeCandidate } from '../src/v340-native-model.js'
import { v340Hash } from '../src/v340-catalog.js'

const draft=()=>({source:'local-skill',textInputs:{user_input:'公开合成来源文本：壳体长度为十毫米。'},filePaths:{},configuration:{}})
for(const {nodeId} of NODE_CASES)test(nodeId+' uses installed native LlmRuntime and assembler with offline provider only',async t=>{
 t.mock.method(globalThis,'fetch',()=>assert.fail('network must never be used'))
 const ctx=new Context();ctx.provide('workspaceRegistry',{get:()=>undefined});t.after(()=>ctx.fiber.dispose())
 await ctx.plugin(LlmRuntime).await()
 let call,attempts=0,executor
 class Provider extends LlmAdapter {
  async resolveModel(provider,model){return{provider,id:model,name:model}}
  async *stream(options){
   call=options;attempts++
   yield{type:'reasoning-delta',index:0,text:'PRIVATE_REASONING_NOT_RESULT'}
   const body=JSON.stringify(MODEL_OUTPUT),at=Math.floor(body.length/2)
   yield{type:'block-start',index:1,blockType:'text'}
   yield{type:'text-delta',index:1,text:body.slice(0,at)}
   yield{type:'text-delta',index:1,text:body.slice(at)}
   yield{type:'block-end',index:1,block:{type:'text',text:body}}
   yield{type:'finish',reason:{kind:'stop'}}
  }
 }
 t.after(ctx.llm.registerAdapter(['synthetic-native-test'],new Provider()))
 const h=await setupNative(t,{nodeId,draft:draft(),wrapExecutor:e=>({...e,generate:args=>executor.generate(args)})})
 executor=createV340NativeCandidate({nodeId,ctx:{...h.ctx,llm:ctx.llm},native:{BlockAssembler,createUserMessage}})
 await h.create();assert.equal((await h.settle()).status,'completed');assert.equal(attempts,1)
 const sent=JSON.parse(call.messages[0].content[0].text);assert.equal(sent.nodeId,nodeId);assert.equal(sent.receipts.user_input.sha256,v340Hash(draft().textInputs.user_input))
 assert.equal(typeof call.messages[0].id,'string');assert.equal(call.messages[0].role,'user')
 assert.equal(call.tools,undefined);assert.doesNotMatch(h.run().result.body,/PRIVATE_REASONING/)
 await h.create();assert.equal(attempts,1)
})
