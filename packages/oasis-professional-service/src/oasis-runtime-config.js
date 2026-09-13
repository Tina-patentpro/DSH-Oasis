import { credentialRef } from '@deepseek-ai/dsh-credentials'
import z from '@deepseek-ai/schemastery'

import { normalizeOasisOrigin, normalizeOasisDownloadOrigin } from './oasis-origin-policy.js'
import { normalizeGenerationPreferences } from './generation-preferences.js'

const DEFAULT_CREDENTIAL_REF = 'OASIS_USER_JWT'

export const OASIS_SETTINGS_NAMESPACE = 'oasis-professional-service'
export const OASIS_SETTINGS_SCHEMA = z.object({
  environmentKind: z.union([z.const('non-production'), z.const('production')]).default('non-production'),
  apiBaseUrl: z.string().default(''),
  credentialOrigin: z.string().default(''),
  credentialRef: z.string().default(DEFAULT_CREDENTIAL_REF),
  downloadOrigins: z.array(z.string()).default([]),
  defaultGenerationSource: z.string().default('local-skill'),
  outputDirectoryPrefix: z.string().default(''),
  localModelEnabled: z.boolean().default(false),
})

export function normalizeOasisRuntimeConfig(input = {}) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Oasis runtime config must be an object')
  }
  normalizeGenerationPreferences(input)
  const localModelEnabled = input.localModelEnabled ?? false
  if (typeof localModelEnabled !== 'boolean') throw new TypeError('localModelEnabled must be boolean')
  const environmentKind = input.environmentKind ?? 'non-production'
  if (!['non-production', 'production'].includes(environmentKind)) throw new TypeError('Unsupported Oasis environment')
  const rawBaseUrl = input.apiBaseUrl ?? ''
  const apiBaseUrl = rawBaseUrl === '' ? null : normalizeOasisOrigin(rawBaseUrl, 'apiBaseUrl', environmentKind)
  const rawCredentialOrigin = input.credentialOrigin ?? ''
  const credentialOrigin = rawCredentialOrigin === ''
    ? null
    : normalizeOasisOrigin(rawCredentialOrigin, 'credentialOrigin', environmentKind)
  const credentialName = input.credentialRef ?? DEFAULT_CREDENTIAL_REF
  credentialRef(credentialName)
  const rawDownloads = input.downloadOrigins ?? []
  if (!Array.isArray(rawDownloads)) throw new TypeError('downloadOrigins must be an array')
  const downloadOrigins = [...new Set(rawDownloads.map((value) => normalizeOasisDownloadOrigin(value, 'downloadOrigins entry', environmentKind)))]
  return Object.freeze({
    localModelEnabled,
    environmentKind,
    apiBaseUrl,
    credentialOrigin,
    credentialRef: credentialName,
    downloadOrigins: Object.freeze(downloadOrigins),
    credentialBound: apiBaseUrl !== null && credentialOrigin === apiBaseUrl,
    remoteEnabled: apiBaseUrl !== null,
  })
}

export function registerOasisSettings(ctx, base = {}) {
  if (typeof ctx?.settings?.register !== 'function') throw new TypeError('ctx.settings.register is required')
  const entry = {
    environmentKind: 'non-production',
    apiBaseUrl: '',
    credentialOrigin: '',
    credentialRef: DEFAULT_CREDENTIAL_REF,
    downloadOrigins: [],
    defaultGenerationSource: 'local-skill',
    outputDirectoryPrefix: '',
    localModelEnabled: false,
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
