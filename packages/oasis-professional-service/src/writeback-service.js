import { createHash, randomUUID } from 'node:crypto'
import {
  lstat as nodeLstat,
  mkdir as nodeMkdir,
  open as nodeOpen,
  readFile as nodeReadFile,
  realpath as nodeRealpath,
  rename as nodeRename,
  rmdir as nodeRmdir,
  unlink as nodeUnlink,
} from 'node:fs/promises'
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
  win32,
} from 'node:path'

import { WorkspaceMaterialError } from './workspace-materials.js'
import { isCanonicalOasisNonProductionOrigin, isSafeOasisFileUrl } from './oasis-origin-policy.js'

const DEFAULT_TOKEN_TTL_MS = 10 * 60 * 1000
const DEFAULT_MAX_TOKENS = 128
const SAFE_WINDOWS_PATH_LENGTH = 240
const RESERVED_WINDOWS_STEM = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i

const DEFAULT_FILE_SYSTEM = Object.freeze({
  lstat: nodeLstat,
  mkdir: nodeMkdir,
  open: nodeOpen,
  readFile: nodeReadFile,
  realpath: nodeRealpath,
  rename: nodeRename,
  rmdir: nodeRmdir,
  unlink: nodeUnlink,
})

function writebackError(code, message, details = {}) {
  return new WorkspaceMaterialError(code, message, details)
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function pathKey(value) {
  return resolve(value).toLocaleLowerCase('en-US')
}

function isWithinRoot(root, target) {
  const value = relative(root, target)
  return value === '' || (!isAbsolute(value) && value !== '..' && !value.startsWith(`..${sep}`))
}

function validateSafeSegment(segment, code = 'INVALID_WRITEBACK_PATH') {
  const stem = segment.split('.')[0].replace(/[ .]+$/, '')
  if (
    typeof segment !== 'string'
    || segment.length === 0
    || segment.length > 255
    || segment === '.'
    || segment === '..'
    || /[\x00-\x1f<>:"|?*]/.test(segment)
    || /[ .]$/.test(segment)
    || RESERVED_WINDOWS_STEM.test(stem)
  ) {
    throw writebackError(code, 'Writeback path contains an unsafe Windows segment')
  }
  return segment
}

export function validateWritebackRelativeDirectory(input) {
  if (
    typeof input !== 'string'
    || input.length === 0
    || input.length > 1024
    || input.includes('\0')
    || win32.isAbsolute(input)
    || win32.parse(input).root !== ''
    || input.startsWith('/')
  ) {
    throw writebackError('INVALID_WRITEBACK_PATH', 'Writeback target must be a bounded relative directory')
  }
  const segments = input.split(/[\\/]/)
  for (const segment of segments) validateSafeSegment(segment)
  return segments.join('\\')
}

function validateArtifact(artifact) {
  if (
    !artifact
    || typeof artifact.body !== 'string'
    || typeof artifact.sha256 !== 'string'
    || artifact.sha256 !== sha256(artifact.body)
    || artifact.artifactId !== `sha256:${artifact.sha256}`
    || artifact.mediaType !== 'text/markdown'
    || typeof artifact.suggestedFileName !== 'string'
  ) {
    throw writebackError('WRITEBACK_ARTIFACT_INVALID', 'Writeback artifact is not internally consistent')
  }
  validateSafeSegment(artifact.suggestedFileName, 'WRITEBACK_ARTIFACT_INVALID')
  if (!artifact.suggestedFileName.toLocaleLowerCase('en-US').endsWith('.md')) {
    throw writebackError('WRITEBACK_ARTIFACT_INVALID', 'Writeback artifact must use a Markdown file name')
  }
}

async function resolveWorkspaceRoot(workspaceRegistry, fileSystem, workspaceId) {
  const workspace = workspaceRegistry.get(workspaceId)
  if (!workspace) throw writebackError('UNKNOWN_WORKSPACE', 'Workspace is not registered')
  if (await workspace.status() !== 'ok') {
    throw writebackError('WORKSPACE_MISSING', 'Workspace directory is currently missing')
  }
  try {
    const root = await fileSystem.realpath(workspace.path)
    const rootStat = await fileSystem.lstat(root)
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || pathKey(root) !== pathKey(workspace.path)) {
      throw writebackError('WORKSPACE_ROOT_CHANGED', 'Workspace canonical root no longer matches its registration')
    }
    return root
  } catch (error) {
    if (error instanceof WorkspaceMaterialError) throw error
    if (error?.code === 'ENOENT') throw writebackError('WORKSPACE_MISSING', 'Workspace directory is currently missing')
    throw writebackError('WORKSPACE_UNREADABLE', 'Workspace directory cannot be inspected', {
      systemCode: typeof error?.code === 'string' ? error.code : 'UNKNOWN',
    })
  }
}

async function resolveSafeNewTarget(fileSystem, root, normalizedDirectory) {
  const segments = normalizedDirectory.split('\\')
  let current = root
  for (const segment of segments.slice(0, -1)) {
    current = resolve(current, segment)
    if (!isWithinRoot(root, current)) {
      throw writebackError('WRITEBACK_OUTSIDE_WORKSPACE', 'Writeback parent resolves outside the Workspace')
    }
    let currentStat
    let canonical
    try {
      currentStat = await fileSystem.lstat(current)
      canonical = await fileSystem.realpath(current)
    } catch (error) {
      if (error?.code === 'ENOENT') {
        throw writebackError('WRITEBACK_PARENT_MISSING', 'Writeback parent directory does not exist')
      }
      throw writebackError('WRITEBACK_PARENT_UNREADABLE', 'Writeback parent directory cannot be inspected', {
        systemCode: typeof error?.code === 'string' ? error.code : 'UNKNOWN',
      })
    }
    if (currentStat.isSymbolicLink() || pathKey(canonical) !== pathKey(current)) {
      throw writebackError('WRITEBACK_REPARSE_POINT', 'Writeback parent contains a redirecting reparse point')
    }
    if (!currentStat.isDirectory()) {
      throw writebackError('WRITEBACK_PARENT_MISSING', 'Writeback parent path is not a directory')
    }
    if (!isWithinRoot(root, canonical)) {
      throw writebackError('WRITEBACK_OUTSIDE_WORKSPACE', 'Writeback parent resolves outside the Workspace')
    }
  }

  const target = resolve(current, segments.at(-1))
  if (!isWithinRoot(root, target)) {
    throw writebackError('WRITEBACK_OUTSIDE_WORKSPACE', 'Writeback target resolves outside the Workspace')
  }
  try {
    await fileSystem.lstat(target)
    throw writebackError('WRITEBACK_TARGET_EXISTS', 'Writeback target already exists')
  } catch (error) {
    if (error instanceof WorkspaceMaterialError) throw error
    if (error?.code !== 'ENOENT') {
      throw writebackError('WRITEBACK_TARGET_UNREADABLE', 'Writeback target cannot be inspected', {
        systemCode: typeof error?.code === 'string' ? error.code : 'UNKNOWN',
      })
    }
  }
  return target
}

function createMetadata(input, artifactSizeBytes) {
  const common = {
    schemaVersion: 1,
    workspace: { workspaceId: input.workspaceId },
    task: { taskId: input.taskId },
    run: { runId: input.runId },
    input: { sha256: input.inputSha256 },
    artifact: {
      artifactId: input.artifact.artifactId,
      fileName: input.artifact.suggestedFileName,
      mediaType: input.artifact.mediaType,
      sizeBytes: artifactSizeBytes,
      sha256: input.artifact.sha256,
    },
    review: { status: input.reviewStatus },
  }
  if (input.mode === 'local-mock') {
    return Object.freeze({
      ...common,
      workflow: { workflowId: input.workflowId, workflowVersion: input.workflowVersion },
      execution: { mode: input.mode, mockVersion: input.mockVersion },
    })
  }
  if (input.mode === 'oasis-legacy') {
    const remote = input.remote
    if (
      !remote
      || typeof remote.executionId !== 'string'
      || !/^[a-f0-9]{64}$/.test(remote.requestKeySha256)
      || typeof remote.provider?.apiBaseOrigin !== 'string'
      || !isCanonicalOasisNonProductionOrigin(remote.provider.apiBaseOrigin)
      || !Number.isSafeInteger(remote.provider?.apiId)
      || typeof remote.provider?.apiEndpoint !== 'string'
      || typeof remote.provider?.apiProcess !== 'string'
      || !Number.isSafeInteger(remote.provider?.folderId)
      || remote.files?.status !== 'undownloaded-unverified'
      || !Array.isArray(remote.files?.urls)
      || remote.files.urls.some((value) => !isSafeOasisFileUrl(value))
    ) {
      throw writebackError('WRITEBACK_SOURCE_INVALID', 'Remote writeback source is incomplete or unsafe')
    }
    return Object.freeze({
      ...common,
      execution: {
        mode: input.mode,
        executionId: remote.executionId,
        requestKeySha256: remote.requestKeySha256,
      },
      provider: {
        apiBaseOrigin: remote.provider.apiBaseOrigin,
        apiId: remote.provider.apiId,
        apiEndpoint: remote.provider.apiEndpoint,
        apiProcess: remote.provider.apiProcess,
        folderId: remote.provider.folderId,
      },
      remoteFiles: { status: remote.files.status, urls: [...remote.files.urls] },
    })
  }
  throw writebackError('WRITEBACK_SOURCE_INVALID', 'Writeback execution mode is unsupported')
}

function assertManagerOptions({
  workspaceRegistry,
  clock,
  idFactory,
  tokenFactory,
  stageIdFactory,
  tokenTtlMs,
  maxTokens,
  fileSystem,
}) {
  if (!workspaceRegistry || typeof workspaceRegistry.get !== 'function') {
    throw new TypeError('workspaceRegistry.get is required')
  }
  if (typeof clock !== 'function') throw new TypeError('clock is required')
  if (typeof idFactory !== 'function') throw new TypeError('idFactory is required')
  if (typeof tokenFactory !== 'function') throw new TypeError('tokenFactory is required')
  if (typeof stageIdFactory !== 'function') throw new TypeError('stageIdFactory is required')
  if (!Number.isSafeInteger(tokenTtlMs) || tokenTtlMs <= 0) throw new TypeError('tokenTtlMs is invalid')
  if (!Number.isSafeInteger(maxTokens) || maxTokens <= 0) throw new TypeError('maxTokens is invalid')
  for (const method of ['lstat', 'mkdir', 'open', 'readFile', 'realpath', 'rename', 'rmdir', 'unlink']) {
    if (typeof fileSystem?.[method] !== 'function') throw new TypeError(`fileSystem.${method} is required`)
  }
}

export function createWritebackManager({
  workspaceRegistry,
  clock = () => new Date().toISOString(),
  idFactory = () => `writeback-${randomUUID()}`,
  tokenFactory = () => randomUUID(),
  stageIdFactory = () => randomUUID(),
  tokenTtlMs = DEFAULT_TOKEN_TTL_MS,
  maxTokens = DEFAULT_MAX_TOKENS,
  fileSystem = DEFAULT_FILE_SYSTEM,
} = {}) {
  assertManagerOptions({
    workspaceRegistry,
    clock,
    idFactory,
    tokenFactory,
    stageIdFactory,
    tokenTtlMs,
    maxTokens,
    fileSystem,
  })
  const tokens = new Map()
  const consumedPlans = new WeakSet()
  const startedPlans = new WeakSet()
  const targetLocks = new Map()

  function nowMilliseconds() {
    const value = Date.parse(clock())
    if (!Number.isFinite(value)) throw new TypeError('clock must return an ISO timestamp')
    return value
  }

  function cleanupExpired(now) {
    for (const [token, entry] of tokens) {
      if (entry.expiresAtMs <= now) tokens.delete(token)
    }
  }

  async function prepare(input) {
    if (input?.reviewStatus !== 'approved') {
      throw writebackError('WRITEBACK_REVIEW_REQUIRED', 'Writeback requires an approved run')
    }
    validateArtifact(input?.artifact)
    const relativeDirectory = validateWritebackRelativeDirectory(input?.relativeDirectory)
    const workspaceRoot = await resolveWorkspaceRoot(workspaceRegistry, fileSystem, input.workspaceId)
    const absoluteTarget = await resolveSafeNewTarget(fileSystem, workspaceRoot, relativeDirectory)
    const mainFileName = input.artifact.suggestedFileName
    const metadataFileName = `${mainFileName.slice(0, -3)}.oasis.json`
    validateSafeSegment(metadataFileName, 'WRITEBACK_ARTIFACT_INVALID')
    const absoluteMain = resolve(absoluteTarget, mainFileName)
    const absoluteMetadata = resolve(absoluteTarget, metadataFileName)
    if ([absoluteTarget, absoluteMain, absoluteMetadata].some((value) => value.length > SAFE_WINDOWS_PATH_LENGTH)) {
      throw writebackError('WRITEBACK_PATH_TOO_LONG', 'Writeback target exceeds the safe Windows path budget')
    }

    const artifactContent = input.artifact.body
    const artifactSizeBytes = Buffer.byteLength(artifactContent, 'utf8')
    const metadata = createMetadata(input, artifactSizeBytes)
    const metadataContent = `${JSON.stringify(metadata, null, 2)}\n`
    const now = nowMilliseconds()
    cleanupExpired(now)
    if (tokens.size >= maxTokens) {
      throw writebackError('WRITEBACK_TOKEN_CAPACITY', 'Writeback confirmation capacity has been reached')
    }
    const confirmationToken = tokenFactory()
    if (typeof confirmationToken !== 'string' || confirmationToken.length === 0 || tokens.has(confirmationToken)) {
      throw new Error('tokenFactory must return a unique non-empty string')
    }
    const expiresAtMs = now + tokenTtlMs
    const relativeMain = `${relativeDirectory}\\${mainFileName}`
    const relativeMetadata = `${relativeDirectory}\\${metadataFileName}`
    const files = [
      {
        relativePath: relativeMain,
        absolutePath: absoluteMain,
        sizeBytes: artifactSizeBytes,
        sha256: input.artifact.sha256,
        mediaType: input.artifact.mediaType,
      },
      {
        relativePath: relativeMetadata,
        absolutePath: absoluteMetadata,
        sizeBytes: Buffer.byteLength(metadataContent, 'utf8'),
        sha256: sha256(metadataContent),
        mediaType: 'application/json',
      },
    ]
    const manifest = Object.freeze({
      schemaVersion: 1,
      workspaceId: input.workspaceId,
      taskId: input.taskId,
      runId: input.runId,
      artifactId: input.artifact.artifactId,
      relativeDirectory,
      absoluteTarget,
      files: Object.freeze(files.map((file) => Object.freeze({ ...file }))),
      expiresAt: new Date(expiresAtMs).toISOString(),
    })
    const plan = Object.freeze({
      writebackId: idFactory(),
      workspaceId: input.workspaceId,
      taskId: input.taskId,
      runId: input.runId,
      expectedRevision: input.expectedRevision,
      artifactId: input.artifact.artifactId,
      relativeDirectory,
      workspaceRoot,
      absoluteTarget,
      artifactContent,
      metadata,
      metadataContent,
      files: manifest.files,
      reviewStatus: 'approved',
      expiresAt: manifest.expiresAt,
    })
    tokens.set(confirmationToken, { status: 'active', expiresAtMs, plan })
    return Object.freeze({ confirmationToken, manifest })
  }

  function consume(confirmationToken) {
    const entry = tokens.get(confirmationToken)
    if (!entry) throw writebackError('WRITEBACK_TOKEN_INVALID', 'Writeback confirmation token is invalid')
    if (entry.status === 'used') {
      throw writebackError('WRITEBACK_TOKEN_USED', 'Writeback confirmation token has already been used')
    }
    if (entry.expiresAtMs <= nowMilliseconds()) {
      entry.status = 'expired'
      throw writebackError('WRITEBACK_TOKEN_EXPIRED', 'Writeback confirmation token has expired')
    }
    if (entry.status !== 'active') {
      throw writebackError('WRITEBACK_TOKEN_EXPIRED', 'Writeback confirmation token has expired')
    }
    entry.status = 'used'
    consumedPlans.add(entry.plan)
    return entry.plan
  }

  async function withTargetLock(target, operation) {
    const key = pathKey(target)
    const previous = targetLocks.get(key) ?? Promise.resolve()
    let release
    const current = new Promise((resolveLock) => { release = resolveLock })
    targetLocks.set(key, current)
    await previous.catch(() => {})
    try {
      return await operation()
    } finally {
      release()
      if (targetLocks.get(key) === current) targetLocks.delete(key)
    }
  }

  async function removeKnownFile(path) {
    try {
      await fileSystem.unlink(path)
      return false
    } catch (error) {
      if (error?.code === 'ENOENT') return false
      return true
    }
  }

  async function removeKnownDirectory(path) {
    try {
      await fileSystem.rmdir(path)
      return false
    } catch (error) {
      if (error?.code === 'ENOENT') return false
      return true
    }
  }

  async function cleanupOperationPaths({ stageFiles, stageDirectory, stageCreated }) {
    if (!stageCreated) return false
    let failed = false
    for (const path of [...stageFiles].reverse()) failed = await removeKnownFile(path) || failed
    failed = await removeKnownDirectory(stageDirectory) || failed
    return failed
  }

  async function writeAndVerify(path, content, expectedSize, expectedSha256, onCreated) {
    let handle
    try {
      handle = await fileSystem.open(path, 'wx')
      onCreated()
      await handle.writeFile(content, 'utf8')
      await handle.sync()
      const fileStat = await handle.stat()
      if (!fileStat.isFile() || fileStat.size !== expectedSize) {
        throw Object.assign(new Error('staged file size mismatch'), { code: 'EIO' })
      }
    } finally {
      await handle?.close().catch(() => {})
    }
    const bytes = await fileSystem.readFile(path)
    if (sha256(bytes) !== expectedSha256) {
      throw Object.assign(new Error('staged file hash mismatch'), { code: 'EIO' })
    }
  }

  async function revalidatePlanTarget(plan) {
    const workspaceRoot = await resolveWorkspaceRoot(workspaceRegistry, fileSystem, plan.workspaceId)
    if (pathKey(workspaceRoot) !== pathKey(plan.workspaceRoot)) {
      throw writebackError('WORKSPACE_ROOT_CHANGED', 'Workspace root changed after writeback preparation')
    }
    const absoluteTarget = await resolveSafeNewTarget(fileSystem, workspaceRoot, plan.relativeDirectory)
    if (pathKey(absoluteTarget) !== pathKey(plan.absoluteTarget)) {
      throw writebackError('WRITEBACK_TARGET_CHANGED', 'Writeback target changed after preparation')
    }
    return absoluteTarget
  }

  async function pathExists(path) {
    try {
      await fileSystem.lstat(path)
      return true
    } catch (error) {
      if (error?.code === 'ENOENT') return false
      throw error
    }
  }

  async function publishConsumedPlan(plan) {
    const target = await revalidatePlanTarget(plan)
    const parent = dirname(target)
    const stageName = `.${basename(target)}.oasis-staging-${stageIdFactory()}`
    validateSafeSegment(stageName, 'WRITEBACK_STAGING_FAILED')
    const stageDirectory = resolve(parent, stageName)
    if (stageDirectory.length > SAFE_WINDOWS_PATH_LENGTH) {
      throw writebackError('WRITEBACK_PATH_TOO_LONG', 'Writeback staging path exceeds the safe Windows path budget')
    }
    const stageFiles = plan.files.map((file) => resolve(stageDirectory, basename(file.absolutePath)))
    const createdStageFiles = []
    let stageCreated = false
    let phase = 'staging'
    try {
      await fileSystem.mkdir(stageDirectory, { recursive: false })
      stageCreated = true
      await writeAndVerify(
        stageFiles[0],
        plan.artifactContent,
        plan.files[0].sizeBytes,
        plan.files[0].sha256,
        () => createdStageFiles.push(stageFiles[0]),
      )
      await writeAndVerify(
        stageFiles[1],
        plan.metadataContent,
        plan.files[1].sizeBytes,
        plan.files[1].sha256,
        () => createdStageFiles.push(stageFiles[1]),
      )

      await revalidatePlanTarget(plan)
      const committedAt = clock()
      if (!Number.isFinite(Date.parse(committedAt))) throw new TypeError('clock must return an ISO timestamp')
      const record = Object.freeze({
        writebackId: plan.writebackId,
        artifactId: plan.artifactId,
        relativeDirectory: plan.relativeDirectory,
        files: Object.freeze(plan.files.map(({ relativePath, sha256: hash, mediaType }) => Object.freeze({
          relativePath,
          sha256: hash,
          mediaType,
        }))),
        reviewStatus: 'approved',
        committedAt,
      })
      phase = 'publish'
      await fileSystem.rename(stageDirectory, target)
      return record
    } catch (error) {
      const cleanupFailed = await cleanupOperationPaths({
        stageFiles: createdStageFiles,
        stageDirectory,
        stageCreated,
      })
      if (error instanceof WorkspaceMaterialError) throw error
      if (phase === 'publish') {
        let targetAppeared = false
        try {
          targetAppeared = await pathExists(target)
        } catch {
          // Preserve the original publication error when the raced target cannot be inspected.
        }
        if (targetAppeared) {
          throw writebackError('WRITEBACK_TARGET_EXISTS', 'Writeback target appeared during publication', {
            systemCode: typeof error?.code === 'string' ? error.code : 'UNKNOWN',
            cleanupFailed,
          })
        }
      }
      throw writebackError(
        phase === 'staging' ? 'WRITEBACK_STAGING_FAILED' : 'WRITEBACK_PUBLISH_FAILED',
        phase === 'staging' ? 'Writeback staging failed' : 'Writeback publication failed',
        {
          systemCode: typeof error?.code === 'string' ? error.code : 'UNKNOWN',
          cleanupFailed,
        },
      )
    }
  }

  async function publish(plan) {
    if (!plan || !consumedPlans.has(plan)) {
      throw writebackError('WRITEBACK_PLAN_INVALID', 'Writeback plan was not produced by a consumed token')
    }
    if (startedPlans.has(plan)) {
      throw writebackError('WRITEBACK_PLAN_USED', 'Writeback plan has already been used')
    }
    startedPlans.add(plan)
    return withTargetLock(plan.absoluteTarget, () => publishConsumedPlan(plan))
  }

  return Object.freeze({ consume, prepare, publish })
}
