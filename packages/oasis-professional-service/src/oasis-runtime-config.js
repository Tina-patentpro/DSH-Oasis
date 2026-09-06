import { credentialRef } from '@deepseek-ai/dsh-credentials'
import z from '@deepseek-ai/schemastery'

import { normalizeOasisOrigin } from './oasis-origin-policy.js'

const DEFAULT_CREDENTIAL_REF = 'OASIS_USER_JWT'

export const OASIS_SETTINGS_NAMESPACE = 'oasis-professional-service'
export const OASIS_SETTINGS_SCHEMA = z.object({
  environmentKind: z.const('non-production').default('non-production'),
  apiBaseUrl: z.string().default(''),
  credentialRef: z.string().default(DEFAULT_CREDENTIAL_REF),
  downloadOrigins: z.array(z.string()).default([]),
})

export function normalizeOasisRuntimeConfig(input = {}) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Oasis runtime config must be an object')
  }
  const environmentKind = input.environmentKind ?? 'non-production'
  if (environmentKind !== 'non-production') throw new TypeError('Only non-production Oasis environments are supported')
  const rawBaseUrl = input.apiBaseUrl ?? ''
  const apiBaseUrl = rawBaseUrl === '' ? null : normalizeOasisOrigin(rawBaseUrl, 'apiBaseUrl')
  const credentialName = input.credentialRef ?? DEFAULT_CREDENTIAL_REF
  credentialRef(credentialName)
  const rawDownloads = input.downloadOrigins ?? []
  if (!Array.isArray(rawDownloads)) throw new TypeError('downloadOrigins must be an array')
  const downloadOrigins = [...new Set(rawDownloads.map((value) => normalizeOasisOrigin(value, 'downloadOrigins entry')))]
  return Object.freeze({
    environmentKind,
    apiBaseUrl,
    credentialRef: credentialName,
    downloadOrigins: Object.freeze(downloadOrigins),
    remoteEnabled: apiBaseUrl !== null,
  })
}

export function registerOasisSettings(ctx, base = {}) {
  if (typeof ctx?.settings?.register !== 'function') throw new TypeError('ctx.settings.register is required')
  const entry = {
    environmentKind: 'non-production',
    apiBaseUrl: '',
    credentialRef: DEFAULT_CREDENTIAL_REF,
    downloadOrigins: [],
    ...base,
  }
  normalizeOasisRuntimeConfig(entry)
  return ctx.settings.register(OASIS_SETTINGS_NAMESPACE, OASIS_SETTINGS_SCHEMA, {
    base: entry,
    applies: 'restart',
    validate: normalizeOasisRuntimeConfig,
  })
}

export async function resolveOasisJwt(credentials, referenceName) {
  if (typeof credentials?.resolve !== 'function') throw new TypeError('ctx.credentials.resolve is required')
  const hit = await credentials.resolve(credentialRef(referenceName))
  if (!hit || typeof hit.value !== 'string' || hit.value.length === 0) {
    const error = new Error('Oasis JWT is not configured')
    error.code = 'AUTH_REQUIRED'
    throw error
  }
  return hit.value
}
