export const OASIS_PRODUCTION_HOSTNAME = 'lzhxpy.oasisintwrite.com'

function canonicalHostname(url) {
  return url.hostname.toLocaleLowerCase('en-US').replace(/\.+$/u, '')
}

export function normalizeOasisOrigin(value, label = 'origin') {
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
  const hostname = canonicalHostname(url)
  if (hostname === OASIS_PRODUCTION_HOSTNAME) {
    throw new TypeError('The Oasis production origin is forbidden')
  }
  url.hostname = hostname
  return url.origin
}

export function isCanonicalOasisNonProductionOrigin(value) {
  try {
    return normalizeOasisOrigin(value) === value
  } catch {
    return false
  }
}

export function normalizeOasisFileUrl(value) {
  let url
  try {
    if (typeof value !== 'string' || value.length > 4096) throw new TypeError()
    url = new URL(value)
    normalizeOasisOrigin(url.origin)
    if (url.username || url.password || url.search || url.hash) throw new TypeError()
  } catch {
    throw new TypeError('Remote file URL must be a non-production HTTP(S) URL without credentials, query or fragment')
  }
  return url.href
}

export function isSafeOasisFileUrl(value) {
  try {
    normalizeOasisFileUrl(value)
    return true
  } catch {
    return false
  }
}
