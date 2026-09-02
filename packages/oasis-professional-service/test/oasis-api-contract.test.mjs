import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  assertNoForbiddenCredentialFields,
  buildWorkflowCreateBody,
  createOasisApiClient,
  normalizeApiDetail,
  normalizeCategoryCatalog,
  normalizeFolderList,
  normalizeRunningWater,
  normalizeWorkflowCreateResult,
  OASIS_API_ENDPOINTS,
} from '../src/oasis-api-contract.js'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

test('ships the user-validated legacy API baseline with exact provenance and nine bounded endpoints', () => {
  const baseline = JSON.parse(readFileSync(
    resolve(packageRoot, 'docs/api/oasis-professional-service-baseline.json'),
    'utf8',
  ))
  assert.equal(baseline.schemaVersion, 1)
  assert.equal(baseline.source.sha256, '429357f3e60e39aeaae1c879c475d629633e88f5a1f71975c618c6899768feb1')
  assert.equal(baseline.source.userValidated, true)
  assert.deepEqual(baseline.endpoints, OASIS_API_ENDPOINTS)
  assert.equal(baseline.endpoints.length, 9)
  assert.equal(baseline.endpoints.every((endpoint) => endpoint.classification === 'legacy'), true)
})

test('normalizes dynamic category ids, endpoints, and process strings without hardcoding services', () => {
  const catalog = normalizeCategoryCatalog({
    code: 200,
    data: {
      '专利撰写': [{
        id: 6,
        name: '权利要求书生成',
        group: '专利撰写',
        description: '生成草稿',
        is_active: true,
        apis: [{
          id: 132,
          api_endpoint: '权利要求书生成-3.3-Fast-X',
          api_process: '输入内容整理,权利要求撰写',
          api_description: '快速生成',
        }],
      }],
    },
  })

  assert.deepEqual(catalog, [{
    categoryId: 6,
    categoryName: '权利要求书生成',
    group: '专利撰写',
    description: '生成草稿',
    apiId: 132,
    apiEndpoint: '权利要求书生成-3.3-Fast-X',
    apiProcess: '输入内容整理,权利要求撰写',
    apiDescription: '快速生成',
  }])
})

test('accepts only synchronous Workflow details and maps documented dynamic fields', () => {
  const detail = normalizeApiDetail({
    code: 200,
    data: {
      id: 31,
      name: '权利要求书生成-3.3-Fast-X',
      api_type: 'Workflow',
      price: 3,
      model_name: '',
      is_async: 0,
      input_schema: [
        { type: 'paragraph', cn_name: '用户指令', content: '补充要求', en_name: 'User_input' },
        { type: 'string', cn_name: '附图说明', content: '图号说明', en_name: 'drawings' },
        { type: 'file', cn_name: '交底书', content: '上传单份文档', en_name: 'file' },
      ],
      output_schema: [
        { type: 'paragraph', cn_name: '权利要求书', content: '', en_name: 'output' },
        { type: 'file', cn_name: '权利要求书文件', content: '', en_name: 'file_output' },
      ],
    },
  })

  assert.equal(detail.executionMode, 'sync')
  assert.deepEqual(detail.inputFields.map((field) => field.control), ['long-text', 'short-text', 'single-file'])
  assert.throws(
    () => normalizeApiDetail({ data: { ...detail.raw, api_type: 'Chatflow' } }),
    /Workflow/,
  )
  assert.throws(
    () => normalizeApiDetail({ data: { ...detail.raw, is_async: 1 } }),
    /synchronous|async/i,
  )
  assert.throws(
    () => normalizeApiDetail({ data: { ...detail.raw, input_schema: [{ type: 'number', cn_name: '未知', content: '', en_name: 'x' }] } }),
    /unsupported.*field|field.*unsupported/i,
  )
})

test('rejects missing, non-numeric, negative, and non-finite service prices', () => {
  const detail = {
    id: 31,
    name: '权利要求书生成-3.3-Fast-X',
    api_type: 'Workflow',
    price: 3,
    model_name: '',
    is_async: 0,
    input_schema: [],
    output_schema: [],
  }
  for (const price of [undefined, '3', -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const candidate = { ...detail }
    if (price === undefined) delete candidate.price
    else candidate.price = price
    assert.throws(() => normalizeApiDetail({ data: candidate }), /price/i)
  }
})

test('builds the exact five-field create body and omits absent file inputs', () => {
  const body = buildWorkflowCreateBody({
    id: 31,
    key: 'task-123',
    inputs: {
      User_input: '只需要文本',
      file: undefined,
      files: undefined,
    },
    apiProcess: '输入内容整理,权利要求撰写',
    folderId: 8,
  })
  assert.deepEqual(body, {
    id: 31,
    key: 'task-123',
    inputs: { User_input: '只需要文本' },
    api_process: '输入内容整理,权利要求撰写',
    folder_id: 8,
  })
  assert.deepEqual(Object.keys(body), ['id', 'key', 'inputs', 'api_process', 'folder_id'])
})

test('normalizes both folder-list wrappers, workflow output variants, and running-water wrappers', () => {
  assert.deepEqual(normalizeFolderList({ data: [{ id: 1, name: '旧项目' }] }), {
    total: 1,
    items: [{ id: 1, name: '旧项目' }],
  })
  assert.deepEqual(normalizeFolderList({ data: { total: 2, items: [{ id: 2, name: '新项目' }] } }), {
    total: 2,
    items: [{ id: 2, name: '新项目' }],
  })
  assert.deepEqual(normalizeWorkflowCreateResult({
    data: { id: 456, key: 'task-123', answer_text: '', file_url: ['https://files.test/result.docx'] },
  }), {
    recordId: 456,
    key: 'task-123',
    answerText: '',
    fileUrls: ['https://files.test/result.docx'],
    raw: { id: 456, key: 'task-123', answer_text: '', file_url: ['https://files.test/result.docx'] },
  })
  assert.throws(() => normalizeWorkflowCreateResult({ data: { answer_text: '', file_url: [] } }), /usable|result/i)
  assert.deepEqual(normalizeRunningWater({ total: 1, items: [{ id: 93, link_id: 99, type: '消费', money: 1, balance: 0 }] }), {
    total: 1,
    items: [{ id: 93, linkId: 99, type: '消费', money: 1, balance: 0 }],
  })
})

test('rejects exact forbidden property names without scanning ordinary user text', () => {
  assert.doesNotThrow(() => assertNoForbiddenCredentialFields({
    prompt: '文档正文中可能讨论 access_token 字样，但不是属性名',
  }))
  for (const key of ['api_key', 'apikey', 'secret', 'client_secret', 'access_token', 'refresh_token', 'credential', 'authorization', 'dify_key']) {
    assert.throws(() => assertNoForbiddenCredentialFields({ nested: { [key]: 'value' } }), /forbidden.*credential|credential.*forbidden/i)
  }
})

test('rejects bounded credential field variants across common naming conventions', () => {
  for (const key of [
    'api-key',
    'clientSecret',
    'client-secret',
    'refreshToken',
    'refresh-token',
    'difyKey',
    'dify-api-key',
  ]) {
    assert.throws(
      () => assertNoForbiddenCredentialFields({ nested: { [key]: 'value' } }),
      /forbidden.*credential|credential.*forbidden/i,
    )
  }
  assert.doesNotThrow(() => assertNoForbiddenCredentialFields({
    key: 'task-key',
    api_process: '步骤1,步骤2',
    prompt: '正文可以讨论 clientSecret 字样',
  }))
})

test('uses Bearer auth and documented paths through injected fake fetch without retries', async () => {
  const calls = []
  const client = createOasisApiClient({
    baseUrl: 'https://oasis-staging.example',
    fetchImpl: async (url, init) => {
      calls.push({ url, init })
      return new Response(JSON.stringify({ code: 200, data: { balance: 9 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    },
    resolveToken: async () => 'jwt-from-provider',
  })

  assert.deepEqual(await client.getUserDetail(), { balance: 9 })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://oasis-staging.example/api/user/detail')
  assert.equal(calls[0].init.headers.authorization, 'Bearer jwt-from-provider')
})

test('rejects transport redirects before forwarding a workflow request body to another origin', async () => {
  let redirectedRequests = 0
  const target = createServer((request, response) => {
    redirectedRequests += 1
    request.resume()
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ data: { key: 'task-a', answer_text: 'unexpected', file_url: [] } }))
  })
  target.listen(0, '127.0.0.1')
  await once(target, 'listening')

  const source = createServer((_request, response) => {
    response.writeHead(307, { location: `http://127.0.0.1:${target.address().port}/redirected` })
    response.end()
  })
  source.listen(0, '127.0.0.1')
  await once(source, 'listening')

  try {
    const client = createOasisApiClient({
      baseUrl: `http://127.0.0.1:${source.address().port}`,
      resolveToken: async () => 'jwt-from-provider',
    })
    await assert.rejects(client.createWorkflow({
      id: 31,
      key: 'task-a',
      inputs: { User_input: 'must-not-leave-the-configured-origin' },
      apiProcess: '整理,撰写',
      folderId: 8,
    }))
    assert.equal(redirectedRequests, 0)
  } finally {
    source.close()
    target.close()
    await Promise.all([once(source, 'close'), once(target, 'close')])
  }
})

test('rejects create and query responses whose task key differs from the original request key', async () => {
  const client = createOasisApiClient({
    baseUrl: 'https://oasis-staging.example',
    resolveToken: async () => 'jwt-from-provider',
    fetchImpl: async (url) => new Response(JSON.stringify({
      code: 200,
      data: new URL(url).pathname === '/api/apicategories/create'
        ? { key: 'other-task', answer_text: 'wrong result', file_url: [] }
        : {
            key: 'other-task', status: 'succeeded', is_completed: true,
            progress_percent: 100, answer_text: 'wrong result', file_url: [],
          },
    }), { status: 200, headers: { 'content-type': 'application/json' } }),
  })

  const isInvalidResponse = (error) => error?.code === 'INVALID_RESPONSE'
  await assert.rejects(client.createWorkflow({
    id: 31, key: 'task-a', inputs: { User_input: '撰写' }, apiProcess: '整理,撰写', folderId: 8,
  }), isInvalidResponse)
  await assert.rejects(client.queryProcess('task-a'), isInvalidResponse)
})

test('dispatches every bounded professional-service endpoint with fixed methods and bodies', async () => {
  const calls = []
  const replies = new Map([
    ['/api/apicategories/detail', { code: 200, data: { 专利撰写: [] } }],
    ['/api/apicategories/apidetail', { code: 200, data: {
      id: 31, name: 'claims-v1', api_type: 'Workflow', price: 3, model_name: '', is_async: 0,
      input_schema: [], output_schema: [],
    } }],
    ['/api/user/user/folderlist', { code: 200, data: [{ id: 8, name: '测试项目' }] }],
    ['/api/user/user/folderdetail/8', { code: 200, data: { id: 8, name: '测试项目' } }],
    ['/api/user/upload', { code: 200, data: { saved_path: 'https://files-staging.example/upload/a.docx' } }],
    ['/api/apicategories/create', { code: 200, data: { id: 90, key: 'task-a' } }],
    ['/api/apicategories/queryprocess/task-a', { code: 200, data: {
      key: 'task-a', status: 'succeeded', is_completed: true, progress_percent: 100,
      answer_text: '远程结果', file_url: 'https://files-staging.example/result/a.docx',
    } }],
    ['/api/user/runningwater/list', { code: 200, data: { total: 0, items: [] } }],
  ])
  const client = createOasisApiClient({
    baseUrl: 'https://oasis-staging.example',
    downloadOrigins: ['https://files-staging.example'],
    resolveToken: async () => 'jwt-from-provider',
    fetchImpl: async (url, init) => {
      calls.push({ url, init })
      const path = new URL(url).pathname
      return new Response(JSON.stringify(replies.get(path)), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    },
  })

  assert.deepEqual(await client.getCategoryCatalog(), [])
  assert.equal((await client.getApiDetail('claims-v1')).price, 3)
  assert.deepEqual(await client.getFolderList(), { total: 1, items: [{ id: 8, name: '测试项目' }] })
  assert.deepEqual(await client.getFolderDetail(8), { id: 8, name: '测试项目' })
  assert.equal(await client.uploadFile({
    bytes: new TextEncoder().encode('document'), fileName: 'a.docx',
    mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }), 'https://files-staging.example/upload/a.docx')
  assert.deepEqual(await client.createWorkflow({
    id: 31, key: 'task-a', inputs: { User_input: '撰写' }, apiProcess: '整理,撰写', folderId: 8,
  }), { resolved: false, receipt: { recordId: 90, key: 'task-a' } })
  assert.deepEqual(await client.queryProcess('task-a'), {
    key: 'task-a', status: 'completed', progressPercent: 100,
    result: {
      key: 'task-a', answerText: '远程结果',
      fileUrls: ['https://files-staging.example/result/a.docx'],
    },
  })
  assert.deepEqual(await client.getRunningWater(), { total: 0, items: [] })

  assert.deepEqual(calls.map((call) => [new URL(call.url).pathname, call.init.method]), [
    ['/api/apicategories/detail', 'GET'],
    ['/api/apicategories/apidetail', 'POST'],
    ['/api/user/user/folderlist', 'GET'],
    ['/api/user/user/folderdetail/8', 'GET'],
    ['/api/user/upload', 'POST'],
    ['/api/apicategories/create', 'POST'],
    ['/api/apicategories/queryprocess/task-a', 'GET'],
    ['/api/user/runningwater/list', 'GET'],
  ])
  assert.deepEqual(JSON.parse(calls[1].init.body), { name: 'claims-v1' })
  assert.equal(calls[4].init.body instanceof FormData, true)
  assert.equal(calls[4].init.body.get('file').name, 'a.docx')
  assert.deepEqual(JSON.parse(calls[5].init.body), {
    id: 31, key: 'task-a', inputs: { User_input: '撰写' }, api_process: '整理,撰写', folder_id: 8,
  })
})

test('rejects upload and result URLs outside the configured non-production origins', async () => {
  const client = createOasisApiClient({
    baseUrl: 'https://oasis-staging.example',
    downloadOrigins: ['https://files-staging.example'],
    resolveToken: async () => 'jwt-from-provider',
    fetchImpl: async (url) => new Response(JSON.stringify({ code: 200, data: new URL(url).pathname === '/api/user/upload'
      ? { url: 'https://evil.example/upload.docx' }
      : { key: 'task-a', status: 'succeeded', is_completed: true, answer_text: 'ok', file_url: 'https://evil.example/result.docx' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  })
  await assert.rejects(client.uploadFile({
    bytes: new Uint8Array([1]), fileName: 'a.docx', mediaType: 'application/octet-stream',
  }), /origin|allow|URL/i)
  await assert.rejects(client.queryProcess('task-a'), /origin|allow|URL/i)
})

test('rejects a direct API client configured for the normalized production host', () => {
  for (const baseUrl of [
    'http://lzhxpy.oasisintwrite.com',
    'https://lzhxpy.oasisintwrite.com.',
  ]) {
    assert.throws(
      () => createOasisApiClient({ baseUrl, fetchImpl: async () => {}, resolveToken: async () => 'test' }),
      /production/i,
    )
  }
})

test('rejects endpoint option overrides before resolving credentials or calling fetch', async () => {
  let tokenReads = 0
  let fetchCalls = 0
  const client = createOasisApiClient({
    baseUrl: 'https://oasis-staging.example',
    resolveToken: async () => {
      tokenReads += 1
      return 'provider-token'
    },
    fetchImpl: async () => {
      fetchCalls += 1
      return new Response(JSON.stringify({ code: 200, data: {} }), { status: 200 })
    },
  })

  for (const options of [
    { method: 'DELETE' },
    { body: { unexpected: true } },
    { headers: { authorization: 'Bearer caller-token' } },
  ]) {
    await assert.rejects(client.getUserDetail(options), /option|signal|unsupported/i)
  }
  assert.equal(tokenReads, 0)
  assert.equal(fetchCalls, 0)
})
