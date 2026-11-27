import fs from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
import {join} from 'node:path'
import assert from 'node:assert/strict'

const project=process.cwd(),evidence=join(project,'docs/evidence/2026-11-08-r6-execution-r1')
const root=join(project,'.dsh-test/m06-native-business-recovery-20261108-r1')
const release=join(root,'releases/f03100c7f31b5100e886374e61aac07132421a5107365cfc2baa38996bec58bc')
const source=join(project,'.dsh-test/m06-live-20261030-r2/home/.credentials.yaml')
const target=join(root,'data/home/.credentials.yaml')
const req=createRequire(join(release,'App/DSH Desktop.app/Contents/Resources/app/package.json'))
const {Context}=req('@deepseek-ai/cordis')
const {LocalCredentialProvider,parseCredentialsDocument,renderFlatLayoutMigration}=req('@deepseek-ai/dsh-credentials-local')
const {credentialRef}=req('@deepseek-ai/dsh-credentials')
const {withInstalledWriter}=await import(pathToFileURL(join(root,'control/scripts/f-installed-runtime.mjs')))
const hash=b=>createHash('sha256').update(b).digest('hex')
const ref=credentialRef('DEEPSEEK_API_KEY')
const record={reference:'DEEPSEEK_API_KEY',source,target,authorization:'Current user: 同意单项复用并允许一次真实调用',sourceResolveCalls:0,targetSetCalls:0,realModelCalls:0,status:'STARTED'}
await fs.writeFile(join(evidence,'credential-reuse-intent.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600})
await withInstalledWriter(root,'maintenance',async()=>{
 const original=await fs.readFile(source),targetBefore=await fs.readFile(target)
 assert.equal(renderFlatLayoutMigration(original.toString()),undefined)
 assert.equal(renderFlatLayoutMigration(targetBefore.toString()),undefined)
 const before=parseCredentialsDocument(targetBefore.toString(),target)
 assert(!before.refs.has(ref))
 const sourceCtx=new Context(),targetCtx=new Context()
 let sourceFork,targetFork
 try{
  sourceFork=sourceCtx.plugin(LocalCredentialProvider,{path:source,watch:false});await sourceFork
  targetFork=targetCtx.plugin(LocalCredentialProvider,{path:target,watch:false});await targetFork
  const from=sourceCtx.get('credentials'),to=targetCtx.get('credentials')
  assert.equal((await from.describe(ref)).configured,true)
  assert.equal((await to.describe(ref)).configured,false)
  assert.equal(hash(await fs.readFile(source)),hash(original))
  assert.equal(hash(await fs.readFile(target)),hash(targetBefore))
  record.sourceResolveCalls++
  let resolved=await from.resolve(ref)
  assert(typeof resolved?.value==='string'&&resolved.value.length>0)
  record.targetSetCalls++
  await to.set(ref,resolved.value)
  resolved=undefined
  assert.equal((await to.describe(ref)).configured,true)
  assert.equal(hash(await fs.readFile(source)),hash(original))
  const after=parseCredentialsDocument((await fs.readFile(target)).toString(),target)
  assert.equal(after.refs.size,before.refs.size+1)
  for(const [key,value] of before.refs)assert.deepEqual(after.refs.get(key),value)
  assert.equal((await fs.stat(target)).mode&0o777,0o600)
  Object.assign(record,{status:'SINGLE_REFERENCE_REUSED',sourceBytesUnchanged:true,targetOtherReferencesUnchanged:true,targetConfigured:true,sourceFileSHA256:hash(original)})
 }finally{
  await targetFork?.dispose();await sourceFork?.dispose()
 }
})
await fs.writeFile(join(evidence,'credential-reuse-result.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600})
console.log('PASS: named model reference reused once through fixed SDK; no model call; source/other references preserved')
