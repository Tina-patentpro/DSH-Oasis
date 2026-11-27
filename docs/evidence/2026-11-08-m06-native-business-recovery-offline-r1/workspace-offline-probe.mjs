// P1 characterization of fixed installed public facilities; no App or Host bootstrap.
import fs from 'node:fs/promises'
import cp from 'node:child_process'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {join,dirname} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'

const evidence=dirname(fileURLToPath(import.meta.url))
const authorization=JSON.parse(await fs.readFile(join(evidence,'authorization.json'),'utf8'))
const root=authorization.root,stage=process.argv[2]
assert.ok(['create','cold'].includes(stage))
const counters={network:0,disallowedProcess:0,model:0,api:0,upload:0,businessExecutions:0}
const deny=key=>()=>{counters[key]++;throw Error(`P1 disallowed effect: ${key}`)}
globalThis.fetch=deny('network')
http.request=http.get=https.request=https.get=deny('network')
net.connect=net.createConnection=net.Socket.prototype.connect=tls.connect=deny('network')
const exec=cp.execFileSync
cp.execFileSync=(file,args,options)=>file==='/bin/ps'?exec(file,args,options):deny('disallowedProcess')()
cp.spawn=cp.spawnSync=cp.exec=cp.execSync=cp.execFile=cp.fork=deny('disallowedProcess')
const hash=x=>createHash('sha256').update(x).digest('hex')
const api=await import(pathToFileURL(join(root,'control/scripts/f-installed-runtime.mjs')).href)
const result=await api.withInstalledWriter(root,'sdk',async report=>{
 assert.equal(report.current,authorization.frozenBundleSHA256)
 const previous={}
 for(const [key,value]of Object.entries(report.env)){previous[key]=process.env[key];process.env[key]=value}
 const release=join(root,'releases',report.current),appRequire=createRequire(join(release,'App/DSH Desktop.app/Contents/Resources/app/package.json'))
 const imported=async name=>import(pathToFileURL(appRequire.resolve(name)).href)
 const {Context}=await imported('@deepseek-ai/cordis')
 const {JsonStorageBackend}=await imported('@deepseek-ai/dsh-storage-json')
 const {DomainFacility}=await imported('@deepseek-ai/dsh-storage-domain')
 const {default:JsonlSessionPersistence}=await imported('@deepseek-ai/dsh-session-persistence-jsonl')
 const {WorkspaceRegistry}=await imported('@deepseek-ai/dsh-workspace')
 const {createSingleOwnerJsonBackend}=await import(pathToFileURL(join(release,'components/c5/index.mjs')).href)
 let backend,facility,context
 try{
  backend=await createSingleOwnerJsonBackend(join(root,'data/home/storages'),JsonStorageBackend)
  const diagnostics=[]
  facility=new DomainFacility({storage:{backend:{get:name=>{assert.equal(name,'json');return backend}}},emit(){},logger:{warn:m=>diagnostics.push(String(m)),error:m=>diagnostics.push(String(m))}},{backend:'json'})
  context=new Context()
  context.provide('storageDomain',facility)
  // A real fixed JSONL provider, with only the new root as its storage scope.
  await context.plugin(JsonlSessionPersistence,{root:join(root,'data/home/sessions')})
  await context.plugin(WorkspaceRegistry)
  const registry=context.workspaceRegistry
  assert.ok(registry instanceof WorkspaceRegistry)
  const workspacePath=await fs.realpath(join(root,'data/workspace-a'))
  const prior=stage==='cold'?JSON.parse(await fs.readFile(join(evidence,'workspace-create-result.json'),'utf8')):null
  const entity=await registry.create(workspacePath,'M06 offline authority fixture')
  assert.match(entity.id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  assert.equal(entity.path,workspacePath)
  assert.equal(await entity.status(),'ok')
  assert.equal(registry.get(entity.id).path,workspacePath)
  const same=await registry.create(workspacePath,'Do not rename by repeated create')
  assert.equal(same.id,entity.id)
  if(prior)assert.equal(entity.id,prior.workspaceId)
  const b=await registry.create(await fs.realpath(join(root,'data/workspace-b')),'M06 other workspace')
  assert.notEqual(b.id,entity.id)
  if(prior)assert.equal(b.id,prior.otherWorkspaceId)
  assert.equal(registry.get('rc1-recovery-a'),undefined)
  assert.deepEqual(await context.sessionPersistence.list(),[])
  assert.equal(diagnostics.length,0)
  const businessExists=await fs.stat(join(root,'data/home/storages/oasis_workbench.json')).then(()=>true,()=>false)
  assert.equal(businessExists,false)
  return{stage,pid:process.pid,workspaceId:entity.id,otherWorkspaceId:b.id,workspacePath,actualWorkspaceRegistry:true,actualJsonlSessionPersistence:true,actualInstalledDomainJsonWriter:true,sameCanonicalPathReused:true,coldIdentityRetained:stage==='cold',businessFilePresent:false,appOrHostBoot:false,counters}
 }catch(error){
  console.error('P1 primary error:',error.stack)
  throw error
 }finally{
  await context?.fiber.dispose()
  await facility?.closeAll()
  await backend?.close()
  for(const [key,value]of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value
 }
})
const files={}
for(const name of await fs.readdir(join(root,'data/home/storages'))){
 const path=join(root,'data/home/storages',name)
 if((await fs.stat(path)).isFile())files[name]=hash(await fs.readFile(path))
}
result.storageFileSHA256=files
await fs.writeFile(join(evidence,`workspace-${stage}-result.json`),JSON.stringify(result,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify(result))
