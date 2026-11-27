import assert from 'node:assert/strict'
import test from 'node:test'
import { createOasisApiClient, normalizeApiDetail, normalizeWorkflowProgress } from '../src/oasis-api-contract.js'
import { createOasisRemoteService } from '../src/oasis-remote-service.js'
import { parseWorkbenchRecord } from '../src/workbench-domain.js'
import { matchesV340ProfessionalCatalog, matchesV340ProfessionalDetail, PATENT_DRAWING_DESCRIPTION_TOOL_ID, v340ProfessionalService, v340ProfessionalServiceForEndpoint } from '../src/v340-professional-services.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { getWorkflowCatalog, getWorkflowDefinition } from '../src/workflow-catalog.js'

const field = (en_name, type) => ({ type, en_name, cn_name: en_name })
const service = v340ProfessionalService('Flow-5-13')
const response = {
  id: service.detailId, name: service.endpoint, api_type: 'Workflow', is_async: 1, price: 3,
  input_schema: [field('application_title', 'paragraph'), field('claims_file', 'file'), field('drawings_images', 'file_list')],
  output_schema: [field('review', 'paragraph'), field('audit_report_docx_files', 'file_list')],
}

test('the catalogue uses exact per-node service bindings and separate detail IDs', () => {
  assert.deepEqual(['Flow-2-7', 'Flow-5-13', 'Flow-6-14'].map(id => v340ProfessionalService(id).detailId), [32, 43, 20])
  assert.equal(v340ProfessionalService('Flow-3-8'), undefined)
  assert.equal(matchesV340ProfessionalCatalog(service, { categoryId: 12, apiId: 43, apiEndpoint: service.endpoint }), false)
  assert.equal(matchesV340ProfessionalCatalog(service, { categoryId: 12, apiId: 221, apiEndpoint: service.endpoint }), true)
  const detail = normalizeApiDetail(response)
  assert.equal(detail.executionMode, 'async')
  assert.deepEqual(detail.inputFields.map(field => field.control), ['long-text', 'single-file', 'multi-file'])
  assert.deepEqual(detail.outputFields.map(field => field.control), ['text-output', 'file-output'])
})

test('claims allow only Basic and background research allows only async Pro', () => {
  const claims = v340ProfessionalService('Flow-2-6')
  const research = v340ProfessionalService('Flow-1-1')
  assert.deepEqual([claims.catalogId, claims.detailId, research.catalogId, research.detailId], [215, 46, 220, 25])
  assert.equal(v340ProfessionalServiceForEndpoint('F-2-6-权利要求书生成-Fast'), undefined)
  assert.equal(v340ProfessionalServiceForEndpoint(' F-1-1-技术背景研究报告-Basic'), undefined)
  const claimsDetail = normalizeApiDetail({ ...response, id: 46, name: claims.endpoint,
    input_schema: [field('Technical_Disclosure_file', 'file'), field('technical_solutions', 'paragraph')],
    output_schema: [field('claims_text', 'paragraph'), field('claims_docx', 'file')] })
  const pro = { id: 25, name: research.endpoint, api_type: 'LLM', is_async: 1, price: 3,
    input_schema: [field('content', 'paragraph')], output_schema: [field('tech_landscape', 'paragraph')] }
  const proDetail = normalizeApiDetail(pro)
  assert.equal(matchesV340ProfessionalDetail(claims, claimsDetail), true)
  assert.equal(matchesV340ProfessionalDetail(research, proDetail), true)
  assert.equal(matchesV340ProfessionalDetail(claims, { ...claimsDetail, executionMode: 'sync' }), false)
  assert.equal(matchesV340ProfessionalDetail(research, { ...proDetail, apiType: 'Workflow' }), false)
  assert.deepEqual(proDetail.inputFields.map(field => field.fieldId), ['content'])
  for (const changed of [{ id: 26 }, { name: '其他 LLM' }, { is_async: 0 }]) {
    assert.throws(() => normalizeApiDetail({ ...pro, ...changed }), { code: 'UNSUPPORTED_API_TYPE' })
  }
})

test('only the trusted desktop mode advertises the node-level feature', async () => {
  const service = { getV340Catalog: () => ({ nodes: [] }), getWorkflowCatalog }
  const active = createWorkbenchRpcHandler(service, null, null, null, { nextProfessional: true })
  const legacy = createWorkbenchRpcHandler(service)
  assert.equal((await active('workflow/v340/catalog', {})).value.nodeProfessionalApi, true)
  assert.equal((await legacy('workflow/v340/catalog', {})).value.nodeProfessionalApi, undefined)
  assert.equal((await active('task/start-api', {})).error.code, 'REMOTE_DISABLED')
  const tool = getWorkflowDefinition(PATENT_DRAWING_DESCRIPTION_TOOL_ID, '1')
  assert.equal(tool.executionMode, 'professional-api')
  assert.equal((await active('workflow/catalog', {})).value.workflows.some(row => row.workflowId === tool.workflowId), true)
  assert.equal((await legacy('workflow/catalog', {})).value.workflows.some(row => row.workflowId === tool.workflowId), false)
})

test('an async enqueue acknowledgement and 100% progress are not a draft', async () => {
  const calls = []
  const client = createOasisApiClient({baseUrl:'https://api-staging.example',resolveToken:async()=> 'fixture',
    fetchImpl: async (_url, init) => {
      calls.push(JSON.parse(init.body))
      return Response.json({data:{answer_text:'###异步任务，请等待通知',file_url:''}})
    }})
  const result = await client.createWorkflow({ id:43,key:'key',inputs:{text:'fixture'},apiProcess:'',folderId:8 })
  assert.equal(result.resolved, false)
  assert.deepEqual(calls, [{id:43,key:'key',inputs:{text:'fixture'},api_process:'',folder_id:8}])
  assert.equal(normalizeWorkflowProgress({key:'key',progress_percent:100},'key').result, null)
})

test('completed create responses retain text and multiple backend file URLs', async () => {
  const client = createOasisApiClient({
    baseUrl: 'https://api-staging.example',
    resolveToken: async () => 'fixture',
    fetchImpl: async () => Response.json({ data: {
      status: 'completed',
      answer_text: '检查结果',
      file_url: 'https://api-staging.example/output/a,b.pdf, https://api-staging.example/output/c.docx',
    } }),
  })
  const created = await client.createWorkflow({ id: 39, key: 'key', inputs: {}, apiProcess: '', folderId: 8 })
  assert.equal(created.resolved, true)
  assert.equal(created.result.answerText, '检查结果')
  assert.deepEqual(created.result.fileUrls, [
    'https://api-staging.example/output/a,b.pdf', 'https://api-staging.example/output/c.docx',
  ])
})

async function assertNativeRoundTrip({ nodeId, catalogId, categoryId, detailId, response, formValues, expectedInputs, expectedUploads }) {
  const standalone = nodeId === PATENT_DRAWING_DESCRIPTION_TOOL_ID
  const asynchronous = response.is_async === 1
  const workspaceId = 'workspace'
  const taskId = 'task'
  const requestKey = 'catalog-request'
  const now = '2026-11-11T03:00:00.000Z'
  const origin = 'https://api-staging.example'
  const createBodies = []
  const uploadedNames = []
  let polls = 0
  const client = createOasisApiClient({
    baseUrl: origin,
    resolveToken: async () => 'fixture',
    fetchImpl: async (url, init) => {
      const { pathname } = new URL(url)
      switch (pathname) {
        case '/api/user/detail': return Response.json({ data: { id: 5, balance: 20 } })
        case '/api/apicategories/detail': return Response.json({ data: { '撰写': [{
          id: categoryId, name: '专业服务', apis: [{ id: catalogId, api_endpoint: response.name, api_process: '处理,结束' }],
        }] } })
        case '/api/apicategories/apidetail':
          assert.deepEqual(JSON.parse(init.body), { name: response.name })
          return Response.json({ data: response })
        case '/api/user/user/folderdetail/8': return Response.json({ data: { id: 8, name: '项目', owner_id: 5 } })
        case '/api/user/upload': {
          const file = init.body.get('file')
          uploadedNames.push(file.name)
          return Response.json({ data: { saved_path: origin + '/uploads/' + file.name } })
        }
        case '/api/apicategories/create':
          createBodies.push(JSON.parse(init.body))
          return Response.json(asynchronous ? { answer_text: '###异步任务，请等待通知', file_url: '' }
            : { answer_text: '已按原请求返回结果', file_url: '' })
        case '/api/apicategories/queryprocess/catalog-request':
          polls += 1
          if (polls === 1) return Response.json({ detail: '异步结果生成中，请等待' }, { status: 404 })
          if (polls === 2) return Response.json({ key: requestKey, is_completed: true, progress_percent: 100 })
          return Response.json({ key: requestKey, is_completed: true, progress_percent: 100,
            output: '已按原请求返回结果', file_output: [{download_url: origin + '/output/result.pdf'}] })
        default: assert.fail(pathname)
      }
    },
  })
  const materials = [
    ['one', 'image.png', 'image/png'],
    ['two', 'figure.jpg', 'image/jpeg'],
    ['claims', 'claims.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ].map(([referenceId, displayName, mediaType], index) => ({
    referenceId, displayName, mediaType, kind: 'project-file', relativePath: displayName,
    sizeBytes: 3, sha256: String(index + 1).repeat(64), observedAt: now, confirmedAt: now,
  }))
  let current
  const repository = {
    get: () => structuredClone(current),
    async mutate(id, revision, update) {
      assert.equal(id, workspaceId)
      assert.equal(revision, current.revision)
      const next = await update(structuredClone(current))
      if (JSON.stringify(next) !== JSON.stringify(current)) {
        next.revision += 1
        next.updatedAt = now
        current = parseWorkbenchRecord(workspaceId, next)
      }
      return { committed: true, current: this.get() }
    },
  }
  const workspace = { path: '/synthetic/workspace', async status() { return 'ok' } }
  const remote = createOasisRemoteService({
    repository, nextProfessional: true, workspaceRegistry: { get: () => workspace },
    getRuntime: async () => ({ enabled: true, environmentKind: 'non-production', apiBaseOrigin: origin,
      credentialConfigured: true, client }),
    materialManager: {
      async recheckAll(_id, references) { return references },
      async readForUpload(_id, reference) {
        return { bytes: new Uint8Array([1, 2, 3]), fileName: reference.displayName,
          mediaType: reference.mediaType, sha256: reference.sha256 }
      },
    },
    clock: () => now, pollLimit: 2, sleep: async () => {},
    executionIdFactory: () => 'execution', runIdFactory: () => 'run',
  })
  const detail = await remote.getServiceDetail(response.name)
  current = parseWorkbenchRecord(workspaceId, {
    schemaVersion: 4, workspaceId, revision: 1, panelMode: 'normal', activeTaskId: taskId,
    taskOrder: [taskId], updatedAt: now, tasks: { [taskId]: {
      taskId, workType: 'cn-invention-patent', title: '专业服务', workflowId: nodeId,
      workflowVersion: standalone ? '1' : 'V3.4.0', generation: null, formValues: {}, inputRefs: materials, activeRunId: null,
      ...(standalone ? {} : { v340: { schemaVersion: 1, businessVersion: 'V3.4.0', nodeId,
        draft: { source: 'oasis-api', textInputs: {}, filePaths: {}, configuration: {} },
        activeRunId: null, runOrder: [], runs: {} } }),
      runOrder: [], runs: {}, remoteExecutionOrder: [], remoteExecutions: {}, createdAt: now, updatedAt: now,
      professionalDraft: { selectedApiEndpoint: response.name, selectedApiId: detail.id,
        schemaHash: detail.schemaHash, folderId: 8, updatedAt: now,
        formValues },
    } },
  })
  const command = { workspaceId, taskId, requestKey, priceConfirmed: true, externalTransferConfirmed: true }
  await remote.start({ ...command, expectedRevision: current.revision })
  await remote.continue({ workspaceId, taskId, executionId: 'execution' })
  if (asynchronous) {
    assert.equal(current.tasks[taskId].remoteExecutions.execution.status, 'wait-stopped')
    assert.deepEqual(current.tasks[taskId].runOrder, [])
    await assert.rejects(remote.start({ ...command, requestKey: 'another', expectedRevision: current.revision }),
      { code: 'REMOTE_EXECUTION_UNRESOLVED' })
    await remote.continue({ workspaceId, taskId, executionId: 'execution' })
  }
  const file = (type, name) => ({ type, transfer_method: 'remote_url', url: origin + '/uploads/' + name })
  assert.deepEqual(createBodies, [{ id: detailId, key: requestKey, api_process: '处理,结束', folder_id: 8,
    inputs: expectedInputs(file) }])
  assert.deepEqual(uploadedNames, expectedUploads)
  assert.equal(current.tasks[taskId].remoteExecutions.execution.status, 'completed')
  assert.equal(current.tasks[taskId].runs.run.result.answerText, '已按原请求返回结果')
  assert.deepEqual(current.tasks[taskId].runs.run.result.fileUrls, asynchronous ? [origin + '/output/result.pdf'] : [])
  assert.equal(polls, asynchronous ? 3 : 0)
}

test('application review submits the detail ID once and recovers the original async result', () =>
  assertNativeRoundTrip({
    nodeId: 'Flow-5-13', catalogId: 221, categoryId: 12, detailId: 43, response,
    formValues: { application_title: '材料', claims_file: 'claims', drawings_images: ['one', 'two'] },
    expectedInputs: file => ({ application_title: '材料', claims_file: file('document', 'claims.docx'),
      drawings_images: [file('image', 'image.png'), file('image', 'figure.jpg')] }),
    expectedUploads: ['claims.docx', 'image.png', 'figure.jpg'],
  }))

test('TRIZ Pro submits its native research report text and file fields', () =>
  assertNativeRoundTrip({
    nodeId: 'Flow-1-2', catalogId: 218, categoryId: 19, detailId: 42,
    response: { ...response, id: 42, name: 'F-1-2-Triz分析-Pro',
      input_schema: [field('tech_landscape', 'paragraph'), field('tech_landscape_file', 'file'), field('user_input', 'paragraph')],
      output_schema: [field('triz_report_content', 'paragraph'), field('triz_report_docx_file', 'file')] },
    formValues: { tech_landscape: '背景研究', tech_landscape_file: 'claims', user_input: '分析机械系统' },
    expectedInputs: file => ({ tech_landscape: '背景研究', tech_landscape_file: file('document', 'claims.docx'), user_input: '分析机械系统' }),
    expectedUploads: ['claims.docx'],
  }))

test('technical disclosure Basic submits its native materials and multiple drawings', () =>
  assertNativeRoundTrip({
    nodeId: 'Flow-1-5', catalogId: 223, categoryId: 4, detailId: 41,
    response: { ...response, id: 41, name: 'F-1-5-技术交底书完善-Basic',
      input_schema: [field('Technical_Disclosure_summary', 'paragraph'), field('Technical_Disclosure_file', 'file'),
        field('drawings_TD', 'file_list'), field('drawings_explain_TD', 'paragraph'), field('User_input', 'paragraph')],
      output_schema: [field('brief_summary', 'paragraph'), field('technical_disclosure_file', 'file'),
        field('improvement_report_file', 'file'), field('tech_elements_table_file', 'file')] },
    formValues: { Technical_Disclosure_summary: '技术概要', Technical_Disclosure_file: 'claims',
      drawings_TD: ['one', 'two'], drawings_explain_TD: '图例', User_input: '补全资料' },
    expectedInputs: file => ({ Technical_Disclosure_summary: '技术概要', Technical_Disclosure_file: file('document', 'claims.docx'),
      drawings_TD: [file('image', 'image.png'), file('image', 'figure.jpg')], drawings_explain_TD: '图例', User_input: '补全资料' }),
    expectedUploads: ['claims.docx', 'image.png', 'figure.jpg'],
  }))

test('drawing description runs as a standalone synchronous professional tool', () =>
  assertNativeRoundTrip({
    nodeId: PATENT_DRAWING_DESCRIPTION_TOOL_ID, catalogId: 167, categoryId: 18, detailId: 34,
    response: { ...response, id: 34, name: '专利附图说明生成', is_async: 0,
      input_schema: [field('drawings_explain', 'paragraph'), field('drawings', 'file')],
      output_schema: [field('text', 'paragraph')] },
    formValues: { drawings_explain: '图一', drawings: 'one' },
    expectedInputs: file => ({ drawings_explain: '图一', drawings: file('image', 'image.png') }),
    expectedUploads: ['image.png'],
  }))

for (const scenario of [
  {
    nodeId: 'Flow-1-1', catalogId: 220, categoryId: 16, detailId: 25, apiType: 'LLM', async: 1,
    endpoint: '技术背景研究报告-Pro', field: 'research_topic', text: '公开合成技术主题',
  },
  {
    nodeId: 'Flow-2-6', catalogId: 215, categoryId: 6, detailId: 46, apiType: 'Workflow', async: 1,
    endpoint: 'F-2-6-权利要求书生成-Basic', field: 'Technical_Disclosure_summary', text: '公开合成技术交底',
  },
  {
    nodeId: 'Flow-2-7', catalogId: 222, categoryId: 13, detailId: 32, apiType: 'Workflow', async: 0,
    endpoint: 'F-2-7-说明书生成-Basic', field: 'description_material', text: '公开合成说明书材料',
  },
  {
    nodeId: 'Flow-6-14', catalogId: 213, categoryId: 7, detailId: 20, apiType: 'Workflow', async: 1,
    endpoint: 'F-6-14-审查意见答复-Basic', field: 'office_action_text', text: '公开合成审查意见',
  },
]) {
  const values = { [scenario.field]: scenario.text }
  test(`${scenario.nodeId} preserves the synthetic dynamic schema and exact submission identity`, () =>
    assertNativeRoundTrip({
      nodeId: scenario.nodeId, catalogId: scenario.catalogId, categoryId: scenario.categoryId, detailId: scenario.detailId,
      response: { ...response, id: scenario.detailId, name: scenario.endpoint, api_type: scenario.apiType,
        is_async: scenario.async, input_schema: [field(scenario.field, 'paragraph')],
        output_schema: [field('result_text', 'paragraph')] },
      formValues: values,
      expectedInputs: () => values,
      expectedUploads: [],
    }))
}
