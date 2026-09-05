import assert from 'node:assert/strict'
import { constants } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { StringDecoder } from 'node:string_decoder'
import { createServer, createConnection } from 'node:net'
import { createServer as createHttpServer } from 'node:http'
import { copyFile, cp, lstat, mkdir, mkdtemp, open, readFile, readdir, readlink, realpath, stat, symlink, unlink, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve, isAbsolute, win32 } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { validateIsolatedHome, resolveDshLaunch } from './dsh-isolated.mjs'
import { compareRows, sha256, writeBaselineTsv } from './baseline-capture-core.mjs'
import { BROWSER_EXECUTABLE, PLAYWRIGHT_ENTRY, createBrowserLifecycle, applyBrowserEvent, settleBrowserLifecycle } from './oasis-api-phase4-browser-worker.mjs'
export { createBrowserLifecycle, applyBrowserEvent, settleBrowserLifecycle, browserRequestDecision, runBrowserDriver } from './oasis-api-phase4-browser-worker.mjs'

function within(root, child) {
  const rel = relative(resolve(root), resolve(child))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}
async function noLinks(target) {
  for (let cursor = resolve(target); ; cursor = dirname(cursor)) {
    try { assert.equal((await lstat(cursor)).isSymbolicLink(), false, 'reparse path rejected') }
    catch (error) { if (error.code !== 'ENOENT') throw error }
    if (dirname(cursor) === cursor) break
  }
}
export async function claimEvidenceRoot(target, allowedRoot) {
  assert.ok(within(allowedRoot, target) && resolve(target) !== resolve(allowedRoot), 'evidence outside allowed root')
  await noLinks(target)
  await mkdir(target)
  return realpath(target)
}
export function assertLoopbackUrl(value) {
  assert.match(value, /^http:\/\/127\.0\.0\.1:[1-9]\d*\/?$/)
  const url = new URL(value)
  assert.ok(Number(url.port) > 0 && Number(url.port) <= 65535)
  return url.origin
}
export async function assertIndependentHomes(homes, runtimeRoot) {
  await noLinks(runtimeRoot)
  const roots = []
  for (const home of homes) {
    assert.ok(within(runtimeRoot, home), 'Home outside isolated root')
    await noLinks(home)
    await validateIsolatedHome(home)
    const canonical = await realpath(home)
    assert.ok(within(await realpath(runtimeRoot), canonical), 'resolved Home outside root')
    assert.ok(roots.every(other => !within(other, canonical) && !within(canonical, other)), 'shared storage/Home rejected')
    roots.push(canonical)
  }
  return roots
}
export function isolatedEnvironment(parent, modeRoot) {
  const env = {}
  for (const [key, value] of Object.entries(parent)) {
    if (['path', 'systemroot', 'windir', 'comspec', 'pathext', 'processor_architecture', 'number_of_processors'].includes(key.toLowerCase())) env[key] = value
  }
  Object.assign(env, {
    DSH_HOME: `${modeRoot}/home`, HOME: `${modeRoot}/os-home`, USERPROFILE: `${modeRoot}/os-home`,
    APPDATA: `${modeRoot}/appdata`, LOCALAPPDATA: `${modeRoot}/localappdata`, TEMP: `${modeRoot}/tmp`, TMP: `${modeRoot}/tmp`,
    npm_config_cache: `${modeRoot}/npm-cache`, npm_config_userconfig: `${modeRoot}/empty.npmrc`, npm_config_globalconfig: `${modeRoot}/empty-global.npmrc`,
    npm_config_offline: 'true', npm_config_ignore_scripts: 'true', npm_config_registry: 'http://127.0.0.1:9',
    XDG_CONFIG_HOME: `${modeRoot}/config`, XDG_CACHE_HOME: `${modeRoot}/cache`, XDG_DATA_HOME: `${modeRoot}/data`,
    PNPM_HOME: `${modeRoot}/pnpm-home`, COREPACK_ENABLE_NETWORK: '0', CI: 'true', NO_COLOR: '1', DSH_TELEMETRY_DISABLED: '1',
    HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9', ALL_PROXY: 'http://127.0.0.1:9', NO_PROXY: '127.0.0.1,localhost,::1',
  })
  return env
}

const nativeContexts = new WeakSet()
function windowsValues(env) {
  const values = {}
  for (const [key, value] of Object.entries(env)) {
    const name = key.toLowerCase()
    if (!['systemroot', 'windir', 'systemdrive', 'comspec', 'programdata', 'allusersprofile', 'temp', 'tmp'].includes(name)) continue
    if (typeof value !== 'string' || /[%\0\r\n]/.test(value) || (name in values && values[name] !== value)) throw failure('INSPECTION_WINDOWS_ENVIRONMENT_INCOMPLETE')
    values[name] = value
  }
  return values
}
const absoluteWindowsPath = value => typeof value === 'string' && /^[a-z]:[\\/]/i.test(value) && !/[%\0\r\n]/.test(value)

export function inspectionEnvironment(parent, modeRoot) {
  const values = windowsValues(parent)
  if (!absoluteWindowsPath(values.systemroot) || !absoluteWindowsPath(modeRoot)) throw failure('INSPECTION_WINDOWS_ENVIRONMENT_INCOMPLETE')
  for (const key of ['windir', 'comspec', 'programdata', 'allusersprofile', 'temp', 'tmp']) {
    if (values[key] !== undefined && !absoluteWindowsPath(values[key])) throw failure('INSPECTION_WINDOWS_ENVIRONMENT_INCOMPLETE')
  }
  const systemRoot = win32.normalize(values.systemroot)
  if (values.comspec !== undefined && win32.normalize(values.comspec).toLowerCase() !== win32.join(systemRoot, 'System32/cmd.exe').toLowerCase()) throw failure('INSPECTION_WINDOWS_ENVIRONMENT_INCOMPLETE')
  const drive = win32.parse(systemRoot).root.slice(0, 2)
  if ((values.systemdrive !== undefined && values.systemdrive.toLowerCase() !== drive.toLowerCase()) ||
    (values.windir !== undefined && win32.normalize(values.windir).toLowerCase() !== systemRoot.toLowerCase())) throw failure('INSPECTION_WINDOWS_ENVIRONMENT_INCOMPLETE')
  const env = isolatedEnvironment(parent, modeRoot)
  for (const key of Object.keys(env)) if (['systemroot', 'windir', 'comspec'].includes(key.toLowerCase())) delete env[key]
  Object.assign(env, { SystemRoot: systemRoot, WINDIR: systemRoot, SystemDrive: drive,
    ComSpec: join(systemRoot, 'System32', 'cmd.exe'), ProgramData: join(modeRoot, 'programdata'), ALLUSERSPROFILE: join(modeRoot, 'programdata') })
  assertInspectionNativeEnvironment(env)
  return env
}

export function inspectionObserverEnvironment(parent) {
  const allowed = new Set(['path', 'pathext', 'systemroot', 'windir', 'systemdrive', 'comspec', 'home', 'userprofile',
    'homedrive', 'homepath', 'appdata', 'localappdata', 'programdata', 'allusersprofile', 'temp', 'tmp'])
  const env = {}; const seen = new Set()
  for (const [key, value] of Object.entries(parent)) if (allowed.has(key.toLowerCase()) && !seen.has(key.toLowerCase())) {
    env[key] = value; seen.add(key.toLowerCase())
  }
  return { ...env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' }
}

async function verifyInspectionWindowsPaths(env) {
  assertInspectionNativeEnvironment(env)
  for (const file of [env.ComSpec, join(env.SystemRoot, 'System32', 'taskkill.exe')]) {
    await noLinks(file)
    if (!(await stat(file)).isFile()) throw failure('INSPECTION_WINDOWS_EXECUTABLE_MISSING')
  }
}

export async function createInspectionNativeContext(parent) {
  await noLinks(tmpdir())
  const temporary = await realpath(tmpdir())
  if (!absoluteWindowsPath(temporary) || /[^\x20-\x7E]/.test(temporary) || within(projectRoot, temporary)) throw failure('NATIVE_TEMP_ROOT_UNSAFE')
  await noLinks(temporary)
  await verifyInspectionWindowsPaths(inspectionEnvironment(parent, temporary))
  const cwd = await mkdtemp(join(temporary, 'oasis-dsh-p4-native-'))
  const env = inspectionEnvironment(parent, cwd)
  for (const dir of ['home', 'os-home', 'appdata', 'localappdata', 'tmp', 'programdata', 'npm-cache', 'config', 'cache', 'data', 'pnpm-home']) await mkdir(join(cwd, dir))
  await writeFile(env.npm_config_userconfig, '', { flag: 'wx' })
  await writeFile(env.npm_config_globalconfig, '', { flag: 'wx' })
  const context = Object.freeze({ cwd, env: Object.freeze(env), executable: join(env.SystemRoot, 'System32', 'taskkill.exe') })
  nativeContexts.add(context)
  return context
}

export async function requireOfflinePackages(packages) {
  const result = []
  for (const item of packages) {
    let manifest
    try { manifest = JSON.parse(await readFile(resolve(item.path, 'package.json'), 'utf8')) }
    catch { throw new Error(`OFFLINE_DEPENDENCY_MISSING: ${item.name}`) }
    assert.equal(manifest.name, item.name, 'offline package identity mismatch')
    if (item.version) assert.equal(manifest.version, item.version, 'offline version mismatch')
    result.push({ name: manifest.name, version: manifest.version, path: await realpath(item.path) })
  }
  return result
}
export async function acquireHostLease(home) {
  const file = resolve(home, '.phase4-host-lease')
  await noLinks(home)
  const handle = await open(file, 'wx')
  await handle.writeFile(JSON.stringify({ ownerPid: process.pid }))
  let released = false
  return { async release() { if (!released) { released = true; await handle.close(); await unlink(file) } } }
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageRoot = join(projectRoot, 'packages/oasis-professional-service')
const authority = 'D:/OneDrive/4、董娣相关/3、绿洲慧写3.0/绿洲前端/API接口文档-用户端.md'
const authorityHash = '429357F3E60E39AEAAE1C879C475D629633E88F5A1F71975C618C6899768FEB1'
const npmCli = 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js'

function failure(code) { return Object.assign(new Error(code), { code }) }
function safeFailure(error, fallback = 'VERIFICATION_FAILED') {
  return { code: typeof error?.code === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(error.code) ? error.code : fallback }
}

export async function finalizeVerification({ requestedStage, primaryFailure = null, checks, save, commands = [], ledger = [] }) {
  const result = { requestedStage, primaryFailure: primaryFailure ? safeFailure(primaryFailure) : null,
    cleanupFailures: [], preservationFailures: [], evidenceFailures: [], checks: [], entries: ledger,
    stageComplete: false, phase4Complete: false, realBusinessApi: 'not-run' }
  const persist = async (name, value) => {
    try { await save(name, value) }
    catch (error) { result.evidenceFailures.push({ name, ...safeFailure(error, 'EVIDENCE_WRITE_FAILED') }) }
  }
  for (const check of checks) {
    let item = { name: check.name, result: 'not-collected' }
    if (typeof check.run === 'function') {
      try {
        const detail = await check.run()
        item = { name: check.name, result: detail?.ok === true ? 'checked' : 'failed', detail }
        if (item.result === 'failed') item.error = safeFailure(detail, 'CHECK_FAILED')
      } catch (error) { item = { name: check.name, result: 'failed', error: safeFailure(error) } }
    }
    result.checks.push(item)
    if (item.result !== 'checked') result[check.kind === 'cleanup' ? 'cleanupFailures' : 'preservationFailures']
      .push({ name: check.name, ...(item.error ?? { code: 'BASELINE_NOT_COLLECTED' }) })
    await persist(`${check.name}.json`, item)
  }
  const summarize = () => {
    const failures = [result.primaryFailure, ...result.cleanupFailures, ...result.preservationFailures, ...result.evidenceFailures].filter(Boolean)
    const inspectionComplete = requestedStage === 'inspect' && ['standalone', 'better-sidebar'].every(mode =>
      ledger.some(item => item.layer === 'platform-contract' && item.mode === mode && item.result === 'verified'))
    result.exitCode = failures.length || !checks.length || (requestedStage === 'inspect' && !inspectionComplete) ? 1 : 0
    result.stageComplete = result.exitCode === 0 && (requestedStage === 'prepare' || inspectionComplete)
    result.status = failures.some(item => ['REAL_PROFILE_DRIFT', 'PROFILE_UNSTABLE', 'INTEGRATION_NOT_READY'].includes(item.code))
      ? 'BLOCKED_WAITING_FOR_USER' : result.exitCode ? 'FAIL' : 'STATIC_ONLY'
  }
  await persist('commands.json', commands)
  summarize()
  await persist('evidence-ledger.json', structuredClone(result))
  summarize()
  return result
}

export async function terminateOwnedProcessTree(child, context) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return { ok: true, alreadyExited: true }
  if (process.platform !== 'win32') throw failure('TREE_TERMINATION_UNSUPPORTED')
  if (!nativeContexts.has(context)) throw failure('NATIVE_CONTEXT_REQUIRED')
  await noLinks(context.cwd)
  for (const dir of ['ProgramData', 'ALLUSERSPROFILE', 'TEMP', 'TMP', 'APPDATA', 'LOCALAPPDATA']) await noLinks(context.env[dir])
  await verifyInspectionWindowsPaths(context.env)
  // Recheck ownership after asynchronous validation; never a process-name kill.
  if (child.exitCode !== null || child.signalCode !== null) return { ok: true, alreadyExited: true }
  const argv = ['/PID', String(child.pid), '/T', '/F']
  return new Promise(resolveKill => {
    const killer = spawn(context.executable, argv, { cwd: context.cwd, env: context.env, shell: false, windowsHide: true, stdio: 'ignore' })
    let error = null; let forced; let settled = false
    const done = (code, closed) => {
      if (settled) return
      settled = true; clearTimeout(timer); clearTimeout(forced)
      resolveKill({ ok: code === 0 && !error && closed, exitCode: code, closed, error, executable: context.executable, argv, cwd: context.cwd,
        environment: { SystemRoot: context.env.SystemRoot, SystemDrive: context.env.SystemDrive, ProgramData: context.env.ProgramData,
          ALLUSERSPROFILE: context.env.ALLUSERSPROFILE, TEMP: context.env.TEMP, TMP: context.env.TMP } })
    }
    const timer = setTimeout(() => {
      error = { code: 'TREE_TERMINATION_TIMEOUT' }; killer.kill('SIGKILL')
      forced = setTimeout(() => done(null, false), 1000)
    }, 5000)
    killer.once('error', value => { error = safeFailure(value) })
    killer.once('close', code => done(code, true))
  })
}

export async function runRecordedCommand({ executable, argv, cwd, env, timeoutMs = 60_000, terminateTree = false }) {
  const startedAt = new Date().toISOString()
  const nativeContext = terminateTree === true ? await createInspectionNativeContext(process.env) : null
  return new Promise(resolveRun => {
    let child; let timer; let forcedTimer; let timedOut = false; let spawnError = null; let stdout = ''; let stderr = ''; let termination; let finished = false
    const done = async (exitCode, signal, closed) => {
      if (finished) return
      finished = true; clearTimeout(timer); clearTimeout(forcedTimer)
      const treeTermination = termination ? await termination : null
      resolveRun({ executable, argv, cwd, startedAt, finishedAt: new Date().toISOString(),
        pid: child?.pid ?? null, exitCode: spawnError ? null : exitCode, closeCode: exitCode, signal, closed, timedOut, spawnError, treeTermination, stdout, stderr })
    }
    try { child = spawn(executable, argv, { cwd, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }) }
    catch (error) { spawnError = safeFailure(error, 'SPAWN_FAILED'); done(null, null, true); return }
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.once('error', error => { spawnError = safeFailure(error, 'SPAWN_FAILED') })
    child.once('close', (code, signal) => done(code, signal, true))
    timer = setTimeout(() => {
      timedOut = true
      // Only this owned ChildProcess is signalled; close is awaited before finalization.
      if (terminateTree) {
        const terminate = typeof terminateTree === 'function' ? terminateTree : terminateOwnedProcessTree
        termination = Promise.resolve().then(() => terminate(child, nativeContext)).catch(error => ({ ok: false, error: safeFailure(error) })).then(result => {
          if (!result.ok && !finished) {
            child.kill('SIGKILL')
            forcedTimer = setTimeout(() => { child.stdout.destroy(); child.stderr.destroy(); done(child.exitCode, child.signalCode, false) }, 5000)
          }
          return result
        })
      }
      else child.kill('SIGKILL')
    }, timeoutMs)
  })
}

export async function hashFiles(root, names) {
  const rows = []; const errors = []
  for (const name of names) {
    try {
      const target = resolve(root, name)
      assert.ok(within(root, target), 'protected path escaped root')
      const info = await lstat(target)
      if (info.isSymbolicLink()) {
        const link = await readlink(target)
        rows.push({ path: name, kind: 'link', size: info.size, sha256: sha256(link), target: link })
      } else {
        assert.ok(info.isFile(), 'protected entry must be a regular file')
        rows.push({ path: name, kind: 'file', size: info.size, sha256: await hashStableFile(target), target: '' })
      }
    } catch (error) { errors.push({ path: name, ...safeFailure(error, 'FILE_READ_FAILED') }) }
  }
  return { rows, errors, ok: errors.length === 0 }
}

function statIdentity(info) {
  return JSON.stringify([info.dev, info.ino, info.mode, info.size, info.mtimeMs, info.ctimeMs])
}

async function hashStableFile(name, afterHash = async () => {}) {
  const before = await lstat(name)
  if (!before.isFile() || before.isSymbolicLink()) throw failure('SNAPSHOT_UNSTABLE')
  const handle = await open(name, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
  try {
    if (statIdentity(await handle.stat()) !== statIdentity(before)) throw failure('SNAPSHOT_UNSTABLE')
    const hash = createHash('sha256')
    for await (const chunk of handle.createReadStream({ autoClose: false })) hash.update(chunk)
    await afterHash(name)
    if (statIdentity(await handle.stat()) !== statIdentity(before) || statIdentity(await lstat(name)) !== statIdentity(before)) throw failure('SNAPSHOT_UNSTABLE')
    return hash.digest('hex').toUpperCase()
  } finally { await handle.close() }
}

export async function snapshotTree(root, { afterHash = async () => {} } = {}) {
  await noLinks(root)
  async function inventory() {
    const rows = []
    async function walk(directory) {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const name = join(directory, entry.name); const info = await lstat(name)
        const path = relative(root, name).replaceAll('/', '\\')
        const common = { path, size: info.size, statSignature: statIdentity(info) }
        if (info.isSymbolicLink()) rows.push({ ...common, kind: 'link', target: await readlink(name) })
        else if (info.isDirectory()) { rows.push({ ...common, kind: 'directory', target: '' }); await walk(name) }
        else if (info.isFile()) rows.push({ ...common, kind: 'file', target: '' })
        else throw failure('UNSUPPORTED_FILESYSTEM_ENTRY')
      }
    }
    await walk(root)
    return rows.sort((a, b) => a.path.localeCompare(b.path, 'en'))
  }
  const before = await inventory(); let cursor = 0
  const rows = await Promise.all(before.map(row => ({ ...row })))
  // Bounded reads, with one final inventory to reject collection races.
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (cursor < rows.length) {
      const row = rows[cursor++]
      row.sha256 = row.kind === 'file' ? await hashStableFile(join(root, row.path), afterHash) : sha256(row.kind === 'link' ? row.target : 'directory')
    }
  }))
  if (JSON.stringify(await inventory()) !== JSON.stringify(before)) throw failure('SNAPSHOT_UNSTABLE')
  return rows
}

export async function requireStableProfile(root, {
  snapshot = snapshotTree, sleep = ms => new Promise(resolveWait => setTimeout(resolveWait, ms)), onSnapshot = async () => {},
} = {}) {
  let baseline
  for (let index = 0; index < 3; index++) {
    if (index) await sleep(5000)
    let current
    try { current = await snapshot(root) } catch { throw failure('PROFILE_UNSTABLE') }
    await onSnapshot(current, index)
    if (index && JSON.stringify(current) !== JSON.stringify(baseline)) throw failure('PROFILE_UNSTABLE')
    baseline ??= current
  }
  return baseline
}

async function checkedCopy(source, destination) {
  const actual = await realpath(source)
  await cp(actual, destination, { recursive: true, dereference: true, force: false, errorOnExist: true })
}

async function dependencySnapshot(root) {
  const rows = []
  async function walk(directory) {
    for (const name of (await readdir(directory)).sort()) {
      const target = join(directory, name); const info = await lstat(target); const path = relative(root, target)
      if (info.isSymbolicLink()) {
        const canonical = await realpath(target)
        if (!within(root, canonical) || !(await stat(canonical)).isDirectory()) throw failure('UNSAFE_DEPENDENCY_LINK')
        rows.push({ path, kind: 'link', target: await readlink(target), mappedTarget: relative(root, canonical), statSignature: statIdentity(info) })
      } else if (info.isDirectory()) {
        await noLinks(target)
        rows.push({ path, kind: 'directory', statSignature: statIdentity(info) }); await walk(target)
      } else if (info.isFile()) {
        rows.push({ path, kind: 'file', size: info.size, sha256: await hashStableFile(target), statSignature: statIdentity(info) })
      } else throw failure('UNSUPPORTED_DEPENDENCY_ENTRY')
    }
  }
  await walk(root)
  return rows.sort((a, b) => a.path.localeCompare(b.path, 'en'))
}

export async function copyIsolatedNodeModules(sourceRoot, destinationRoot, { afterCopy = async () => {} } = {}) {
  await noLinks(sourceRoot); await noLinks(destinationRoot)
  const source = await realpath(sourceRoot); const destination = resolve(destinationRoot)
  if (within(source, destination) || within(destination, source)) throw failure('DEPENDENCY_ROOT_OVERLAP')
  const before = await dependencySnapshot(source)
  await mkdir(destination)
  for (const row of before.filter(item => item.kind === 'directory').sort((a, b) => a.path.length - b.path.length)) await mkdir(join(destination, row.path))
  for (const row of before.filter(item => item.kind === 'file')) {
    const target = join(destination, row.path)
    await copyFile(join(source, row.path), target, constants.COPYFILE_EXCL)
    if (sha256(await readFile(target)) !== row.sha256) throw failure('DEPENDENCY_SOURCE_DRIFT')
  }
  const links = []
  for (const row of before.filter(item => item.kind === 'link')) {
    const target = join(destination, row.mappedTarget); const link = join(destination, row.path)
    await noLinks(target)
    if (!within(destination, target) || !(await lstat(target)).isDirectory()) throw failure('UNSAFE_DEPENDENCY_LINK')
    await symlink(process.platform === 'win32' ? target : relative(dirname(link), target), link, process.platform === 'win32' ? 'junction' : 'dir')
    const resolved = await realpath(link)
    if (!within(destination, resolved) || relative(destination, resolved) !== row.mappedTarget) throw failure('DEPENDENCY_LINK_ESCAPE')
    links.push({ path: row.path, mappedTarget: row.mappedTarget })
  }
  await afterCopy()
  if (JSON.stringify(await dependencySnapshot(source)) !== JSON.stringify(before)) throw failure('DEPENDENCY_SOURCE_DRIFT')
  const copied = await dependencySnapshot(destination)
  const normalized = rows => rows.map(({ target, statSignature, ...rest }) => rest)
  if (JSON.stringify(normalized(copied)) !== JSON.stringify(normalized(before))) throw failure('DEPENDENCY_COPY_DRIFT')
  return { source, destination, files: before.filter(item => item.kind === 'file').length, links, inputSha256: sha256(JSON.stringify(before)) }
}

export async function verifyPackageTarball(file, expected) {
  // Reuse npm's already installed reader; no package installation or extraction.
  const tar = createRequire(npmCli)('tar')
  const files = []; let invalid = false
  await tar.t({ file, strict: true, onentry(entry) {
    const name = entry.path.startsWith('package/') ? entry.path.slice(8) : null
    if (name === null || name.includes('\\') || name.split('/').some(part => part === '.' || part === '..')) invalid = true
    if (entry.type === 'Directory') {
      if (name && !expected.some(item => item.path.startsWith(name.endsWith('/') ? name : `${name}/`))) invalid = true
      return
    }
    if (entry.type !== 'File') { invalid = true; return }
    const hash = createHash('sha256')
    entry.on('data', chunk => hash.update(chunk))
    entry.on('end', () => { files.push({ path: name, sha256: hash.digest('hex').toUpperCase() }) })
  } })
  files.sort((a, b) => a.path.localeCompare(b.path, 'en'))
  const wanted = expected.map(({ path, sha256 }) => ({ path, sha256 })).sort((a, b) => a.path.localeCompare(b.path, 'en'))
  if (invalid || JSON.stringify(files) !== JSON.stringify(wanted)) throw failure('TARBALL_CONTENT_MISMATCH')
  return { path: file, sha256: await hashStableFile(file), files }
}

async function installedDependency(name, anchor) {
  for (let cursor = anchor; ; cursor = dirname(cursor)) {
    const candidate = join(cursor, 'node_modules', ...name.split('/'))
    try {
      const manifest = JSON.parse(await readFile(join(candidate, 'package.json'), 'utf8'))
      assert.equal(manifest.name, name)
      return { name, path: await realpath(candidate), manifest }
    } catch (error) { if (error.code !== 'ENOENT') throw error }
    if (dirname(cursor) === cursor) break
  }
  throw new Error(`OFFLINE_DEPENDENCY_MISSING: ${name}`)
}

async function dependencyClosure(roots) {
  const pending = [...roots]; const packages = new Map()
  while (pending.length) {
    const item = pending.shift()
    const previous = packages.get(item.name)
    if (previous) {
      assert.equal(previous.manifest.version, item.manifest.version, `OFFLINE_VERSION_AMBIGUOUS: ${item.name}`)
      continue
    }
    packages.set(item.name, item)
    for (const name of Object.keys(item.manifest.dependencies ?? {})) pending.push(await installedDependency(name, item.path))
    for (const name of Object.keys(item.manifest.optionalDependencies ?? {})) {
      try {
        const dependency = await installedDependency(name, item.path)
        if (dependency.manifest.os && !dependency.manifest.os.includes(process.platform)) continue
        if (dependency.manifest.cpu && !dependency.manifest.cpu.includes(process.arch)) continue
        pending.push(dependency)
      } catch (error) { if (!error.message.startsWith('OFFLINE_DEPENDENCY_MISSING:')) throw error }
    }
  }
  return [...packages.values()]
}

export async function copyInspectionPackages(sourceRoot, rootName, destination, { afterCopy = async () => {} } = {}) {
  await noLinks(sourceRoot); await noLinks(destination)
  const source = await realpath(sourceRoot)
  const find = async (name, anchor) => {
    if (!/^(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/i.test(name)) throw failure('INVALID_PACKAGE_NAME')
    for (let cursor = anchor; within(source, cursor); cursor = dirname(cursor)) {
      const candidate = cursor === source ? join(source, name) : join(cursor, 'node_modules', name)
      try {
        await noLinks(candidate)
        const manifest = JSON.parse(await readFile(join(candidate, 'package.json'), 'utf8'))
        if (manifest.name !== name) throw failure('OFFLINE_PACKAGE_IDENTITY')
        return { path: await realpath(candidate), name, manifest }
      } catch (error) { if (error.code !== 'ENOENT') throw error }
    }
    throw failure('OFFLINE_DEPENDENCY_MISSING')
  }
  const pending = [await find(rootName, source)]; const packages = new Map(); const omittedOptional = []
  while (pending.length) {
    const item = pending.shift()
    if (packages.has(item.path)) continue
    packages.set(item.path, item)
    const optional = item.manifest.optionalDependencies ?? {}
    for (const name of new Set([...Object.keys(item.manifest.dependencies ?? {}), ...Object.keys(optional)])) {
      try { pending.push(await find(name, item.path)) }
      catch (error) {
        if (!(name in optional) || error.code !== 'OFFLINE_DEPENDENCY_MISSING') throw error
        omittedOptional.push({ parent: relative(source, item.path), name })
      }
    }
  }
  // Preserve physical lookup paths, including nested versions; never collapse by name.
  const roots = [...packages.keys()].filter(item => ![...packages.keys()].some(parent => parent !== item && within(parent, item)))
  const snapshots = []
  for (const item of roots) {
    const rows = await snapshotTree(item)
    if (rows.some(row => row.kind === 'link')) throw failure('INSPECTION_SOURCE_LINK')
    snapshots.push({ path: relative(source, item), rows })
  }
  await mkdir(destination)
  const normalize = rows => rows.map(({ statSignature, ...row }) => row)
  for (const item of snapshots) {
    const target = join(destination, item.path)
    await mkdir(dirname(target), { recursive: true })
    await checkedCopy(join(source, item.path), target)
    if (JSON.stringify(normalize(await snapshotTree(target))) !== JSON.stringify(normalize(item.rows))) throw failure('DEPENDENCY_COPY_DRIFT')
  }
  await afterCopy()
  for (const item of snapshots) if (JSON.stringify(await snapshotTree(join(source, item.path))) !== JSON.stringify(item.rows)) throw failure('DEPENDENCY_SOURCE_DRIFT')
  return { source, destination, packages: [...packages.values()].map(item => ({ name: item.name, version: item.manifest.version, path: relative(source, item.path) })), omittedOptional,
    inputSha256: sha256(JSON.stringify(snapshots)) }
}

export function parseVerificationArgs(args) {
  const options = { stage: 'integration' }; const allowed = new Set(['--evidence', '--modes', '--offline', '--stage']); const seen = new Set()
  for (let i = 0; i < args.length; i++) {
    assert.ok(allowed.has(args[i]), 'unknown argument; no remote URL/credential options accepted')
    assert.ok(!seen.has(args[i]), 'duplicate argument rejected'); seen.add(args[i])
    if (args[i] === '--offline') options.offline = true
    else {
      assert.ok(typeof args[i + 1] === 'string' && args[i + 1].length > 0 && !args[i + 1].startsWith('--'), 'argument value required')
      options[args[i].slice(2)] = args[++i]
    }
  }
  assert.equal(options.offline, true, 'offline flag is mandatory')
  assert.ok(options.evidence, 'fresh evidence path required')
  if (options.stage === 'browser-preflight') assert.equal(options.modes, undefined, 'browser preflight has no DSH modes')
  else assert.equal(options.modes, 'standalone,better-sidebar', 'both modes in fixed order required')
  assert.ok(['prepare', 'inspect', 'integration', 'browser-preflight'].includes(options.stage), 'unknown stage')
  return options
}

async function saveBlockedIntegration(options) {
  const evidence = await claimEvidenceRoot(resolve(projectRoot, options.evidence), join(projectRoot, 'docs/evidence/oasis-api-phase4-2026-09-02'))
  await writeFile(join(evidence, 'evidence-ledger.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), status: 'BLOCKED_WAITING_FOR_USER', requestedStage: options.stage,
    primaryFailure: { code: 'INTEGRATION_NOT_READY' }, stageComplete: false, phase4Complete: false,
    requirements: ['browser-driver-not-implemented', 'public-settings-credentials-ui-not-ready'],
    commands: [], profileAccessed: false, hostStarted: false, browserStarted: false,
  }, null, 2), { flag: 'wx' })
}

export async function runVerification(args, { prepare = runPrepareVerification, inspect = runInspectionVerification, browserPreflight = runBrowserPreflight, saveBlocked = saveBlockedIntegration } = {}) {
  const options = parseVerificationArgs(args)
  if (options.stage === 'browser-preflight') return browserPreflight(options)
  if (options.stage === 'inspect') return inspect(options)
  if (options.stage !== 'prepare') {
    await saveBlocked(options)
    throw failure('INTEGRATION_NOT_READY')
  }
  return prepare(options)
}

async function runInspectionVerification(options) {
  await verifyInspectionWindowsPaths(inspectionEnvironment(process.env, join(tmpdir(), 'oasis-dsh-p4-preflight')))
  // Inspect consumes a proven prepare baseline but collects its own fresh run.
  const prepared = JSON.parse(await readFile(join(projectRoot, 'docs/evidence/oasis-api-phase4-2026-09-02/attempt-003/evidence-ledger.json'), 'utf8'))
  if (prepared.requestedStage !== 'prepare' || prepared.exitCode !== 0 || prepared.stageComplete !== true) throw failure('PREPARE_EVIDENCE_REQUIRED')
  for (const file of [inspectionPlaywright, inspectionBrowser, inspectionPnpm, join(inspectionProbe, 'package.json'), join(inspectionProbe, 'src/index.js'), join(inspectionProbe, 'cordis.patch.yml')]) {
    if (!(await stat(file)).isFile()) throw failure('INSPECTION_PREREQUISITE_MISSING')
  }
  return runPrepareVerification(options)
}

export function assertInspectionNativeEnvironment(env) {
  const values = windowsValues(env)
  if (!/^[a-z]:$/i.test(values.systemdrive ?? '') || ['systemroot', 'windir', 'comspec', 'programdata', 'allusersprofile', 'temp', 'tmp'].some(key => !absoluteWindowsPath(values[key]))) throw failure('INSPECTION_WINDOWS_ENVIRONMENT_INCOMPLETE')
  if (win32.parse(values.systemroot).root.slice(0, 2).toLowerCase() !== values.systemdrive.toLowerCase() ||
    win32.normalize(values.windir).toLowerCase() !== win32.normalize(values.systemroot).toLowerCase() ||
    win32.normalize(values.comspec).toLowerCase() !== win32.join(values.systemroot, 'System32/cmd.exe').toLowerCase() ||
    win32.normalize(values.programdata).toLowerCase() !== win32.normalize(values.allusersprofile).toLowerCase()) throw failure('INSPECTION_WINDOWS_ENVIRONMENT_INCOMPLETE')
}

const INSPECTION_ROOTS = ['settings.section', 'settings.plugins.tab', 'settings.plugin.item', 'conversation.input.right', 'shell.overlay', 'details']
const inspectionPlaywright = PLAYWRIGHT_ENTRY
const inspectionPnpm = join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm.cmd')
const inspectionBrowser = BROWSER_EXECUTABLE
const inspectionProbe = join(projectRoot, 'tests/fixtures/oasis-api-phase4-slot-probe')
const delay = ms => new Promise(resolveDelay => setTimeout(resolveDelay, ms))

export function verifyOwnedWorkerIdentity(expected, rows) {
  return !!expected && Number.isInteger(expected.pid) && typeof expected.created === 'string' && expected.created.length > 0 &&
    Array.isArray(rows) && rows.some(row => row.pid === expected.pid && row.created === expected.created)
}

export function classifyInspectionPeers(rows) {
  const clientOnly = name => name === 'react' || name === 'react-dom' || name.startsWith('@deepseek-ai/dsh-client-')
  const result = rows.map(row => ({ ...row, surface: clientOnly(row.name) ? 'client' : 'host',
    physicalMatches: row.version === row.expected, clientRuntimeVersion: null,
    compatibility: clientOnly(row.name) ? 'unverified-client-loader' : row.version === row.expected ? 'physical-match' : 'unresolved' }))
  return { rows: result, hostReady: result.filter(row => row.surface === 'host').every(row => row.physicalMatches),
    compatibilityComplete: result.length > 0 && result.every(row => row.physicalMatches && row.surface === 'host') }
}

export async function collectInspectionPeers(installedRoot, modeRoot) {
  const manifest = JSON.parse(await readFile(join(installedRoot, 'package.json'), 'utf8'))
  const rows = []
  for (const [name, expected] of Object.entries(manifest.peerDependencies ?? {})) {
    let item
    try { item = await installedDependency(name, await realpath(installedRoot)) }
    catch (error) { if (!error.message.startsWith('OFFLINE_DEPENDENCY_MISSING:')) throw error }
    if (item && !within(modeRoot, item.path)) throw failure('INSPECTION_PEER_ESCAPE')
    rows.push({ name, expected, version: item?.manifest.version ?? null, path: item?.path ?? null })
  }
  return classifyInspectionPeers(rows)
}

// The query emits identities only, never command lines. The marker is a newly
// allocated directory, not a user supplied expression or executable selector.
const browserCensusQuery = "$ErrorActionPreference='Stop'; $r=$env:OASIS_BROWSER_ROOT; @(Get-CimInstance Win32_Process | ForEach-Object { [pscustomobject]@{pid=[int]$_.ProcessId; parent=[int]$_.ParentProcessId; created=if($_.CreationDate){$_.CreationDate.ToUniversalTime().ToString('o')}else{''}; name=$_.Name; tagged=[bool](($_.Name -eq 'msedge.exe' -or $_.Name -eq 'node.exe') -and $_.CommandLine -and $_.CommandLine.IndexOf($r,[System.StringComparison]::OrdinalIgnoreCase) -ge 0)} }) | ConvertTo-Json -Compress"

async function browserProcessCensus(context) {
  const result = await runRecordedCommand({ executable: join(context.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe'),
    argv: ['-NoProfile', '-NonInteractive', '-Command', browserCensusQuery], cwd: context.cwd,
    env: { ...context.env, OASIS_BROWSER_ROOT: context.cwd }, timeoutMs: 5000, terminateTree: true })
  if (result.exitCode !== 0 || !result.closed || result.timedOut || result.treeTermination?.ok === false) {
    const error = failure('BROWSER_PROCESS_CENSUS_UNAVAILABLE')
    error.command = { exitCode: result.exitCode, closed: result.closed, timedOut: result.timedOut, spawnError: result.spawnError }
    throw error
  }
  let rows
  try { rows = JSON.parse(result.stdout); if (!Array.isArray(rows)) rows = [rows] } catch { throw failure('BROWSER_PROCESS_CENSUS_INVALID') }
  if (!rows.length || rows.some(row => !Number.isInteger(row.pid) || !Number.isInteger(row.parent) || typeof row.created !== 'string' || typeof row.tagged !== 'boolean')) throw failure('BROWSER_PROCESS_CENSUS_INVALID')
  return rows
}

function ownedProcessRows(rows, workerPid) {
  const ids = new Set(workerPid ? [workerPid] : [])
  for (let changed = true; changed;) {
    changed = false
    for (const row of rows) if (!ids.has(row.pid) && (ids.has(row.parent) || row.tagged)) { ids.add(row.pid); changed = true }
  }
  return rows.filter(row => ids.has(row.pid))
}

export function createBrowserLogCollector() {
  const decoder = new StringDecoder('utf8')
  const result = { schemaVersion: 1, source: 'playwright-debug', text: '', truncated: false, ambiguous: false, events: [] }
  let pending = ''; let pendingBytes = 0; let dropping = false; let ended = false; let savedBytes = 0
  const generations = new Map()
  const iso = '(\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z)'
  const launch = new RegExp(`^${iso} pw:browser <launched> pid=(\\d+)$`)
  const close = new RegExp(`^${iso} pw:browser \\[pid=(\\d+)\\] <process did exit: exitCode=(-?\\d+|null), signal=(SIGTERM|SIGKILL|SIGINT|SIGABRT|null)>$`)
  const line = raw => {
    const value = raw.replace(/\r$/, '')
    const start = launch.exec(value); const end = close.exec(value); const match = start ?? end
    if (match) {
      const pid = Number(match[2]); const logAt = match[1]
      if (!Number.isSafeInteger(pid) || pid <= 0 || !Number.isFinite(Date.parse(logAt))) result.ambiguous = true
      else if (result.events.length >= 64) result.truncated = true
      else {
        const old = generations.get(pid)
        if (start ? !!old : !old || old.exited || Date.parse(logAt) < Date.parse(old.logAt)) result.ambiguous = true
        if (start) generations.set(pid, { logAt, exited: false })
        else if (old) old.exited = true
        result.events.push({ source: 'playwright-debug', receivedAt: new Date().toISOString(), logAt, pid,
          type: start ? 'launch' : 'exit', ...(end ? { exitCode: end[3] === 'null' ? null : Number(end[3]), signal: end[4] === 'null' ? null : end[4] } : {}) })
      }
    }
    const clean = value.replace(/\b(?:authorization|api[_-]?key|access[_-]?token|cookie)\s*[:=].*/gi, '[REDACTED]')
      .replace(/\bBearer\s+\S+/gi, '[REDACTED]') + '\n'
    const size = Buffer.byteLength(clean)
    if (savedBytes + size <= 262144) { result.text += clean; savedBytes += size }
    else result.truncated = true
  }
  const consume = text => {
    for (const char of text) {
      if (char === '\n') {
        if (!dropping) line(pending)
        pending = ''; pendingBytes = 0; dropping = false
      } else if (!dropping) {
        pendingBytes += Buffer.byteLength(char)
        if (pendingBytes > 16384) { result.truncated = true; dropping = true; pending = '' }
        else pending += char
      }
    }
  }
  return {
    write(chunk) { if (ended) throw failure('BROWSER_LOG_ALREADY_ENDED'); consume(decoder.write(Buffer.from(chunk))) },
    end() {
      if (!ended) { consume(decoder.end()); if (pending || dropping) result.truncated = true; ended = true }
      return structuredClone(result)
    },
  }
}

export function assessBrowserClosure({ workerSpawned, workerClosed, launchRequested, workerIdentity,
  observed = [], log, finalSnapshots = [], censusFailure = false }) {
  const reasons = new Set()
  const valid = row => Number.isInteger(row?.pid) && row.pid > 0 && typeof row.created === 'string' && Number.isFinite(Date.parse(row.created))
  const events = Array.isArray(log?.events) ? log.events : []
  const roots = observed.filter(row => row.name?.toLowerCase() === 'msedge.exe')
  const rootPids = [...new Set(events.map(row => row.pid))]
  const logOnlyRoots = rootPids.filter(pid => !roots.some(row => row.pid === pid && valid(row))).map(pid => ({ pid,
    launchLogged: events.some(row => row.pid === pid && row.type === 'launch'), exitLogged: events.some(row => row.pid === pid && row.type === 'exit') }))
  const result = { status: 'unknown', reasonCodes: [], workerClosed: workerClosed === true,
    observedRoots: roots.filter(valid).map(({ pid, created }) => ({ pid, created })), logOnlyRoots,
    finalSnapshots, scope: 'observed-tree-and-marker; not an OS job guarantee' }
  if (workerSpawned === false && workerClosed === true && launchRequested === false && !observed.length && !events.length && !log?.truncated) {
    result.status = 'not-started'; return result
  }
  if (workerClosed !== true) reasons.add('WORKER_EXIT_UNCONFIRMED')
  if (!valid(workerIdentity) || !observed.some(row => row.pid === workerIdentity.pid && row.created === workerIdentity.created) ||
    observed.some(row => !valid(row))) reasons.add('PROCESS_IDENTITY_INVALID')
  const generations = new Map()
  for (const row of observed) {
    if (generations.has(row.pid) && generations.get(row.pid) !== row.created) reasons.add('PID_GENERATION_AMBIGUOUS')
    generations.set(row.pid, row.created)
  }
  if (log?.ambiguous) reasons.add('PID_GENERATION_AMBIGUOUS')
  if (!log || log.truncated) reasons.add('LOG_TRUNCATED')
  if (logOnlyRoots.length || (launchRequested && !roots.some(valid))) reasons.add('BROWSER_ROOT_IDENTITY_UNCAPTURED')
  if (launchRequested && !events.some(row => row.type === 'launch')) reasons.add('BROWSER_LAUNCH_LOG_UNAVAILABLE')
  if (censusFailure || finalSnapshots.length !== 2 || finalSnapshots.some(row => !Number.isFinite(Date.parse(row.at)) || !Array.isArray(row.owned)) ||
    Date.parse(finalSnapshots[1]?.at) - Date.parse(finalSnapshots[0]?.at) < 2000) reasons.add('PROCESS_CENSUS_UNAVAILABLE')
  if (finalSnapshots.some(row => row.owned?.length)) reasons.add('OWNED_PROCESS_REMAINS')
  result.reasonCodes = [...reasons]
  result.status = reasons.has('OWNED_PROCESS_REMAINS') ? 'residual' : reasons.size ? 'unknown' : 'confirmed'
  return result
}

export function browserPreflightMetadata() {
  return { requestedStage: 'browser-preflight', generatedAt: new Date().toISOString(), stageComplete: false, phase4Complete: false,
    preflightComplete: false, selectedMethod: null, cases: [], realProfileAccessed: false, dshStarted: false,
    identityComparison: { performed: false, reason: 'single-context-run' },
    proofCoverage: { osProfileAccessObserved: false, osNetworkObserved: false, realProfileAccessedScope: 'explicit DSH Profile reads only' } }
}

export async function runOwnedBrowser({ task, mode, method, baseUrl, title, save, afterPageReady = async () => {} }) {
  assertLoopbackUrl(baseUrl)
  const state = createBrowserLifecycle(mode)
  const context = await createInspectionNativeContext(process.env)
  state.runtimeRoot = context.cwd; state.method = method
  let child; let workerIdentity; let workerClosed = false; let completed = false; let timer; let monitor; let monitoring = false
  let chain = Promise.resolve(); let finish; let closedResolve; let monitorFailure = null
  const done = new Promise(resolveDone => { finish = resolveDone })
  const closed = new Promise(resolveClosed => { closedResolve = resolveClosed })
  const history = new Map(); const censuses = []; const finalSnapshots = []
  const stdoutLog = createBrowserLogCollector(); const stderrLog = createBrowserLogCollector()
  const problem = (error, phase = 'ipc') => { state.primaryFailure ??= safeFailure(error, 'BROWSER_WORKER_FAILED'); state.failedPhase ??= phase; finish() }
  const census = async () => {
    const requestedAt = new Date().toISOString(); const started = Date.now()
    const rows = await browserProcessCensus(context)
    const owned = ownedProcessRows(rows, child?.pid)
    for (const row of owned) history.set(`${row.pid}:${row.created}`, row)
    if (owned.some(row => row.name.toLowerCase() === 'msedge.exe')) state.browserProcessObserved = true
    const completedAt = new Date().toISOString()
    censuses.push({ at: completedAt, requestedAt, completedAt, durationMs: Date.now() - started, owned })
    return rows
  }
  try {
    await save('browser-runtime.json', { cwd: context.cwd, environment: context.env, method, task })
    // Fail before spawning even the worker if this identity cannot observe it.
    const initial = await census()
    if (initial.some(row => row.tagged)) throw failure('BROWSER_RUNTIME_ALREADY_OWNED')
    child = spawn(process.execPath, [join(projectRoot, 'scripts/oasis-api-phase4-browser-worker.mjs')], {
      cwd: context.cwd, env: { ...context.env, DEBUG: 'pw:browser' }, shell: false, windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    })
    state.workerPid = child.pid ?? null; state.workerSpawned = !!child.pid
    child.stdout.on('data', chunk => stdoutLog.write(chunk))
    child.stderr.on('data', chunk => stderrLog.write(chunk))
    child.once('error', error => problem(error, 'bootstrap'))
    child.once('close', (code, signal) => {
      workerClosed = true; state.workerExit = { code, signal }; closedResolve()
      if (!completed) problem(failure('BROWSER_WORKER_CRASH'), 'bootstrap')
    })
    const identityRows = await census()
    workerIdentity = identityRows.find(row => row.pid === child.pid)
    if (!verifyOwnedWorkerIdentity(workerIdentity, identityRows)) throw failure('BROWSER_WORKER_IDENTITY_UNKNOWN')
    child.on('message', message => {
      chain = chain.then(async () => {
        if (message?.type === 'done') {
          if (completed || message.mode !== mode || message.sequence !== state.sequence + 1 || !['closed', 'closing'].includes(state.phase)) throw failure('BROWSER_IPC_INVALID')
          completed = true; finish(); return
        }
        applyBrowserEvent(state, message)
        if (message.type === 'context-connected') {
          await census()
          if (!state.browserProcessObserved) throw failure('BROWSER_PROCESS_IDENTITY_UNKNOWN')
        }
        if (message.type === 'page-ready') await afterPageReady()
        child.send({ type: 'ack', sequence: message.sequence }, error => { if (error) problem(failure('BROWSER_IPC_FAILED')) })
      }).catch(error => problem(error))
    })
    timer = setTimeout(() => problem(failure('BROWSER_WORKER_TIMEOUT'), state.contextConnected ? 'inspection' : 'launch'), task === 'preflight' ? 75000 : 180000)
    monitor = setInterval(() => {
      if (monitoring) return
      monitoring = true
      census().catch(error => { monitorFailure = safeFailure(error); problem(error) }).finally(() => { monitoring = false })
    }, 750)
    child.send({ type: 'init', config: { task, mode, method, baseUrl, ...(title ? { title } : {}) } }, error => { if (error) problem(failure('BROWSER_IPC_FAILED')) })
    await done
  } catch (error) { problem(error, 'bootstrap'); if (error.command) state.censusFailure = error.command }
  finally {
    clearTimeout(timer); clearInterval(monitor)
    // The supervisor, not the presence of a Playwright object, owns termination.
    if (child && !workerClosed) {
      try {
        const rows = await census()
        if (!verifyOwnedWorkerIdentity(workerIdentity, rows)) throw failure('BROWSER_WORKER_IDENTITY_CHANGED')
        const descendants = ownedProcessRows(rows, child.pid).filter(row => row.pid !== child.pid)
        if (completed && state.apiClosed && !descendants.length) child.send({ type: 'exit' })
        else {
          state.treeTermination = await terminateOwnedProcessTree(child, context)
          if (!state.treeTermination.ok) throw failure('BROWSER_TREE_TERMINATION_FAILED')
        }
        await Promise.race([closed, delay(5000)])
        if (!workerClosed) {
          const current = await census()
          if (!verifyOwnedWorkerIdentity(workerIdentity, current)) throw failure('BROWSER_WORKER_IDENTITY_CHANGED')
          state.treeTermination = await terminateOwnedProcessTree(child, context)
          await Promise.race([closed, delay(2000)])
        }
      } catch (error) {
        state.cleanupFailures.push(safeFailure(error, 'BROWSER_CLEANUP_FAILED'))
        // Last resort is this held ChildProcess handle only, never an arbitrary
        // PID or name. It cannot establish descendant termination evidence.
        if (!workerClosed) {
          state.rootOnlyTermination = true
          child.kill('SIGKILL')
          await Promise.race([closed, delay(2000)])
        }
      }
    }
    let censusFailed = false
    if (child) {
      try {
        // Wait for the bounded in-flight monitor before recording final censuses.
        const deadline = Date.now() + 6500
        while (monitoring && Date.now() < deadline) await delay(25)
        if (monitoring || monitorFailure) throw failure('BROWSER_PROCESS_CENSUS_UNAVAILABLE')
        for (let index = 0; index < 2; index++) {
          if (index) await delay(2000)
          const rows = await census()
          finalSnapshots.push({ at: new Date().toISOString(), owned: rows.filter(row => row.tagged ||
            [...history.values()].some(old => old.pid === row.pid && old.created === row.created)) })
        }
      } catch (error) { censusFailed = true; state.cleanupFailures.push(safeFailure(error)) }
    }
    if (!child) workerClosed = true
    if (child && !workerClosed) {
      child.stdout.destroy(); child.stderr.destroy()
      if (child.connected) child.disconnect()
      child.unref()
    }
    const stdout = stdoutLog.end(); const stderr = stderrLog.end()
    const logPids = [...new Set(stderr.events.filter(row => row.type === 'launch').map(row => row.pid))]
    state.closureAssessment = assessBrowserClosure({ workerSpawned: !!child, workerClosed, launchRequested: state.launchRequested,
      workerIdentity, observed: [...history.values()], log: { ...stderr, truncated: stderr.truncated || stdout.truncated }, finalSnapshots, censusFailure: censusFailed })
    const confirmed = ['confirmed', 'not-started'].includes(state.closureAssessment.status)
    let playwrightBundleHash = null
    try { playwrightBundleHash = sha256(await readFile(join(dirname(PLAYWRIGHT_ENTRY), '../playwright-core/lib/coreBundle.js'))) }
    catch { state.evidenceFailures.push({ code: 'PLAYWRIGHT_SOURCE_HASH_UNAVAILABLE' }) }
    state.processEvidence = { workerIdentity: workerIdentity ?? null, observed: [...history.values()], browserLogPids: logPids, censuses,
      logEvents: stderr.events, logContractVersion: stderr.schemaVersion, playwrightBundleHash, finalSnapshots,
      scope: 'owned-worker-descendants-and-isolated-marker; not an OS job guarantee' }
    for (const [name, value] of [['browser-stdout.json', stdout], ['browser-stderr.json', stderr]]) {
      try { await save(name, value) } catch (error) { state.evidenceFailures.push(safeFailure(error, 'EVIDENCE_WRITE_FAILED')) }
    }
    await settleBrowserLifecycle(state, { workerClosed, censusConfirmed: confirmed, save: value => save('browser-lifecycle.json', value) })
  }
  if (state.ok) {
    const screenshot = join(context.cwd, task === 'preflight' ? 'preflight.png' : 'settings.png')
    await noLinks(screenshot)
    if (!(await stat(screenshot)).isFile()) throw failure('BROWSER_SCREENSHOT_MISSING')
    await save('browser-screenshot.json', { path: screenshot, sha256: sha256(await readFile(screenshot)) })
  }
  return state
}

async function browserPreflightCase({ method, save }) {
  const server = createHttpServer((request, response) => {
    if (request.method !== 'GET' || !['/', '/favicon.ico'].includes(request.url)) { response.writeHead(403); response.end(); return }
    response.writeHead(200, { 'content-type': request.url === '/' ? 'text/html; charset=utf-8' : 'image/x-icon', 'cache-control': 'no-store' })
    response.end(request.url === '/' ? '<!doctype html><title>Oasis browser preflight</title><div data-testid="oasis-browser-preflight">Isolated browser ready</div>' : '')
  })
  let port; let result; let primary
  try {
    await new Promise((ok, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', ok) })
    port = server.address().port
    result = await runOwnedBrowser({ task: 'preflight', mode: 'preflight', method, baseUrl: `http://127.0.0.1:${port}`, save })
  } catch (error) { primary = error }
  finally {
    server.closeAllConnections()
    if (server.listening) await new Promise((ok, reject) => server.close(error => error ? reject(error) : ok()))
    const portClosed = port === undefined || !await portOpen(port)
    await save('static-server.json', { port: port ?? null, portClosed, host: '127.0.0.1', dsh: false })
    if (!portClosed) primary ??= failure('PREFLIGHT_PORT_NOT_CLOSED')
  }
  if (primary) throw primary
  return result
}

export async function runBrowserPreflight(options) {
  const evidence = await claimEvidenceRoot(resolve(projectRoot, options.evidence), join(projectRoot, 'docs/evidence/oasis-api-phase4-browser-remediation-2026-09-03/attempt-001'))
  const save = (name, value) => writeFile(join(evidence, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' })
  const result = browserPreflightMetadata()
  let primary
  try {
    for (const [name, method] of [['A', 'persistent'], ['B', 'ephemeral']]) {
      const dir = join(evidence, name); await mkdir(dir)
      const state = await browserPreflightCase({ method, save: (name, value) => writeFile(join(dir, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }) })
      result.cases.push({ name, method, ok: state.ok, closed: state.closed, error: state.primaryFailure })
      if (!state.closed || state.evidenceFailures.length || state.cleanupFailures.length || state.primaryFailure?.code === 'BROWSER_PROCESS_CENSUS_UNAVAILABLE') throw failure(state.primaryFailure?.code ?? 'BROWSER_PREFLIGHT_UNSAFE')
    }
    const candidate = result.cases.find(row => row.name === 'B' && row.ok) ?? result.cases.find(row => row.name === 'A' && row.ok)
    if (!candidate) throw failure('BROWSER_IDENTITY_COMPARISON_REQUIRES_APPROVAL')
    for (let index = 1; index <= 2; index++) {
      const dir = join(evidence, `repeat-${index}`); await mkdir(dir)
      const state = await browserPreflightCase({ method: candidate.method, save: (name, value) => writeFile(join(dir, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }) })
      result.cases.push({ name: `repeat-${index}`, method: candidate.method, ok: state.ok, closed: state.closed, error: state.primaryFailure })
      if (!state.ok) throw failure('BROWSER_PREFLIGHT_NOT_STABLE')
    }
    result.selectedMethod = candidate.method; result.preflightComplete = true
  } catch (error) { primary = error; result.primaryFailure = safeFailure(error) }
  result.exitCode = primary ? 1 : 0
  await save('preflight-result.json', result)
  if (primary) throw primary
  return result
}

export async function requireInspectionBrowserPreflight(options, preflight = runBrowserPreflight) {
  const result = await preflight({ stage: 'browser-preflight', evidence: join(options.evidence, 'browser-preflight'), offline: true })
  if (result?.preflightComplete !== true || result.exitCode !== 0 || !['persistent', 'ephemeral'].includes(result.selectedMethod)) throw failure('BROWSER_PREFLIGHT_REQUIRED')
  return result.selectedMethod
}

async function inspectionRpc(baseUrl, method, payload) {
  assertLoopbackUrl(baseUrl)
  if (!['workspace.create', 'session.create', 'session.rename'].includes(method)) throw failure('INSPECTION_RPC_NOT_ALLOWED')
  const rpcId = `inspect-${method}`
  const response = await fetch(`${baseUrl}/api/${method}`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId, method, payload }) })
  const body = await response.json()
  if (!response.ok || body?.rpcId !== rpcId || body.result?.ok !== true) throw failure('INSPECTION_RPC_FAILED')
  return body.result.value
}

async function inspectBrowser({ baseUrl, modeRoot, save, mode, resources, browserMethod }) {
  if (!['persistent', 'ephemeral'].includes(browserMethod)) throw failure('BROWSER_PREFLIGHT_REQUIRED')
  const workspace = await inspectionRpc(baseUrl, 'workspace.create', { path: join(modeRoot, 'workspace-a') })
  const session = await inspectionRpc(baseUrl, 'session.create', { workspaceId: workspace.workspace.workspaceId })
  const title = `Oasis inspect ${mode}`
  await inspectionRpc(baseUrl, 'session.rename', { sessionId: session.sessionId, title })
  await save(`${mode}-inspection-identities.json`, { workspaceId: workspace.workspace.workspaceId, sessionId: session.sessionId, title })
  let contracts
  const state = await runOwnedBrowser({ task: 'inspect', mode, method: browserMethod, baseUrl, title,
    save: (name, value) => save(`${mode}-${name}`, value), afterPageReady: async () => {
      contracts = await collectSlotContracts({ query: async root => {
        const url = new URL('/__oasis-phase4-slot-contract', baseUrl)
        url.searchParams.set('sessionId', session.sessionId)
        if (root !== null) url.searchParams.set('root', root)
        const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(12000) })
        if (!response.ok) throw failure('SLOT_QUERY_FAILED')
        return response.json()
      }, save: (name, value) => save(`${mode}-${name}`, value) })
      await save(`${mode}-slot-contracts.json`, contracts)
    } })
  resources.push(state)
  if (!state.ok) throw failure(state.primaryFailure?.code ?? 'INSPECTION_BROWSER_INCOMPLETE')
  return contracts
}

export function inspectionInstallCommands(cli, { product, probe, sidebar, store }) {
  const sources = [['product', product], ['probe', probe]]
  if (sidebar) sources.push(['sidebar', `link:${sidebar.replaceAll('\\', '/')}`])
  return sources.map(([label, source]) => ({ label, argv: [cli, 'plugin', '--profile', 'web', 'add', source, '--offline', '--ignore-scripts', '--store-dir', store] }))
}

async function runInspectionMode({ modeRoot, runtimeRoot, mode, sourceLaunch, env, tarball, run, save, evidence, resources, browserMethod }) {
  const runtime = join(modeRoot, 'runtime')
  await save(`${mode}-runtime-copy.json`, await copyIsolatedNodeModules(sourceLaunch.packageRoot, runtime))
  const cli = join(runtime, relative(sourceLaunch.packageRoot, sourceLaunch.displayPath))
  const envPath = Object.keys(env).find(key => key.toLowerCase() === 'path') ?? 'PATH'
  env[envPath] = `${dirname(inspectionPnpm)};${env[envPath] ?? ''}`
  await run(`${mode}-inspect-version`, process.execPath, [cli, '--version'], modeRoot, env)
  await run(`${mode}-inspect-empty`, process.execPath, [cli, '--profile', 'web', '--dump-config'], modeRoot, env)
  const profile = join(env.DSH_HOME, 'profiles/web')
  const probeCopy = join(modeRoot, 'probe'); await checkedCopy(inspectionProbe, probeCopy)
  const probePack = JSON.parse(await run(`${mode}-probe-pack`, process.execPath, [npmCli, 'pack', '--json', '--offline', '--ignore-scripts', '--pack-destination', join(modeRoot, 'tarballs')], probeCopy, env))[0]
  let sidebar
  if (mode === 'better-sidebar') {
    const source = join(homedir(), '.dsh/profiles/web/node_modules')
    const destination = join(profile, '_inspection-sidebar/node_modules')
    await mkdir(dirname(destination))
    const copied = await copyInspectionPackages(source, 'dsh-better-sidebar', destination)
    if (copied.packages.find(item => item.name === 'dsh-better-sidebar')?.version !== '0.15.2') throw failure('SIDEBAR_VERSION_MISMATCH')
    await save(`${mode}-sidebar-copy.json`, copied)
    sidebar = join(destination, 'dsh-better-sidebar')
  }
  for (const install of inspectionInstallCommands(cli, { product: tarball, probe: join(modeRoot, 'tarballs', probePack.filename), sidebar, store: join(modeRoot, 'pnpm-store') })) {
    await run(`${mode}-inspect-install-${install.label}`, process.execPath, install.argv, modeRoot, env)
  }
  const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
  const expected = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'oasis-professional-service', 'oasis-api-phase4-slot-probe', ...(mode === 'better-sidebar' ? ['dsh-better-sidebar'] : [])]
  assert.deepEqual(manifest.dsh.profile.bundles, expected, 'INSPECTION_BUNDLE_DRIFT')
  await save(`${mode}-inspect-profile.json`, manifest)
  const dump = await run(`${mode}-inspect-installed`, process.execPath, [cli, '--profile', 'web', '--dump-config'], modeRoot, env)
  assert.ok(dump.includes('oasis-api-phase4-slot-probe'))
  const rows = await snapshotTree(modeRoot)
  for (const item of rows.filter(item => item.kind === 'link')) {
    const target = await realpath(join(modeRoot, item.path))
    if (!within(modeRoot, target)) throw failure('INSPECTION_REPARSE_ESCAPE')
  }
  await assertIndependentHomes([env.DSH_HOME], runtimeRoot)
  await save(`${mode}-inspect-links.json`, rows.filter(item => item.kind === 'link'))
  const peers = await collectInspectionPeers(join(profile, 'node_modules/oasis-professional-service'), modeRoot)
  await save(`${mode}-peer-resolution.json`, peers)
  if (!peers.hostReady) throw failure('INSPECTION_HOST_PEERS_UNRESOLVED')
  const host = { kind: 'inspection-host', mode, closed: false, portClosed: false }; resources.push(host)
  await withInspectionHost({ home: env.DSH_HOME, executable: process.execPath, argv: [cli, '--profile', 'web', '--no-open', '--port'], cwd: modeRoot, env,
    save: async record => { Object.assign(host, record); await save(`${mode}-host-lifecycle.json`, record) } },
  ({ baseUrl }) => inspectBrowser({ baseUrl, modeRoot, save, mode, resources, browserMethod }))
  if (!peers.compatibilityComplete) throw failure('INSPECTION_CLIENT_PEERS_UNVERIFIED')
}

export async function collectSlotContracts({ query, save }) {
  const collected = []
  for (const root of [null, ...INSPECTION_ROOTS]) {
    const value = await query(root)
    await save(root === null ? 'slots-full.json' : `slots-${root}.json`, value)
    if (!Array.isArray(value?.trees) || !value.trees.length) throw failure('SLOT_CONTRACT_INCOMPLETE')
    if (root !== null) {
      const slot = value.selected; const catalog = slot?.catalog
      if (value.requestedRoot?.name !== root || value.requestedRoot.available !== true || slot?.name !== root
        || !slot.kind || !slot.scope || !Array.isArray(slot.occupants)
        || !Array.isArray(catalog?.registration) || !Array.isArray(catalog.ownerProps) || !Array.isArray(catalog.standardProps)
        || !catalog.replaceRisk) throw failure('SLOT_CONTRACT_INCOMPLETE')
      collected.push({ root, purpose: value.trees[0].purpose ?? catalog.description, kind: slot.kind, scope: slot.scope,
        options: catalog.registration, standardProps: catalog.standardProps, ownerProps: catalog.ownerProps,
        occupants: slot.occupants, replacementRisk: catalog.replaceRisk, descendants: value.trees[0].children })
    }
  }
  return collected
}

async function portOpen(port) {
  return new Promise(resolvePort => {
    const socket = createConnection({ host: '127.0.0.1', port }); socket.setTimeout(300)
    const finish = value => { socket.destroy(); resolvePort(value) }
    socket.once('connect', () => finish(true)); socket.once('error', () => finish(false)); socket.once('timeout', () => finish(false))
  })
}

async function availablePort(requested = 0) {
  const server = createServer()
  try {
    await new Promise((resolveListen, reject) => { server.once('error', reject); server.listen(requested, '127.0.0.1', resolveListen) })
    const port = server.address().port
    await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()))
    return port
  } catch { throw failure('HOST_PORT_BUSY') }
}

export async function withInspectionHost({ home, port: requestedPort, executable, argv, cwd, env, save, readinessMs = 30_000 }, inspect) {
  const lease = await acquireHostLease(home)
  const record = { executable, argv: null, cwd, pid: null, startedAt: new Date().toISOString(), closed: false, portClosed: false, stdout: '', stderr: '' }
  let child; let port; let primary; let value; let closedPromise; let spawnFailure; const cleanup = []
  try {
    port = await availablePort(requestedPort)
    record.argv = [...argv, String(port)]; record.port = port
    child = spawn(executable, record.argv, { cwd, env, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] })
    record.pid = child.pid ?? null
    child.stdout.on('data', chunk => { record.stdout = (record.stdout + chunk).slice(-2 * 1024 * 1024) })
    child.stderr.on('data', chunk => { record.stderr = (record.stderr + chunk).slice(-2 * 1024 * 1024) })
    closedPromise = new Promise(resolveClose => {
      child.once('error', error => { spawnFailure = safeFailure(error); record.spawnError = spawnFailure })
      child.once('close', (code, signal) => { record.closed = true; record.exitCode = code; record.signal = signal; record.finishedAt = new Date().toISOString(); resolveClose() })
    })
    const baseUrl = `http://127.0.0.1:${port}`; const deadline = Date.now() + readinessMs
    for (;;) {
      if (spawnFailure || record.closed) throw failure('HOST_START_FAILED')
      if (record.stdout.includes(baseUrl) && await portOpen(port)) break
      if (Date.now() >= deadline) throw failure('HOST_START_TIMEOUT')
      await delay(50)
    }
    value = await inspect({ baseUrl, pid: child.pid })
    if (record.closed) throw failure('HOST_UNEXPECTED_EXIT')
  } catch (error) { primary = error }
  finally {
    if (child && !record.closed) {
      try {
        child.kill('SIGTERM')
        await Promise.race([closedPromise, delay(5000).then(() => { if (!record.closed) throw failure('HOST_STOP_TIMEOUT') })])
      } catch (error) { cleanup.push(safeFailure(error)) }
    }
    if (!child) record.closed = true
    try {
      record.portClosed = port === undefined || !await portOpen(port)
      if (!record.portClosed) throw failure('HOST_PORT_NOT_CLOSED')
    } catch (error) { cleanup.push(safeFailure(error)) }
    if (record.closed) { try { await lease.release() } catch (error) { cleanup.push(safeFailure(error)) } }
    record.primaryFailure = primary ? safeFailure(primary) : null; record.cleanupFailures = cleanup
    try { await save(record) } catch (error) { cleanup.push(safeFailure(error, 'EVIDENCE_WRITE_FAILED')) }
  }
  if (primary) { primary.cleanupFailures = cleanup; throw primary }
  if (cleanup.length) throw failure(cleanup[0].code)
  return value
}

async function runPrepareVerification(options) {
  const proposed = resolve(projectRoot, options.evidence)
  const remediationBase = join(projectRoot, 'docs/evidence/oasis-api-phase4-browser-remediation-2026-09-03/attempt-001')
  const evidenceBase = within(remediationBase, proposed) ? remediationBase : join(projectRoot, 'docs/evidence/oasis-api-phase4-2026-09-02')
  const evidence = await claimEvidenceRoot(resolve(projectRoot, options.evidence), evidenceBase)
  const commands = []; const ledger = []; const inspectionResources = []; let profileBefore; let filesBefore; let headBefore; let stageBefore
  const realProfile = join(homedir(), '.dsh')
  const save = async (name, value) => writeFile(join(evidence, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' })
  let inspectionCommandContext; let browserMethod
  async function run(label, executable, argv, cwd, env) {
    if (env === undefined && options.stage === 'inspect') inspectionCommandContext ??= await createInspectionNativeContext(process.env)
    env ??= options.stage === 'inspect' ? inspectionCommandContext.env : process.env
    const result = await runRecordedCommand({ executable, argv, cwd, env, timeoutMs: label.endsWith('-build') ? 120_000 : 60_000, terminateTree: options.stage === 'inspect' })
    const { stdout, stderr, ...metadata } = result
    commands.push({ label, ...metadata })
    await writeFile(join(evidence, `${label}.txt`), result.stdout + result.stderr, { flag: 'wx' })
    if (result.spawnError || result.timedOut || result.exitCode !== 0) throw failure(result.spawnError?.code ?? (result.timedOut ? 'COMMAND_TIMEOUT' : 'COMMAND_FAILED'))
    return result.stdout
  }
  async function git(label, ...argv) { return run(label, 'git', argv, projectRoot, inspectionObserverEnvironment(process.env)) }
  async function hashExisting(files) {
    const result = await hashFiles(projectRoot, files)
    if (!result.ok) { await save('input-read-errors.json', result); throw failure('FILE_READ_FAILED') }
    return result.rows
  }
  let mainError = null
  try {
    headBefore = (await git('head-before', 'rev-parse', 'HEAD')).trim()
    stageBefore = await git('stage-before', 'diff', '--cached', '--raw')
    const listed = (await git('file-list-before', 'ls-files', '--cached', '--others', '--exclude-standard', '-z')).split('\0').filter(Boolean)
    const prior = JSON.parse(await readFile(join(projectRoot, 'docs/evidence/oasis-api-phase4-2026-09-02/attempt-001/input-hashes-before.json'), 'utf8'))
    const names = [...new Set([...listed, ...prior.existingFiles.map(item => item.path)])].filter(name => !within(evidence, join(projectRoot, name))).sort()
    filesBefore = await hashExisting(names)
    assert.equal(sha256(await readFile(authority)), authorityHash, 'authority baseline drift')
    const phase3 = JSON.parse(await readFile(join(projectRoot, 'docs/evidence/oasis-api-phase3-reaudit-2026-09-02/scope-and-inputs.json'), 'utf8'))
    for (const [name, digest] of Object.entries(phase3.packageInputHashes)) assert.equal(sha256(await readFile(join(projectRoot, name))).toLowerCase(), digest.toLowerCase(), 'phase3 input drift')
    await save('input-hashes-before.json', { head: headBefore, staged: stageBefore, files: filesBefore, authority, authorityHash })
    if (options.stage === 'inspect') browserMethod = await requireInspectionBrowserPreflight(options)
    await requireStableProfile(realProfile, { onSnapshot: async (rows, index) => {
      if (index === 0) profileBefore = rows
      await save(`profile-preflight-${index}.json`, rows)
    } })
    await writeBaselineTsv(join(evidence, 'real-profile-before.tsv'), profileBefore)
    ledger.push({ layer: 'baseline', result: 'verified', files: filesBefore.length, profileEntries: profileBefore.length })
    const runtimeRoot = await mkdtemp(join(tmpdir(), 'oasis-dsh-p4-'))
    await save('runtime-root.json', { runtimeRoot, retained: true })
    const sourceLaunch = await resolveDshLaunch({ cwd: projectRoot })
    assert.equal(sourceLaunch.packageVersion, '0.1.1-rc.2')
    const productManifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))
    for (const mode of options.modes.split(',')) {
      let profileCurrent
      try { profileCurrent = await snapshotTree(realProfile) } catch { throw failure('PROFILE_UNSTABLE') }
      await save(`${mode}-profile-before.json`, profileCurrent)
      if (JSON.stringify(profileCurrent) !== JSON.stringify(profileBefore)) throw failure('REAL_PROFILE_DRIFT')
      const modeRoot = join(runtimeRoot, mode); await mkdir(modeRoot)
      const env = options.stage === 'inspect' ? inspectionEnvironment(process.env, modeRoot) : isolatedEnvironment(process.env, modeRoot)
      for (const directory of ['home', 'os-home', 'appdata', 'localappdata', 'tmp', 'npm-cache', 'config', 'cache', 'data', 'pnpm-home', 'pnpm-store', 'tarballs', 'browser-data', 'workspace-a', 'workspace-b', ...(options.stage === 'inspect' ? ['programdata'] : [])]) await mkdir(join(modeRoot, directory))
      await writeFile(env.npm_config_userconfig, '', { flag: 'wx' }); await writeFile(env.npm_config_globalconfig, '', { flag: 'wx' })
      await assertIndependentHomes([env.DSH_HOME], runtimeRoot)
      const copy = join(modeRoot, 'product'); await mkdir(copy)
      for (const name of ['package.json', 'src', 'lib', 'docs/api/oasis-professional-service-baseline.json', 'cordis.patch.yml', 'tsdown.config.mjs']) {
        await mkdir(dirname(join(copy, name)), { recursive: true })
        await checkedCopy(join(packageRoot, name), join(copy, name))
      }
      const originalInputs = await snapshotTree(copy)
      await save(`${mode}-copy-inputs.json`, originalInputs)
      const sourceInputs = await hashFiles(packageRoot, originalInputs.filter(item => item.kind === 'file').map(item => item.path))
      if (!sourceInputs.ok || !compareRows(sourceInputs.rows, originalInputs.filter(item => item.kind === 'file')).ok) throw failure('SOURCE_COPY_DRIFT')
      await save(`${mode}-dependency-copy.json`, await copyIsolatedNodeModules(join(packageRoot, 'node_modules'), join(copy, 'node_modules')))
      await run(`${mode}-build`, process.execPath, [join(copy, 'node_modules/tsdown/dist/run.mjs'), '--config', 'tsdown.config.mjs'], copy, env)
      assert.equal(sha256(await readFile(join(copy, 'lib/client.js'))), sha256(await readFile(join(packageRoot, 'lib/client.js'))), 'BUILD_CLIENT_DRIFT')
      const originalMap = JSON.parse(await readFile(join(packageRoot, 'lib/client.js.map'), 'utf8'))
      const copiedMap = JSON.parse(await readFile(join(copy, 'lib/client.js.map'), 'utf8'))
      assert.equal(copiedMap.mappings, originalMap.mappings, 'BUILD_MAP_MAPPINGS_DRIFT')
      assert.deepEqual(copiedMap.sourcesContent, originalMap.sourcesContent, 'BUILD_MAP_CONTENT_DRIFT')
      for (let i = 0; i < originalMap.sources.length; i++) assert.equal(sha256(await readFile(resolve(copy, 'lib', copiedMap.sources[i]))), sha256(await readFile(resolve(packageRoot, 'lib', originalMap.sources[i]))), 'BUILD_MAP_RESOLVED_SOURCE_DRIFT')
      const dry = JSON.parse(await run(`${mode}-pack-dry`, process.execPath, [npmCli, 'pack', '--dry-run', '--json', '--offline', '--ignore-scripts'], copy, env))[0]
      assert.equal(dry.files.length, 43, 'package whitelist must remain 43 files')
      const sourcePackFiles = originalInputs.filter(item => item.kind === 'file' && item.path !== 'tsdown.config.mjs').map(item => item.path.replaceAll('\\', '/')).sort()
      assert.deepEqual(dry.files.map(item => item.path).sort(), sourcePackFiles, 'pack whitelist drift')
      const packed = JSON.parse(await run(`${mode}-pack`, process.execPath, [npmCli, 'pack', '--json', '--offline', '--ignore-scripts', '--pack-destination', join(modeRoot, 'tarballs')], copy, env))[0]
      const tarball = join(modeRoot, 'tarballs', packed.filename)
      const packedInputs = await hashFiles(copy, sourcePackFiles)
      if (!packedInputs.ok) throw failure('PACK_INPUT_UNREADABLE')
      await save(`${mode}-product-tarball.json`, await verifyPackageTarball(tarball, packedInputs.rows))
      ledger.push({ layer: 'copy-build-pack', mode, result: 'verified', files: dry.files.length })
      if (options.stage === 'inspect') {
        await runInspectionMode({ modeRoot, runtimeRoot, mode, sourceLaunch, env, tarball, run, save, evidence, resources: inspectionResources, browserMethod })
        ledger.push({ layer: 'platform-contract', mode, result: 'verified' })
        continue
      }
      // The approved repair stops at preparation. The historical integration
      // branch below remains unvalidated and cannot be entered through this CLI.
      if (options.stage === 'prepare') continue
      const runtime = join(modeRoot, 'runtime')
      await checkedCopy(sourceLaunch.packageRoot, runtime)
      const cli = join(runtime, relative(sourceLaunch.packageRoot, sourceLaunch.displayPath))
      await run(`${mode}-version`, process.execPath, [cli, '--version'], modeRoot, env)
      // Prepare the empty profile with official CLI only. No real Profile reads by the child.
      await run(`${mode}-dump-empty`, process.execPath, [cli, '--profile', 'web', '--dump-config'], modeRoot, env)
      const roots = []
      for (const [name, version] of Object.entries(productManifest.peerDependencies)) {
        const item = await installedDependency(name, packageRoot)
        assert.equal(item.manifest.version, version, `offline pinned peer mismatch: ${name}`)
        roots.push(item)
      }
      if (mode === 'better-sidebar') {
        const item = await installedDependency('dsh-better-sidebar', join(realProfile, 'profiles/web'))
        assert.equal(item.manifest.version, '0.15.2'); roots.push(item)
      }
      const dependencies = await dependencyClosure(roots)
      const overrides = {}; const packedDependencies = []
      for (const [index, item] of dependencies.entries()) {
        const dependencyCopy = join(modeRoot, 'dependency-copies', String(index))
        await mkdir(dirname(dependencyCopy), { recursive: true })
        await cp(item.path, dependencyCopy, { recursive: true, dereference: true, force: false, errorOnExist: true, filter: file => relative(item.path, file).split(/[\\/]/)[0] !== 'node_modules' })
        const info = JSON.parse(await run(`${mode}-dependency-${index}`, process.execPath, [npmCli, 'pack', '--json', '--offline', '--ignore-scripts', '--pack-destination', join(modeRoot, 'tarballs')], dependencyCopy, env))[0]
        const file = join(modeRoot, 'tarballs', info.filename)
        overrides[item.name] = `file:${file.replaceAll('\\', '/')}`
        packedDependencies.push({ name: item.name, version: item.manifest.version, source: item.path, tarball: file, sha256: sha256(await readFile(file)) })
      }
      await save(`${mode}-offline-inputs.json`, packedDependencies)
      const policy = join(env.DSH_HOME, 'profiles/web/pnpm-workspace.yaml')
      const initial = await readFile(policy, 'utf8')
      assert.doesNotMatch(initial, /^overrides:/m)
      await writeFile(policy, `${initial}\noverrides:\n${Object.entries(overrides).map(([name, value]) => `  ${JSON.stringify(name)}: ${JSON.stringify(value)}`).join('\n')}\n`)
      const installArgs = [cli, 'plugin', '--profile', 'web', 'add', tarball]
      if (mode === 'better-sidebar') installArgs.push(overrides['dsh-better-sidebar'].slice(5))
      installArgs.push('--offline', '--ignore-scripts', '--store-dir', join(modeRoot, 'pnpm-store'))
      await run(`${mode}-install`, process.execPath, installArgs, modeRoot, env)
      const installed = await snapshotTree(modeRoot)
      for (const item of installed.filter(item => item.kind === 'link')) assert.ok(within(runtimeRoot, await realpath(join(modeRoot, item.path))), 'ISOLATED_REPARSE_ESCAPE')
      await save(`${mode}-reparse-targets.json`, installed.filter(item => item.kind === 'link'))
      await run(`${mode}-dump-installed`, process.execPath, [cli, '--profile', 'web', '--dump-config'], modeRoot, env)
      ledger.push({ layer: 'offline-install', mode, result: 'verified' })
      const { verifyBrowserMode } = await import('../tests/integration/oasis-api-phase4-browser.test.mjs')
      await verifyBrowserMode({ mode, modeRoot, cli, env, evidence, ledger })
    }
  } catch (error) {
    mainError = error
    ledger.push({ layer: 'stop', result: 'not-completed', error: safeFailure(error) })
  } finally {
    const outcome = await finalizeVerification({ requestedStage: options.stage ?? 'integration', primaryFailure: mainError, commands, ledger, save, checks: [
      { name: 'resources', kind: 'cleanup', run: async () => ({ ok: commands.every(item => item.closed && item.treeTermination?.ok !== false)
        && inspectionResources.every(item => item.closed && (item.kind !== 'inspection-host' || item.portClosed)), commands: commands.length, inspectionResources }) },
      { name: 'profile-preservation', kind: 'preservation', run: profileBefore ? async () => {
        let after
        try { after = await snapshotTree(realProfile) } catch { throw failure('PROFILE_UNSTABLE') }
        await writeBaselineTsv(join(evidence, 'real-profile-after.tsv'), after)
        const comparison = compareRows(profileBefore, after)
        return { ...comparison, ok: comparison.ok && JSON.stringify(profileBefore) === JSON.stringify(after), code: 'REAL_PROFILE_DRIFT' }
      } : null },
      { name: 'existing-files-after', kind: 'preservation', run: filesBefore ? async () => {
        const after = await hashFiles(projectRoot, filesBefore.map(item => item.path))
        const comparison = compareRows(filesBefore, after.rows)
        return { ...after, comparison, ok: after.ok && comparison.ok, code: 'PROTECTED_FILES_DRIFT' }
      } : null },
      { name: 'authority-after', kind: 'preservation', run: async () => ({ ok: sha256(await readFile(authority)) === authorityHash, code: 'API_DRIFT' }) },
      { name: 'head-preservation', kind: 'preservation', run: headBefore ? async () => ({ ok: (await git('head-after', 'rev-parse', 'HEAD')).trim() === headBefore, code: 'HEAD_DRIFT' }) : null },
      { name: 'stage-preservation', kind: 'preservation', run: stageBefore !== undefined ? async () => ({ ok: await git('stage-after', 'diff', '--cached', '--raw') === stageBefore, code: 'STAGE_DRIFT' }) : null },
      { name: 'added-paths', kind: 'preservation', run: filesBefore ? async () => {
        const existing = new Set(filesBefore.map(item => item.path))
        const names = (await git('file-list-after', 'ls-files', '--cached', '--others', '--exclude-standard', '-z')).split('\0').filter(Boolean)
        const unexpected = names.filter(name => !existing.has(name) && !within(evidence, join(projectRoot, name)))
        return { ok: !unexpected.length, unexpected, code: 'UNEXPECTED_ADDITIONS' }
      } : null },
    ] })
    if (outcome.exitCode) mainError ??= failure('VERIFICATION_INCOMPLETE')
  }
  if (mainError) throw mainError
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runVerification(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1 })
}
