import {mkdtemp,realpath,readFile,writeFile,rename,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {openOasisWorkbenchRepository} from '../src/workbench-repository.js'
import {createWorkbenchService} from '../src/workbench-service.js'
import {createWorkbenchRpcHandler} from '../src/workbench-rpc.js'
import {createWorkbenchRemote} from '../src/client/workbench-remote.js'
export async function resultFixture(t,source='local-skill',options={}){
 const root=await realpath(await mkdtemp(join(tmpdir(),'oiw-result-'))),file=join(root,'records.json');await writeFile(file,'{}')
 const fixture={root,file,failWrites:false,calls:[]}
 fixture.storageDomain={async open(){let records=JSON.parse(await readFile(file,'utf8')),queue=Promise.resolve();return{table(){return{get:id=>structuredClone(records[id]),put(id,value){const job=queue.then(async()=>{if(fixture.failWrites)throw Error('disk failed');const next={...records,[id]:value};await writeFile(file+'.tmp',JSON.stringify(next));await rename(file+'.tmp',file);records=next});queue=job.catch(()=>{});return job}}},async close(){await queue}}}}
 fixture.workspaceRegistry={get:id=>id==='a'?{path:root,async status(){return'ok'}}:undefined}
 fixture.repository=await openOasisWorkbenchRepository(fixture.storageDomain)
 fixture.service=createWorkbenchService({repository:fixture.repository,workspaceRegistry:fixture.workspaceRegistry,clock:options.clock??(()=> '2026-10-22T01:00:00.000Z'),
  v340Executor:{evidenceKind:'synthetic',async generate(){return{status:'completed',output:{summary:'公开合成结论',core_result_markdown:'公开原始正文',updates:[],tables:{},terms_master:[],warnings:[],model_completions:[]}}}}})
 fixture.handler=createWorkbenchRpcHandler(fixture.service)
 fixture.remote=createWorkbenchRemote({rpc:{async call(_channel,endpoint,payload){fixture.calls.push(endpoint);return fixture.handler(endpoint.replace('oasis-workbench/',''),payload)}}})
 fixture.record=()=>fixture.repository.get('a')
 fixture.task=()=>fixture.record().tasks.new.v340
 fixture.run=()=>fixture.task().runs[fixture.task().activeRunId]
 fixture.command=extra=>({workspaceId:'a',taskId:'new',expectedRevision:fixture.record().revision,...extra})
 await fixture.service.createV340Task(fixture.command({nodeId:'Flow-1-1',title:'共同任务'}))
 await fixture.service.updateV340Draft(fixture.command({draft:{source,textInputs:{research_request_text:'公开输入'},filePaths:{},configuration:{}}}))
 await fixture.service.createV340Run(fixture.command({requestKey:'synthetic-run'}))
 for(let n=0;n<100&&fixture.run().status==='prepared';n++)await new Promise(r=>setTimeout(r,2))
 if(fixture.run().status!=='completed')throw Error('synthetic fixture did not finish')
 await fixture.repository.mutate('a',fixture.record().revision,record=>({...record,activeTaskId:'new'}))
 t.after(async()=>{await fixture.service.closeV340Runtime();await fixture.repository.close();await rm(root,{recursive:true,force:true})})
 return fixture
}
