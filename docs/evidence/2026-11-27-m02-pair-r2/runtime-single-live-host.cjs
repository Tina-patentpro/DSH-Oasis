const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const { createHash, randomBytes, randomUUID } = require('node:crypto')
const { once } = require('node:events')
const { existsSync, readFileSync, writeFileSync } = require('node:fs')
const { basename, join, resolve } = require('node:path')
const { setTimeout: delay } = require('node:timers/promises')

const [app, scope, mode] = process.argv.slice(2)
assert(['proof','negative','missing','live','observe'].includes(mode))
const root = resolve(scope)
const data = join(root,'dsh-home')
const profile = join(data,'profiles','desktop')
const resources = join(app,'Contents','Resources')
const archive = join(resources,'app.asar')
const nativeToken = randomBytes(32).toString('base64url')
const headers = {'x-dsh-desktop-renderer':nativeToken}
const batchBytes = readFileSync(join(root,'batch.json'))
const binding = JSON.parse(batchBytes)
const batch = binding.cases
const out = join(root,mode+'-run.json')
const sha = value => createHash('sha256').update(value).digest('hex')
const safeLog = value => String(value).replace(/([?&]token=)[^\s"]+/g,'$1[redacted]')
  .replace(/\bsk-[A-Za-z0-9_-]+\b/g,'[redacted]')
  .replaceAll(nativeToken,'[redacted]')
const wire = (id,suffix) => join(root,'wire',id+'.'+suffix+'.json')
function write(path,data) {writeFileSync(path,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600})}
async function when(pred,timeoutMs) {
  const until=Date.now()+timeoutMs
  do {
    const got=await pred()
    if(got)return got
    await delay(400)
  } while(Date.now()<until)
  return null
}

async function main() {
  assert.equal(existsSync(out),false)
  assert.equal(sha(batchBytes),process.env.OASIS_APPROVED_BATCH_SHA256)
  assert.equal(batch.length,1)
  assert.equal(batch[0].id,'M02')
  assert.equal(batch[0].requestKey,binding.proposal.requestKey)
  assert.equal(batch[0].requestKey,binding.approvedRequestKey)
  if(mode!=='observe')assert.equal(mode,binding.mode)
  if(mode==='live')assert.equal(batch[0].requestKey,binding.proposal.newRequestKey)
  if (mode==='live') {
    for(const c of batch){
      const path=wire(c.id,'start')
      const freshProof=readFileSync(join(root,'..','proof','wire',c.id+'.start.json'))
      const proof=JSON.parse(freshProof)
      assert.equal(proof.systemSha256,binding.proposal.promptSha256)
      assert.equal(proof.inputContentSha256,binding.proposal.inputContentSha256)
      assert.equal(proof.mode,'proof')
      assert.equal(existsSync(path),false,'an original live slot already exists')
      const baseline=JSON.parse(readFileSync(binding.proposal.baselineWirePath))
      assert(baseline.conservativeInputTokens<=32000 && baseline.maxOutputTokens===16384)
    }
    const offline=JSON.parse(readFileSync('/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/dsh-next-field-diagnostics-20261112/offline/offline-run.json'))
    assert.deepEqual(offline.filter(x=>x.id==='M02').map(x=>[x.id,x.status,x.reviewedAndSaved]),[['M02','completed',true]])
    const recovery=JSON.parse(readFileSync('/Users/tinadong7036/Documents/开发项目/DSH-Oasis/.local/dsh-next-field-diagnostics-20261112/offline/observe-run.json'))
    assert.deepEqual(recovery.filter(x=>x.id==='M02').map(x=>[x.id,x.recovered]),[['M02',true]])
  }
  const child=spawn(join(app,'Contents','MacOS','DSH NEXT'),[
    '--require',join(__dirname,'single-live-wire.cjs'),
    '--expose-internals',join(archive,'lib','host.js'),archive,profile,
    join(resources,'runtime',process.arch,'primary-runtime'),
  ],{cwd:profile,env:{...process.env,ELECTRON_RUN_AS_NODE:'1',DSH_HOME:data,
    DSH_TELEMETRY_DISABLED:'1',DSH_NEXT_NATIVE_TOKEN:nativeToken,OASIS_NEXT_TEXT_TEST:'1',
    OASIS_BATCH_MODE:mode,OASIS_BATCH_ROOT:root},stdio:['ignore','pipe','pipe','ipc']})
  child.stdout.on('data',b=>process.stdout.write(safeLog(b)))
  child.stderr.on('data',b=>process.stderr.write(safeLog(b)))
  const exited=once(child,'exit')
  const deadline=setTimeout(()=>child.kill('SIGTERM'),(mode==='live'?15:3)*60*1000)
  const rows=[]
  try {
    const ready=await new Promise((ok,err)=>{
      child.on('message',m=>{if(m.type==='ready')ok(m)})
      child.once('error',err)
      child.once('exit',code=>err(Error('Host exited before ready: '+code)))
    })
    const url=new URL(ready.url)
    assert.equal(url.hostname,'127.0.0.1')
    const login=await fetch(url,{redirect:'manual',headers})
    assert.equal(login.status,303)
    const cookie=login.headers.get('set-cookie').split(';')[0]
    await login.body?.cancel()
    async function rpc(method,payload) {
      const rpcId=randomUUID()
      const response=await fetch(url.origin+'/api/'+method,{
        method:'POST',headers:{...headers,cookie,origin:url.origin,'content-type':'application/json'},
        body:JSON.stringify({type:'client-request',rpcId,method,payload}),signal:AbortSignal.timeout(12000),
      })
      if(response.status!==200)throw Error(method+' HTTP '+response.status)
      const reply=await response.json()
      assert.equal(reply.rpcId,rpcId)
      if(!reply.result.ok)throw Error(method+' '+reply.result.error.code)
      return reply.result.value
    }
    const prefix='oasis-workbench/workflow/v340/'
    const catalog=await rpc(prefix+'catalog',{})
    const exposed=catalog.nodes.filter(x=>x.textCandidate)
    assert.deepEqual(exposed.map(x=>x.nodeId).sort(),['Flow-1-1','Flow-1-2','Flow-1-3','Flow-1-4','Flow-1-5','Flow-2-7'])
    assert.equal(catalog.nodes.find(x=>x.nodeId==='Flow-2-6').m06Candidate.skillId,'m06-claims-draft')
    const plugins=await rpc('pluginManager/listPlugins',{args:{}})
    assert.equal(plugins.filter(x=>x.patchId==='oasis-professional-service'&&x.enabled).length,1)
    assert.equal((await rpc('oasis-workbench/skill-suite/get',{})).suite,'oasis')
    console.log('Isolated native Host ready for the single authorized M02 request')
    if(mode==='observe'){
      const prior=JSON.parse(readFileSync(join(root,'proof-run.json')))
      for(const row of prior){
        const state=await rpc('oasis-workbench/state/get',{workspaceId:row.workspaceId})
        const run=state.tasks[row.taskId].v340.runs[row.runId]
        assert.equal(run.status,'completed')
        assert.equal(run.result.sha256,row.resultSha256)
        const preview=await rpc(prefix+'result/preview-file',{workspaceId:row.workspaceId,taskId:row.taskId,
          expectedRevision:state.revision,runId:row.runId,versionId:row.runId,resultSha256:row.resultSha256,writebackId:row.writebackId})
        assert(preview.matchesReviewed&&sha(preview.text)===row.resultSha256)
        rows.push({id:row.id,runId:row.runId,resultSha256:row.resultSha256,recovered:true,previewMatches:true})
      }
      write(out,rows)
      return
    }
    const staged=[]
    assert.equal(existsSync(wire(batch[0].id,'start')),false)
    for(const c of batch){
      const {workspace}=await rpc('workspace/create',{args:{request:{path:c.workspace}}})
      const workspaceId=workspace.workspaceId
      const {sessionId}=await rpc('session/create',{args:{request:{workspaceId}}})
      const selection=await rpc('session/selectModel',{args:{request:{sessionId,provider:'deepseek-official',model:'deepseek-flash',reasoningEffort:'low'}}})
      assert.equal(selection.selected.reasoningEffort,'low')
      const state=()=>rpc('oasis-workbench/state/get',{workspaceId})
      const command=async x=>({workspaceId,taskId:c.taskId,expectedRevision:(await state()).revision,...x})
      await rpc(prefix+'task/create',await command({nodeId:c.nodeId,title:c.id+' 公开合成测试'}))
      await rpc(prefix+'task/draft',await command({draft:c.draft}))
      const preview=await rpc(prefix+'candidate/prepare',await command({sessionId,confirmed:true}))
      assert.equal(preview.businessSkillId,c.skillId)
      assert.equal(preview.businessSkillVersion,binding.proposal.skillVersion)
      assert.equal(preview.businessResourceSHA256,binding.proposal.businessResourceSha256)
      assert.deepEqual(preview.route,{provider:'deepseek-official',model:'deepseek-flash',reasoningEffort:'low',maxTokens:16384})
      staged.push({c,workspaceId,sessionId,state,command,preview})
      console.log(c.id,'native confirmation frozen')
    }
    for(const {c,workspaceId,sessionId,state,command,preview} of staged) {
      const row={id:c.id,workspaceId,sessionId,taskId:c.taskId,requestKey:c.requestKey,
        skillId:c.skillId,skillVersion:preview.businessSkillVersion,resourceSha256:preview.businessResourceSHA256}
      const findRun=async()=>Object.values((await state()).tasks[c.taskId].v340.runs).find(x=>x.requestKey===c.requestKey)
      try {
        await rpc(prefix+'candidate/run',await command({requestKey:c.requestKey,candidate:{sessionId,confirmed:true,sha256:preview.sha256}}))
      } catch(error) {
        row.createObservation=safeLog(error.message)
      }
      const run=await when(async()=>{const r=await findRun();return r?.status!=='prepared'?r:null},mode==='live'?250000:9000)
      if(run){
        row.runId=run.runId;row.status=run.status;row.failureCode=run.failureCode;row.summary=run.executionSummary
        row.candidateReceiptVersion=run.nativeCandidate.version
        row.receiptSystemSha256=run.nativeCandidate.systemSHA256
        assert.equal(row.candidateReceiptVersion,binding.proposal.candidateReceiptVersion)
        assert.equal(row.receiptSystemSha256,binding.proposal.promptSha256)
        row.inputSha256=run.inputSha256
        row.preparedSha256=run.nativeCandidate.preparedSHA256
        assert.equal(run.nativeCandidate.preparedSHA256,binding.proposal.preparedSha256)
        if(run.result){
          assert.equal(sha(run.result.body),run.result.sha256)
          row.resultSha256=run.result.sha256;row.resultBytes=Buffer.byteLength(run.result.body)
          if(mode==='live'||mode==='proof'||mode==='negative'){
            const raw=c.id+'-raw-result.md'
            writeFileSync(join(root,raw),run.result.body,{flag:'wx',mode:0o600})
            row.resultFile=raw
            const core=run.result.snapshot.current_result.core_result_markdown
            writeFileSync(join(root,'M02-core.md'),core,{flag:'wx',mode:0o600})
            row.coreSha256=sha(core);row.coreLength=Array.from(core).length
            row.tables=Object.fromEntries(Object.entries(run.result.snapshot.tables).map(([name,table])=>[name,table.rows.length]))
            if(mode==='proof'){
              const target={runId:run.runId,versionId:run.runId,resultSha256:run.result.sha256}
              await rpc(prefix+'result/review',await command({...target,confirmed:true}))
              const save=await rpc(prefix+'result/prepare-save',await command(target))
              const saved=await rpc(prefix+'result/commit-save',{confirmationToken:save.confirmationToken})
              const receipt=saved.current.tasks[c.taskId].v340.runs[run.runId].resultVersions[0].writebacks[0]
              const preview=await rpc(prefix+'result/preview-file',await command({...target,writebackId:receipt.writebackId}))
              assert(preview.matchesReviewed&&preview.text===run.result.body)
              row.writebackId=receipt.writebackId
              row.reviewedAndSaved=true
            }
          } else {
            const target={runId:run.runId,versionId:run.runId,resultSha256:run.result.sha256}
            await rpc(prefix+'result/review',await command({...target,confirmed:true}))
            const save=await rpc(prefix+'result/prepare-save',await command(target))
            const saved=await rpc(prefix+'result/commit-save',{confirmationToken:save.confirmationToken})
            const receipt=saved.current.tasks[c.taskId].v340.runs[run.runId].resultVersions[0].writebacks[0]
            assert(!receipt.files.some(x=>x.relativePath.endsWith('_OIW.md')))
            const read=await rpc(prefix+'result/preview-file',await command({...target,writebackId:receipt.writebackId}))
            assert(read.matchesReviewed&&read.text===run.result.body)
            row.writebackId=receipt.writebackId;row.reviewedAndSaved=true
          }
        }
      } else { row.status='unknown';row.failureCode='NO_TERMINAL_OBSERVED' }
      const done=await when(()=>existsSync(wire(c.id,'end')),mode==='live'?10000:1200)
      row.wireTerminal=Boolean(done)
      row.livePostAttempt=existsSync(wire(c.id,'post-attempt'))
      rows.push(row)
      write(join(root,c.id+'-receipt.json'),row)
      console.log(c.id,row.status,row.failureCode??'',row.wireTerminal?'wire receipt recorded':'no wire terminal')
    }
    write(out,rows)
    if(mode==='proof')assert(rows.every(x=>x.status==='completed'&&x.reviewedAndSaved&&x.wireTerminal&&!x.livePostAttempt))
    if(mode==='negative')for(const row of rows){
      assert.equal(row.status,'failed')
      assert.deepEqual(row.summary.fieldIssue,{code:'orphan-completion',path:['model_completions',0,'content_id']})
      assert(!row.livePostAttempt&&row.wireTerminal)
    }
    if(mode==='missing')for(const row of rows){
      assert.equal(row.status,'failed')
      assert.deepEqual(row.summary.fieldIssue,{code:'missing-completion',path:['updates',1,'content_id']})
      assert(!row.livePostAttempt&&row.wireTerminal)
    }
  } finally {
    if(child.connected)child.send({type:'shutdown'})
    const [code]=await exited
    clearTimeout(deadline)
    assert.equal(code,0)
  }
}
main().catch(error=>{console.error(safeLog(error.stack??error));process.exitCode=1})
