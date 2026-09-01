import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
