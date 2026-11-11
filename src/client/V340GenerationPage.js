import {createElement as h,useEffect,useRef,useState} from 'react'
import {getV340Versions,getV340LegacyResultDrafts,V340_CONVERSATION_TEXT_LIMIT,formatV340ConversationDraft} from '../v340-runtime-contract.js'
import {hasPendingUnifiedRun} from '../generation-contract.js'
import { claimsCandidateFor, localSkillUnavailableReason, PATENT_DISCLOSURE_CLAIMS_ID } from '../local-skill-suites.js'
import {GenerationSourceSwitch} from './GenerationSourceSwitch.js'
import {SafeMarkdownPreview} from './SafeMarkdownPreview.js'

const button={border:'1px solid var(--dsw-alias-border-l2,#dce4df)',borderRadius:8,padding:'8px 11px',background:'var(--dsw-alias-bg-base,#fff)',color:'inherit'}
const m06LimitationNotice='本版本不自动删除结构记录或撤回技术事实；正文修改后，相关表格和依据仍需核对。'
const labels={upstream_md:'前序累计文稿',research_request:'研究请求',research_scope_config:'研究范围配置',user_input:'用户指令',application_type:'申请类型',max_fetch:'候选数量上限',
 claims:'权利要求书',specification:'说明书',disclosure:'技术交底',technical_disclosure:'技术交底',drawings:'附图说明',claim_requirements:'权利要求撰写要求',
 check_requirements:'终检要求',confirmation:'沟通确认',current_application:'当前申请文件',original_application:'原始申请文件',oa_notice:'审查意见通知书',
 response_requirements:'答复要求',search_material:'检索材料',search_target:'检索目标',solution_selection_basis:'方案筛选依据',strategy:'撰写策略',
 supplemental_data:'补充数据',technical_analysis_material:'技术分析材料',technical_feedback:'技术反馈'}
function label(field){const base=field.id.replace(/_(?:file|text)$/,'');return labels[base]??(/^comparison_doc_/.test(base)?`对比文件${base.split('_').at(-1)}`:field.boundary)}

export function V340InputFields({node,draft,disabled=false,onChange,idPrefix='preview',onError=()=>{}}){
 return (node?.inputs??[]).map(field=>{
     const file=field.id.endsWith('_file'),config=field.channel==='配置',channel=file?'filePaths':config?'configuration':'textInputs'
     const value=draft[channel][field.id]??'',name=`${label(field)}${file?'文件':field.id.endsWith('_text')?'文本':''}`
     return h('label',{key:field.id,style:{display:'grid',gap:5,marginBottom:12,fontSize:13}},name,
      field.id==='application_type'?h('select',{'aria-label':name,value,disabled,onChange:e=>onChange(channel,field.id,e.target.value)},h('option',{value:''},'未指定'),...[['invention','发明'],['utility_model','实用新型'],['undetermined','待确定']].map(([id,title])=>h('option',{key:id,value:id},title))):
      config?h('input',{'aria-label':name,defaultValue:typeof value==='object'?JSON.stringify(value):value,key:`${idPrefix}-${field.id}`,disabled,
       onBlur:e=>{try{onChange(channel,field.id,e.target.value===''?'':JSON.parse(e.target.value))}catch{onError('配置格式不正确，输入保留；请修正后保存。')}}}):
      h(file?'input':'textarea',{'aria-label':name,value,disabled,maxLength:file?1024:300000,rows:file?undefined:4,
       placeholder:file?'当前项目内的相对路径（.md / .txt）':undefined,onChange:e=>onChange(channel,field.id,e.target.value)}),
      h('small',{style:{color:'var(--dsw-alias-text-secondary,#66706b)'}},field.id==='user_input'?'仅填写本次增删改、范围或偏好。':file?'一次选择一个当前项目文件；运行前按明确路径读取正文。':field.importance==='expected'?'建议提供，缺失将产生警示。':'可选补充'))
    })
}

export function V340GenerationPage({page,state,node,operation={},actions={},markdownRenderer,savedFileUnavailableReason='安全文件预览不可用'}){
 const recovery=!!state.v340Catalog?.nativeBusinessRecovery
 const offline=state.v340Catalog?.nextOffline===true&&page.v340.nodeId==='Flow-2-6'
 const safePreview = offline || state.v340Catalog?.managedSkillSuite === true
 const draft=operation.v340InputDraft??page.v340.draft
 const picked=operation.v340Selection??{runId:page.v340.activeRunId,versionId:null}
 const run=page.v340.runs[picked.runId],versions=run?getV340Versions(run):[]
 const version=versions.find(v=>v.versionId===(picked.versionId??run?.activeVersionId??run?.runId))??versions.at(-1)
 const target=version?{runId:run.runId,versionId:version.versionId,resultSha256:version.result.sha256}:null
 const referenceTooLarge=!!target&&formatV340ConversationDraft(target,version.result.body).length>V340_CONVERSATION_TEXT_LIMIT
 const referenceReason=referenceTooLarge?'固定版本全文超过对话草稿上限；请复制完整正文或导出Markdown并打开，正文未截断。':state.conversationUnavailableReason===undefined?'当前对话输入接口不可用':state.conversationUnavailableReason
 const editTarget=target?{runId:run.runId,versionId:version.versionId,baseSha256:version.result.sha256}:null
 const key=target?JSON.stringify([target.runId,target.versionId]):''
 const local=operation.v340Edits?.[key],persisted=run&&version?run.coreResultDrafts?.[version.versionId]:null
 const legacy=run&&version?getV340LegacyResultDrafts(run).filter(d=>d.versionId===version.versionId):[]
 const editing=!!persisted||local?.body!=null,editBody=local?.body??persisted?.body??version?.result.snapshot.current_result.core_result_markdown??''
 const pending=state.pages.some(hasPendingUnifiedRun),disabled=state.syncStatus!=='ready'||pending||operation.v340CandidateUnconfirmed===true
 const working=operation.activeOperation!=null||operation.v340CandidatePreparing||operation.v340CandidateSubmitting
 const [tab,setTab]=useState(recovery?'result':'input'),[error,setError]=useState(null),[confirmation,setConfirmation]=useState(null)
 const [offlineConfirmation,setOfflineConfirmation]=useState(null)
 const [filePreview,setFilePreview]=useState(null)
 const live=useRef(true),inFlight=useRef(false),entry=useRef(null)
 const identity=JSON.stringify([state.workspaceId,state.revision,page.pageId,target,editing,disabled,draft.source])
 const previewIdentity=JSON.stringify([state.workspaceId,state.revision,page.pageId,target,editing])
 const currentPreview=useRef(previewIdentity);currentPreview.current=previewIdentity
 const previewRequest=useRef(0)
 const current=useRef(identity);current.current=identity
 useEffect(()=>{live.current=true;return()=>{live.current=false;actions.cancelCandidate?.(page.pageId)}},[])
 useEffect(()=>{setConfirmation(null);setOfflineConfirmation(null)},[identity])
 useEffect(()=>{previewRequest.current+=1;setFilePreview(null)},[previewIdentity])
 async function runOffline() {
  if (!live.current||offlineConfirmation!==current.current||disabled||working||operation.v340InputDraft||inFlight.current) return
  inFlight.current=true
  setOfflineConfirmation(null)
  try { await action(()=>actions.runOffline(page.pageId)) } finally { inFlight.current=false }
 }
 async function openPreview(writebackId) {
  const request=++previewRequest.current
  const captured=previewIdentity
  setFilePreview(null)
  await action(async()=>{
   const value=await actions.previewSaved(page.pageId,target,writebackId)
   if(value&&live.current&&currentPreview.current===captured&&previewRequest.current===request) {
    setFilePreview({value,identity:captured})
   }
  })
 }
 async function action(fn){setError(null);try{await fn?.()}catch{if(live.current)setError('操作未完成，草稿与原版本仍保留。请核对当前项目和版本后重试。')}}
 function update(channel,id,value){const next=structuredClone(draft);if(value==='')delete next[channel][id];else next[channel][id]=value;void action(()=>actions.saveDraft?.(page.pageId,next))}
 async function approve(){
  if(!live.current||!confirmation||confirmation.identity!==current.current||inFlight.current||disabled||editing)return
  inFlight.current=true;setConfirmation(null)
  try{await action(()=>actions.review?.(page.pageId,target,{workspaceId:state.workspaceId,revision:state.revision,...target}))}finally{inFlight.current=false}
 }
 const plan=operation.v340SavePlan,planMatches=plan&&target&&JSON.stringify(plan.target)===JSON.stringify(target)&&plan.revision===state.revision&&!editing
 const capability=claimsCandidateFor(node,state.localSkillSuite)
 const skillUnavailable=draft.source==='local-skill'?localSkillUnavailableReason(state.localSkillSuite,Boolean(capability)):null
 const candidate=!recovery&&capability?.requiresConfirmation===true&&page.v340.nodeId==='Flow-2-6'&&draft.source==='local-skill'
 const external=capability?.skillId===PATENT_DISCLOSURE_CLAIMS_ID
 const pendingPreview=operation.v340CandidatePreview
 const candidatePreview=pendingPreview?.businessSkillId===capability?.skillId?pendingPreview:null
 return h('section',{'aria-label':'共同输入与结果','className':'oasis-v340',style:{container:'oasis-v340 / inline-size',minWidth:0,padding:16}},
  h('style',null,`.oasis-v340 *{box-sizing:border-box}.oasis-v340 .v340-panes{display:grid;grid-template-columns:minmax(0,1fr);gap:16}.oasis-v340 .v340-pane[data-visible=false]{display:none}.oasis-v340 input,.oasis-v340 textarea,.oasis-v340 select{max-width:100%;width:100%;border:1px solid #dce4df;border-radius:7px;padding:9px;color:inherit;background:var(--dsw-alias-bg-base,#fff)}.oasis-v340 button:disabled{opacity:.55;cursor:not-allowed}.oasis-v340 input:disabled,.oasis-v340 textarea:disabled,.oasis-v340 select:disabled{opacity:.65;cursor:not-allowed}@container oasis-v340 (min-width:680px){.oasis-v340 .v340-panes{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.oasis-v340 .v340-pane[data-visible=false]{display:block}.oasis-v340 .v340-tabs{display:none}}`),
  h('header',{style:{display:'flex',flexWrap:'wrap',gap:12,justifyContent:'space-between',alignItems:'center',marginBottom:14}},
   h('strong',null,page.title),h(GenerationSourceSwitch,{value:draft.source,disabled:recovery||disabled||!node,onChange:source=>{void action(()=>actions.saveDraft?.(page.pageId,{...draft,source}))}})),
  recovery?h('p',{role:'note'},'本地业务恢复验收：仅处理本次合成任务，不生成、不联网或发送；审核仅为工程验证。'):null,
  page.v340.nodeId==='Flow-2-6'?h('p',{role:'note','aria-label':'当前能力限制'},m06LimitationNotice):null,
  h('nav',{className:'v340-tabs','aria-label':'输入与结果',style:{display:'flex',gap:8,marginBottom:12}},...['input','result'].map(id=>h('button',{key:id,type:'button',style:button,'aria-pressed':tab===id,onClick:()=>setTab(id)},id==='input'?'输入材料':'查看结果'))),
  h('div',{className:'v340-panes'},
   h('section',{className:'v340-pane','data-visible':tab==='input',style:{display:undefined,minWidth:0}},
    h('h3',null,node?.title??'当前任务'),
    !node?h('section',{role:'alert'},h('p',null,state.v340CatalogError??'新版目录尚不可用，输入草稿仍保留。'),
      h('button',{type:'button',style:button,disabled:!actions.retryCatalog||state.v340CatalogStatus==='loading',onClick:()=>action(()=>actions.retryCatalog?.())},'重试新版目录')):null,
    h(V340InputFields,{node,draft,disabled:recovery||disabled,onChange:update,onError:setError,idPrefix:page.pageId}),
    node?h('p',{role:'status'},operation.v340InputDraft?'输入正在保存；失败时保留本地草稿。':'输入已保存'):null,
    operation.v340InputDraft?h('button',{type:'button',style:button,disabled:working,onClick:()=>action(()=>actions.saveDraft?.(page.pageId,operation.v340InputDraft))},'重试保存输入'):null,
    offline?h('section',{'aria-label':'M06 离线生成'},
      h('button',{type:'button',style:button,disabled:disabled||working||!!operation.v340InputDraft||!actions.runOffline,
        onClick:()=>setOfflineConfirmation(current.current)},'准备离线生成'),
      offlineConfirmation===identity?h('section',{'aria-label':'离线生成确认'},
        h('p',null,draft.source==='local-skill'?'使用固定 M06 Skill 和模拟模型。':'使用 M06 专业 API 合同和模拟响应。'),
        h('button',{type:'button',style:button,disabled:disabled||working,onClick:runOffline},'确认离线生成'),
        h('button',{type:'button',style:button,onClick:()=>setOfflineConfirmation(null)},'取消')):null):
    candidate?h('section',{'aria-label':'M06受控候选'},
      h('p',null,external?'中国专利 Skill · 权利要求初稿':'M06 0.1.3 受控候选；尚未取得专业与用户接受。'),
      h('button',{type:'button',style:{...button,width:'100%'},disabled:disabled||working||!!operation.v340InputDraft||!actions.prepareCandidate,
        onClick:()=>action(()=>actions.prepareCandidate?.(page.pageId))},'核对模型与材料'),
      candidatePreview?h('section',{'aria-label':'候选生成确认'},
        h('p',null,`当前模型：${candidatePreview.route.provider} / ${candidatePreview.route.model}`),
        h('p',null,'将把本次固定输入交给当前DSH模型提供方处理。确认后调用一次；费用按DSH配置，失败或状态不确定不会自动重试。'),
        h('p',null,m06LimitationNotice),
        h('button',{type:'button',style:button,disabled:disabled||working||!actions.confirmCandidate,
          onClick:()=>action(()=>actions.confirmCandidate?.(page.pageId))},'确认生成一次'),
        h('button',{type:'button',style:button,disabled:working,onClick:()=>actions.cancelCandidate?.(page.pageId)},'取消')):null):
      h('button',{type:'button',disabled:true,style:{...button,width:'100%'}},'生成（暂不可用）'),
    operation.v340CandidateUnconfirmed?h('section',{role:'alert'},
      h('p',null,'原请求尚未确认，输入和来源保持锁定；不会重新生成。'),
      h('button',{type:'button',style:button,disabled:working||!actions.reconcileCandidate,
        onClick:()=>action(()=>actions.reconcileCandidate?.(page.pageId))},'核对原请求状态')):null,
    !candidate&&!offline?h('p',{role:'status',style:{fontSize:12}},skillUnavailable??node?.sources[draft.source].reason??'新版来源尚未就绪'):null),
   h('section',{className:'v340-pane','data-visible':tab==='result',style:{minWidth:0}},
    h('h3',null,'生成结果'),
    h('nav',{'aria-label':'结果版本',style:{display:'flex',flexWrap:'wrap',gap:6}},
     ...page.v340.runOrder.flatMap(id=>getV340Versions(page.v340.runs[id]).map((v,index)=>h('button',{key:`${id}/${v.versionId}`,type:'button',style:button,
      'aria-current':target?.versionId===v.versionId?'true':undefined,onClick:()=>actions.selectVersion?.(page.pageId,id,v.versionId)},`${page.v340.runOrder.length>1?`运行${page.v340.runOrder.indexOf(id)+1} · `:''}版本 ${index+1}`)))),
    !version?h('p',{role:'status'},run?.status==='unknown'?'运行状态未确认；不会自动重发。':run?.status==='prepared'?'原运行尚未完成。':run?.status==='failed'?`本次生成失败（${run.failureCode}）；未取得正文，不会自动重试。`:'暂无生成结果'):h('article',{style:{display:'grid',gap:12,marginTop:12}},
     h('small',null,`${run.source==='local-skill'?'本地 Skills':'专业 API'} · ${run.evidenceKind==='native-model-candidate'?'受控候选':'合成验收'} · ${version.review.status==='approved'?'已审核':'待审核'}`),
     run.nativeCandidate?.businessSkillId===PATENT_DISCLOSURE_CLAIMS_ID?h('small',null,
       '中国专利 Skill · GitHub 版本 '+run.nativeCandidate.businessSkillVersion.slice(0,7)):null,
     ...legacy.map(({key,draft})=>h('section',{key,'aria-label':'旧草稿恢复'},h('p',null,'旧草稿格式未确认，可能包含整份累计文稿。请先复制保留；原草稿保持，可另起核心正文编辑。'),
       h('textarea',{'aria-label':'旧草稿原文',readOnly:true,rows:8,value:draft.body}),
       h('small',null,'“编辑结果”从原版本核心正文开始；不会自动抽取、转换或删除旧草稿。'))),
     editing?h('textarea',{'aria-label':'修订结果',rows:12,value:editBody,disabled,maxLength:1024*1024,
      onChange:e=>{void action(()=>actions.saveEditDraft?.(page.pageId,editTarget,e.target.value))}}):
      h(SafeMarkdownPreview,{markdownRenderer,text:version.result.snapshot.current_result.core_result_markdown}),
     h('p',{style:{fontSize:12}},'风险与待确认事项仍需核对；人工审核不代表专业或法律结论。'),
     h('details',null,h('summary',null,'累计文稿与警示'),h(SafeMarkdownPreview,{markdownRenderer,text:version.result.body})),
     editing?h('p',{role:'status'},local?'有未保存编辑，原版本保持；可等待保存或重试。':'结果编辑草稿已保存；切换版本会保留。'):null,
     local?h('button',{type:'button',style:button,disabled:working,onClick:()=>action(()=>actions.saveEditDraft?.(page.pageId,editTarget,local.body))},'重试保存编辑'):null,
     h('div',{style:{display:'flex',gap:6,flexWrap:'wrap'}},
      h('button',{type:'button',style:button,disabled:disabled||working,onClick:()=>action(()=>actions.saveEditDraft?.(page.pageId,editTarget,editing?null:version.result.snapshot.current_result.core_result_markdown))},editing?'放弃编辑':'编辑结果'),
      editing?h('button',{type:'button',style:button,disabled:disabled||working||!editBody.trim()||!!local||editBody===version.result.snapshot.current_result.core_result_markdown,
       onClick:()=>action(()=>actions.edit?.(page.pageId,editTarget))},'保存为新版本'):null,
      h('button',{ref:entry,type:'button',style:button,disabled:disabled||working||editing||legacy.length>0||version.review.status==='approved',onClick:()=>setConfirmation({identity:current.current})},'审核此版本')),
     confirmation?h('section',{'aria-label':'审核确认',role:'group',onKeyDown:e=>{if(e.key==='Escape'){setConfirmation(null);entry.current?.focus()}}},
      h('p',null,`当前固定版本 · 哈希 ${version.result.sha256.slice(0,12)}；请核对正文和全部警示。`),
      h('button',{type:'button',style:button,disabled:disabled||working||editing,onClick:approve},'确认审核此版本'),
      h('button',{type:'button',style:button,onClick:()=>{setConfirmation(null);entry.current?.focus()}},'取消审核')):null,
     version.review.status==='approved'&&!editing&&!legacy.length?h('section',{'aria-label':'项目回写'},
      h('p',null,'Markdown导出沿用当前固定版本的项目保存与确认；不会覆盖既有文件。'),
      h('button',{type:'button',style:button,disabled:disabled||working||!!referenceReason||!actions.useReference,title:referenceReason??undefined,
       onClick:()=>action(()=>actions.useReference?.(page.pageId,target))},'使用固定审核版本'),
      referenceReason?h('p',{role:'status'},referenceReason):null,
      page.v340.nodeId==='Flow-2-6'?h('p',{role:'note','aria-label':'复制与保存的当前能力限制',style:{fontSize:12}},m06LimitationNotice):null,
      referenceTooLarge?h('details',null,h('summary',null,'固定审核版本全文（可复制）'),h('textarea',{'aria-label':'固定审核版本全文（可复制）',readOnly:true,rows:10,value:version.result.body})):null,
      h('p',null,'保存到当前项目目录；同名文件不会覆盖，专业 API 文件名以 _OIW 结尾。'),
      h('button',{type:'button',style:button,disabled:disabled||working,onClick:()=>action(()=>actions.prepareSave?.(page.pageId,target))},'准备保存当前版本'),
      planMatches?h('div',null,...plan.manifest.files.map(f=>h('p',{key:f.relativePath,style:{overflowWrap:'anywhere'}},f.relativePath)),
       h('label',null,h('input',{type:'checkbox',style:{width:'auto'},checked:operation.v340SaveConfirmed===true,disabled:disabled||working,
        onChange:e=>actions.confirmSave?.(page.pageId,e.target.checked)}),'我已核对当前项目、固定版本和文件名'),
       h('button',{type:'button',style:button,disabled:disabled||working||!operation.v340SaveConfirmed,onClick:()=>action(()=>actions.commitSave?.(page.pageId))},'确认保存文件')):null):null,
     ...version.writebacks.map(saved=>h('section',{key:saved.writebackId,style:{overflowWrap:'anywhere'}},
      h('p',{role:'status'},`已保存：${saved.files.find(f=>f.mediaType==='text/markdown')?.relativePath}`),
      h('button',{type:'button',style:button,disabled:disabled||working||editing||legacy.length>0||version.review.status!=='approved'||(safePreview?!actions.previewSaved:!!savedFileUnavailableReason||!actions.openSaved),
       title:safePreview?undefined:savedFileUnavailableReason??undefined,onClick:()=>safePreview?openPreview(saved.writebackId):action(()=>actions.openSaved?.(page.pageId,target,saved.writebackId))},safePreview?'安全预览当前文件':'打开当前文件'),
      h('small',null,'打开的是当前文件；固定审核结论仅绑定所选版本，文件变化需重新核对。')))),
    filePreview?.identity===previewIdentity?h('section',{'aria-label':'安全文件预览'},
      h('h4',null,filePreview.value.fileName),
      h('p',{role:'status'},filePreview.value.matchesReviewed?'当前文件与固定审核版本一致。':'当前文件已修改，原审核结论仅适用于固定版本。'),
      h('pre',{tabIndex:0,style:{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}},filePreview.value.text),
      h('button',{type:'button',style:button,onClick:()=>{previewRequest.current+=1;setFilePreview(null)}},'关闭预览')):null,
    run&&['prepared','unknown'].includes(run.status)?h('div',null,h('button',{type:'button',style:button,disabled:working,onClick:()=>action(()=>actions.observe?.(page.pageId,run.runId))},'查看原运行'),
     h('button',{type:'button',style:button,disabled:working||run.status!=='prepared',onClick:()=>action(()=>actions.stop?.(page.pageId,run.runId))},'停止等待')):null)),
  error||operation.error?h('p',{role:'alert'},operation.candidateModelUnavailable?'当前DSH模型引用的API凭据不可用；未开始生成，请在DSH模型设置中核对。':error??'操作未完成，草稿和原记录已保留。'):null,
  operation.feedback?h('p',{role:'status'},operation.feedback):null,
  operation.indexWarningManifest?h('section',{role:'alert'},h('p',null,'文件可能已经发布，但保存索引尚未完成。请保留恢复清单，不要覆盖或重复保存。'),h('pre',{style:{whiteSpace:'pre-wrap'}},JSON.stringify(operation.indexWarningManifest,null,2))):null)
}
