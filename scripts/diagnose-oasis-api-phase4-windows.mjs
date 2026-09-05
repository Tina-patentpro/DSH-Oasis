import { lstat, realpath, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join, resolve, win32 } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { claimEvidenceRoot, createInspectionNativeContext, runRecordedCommand } from './verify-oasis-api-phase4.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const evidenceParent = join(root, 'docs/evidence/oasis-api-browser-diagnostics-2026-09-03')
const probe = join(root, 'scripts/oasis-api-phase4-windows-probe.ps1')
const fail = code => Object.assign(new Error(code), { code })
const hash = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase()
export const KNOWN_FOLDERS = Object.freeze([
  { name: 'LocalAppData', guid: 'F1B32785-6FBA-4FCF-9D55-7B8E7F157091', env: 'LOCALAPPDATA' },
  { name: 'RoamingAppData', guid: '3EB685DB-65F9-4CF6-A03A-E3EF65729F3D', env: 'APPDATA' },
  { name: 'Profile', guid: '5E6C858F-0E22-4760-9AFE-EA3317B67173', env: 'USERPROFILE' },
  { name: 'ProgramData', guid: '62AB5D82-FDC1-4DC3-A9DD-070D1D495D97', env: 'ProgramData' },
].map(Object.freeze))
export const TOKEN_FIELDS = Object.freeze(['TokenType', 'TokenElevationType', 'TokenIntegrityLevel', 'TokenSessionId', 'TokenIsAppContainer'])

export function parseDiagnosticArgs(argv) {
  const seen = new Set(); const result = {}
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]
    if (seen.has(key) || !['--evidence', '--offline'].includes(key)) throw fail('DIAGNOSTIC_ARGUMENT_INVALID')
    seen.add(key)
    if (key === '--offline') result.offline = true
    else {
      const value = argv[++i]
      if (typeof value !== 'string' || !value || value.startsWith('--') || /[\0\r\n]/.test(value)) throw fail('DIAGNOSTIC_ARGUMENT_INVALID')
      result.evidence = value
    }
  }
  if (!result.evidence || !result.offline) throw fail('DIAGNOSTIC_ARGUMENT_INVALID')
  return result
}

export function parseNativeReport(text) {
  const invalid = () => { throw fail('NATIVE_REPORT_INVALID') }
  if (typeof text !== 'string' || Buffer.byteLength(text) > 65536) invalid()
  let data
  try { data = JSON.parse(text.replace(/^\uFEFF/, '')) } catch { invalid() }
  const keys = (item, names) => item && typeof item === 'object' && !Array.isArray(item) &&
    Object.keys(item).length === names.length && names.every(name => Object.hasOwn(item, name))
  const uint = number => Number.isInteger(number) && number >= 0 && number <= 4294967295
  const date = value => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value))
  if (!keys(data, ['schemaVersion', 'generatedAt', 'pid', 'createdAt', 'bitness', 'folders', 'tokens', 'resourceCleanupComplete']) ||
    data.schemaVersion !== 1 || !date(data.generatedAt) || !date(data.createdAt) || !uint(data.pid) || !data.pid ||
    ![32, 64].includes(data.bitness) || data.resourceCleanupComplete !== true || !Array.isArray(data.folders) || data.folders.length !== 4) invalid()
  data.folders.forEach((row, i) => {
    if (!keys(row, ['name', 'guid', 'flags', 'hTokenMode', 'hresult', 'path']) || row.name !== KNOWN_FOLDERS[i].name ||
      row.guid !== KNOWN_FOLDERS[i].guid || row.flags !== 16384 || row.hTokenMode !== 'current-user' || !/^0x[0-9A-F]{8}$/.test(row.hresult)) invalid()
    const succeeded = Number.parseInt(row.hresult.slice(2), 16) < 0x80000000
    if (succeeded ? typeof row.path !== 'string' || !row.path || row.path.length > 32767 || /[\0\r\n]/.test(row.path) : row.path !== null) invalid()
    if (succeeded && !/^(?:[A-Za-z]:[\\/]|\\\\[^\\]+\\[^\\]+)/.test(row.path)) invalid()
  })
  if (!keys(data.tokens, ['process', 'thread'])) invalid()
  for (const token of Object.values(data.tokens)) {
    if (!keys(token, ['open', 'information']) || !keys(token.open, ['ok', 'error']) || typeof token.open.ok !== 'boolean' ||
      !uint(token.open.error) || (token.open.ok ? token.open.error !== 0 : token.open.error === 0) || !Array.isArray(token.information) ||
      token.information.length !== (token.open.ok ? TOKEN_FIELDS.length : 0)) invalid()
    token.information.forEach((row, i) => {
      if (!keys(row, ['name', 'ok', 'error', 'value']) || row.name !== TOKEN_FIELDS[i] || typeof row.ok !== 'boolean' || !uint(row.error)) invalid()
      if (!row.ok) { if (!row.error || row.value !== null) invalid(); return }
      if (row.error !== 0 || !uint(row.value) || (i === 0 && ![1, 2].includes(row.value)) ||
        (i === 1 && ![1, 2, 3].includes(row.value)) || (i === 4 && ![0, 1].includes(row.value))) invalid()
    })
  }
  return data
}

function inside(base, target) {
  if (typeof target !== 'string' || !/^[A-Za-z]:[\\/]/.test(target) || /[\0\r\n%]/.test(target)) return false
  const relative = win32.relative(win32.resolve(base), win32.resolve(target))
  return relative === '' || (!relative.startsWith('..') && !win32.isAbsolute(relative))
}

export async function inspectDiagnosticPath(base, target, io = { lstat, realpath }) {
  if (!inside(base, target)) return { status: 'outside-scope' }
  const normalized = win32.resolve(target)
  // Check ancestors from the volume down before ever following a child path.
  const ancestors = []; let cursor = normalized
  for (;;) { ancestors.unshift(cursor); const parent = win32.dirname(cursor); if (parent === cursor) break; cursor = parent }
  let info
  for (const item of ancestors) {
    try { info = await io.lstat(item) }
    catch (error) { return { status: error.code === 'ENOENT' ? 'missing' : 'unreadable', error: error.code === 'ENOENT' ? 'ENOENT' : 'PATH_METADATA_FAILED' } }
    if (info.isSymbolicLink()) return { status: 'reparse-rejected' }
  }
  const actual = await io.realpath(normalized)
  if (win32.normalize(actual).toLowerCase() !== normalized.toLowerCase() || !inside(base, actual)) return { status: 'reparse-rejected' }
  return { status: 'observed', isDirectory: info.isDirectory() }
}

export async function collectNativeDiagnostic(context, { execute = runRecordedCommand, inspect = inspectDiagnosticPath } = {}) {
  const result = { generatedAt: new Date().toISOString(), collectionComplete: false, exitCode: 1,
    browserStarted: false, dshStarted: false, preflightComplete: false, stageComplete: false, phase4Complete: false,
    proofScope: 'native diagnostic child only; not Edge thread or OS Profile/network monitoring' }
  try {
    const request = { executable: join(context.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe'),
      argv: ['-NoProfile', '-NonInteractive', '-File', probe], cwd: context.cwd,
      env: { ...context.env, OASIS_DIAGNOSTIC_ROOT: context.cwd }, timeoutMs: 15000, terminateTree: true }
    result.command = { executable: request.executable, argv: request.argv, cwd: request.cwd, timeoutMs: request.timeoutMs, probeHash: hash(await readFile(probe)) }
    const output = await execute(request)
    // Malformed native output is never persisted verbatim as arbitrary content.
    const { stdout = '', stderr = '', ...metadata } = output
    result.commandResult = { ...metadata, stdoutBytes: Buffer.byteLength(stdout), stderrBytes: Buffer.byteLength(stderr), stdoutHash: hash(stdout), stderrHash: hash(stderr) }
    if (output.exitCode !== 0 || output.closed !== true || output.timedOut || output.spawnError || output.treeTermination?.ok === false) {
      const probeFailure = /^(NATIVE_PROBE_(?:SETUP|COMPILE|CALL)_FAILED)\r?\n?$/.exec(stderr)
      throw fail(probeFailure?.[1] ?? 'NATIVE_COMMAND_FAILED')
    }
    const report = parseNativeReport(stdout)
    if (report.pid !== output.pid) throw fail('NATIVE_PROCESS_IDENTITY_MISMATCH')
    result.report = report; result.folders = []
    for (const [index, folder] of report.folders.entries()) {
      const injected = context.env[KNOWN_FOLDERS[index].env]
      result.folders.push({ name: folder.name, injectedPath: injected, returnedPath: folder.path,
        comparison: !folder.path || !injected ? 'unknown' : win32.normalize(folder.path).toLowerCase() === win32.normalize(injected).toLowerCase() ? 'same' : 'different',
        metadata: !folder.path ? { status: 'api-failed' } : !inside(context.cwd, folder.path) ? { status: 'outside-scope' } : await inspect(context.cwd, folder.path) })
    }
    result.collectionComplete = true; result.exitCode = 0
  } catch (error) {
    result.failure = { code: /^[A-Z][A-Z0-9_]{0,79}$/.test(error.code ?? '') ? error.code : 'NATIVE_DIAGNOSTIC_FAILED' }
  }
  return result
}

export async function runWindowsDiagnostic(argv, dependencies = {}) {
  const options = parseDiagnosticArgs(argv)
  const evidence = await claimEvidenceRoot(resolve(root, options.evidence), evidenceParent)
  const save = (name, value) => writeFile(join(evidence, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' })
  let result
  try {
    const context = await createInspectionNativeContext(process.env)
    await save('context.json', { generatedAt: new Date().toISOString(), cwd: context.cwd, environment: context.env, node: process.execPath, nodeVersion: process.version,
      scope: 'current execution identity inherited; authorization is external' })
    result = await collectNativeDiagnostic(context, dependencies)
  } catch (error) {
    result = { collectionComplete: false, exitCode: 1, browserStarted: false, dshStarted: false,
      failure: { code: /^[A-Z][A-Z0-9_]{0,79}$/.test(error.code ?? '') ? error.code : 'NATIVE_SETUP_FAILED' } }
  }
  await save('native-result.json', result)
  return result
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runWindowsDiagnostic(process.argv.slice(2)).then(result => {
    console.log(JSON.stringify({ collectionComplete: result.collectionComplete, exitCode: result.exitCode, failure: result.failure ?? null }))
    process.exitCode = result.exitCode
  }).catch(() => { console.error('NATIVE_DIAGNOSTIC_EVIDENCE_FAILED'); process.exitCode = 1 })
}
