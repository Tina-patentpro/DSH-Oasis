import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {Context} from '@deepseek-ai/cordis'
import {LlmRuntime,BlockAssembler,createUserMessage} from '@deepseek-ai/dsh-llm'
import {createDshV340GenerationAdapter} from '../src/dsh-generation-adapter.js'
const providerPath='/Users/tinadong7036/Applications/DSH Desktop.app/Contents/Resources/app/node_modules/@deepseek-ai/dsh-llm-deepseek/lib/index.js'
const {DeepSeekAdapter,DeepSeekFileStore,resolveAdapterOptions}=await import(pathToFileURL(providerPath).href)
const sentinel='PUBLIC_SYNTHETIC_CAP_PROBE_NOT_A_REAL_CASE'
const events=[
  {type:'message_start',message:{id:'public-message',type:'message',role:'assistant',model:'deepseek-flash',content:[],stop_reason:null,usage:{input_tokens:7,output_tokens:0}}},
  {type:'content_block_start',index:0,content_block:{type:'text',text:''}},
  {type:'content_block_delta',index:0,delta:{type:'text_delta',text:'public synthetic answer'}},
  {type:'content_block_stop',index:0},
  {type:'message_delta',delta:{stop_reason:'end_turn',stop_sequence:null},usage:{output_tokens:3}},
  {type:'message_stop'},
]
const sse=events.map(e=>'event: '+e.type+'\ndata: '+JSON.stringify(e)+'\n\n').join('')

for(const mode of ['completed','completed-inherited-cap','rate-limit','transport'])test('fixed real SDK and provider emit cap32768 once without network: '+mode,async t=>{
  const root=await mkdtemp(join(tmpdir(),'m06-sdk-cap-'))
  const sdk=new Context();sdk.provide('workspaceRegistry',{get(){return null},list(){return[]}})
  await sdk.plugin(LlmRuntime).await()
  const config=resolveAdapterOptions({baseURL:'http://127.0.0.1:9/anthropic',maxTokens:32768,reasoningEffort:'high',
    retryPolicy:{mode:'normal',maxRetries:0},models:[{id:'deepseek-flash',name:'DeepSeek-V4.1-Flash-1017',contextWindow:1000000,maxTokens:32768}]})
  let authCalls=0,transportCalls=0,captured
  const provider=new DeepSeekAdapter({options:()=>config,resolveFiles:()=>new DeepSeekFileStore(join(root,'public-files.json')),
    resolveAuth:async()=>{authCalls++;return{headers:{'x-api-key':'PUBLIC_NOT_A_REAL_KEY'}}},resolveUserId:()=> 'public-cap-probe',
    // Mirror the installed provider's no-extension-service fallback, not an omitted dependency.
    prepareExtensions:async()=>({fields:{},accept:async()=>{}})})
  const unregister=sdk.llm.registerAdapter(['deepseek-official'],provider)
  t.after(async()=>{unregister();await sdk.fiber.dispose();await rm(root,{recursive:true,force:true})})
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    transportCalls++
    assert.equal(String(url),'http://127.0.0.1:9/anthropic/v1/messages','unexpected destination blocked; no real network')
    assert.equal(options.method,'POST');assert.equal(options.redirect,'error')
    const body=JSON.parse(options.body)
    assert.equal(body.model,'deepseek-flash');assert.equal(body.max_tokens,32768)
    assert.equal(body.stream,true);assert.equal((body.tools??[]).length,0)
    assert.match(JSON.stringify(body.messages),new RegExp(sentinel))
    captured={model:body.model,max_tokens:body.max_tokens,stream:body.stream,tools:(body.tools??[]).length,
      transport:'INTERCEPTED_FETCH_NO_SOCKET',auth:'PUBLIC_SYNTHETIC_ONLY_NOT_RECORDED',reasoningEffort:body.output_config?.effort??null}
    if(mode==='transport')throw new TypeError('public simulated transport failure')
    if(mode==='rate-limit')return new Response(JSON.stringify({type:'error',error:{type:'rate_limit_error',message:'public limit'}}),{status:429,headers:{'content-type':'application/json'}})
    return new Response(sse,{headers:{'content-type':'text/event-stream'}})
  })
  let publicFailure
  const tracedLlm={async prepareCall(...args){
    const prepared=await sdk.llm.prepareCall(...args)
    return {...prepared,stream:async function*(options){
      for await(const chunk of prepared.stream(options)){
        if(chunk.type==='finish'&&chunk.reason?.kind==='error')publicFailure=chunk.reason.failure
        yield chunk
      }
    }}
  }}
  const adapter=createDshV340GenerationAdapter({llm:tracedLlm,BlockAssembler,createUserMessage,captureDiagnostics:true,timeoutMs:1000})
  const request={runId:'public-cap-run',sessionId:'public-cap-session',signal:new AbortController().signal,
    instruction:{version:'V3.4.0',body:'public test instruction'},
    route:{provider:'deepseek-official',model:'deepseek-flash',reasoningEffort:'high',maxTokens:32768},assertCurrent(){},
    requestText:JSON.stringify({businessVersion:'V3.4.0',nodeId:'Flow-2-6',runId:'public-cap-run',data:sentinel})}
  // The R85 captured route omitted maxTokens; the pinned provider/model default supplied it.
  if(mode==='completed-inherited-cap')delete request.route.maxTokens
  const result=await adapter.generate(request)
  assert.equal(transportCalls,1,JSON.stringify({result,authCalls,publicFailure}));assert.equal(authCalls,1)
  if(mode.startsWith('completed')){
    assert.equal(result.status,'completed');assert.equal(result.body,'public synthetic answer')
    assert.equal(result.diagnostic.cause,'completed')
  }else{
    assert.notEqual(result.status,'completed');assert.equal(Object.hasOwn(result,'body'),false)
  }
  assert.equal(result.diagnostic.deadlineMs,1000)
  if(process.env.OASIS_M06_CAP_TEST_EXPORT)await writeFile(join(process.env.OASIS_M06_CAP_TEST_EXPORT,'cap-'+mode+'.json'),JSON.stringify({
    scope:'REAL_FIXED_SDK_PROVIDER_SERIALIZER_INTERCEPTED_FETCH_NO_MODEL_OR_NETWORK',mode,captured,transportCalls,authCalls,
    status:result.status,code:result.code??null,diagnostic:result.diagnostic,externalProviderRequests:0},null,2)+'\n',{flag:'wx',mode:0o600})
})
