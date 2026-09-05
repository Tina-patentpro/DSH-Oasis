import { readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { dirname, join, resolve, win32 } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { claimEvidenceRoot, createInspectionNativeContext, inspectionEnvironment, terminateOwnedProcessTree } from './verify-oasis-api-phase4.mjs'
import { inspectDiagnosticPath } from './diagnose-oasis-api-phase4-windows.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const evidenceRoot = join(root, 'docs/evidence/oasis-api-path-parity-2026-09-03/attempt-001')
const probe = join(root, 'scripts/oasis-api-path-parity-probe.ps1')
const guid = 'F1B32785-6FBA-4FCF-9D55-7B8E7F157091'
const calls = [
  { id: 'known-dont-verify', api: 'SHGetKnownFolderPath', guid, csidl: null, flags: 16384, hTokenMode: 'current-user', hwndMode: null },
  { id: 'legacy-current', api: 'SHGetFolderPathW', guid: null, csidl: 28, flags: 0, hTokenMode: 'current-user', hwndMode: 'null' },
  { id: 'known-verify', api: 'SHGetKnownFolderPath', guid, csidl: null, flags: 0, hTokenMode: 'current-user', hwndMode: null },
]
const guards = ['FIRST_CALL_FAILED', 'PATH_OUTSIDE_SCOPE', 'PATH_REPARSE_REJECTED', 'PATH_METADATA_UNAVAILABLE']
const fail = code => Object.assign(new Error(code), { code })
const hash = value => createHash('sha256').update(value).digest('hex').toUpperCase()
const safeCode = (error, fallback) => /^[A-Z][A-Z0-9_]{0,79}$/.test(error?.code ?? '') ? error.code : fallback
const samePath = (a, b) => win32.normalize(a).toLowerCase() === win32.normalize(b).toLowerCase()
const absolute = value => typeof value === 'string' && value.length <= 32767 && !/[\x00-\x1f%]/.test(value) && /^(?:[a-z]:[\\/]|\\\\[^\\]+\\[^\\]+)/i.test(value)
function expectedLocal(cwd) {
  if (!absolute(cwd) || !/^[a-z]:[\\/]/i.test(cwd)) throw fail('PARITY_PATH_UNSAFE')
  return win32.join(cwd, 'os-home/AppData/Local')
}
const metadataSafe = value => value?.status === 'missing' || (value?.status === 'observed' && value.isDirectory === true)
const emptyResult = () => ({ generatedAt: new Date().toISOString(), collectionComplete: false, exitCode: 1,
  browserStarted: false, dshStarted: false, preflightComplete: false, stageComplete: false, phase4Complete: false,
  proofScope: 'independent native child only; not Edge, OS Profile/network monitoring or a full descendant-lifetime proof' })

export function parseParityArgs(argv) {
  const result = {}; const seen = new Set()
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]
    if (!['--offline', '--evidence'].includes(key) || seen.has(key)) throw fail('PARITY_ARGUMENT_INVALID')
    seen.add(key)
    if (key === '--offline') result.offline = true
    else {
      const value = argv[++i]
      if (typeof value !== 'string' || !value || value.startsWith('--') || /[\x00-\x1f]/.test(value)) throw fail('PARITY_ARGUMENT_INVALID')
      result.evidence = value
    }
  }
  if (!result.evidence || !result.offline) throw fail('PARITY_ARGUMENT_INVALID')
  return result
}

export function parseParityReport(text, bounds) {
  const invalid = () => { throw fail('PARITY_REPORT_INVALID') }
  const keys = (item, names) => item && typeof item === 'object' && !Array.isArray(item) &&
    Object.keys(item).length === names.length && names.every(name => Object.hasOwn(item, name))
  const date = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{1,7}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19)
  if (typeof text !== 'string' || Buffer.byteLength(text) > 65536 || !bounds || !date(bounds.startedAt) || !date(bounds.finishedAt)) invalid()
  let data; let expected
  try { data = JSON.parse(text.replace(/^\uFEFF/, '')); expected = expectedLocal(bounds.cwd) } catch { invalid() }
  const start = Date.parse(bounds.startedAt); const end = Date.parse(bounds.finishedAt)
  const inWindow = value => date(value) && Date.parse(value) >= start - 2000 && Date.parse(value) <= end + 2000
  if (end < start || !keys(data, ['schemaVersion', 'kind', 'generatedAt', 'pid', 'createdAt', 'bitness', 'calls', 'resourceCleanupComplete']) ||
    data.schemaVersion !== 1 || data.kind !== 'path-api-contract-parity' || !Number.isInteger(data.pid) || data.pid <= 0 || data.pid !== bounds.pid ||
    ![32, 64].includes(data.bitness) || !inWindow(data.createdAt) || !inWindow(data.generatedAt) ||
    Date.parse(data.generatedAt) < Date.parse(data.createdAt) || typeof data.resourceCleanupComplete !== 'boolean' ||
    !Array.isArray(data.calls) || data.calls.length !== 3) invalid()
  let blocked = null; let previousAt = Date.parse(data.createdAt) - 2000
  data.calls.forEach((row, index) => {
    const contract = calls[index]
    if (!keys(row, [...Object.keys(contract), 'at', 'status', 'hresult', 'path', 'guardCode']) ||
      Object.entries(contract).some(([key, value]) => row[key] !== value)) invalid()
    if (blocked) {
      if (row.status !== 'skipped-safety-guard' || row.at !== null || row.hresult !== null || row.path !== null || row.guardCode !== blocked) invalid()
      return
    }
    if (row.status !== 'executed' || !inWindow(row.at) || Date.parse(row.at) < previousAt || Date.parse(row.at) > Date.parse(data.generatedAt) ||
      typeof row.hresult !== 'string' || !/^0x[0-9A-F]{8}$/.test(row.hresult) || (row.guardCode !== null && !guards.includes(row.guardCode))) invalid()
    previousAt = Date.parse(row.at)
    if (row.hresult === '0x00000000') {
      if (!absolute(row.path) || (index === 1 && row.path.length >= 260)) invalid()
      const matches = samePath(row.path, expected)
      if ((!matches && row.guardCode !== 'PATH_OUTSIDE_SCOPE') || (matches && row.guardCode === 'PATH_OUTSIDE_SCOPE') || row.guardCode === 'FIRST_CALL_FAILED') invalid()
    } else if (row.path !== null || (index === 0 ? row.guardCode !== 'FIRST_CALL_FAILED' : row.guardCode !== null)) invalid()
    blocked = row.guardCode
  })
  return data
}

// Only the fixed parity probe uses this bounded collector. Dependencies replace
// OS boundaries in tests; they are never accepted from the CLI or native JSON.
function executeParityCommand(request, context, runtime = {}) {
  const launch = runtime.spawn ?? spawn
  const terminate = runtime.terminate ?? terminateOwnedProcessTree
  const now = runtime.now ?? Date.now
  const setTimer = runtime.setTimeout ?? setTimeout
  const clearTimer = runtime.clearTimeout ?? clearTimeout
  const startedAt = new Date(now()).toISOString()
  return new Promise(resolveCommand => {
    let child; let finished = false; let stopping = false; let terminationSettled = false; let rootClosed = false
    let closeCode = null; let closeSignal = null; let timedOut = false; let spawnError = null; let treeTermination = null
    let rootOnlyTermination = false; let outputLimitExceeded = false; let probeTimer
    const timers = new Set()
    const channels = { stdout: { limit: 65536, bytes: 0, retained: 0, chunks: [] }, stderr: { limit: 8192, bytes: 0, retained: 0, chunks: [] } }
    const later = (callback, ms) => { const id = setTimer(() => { timers.delete(id); if (!finished) callback() }, ms); timers.add(id); return id }
    const cancel = id => { clearTimer(id); timers.delete(id) }
    const finish = () => {
      if (finished) return
      finished = true
      for (const timer of timers) clearTimer(timer)
      timers.clear()
      if (!rootClosed && child) { child.stdout?.destroy(); child.stderr?.destroy(); child.unref?.() }
      resolveCommand({ startedAt, finishedAt: new Date(now()).toISOString(), pid: child?.pid ?? null,
        exitCode: spawnError ? null : closeCode, signal: closeSignal, closed: rootClosed, timedOut, spawnError, treeTermination,
        rootOnlyTermination, outputLimitExceeded, stdout: Buffer.concat(channels.stdout.chunks).toString('utf8'),
        stderr: Buffer.concat(channels.stderr.chunks).toString('utf8'), stdoutBytes: channels.stdout.bytes, stderrBytes: channels.stderr.bytes })
    }
    const rootOnly = () => {
      if (rootClosed) { finish(); return }
      if (!rootOnlyTermination) { rootOnlyTermination = true; try { child?.kill('SIGKILL') } catch { /* No alternative PID/name action. */ } }
      if (!finished) later(finish, 2000)
    }
    const stop = reason => {
      if (finished || stopping) return
      stopping = true; cancel(probeTimer)
      if (reason === 'timeout') timedOut = true
      let settled = false
      const settleTermination = value => {
        if (settled || finished) return
        settled = true; cancel(limit); terminationSettled = true
        treeTermination = { ok: value?.ok === true, closed: value?.closed ?? null, exitCode: value?.exitCode ?? null,
          error: value?.error ? { code: safeCode(value.error, 'PARITY_TERMINATION_FAILED') } : null }
        if (rootClosed) finish()
        else later(rootOnly, 5000)
      }
      const limit = later(() => settleTermination({ ok: false, error: { code: 'PARITY_TERMINATION_TIMEOUT' } }), 7000)
      Promise.resolve().then(() => terminate(child, context)).then(settleTermination,
        () => settleTermination({ ok: false, error: { code: 'PARITY_TERMINATION_FAILED' } }))
    }
    const collect = (name, chunk) => {
      if (finished) return
      const channel = channels[name]; const bytes = Buffer.from(chunk)
      channel.bytes = Math.min(Number.MAX_SAFE_INTEGER, channel.bytes + bytes.length)
      const remaining = channel.limit - channel.retained
      if (remaining > 0) { const kept = bytes.subarray(0, remaining); channel.chunks.push(Buffer.from(kept)); channel.retained += kept.length }
      if (channel.bytes > channel.limit) { outputLimitExceeded = true; stop('overflow') }
    }
    try {
      child = launch(request.executable, request.argv, { cwd: request.cwd, env: request.env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
      child.stdout.on('data', chunk => collect('stdout', chunk)); child.stderr.on('data', chunk => collect('stderr', chunk))
      child.once('error', () => { spawnError = { code: 'PARITY_SPAWN_FAILED' }; if (!child.pid) { rootClosed = true; finish() } else stop('error') })
      child.once('close', (code, signal) => { if (finished) return; rootClosed = true; closeCode = code; closeSignal = signal; if (!stopping || terminationSettled) finish() })
      probeTimer = later(() => stop('timeout'), 15000)
      later(() => {
        timedOut = true
        treeTermination ??= { ok: false, error: { code: 'PARITY_SUPERVISION_DEADLINE' } }
        if (!rootClosed && !rootOnlyTermination) { rootOnlyTermination = true; try { child.kill('SIGKILL') } catch { /* Fail closed. */ } }
        finish()
      }, 30000)
    } catch { spawnError = { code: 'PARITY_SPAWN_FAILED' }; rootClosed = !child?.pid; if (rootClosed) finish(); else stop('error') }
  })
}

export async function collectPathParity(context, { execute, inspect = inspectDiagnosticPath, runtime } = {}) {
  const result = emptyResult()
  try {
    const target = expectedLocal(context.cwd)
    result.pathMetadata = { target, before: await inspect(context.cwd, target), after: null }
    if (!metadataSafe(result.pathMetadata.before)) throw fail('PARITY_PATH_UNSAFE')
    const env = inspectionEnvironment(context.env, context.cwd)
    const request = { executable: join(env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe'),
      argv: ['-NoProfile', '-NonInteractive', '-File', probe], cwd: context.cwd,
      env: { ...env, OASIS_PATH_PARITY_ROOT: context.cwd }, timeoutMs: 15000 }
    result.command = { executable: request.executable, argv: request.argv, cwd: request.cwd, timeoutMs: request.timeoutMs,
      probeHash: hash(await readFile(probe)) }
    const output = await (execute ? execute(request) : executeParityCommand(request, context, runtime))
    const stdout = typeof output.stdout === 'string' ? output.stdout : ''
    const stderr = typeof output.stderr === 'string' ? output.stderr : ''
    result.commandResult = Object.fromEntries(['startedAt', 'finishedAt', 'pid', 'exitCode', 'closed', 'timedOut', 'spawnError',
      'treeTermination', 'rootOnlyTermination', 'outputLimitExceeded'].map(key => [key, output[key] ?? null]))
    Object.assign(result.commandResult, { stdoutBytes: output.stdoutBytes ?? Buffer.byteLength(stdout), stderrBytes: output.stderrBytes ?? Buffer.byteLength(stderr),
      retainedStdoutHash: hash(stdout), retainedStderrHash: hash(stderr) })
    if (output.closed !== true || output.timedOut || output.spawnError || output.treeTermination?.ok === false || output.rootOnlyTermination ||
      output.outputLimitExceeded || Buffer.byteLength(stdout) > 65536 || Buffer.byteLength(stderr) > 8192) throw fail('PARITY_COMMAND_FAILED')
    const fixedFailure = /^(PARITY_PROBE_(?:SETUP|COMPILE|CALL)_FAILED)\r?\n?$/.exec(stderr)
    if (fixedFailure && output.exitCode !== 0) throw fail(fixedFailure[1])
    result.report = parseParityReport(stdout, { ...output, cwd: context.cwd })
    if (!result.report.resourceCleanupComplete) throw fail('PARITY_RESOURCE_CLEANUP_FAILED')
    if (result.report.calls.some(row => row.guardCode !== null || row.status !== 'executed')) throw fail('PARITY_SAFETY_GUARD')
    if (output.exitCode !== 0 || stderr.length) throw fail('PARITY_COMMAND_FAILED')
    result.pathMetadata.after = await inspect(context.cwd, target)
    if (!metadataSafe(result.pathMetadata.after)) throw fail('PARITY_PATH_UNSAFE')
    result.collectionComplete = true; result.exitCode = 0
  } catch (error) { result.failure = { code: safeCode(error, 'PARITY_COLLECTION_FAILED') } }
  return result
}

export async function runPathParity(argv, dependencies = {}) {
  const options = parseParityArgs(argv)
  const evidence = await claimEvidenceRoot(resolve(root, options.evidence), evidenceRoot)
  const save = (name, data) => writeFile(join(evidence, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' })
  let result
  try {
    const context = await createInspectionNativeContext(process.env)
    await save('context.json', { generatedAt: new Date().toISOString(), cwd: context.cwd, environment: context.env,
      node: process.execPath, nodeVersion: process.version, authorization: 'external approval required; not inferred from identity or CLI' })
    result = await collectPathParity(context, dependencies)
  } catch (error) { result = { ...emptyResult(), failure: { code: safeCode(error, 'PARITY_SETUP_FAILED') } } }
  await save('parity-result.json', result)
  return result
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runPathParity(process.argv.slice(2)).then(result => {
    console.log(JSON.stringify({ collectionComplete: result.collectionComplete, exitCode: result.exitCode, failure: result.failure ?? null }))
    process.exitCode = result.exitCode
  }).catch(() => { console.error('PARITY_EVIDENCE_FAILED'); process.exitCode = 1 })
}
