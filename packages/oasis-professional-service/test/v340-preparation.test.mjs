import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, symlink, rm, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { createWorkspaceMaterialManager } from '../src/workspace-materials.js'
import { createWorkbenchService } from '../src/workbench-service.js'
const api = await import('../src/v340-preparation.js').catch(() => ({}))
const hash = body => createHash('sha256').update(body).digest('hex')

test('Host preparation reads only explicitly selected current Workspace UTF-8 files and returns full hash receipts', async t => {
  assert.equal(typeof api.createV340PreparationService, 'function', 'Host preparation must exist')
  const root = await realpath(await mkdtemp(join(tmpdir(),'oasis-v340-')))
  const other = await mkdtemp(join(tmpdir(),'oasis-v340-other-'))
  t.after(() => Promise.all([rm(root,{recursive:true,force:true}),rm(other,{recursive:true,force:true})]))
  await writeFile(join(root,'input.md'),'公开用户材料：机械阀')
  await writeFile(join(other,'outside.md'),'外部内容')
  await symlink(join(other,'outside.md'),join(root,'redirect.md'))
  const workspaceRegistry = { get: key => key === 'workspace-a' ? { path: root, async status() { return 'ok' } } : undefined }
  const reader = createWorkspaceMaterialManager({ workspaceRegistry })
  const service = api.createV340PreparationService({ materialManager: reader })
  const command = { workspaceId:'workspace-a',nodeId:'Flow-1-1',confirmed:true,
    textInputs:{research_request_text:'补充：液压阀'},filePaths:{research_request_file:'input.md'},configuration:{} }
  const prepared = await service.prepareV340(command)
  assert.equal(prepared.prepared.receipts.research_request_file.sha256,hash('公开用户材料：机械阀'))
  assert.equal(prepared.prepared.values.research_request_file.body,'公开用户材料：机械阀')
  assert.equal(prepared.dispatchEnabled,false)
  assert.equal(prepared.evidenceKind,'input-preparation')
  for (const patch of [{confirmed:false},{workspaceId:'unregistered'},
    {filePaths:{research_request_file:'../outside.md'}},{filePaths:{research_request_file:'redirect.md'}},
    {filePaths:{user_input:'input.md'}},{textInputs:{research_request_file:'假文件正文'}},
    {configuration:{user_input:'伪造指令'}}]) await assert.rejects(() => service.prepareV340({...command,...patch}))
  await writeFile(join(root,'broken.txt'),Buffer.from([0xff,0xfe,0x41]))
  await assert.rejects(() => service.prepareV340({...command,filePaths:{research_request_file:'broken.txt'}}))
  await writeFile(join(root,'bom.txt'),'\ufeff带BOM的材料')
  const bom = await service.prepareV340({...command,filePaths:{research_request_file:'bom.txt'}})
  assert.equal(bom.prepared.values.research_request_file.body,'\ufeff带BOM的材料')
  assert.equal(bom.prepared.receipts.research_request_file.sha256,hash('\ufeff带BOM的材料'))
  const racing = api.createV340PreparationService({materialManager:{
    async inspect(...args) { const evidence = await reader.inspect(...args); await writeFile(join(root,'input.md'),'已被替换'); return evidence },
    readForUpload:reader.readForUpload,
  }})
  await assert.rejects(()=>racing.prepareV340(command),error=>error.code==='V340_PREPARATION_FAILED' && Object.keys(error.details).length===0)
})

test('Workbench service and RPC expose versioned read-only preparation without altering old task state', async () => {
  const service = createWorkbenchService({ repository:{get(){throw Error('no task state read required')},replaceEditable(){throw Error('must not write')},mutate(){throw Error('must not write')}},
    materialManager: { confirm(){},recheckAll(){},refresh(){} } })
  assert.equal(typeof service.getV340Catalog,'function','real workbench must expose new catalog')
  assert.equal(service.getV340Catalog().nodes.length,14)
  const handler = createWorkbenchRpcHandler(service)
  assert.equal((await handler('workflow/v340/catalog',{})).value.nodes.length,14)
  const command = {workspaceId:'a',nodeId:'Flow-1-1',confirmed:true,textInputs:{research_request_text:'公开输入'},filePaths:{},configuration:{}}
  const response = await handler('workflow/v340/prepare',command)
  assert.equal(response.ok,true)
  assert.equal(response.value.dispatchEnabled,false)
  for(const patch of [{confirmed:false},{workspaceId:' a '},{jwt:'forbidden'},{nodeId:'Flow-1-15'},
    {textInputs:{research_request_text:['一','二']}}]) {
    const rejected = await handler('workflow/v340/prepare',{...command,...patch})
    assert.equal(rejected.ok,false)
  }
})
