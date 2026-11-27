import { normalizeOasisFileUrl, normalizeOasisOrigin, normalizeOasisDownloadOrigin } from './oasis-origin-policy.js'
import { oasisRunningWaterPageSchema } from './workbench-contract.js'
import { matchesV340ProfessionalDetail, v340ProfessionalService } from './v340-professional-services.js'

const ENDPOINTS = [
  { method: 'GET', path: '/api/user/detail', purpose: 'user-detail-and-balance', classification: 'legacy' },
  { method: 'GET', path: '/api/apicategories/detail', purpose: 'professional-service-catalog', classification: 'legacy' },
  { method: 'POST', path: '/api/apicategories/apidetail', purpose: 'professional-service-detail', classification: 'legacy' },
  { method: 'GET', path: '/api/user/user/folderlist', purpose: 'folder-list', classification: 'legacy' },
  { method: 'GET', path: '/api/user/user/folderdetail/{id}', purpose: 'folder-detail', classification: 'legacy' },
  { method: 'POST', path: '/api/user/upload', purpose: 'legacy-file-upload', classification: 'legacy' },
  { method: 'POST', path: '/api/apicategories/create', purpose: 'synchronous-workflow-create', classification: 'legacy' },
  { method: 'GET', path: '/api/apicategories/queryprocess/{key}', purpose: 'async-progress-observation', classification: 'legacy' },
  { method: 'GET', path: '/api/user/runningwater/list', purpose: 'running-water-observation', classification: 'legacy' },
]

export const OASIS_API_ENDPOINTS = Object.freeze(ENDPOINTS.map((endpoint) => Object.freeze(endpoint)))

const FORBIDDEN_CREDENTIAL_FIELDS = new Set([
  'apikey',
  'apisecret',
  'secret',
  'secretkey',
  'clientapikey',
  'clientsecret',
  'accesstoken',
  'refreshtoken',
  'credential',
  'credentials',
  'authorization',
  'difykey',
  'difyapikey',
])

function canonicalCredentialFieldName(value) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]/gu, '')
}

export class OasisApiContractError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'OasisApiContractError'
    this.code = code
    this.details = Object.freeze({ ...details })
  }
}

function fail(code, message, details) {
  throw new OasisApiContractError(code, message, details)
}

function record(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail('INVALID_RESPONSE', `${label} must be an object`)
  }
  return value
}

function unwrapData(value, label) {
  const envelope = record(value, label)
  return Object.hasOwn(envelope, 'data') ? envelope.data : envelope
}

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail('INVALID_RESPONSE', `${label} must be a non-empty string`)
  }
  return value
}

function matchingTaskKey(value, expected, label) {
  const expectedKey = nonEmptyString(expected, 'original task key')
  if (value === undefined || value === '') return expectedKey
  const receivedKey = nonEmptyString(value, label)
  if (receivedKey !== expectedKey) {
    fail('INVALID_RESPONSE', `${label} does not match the original task key`)
  }
  return expectedKey
}

function integer(value, label) {
  if (!Number.isSafeInteger(value)) fail('INVALID_RESPONSE', `${label} must be a safe integer`)
  return value
}

function nonNegativeFiniteNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    fail('INVALID_RESPONSE', `${label} must be a finite non-negative number`)
  }
  return value
}

export function assertNoForbiddenCredentialFields(value, path = '$') {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    for (const [index, child] of value.entries()) {
      assertNoForbiddenCredentialFields(child, `${path}[${index}]`)
    }
    return value
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_CREDENTIAL_FIELDS.has(canonicalCredentialFieldName(key))) {
      fail('FORBIDDEN_CREDENTIAL_FIELD', `Forbidden credential property at ${path}.${key}`)
    }
    assertNoForbiddenCredentialFields(child, `${path}.${key}`)
  }
  return value
}

function stripLegacyEmptyDetailCredentials(payload) {
  const data = record(unwrapData(payload, 'API detail response'), 'API detail data')
  const clean = { ...data }
  // The original detail API emits these two empty placeholders, not credentials.
  for (const key of ['api_key', 'credentials']) {
    if (Object.hasOwn(clean, key) && (clean[key] === null || clean[key] === '')) delete clean[key]
  }
  return Object.hasOwn(payload, 'data') ? { ...payload, data: clean } : clean
}

export function normalizeCategoryCatalog(response) {
  const data = record(unwrapData(response, 'category response'), 'category data')
  const services = []
  for (const [groupName, categories] of Object.entries(data)) {
    if (!Array.isArray(categories)) fail('INVALID_RESPONSE', `category group ${groupName} must be an array`)
    for (const categoryValue of categories) {
      const category = record(categoryValue, 'category')
      if (category.is_active === false || category.is_active === 0) continue
      if (!Array.isArray(category.apis)) fail('INVALID_RESPONSE', 'category.apis must be an array')
      for (const apiValue of category.apis) {
        const api = record(apiValue, 'category api')
        services.push({
          categoryId: integer(category.id, 'category.id'),
          categoryName: nonEmptyString(category.name, 'category.name'),
          group: typeof category.group === 'string' && category.group.length > 0 ? category.group : groupName,
          description: typeof category.description === 'string' ? category.description : '',
          apiId: integer(api.id, 'api.id'),
          apiEndpoint: nonEmptyString(api.api_endpoint, 'api.api_endpoint'),
          apiProcess: typeof api.api_process === 'string' ? api.api_process : '',
          apiDescription: typeof api.api_description === 'string' ? api.api_description : '',
        })
      }
    }
  }
  return services
}

function normalizeSchemaField(value, direction) {
  const field = record(value, `${direction} schema field`)
  const type = nonEmptyString(field.type, `${direction} schema field.type`)
  const fieldId = nonEmptyString(field.en_name, `${direction} schema field.en_name`)
  const label = nonEmptyString(field.cn_name, `${direction} schema field.cn_name`)
  const description = typeof field.content === 'string' ? field.content : ''
  const controls = direction === 'input'
    ? { paragraph: 'long-text', string: 'short-text', text: 'short-text', file: 'single-file', file_list: 'multi-file' }
    : { paragraph: 'text-output', string: 'text-output', text: 'text-output', file: 'file-output', file_list: 'file-output' }
  if (!Object.hasOwn(controls, type)) {
    fail('UNSUPPORTED_SCHEMA_FIELD', `Unsupported ${direction} field type: ${type}`, { fieldId, type })
  }
  if (['__proto__', 'constructor', 'prototype'].includes(fieldId)) {
    fail('INVALID_RESPONSE', 'Service field has a reserved identifier')
  }
  return { fieldId, label, description, type, control: controls[type],
    ...(field.required === true ? { required: true } : {}) }
}

export function normalizeApiDetail(response) {
  const data = record(unwrapData(response, 'API detail response'), 'API detail data')
  assertNoForbiddenCredentialFields(data)
  if (data.is_async !== 0 && data.is_async !== 1) {
    fail('INVALID_RESPONSE', 'Service must declare its execution mode')
  }
  const executionMode = data.is_async === 1 ? 'async' : 'sync'
  // The background-research Pro service shares the backend's async create and polling endpoints.
  const approvedResearchService = matchesV340ProfessionalDetail(v340ProfessionalService('Flow-1-1'), {
    id: data.id, name: data.name, apiType: data.api_type, executionMode,
  })
  if (data.api_type !== 'Workflow' && !approvedResearchService) {
    fail('UNSUPPORTED_API_TYPE', 'This service must be a Workflow or the supported research Pro service')
  }
  if (!Array.isArray(data.input_schema) || !Array.isArray(data.output_schema)) {
    fail('INVALID_RESPONSE', 'Workflow input_schema and output_schema must be arrays')
  }
  const normalizeFields = (fields, direction) => {
    const normalized = fields.map(field => normalizeSchemaField(field, direction))
    if (new Set(normalized.map(field => field.fieldId)).size !== normalized.length) {
      fail('INVALID_RESPONSE', 'Service fields must have unique identifiers')
    }
    return normalized
  }
  return {
    id: integer(data.id, 'API detail id'),
    name: nonEmptyString(data.name, 'API detail name'),
    apiType: data.api_type,
    price: nonNegativeFiniteNumber(data.price, 'API detail price'),
    modelName: typeof data.model_name === 'string' ? data.model_name : '',
    executionMode,
    inputFields: normalizeFields(data.input_schema, 'input'),
    outputFields: normalizeFields(data.output_schema, 'output'),
    raw: structuredClone(data),
  }
}

export function normalizeFolderList(response) {
  const data = unwrapData(response, 'folder-list response')
  if (Array.isArray(data)) return { total: data.length, items: structuredClone(data) }
  const page = record(data, 'folder-list data')
  if (!Array.isArray(page.items) || !Number.isSafeInteger(page.total) || page.total < 0) {
    fail('INVALID_RESPONSE', 'folder-list data must contain non-negative total and items')
  }
  return { total: page.total, items: structuredClone(page.items) }
}

function omitUndefined(value) {
  const next = {}
  for (const [key, child] of Object.entries(record(value, 'workflow inputs'))) {
    if (child !== undefined) next[key] = child
  }
  return next
}

export function buildWorkflowCreateBody({ id, key, inputs, apiProcess, folderId }) {
  const body = {
    id: integer(id, 'workflow id'),
    key: nonEmptyString(key, 'workflow key'),
    inputs: omitUndefined(inputs),
    api_process: typeof apiProcess === 'string' ? apiProcess : fail('INVALID_REQUEST', 'apiProcess must be a string'),
    folder_id: integer(folderId, 'folder id'),
  }
  assertNoForbiddenCredentialFields(body)
  return body
}

const ASYNC_ACKNOWLEDGEMENT = '###异步任务，请等待通知'

export function normalizeWorkflowCreateResult(response) {
  const value = typeof response === 'string' ? response : unwrapData(response, 'workflow-create response')
  if (typeof value === 'string') {
    if (!value.trim() || value.trim() === ASYNC_ACKNOWLEDGEMENT) {
      fail('UNRESOLVED_RESPONSE', 'Workflow response contains no usable result')
    }
    return { answerText: value, fileUrls: [], raw: value }
  }
  const data = record(value, 'workflow-create data')
  assertNoForbiddenCredentialFields(data)
  const enhancedKeys = ['structured_result', 'structured_result_error'].filter(key => Object.hasOwn(data, key))
  if (enhancedKeys.length > 1) fail('INVALID_RESPONSE', 'Workflow response contains conflicting enhanced fragments')
  const enhancedFragment = enhancedKeys.length
    ? { [enhancedKeys[0]]: structuredClone(data[enhancedKeys[0]]) } : undefined
  const answer = [data.answer_text, data.output].find(value =>
    typeof value === 'string' && value.trim() && value.trim() !== ASYNC_ACKNOWLEDGEMENT)
  const answerText = answer ?? ''
  const files = typeof data.file_url === 'string'
    ? data.file_url.split(/,\s*(?=https?:\/\/)/i)
    : Array.isArray(data.file_url) ? data.file_url : []
  const fileOutput = Array.isArray(data.file_output) ? data.file_output : []
  const fileUrls = [...new Set([...files, ...fileOutput.map(file =>
    typeof file === 'string' ? file : file?.download_url ?? file?.downloadUrl ?? file?.remote_url ?? file?.url)]
    .filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))]
  const status = typeof data.status === 'string' ? data.status.toLowerCase() : ''
  if (['queued', 'pending', 'running', 'processing'].includes(status)) {
    fail('UNRESOLVED_RESPONSE', 'Workflow result is still pending')
  }
  if (answerText.trim().length === 0 && fileUrls.length === 0 && enhancedFragment === undefined) {
    fail('UNRESOLVED_RESPONSE', 'Workflow response contains no usable result')
  }
  return {
    ...(Number.isSafeInteger(data.id) ? { recordId: data.id } : {}),
    ...(typeof data.key === 'string' ? { key: data.key } : {}),
    answerText,
    fileUrls,
    ...(enhancedFragment === undefined ? {} : { enhancedFragment }),
    raw: structuredClone(data),
  }
}

function normalizeResultUrls(fileUrls, assertAllowedUrl) {
  return fileUrls.map((value) => assertAllowedUrl(value, 'workflow result URL'))
}

export function normalizeWorkflowProgress(response, taskKey) {
  const data = record(unwrapData(response, 'workflow-progress response'), 'workflow-progress data')
  assertNoForbiddenCredentialFields(data)
  const key = matchingTaskKey(data.key, taskKey, 'workflow-progress key')
  const rawStatus = typeof data.status === 'string' ? data.status.toLocaleLowerCase('en-US') : ''
  if (['failed', 'error', 'cancelled', 'canceled'].includes(rawStatus) || typeof data.error_message === 'string' && data.error_message.trim()) {
    fail('REMOTE_EXECUTION_FAILED', 'Oasis workflow execution failed')
  }
  const rawProgress = typeof data.progress_percent === 'number' && Number.isFinite(data.progress_percent)
    ? data.progress_percent
    : 0
  const progressPercent = Math.max(0, Math.min(100, rawProgress))
  const completed = data.is_completed === true
    || ['completed', 'succeeded', 'success', 'done', 'finished'].includes(rawStatus)
    || progressPercent >= 100
  if (!completed) return { key, status: 'running', progressPercent, result: null }
  let normalized
  try {
    normalized = normalizeWorkflowCreateResult(data)
  } catch (error) {
    if (error?.code !== 'UNRESOLVED_RESPONSE') throw error
    // The backend reports progress separately from the persisted result.
    return { key, status: 'running', progressPercent, result: null }
  }
  return {
    key,
    status: 'completed',
    progressPercent,
    result: {
      ...(Number.isSafeInteger(normalized.recordId) ? { recordId: normalized.recordId } : {}),
      ...(typeof normalized.key === 'string' ? { key: normalized.key } : { key }),
      answerText: normalized.answerText,
      fileUrls: normalized.fileUrls,
      ...(normalized.enhancedFragment === undefined ? {} : { enhancedFragment: normalized.enhancedFragment }),
    },
  }
}

export function normalizeRunningWater(response) {
  const data = unwrapData(response, 'running-water response')
  const page = record(data, 'running-water data')
  if (!Array.isArray(page.items) || !Number.isSafeInteger(page.total) || page.total < 0) {
    fail('INVALID_RESPONSE', 'running-water data must contain non-negative total and items')
  }
  const normalized = {
    total: page.total,
    items: page.items.map((value) => {
      const item = record(value, 'running-water item')
      if (item.create_time !== undefined && typeof item.create_time !== 'string') {
        fail('INVALID_RESPONSE', 'running-water creation time must be a string when provided')
      }
      return {
        id: item.id,
        linkId: item.link_id,
        type: item.type,
        money: item.money,
        balance: item.balance,
        createTime: item.create_time ?? null,
      }
    }),
  }
  const parsed = oasisRunningWaterPageSchema.safeParse(normalized)
  if (!parsed.success) fail('INVALID_RESPONSE', 'running-water page contains invalid fields')
  return parsed.data
}

export function createOasisApiClient({
  baseUrl,
  environmentKind = 'non-production',
  downloadOrigins = [],
  fetchImpl = globalThis.fetch,
  resolveToken,
}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl is required')
  if (typeof resolveToken !== 'function') throw new TypeError('resolveToken is required')
  const origin = new URL(normalizeOasisOrigin(baseUrl, 'baseUrl', environmentKind))
  if (!Array.isArray(downloadOrigins)) throw new TypeError('downloadOrigins must be an array')
  const allowedOrigins = new Set([
    origin.origin,
    ...downloadOrigins.map((value) => normalizeOasisDownloadOrigin(value, 'downloadOrigins entry', environmentKind)),
  ])

  function assertAllowedUrl(value, label) {
    let url
    try {
      url = new URL(normalizeOasisFileUrl(value, environmentKind))
    } catch {
      fail('UNTRUSTED_REMOTE_URL', `${label} does not satisfy the file URL environment policy`)
    }
    if (!['http:', 'https:'].includes(url.protocol) || !allowedOrigins.has(url.origin)) {
      fail('UNTRUSTED_REMOTE_URL', `${label} origin is not allowed`)
    }
    return url.href
  }

  function endpointSignal(options) {
    if (options === undefined) return undefined
    if (options === null || typeof options !== 'object' || Array.isArray(options)) {
      throw new TypeError('Endpoint options must be an object containing only signal')
    }
    const unsupported = Reflect.ownKeys(options).filter((key) => key !== 'signal')
    if (unsupported.length > 0) {
      throw new TypeError('Endpoint options support only signal')
    }
    return options.signal
  }

  async function request(path, { method = 'GET', body, formData, signal } = {}) {
    const token = await resolveToken()
    if (typeof token !== 'string' || token.length === 0) fail('AUTH_REQUIRED', 'Oasis JWT is not configured')
    const requestHeaders = { accept: 'application/json', authorization: `Bearer ${token}` }
    const init = { method, headers: requestHeaders, signal, redirect: 'error' }
    if (body !== undefined) {
      assertNoForbiddenCredentialFields(body)
      requestHeaders['content-type'] = 'application/json'
      init.body = JSON.stringify(body)
    } else if (formData !== undefined) {
      if (!(formData instanceof FormData)) throw new TypeError('formData must be FormData')
      init.body = formData
    }
    const response = await fetchImpl(new URL(path, origin).href, init)
    if (response.status === 401 || response.status === 403) fail('AUTH_REQUIRED', 'Oasis authentication is required')
    let payload
    try {
      payload = await response.json()
    } catch {
      fail('INVALID_RESPONSE', 'Oasis response was not JSON', { status: response.status })
    }
    if (!response.ok || (payload !== null && Object.hasOwn(payload, 'code') && ![0, 200].includes(payload.code))) {
      fail('REMOTE_ERROR', 'Oasis API request failed', { status: response.status, code: payload?.code })
    }
    if (method === 'POST' && path === '/api/apicategories/apidetail') {
      payload = stripLegacyEmptyDetailCredentials(payload)
    }
    assertNoForbiddenCredentialFields(payload)
    return payload
  }

  return Object.freeze({
    async getUserDetail(options) {
      return structuredClone(unwrapData(await request('/api/user/detail', {
        method: 'GET',
        signal: endpointSignal(options),
      }), 'user-detail response'))
    },

    async getCategoryCatalog(options) {
      return normalizeCategoryCatalog(await request('/api/apicategories/detail', {
        method: 'GET', signal: endpointSignal(options),
      }))
    },

    async getApiDetail(name, options) {
      return normalizeApiDetail(await request('/api/apicategories/apidetail', {
        method: 'POST', body: { name: nonEmptyString(name, 'API endpoint') }, signal: endpointSignal(options),
      }))
    },

    async getFolderList(options) {
      return normalizeFolderList(await request('/api/user/user/folderlist', {
        method: 'GET', signal: endpointSignal(options),
      }))
    },

    async getFolderDetail(folderId, options) {
      return structuredClone(unwrapData(await request(
        `/api/user/user/folderdetail/${integer(folderId, 'folder id')}`,
        { method: 'GET', signal: endpointSignal(options) },
      ), 'folder-detail response'))
    },

    async uploadFile(file, options) {
      const input = record(file, 'upload file')
      if (!(input.bytes instanceof Uint8Array)) throw new TypeError('upload file bytes must be Uint8Array')
      const fileName = nonEmptyString(input.fileName, 'upload file name')
      const mediaType = nonEmptyString(input.mediaType, 'upload media type')
      const formData = new FormData()
      formData.append('file', new Blob([input.bytes], { type: mediaType }), fileName)
      const payload = await request('/api/user/upload', {
        method: 'POST', formData, signal: endpointSignal(options),
      })
      const data = record(unwrapData(payload, 'upload response'), 'upload data')
      const value = typeof data.saved_path === 'string' && data.saved_path.length > 0
        ? data.saved_path
        : data.url
      return assertAllowedUrl(nonEmptyString(value, 'upload URL'), 'upload URL')
    },

    async createWorkflow(input, options) {
      const body = buildWorkflowCreateBody(input)
      const payload = await request('/api/apicategories/create', {
        method: 'POST', body, signal: endpointSignal(options),
      })
      try {
        const result = normalizeWorkflowCreateResult(payload)
        const key = matchingTaskKey(result.key, body.key, 'workflow-create key')
        return {
          resolved: true,
          result: {
            ...(Number.isSafeInteger(result.recordId) ? { recordId: result.recordId } : {}),
            key,
            answerText: result.answerText,
            fileUrls: normalizeResultUrls(result.fileUrls, assertAllowedUrl),
            ...(result.enhancedFragment === undefined ? {} : { enhancedFragment: result.enhancedFragment }),
          },
        }
      } catch (error) {
        if (!(error instanceof OasisApiContractError) || error.code !== 'UNRESOLVED_RESPONSE') throw error
        const value = typeof payload === 'string' ? payload : unwrapData(payload, 'workflow-create response')
        const data = typeof value === 'string' ? {} : record(value, 'workflow-create data')
        const key = matchingTaskKey(data.key, body.key, 'workflow-create receipt key')
        return {
          resolved: false,
          receipt: {
            ...(Number.isSafeInteger(data.id) ? { recordId: data.id } : {}),
            key,
          },
        }
      }
    },

    async queryProcess(taskKey, options) {
      const key = nonEmptyString(taskKey, 'task key')
      const progress = normalizeWorkflowProgress(await request(
        `/api/apicategories/queryprocess/${encodeURIComponent(key)}`,
        { method: 'GET', signal: endpointSignal(options) },
      ), key)
      if (progress.result !== null) {
        progress.result.fileUrls = normalizeResultUrls(progress.result.fileUrls, assertAllowedUrl)
      }
      return progress
    },

    async getRunningWater(options) {
      return normalizeRunningWater(await request('/api/user/runningwater/list', {
        method: 'GET', signal: endpointSignal(options),
      }))
    },
  })
}
