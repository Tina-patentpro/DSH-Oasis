import assert from 'node:assert/strict'
import test from 'node:test'
import { executionHarness } from './claims-api-execution-harness.mjs'
import { createOasisApiClient } from '../src/oasis-api-contract.js'
import { createOasisRemoteService } from '../src/oasis-remote-service.js'
import { createWorkbenchRemote } from '../src/client/workbench-remote.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { createConnectionFixture } from './connection-fixture.mjs'

for (const full of [false, true]) test(`real adapter with synthetic transport closes ${full ? 'four-field' : 'minimal'} TXT request and common result`, async t => {
  const h = await executionHarness(t), requests = [], uploaded = []
  if (full) {
    const d = h.draft(); Object.assign(d.tasks['task-a'].formValues, { drawings_text: '图1：控制器', claim_requirements_text: '包括方法和装置', user_input: '保留术语\n不新增部件' })
    await h.service.replaceState('workspace-a', h.state().revision, d)
  }
  h.active.client = createOasisApiClient({ baseUrl: h.binding.apiBaseOrigin, downloadOrigins: ['https://files-staging.example'],
    resolveToken: async () => 'synthetic-only', fetchImpl: async (url, init) => {
      const path = new URL(url).pathname; requests.push({ path, method: init.method })
      let data
      if (path === '/api/user/detail') data = h.user
      else if (path === '/api/apicategories/detail') data = { test: [{ id: 1, name: 'test', apis: [{ id: 39, api_endpoint: 'synthetic-claims', api_process: 'one' }] }] }
      else if (path === '/api/apicategories/apidetail') data = h.rawDetail
      else if (path === '/api/user/user/folderdetail/8') data = { id: 8, name: 'test' }
      else if (path === '/api/user/upload') {
        assert.ok(init.body instanceof FormData)
        const file = init.body.get('file'); assert.equal(file.name, 'technical-disclosure.txt'); assert.match(file.type, /^text\/plain/)
        uploaded.push(await file.text()); data = { saved_path: 'https://files-staging.example/disclosure.txt' }
      } else if (path === '/api/apicategories/create') {
        const body = JSON.parse(init.body)
        assert.deepEqual(Object.keys(body), ['id', 'key', 'inputs', 'api_process', 'folder_id'])
        assert.equal(body.id, 39); assert.equal(body.folder_id, 8); assert.equal(body.api_process, 'one')
        assert.deepEqual(body.inputs.Technical_Disclosure_file, { type: 'document', transfer_method: 'remote_url', url: 'https://files-staging.example/disclosure.txt' })
        assert.deepEqual(Object.keys(body.inputs), full ? ['Technical_Disclosure_file', 'drawings_explain_TD', 'User_input'] : ['Technical_Disclosure_file'])
        if (full) { assert.equal(body.inputs.drawings_explain_TD, '图1：控制器'); assert.equal(body.inputs.User_input, '【撰写要求】\n包括方法和装置\n\n【用户指令】\n保留术语\n不新增部件') }
        data = { id: 11, key: body.key, answer_text: h.reply.answerText, file_url: 'https://files-staging.example/undownloaded.txt' }
      } else assert.fail('Unexpected synthetic endpoint ' + path)
      return Response.json({ code: 200, data })
    } })
  const task = await h.execute(), run = task.runs[task.activeRunId]
  assert.deepEqual(uploaded, [task.formValues.disclosure_text]); assert.equal(run.remoteResponse.fileUrls.length, 1)
  assert.equal(run.result.artifact.body, h.reply.answerText)
  assert.equal(requests.filter(r => r.path === '/api/apicategories/create').length, 1)
  assert.equal(requests.filter(r => r.path === '/api/user/upload').length, 1)
})

test('binding metadata route exposes bounded identity and no credentials, upload or generation', async t => {
  const h = await executionHarness(t)
  h.client.getFolderList = async () => ({ items: [{ id: 8, name: 'test' }] })
  const remote = createWorkbenchRemote(createConnectionFixture(createWorkbenchRpcHandler(h.service, h.professional)))
  const options = await remote.getBindingOptions({ workspaceId: 'workspace-a', remoteReadConfirmed: true })
  assert.equal(options.accountId, 101); assert.equal(options.settingsRevision, 7)
  assert.equal(options.workspacePath, h.workspace.path); assert.equal(h.calls.length, 0)
  await assert.rejects(remote.getBindingOptions({ workspaceId: 'workspace-a', remoteReadConfirmed: false }))
})

test('upload receipt persistence failure cannot replay derived TXT or create after restart', async t => {
  const h = await executionHarness(t)
  const professional = createOasisRemoteService({ ...h.options, repository: {
    get: id => h.repository.get(id),
    mutate: (id, revision, change) => h.repository.mutate(id, revision, async current => {
      const next = await change(current), task = next.tasks['task-a']
      if (task.remoteExecutionOrder.some(e => task.remoteExecutions[e].uploadedFiles.length)) throw Error('synthetic disk failure')
      return next
    }),
  } })
  const prepared = await professional.prepareClaimsMapping(h.base())
  const p = await professional.previewClaims({ ...h.base(), preparationSha256: prepared.preparationSha256, remoteReadConfirmed: true })
  await professional.startClaims({ ...h.base(), requestKey: 'persist-test', confirmationToken: p.confirmationToken, priceConfirmed: true, externalTransferConfirmed: true })
  const executionId = h.state().tasks['task-a'].remoteExecutionOrder[0], command = { workspaceId: 'workspace-a', taskId: 'task-a', executionId }
  await assert.rejects(professional.continue(command))
  await createOasisRemoteService(h.options).continue(command)
  assert.deepEqual(h.calls.map(c => c.kind), ['upload'])
  assert.equal(h.state().tasks['task-a'].remoteExecutions[executionId].safeError.code, 'UPLOAD_OUTCOME_UNKNOWN')
})
