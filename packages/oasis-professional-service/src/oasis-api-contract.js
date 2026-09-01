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
  'api_key',
  'apikey',
  'secret',
  'client_secret',
  'access_token',
  'refresh_token',
  'credential',
  'authorization',
  'dify_key',
])

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

function integer(value, label) {
  if (!Number.isSafeInteger(value)) fail('INVALID_RESPONSE', `${label} must be a safe integer`)
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
    if (FORBIDDEN_CREDENTIAL_FIELDS.has(key.toLocaleLowerCase('en-US'))) {
      fail('FORBIDDEN_CREDENTIAL_FIELD', `Forbidden credential property at ${path}.${key}`)
    }
    assertNoForbiddenCredentialFields(child, `${path}.${key}`)
  }
  return value
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
    ? { paragraph: 'long-text', string: 'short-text', file: 'single-file' }
    : { paragraph: 'text-output', string: 'text-output', file: 'file-output' }
  const control = controls[type]
  if (!control) fail('UNSUPPORTED_SCHEMA_FIELD', `Unsupported ${direction} field type: ${type}`, { fieldId, type })
  return { fieldId, label, description, type, control }
}

export function normalizeApiDetail(response) {
  const data = record(unwrapData(response, 'API detail response'), 'API detail data')
  assertNoForbiddenCredentialFields(data)
  if (data.api_type !== 'Workflow') {
    fail('UNSUPPORTED_API_TYPE', 'Only Workflow API details are supported')
  }
  if (data.is_async !== 0) {
    fail('ASYNC_NOT_SUPPORTED', 'Only explicitly synchronous Workflow APIs are supported')
  }
  if (!Array.isArray(data.input_schema) || !Array.isArray(data.output_schema)) {
    fail('INVALID_RESPONSE', 'Workflow input_schema and output_schema must be arrays')
  }
  return {
    id: integer(data.id, 'API detail id'),
    name: nonEmptyString(data.name, 'API detail name'),
    apiType: data.api_type,
    price: typeof data.price === 'number' && Number.isFinite(data.price) ? data.price : 0,
    modelName: typeof data.model_name === 'string' ? data.model_name : '',
    executionMode: 'sync',
    inputFields: data.input_schema.map((field) => normalizeSchemaField(field, 'input')),
    outputFields: data.output_schema.map((field) => normalizeSchemaField(field, 'output')),
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

export function normalizeWorkflowCreateResult(response) {
  const data = record(unwrapData(response, 'workflow-create response'), 'workflow-create data')
  assertNoForbiddenCredentialFields(data)
  const answerText = typeof data.answer_text === 'string' ? data.answer_text : ''
  let fileUrls
  if (typeof data.file_url === 'string') fileUrls = data.file_url.length > 0 ? [data.file_url] : []
  else if (Array.isArray(data.file_url)) fileUrls = data.file_url.filter((value) => typeof value === 'string' && value.length > 0)
  else fileUrls = []
  if (answerText.trim().length === 0 && fileUrls.length === 0) {
    fail('UNRESOLVED_RESPONSE', 'Workflow response contains no usable result')
  }
  return {
    ...(Number.isSafeInteger(data.id) ? { recordId: data.id } : {}),
    ...(typeof data.key === 'string' ? { key: data.key } : {}),
    answerText,
    fileUrls,
    raw: structuredClone(data),
  }
}

export function normalizeRunningWater(response) {
  const data = unwrapData(response, 'running-water response')
  const page = record(data, 'running-water data')
  if (!Array.isArray(page.items) || !Number.isSafeInteger(page.total) || page.total < 0) {
    fail('INVALID_RESPONSE', 'running-water data must contain non-negative total and items')
  }
  return {
    total: page.total,
    items: page.items.map((value) => {
      const item = record(value, 'running-water item')
      return {
        id: item.id,
        linkId: item.link_id,
        type: item.type,
        money: item.money,
        balance: item.balance,
      }
    }),
  }
}

export function createOasisApiClient({ baseUrl, fetchImpl = globalThis.fetch, resolveToken }) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl is required')
  if (typeof resolveToken !== 'function') throw new TypeError('resolveToken is required')
  const origin = new URL(baseUrl)
  if (origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
    throw new TypeError('baseUrl must be an origin')
  }

  async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
    const token = await resolveToken()
    if (typeof token !== 'string' || token.length === 0) fail('AUTH_REQUIRED', 'Oasis JWT is not configured')
    const requestHeaders = { accept: 'application/json', authorization: `Bearer ${token}`, ...headers }
    const init = { method, headers: requestHeaders, signal }
    if (body !== undefined) {
      assertNoForbiddenCredentialFields(body)
      requestHeaders['content-type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
    const response = await fetchImpl(new URL(path, origin).href, init)
    if (response.status === 401 || response.status === 403) fail('AUTH_REQUIRED', 'Oasis authentication is required')
    let payload
    try {
      payload = await response.json()
    } catch {
      fail('INVALID_RESPONSE', 'Oasis response was not JSON', { status: response.status })
    }
    if (!response.ok || (Object.hasOwn(payload, 'code') && ![0, 200].includes(payload.code))) {
      fail('REMOTE_ERROR', 'Oasis API request failed', { status: response.status, code: payload.code })
    }
    assertNoForbiddenCredentialFields(payload)
    return payload
  }

  return Object.freeze({
    async getUserDetail(options) {
      return structuredClone(unwrapData(await request('/api/user/detail', options), 'user-detail response'))
    },
  })
}
