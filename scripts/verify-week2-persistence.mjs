import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createConnection, createServer } from 'node:net'
import { lstat, mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { collectTree, sha256, writeBaselineTsv } from './baseline-capture-core.mjs'
import { resolveDshLaunch, validateIsolatedHome } from './dsh-isolated.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageRoot = resolve(projectRoot, 'packages/oasis-professional-service')
const clientLayoutProbe = resolve(projectRoot, 'tests/fixtures/oasis-client-layout-probe')
const slotEvidenceProbe = resolve(projectRoot, 'tests/fixtures/oasis-slot-evidence-probe')
const wrapper = resolve(projectRoot, 'scripts/dsh-isolated.mjs')
const browserTest = resolve(projectRoot, 'tests/integration/week2-persistence-browser.test.mjs')
const evidenceRoot = resolve(projectRoot, process.env.OASIS_EVIDENCE_ROOT ?? 'docs/evidence/week2-persistence-2026-08-25')
const runtimeEvidence = resolve(evidenceRoot, 'runtime')
const browserEvidence = resolve(evidenceRoot, 'browser')
const realProfile = resolve(process.env.OASIS_REAL_DSH_PROFILE ?? join(process.env.USERPROFILE ?? '', '.dsh'))
const NOW = '2026-08-25T06:00:00.000Z'

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
      else rejectRun(Object.assign(new Error(`${command} exited ${result.code}\n${stderr || stdout}`), { result }))
    })
  })
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
  for (let attempt = 0; attempt < 30; attempt += 1) {
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

async function connectionRpc(baseUrl, endpoint, payload, rpcId) {
  const response = await fetch(new URL(`/oasis-workbench/${endpoint}`, baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method: endpoint, payload }),
  })
  const body = await response.json()
  if (!response.ok || body?.rpcId !== rpcId || typeof body?.result?.ok !== 'boolean') {
    throw new Error(`${endpoint} malformed transport result: HTTP ${response.status} ${JSON.stringify(body)}`)
  }
  if (!body.result.ok) throw new Error(`${endpoint} failed: ${JSON.stringify(body.result.error)}`)
  return body.result.value
}

async function seedVisibleSession(baseUrl, sessionId, title, marker, prefix) {
  await apiRpc(baseUrl, 'session.rename', { sessionId, title }, `${prefix}-rename`)
  await apiRpc(baseUrl, 'session.prompt', {
    sessionId,
    mode: 'queue',
    content: [{ type: 'text', text: marker }],
  }, `${prefix}-prompt`)
}

async function waitForVisibleSessions(baseUrl, sessionIds) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const listed = await apiRpc(baseUrl, 'session.list', {}, `week2-session-list-${attempt}`)
    const rows = listed.items.filter((item) => sessionIds.includes(item.sessionId))
    if (rows.length === sessionIds.length && rows.every((item) => item.blank === false)) return listed
    await new Promise((resolveWait) => setTimeout(resolveWait, 100))
  }
  throw new Error('verification sessions did not become visible within 5 seconds')
}

function createTask(taskId, title, workType) {
  return {
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
  }
}

function draftA(firstTitle) {
  return {
    schemaVersion: 1,
    panelMode: 'normal',
    activeTaskId: 'task-a1',
    taskOrder: ['task-a1', 'task-a2'],
    tasks: {
      'task-a1': createTask('task-a1', firstTitle, 'cn-invention-patent'),
      'task-a2': createTask('task-a2', 'Host1 A 研发任务', 'technical-rd'),
    },
  }
}

function draftB() {
  return {
    schemaVersion: 1,
    panelMode: 'hidden',
    activeTaskId: 'task-b1',
    taskOrder: ['task-b1'],
    tasks: {
      'task-b1': createTask('task-b1', 'Host1 B 专利任务', 'cn-invention-patent'),
    },
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

async function assertSafeTemporaryRoot(path) {
  const tempRoot = await realpath(tmpdir())
  const resolvedPath = await realpath(path)
  const prefix = `${tempRoot.endsWith(sep) ? tempRoot : `${tempRoot}${sep}`}oasis-dsh-week2-persistence-`
  if (!resolvedPath.startsWith(prefix)) throw new Error(`refusing cleanup outside declared temporary root: ${resolvedPath}`)
  const stat = await lstat(resolvedPath)
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`refusing cleanup of linked or non-directory root: ${resolvedPath}`)
  return resolvedPath
}

async function main() {
  await mkdir(runtimeEvidence, { recursive: true })
  await mkdir(browserEvidence, { recursive: true })
  if (!isAbsolute(realProfile)) throw new Error('real Profile path must be absolute')
  const profileBefore = await strongProfileSnapshot(resolve(runtimeEvidence, 'real-profile-before.tsv'))
  const temporaryHome = await mkdtemp(join(tmpdir(), 'oasis-dsh-week2-persistence-'))
  await validateIsolatedHome(temporaryHome, { cwd: projectRoot })
  const dshLaunch = await resolveDshLaunch({ cwd: projectRoot })
  await writeFile(resolve(runtimeEvidence, 'isolated-home.txt'), `${temporaryHome}\n`, 'utf8')
  let host = null
  let hostLabel = null
  let hostPort = null
  let succeeded = false

  try {
    const build = await run('pnpm.cmd', ['--config.verify-deps-before-run=false', 'run', 'build'], {
      cwd: packageRoot,
      shell: process.platform === 'win32',
      env: { CI: 'true' },
    })
    await writeFile(resolve(runtimeEvidence, 'build.txt'), `${build.stdout}${build.stderr}`, 'utf8')

    for (const [label, plugin] of [
      ['product', packageRoot],
      ['layout-probe', clientLayoutProbe],
      ['slot-probe', slotEvidenceProbe],
    ]) {
      const added = await run(process.execPath, [wrapper, '--home', temporaryHome, 'plugin', '--profile', 'web', 'add', plugin])
      await writeFile(resolve(runtimeEvidence, `plugin-add-${label}.txt`), `${added.stdout}${added.stderr}`, 'utf8')
    }
    const dump = await run(process.execPath, [wrapper, '--home', temporaryHome, '--profile', 'web', '--dump-config'])
    for (const name of ['oasis-professional-service', 'oasis-client-layout-probe', 'oasis-slot-evidence-probe']) {
      if (!dump.stdout.includes(`name: ${name}`)) throw new Error(`dump-config missing ${name}`)
    }
    await writeFile(resolve(runtimeEvidence, 'dump-config.yml'), dump.stdout, 'utf8')

    const port1 = await allocatePort()
    hostPort = port1
    hostLabel = 'host1'
    host = startHost(temporaryHome, port1, dshLaunch)
    await host.ready
    const baseUrl1 = `http://127.0.0.1:${port1}`

    const workspaceA = await apiRpc(baseUrl1, 'workspace.create', { path: projectRoot }, 'week2-workspace-a')
    const workspaceAId = workspaceA.workspace.workspaceId
    const workspaceB = await apiRpc(baseUrl1, 'workspace.create', { path: packageRoot }, 'week2-workspace-b')
    const workspaceBId = workspaceB.workspace.workspaceId

    const initialA = await connectionRpc(baseUrl1, 'state/replace', {
      workspaceId: workspaceAId,
      expectedRevision: 0,
      state: draftA('Host1 A 基线任务'),
    }, 'week2-a-initial')
    assert.equal(initialA.committed, true)
    const concurrent = await Promise.all([
      connectionRpc(baseUrl1, 'state/replace', {
        workspaceId: workspaceAId,
        expectedRevision: 1,
        state: draftA('Host1 A 并发甲任务'),
      }, 'week2-a-concurrent-alpha'),
      connectionRpc(baseUrl1, 'state/replace', {
        workspaceId: workspaceAId,
        expectedRevision: 1,
        state: draftA('Host1 A 并发乙任务'),
      }, 'week2-a-concurrent-beta'),
    ])
    assert.equal(concurrent.filter((result) => result.committed).length, 1)
    assert.equal(concurrent.filter((result) => !result.committed && result.reason === 'revision-conflict').length, 1)
    const winner = concurrent.find((result) => result.committed).current
    const conflict = concurrent.find((result) => !result.committed)
    assert.deepEqual(conflict.current, winner)
    const initialB = await connectionRpc(baseUrl1, 'state/replace', {
      workspaceId: workspaceBId,
      expectedRevision: 0,
      state: draftB(),
    }, 'week2-b-initial')
    assert.equal(initialB.committed, true)
    const host1GetA = await connectionRpc(baseUrl1, 'state/get', { workspaceId: workspaceAId }, 'week2-host1-get-a')
    const host1GetB = await connectionRpc(baseUrl1, 'state/get', { workspaceId: workspaceBId }, 'week2-host1-get-b')
    assert.deepEqual(host1GetA, winner)
    assert.equal(host1GetB.tasks['task-b1'].title, 'Host1 B 专利任务')
    await writeFile(resolve(runtimeEvidence, 'host1-rpc.json'), `${JSON.stringify({
      workspaceAId,
      workspaceBId,
      initialA,
      concurrent,
      host1GetA,
      host1GetB,
    }, null, 2)}\n`, 'utf8')

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
    const restoredA = await connectionRpc(baseUrl2, 'state/get', { workspaceId: workspaceAId }, 'week2-host2-get-a')
    const restoredB = await connectionRpc(baseUrl2, 'state/get', { workspaceId: workspaceBId }, 'week2-host2-get-b')
    assert.deepEqual(restoredA, host1GetA)
    assert.deepEqual(restoredB, host1GetB)
    await writeFile(resolve(runtimeEvidence, 'host2-restored-rpc.json'), `${JSON.stringify({ restoredA, restoredB }, null, 2)}\n`, 'utf8')

    const sessionA1 = await apiRpc(baseUrl2, 'session.create', { workspaceId: workspaceAId }, 'week2-session-a1')
    const sessionA2 = await apiRpc(baseUrl2, 'session.create', { workspaceId: workspaceAId }, 'week2-session-a2')
    const sessionB = await apiRpc(baseUrl2, 'session.create', { workspaceId: workspaceBId }, 'week2-session-b')
    await Promise.all([
      seedVisibleSession(baseUrl2, sessionA1.sessionId, 'Oasis 持久化 A-1', 'Local persistence marker A-1. No external response is required.', 'week2-a1'),
      seedVisibleSession(baseUrl2, sessionA2.sessionId, 'Oasis 持久化 A-2', 'Local persistence marker A-2. No external response is required.', 'week2-a2'),
      seedVisibleSession(baseUrl2, sessionB.sessionId, 'Oasis 持久化 B-1', 'Local persistence marker B-1. No external response is required.', 'week2-b1'),
    ])
    const visibleSessions = await waitForVisibleSessions(baseUrl2, [sessionA1.sessionId, sessionA2.sessionId, sessionB.sessionId])
    await writeFile(resolve(runtimeEvidence, 'host2-browser-sessions.json'), `${JSON.stringify({
      sessionA1,
      sessionA2,
      sessionB,
      visibleSessions,
    }, null, 2)}\n`, 'utf8')

    const browser = await run(process.execPath, ['--test', browserTest], {
      env: {
        OASIS_DSH_BASE_URL: baseUrl2,
        OASIS_BROWSER_OUTPUT: browserEvidence,
        OASIS_WORKSPACE_A_ID: workspaceAId,
        OASIS_WORKSPACE_B_ID: workspaceBId,
        OASIS_EXPECTED_A_TITLE: restoredA.tasks['task-a1'].title,
      },
    })
    await writeFile(resolve(runtimeEvidence, 'browser-tap.txt'), `${browser.stdout}${browser.stderr}`, 'utf8')

    const finalA = await connectionRpc(baseUrl2, 'state/get', { workspaceId: workspaceAId }, 'week2-final-get-a')
    const finalB = await connectionRpc(baseUrl2, 'state/get', { workspaceId: workspaceBId }, 'week2-final-get-b')
    assert.deepEqual(finalA.taskOrder, ['task-a1'])
    assert.equal(finalA.tasks['task-a1'].title, '浏览器重命名后任务')
    assert.equal(finalA.panelMode, 'normal')
    assert.equal(finalB.tasks['task-b1'].title, 'Host1 B 专利任务')
    await writeFile(resolve(runtimeEvidence, 'final-rpc.json'), `${JSON.stringify({ finalA, finalB }, null, 2)}\n`, 'utf8')

    await stopHost(host, port2)
    await writeFile(resolve(runtimeEvidence, 'host2.txt'), `${host.output().stdout}${host.output().stderr}`, 'utf8')
    host = null
    hostLabel = null
    hostPort = null
    await writeFile(resolve(runtimeEvidence, 'host2-port-closed.txt'), `port=${port2}\nclosed=true\n`, 'utf8')
    succeeded = true
  } finally {
    if (host) {
      await stopHost(host, hostPort).catch(() => {})
      const output = host.output()
      await writeFile(resolve(runtimeEvidence, `${hostLabel ?? 'host-failed'}.txt`), `${output.stdout}${output.stderr}`, 'utf8')
    }
    const profileAfter = await strongProfileSnapshot(resolve(runtimeEvidence, 'real-profile-after.tsv'))
    await writeFile(resolve(runtimeEvidence, 'real-profile-compare.json'), `${JSON.stringify({
      beforeDigest: profileBefore.digest,
      afterDigest: profileAfter.digest,
      entriesBefore: profileBefore.rows.length,
      entriesAfter: profileAfter.rows.length,
      linksBefore: profileBefore.rows.filter((row) => row.kind === 'link').length,
      linksAfter: profileAfter.rows.filter((row) => row.kind === 'link').length,
      resolvedRootBefore: profileBefore.resolvedRoot,
      resolvedRootAfter: profileAfter.resolvedRoot,
      equal: profileBefore.digest === profileAfter.digest,
    }, null, 2)}\n`, 'utf8')
    if (profileBefore.digest !== profileAfter.digest) throw new Error('protected real DSH Profile changed during verification')
    if (succeeded) {
      const safeRoot = await assertSafeTemporaryRoot(temporaryHome)
      await rm(safeRoot, { recursive: true, force: false })
      await writeFile(resolve(runtimeEvidence, 'isolated-home-cleanup.txt'), `path=${safeRoot}\nremoved=true\n`, 'utf8')
    } else {
      console.error(`verification failed; preserved isolated diagnostics at ${temporaryHome}`)
    }
  }

  console.log(`week-2 persistence verification passed; evidence: ${evidenceRoot}`)
}

main().catch((error) => {
  console.error(error.stack ?? error.message)
  process.exitCode = 1
})
