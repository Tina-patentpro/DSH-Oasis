import { createHash } from 'node:crypto'
import {
  lstat as nodeLstat,
  open as nodeOpen,
  realpath as nodeRealpath,
} from 'node:fs/promises'
import {
  basename,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
  win32,
} from 'node:path'

const DEFAULT_FILE_SYSTEM = Object.freeze({
  lstat: nodeLstat,
  open: nodeOpen,
  realpath: nodeRealpath,
})

const MEDIA_TYPES = Object.freeze({
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
})

const RESERVED_WINDOWS_STEM = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i

export class WorkspaceMaterialError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'WorkspaceMaterialError'
    this.code = code
    this.details = details
  }
}

function materialError(code, message, details) {
  return new WorkspaceMaterialError(code, message, details)
}

export function validateWorkspaceRelativePath(input) {
  if (typeof input !== 'string' || input.length === 0 || input.length > 1024) {
    throw materialError('INVALID_MATERIAL_PATH', 'Material path must be a bounded relative path')
  }
  if (input.includes('\0') || win32.isAbsolute(input) || win32.parse(input).root !== '' || input.startsWith('/')) {
    throw materialError('INVALID_MATERIAL_PATH', 'Material path must be a bounded relative path')
  }

  const segments = input.split(/[\\/]/)
  for (const segment of segments) {
    const stem = segment.split('.')[0].replace(/[ .]+$/, '')
    if (
      segment.length === 0
      || segment.length > 255
      || segment === '.'
      || segment === '..'
      || /[\x00-\x1f<>:"|?*]/.test(segment)
      || /[ .]$/.test(segment)
      || RESERVED_WINDOWS_STEM.test(stem)
    ) {
      throw materialError('INVALID_MATERIAL_PATH', 'Material path contains an unsafe Windows segment')
    }
  }
  return segments.join('\\')
}

function pathKey(value) {
  return resolve(value).toLocaleLowerCase('en-US')
}

function isWithinRoot(root, target) {
  const value = relative(root, target)
  return value === '' || (!isAbsolute(value) && value !== '..' && !value.startsWith(`..${sep}`))
}

function fingerprint(stat) {
  return [stat.dev, stat.ino, stat.mode, stat.size, stat.mtimeMs, stat.ctimeMs, stat.birthtimeMs].join(':')
}

function mapFileSystemError(error, fallbackCode = 'MATERIAL_IO_ERROR') {
  if (error instanceof WorkspaceMaterialError) return error
  if (error?.code === 'ENOENT') {
    return materialError('MATERIAL_NOT_FOUND', 'Material file was not found')
  }
  if (error?.code === 'EACCES' || error?.code === 'EPERM') {
    return materialError('MATERIAL_UNREADABLE', 'Material file is not readable')
  }
  return materialError(fallbackCode, 'Material file inspection failed', {
    systemCode: typeof error?.code === 'string' ? error.code : 'UNKNOWN',
  })
}

function validatePolicy(policy) {
  if (
    !policy
    || !Array.isArray(policy.acceptedExtensions)
    || !Number.isSafeInteger(policy.maxFileBytes)
    || policy.maxFileBytes <= 0
    || policy.contentReadMode !== 'metadata-only'
  ) {
    throw new TypeError('A bounded metadata-only material policy is required')
  }
  return new Set(policy.acceptedExtensions.map((extension) => extension.toLowerCase()))
}

async function resolveWorkspaceRoot(workspaceRegistry, fileSystem, workspaceId) {
  const workspace = workspaceRegistry.get(workspaceId)
  if (!workspace) throw materialError('UNKNOWN_WORKSPACE', 'Workspace is not registered')
  if (await workspace.status() !== 'ok') {
    throw materialError('WORKSPACE_MISSING', 'Workspace directory is currently missing')
  }
  try {
    const root = await fileSystem.realpath(workspace.path)
    const rootStat = await fileSystem.lstat(root)
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || pathKey(root) !== pathKey(workspace.path)) {
      throw materialError('WORKSPACE_ROOT_CHANGED', 'Workspace canonical root no longer matches its registration')
    }
    return root
  } catch (error) {
    if (error instanceof WorkspaceMaterialError) throw error
    if (error?.code === 'ENOENT') {
      throw materialError('WORKSPACE_MISSING', 'Workspace directory is currently missing')
    }
    throw mapFileSystemError(error, 'WORKSPACE_UNREADABLE')
  }
}

async function resolveMaterialFile(fileSystem, root, normalizedPath) {
  const segments = normalizedPath.split('\\')
  let current = root
  for (const [index, segment] of segments.entries()) {
    current = resolve(current, segment)
    if (!isWithinRoot(root, current)) {
      throw materialError('MATERIAL_OUTSIDE_WORKSPACE', 'Material path resolves outside the Workspace')
    }
    let stat
    let canonical
    try {
      stat = await fileSystem.lstat(current)
      canonical = await fileSystem.realpath(current)
    } catch (error) {
      throw mapFileSystemError(error)
    }
    if (stat.isSymbolicLink() || pathKey(canonical) !== pathKey(current)) {
      throw materialError('MATERIAL_REPARSE_POINT', 'Material path contains a redirecting reparse point')
    }
    if (!isWithinRoot(root, canonical)) {
      throw materialError('MATERIAL_OUTSIDE_WORKSPACE', 'Material path resolves outside the Workspace')
    }
    const finalSegment = index === segments.length - 1
    if (!finalSegment && !stat.isDirectory()) {
      throw materialError('MATERIAL_NOT_FOUND', 'Material parent path is not a directory')
    }
    if (finalSegment && !stat.isFile()) {
      throw materialError('MATERIAL_NOT_FILE', 'Material path must name a regular file')
    }
  }
  return current
}

async function streamSha256(handle, maxFileBytes) {
  const hash = createHash('sha256')
  let bytesRead = 0
  for await (const chunk of handle.createReadStream({
    autoClose: false,
    start: 0,
    end: maxFileBytes,
  })) {
    bytesRead += chunk.byteLength
    if (bytesRead > maxFileBytes) {
      throw materialError('MATERIAL_TOO_LARGE', 'Material file exceeds the configured size limit')
    }
    hash.update(chunk)
  }
  return hash.digest('hex')
}

export function createWorkspaceMaterialManager({
  workspaceRegistry,
  clock = () => new Date().toISOString(),
  fileSystem = DEFAULT_FILE_SYSTEM,
} = {}) {
  if (!workspaceRegistry || typeof workspaceRegistry.get !== 'function') {
    throw new TypeError('workspaceRegistry.get is required')
  }
  for (const method of ['lstat', 'open', 'realpath']) {
    if (typeof fileSystem?.[method] !== 'function') throw new TypeError(`fileSystem.${method} is required`)
  }

  async function inspect(workspaceId, inputPath, policy, expectedAbsolutePath) {
    const acceptedExtensions = validatePolicy(policy)
    const normalizedPath = validateWorkspaceRelativePath(inputPath)
    const root = await resolveWorkspaceRoot(workspaceRegistry, fileSystem, workspaceId)
    const absolutePath = await resolveMaterialFile(fileSystem, root, normalizedPath)
    // Saved-file callers must hash the same canonical file they located, even if a root binding moves back.
    // Keep the three-argument material API and its persisted evidence shape unchanged.
    if (expectedAbsolutePath !== undefined && absolutePath !== expectedAbsolutePath) {
      throw materialError('WORKSPACE_ROOT_CHANGED', 'Workspace root changed during saved file inspection')
    }
    const extension = extname(normalizedPath).toLowerCase()
    if (!acceptedExtensions.has(extension) || !(extension in MEDIA_TYPES)) {
      throw materialError('UNSUPPORTED_MATERIAL_TYPE', 'Material file type is not supported')
    }
    let handle
    try {
      handle = await fileSystem.open(absolutePath, 'r')
      const before = await handle.stat()
      if (!before.isFile()) throw materialError('MATERIAL_NOT_FILE', 'Material path must name a regular file')
      if (before.size > policy.maxFileBytes) {
        throw materialError('MATERIAL_TOO_LARGE', 'Material file exceeds the configured size limit')
      }
      const sha256 = await streamSha256(handle, policy.maxFileBytes)
      const after = await handle.stat()
      if (fingerprint(before) !== fingerprint(after)) {
        throw materialError('MATERIAL_CHANGED', 'Material changed while it was being inspected')
      }
      await handle.close()
      handle = undefined

      const pathStat = await fileSystem.lstat(absolutePath)
      const pathCanonical = await fileSystem.realpath(absolutePath)
      if (
        pathStat.isSymbolicLink()
        || pathKey(pathCanonical) !== pathKey(absolutePath)
        || fingerprint(after) !== fingerprint(pathStat)
      ) {
        throw materialError('MATERIAL_CHANGED', 'Material changed while it was being inspected')
      }

      return Object.freeze({
        relativePath: normalizedPath,
        displayName: basename(absolutePath),
        mediaType: MEDIA_TYPES[extension],
        sizeBytes: before.size,
        sha256,
        observedAt: clock(),
      })
    } catch (error) {
      throw mapFileSystemError(error)
    } finally {
      await handle?.close().catch(() => {})
    }
  }

  async function confirm(workspaceId, relativePath, policy, referenceId, confirmedAt) {
    const evidence = await inspect(workspaceId, relativePath, policy)
    return Object.freeze({
      referenceId,
      kind: 'project-file',
      ...evidence,
      confirmedAt,
    })
  }

  async function recheck(workspaceId, reference, policy) {
    if (reference?.kind !== 'project-file') {
      throw materialError(
        'LEGACY_MATERIAL_REQUIRES_RECONFIRMATION',
        'Legacy material must be removed or confirmed again',
      )
    }
    const evidence = await inspect(workspaceId, reference.relativePath, policy)
    for (const field of ['relativePath', 'displayName', 'mediaType', 'sizeBytes', 'sha256']) {
      if (evidence[field] !== reference[field]) {
        throw materialError('MATERIAL_CHANGED', 'Confirmed material evidence no longer matches the file')
      }
    }
    return Object.freeze({
      ...reference,
      ...evidence,
      referenceId: reference.referenceId,
      kind: 'project-file',
      confirmedAt: reference.confirmedAt,
    })
  }

  async function refresh(workspaceId, reference, policy) {
    if (reference?.kind !== 'project-file') {
      throw materialError(
        'LEGACY_MATERIAL_REQUIRES_RECONFIRMATION',
        'Legacy material must be removed or confirmed again',
      )
    }
    const evidence = await inspect(workspaceId, reference.relativePath, policy)
    return Object.freeze({
      ...reference,
      ...evidence,
      referenceId: reference.referenceId,
      kind: 'project-file',
      confirmedAt: reference.confirmedAt,
    })
  }

  async function recheckAll(workspaceId, references, policy) {
    const checked = []
    for (const reference of references) checked.push(await recheck(workspaceId, reference, policy))
    return Object.freeze(checked)
  }

  async function readForUpload(workspaceId, reference, policy) {
    if (reference?.kind !== 'project-file') {
      throw materialError(
        'LEGACY_MATERIAL_REQUIRES_RECONFIRMATION',
        'Legacy material must be removed or confirmed again',
      )
    }
    const acceptedExtensions = validatePolicy(policy)
    const normalizedPath = validateWorkspaceRelativePath(reference.relativePath)
    const extension = extname(normalizedPath).toLowerCase()
    if (!acceptedExtensions.has(extension) || !(extension in MEDIA_TYPES)) {
      throw materialError('UNSUPPORTED_MATERIAL_TYPE', 'Material file type is not supported')
    }
    const root = await resolveWorkspaceRoot(workspaceRegistry, fileSystem, workspaceId)
    const absolutePath = await resolveMaterialFile(fileSystem, root, normalizedPath)
    let handle
    try {
      handle = await fileSystem.open(absolutePath, 'r')
      if (typeof handle.readFile !== 'function') throw new TypeError('fileSystem.open handle.readFile is required for upload')
      const before = await handle.stat()
      if (!before.isFile()) throw materialError('MATERIAL_NOT_FILE', 'Material path must name a regular file')
      if (before.size > policy.maxFileBytes) {
        throw materialError('MATERIAL_TOO_LARGE', 'Material file exceeds the configured size limit')
      }
      const bytes = await handle.readFile()
      if (bytes.byteLength > policy.maxFileBytes) {
        throw materialError('MATERIAL_TOO_LARGE', 'Material file exceeds the configured size limit')
      }
      const after = await handle.stat()
      if (fingerprint(before) !== fingerprint(after)) {
        throw materialError('MATERIAL_CHANGED', 'Material changed while it was being read for upload')
      }
      const sha256 = createHash('sha256').update(bytes).digest('hex')
      if (
        normalizedPath !== reference.relativePath
        || basename(absolutePath) !== reference.displayName
        || MEDIA_TYPES[extension] !== reference.mediaType
        || before.size !== reference.sizeBytes
        || sha256 !== reference.sha256
      ) {
        throw materialError('MATERIAL_CHANGED', 'Confirmed material evidence no longer matches the file')
      }
      await handle.close()
      handle = undefined

      const pathStat = await fileSystem.lstat(absolutePath)
      const pathCanonical = await fileSystem.realpath(absolutePath)
      if (
        pathStat.isSymbolicLink()
        || pathKey(pathCanonical) !== pathKey(absolutePath)
        || fingerprint(after) !== fingerprint(pathStat)
      ) {
        throw materialError('MATERIAL_CHANGED', 'Material changed after it was read for upload')
      }
      return {
        bytes: Uint8Array.from(bytes),
        fileName: reference.displayName,
        mediaType: reference.mediaType,
        sha256,
      }
    } catch (error) {
      throw mapFileSystemError(error)
    } finally {
      await handle?.close().catch(() => {})
    }
  }

  return Object.freeze({ confirm, inspect, readForUpload, recheck, recheckAll, refresh })
}
