const { createHash } = require('node:crypto')
const { spawnSync } = require('node:child_process')
const { readFileSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const mode = process.env.OASIS_BATCH_MODE
const root = process.env.OASIS_BATCH_ROOT
if (!root || !['proof','negative','missing','live','observe'].includes(mode)) throw Error('Invalid isolated single-run guard')
const bound = JSON.parse(readFileSync(join(root, 'batch.json')))
const { cases, proposal } = bound
if(cases.length!==1||cases[0].id!=='M02'||cases[0].requestKey!==proposal.requestKey)
  throw Error('Single approved request is required')
const wire = join(root, 'wire')
const endpoint = 'https://api.deepseek.com/anthropic/v1/messages'
const nativeFetch = globalThis.fetch
const hash = value => createHash('sha256').update(value).digest('hex')
const normalized = value => Array.isArray(value) ? value.map(normalized)
  : value !== null && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key, child])=>[key,normalized(child)]))
    : value
const canonical = value => JSON.stringify(normalized(value))
const record = (caseId,suffix,value) => writeFileSync(join(wire,caseId+'.'+suffix+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600})

function fixture(model, id) {
  const material=cases[0].expectedValues.technical_analysis_material_text
  const source={content_id:'p1-source',content_markdown:material,content_origin:'user_text',source_input_id:'technical_analysis_material_text',
    source_locator:material,source_hash:hash(material),
    trust_status:'source_fact',last_updated_flow:'Flow-1-2',revision_reason:'固定输入原文摘录'}
  const supplement={content_id:'supplement-1',content_markdown:'可按状态分离考虑位移要求，待验证。',content_origin:'model_completed',source_input_id:'none',source_locator:'分析建议，待验证',source_hash:'none',trust_status:'hypothesis_to_verify',last_updated_flow:'Flow-1-2',revision_reason:'定性分析补齐'}
  const completion={content_id:'supplement-1',content_origin:'model_completed',human_confirmation_status:'pending',completion_basis:'P1 定性预期',assumptions:'状态分离可行性待验证',confidence:'low',affected_section:'TRIZ 转化'}
  const output=JSON.stringify({summary:'M02 双向配对离线验证' ,core_result_markdown:'P1 在调整和保持两状态对位移要求不同，定性预期未实测。',
    updates:mode==='negative'?[source]:[source,supplement],tables:{T1:[{row_id:'P1',data:{question:'调整与保持的位移约束'}}],T2:[],
    T3:[{row_id:'E1',data:{target_problems:['P1'],expected_effect:'调整允许移动，保持限制移动',evidence:'未实测'}}]},
    terms_master:[],warnings:[],model_completions:mode==='missing'?[]:[completion]})
  const frames = [
    { type:'message_start', message:{ id:'fixture-'+id,type:'message',role:'assistant',model,content:[],usage:{input_tokens:512,output_tokens:0} } },
    { type:'content_block_start',index:0,content_block:{type:'text',text:''} },
    { type:'content_block_delta',index:0,delta:{type:'text_delta',text:output} },
    { type:'content_block_stop',index:0 },
    { type:'message_delta',delta:{stop_reason:'end_turn',stop_sequence:null},usage:{output_tokens:63} },
    { type:'message_stop' },
  ]
  return new Response(frames.map(x=>'event: '+x.type+'\ndata: '+JSON.stringify(x)+'\n\n').join(''),
    {status:200,headers:{'content-type':'text/event-stream','request-id':'offline-'+id}})
}

async function balance(key) {
  const response = await nativeFetch('https://api.deepseek.com/user/balance', {
    headers:{authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(8000),
  })
  if (!response.ok) return { http:response.status }
  const payload = await response.json()
  const cny = payload.balance_infos?.find(row=>row.currency==='CNY')
  if (!cny || typeof cny.total_balance!=='string' || !/^\d+(?:\.\d+)?$/.test(cny.total_balance)) return {http:200,currency:null}
  return {http:200,currency:'CNY',available:payload.is_available===true,total:cny.total_balance}
}
async function captureTerminal(stream, caseId, key, response) {
  const state = {}
  let buffer = ''
  const decoder = new TextDecoder()
  const add = fields => {
    if (!fields) return
    for (const name of ['input_tokens','output_tokens','cache_read_input_tokens','cache_creation_input_tokens'])
      if (Number.isSafeInteger(fields[name])&&fields[name]>=0) state[name]=fields[name]
  }
  let stopReason = null, messageId = null, providerModel = null, messageStop = false, finalUsage = false
  try {
    if (stream) for await (const bytes of stream) {
      buffer+=decoder.decode(bytes,{stream:true})
      for (;;) {
        const at=buffer.indexOf('\n')
        if (at<0) break
        const line=buffer.slice(0,at).trim()
        buffer=buffer.slice(at+1)
        if (!line.startsWith('data: ')) continue
        let event
        try{event=JSON.parse(line.slice(6))}catch{continue}
        if (event.type==='message_start') {
          add(event.message?.usage)
          messageId=event.message?.id??null;providerModel=event.message?.model??null
        }
        if (event.type==='message_delta') {
          add(event.usage);stopReason=event.delta?.stop_reason??stopReason
          if(Number.isSafeInteger(event.usage?.output_tokens)&&event.delta?.stop_reason)finalUsage=true
        }
        if (event.type==='message_stop') messageStop=true
      }
      if(buffer.length>4_194_304)throw Error('Oversized provider event')
    }
  } catch { state.streamIncomplete = true }
  const requestId=response.headers.get('request-id')??response.headers.get('x-request-id')??response.headers.get('x-deepseek-request-id')
  const after=key?await balance(key).catch(()=>({unavailable:true})):null
  record(caseId,'end',{at:new Date().toISOString(),http:response.status,requestId,messageId,providerModel,stopReason,messageStop,finalUsage,usage:state,balanceAfter:after})
}

globalThis.fetch = async (target, options) => {
  const url = new URL(typeof target==='string'||target instanceof URL ? target : target.url)
  if(url.hostname==='127.0.0.1'||url.hostname==='localhost')return nativeFetch(target,options)
  if(url.href!==endpoint||options?.method!=='POST'||typeof options.body!=='string'||options.redirect!=='error')
    throw Error('Isolated batch blocked an unrelated outbound request')
  if(mode==='observe')throw Error('Observation cannot dispatch')
  const body=JSON.parse(options.body)
  const msg=body.messages?.[0]
  const block=msg?.content?.[0]
  const keys=(value,...allowed)=>Object.keys(value??{}).every(name=>allowed.includes(name))
  if(body.model!=='deepseek-flash'||body.max_tokens!==16384||body.output_config?.effort!=='low'
    ||body.thinking?.type!=='enabled'||body.stream!==true||body.messages.length!==1
    ||msg.role!=='user'||msg.content.length!==1||block.type!=='text'||typeof body.system!=='string'
    ||!keys(body,'model','max_tokens','thinking','output_config','stream','messages','system')
    ||!keys(msg,'role','content')||!keys(block,'type','text')||!keys(body.thinking,'type')||!keys(body.output_config,'effort'))
    {
      if(mode==='offline') console.error('Wire shape rejected:', Object.keys(body),Object.keys(msg??{}),Object.keys(block??{}))
      throw Error('Isolated batch rejected a changed model, route or request structure')
    }
  const request=JSON.parse(block.text)
  const entry=cases.find(item=>item.requestKey===request.requestKey&&item.nodeId===request.nodeId)
  if(!entry)throw Error('Isolated batch rejected an unlisted request')
  const meta={nodeId:request.nodeId,requestKey:request.requestKey,runId:request.runId,
    model:body.model,effort:body.output_config.effort,maxOutputTokens:body.max_tokens,
    serializedBytes:Buffer.byteLength(options.body),systemSha256:hash(body.system),
    inputContentSha256:hash(canonical(request.values)),tools:0,at:new Date().toISOString(),mode}
  const tokenization=spawnSync('/usr/bin/python3',[proposal.tokenizerScript],{
    input:options.body,encoding:'utf8',timeout:12000,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'},
  })
  if(tokenization.status!==0){
    if(mode==='offline')console.error('Tokenizer:',tokenization.error?.code??tokenization.stderr?.trim().split('\n').at(-1))
    throw Error('Pinned offline tokenizer did not complete')
  }
  const counts=JSON.parse(tokenization.stdout)
  if(!Number.isSafeInteger(counts.promptTokens)||!Number.isSafeInteger(counts.fullWireTokens))throw Error('Invalid token proof')
  Object.assign(meta,counts,{inputTokenBudget:32000,protocolReserveTokens:2000,
    conservativeInputTokens:Math.max(counts.promptTokens,counts.fullWireTokens)+2000})
  if(meta.conservativeInputTokens>meta.inputTokenBudget) {
    record(entry.id,'blocked',meta)
    throw Error('Isolated batch rejected a request above its input token budget')
  }
  if(meta.systemSha256!==proposal.promptSha256||meta.inputContentSha256!==proposal.inputContentSha256
    ||meta.maxOutputTokens!==proposal.outputTokenCeiling||meta.inputTokenBudget!==proposal.inputTokenCeiling
    ||request.requestKey!==proposal.requestKey)
    throw Error('Authorized prompt, material or request identifier does not match')
  if (Object.keys(request.values).sort().join()!==Object.keys(entry.expectedValues).sort().join())
    throw Error('Isolated batch rejected extra or missing model input')
  for (const [field,expected] of Object.entries(entry.expectedValues)) {
    const actual=request.values[field]
    if(typeof expected==='string' ? actual!==expected : typeof actual?.body!=='string'||hash(actual.body)!==expected.bodySha256){
      if(mode==='offline')console.error('Offline fixture field rejected:',entry.id,field,typeof actual,Object.keys(actual??{}).slice(0,8))
      throw Error('Isolated batch rejected changed model input')
    }
  }
  if(mode!==bound.mode||request.nodeId!==proposal.nodeId||url.href!==proposal.destination) throw Error('Dispatch identity mismatch')
  let key
  if(mode==='live'){
    const baseline=JSON.parse(readFileSync(proposal.baselineWirePath))
    if(baseline.inputContentSha256!==meta.inputContentSha256)
      throw Error('Isolated batch rejected drift from the native offline wire proof')
    const headers=new Headers(options.headers)
    key=headers.get('x-api-key')??headers.get('authorization')?.replace(/^Bearer\s+/i,'')
    if(!key)throw Error('No configured model credential reached the approved endpoint')
  }
  // Exclusive file creation consumes the single dispatch slot before transport.
  record(entry.id,'start',meta)
  if (key) {
    const before=await balance(key).catch(()=>({unavailable:true}))
    record(entry.id,'balance-before',before)
    if(before.currency!=='CNY'||!before.available||Number(before.total)<=0)
      throw Error('CNY balance or currency cannot be verified before the paid request')
    record(entry.id,'post-attempt',{at:new Date().toISOString(),requestKey:request.requestKey})
  }
  let response
  try { response=mode==='proof'||mode==='negative'||mode==='missing'?fixture(body.model,entry.id):await nativeFetch(url,options) }
  catch { record(entry.id,'transport-unknown',{at:new Date().toISOString()});throw Error('Original transport status unknown') }
  if(!response.body||!response.ok) {
    await captureTerminal(null,entry.id,key,response)
    return response
  }
  const [toProvider, meter]=response.body.tee()
  void captureTerminal(meter,entry.id,key,response).catch(()=>{})
  return new Response(toProvider,{status:response.status,headers:response.headers})
}
