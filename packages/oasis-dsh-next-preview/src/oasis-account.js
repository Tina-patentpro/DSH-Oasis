import { randomUUID } from 'node:crypto'
import { credentialKey } from '@deepseek-ai/dsh-credentials'
import { accountCommandSchemas, OASIS_PRODUCT_ORIGIN } from './oasis-account-contract.js'
export { OASIS_PRODUCT_ORIGIN } from './oasis-account-contract.js'

const KEY = credentialKey('oasis-professional-service', 'website-account')
export class OasisAccountError extends Error {
  constructor(code) { super(code); this.code = code }
}
const fail = code => { throw new OasisAccountError(code) }
function grant(record) {
  const p = record?.kind === 'grant' ? record.payload : null
  return p?.origin === OASIS_PRODUCT_ORIGIN && Number.isSafeInteger(p.accountId) && p.accountId > 0
    && typeof p.token === 'string' && p.token.length > 0 && p.token.length <= 16384
    && typeof p.revision === 'string' && p.revision.length <= 100 ? p : null
}

export function createOasisAccountService({ credentials, fetchImpl = globalThis.fetch, enabled = true, now = Date.now } = {}) {
  const available = enabled && ['readRecord', 'modifyRecord', 'deleteRecord', 'describeRecord'].every(k => typeof credentials?.[k] === 'function')
  let busy = false
  let cooldownUntil = 0
  let disposed = false
  const controllers = new Set()
  async function status() {
    if (!available || disposed) return { authenticated: false, available: false, writable: false, accountId: null, revision: null, retryAfterSeconds: 0 }
    try {
      const [record, info] = await Promise.all([credentials.readRecord(KEY), credentials.describeRecord(KEY)])
      const p = grant(record)
      return { authenticated: !!p, available: true, writable: info.writable === true,
        accountId: p?.accountId ?? null, revision: p?.revision ?? null,
        retryAfterSeconds: Math.max(0, Math.ceil((cooldownUntil - now()) / 1000)) }
    } catch { fail('ACCOUNT_UNAVAILABLE') }
  }
  async function request(path, body) {
    const controller = new AbortController()
    controllers.add(controller)
    const timeout = setTimeout(() => controller.abort(), 20000)
    try {
      const response = await fetchImpl(OASIS_PRODUCT_ORIGIN + path, {
        method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal,
      })
      if (!response.ok || disposed) fail('ACCOUNT_REQUEST_FAILED')
      const reader = response.body?.getReader()
      if (!reader) fail('ACCOUNT_REQUEST_FAILED')
      const chunks = []
      let length = 0
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          length += value.byteLength
          if (length > 65536) { await reader.cancel(); fail('ACCOUNT_REQUEST_FAILED') }
          chunks.push(value)
        }
      } finally { reader.releaseLock() }
      const text = Buffer.concat(chunks).toString('utf8')
      const result = JSON.parse(text)
      if (result?.code !== 200) fail('ACCOUNT_REQUEST_FAILED')
      return result.data
    } catch { fail('ACCOUNT_REQUEST_FAILED') }
    finally { clearTimeout(timeout); controllers.delete(controller) }
  }
  async function command(name, input, operation) {
    if (!available || disposed) fail('ACCOUNT_UNAVAILABLE')
    const parsed = accountCommandSchemas[name].safeParse(input)
    if (!parsed.success) fail('ACCOUNT_INVALID_INPUT')
    if (busy) fail('ACCOUNT_BUSY')
    busy = true
    try { return await operation(parsed.data) }
    catch (error) { if (error instanceof OasisAccountError) throw error; fail('ACCOUNT_REQUEST_FAILED') }
    finally { busy = false }
  }
  async function captureSession() {
    if (!available || disposed) fail('AUTH_REQUIRED')
    const value = grant(await credentials.readRecord(KEY))
    if (!value) fail('AUTH_REQUIRED')
    // Copy primitives: providers may retain and mutate their record object.
    const captured = { ...value }
    const identity = Object.freeze({ accountId: captured.accountId, origin: captured.origin, revision: captured.revision })
    let invalidated = false
    const resolveToken = async () => {
      const current = grant(await credentials.readRecord(KEY))
      if (invalidated || disposed || !current || current.revision !== captured.revision
        || current.origin !== captured.origin || current.token !== captured.token || current.accountId !== captured.accountId) {
        invalidated = true
        fail('REMOTE_RUNTIME_CHANGED')
      }
      return current.token
    }
    return Object.freeze({ identity, resolveToken })
  }
  return Object.freeze({
    status,
    sendSms: input => command('sms', input, async ({ phone }) => {
      if (now() < cooldownUntil) fail('SMS_COOLDOWN')
      cooldownUntil = now() + 60000 // Also throttle unknown/error results; never auto-resend.
      await request('/api/auth/send', { phone })
      return status()
    }),
    login: input => command('login', input, async ({ mode, phone, code, password }) => {
      if (!(await status()).writable) fail('ACCOUNT_UNAVAILABLE')
      const captured = grant(await credentials.readRecord(KEY))?.revision ?? null
      const data = await request(mode === 'sms' ? '/api/auth/login' : '/api/auth/pwdlogin',
        mode === 'sms' ? { phone, code } : { phone, password })
      const payload = { origin: OASIS_PRODUCT_ORIGIN, accountId: data?.id, token: data?.token, revision: randomUUID() }
      if (!grant({ kind: 'grant', payload })) fail('ACCOUNT_REQUEST_FAILED')
      await credentials.modifyRecord(KEY, current => {
        if (disposed || (grant(current)?.revision ?? null) !== captured) fail('REMOTE_RUNTIME_CHANGED')
        return { kind: 'grant', payload }
      })
      return status()
    }),
    logout: input => command('logout', input, async () => { await credentials.deleteRecord(KEY); return status() }),
    captureSession,
    async captureToken() { return (await captureSession()).resolveToken },
    dispose() { disposed = true; for (const controller of controllers) controller.abort() },
  })
}
