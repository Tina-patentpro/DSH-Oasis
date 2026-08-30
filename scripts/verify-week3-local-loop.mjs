import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createConnection, createServer } from 'node:net'
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  rmdir,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { collectTree, compareRows, sha256, writeBaselineTsv } from './baseline-capture-core.mjs'
import { resolveDshLaunch, validateIsolatedHome } from './dsh-isolated.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageRoot = resolve(projectRoot, 'packages/oasis-professional-service')
const fixtureRoot = resolve(projectRoot, 'tests/fixtures/oasis-week3-loop-probe')
const layoutProbe = resolve(projectRoot, 'tests/fixtures/oasis-client-layout-probe')
const slotProbe = resolve(projectRoot, 'tests/fixtures/oasis-slot-evidence-probe')
const sessionVisibilityProbe = resolve(projectRoot, 'tests/fixtures/oasis-session-visibility-probe')
const wrapper = resolve(projectRoot, 'scripts/dsh-isolated.mjs')
const browserTest = resolve(projectRoot, 'tests/integration/week3-local-loop-browser.test.mjs')
const cleanupBrowserTest = resolve(projectRoot, 'tests/integration/week3-better-sidebar-cleanup-browser.test.mjs')
const PANEL_HOST_MODES = Object.freeze(['standalone', 'better-sidebar'])
const panelHostMode = process.env.OASIS_PANEL_HOST_MODE ?? 'standalone'
const BETTER_SIDEBAR_VERSION = '0.15.2'
const evidenceRoot = resolve(projectRoot, process.env.OASIS_EVIDENCE_ROOT ?? 'docs/evidence/week3-local-loop-2026-08-26')
const runtimeEvidence = resolve(evidenceRoot, 'runtime')
const browserEvidence = resolve(evidenceRoot, 'browser')
const filesystemEvidence = resolve(evidenceRoot, 'filesystem')
const realProfile = resolve(process.env.OASIS_REAL_DSH_PROFILE ?? join(process.env.USERPROFILE ?? '', '.dsh'))
const betterSidebarSource = resolve(
  process.env.OASIS_BETTER_SIDEBAR_PACKAGE
    ?? join(realProfile, 'profiles/web/node_modules/dsh-better-sidebar'),
)
const realProfileNodeModules = resolve(realProfile, 'profiles/web/node_modules')
const NOW = '2026-08-26T07:00:00.000Z'
const EMPTY_TIME = '1970-01-01T00:00:00.000Z'

class RpcError extends Error {
  constructor(endpoint, error) {
    super(`${endpoint} failed: ${error?.code ?? 'unknown'} ${error?.message ?? ''}`.trim())
    this.name = 'RpcError'
    this.endpoint = endpoint
    this.code = error?.code
    this.details = error?.details
  }
}

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? projectRoot,
      env: { ...process.env, ...options.env },
      shell: options.shell ?? false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.once('error', rejectRun)
    child.once('close', (code, signal) => {
      const result = { code: code ?? 1, signal, stdout, stderr }
      if (result.code === 0) resolveRun(result)
      else rejectRun(Object.assign(new Error(`${command} exited ${result.code}\n${stdout}${stderr}`), { result }))
    })
  })
}

async function saveJson(path, value) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function removeIfPresent(path) {
  try {
    await unlink(path)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

async function copyPluginSource(source, destination) {
  const sourceRoot = await realpath(source)
  await cp(sourceRoot, destination, {
    recursive: true,
    force: false,
    errorOnExist: true,
    filter(path) {
      const rel = relative(sourceRoot, path)
      if (rel === '') return true
      const first = rel.split(/[\\/]+/)[0]
      return !['node_modules', '.git', 'coverage'].includes(first)
    },
  })
  return await realpath(destination)
}

async function copyOfficialDshRuntime(sourceLaunch, destination) {
  await cp(sourceLaunch.packageRoot, destination, {
    recursive: true,
    force: false,
    errorOnExist: true,
    dereference: true,
  })
  const copiedCli = resolve(destination, relative(sourceLaunch.packageRoot, sourceLaunch.displayPath))
  const copiedLaunch = await resolveDshLaunch({
    cwd: projectRoot,
    env: { ...process.env, DSH_BIN: copiedCli },
  })
  assert.equal(copiedLaunch.packageVersion, sourceLaunch.packageVersion)
  return copiedLaunch
}

async function packPluginSource(label, source, destination) {
  await mkdir(destination, { recursive: true })
  const before = new Set((await readdir(destination)).filter((name) => name.endsWith('.tgz')))
  const packed = await run('pnpm.cmd', ['--config.ignore-scripts=true', 'pack', '--pack-destination', destination], {
    cwd: source,
    shell: process.platform === 'win32',
    env: { CI: 'true' },
  })
  const created = (await readdir(destination))
    .filter((name) => name.endsWith('.tgz') && !before.has(name))
  assert.equal(created.length, 1, `${label}: expected exactly one new package tarball`)
  const tarball = await realpath(resolve(destination, created[0]))
  return { label, tarball, output: `${packed.stdout}${packed.stderr}` }
}

function installedPackagePath(nodeModulesRoot, packageName) {
  return resolve(nodeModulesRoot, ...packageName.split('/'))
}

async function collectInstalledDependencyClosure(packageRoot, nodeModulesRoot) {
  const rootManifest = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'))
  const pending = [
    ...Object.keys(rootManifest.dependencies ?? {}).map((name) => ({ name, optional: false })),
    ...Object.keys(rootManifest.optionalDependencies ?? {}).map((name) => ({ name, optional: true })),
  ]
  const packages = new Map()
  while (pending.length > 0) {
    const { name, optional } = pending.shift()
    if (packages.has(name)) continue
    const path = installedPackagePath(nodeModulesRoot, name)
    let manifest
    try {
      manifest = JSON.parse(await readFile(resolve(path, 'package.json'), 'utf8'))
    } catch (error) {
      if (optional) continue
      throw new Error(`installed Better Sidebar dependency is unavailable: ${name}: ${error.message}`)
    }
    assert.equal(manifest.name, name, `installed dependency manifest mismatch: ${name}`)
    assert.equal(typeof manifest.version, 'string', `installed dependency version missing: ${name}`)
    packages.set(name, { name, version: manifest.version, path: await realpath(path), manifest })
    for (const dependency of Object.keys(manifest.dependencies ?? {})) {
      if (!packages.has(dependency)) pending.push({ name: dependency, optional: false })
    }
    for (const dependency of Object.keys(manifest.optionalDependencies ?? {})) {
      if (!packages.has(dependency)) pending.push({ name: dependency, optional: true })
    }
  }
  return [...packages.values()].sort((left, right) => left.name.localeCompare(right.name))
}

async function prepareOfflineDependencyOverrides({ dependencyPackages, tarballsRoot, evidencePath }) {
  await mkdir(tarballsRoot, { recursive: true })
  const packed = []
  let packOutput = ''
  for (const dependency of dependencyPackages) {
    const result = await packPluginSource(dependency.name, dependency.path, tarballsRoot)
    packed.push({
      name: dependency.name,
      version: dependency.version,
      source: dependency.path,
      tarball: result.tarball,
      sha256: sha256(await readFile(result.tarball)),
    })
    packOutput += `# ${dependency.name}@${dependency.version}\n${result.output}`
  }
  await writeFile(resolve(dirname(evidencePath), 'offline-dependency-pack.txt'), packOutput, 'utf8')
  const overrides = Object.fromEntries(packed.map(({ name, tarball }) => [
    name,
    `file:${tarball.replaceAll('\\', '/')}`,
  ]))
  await saveJson(evidencePath, {
    packageCount: packed.length,
    overrides,
    packages: packed,
  })
  return overrides
}

async function setIsolatedResolutionOverrides(temporaryHome, overrides) {
  const workspacePath = resolve(temporaryHome, 'profiles/web/pnpm-workspace.yaml')
  const original = await readFile(workspacePath, 'utf8')
  assert.doesNotMatch(original, /^overrides:/m, 'isolated pnpm workspace already declares overrides')
  const rows = Object.entries(overrides)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `  ${JSON.stringify(name)}: ${JSON.stringify(value)}`)
  const next = `${original.trimEnd()}\n\noverrides:\n${rows.join('\n')}\n`
  await writeFile(workspacePath, next, 'utf8')
  return { workspacePath, original }
}

async function clearIsolatedResolutionOverrides(workspacePath, original) {
  await writeFile(workspacePath, original, 'utf8')
}

async function collectReparseTargets(root) {
  const resolvedRoot = await realpath(root)
  const rows = []
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name)
      const info = await lstat(path)
      if (info.isSymbolicLink()) {
        rows.push({
          path: relative(resolvedRoot, path).replaceAll('\\', '/'),
          target: await realpath(path),
        })
        continue
      }
      if (info.isDirectory()) await visit(path)
    }
  }
  await visit(resolvedRoot)
  return rows
}

async function assertReparseTargetsWithin(root, declaredRoot, evidencePath) {
  const resolvedDeclaredRoot = await realpath(declaredRoot)
  const rows = await collectReparseTargets(root)
  for (const row of rows) {
    assert.equal(
      isWithin(resolvedDeclaredRoot, row.target),
      true,
      `isolated Profile reparse target escapes declared root: ${row.path} -> ${row.target}`,
    )
  }
  await saveJson(evidencePath, {
    scannedRoot: await realpath(root),
    declaredRoot: resolvedDeclaredRoot,
    count: rows.length,
    allTargetsWithinDeclaredRoot: true,
    rows,
  })
  return rows
}

async function allocatePort() {
  const server = createServer()
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const address = server.address()
  await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()))
  return address.port
}

async function isPortOpen(port) {
  return await new Promise((resolveCheck) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    socket.setTimeout(300)
    socket.once('connect', () => {
      socket.destroy()
      resolveCheck(true)
    })
    const closed = () => {
      socket.destroy()
      resolveCheck(false)
    }
    socket.once('error', closed)
    socket.once('timeout', closed)
  })
}

async function assertPortClosed(port) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (!await isPortOpen(port)) return
    await new Promise((resolveWait) => setTimeout(resolveWait, 100))
  }
  throw new Error(`Host port remained open after stop: ${port}`)
}

function scrubbedHostEnvironment() {
  const hostEnv = { ...process.env }
  for (const key of Object.keys(hostEnv)) {
    if (/(?:api[_-]?key|token|secret|password|credential)/i.test(key)) delete hostEnv[key]
  }
  hostEnv.HTTP_PROXY = 'http://127.0.0.1:1'
  hostEnv.HTTPS_PROXY = 'http://127.0.0.1:1'
  hostEnv.ALL_PROXY = 'http://127.0.0.1:1'
  hostEnv.NO_PROXY = '127.0.0.1,localhost,::1'
  return hostEnv
}

function startHost(home, port, launch) {
  const child = spawn(launch.command, [...launch.argsPrefix, '--profile', 'web', '--no-open', '--port', String(port)], {
    cwd: projectRoot,
    env: { ...scrubbedHostEnvironment(), DSH_HOME: home },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk) => { stdout += chunk })
  child.stderr.on('data', (chunk) => { stderr += chunk })
  const ready = new Promise((resolveReady, rejectReady) => {
    const timeout = setTimeout(() => rejectReady(new Error(`DSH Host readiness timeout\n${stdout}\n${stderr}`)), 30_000)
    const inspect = () => {
      if (stdout.includes(`http://127.0.0.1:${port}`)) {
        clearTimeout(timeout)
        resolveReady()
      }
    }
    child.stdout.on('data', inspect)
    child.once('error', (error) => {
      clearTimeout(timeout)
      rejectReady(error)
    })
    child.once('exit', (code) => {
      clearTimeout(timeout)
      rejectReady(new Error(`DSH Host exited before readiness with ${code}\n${stdout}\n${stderr}`))
    })
  })
  return { child, ready, output: () => ({ stdout, stderr }) }
}

async function stopHost(host, port) {
  if (host.child.exitCode === null) {
    const exited = new Promise((resolveExit) => host.child.once('exit', resolveExit))
    if (!host.child.kill('SIGTERM')) throw new Error(`failed to terminate DSH Host process ${host.child.pid}`)
    await Promise.race([
      exited,
      new Promise((_, rejectWait) => setTimeout(
        () => rejectWait(new Error(`DSH Host process did not exit within 5 seconds: ${host.child.pid}`)),
        5_000,
      )),
    ])
  }
  await assertPortClosed(port)
}

async function apiRpc(baseUrl, method, payload, rpcId) {
  const response = await fetch(new URL(`/api/${method}`, baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method, payload }),
  })
  const body = await response.json()
  if (!response.ok || body?.result?.ok !== true) {
    throw new Error(`${method} failed: HTTP ${response.status} ${JSON.stringify(body?.result?.error ?? body)}`)
  }
  return body.result.value
}

async function rawConnectionRpc(baseUrl, endpoint, payload, rpcId) {
  const response = await fetch(new URL(`/oasis-workbench/${endpoint}`, baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method: endpoint, payload }),
  })
  const body = await response.json()
  if (!response.ok || body?.rpcId !== rpcId || typeof body?.result?.ok !== 'boolean') {
    throw new Error(`${endpoint} malformed transport result: HTTP ${response.status} ${JSON.stringify(body)}`)
  }
  return body.result
}

async function connectionRpc(baseUrl, endpoint, payload, rpcId) {
  const result = await rawConnectionRpc(baseUrl, endpoint, payload, rpcId)
  if (!result.ok) throw new RpcError(endpoint, result.error)
  return result.value
}

async function expectRpcError(baseUrl, endpoint, payload, rpcId, expectedCode) {
  const result = await rawConnectionRpc(baseUrl, endpoint, payload, rpcId)
  assert.equal(result.ok, false, `${endpoint} unexpectedly succeeded`)
  assert.equal(result.error.code, expectedCode)
  return result.error
}

async function seedVisibleSession(baseUrl, sessionId, title, marker, prefix) {
  await apiRpc(baseUrl, 'session.rename', { sessionId, title }, `${prefix}-rename`)
  const url = new URL('/__oasis-week3-session-visible', baseUrl)
  url.searchParams.set('sessionId', sessionId)
  const response = await fetch(url, { method: 'POST' })
  const body = await response.json()
  assert.equal(response.ok, true, `${marker}: visibility probe failed: ${JSON.stringify(body)}`)
  assert.equal(body.visible, true, `${marker}: visibility probe did not confirm the empty turn`)
}

async function waitForVisibleSessions(baseUrl, sessionIds) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const listed = await apiRpc(baseUrl, 'session.list', {}, `week3-session-list-${attempt}`)
    const rows = listed.items.filter((item) => sessionIds.includes(item.sessionId))
    if (rows.length === sessionIds.length && rows.every((item) => item.blank === false)) return listed
    await new Promise((resolveWait) => setTimeout(resolveWait, 100))
  }
  throw new Error('verification sessions did not become visible within 5 seconds')
}

function legacyRecord(workspaceId, taskId, title, workType) {
  return {
    schemaVersion: 1,
    workspaceId,
    revision: 0,
    panelMode: 'normal',
    activeTaskId: taskId,
    taskOrder: [taskId],
    tasks: {
      [taskId]: {
        taskId,
        title,
        workType,
        workflowId: workType,
        workflowVersion: '1',
        inputRefs: [],
        formValues: {},
        run: null,
        preview: null,
        review: 'not-reviewed',
        createdAt: NOW,
        updatedAt: NOW,
      },
    },
    updatedAt: EMPTY_TIME,
  }
}

function editableTask(taskId, title, workType, formValues) {
  return {
    taskId,
    title,
    workType,
    workflowId: workType,
    workflowVersion: '1',
    formValues,
    activeRunId: null,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function singleTaskDraft(task) {
  return {
    schemaVersion: 2,
    panelMode: 'normal',
    activeTaskId: task.taskId,
    taskOrder: [task.taskId],
    tasks: { [task.taskId]: task },
  }
}

function recordToDraft(record) {
  return {
    schemaVersion: 2,
    panelMode: record.panelMode,
    activeTaskId: record.activeTaskId,
    taskOrder: [...record.taskOrder],
    tasks: Object.fromEntries(record.taskOrder.map((taskId) => {
      const task = record.tasks[taskId]
      return [taskId, {
        taskId: task.taskId,
        title: task.title,
        workType: task.workType,
        workflowId: task.workflowId,
        workflowVersion: task.workflowVersion,
        formValues: structuredClone(task.formValues),
        activeRunId: task.activeRunId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      }]
    })),
  }
}

async function strongProfileSnapshot(outputPath) {
  const rootStat = await lstat(realProfile)
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error(`protected real DSH Profile root is not a plain directory: ${realProfile}`)
  }
  const rows = await collectTree(realProfile, realProfile)
  await writeBaselineTsv(outputPath, rows)
  return { rows, digest: sha256(JSON.stringify(rows)), resolvedRoot: await realpath(realProfile) }
}

function isWithin(root, target) {
  const value = relative(root, target)
  return value === '' || (!isAbsolute(value) && value !== '..' && !value.startsWith(`..${sep}`))
}

async function assertSafeTemporaryRoot(path) {
  const tempRoot = await realpath(tmpdir())
  const resolvedPath = await realpath(path)
  const prefix = `${tempRoot.endsWith(sep) ? tempRoot : `${tempRoot}${sep}`}oasis-dsh-week3-`
  if (!resolvedPath.startsWith(prefix)) throw new Error(`temporary root is outside the declared prefix: ${resolvedPath}`)
  const stat = await lstat(resolvedPath)
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`temporary root is linked or not a directory: ${resolvedPath}`)
  return resolvedPath
}

async function assertSafeChild(root, path, label) {
  const resolvedRoot = await realpath(root)
  const resolvedPath = await realpath(path)
  if (!isWithin(resolvedRoot, resolvedPath) || resolvedRoot === resolvedPath) {
    throw new Error(`${label} is not a child of the declared temporary root: ${resolvedPath}`)
  }
  const stat = await lstat(resolvedPath)
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`${label} is linked or not a directory: ${resolvedPath}`)
  return resolvedPath
}

async function verifyManifest(manifest) {
  for (const file of manifest.files) {
    const bytes = await readFile(file.absolutePath)
    assert.equal(sha256(bytes), file.sha256.toUpperCase(), `writeback hash mismatch: ${file.absolutePath}`)
    const info = await lstat(file.absolutePath)
    assert.equal(info.isFile(), true)
    assert.equal(info.isSymbolicLink(), false)
  }
}

function allWritebackFiles(record) {
  const files = []
  for (const task of Object.values(record.tasks)) {
    for (const run of Object.values(task.runs)) {
      for (const writeback of run.writebacks) files.push(...writeback.files)
    }
  }
  return files
}

async function main() {
  if (!PANEL_HOST_MODES.includes(panelHostMode)) {
    throw new Error(`OASIS_PANEL_HOST_MODE must be one of: ${PANEL_HOST_MODES.join(', ')}`)
  }
  await mkdir(runtimeEvidence, { recursive: true })
  await mkdir(browserEvidence, { recursive: true })
  await mkdir(filesystemEvidence, { recursive: true })
  if (!isAbsolute(realProfile)) throw new Error('real Profile path must be absolute')
  const projectCanonical = await realpath(projectRoot)
  const profileBefore = await strongProfileSnapshot(resolve(filesystemEvidence, 'real-profile-before.tsv'))
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'oasis-dsh-week3-'))
  const safeTemporaryRoot = await assertSafeTemporaryRoot(temporaryRoot)
  const temporaryHome = resolve(safeTemporaryRoot, 'home')
  const workspaceAPath = resolve(safeTemporaryRoot, 'oasis-week3-workspace-a')
  const workspaceBPath = resolve(safeTemporaryRoot, 'oasis-week3-workspace-b')
  const packageCopiesRoot = resolve(safeTemporaryRoot, 'packages')
  const packageTarballsRoot = resolve(safeTemporaryRoot, 'tarballs')
  const installStoreRoot = resolve(safeTemporaryRoot, 'pnpm-store')
  const dependencyTarballsRoot = resolve(safeTemporaryRoot, 'dependency-tarballs')
  const dshRuntimeParent = resolve(safeTemporaryRoot, 'runtime')
  const dshRuntimeRoot = resolve(dshRuntimeParent, 'dsh')
  await mkdir(temporaryHome)
  await mkdir(packageCopiesRoot)
  await mkdir(packageTarballsRoot)
  await mkdir(installStoreRoot)
  await mkdir(dshRuntimeParent)
  if (panelHostMode === 'better-sidebar') await mkdir(dependencyTarballsRoot)
  await cp(fixtureRoot, workspaceAPath, { recursive: true, force: false, errorOnExist: true })
  await cp(fixtureRoot, workspaceBPath, { recursive: true, force: false, errorOnExist: true })
  await validateIsolatedHome(temporaryHome, { cwd: projectRoot })
  const homeCanonical = await assertSafeChild(safeTemporaryRoot, temporaryHome, 'isolated DSH Home')
  const workspaceACanonical = await assertSafeChild(safeTemporaryRoot, workspaceAPath, 'Workspace A')
  const workspaceBCanonical = await assertSafeChild(safeTemporaryRoot, workspaceBPath, 'Workspace B')
  const packageCopiesCanonical = await assertSafeChild(safeTemporaryRoot, packageCopiesRoot, 'isolated package copies')
  const packageTarballsCanonical = await assertSafeChild(safeTemporaryRoot, packageTarballsRoot, 'isolated package tarballs')
  const installStoreCanonical = await assertSafeChild(safeTemporaryRoot, installStoreRoot, 'isolated pnpm store')
  const dependencyTarballsCanonical = panelHostMode === 'better-sidebar'
    ? await assertSafeChild(safeTemporaryRoot, dependencyTarballsRoot, 'isolated dependency tarballs')
    : null
  const sourceDshLaunch = await resolveDshLaunch({ cwd: projectRoot })
  const dshLaunch = await copyOfficialDshRuntime(sourceDshLaunch, dshRuntimeRoot)
  const dshRuntimeCanonical = await assertSafeChild(safeTemporaryRoot, dshLaunch.packageRoot, 'isolated DSH runtime')
  const isolatedDshEnv = { DSH_BIN: dshLaunch.displayPath }
  await assertReparseTargetsWithin(
    safeTemporaryRoot,
    safeTemporaryRoot,
    resolve(filesystemEvidence, 'isolated-root-reparse-targets-after-runtime-copy.json'),
  )
  await saveJson(resolve(runtimeEvidence, 'official-dsh-runtime.json'), {
    sourcePackageRoot: sourceDshLaunch.packageRoot,
    sourceCli: sourceDshLaunch.displayPath,
    copiedPackageRoot: dshRuntimeCanonical,
    copiedCli: dshLaunch.displayPath,
    version: dshLaunch.packageVersion,
    sourcePackageJsonSha256: sha256(await readFile(resolve(sourceDshLaunch.packageRoot, 'package.json'))),
    copiedPackageJsonSha256: sha256(await readFile(resolve(dshLaunch.packageRoot, 'package.json'))),
  })
  assert.notEqual(homeCanonical.toLocaleLowerCase('en-US'), profileBefore.resolvedRoot.toLocaleLowerCase('en-US'))
  assert.equal(isWithin(projectCanonical, homeCanonical), false, 'isolated Home must not be inside the repository')
  assert.equal(isWithin(projectCanonical, workspaceACanonical), false, 'Workspace A must not be inside the repository')
  assert.equal(isWithin(projectCanonical, workspaceBCanonical), false, 'Workspace B must not be inside the repository')
  await saveJson(resolve(filesystemEvidence, 'resolved-roots.json'), {
    temporaryRoot: safeTemporaryRoot,
    temporaryHome: homeCanonical,
    workspaceA: workspaceACanonical,
    workspaceB: workspaceBCanonical,
    packageCopies: packageCopiesCanonical,
    packageTarballs: packageTarballsCanonical,
    installStore: installStoreCanonical,
    dependencyTarballs: dependencyTarballsCanonical,
    dshRuntime: dshRuntimeCanonical,
    projectRoot: projectCanonical,
    realProfile: profileBefore.resolvedRoot,
    panelHostMode,
  })

  const workspaceABefore = await collectTree(workspaceACanonical, workspaceACanonical)
  const workspaceBBefore = await collectTree(workspaceBCanonical, workspaceBCanonical)
  await writeBaselineTsv(resolve(filesystemEvidence, 'workspace-a-before.tsv'), workspaceABefore)
  await writeBaselineTsv(resolve(filesystemEvidence, 'workspace-b-before.tsv'), workspaceBBefore)

  let host = null
  let hostLabel = null
  let hostPort = null
  let mainError = null
  let mainSucceeded = false
  let isolatedWorkspacePolicy = null

  try {
    const build = await run('pnpm.cmd', ['--config.verify-deps-before-run=false', 'run', 'build'], {
      cwd: packageRoot,
      shell: process.platform === 'win32',
      env: { CI: 'true' },
    })
    await writeFile(resolve(runtimeEvidence, 'build.txt'), `${build.stdout}${build.stderr}`, 'utf8')

    const isolatedPluginSources = [
      ['product', await copyPluginSource(packageRoot, resolve(packageCopiesCanonical, 'oasis-professional-service'))],
      ['layout-probe', await copyPluginSource(layoutProbe, resolve(packageCopiesCanonical, 'oasis-client-layout-probe'))],
      ['slot-probe', await copyPluginSource(slotProbe, resolve(packageCopiesCanonical, 'oasis-slot-evidence-probe'))],
      ['session-visibility-probe', await copyPluginSource(sessionVisibilityProbe, resolve(packageCopiesCanonical, 'oasis-session-visibility-probe'))],
    ]
    if (panelHostMode === 'better-sidebar') {
      const sourceManifest = JSON.parse(await readFile(resolve(betterSidebarSource, 'package.json'), 'utf8'))
      assert.equal(sourceManifest.name, 'dsh-better-sidebar')
      assert.equal(sourceManifest.version, BETTER_SIDEBAR_VERSION)
      const isolatedBetterSidebar = await copyPluginSource(
        betterSidebarSource,
        resolve(packageCopiesCanonical, 'dsh-better-sidebar'),
      )
      isolatedPluginSources.push(['better-sidebar', isolatedBetterSidebar])
      await saveJson(resolve(runtimeEvidence, 'better-sidebar-source.json'), {
        source: await realpath(betterSidebarSource),
        copiedTo: isolatedBetterSidebar,
        name: sourceManifest.name,
        version: sourceManifest.version,
        packageJsonSha256: sha256(await readFile(resolve(betterSidebarSource, 'package.json'))),
      })
    }

    const packedPluginSources = []
    for (const [label, plugin] of isolatedPluginSources) {
      const packed = await packPluginSource(label, plugin, packageTarballsCanonical)
      packedPluginSources.push([label, packed.tarball])
      await writeFile(resolve(runtimeEvidence, `plugin-pack-${label}.txt`), packed.output, 'utf8')
    }

    for (const [label, tarball] of packedPluginSources) {
      if (label === 'better-sidebar') {
        const dependencyPackages = await collectInstalledDependencyClosure(
          betterSidebarSource,
          realProfileNodeModules,
        )
        const overrides = await prepareOfflineDependencyOverrides({
          dependencyPackages,
          tarballsRoot: dependencyTarballsCanonical,
          evidencePath: resolve(runtimeEvidence, 'offline-dependency-seed.json'),
        })
        isolatedWorkspacePolicy = await setIsolatedResolutionOverrides(temporaryHome, overrides)
        await saveJson(resolve(runtimeEvidence, 'offline-resolution-overrides.json'), {
          workspacePath: isolatedWorkspacePolicy.workspacePath,
          count: Object.keys(overrides).length,
          overrides,
        })
      }
      const installArgs = [
        wrapper,
        '--home', temporaryHome,
        'plugin', '--profile', 'web',
        'add', tarball,
        '--store-dir', installStoreCanonical,
      ]
      if (panelHostMode === 'better-sidebar') installArgs.push('--offline', '--trust-lockfile', '--ignore-scripts')
      const added = await run(process.execPath, installArgs, { env: isolatedDshEnv })
      await writeFile(resolve(runtimeEvidence, `plugin-add-${label}.txt`), `${added.stdout}${added.stderr}`, 'utf8')
    }
    await assertReparseTargetsWithin(
      safeTemporaryRoot,
      safeTemporaryRoot,
      resolve(filesystemEvidence, 'isolated-root-reparse-targets-after-install.json'),
    )
    const dump = await run(process.execPath, [wrapper, '--home', temporaryHome, '--profile', 'web', '--dump-config'], {
      env: isolatedDshEnv,
    })
    for (const name of ['oasis-professional-service', 'oasis-client-layout-probe', 'oasis-slot-evidence-probe', 'oasis-session-visibility-probe']) {
      if (!dump.stdout.includes(`name: ${name}`)) throw new Error(`dump-config missing ${name}`)
    }
    if (panelHostMode === 'better-sidebar') {
      if (!dump.stdout.includes('name: dsh-better-sidebar')) throw new Error('dump-config missing dsh-better-sidebar')
      const installedManifestPath = resolve(temporaryHome, 'profiles/web/node_modules/dsh-better-sidebar/package.json')
      const installedManifest = JSON.parse(await readFile(installedManifestPath, 'utf8'))
      assert.equal(installedManifest.version, BETTER_SIDEBAR_VERSION)
      assert.equal(isWithin(safeTemporaryRoot, await realpath(installedManifestPath)), true)
      await saveJson(resolve(runtimeEvidence, 'better-sidebar-installed.json'), {
        manifestPath: await realpath(installedManifestPath),
        name: installedManifest.name,
        version: installedManifest.version,
      })
    } else if (dump.stdout.includes('name: dsh-better-sidebar')) {
      throw new Error('standalone Profile unexpectedly contains dsh-better-sidebar')
    }
    if (!dump.stdout.includes("dshHomePath('storages')")) throw new Error('dump-config does not bind JSON storage to isolated DSH Home')
    await writeFile(resolve(runtimeEvidence, 'dump-config.yml'), dump.stdout, 'utf8')

    const bootstrapPort = await allocatePort()
    hostPort = bootstrapPort
    hostLabel = 'bootstrap-host'
    host = startHost(temporaryHome, bootstrapPort, dshLaunch)
    await host.ready
    const bootstrapUrl = `http://127.0.0.1:${bootstrapPort}`
    const workspaceA = await apiRpc(bootstrapUrl, 'workspace.create', { path: workspaceACanonical }, 'week3-workspace-a')
    const workspaceAId = workspaceA.workspace.workspaceId
    const workspaceB = await apiRpc(bootstrapUrl, 'workspace.create', { path: workspaceBCanonical }, 'week3-workspace-b')
    const workspaceBId = workspaceB.workspace.workspaceId
    const sessionTitles = {
      a1: 'Oasis Week3 A-1',
      a2: 'Oasis Week3 A-2',
      b: 'Oasis Week3 B-1',
    }
    await saveJson(resolve(runtimeEvidence, 'bootstrap-identities.json'), {
      workspaceAId, workspaceBId, sessionTitles,
    })
    await stopHost(host, bootstrapPort)
    await writeFile(resolve(runtimeEvidence, 'bootstrap-host.txt'), `${host.output().stdout}${host.output().stderr}`, 'utf8')
    host = null
    hostLabel = null
    hostPort = null
    await writeFile(resolve(runtimeEvidence, 'bootstrap-port-closed.txt'), `port=${bootstrapPort}\nclosed=true\n`, 'utf8')

    const storagePath = resolve(temporaryHome, 'storages/oasis_workbench.json')
    await mkdir(dirname(storagePath), { recursive: true })
    const seededStorage = {
      unit: { name: 'oasis_workbench', version: 1 },
      global: null,
      tables: {
        workspaces: {
          [workspaceAId]: legacyRecord(workspaceAId, 'task-a', 'Host1 技术闭环', 'technical-rd'),
          [workspaceBId]: legacyRecord(workspaceBId, 'task-b', 'Host1 专利闭环', 'cn-invention-patent'),
        },
      },
    }
    await writeFile(storagePath, `${JSON.stringify(seededStorage, null, 2)}\n`, 'utf8')
    await saveJson(resolve(runtimeEvidence, 'seeded-v1-summary.json'), {
      storagePath,
      storageSha256: sha256(await readFile(storagePath)),
      workspaceAId,
      workspaceBId,
      schemaVersions: [1, 1],
    })

    const port1 = await allocatePort()
    hostPort = port1
    hostLabel = 'host1'
    host = startHost(temporaryHome, port1, dshLaunch)
    await host.ready
    const baseUrl1 = `http://127.0.0.1:${port1}`
    const migratedA = await connectionRpc(baseUrl1, 'state/get', { workspaceId: workspaceAId }, 'week3-migrated-a')
    const migratedB = await connectionRpc(baseUrl1, 'state/get', { workspaceId: workspaceBId }, 'week3-migrated-b')
    assert.equal(migratedA.schemaVersion, 2)
    assert.equal(migratedB.schemaVersion, 2)
    assert.equal(migratedA.revision, 0)
    assert.equal(migratedB.revision, 0)
    assert.equal(JSON.parse(await readFile(storagePath, 'utf8')).tables.workspaces[workspaceAId].schemaVersion, 1)

    const technicalForm = {
      objective: '验证隔离 Host 下的技术研发闭环',
      currentState: '已建立临时 Workspace、强基线与 local-mock',
      constraints: ['不得覆盖既有文件', '不得访问外部业务系统'],
      evidenceStatus: 'verified',
      expectedDeliverable: '可复核的 Markdown 与元数据',
    }
    const blockedPatentForm = {
      technicalDisclosure: '一种在隔离工作区内组织技术材料、生成草稿并经人工审核后回写的方法。',
      inventiveConcept: '以项目绑定、不可变运行快照和无覆盖提交形成可审计闭环。',
      knownPriorArt: '已知方案缺少项目级隔离和回写冲突证明。',
      terms: ['项目绑定', '运行快照', '无覆盖提交'],
      unconfirmedFacts: ['关键性能参数尚未确认'],
      desiredScope: '方法、系统及存储介质。',
    }
    const initialA = await connectionRpc(baseUrl1, 'state/replace', {
      workspaceId: workspaceAId,
      expectedRevision: 0,
      state: singleTaskDraft(editableTask('task-a', 'Host1 技术闭环', 'technical-rd', technicalForm)),
    }, 'week3-a-v2-mutation')
    const initialB = await connectionRpc(baseUrl1, 'state/replace', {
      workspaceId: workspaceBId,
      expectedRevision: 0,
      state: singleTaskDraft(editableTask('task-b', 'Host1 专利闭环', 'cn-invention-patent', blockedPatentForm)),
    }, 'week3-b-v2-mutation')
    assert.equal(initialA.current.schemaVersion, 2)
    assert.equal(initialB.current.schemaVersion, 2)
    const persistedV2 = JSON.parse(await readFile(storagePath, 'utf8'))
    assert.equal(persistedV2.tables.workspaces[workspaceAId].schemaVersion, 2)
    assert.equal(persistedV2.tables.workspaces[workspaceBId].schemaVersion, 2)
    await saveJson(resolve(runtimeEvidence, 'migration-v1-to-v2.json'), { migratedA, migratedB, initialA, initialB })

    let currentA = (await connectionRpc(baseUrl1, 'material/add', {
      workspaceId: workspaceAId, taskId: 'task-a', expectedRevision: initialA.current.revision,
      relativePath: 'materials\\technical.md', confirmed: true,
    }, 'week3-a-material')).current
    const technicalReference = currentA.tasks['task-a'].inputRefs[0]
    assert.equal(technicalReference.sha256.toUpperCase(), sha256(await readFile(resolve(workspaceACanonical, 'materials/technical.md'))))
    assert.equal(Object.hasOwn(technicalReference, 'absolutePath'), false)
    currentA = (await connectionRpc(baseUrl1, 'task/create', {
      workspaceId: workspaceAId, taskId: 'task-a', expectedRevision: currentA.revision,
      requestKey: 'week3-host1-a-run-1',
    }, 'week3-a-run-1')).current
    const runA1 = currentA.tasks['task-a'].runs[currentA.tasks['task-a'].activeRunId]
    const editedADraft = recordToDraft(currentA)
    editedADraft.tasks['task-a'].formValues.objective = '验证表单编辑后的第二次技术运行'
    currentA = (await connectionRpc(baseUrl1, 'state/replace', {
      workspaceId: workspaceAId, expectedRevision: currentA.revision, state: editedADraft,
    }, 'week3-a-edit')).current
    currentA = (await connectionRpc(baseUrl1, 'task/create', {
      workspaceId: workspaceAId, taskId: 'task-a', expectedRevision: currentA.revision,
      requestKey: 'week3-host1-a-run-2',
    }, 'week3-a-run-2')).current
    const runA2 = currentA.tasks['task-a'].runs[currentA.tasks['task-a'].activeRunId]
    assert.notEqual(runA1.inputSnapshot.sha256, runA2.inputSnapshot.sha256)
    assert.notEqual(runA1.result.artifact.sha256, runA2.result.artifact.sha256)
    assert.equal(runA2.result.artifact.body.includes('WEEK3-TECHNICAL-MATERIAL-DO-NOT-READ-INTO-RESULT'), false)
    currentA = (await connectionRpc(baseUrl1, 'task/review', {
      workspaceId: workspaceAId, taskId: 'task-a', runId: runA2.runId,
      expectedRevision: currentA.revision, status: 'approved', note: 'Host1 人工闭环演练批准。',
    }, 'week3-a-approve')).current

    const host1Prepared = await connectionRpc(baseUrl1, 'artifact/prepare-writeback', {
      workspaceId: workspaceAId, taskId: 'task-a', runId: runA2.runId,
      artifactId: runA2.result.artifact.artifactId, expectedRevision: currentA.revision,
      relativeDirectory: 'host1-export',
    }, 'week3-a-writeback-prepare')
    currentA = (await connectionRpc(baseUrl1, 'artifact/commit-writeback', {
      confirmationToken: host1Prepared.confirmationToken,
    }, 'week3-a-writeback-commit')).current
    await verifyManifest(host1Prepared.manifest)
    const sameDirectoryError = await expectRpcError(baseUrl1, 'artifact/prepare-writeback', {
      workspaceId: workspaceAId, taskId: 'task-a', runId: runA2.runId,
      artifactId: runA2.result.artifact.artifactId, expectedRevision: currentA.revision,
      relativeDirectory: 'host1-export',
    }, 'week3-a-writeback-same-directory', 'WRITEBACK_TARGET_EXISTS')

    const conflictPrepared = await connectionRpc(baseUrl1, 'artifact/prepare-writeback', {
      workspaceId: workspaceAId, taskId: 'task-a', runId: runA2.runId,
      artifactId: runA2.result.artifact.artifactId, expectedRevision: currentA.revision,
      relativeDirectory: 'host1-conflict',
    }, 'week3-a-writeback-conflict-prepare')
    const conflictDirectory = resolve(workspaceACanonical, 'host1-conflict')
    const conflictSentinel = resolve(conflictDirectory, 'sentinel.txt')
    await mkdir(conflictDirectory)
    await writeFile(conflictSentinel, 'pre-existing conflict sentinel\n', 'utf8')
    const conflictError = await expectRpcError(baseUrl1, 'artifact/commit-writeback', {
      confirmationToken: conflictPrepared.confirmationToken,
    }, 'week3-a-writeback-conflict-commit', 'WRITEBACK_TARGET_EXISTS')
    assert.equal(await readFile(conflictSentinel, 'utf8'), 'pre-existing conflict sentinel\n')
    assert.deepEqual((await collectTree(conflictDirectory, conflictDirectory)).map((row) => row.path), ['sentinel.txt'])
    await unlink(conflictSentinel)
    await rmdir(conflictDirectory)

    const concurrentPreparedA = await connectionRpc(baseUrl1, 'artifact/prepare-writeback', {
      workspaceId: workspaceAId, taskId: 'task-a', runId: runA2.runId,
      artifactId: runA2.result.artifact.artifactId, expectedRevision: currentA.revision,
      relativeDirectory: 'host1-concurrent',
    }, 'week3-a-concurrent-prepare-a')
    const concurrentPreparedB = await connectionRpc(baseUrl1, 'artifact/prepare-writeback', {
      workspaceId: workspaceAId, taskId: 'task-a', runId: runA2.runId,
      artifactId: runA2.result.artifact.artifactId, expectedRevision: currentA.revision,
      relativeDirectory: 'host1-concurrent',
    }, 'week3-a-concurrent-prepare-b')
    const concurrentCommits = await Promise.all([
      connectionRpc(baseUrl1, 'artifact/commit-writeback', { confirmationToken: concurrentPreparedA.confirmationToken }, 'week3-a-concurrent-commit-a'),
      connectionRpc(baseUrl1, 'artifact/commit-writeback', { confirmationToken: concurrentPreparedB.confirmationToken }, 'week3-a-concurrent-commit-b'),
    ])
    assert.equal(concurrentCommits.filter((value) => value.committed).length, 1)
    assert.equal(concurrentCommits.filter((value) => !value.committed && value.reason === 'revision-conflict').length, 1)
    currentA = concurrentCommits.find((value) => value.committed).current
    await verifyManifest(concurrentPreparedA.manifest)

    const host1CarryoverToken = await connectionRpc(baseUrl1, 'artifact/prepare-writeback', {
      workspaceId: workspaceAId, taskId: 'task-a', runId: runA2.runId,
      artifactId: runA2.result.artifact.artifactId, expectedRevision: currentA.revision,
      relativeDirectory: 'host1-token-carryover',
    }, 'week3-a-carryover-token')

    let currentB = (await connectionRpc(baseUrl1, 'material/add', {
      workspaceId: workspaceBId, taskId: 'task-b', expectedRevision: initialB.current.revision,
      relativePath: 'materials\\patent-disclosure.txt', confirmed: true,
    }, 'week3-b-material')).current
    currentB = (await connectionRpc(baseUrl1, 'task/create', {
      workspaceId: workspaceBId, taskId: 'task-b', expectedRevision: currentB.revision,
      requestKey: 'week3-host1-b-run-1',
    }, 'week3-b-run-1')).current
    const runB1 = currentB.tasks['task-b'].runs[currentB.tasks['task-b'].activeRunId]
    assert.equal(runB1.result.contentStatus, 'blocked')
    const blockedApprovalError = await expectRpcError(baseUrl1, 'task/review', {
      workspaceId: workspaceBId, taskId: 'task-b', runId: runB1.runId,
      expectedRevision: currentB.revision, status: 'approved', note: '',
    }, 'week3-b-blocked-approve', 'RUN_BLOCKED')
    const supplementedBDraft = recordToDraft(currentB)
    supplementedBDraft.tasks['task-b'].formValues.unconfirmedFacts = []
    currentB = (await connectionRpc(baseUrl1, 'state/replace', {
      workspaceId: workspaceBId, expectedRevision: currentB.revision, state: supplementedBDraft,
    }, 'week3-b-supplement')).current
    currentB = (await connectionRpc(baseUrl1, 'task/create', {
      workspaceId: workspaceBId, taskId: 'task-b', expectedRevision: currentB.revision,
      requestKey: 'week3-host1-b-run-2',
    }, 'week3-b-run-2')).current
    const runB2 = currentB.tasks['task-b'].runs[currentB.tasks['task-b'].activeRunId]
    assert.equal(runB2.result.contentStatus, 'warning')
    currentB = (await connectionRpc(baseUrl1, 'task/review', {
      workspaceId: workspaceBId, taskId: 'task-b', runId: runB2.runId,
      expectedRevision: currentB.revision, status: 'approved', note: '已人工复核补充信息。',
    }, 'week3-b-approve')).current

    const host1FinalA = await connectionRpc(baseUrl1, 'state/get', { workspaceId: workspaceAId }, 'week3-host1-final-a')
    const host1FinalB = await connectionRpc(baseUrl1, 'state/get', { workspaceId: workspaceBId }, 'week3-host1-final-b')
    assert.deepEqual(host1FinalA, currentA)
    assert.deepEqual(host1FinalB, currentB)
    await saveJson(resolve(runtimeEvidence, 'host1-local-loop.json'), {
      host1FinalA,
      host1FinalB,
      technicalReference,
      sameDirectoryError,
      conflictError,
      concurrentCommits,
      blockedApprovalError,
      carryoverManifest: host1CarryoverToken.manifest,
    })
    await stopHost(host, port1)
    await writeFile(resolve(runtimeEvidence, 'host1.txt'), `${host.output().stdout}${host.output().stderr}`, 'utf8')
    host = null
    hostLabel = null
    hostPort = null
    await writeFile(resolve(runtimeEvidence, 'host1-port-closed.txt'), `port=${port1}\nclosed=true\n`, 'utf8')

    const port2 = await allocatePort()
    hostPort = port2
    hostLabel = 'host2'
    host = startHost(temporaryHome, port2, dshLaunch)
    await host.ready
    const baseUrl2 = `http://127.0.0.1:${port2}`
    const restoredA = await connectionRpc(baseUrl2, 'state/get', { workspaceId: workspaceAId }, 'week3-host2-restored-a')
    const restoredB = await connectionRpc(baseUrl2, 'state/get', { workspaceId: workspaceBId }, 'week3-host2-restored-b')
    assert.deepEqual(restoredA, host1FinalA)
    assert.deepEqual(restoredB, host1FinalB)
    const invalidHost1Token = await expectRpcError(baseUrl2, 'artifact/commit-writeback', {
      confirmationToken: host1CarryoverToken.confirmationToken,
    }, 'week3-host2-invalid-host1-token', 'WRITEBACK_TOKEN_INVALID')
    const sessionA1 = await apiRpc(baseUrl2, 'session.create', { workspaceId: workspaceAId }, 'week3-host2-session-a1')
    const sessionA2 = await apiRpc(baseUrl2, 'session.create', { workspaceId: workspaceAId }, 'week3-host2-session-a2')
    const sessionB = await apiRpc(baseUrl2, 'session.create', { workspaceId: workspaceBId }, 'week3-host2-session-b')
    await Promise.all([
      seedVisibleSession(baseUrl2, sessionA1.sessionId, sessionTitles.a1, 'Local Week 3 marker A-1. No external response is required.', 'week3-host2-a1'),
      seedVisibleSession(baseUrl2, sessionA2.sessionId, sessionTitles.a2, 'Local Week 3 marker A-2. No external response is required.', 'week3-host2-a2'),
      seedVisibleSession(baseUrl2, sessionB.sessionId, sessionTitles.b, 'Local Week 3 marker B-1. No external response is required.', 'week3-host2-b'),
    ])
    const visibleSessions = await waitForVisibleSessions(baseUrl2, [sessionA1.sessionId, sessionA2.sessionId, sessionB.sessionId])
    await saveJson(resolve(runtimeEvidence, 'host2-restore.json'), {
      restoredA, restoredB, invalidHost1Token, sessionA1, sessionA2, sessionB, visibleSessions,
    })

    const browser = await run(process.execPath, ['--test', browserTest], {
      env: {
        OASIS_DSH_BASE_URL: baseUrl2,
        OASIS_BROWSER_OUTPUT: browserEvidence,
        OASIS_WORKSPACE_A_ID: workspaceAId,
        OASIS_WORKSPACE_B_ID: workspaceBId,
        OASIS_WORKSPACE_A_LABEL: 'oasis-week3-workspace-a',
        OASIS_WORKSPACE_B_LABEL: 'oasis-week3-workspace-b',
        OASIS_SESSION_A1_TITLE: sessionTitles.a1,
        OASIS_SESSION_A2_TITLE: sessionTitles.a2,
        OASIS_SESSION_B_TITLE: sessionTitles.b,
        OASIS_PANEL_HOST_MODE: panelHostMode,
        OASIS_BETTER_SIDEBAR_VERSION: panelHostMode === 'better-sidebar' ? BETTER_SIDEBAR_VERSION : '',
      },
    })
    await writeFile(resolve(runtimeEvidence, 'browser-tap.txt'), `${browser.stdout}${browser.stderr}`, 'utf8')

    const finalA = await connectionRpc(baseUrl2, 'state/get', { workspaceId: workspaceAId }, 'week3-final-a')
    const finalB = await connectionRpc(baseUrl2, 'state/get', { workspaceId: workspaceBId }, 'week3-final-b')
    const browserTask = Object.values(finalA.tasks).find((task) => task.title === '浏览器技术闭环')
    assert.ok(browserTask, 'browser-created task was not persisted')
    assert.equal(browserTask.runOrder.length, 2)
    const browserRun = browserTask.runs[browserTask.activeRunId]
    assert.equal(browserRun.review.status, 'approved')
    assert.equal(browserRun.writebacks.length, 1)
    assert.equal(browserRun.result.artifact.body.includes('WEEK3-TECHNICAL-MATERIAL-DO-NOT-READ-INTO-RESULT'), false)
    assert.equal(finalB.tasks['task-b'].runOrder.length, 2)
    assert.equal(finalB.tasks['task-b'].runs[finalB.tasks['task-b'].runOrder[0]].result.contentStatus, 'blocked')
    assert.equal(finalB.tasks['task-b'].runs[finalB.tasks['task-b'].runOrder[1]].review.status, 'approved')
    await saveJson(resolve(runtimeEvidence, 'final-authoritative-state.json'), { finalA, finalB })

    await stopHost(host, port2)
    await writeFile(resolve(runtimeEvidence, 'host2.txt'), `${host.output().stdout}${host.output().stderr}`, 'utf8')
    host = null
    hostLabel = null
    hostPort = null
    await writeFile(resolve(runtimeEvidence, 'host2-port-closed.txt'), `port=${port2}\nclosed=true\n`, 'utf8')

    if (panelHostMode === 'better-sidebar') {
      const removed = await run(process.execPath, [
        wrapper,
        '--home', temporaryHome,
        'plugin', '--profile', 'web',
        'remove', 'dsh-better-sidebar',
        '--store-dir', installStoreCanonical,
      ], { env: isolatedDshEnv })
      await writeFile(resolve(runtimeEvidence, 'plugin-remove-better-sidebar.txt'), `${removed.stdout}${removed.stderr}`, 'utf8')
      await clearIsolatedResolutionOverrides(
        isolatedWorkspacePolicy.workspacePath,
        isolatedWorkspacePolicy.original,
      )
      isolatedWorkspacePolicy = null
      const cleanupDump = await run(process.execPath, [wrapper, '--home', temporaryHome, '--profile', 'web', '--dump-config'], {
        env: isolatedDshEnv,
      })
      assert.equal(cleanupDump.stdout.includes('name: dsh-better-sidebar'), false)
      assert.equal(
        await lstat(resolve(temporaryHome, 'profiles/web/node_modules/dsh-better-sidebar')).then(() => true, (error) => {
          if (error?.code === 'ENOENT') return false
          throw error
        }),
        false,
        'Better Sidebar package remains installed after isolated uninstall',
      )
      await writeFile(resolve(runtimeEvidence, 'dump-config-after-better-sidebar-remove.yml'), cleanupDump.stdout, 'utf8')
      await assertReparseTargetsWithin(
        safeTemporaryRoot,
        safeTemporaryRoot,
        resolve(filesystemEvidence, 'isolated-root-reparse-targets-after-uninstall.json'),
      )

      const cleanupPort = await allocatePort()
      hostPort = cleanupPort
      hostLabel = 'post-uninstall-host'
      host = startHost(temporaryHome, cleanupPort, dshLaunch)
      await host.ready
      const cleanupBrowser = await run(process.execPath, ['--test', cleanupBrowserTest], {
        env: {
          OASIS_DSH_BASE_URL: `http://127.0.0.1:${cleanupPort}`,
          OASIS_BROWSER_OUTPUT: resolve(browserEvidence, 'post-uninstall'),
          OASIS_WORKSPACE_A_ID: workspaceAId,
          OASIS_WORKSPACE_A_LABEL: 'oasis-week3-workspace-a',
          OASIS_SESSION_A1_TITLE: sessionTitles.a1,
        },
      })
      await writeFile(resolve(runtimeEvidence, 'post-uninstall-browser-tap.txt'), `${cleanupBrowser.stdout}${cleanupBrowser.stderr}`, 'utf8')
      await stopHost(host, cleanupPort)
      await writeFile(resolve(runtimeEvidence, 'post-uninstall-host.txt'), `${host.output().stdout}${host.output().stderr}`, 'utf8')
      host = null
      hostLabel = null
      hostPort = null
      await writeFile(resolve(runtimeEvidence, 'post-uninstall-port-closed.txt'), `port=${cleanupPort}\nclosed=true\n`, 'utf8')
    }

    const workspaceAAfter = await collectTree(workspaceACanonical, workspaceACanonical)
    const workspaceBAfter = await collectTree(workspaceBCanonical, workspaceBCanonical)
    await writeBaselineTsv(resolve(filesystemEvidence, 'workspace-a-after.tsv'), workspaceAAfter)
    await writeBaselineTsv(resolve(filesystemEvidence, 'workspace-b-after.tsv'), workspaceBAfter)
    const allowedA = allWritebackFiles(finalA).map((file) => file.relativePath)
    const allowedB = allWritebackFiles(finalB).map((file) => file.relativePath)
    const workspaceADiff = compareRows(workspaceABefore, workspaceAAfter, allowedA)
    const workspaceBDiff = compareRows(workspaceBBefore, workspaceBAfter, allowedB)
    assert.equal(workspaceADiff.ok, true, `Workspace A unexpected changes: ${JSON.stringify(workspaceADiff.unexpected)}`)
    assert.equal(workspaceBDiff.ok, true, `Workspace B unexpected changes: ${JSON.stringify(workspaceBDiff.unexpected)}`)
    assert.equal(workspaceADiff.allowed.length, allowedA.length)
    assert.equal(workspaceBDiff.allowed.length, allowedB.length)
    for (const file of allWritebackFiles(finalA)) {
      const row = workspaceAAfter.find((candidate) => candidate.path === file.relativePath)
      assert.ok(row, `missing writeback file in Workspace A baseline: ${file.relativePath}`)
      assert.equal(row.sha256, file.sha256.toUpperCase())
    }
    await saveJson(resolve(filesystemEvidence, 'workspace-diff.json'), {
      allowedA, allowedB, workspaceADiff, workspaceBDiff,
    })
    mainSucceeded = true
  } catch (error) {
    mainError = error
  } finally {
    if (host) {
      await stopHost(host, hostPort).catch((error) => {
        if (!mainError) mainError = error
      })
      const output = host.output()
      await writeFile(resolve(runtimeEvidence, `${hostLabel ?? 'host-failed'}.txt`), `${output.stdout}${output.stderr}`, 'utf8')
    }
    let profileAfter
    try {
      profileAfter = await strongProfileSnapshot(resolve(filesystemEvidence, 'real-profile-after.tsv'))
      const profileDiff = compareRows(profileBefore.rows, profileAfter.rows)
      await saveJson(resolve(filesystemEvidence, 'real-profile-compare.json'), {
        beforeDigest: profileBefore.digest,
        afterDigest: profileAfter.digest,
        entriesBefore: profileBefore.rows.length,
        entriesAfter: profileAfter.rows.length,
        resolvedRootBefore: profileBefore.resolvedRoot,
        resolvedRootAfter: profileAfter.resolvedRoot,
        equal: profileBefore.digest === profileAfter.digest,
        changes: profileDiff.changes,
      })
      if (profileBefore.digest !== profileAfter.digest && !mainError) {
        mainError = new Error('protected real DSH Profile changed during verification')
      }
    } catch (error) {
      if (!mainError) mainError = error
    }

    if (mainSucceeded && !mainError) {
      const cleanupRoot = await assertSafeTemporaryRoot(safeTemporaryRoot)
      await rm(cleanupRoot, { recursive: true, force: false })
      await writeFile(resolve(filesystemEvidence, 'temporary-root-cleanup.txt'), `path=${cleanupRoot}\nremoved=true\n`, 'utf8')
      await removeIfPresent(resolve(runtimeEvidence, 'failure.txt'))
    } else {
      await writeFile(resolve(runtimeEvidence, 'failure.txt'), `${mainError?.stack ?? mainError?.message ?? 'unknown failure'}\n`, 'utf8')
      console.error(`verification failed; preserved isolated diagnostics at ${safeTemporaryRoot}`)
    }
  }

  if (mainError) throw mainError
  console.log(`week-3 local-loop verification passed; evidence: ${evidenceRoot}`)
}

main().catch((error) => {
  console.error(error.stack ?? error.message)
  process.exitCode = 1
})
