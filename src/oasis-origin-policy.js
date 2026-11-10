export const OASIS_PRODUCTION_HOSTNAME = 'lzhxpy.oasisintwrite.com'

function canonicalHostname(url) {
  return url.hostname.toLocaleLowerCase('en-US').replace(/\.+$/u, '')
}

function normalizeHttpOrigin(value, label) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new TypeError(`${label} must be an absolute HTTP(S) origin`)
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError(`${label} must use HTTP(S)`)
  if (url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) {
    throw new TypeError(`${label} must contain only an origin`)
  }
  url.hostname = canonicalHostname(url)
  return url
}

export function normalizeOasisOrigin(value, label = 'origin', environmentKind = 'non-production') {
  const url = normalizeHttpOrigin(value, label)
  if (!['non-production', 'production'].includes(environmentKind)) throw new TypeError('Unsupported Oasis environment')
  if (environmentKind === 'production') {
    if (url.origin !== `https://${OASIS_PRODUCTION_HOSTNAME}`) throw new TypeError('Production API must use the approved HTTPS origin')
  } else if (url.hostname === OASIS_PRODUCTION_HOSTNAME) {
    throw new TypeError('The Oasis production origin is forbidden')
  }
  return url.origin
}

export function normalizeOasisDownloadOrigin(value, label = 'download origin', environmentKind = 'non-production') {
  if (environmentKind === 'non-production') return normalizeOasisOrigin(value, label)
  if (environmentKind !== 'production') throw new TypeError('Unsupported Oasis environment')
  const url = normalizeHttpOrigin(value, label)
  if (url.protocol !== 'https:') throw new TypeError('Production files require HTTPS')
  return url.origin
}

export function isCanonicalOasisNonProductionOrigin(value) {
  try {
    return normalizeOasisOrigin(value) === value
  } catch {
    return false
  }
}

export function normalizeOasisFileUrl(value, environmentKind = 'non-production') {
  let url
  try {
    if (typeof value !== 'string' || value.length > 4096) throw new TypeError()
    url = new URL(value)
    normalizeOasisDownloadOrigin(url.origin, 'file origin', environmentKind)
    if (url.username || url.password || url.search || url.hash) throw new TypeError()
  } catch {
    throw new TypeError('Remote file URL must satisfy the environment policy without credentials, query or fragment (non-production by default)')
  }
  return url.href
}

export function isCanonicalOasisOrigin(value, environmentKind = 'non-production') {
  try { return normalizeOasisOrigin(value, 'origin', environmentKind) === value } catch { return false }
}

export function isSafeOasisFileUrl(value, environmentKind = 'non-production') {
  try {
    normalizeOasisFileUrl(value, environmentKind)
    return true
  } catch {
    return false
  }
}
