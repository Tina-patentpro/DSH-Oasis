// C4 bounded JSON primitives shared by storage shape checks and the Node consumer.
export const FAST39_LIMITS = Object.freeze({ outputUtf16: 100000, outputBytes: 262144,
  evidenceBytes: 524288, packetBytes: 1048576, sourceCoordinate: 1048576,
  depth: 8, arrayItems: 1024, objectKeys: 256 })
const encoder = new TextEncoder()
function fail(code = 'FAST39_RESULT_FIELDS_INVALID') {
  throw Object.assign(new Error('Fast39 JSON不符合完整性要求。'), { code })
}
function need(value, code) { if (!value) fail(code) }
export function assertFast39Text(value) {
  need(typeof value === 'string' && value.isWellFormed() && !value.includes('\0'))
  return value
}
function scalarCompare(a, b) {
  const aa = Array.from(a, c => c.codePointAt(0)), bb = Array.from(b, c => c.codePointAt(0))
  for (let i = 0; i < Math.min(aa.length, bb.length); i++) if (aa[i] !== bb[i]) return aa[i] - bb[i]
  return aa.length - bb.length
}
export function assertFast39Json(value, depth = 0, parents = new Set()) {
  if (typeof value === 'string') { assertFast39Text(value); return }
  if (value === null || typeof value === 'boolean') return
  if (typeof value === 'number') { need(Number.isSafeInteger(value)); return }
  need(typeof value === 'object' && !parents.has(value))
  need(depth <= FAST39_LIMITS.depth, 'FAST39_RESULT_TOO_LARGE')
  const array = Array.isArray(value)
  need(array || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  const keys = Object.keys(value)
  need(keys.length <= (array ? FAST39_LIMITS.arrayItems : FAST39_LIMITS.objectKeys), 'FAST39_RESULT_TOO_LARGE')
  if (array) need(keys.length === value.length && keys.every((key, i) => key === String(i)))
  parents.add(value)
  for (const key of keys) { assertFast39Text(key); assertFast39Json(value[key], depth + 1, parents) }
  parents.delete(value)
}

// Manual key emission also avoids JSON.stringify's reordering of integer-like keys.
export function fast39CanonicalJson(value) {
  assertFast39Json(value)
  const emit = v => v === null || typeof v !== 'object' ? JSON.stringify(v)
    : Array.isArray(v) ? '[' + v.map(emit).join(',') + ']'
      : '{' + Object.keys(v).sort(scalarCompare).map(k => JSON.stringify(k) + ':' + emit(v[k])).join(',') + '}'
  return emit(value)
}
// JSON.parse alone silently overwrites duplicate keys, including escaped aliases.
// This bounded parser is exclusively for the C4 integer-only JSON structures.
export function parseFast39Json(text, maxBytes = FAST39_LIMITS.outputBytes) {
  assertFast39Text(text)
  need(encoder.encode(text).byteLength <= maxBytes, 'FAST39_RESULT_TOO_LARGE')
  let i = 0
  const space = () => { while (/[\t\n\r ]/.test(text[i] ?? '') && i < text.length) i++ }
  function string() {
    const begin = i++
    let closed = false
    while (i < text.length) {
      const c = text[i++]
      if (c === '\\') { i++; continue }
      if (c === '"') { closed = true; break }
    }
    need(closed)
    try { return assertFast39Text(JSON.parse(text.slice(begin, i))) } catch { fail() }
  }
  function value(depth = 0) {
    space()
    const c = text[i]
    if (c === '"') return string()
    if (c === '{' || c === '[') {
      need(depth <= FAST39_LIMITS.depth, 'FAST39_RESULT_TOO_LARGE')
      const array = c === '[', close = array ? ']' : '}', result = array ? [] : {}, seen = new Set()
      i++; space()
      if (text[i] === close) { i++; return result }
      for (;;) {
        space()
        let key
        if (!array) {
          need(text[i] === '"'); key = string(); need(!seen.has(key)); seen.add(key)
          space(); need(text[i++] === ':')
        }
        const item = value(depth + 1)
        if (array) result.push(item)
        else Object.defineProperty(result, key, { value: item, enumerable: true, configurable: true, writable: true })
        need((array ? result.length : seen.size) <= (array ? FAST39_LIMITS.arrayItems : FAST39_LIMITS.objectKeys), 'FAST39_RESULT_TOO_LARGE')
        space()
        if (text[i] === close) { i++; return result }
        need(text[i++] === ',')
      }
    }
    for (const [token, result] of [['true', true], ['false', false], ['null', null]]) {
      if (text.startsWith(token, i)) { i += token.length; return result }
    }
    const number = /^-?(?:0|[1-9][0-9]*)/.exec(text.slice(i))
    need(number); i += number[0].length
    need(!/[.eE]/.test(text[i] ?? ''))
    const result = Number(number[0]); need(Number.isSafeInteger(result)); return result
  }
  const result = value(); space(); need(i === text.length); assertFast39Json(result); return result
}

