import { readFile } from 'node:fs/promises'

const ALLOWED_ENDPOINTS = new Set([
  'session.create',
  'skill.list',
  'workspace.list',
])

const [baseUrlValue, endpoint, requestPath, ...expectedSkillNames] = process.argv.slice(2)
if (!baseUrlValue || !endpoint || !requestPath) {
  throw new Error('usage: node scripts/dsh-local-api-smoke.mjs <base-url> <endpoint> <request-json>')
}

const baseUrl = new URL(baseUrlValue)
if (baseUrl.protocol !== 'http:') {
  throw new Error(`refusing non-http DSH API target: ${baseUrl.protocol}`)
}
const normalizedHostname = baseUrl.hostname.replace(/^\[|\]$/g, '')
if (!['127.0.0.1', 'localhost', '::1'].includes(normalizedHostname)) {
  throw new Error(`refusing non-loopback DSH API target: ${baseUrl.hostname}`)
}
if (!ALLOWED_ENDPOINTS.has(endpoint)) {
  throw new Error(`DSH API endpoint is not in the allowlist: ${endpoint}`)
}

const body = await readFile(requestPath, 'utf8')
const response = await fetch(new URL(`/api/${endpoint}`, baseUrl), {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body,
})
const responseBody = await response.text()

console.error(`HTTP ${response.status}`)
let payload
try {
  payload = JSON.parse(responseBody)
} catch {
  throw new Error('DSH API response is not valid JSON')
}

if (!response.ok) {
  throw new Error(`DSH API request failed with HTTP ${response.status}`)
}

if (payload?.result?.ok !== true) {
  const code = payload?.result?.error?.code ?? 'unknown'
  const message = payload?.result?.error?.message ?? 'result.ok was not true'
  throw new Error(`DSH API operation failed (${code}): ${message}`)
}

if (endpoint === 'skill.list' && expectedSkillNames.length > 0) {
  const skills = payload?.result?.value?.skills
  if (!Array.isArray(skills)) throw new Error('response has no skill list')

  const selected = skills.filter((skill) => expectedSkillNames.includes(skill.name))
  const missing = expectedSkillNames.filter((name) => !selected.some((skill) => skill.name === name))
  if (missing.length > 0) throw new Error(`missing expected skills: ${missing.join(', ')}`)
  console.log(JSON.stringify({ skills: selected }, null, 2))
} else {
  console.log(JSON.stringify(payload, null, 2))
}
