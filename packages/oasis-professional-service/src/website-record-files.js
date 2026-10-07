import { OASIS_PRODUCT_ORIGIN } from './oasis-account-contract.js'
import { IMPORT_LIMITS } from './website-import-contract.js'
import { validateWorkspaceRelativePath } from './workspace-materials.js'

const object = value => value && typeof value === 'object' && !Array.isArray(value)
const own = (value, ...keys) => keys.find(key => Object.hasOwn(value, key) && value[key] != null
  && (typeof value[key] !== 'string' || value[key].trim() !== ''))
const field = (value, ...keys) => { const key = own(value, ...keys); return key === undefined ? undefined : value[key] }
const fail = () => { throw Object.assign(new Error('IMPORT_TOO_MANY_ITEMS'), { code: 'IMPORT_TOO_MANY_ITEMS' }) }
export function safeImportName(value) {
  try {
    if (typeof value !== 'string' || /[\\/]/.test(value) || !value || value.length > 255) return null
    validateWorkspaceRelativePath(value)
    return value
  } catch { return null }
}
export function canonicalWebsiteFileUrl(value) {
  try {
    if (typeof value !== 'string' || !value.trim() || value.length > 4096 || /[\x00-\x20\\]/.test(value.replace(/ /g, ''))) return null
    if (!value.startsWith('/') && !value.startsWith('https://')) return null
    const url = new URL(value, OASIS_PRODUCT_ORIGIN)
    if (url.origin !== OASIS_PRODUCT_ORIGIN || url.username || url.password || url.hash || !/^\/(?:uploads|storage|files)\//.test(url.pathname)) return null
    const decoded = decodeURIComponent(url.pathname)
    if (!/^\/(?:uploads|storage|files)\//.test(decoded) || decoded.split('/').some(part => ['.', '..'].includes(part)) || /[\\\x00-\x1f]/.test(decoded)) return null
    return url.href
  } catch { return null }
}

export function extractWebsiteRecordFiles(record) {
  const files = [], unsupported = [], identities = new Set(), metadata = new Map(), conflicts = new Set()
  let candidates = 0
  const count = () => { if (++candidates > IMPORT_LIMITS.listItems) fail() }
  const reject = (role, inputField, reason) => { count(); unsupported.push({ role, inputField, reason }) }
  function parsed(value, role, inputField) {
    if (typeof value !== 'string') return value
    try { return JSON.parse(value) } catch { reject(role, inputField, '文件结构不是有效 JSON'); return undefined }
  }
  function add(value, role, inputField, rawUrl) {
    count()
    const url = canonicalWebsiteFileUrl(rawUrl)
    let basename
    try { basename = url && decodeURIComponent(new URL(url).pathname.split('/').at(-1)) } catch {}
    const explicitName = field(value, 'filename', 'file_name', 'fileName', 'name')
    const fileName = safeImportName(explicitName ?? basename)
    const sizeValue = field(value, 'size', 'file_size', 'fileSize')
    const size = sizeValue == null ? null : Number.isSafeInteger(sizeValue) && sizeValue >= 0 ? sizeValue : undefined
    const mime = field(value, 'mime_type', 'mimeType', 'content_type', 'contentType', 'mime')
    const mimeType = mime == null ? null : typeof mime === 'string' && mime.length <= 200 ? mime : undefined
    if (!url || !fileName || size === undefined || mimeType === undefined || (size != null && size > IMPORT_LIMITS.fileBytes)) {
      unsupported.push({ role, inputField, reason: '地址、文件名、类型或大小不符合安全下载合同' }); return
    }
    const identity = JSON.stringify([role, inputField, url])
    if (conflicts.has(identity)) return
    if (identities.has(identity)) {
      const previous = files.find(f => f.role === role && f.inputField === inputField && f.url === url)
      const explicit = metadata.get(identity)
      if (explicit.name && explicitName != null && previous.fileName !== fileName
        || previous.size != null && size != null && previous.size !== size
        || previous.mimeType != null && mimeType != null && previous.mimeType !== mimeType) {
        files.splice(files.indexOf(previous), 1); conflicts.add(identity)
        unsupported.push({ role, inputField, reason: '同址附件元数据冲突，不能确认唯一文件' })
      } else {
        if (!explicit.name && explicitName != null) { previous.fileName = fileName; explicit.name = true }
        if (previous.size == null) previous.size = size
        if (previous.mimeType == null) previous.mimeType = mimeType
      }
      return
    }
    identities.add(identity)
    metadata.set(identity, { name: explicitName != null })
    files.push({ role, inputField, url, fileName, size, mimeType })
  }
  function input(value, inputField, role = 'input', nested = false) {
    if (inputField != null && inputField.length > 2000) { reject(role, null, '材料字段名超过来源清单限制'); return }
    if (Array.isArray(value)) {
      if (nested) { reject(role, inputField, '嵌套材料数组不受支持'); return }
      for (const item of value) input(item, inputField, role, true)
      return
    }
    if (!object(value)) return
    if (!Object.hasOwn(value, 'transfer_method') && !Object.hasOwn(value, 'type')) {
      reject(role, inputField, '未识别的材料对象'); return
    }
    if (!['document', 'image', 'audio', 'video', 'custom'].includes(value.type) || value.transfer_method !== 'remote_url') {
      reject(role, inputField, '材料仅含文件 ID 或类型/传输方式不受支持'); return
    }
    add(value, role, inputField, value.url)
  }
  function outputFile(value, nested = false) {
    if (Array.isArray(value)) {
      if (nested) { reject('output', null, '嵌套材料数组不受支持'); return }
      for (const item of value) outputFile(item, true)
      return
    }
    if (!object(value)) return
    if (!['document', 'image', 'audio', 'video', 'custom'].includes(value.type)
      || !['remote_url', 'tool_file'].includes(value.transfer_method)) {
      reject('output', null, '未识别的输出文件类型或传输方式'); return
    }
    add(value, 'output', null, field(value, 'download_url', 'downloadUrl', 'url', 'file_url', 'fileUrl', 'remote_url', 'remoteUrl'))
  }
  const inputs = parsed(record.inputs, 'input', null)
  if (inputs != null) {
    if (!object(inputs)) reject('input', null, 'inputs 必须为字段对象')
    else for (const [name, value] of Object.entries(inputs)) input(value, name)
  }
  function output(source) {
    let urls = field(source, 'file_url', 'fileUrl')
    if (urls == null) urls = []
    else if (typeof urls === 'string') urls = [urls]
    if (!Array.isArray(urls)) { reject('output', null, '附件地址列表格式不受支持'); urls = [] }
    // Keep null/empty slots: positional URLs belong to the same file_output index.
    const positions = []
    for (const value of urls) {
      if (value == null || value === '') positions.push(null)
      else if (typeof value === 'string') positions.push(...value.split(/,(?=\s*(?:https?:\/\/|\/))/g).map(v => v.trim() || null))
      else { positions.push(null); reject('output', null, '附件地址项必须为字符串') }
      if (positions.length > IMPORT_LIMITS.listItems) fail()
    }
    const consumed = new Set()
    let outputs = parsed(field(source, 'file_output', 'fileOutput'), 'output', null)
    if (outputs != null) {
      if (object(outputs)) outputs = [outputs]
      if (!Array.isArray(outputs)) reject('output', null, '附件对象列表格式不受支持')
      else outputs.forEach((value, index) => {
        if (!object(value)) { reject('output', null, '附件对象格式不受支持'); return }
        const explicit = field(value, 'download_url', 'downloadUrl')
        const raw = explicit ?? positions[index] ?? field(value, 'url', 'file_url', 'fileUrl', 'remote_url', 'remoteUrl')
        add(value, 'output', null, raw)
        if (positions[index] != null && (explicit == null || canonicalWebsiteFileUrl(explicit) === canonicalWebsiteFileUrl(positions[index]))) consumed.add(index)
      })
    }
    positions.forEach((url, index) => { if (url && !consumed.has(index)) add({}, 'output', null, url) })
  }
  output(record)
  for (const name of ['response', 'output', 'outputs']) {
    if (!Object.hasOwn(record, name) || record[name] == null || record[name] === '') continue
    const source = parsed(record[name], 'output', null)
    if (!object(source)) { if (source !== undefined) reject('output', null, '响应文件结构不受支持'); continue }
    // Only known wrappers, not arbitrary recursive discovery.
    const fileMarked = value => object(value) && (Object.hasOwn(value, 'type') || Object.hasOwn(value, 'transfer_method'))
      && (Object.hasOwn(value, 'type') && Object.hasOwn(value, 'transfer_method')
        || ['download_url', 'downloadUrl', 'url', 'file_url', 'fileUrl', 'remote_url', 'remoteUrl'].some(key => Object.hasOwn(value, key)))
    const layers = new Set([source]), outputLayers = new Set(name === 'outputs' ? [source] : [])
    if (name !== 'outputs') {
      if (object(source.data) && (!fileMarked(source.data) || object(source.data.outputs)
        || Object.hasOwn(source.data, 'file_output') || Object.hasOwn(source.data, 'fileOutput'))) layers.add(source.data)
      if (object(source.outputs)) {
        layers.add(source.outputs); outputLayers.add(source.outputs)
      }
      if (layers.has(source.data) && object(source.data.outputs)) {
        layers.add(source.data.outputs); outputLayers.add(source.data.outputs)
      }
    }
    for (const layer of layers) {
      output(layer)
      for (const [key, value] of Object.entries(layer)) {
        if (['data', 'outputs'].includes(key)) {
          if (layers.has(value)) continue
          if (outputLayers.has(layer) || fileMarked(value)) {
            if (object(value) || Array.isArray(value)) outputFile(value)
            continue
          }
          if (value != null && !(typeof value === 'string' && !value.trim()) && !layers.has(value)) reject('output', null, '响应包装结构不受支持')
          continue
        }
        if (['file_url', 'fileUrl', 'file_output', 'fileOutput', 'answer', 'answer_text', 'input', 'inputs'].includes(key)) continue
        if (object(value) || Array.isArray(value)) outputFile(value)
      }
    }
  }
  return { files, unsupported }
}
