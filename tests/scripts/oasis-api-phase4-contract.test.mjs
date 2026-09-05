import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, realpath, symlink, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import test from 'node:test'
import { createServer } from 'node:net'
import { assertLoopbackUrl, assertIndependentHomes, claimEvidenceRoot, isolatedEnvironment, requireOfflinePackages, acquireHostLease } from '../../scripts/verify-oasis-api-phase4.mjs'
import { startFixture, FIXTURE_TOKEN, FIXTURE_SERVICE, FIXTURE_MATERIAL, FIXTURE_OPERATIONS } from '../fixtures/oasis-api-phase4-server.mjs'
import { createOasisApiClient, OASIS_API_ENDPOINTS } from '../../packages/oasis-professional-service/src/oasis-api-contract.js'
import * as phase4 from '../../scripts/verify-oasis-api-phase4.mjs'

const codedError = code => Object.assign(new Error('sensitive-error-body-must-not-be-recorded'), { code })

const evidenceTime = '2026-09-03T00:29:07.890Z'
const evidenceLaunch = `${evidenceTime} pw:browser <launched> pid=39672\n`
const evidenceClose = '2026-09-03T00:29:08.784Z pw:browser [pid=39672] <process did exit: exitCode=0, signal=null>\n'
function evidenceLog(text) {
  assert.equal(typeof phase4.createBrowserLogCollector, 'function')
  const log = phase4.createBrowserLogCollector()
  log.write(Buffer.from(text)); return log.end()
}
function evidenceInput() {
  return { workerSpawned: true, workerClosed: true, launchRequested: true,
    workerIdentity: { pid: 32648, created: evidenceTime },
    observed: [{ pid: 32648, created: evidenceTime, name: 'node.exe' }],
    log: evidenceLog(evidenceLaunch + evidenceClose),
    finalSnapshots: [{ at: '2026-09-03T00:29:10.000Z', owned: [] }, { at: '2026-09-03T00:29:13.000Z', owned: [] }] }
}
test('browser evidence keeps log-only exited roots unknown rather than fabricating OS identity', () => {
  assert.equal(typeof phase4.assessBrowserClosure, 'function')
  const result = phase4.assessBrowserClosure(evidenceInput())
  assert.equal(result.status, 'unknown')
  assert.ok(result.reasonCodes.includes('BROWSER_ROOT_IDENTITY_UNCAPTURED'))
  assert.deepEqual(result.logOnlyRoots, [{ pid: 39672, launchLogged: true, exitLogged: true }])
  assert.equal(result.observedRoots.length, 0)
})
test('browser evidence confirmed closure never removes the original launch failure', async () => {
  const input = evidenceInput()
  input.observed.push({ pid: 39672, name: 'msedge.exe', created: evidenceTime })
  const result = phase4.assessBrowserClosure(input)
  assert.equal(result.status, 'confirmed')
  const state = browserState(); state.primaryFailure = { code: 'BROWSER_LAUNCH_FAILED' }
  await phase4.settleBrowserLifecycle(state, { workerClosed: true, censusConfirmed: true, save: async () => {} })
  assert.equal(state.closed, true); assert.equal(state.ok, false)
  assert.equal(state.primaryFailure.code, 'BROWSER_LAUNCH_FAILED')
})
test('browser evidence log parser handles every byte split and redacts cross-chunk secrets', () => {
  const bytes = Buffer.from(evidenceLaunch + '中文 Authorization: Bearer CANARY_SECRET\ncookie=session-secret; second=secret\n' + evidenceClose)
  for (let split = 0; split <= bytes.length; split++) {
    const log = phase4.createBrowserLogCollector()
    log.write(bytes.subarray(0, split)); log.write(bytes.subarray(split))
    const result = log.end()
    assert.equal(result.events.length, 2)
    assert.equal(result.ambiguous, false)
    assert.ok(result.text.includes('中文'))
    assert.doesNotMatch(result.text, /CANARY_SECRET|session-secret|second=secret|\uFFFD/)
    assert.equal(result.events[0].created, undefined)
  }
})
test('browser evidence ignores nested forged events and rejects duplicates and incomplete lines', () => {
  const nested = `${evidenceTime} pw:browser [pid=1][err] ${evidenceLaunch}`
  assert.equal(evidenceLog(nested).events.length, 0)
  assert.equal(evidenceLog(evidenceLaunch + evidenceLaunch).ambiguous, true)
  assert.equal(evidenceLog(evidenceClose).ambiguous, true)
  assert.equal(evidenceLog(evidenceClose + evidenceLaunch).ambiguous, true)
  const half = evidenceLog(evidenceLaunch.trimEnd())
  assert.equal(half.events.length, 0); assert.equal(half.truncated, true)
})
test('browser evidence enforces byte line channel and event limits', () => {
  const long = evidenceLog('中'.repeat(6000) + '\n' + evidenceLaunch)
  assert.equal(long.truncated, true)
  assert.ok(Buffer.byteLength(long.text) <= 262144)
  const channel = evidenceLog(('中'.repeat(1000) + '\n').repeat(100))
  assert.ok(Buffer.byteLength(channel.text) <= 262144); assert.equal(channel.truncated, true)
  const events = evidenceLog(Array.from({ length: 65 }, (_, i) => evidenceLaunch.replace('39672', String(i + 1))).join(''))
  assert.equal(events.events.length, 64); assert.equal(events.truncated, true)
})
test('browser evidence unknown and residual assessments always explain their cause', () => {
  for (const [mutate, reason] of [
    [i => { i.workerClosed = false }, 'WORKER_EXIT_UNCONFIRMED'],
    [i => { i.finalSnapshots = [] }, 'PROCESS_CENSUS_UNAVAILABLE'],
    [i => { i.finalSnapshots[1].at = i.finalSnapshots[0].at }, 'PROCESS_CENSUS_UNAVAILABLE'],
    [i => { i.observed.push({ pid: 39672, name: 'msedge.exe', created: '' }) }, 'PROCESS_IDENTITY_INVALID'],
    [i => { i.observed.push({ pid: 39672, name: 'msedge.exe', created: evidenceTime }, { pid: 39672, name: 'msedge.exe', created: '2026-09-03T00:30:00.000Z' }) }, 'PID_GENERATION_AMBIGUOUS'],
    [i => { i.log.truncated = true }, 'LOG_TRUNCATED'],
    [i => { i.finalSnapshots[1].owned.push({ pid: 32648, created: evidenceTime }) }, 'OWNED_PROCESS_REMAINS'],
  ]) {
    const input = evidenceInput(); mutate(input)
    const result = phase4.assessBrowserClosure(input)
    assert.notEqual(result.status, 'confirmed'); assert.ok(result.reasonCodes.includes(reason), reason)
  }
  const noSpawn = phase4.assessBrowserClosure({ workerSpawned: false, workerClosed: true, launchRequested: false, observed: [], log: evidenceLog(''), finalSnapshots: [] })
  assert.equal(noSpawn.status, 'not-started')
})
test('browser evidence metadata describes comparison and proof not inferred permission', () => {
  assert.equal(typeof phase4.browserPreflightMetadata, 'function')
  const metadata = phase4.browserPreflightMetadata()
  assert.deepEqual(metadata.identityComparison, { performed: false, reason: 'single-context-run' })
  assert.equal(metadata.proofCoverage.osProfileAccessObserved, false)
  assert.equal(metadata.proofCoverage.osNetworkObserved, false)
  assert.equal(metadata.preflightComplete, false)
  assert.equal(metadata.stageComplete, false)
})
test('browser evidence failure IPC only accepts bounded diagnostic metadata', () => {
  for (const diagnostic of [{ errorName: 'Error', elapsedMs: -1 }, { errorName: 'Secret', elapsedMs: 1 }, { errorName: 'Error', elapsedMs: 1, message: 'SECRET' }]) {
    const state = browserState(); browserEvent(state, 'boot')
    assert.throws(() => browserEvent(state, 'failure', { code: 'BROWSER_LAUNCH_FAILED', phase: 'launch', diagnostic }))
  }
  const state = browserState(); browserEvent(state, 'boot')
  browserEvent(state, 'failure', { code: 'BROWSER_LAUNCH_FAILED', phase: 'launch', diagnostic: { errorName: 'TimeoutError', elapsedMs: 30000 } })
  assert.equal(state.failureDiagnostic.errorName, 'TimeoutError')
})

async function nativeDiagnosticModule() {
  const file = new URL('../../scripts/diagnose-oasis-api-phase4-windows.mjs', import.meta.url)
  assert.ok(await readFile(file, 'utf8').catch(() => null), 'native diagnostic entry must exist')
  return import(file.href)
}
function nativeReportFixture(module) {
  return { schemaVersion: 1, generatedAt: evidenceTime, pid: 42, createdAt: evidenceTime, bitness: 64,
    folders: module.KNOWN_FOLDERS.map(({ name, guid }) => ({ name, guid, flags: 16384, hTokenMode: 'current-user', hresult: '0x00000000', path: 'C:\\outside\\profile' })),
    tokens: { process: { open: { ok: true, error: 0 }, information: module.TOKEN_FIELDS.map((name, i) => ({ name, ok: true, error: 0, value: [1, 1, 8192, 1, 0][i] })) },
      thread: { open: { ok: false, error: 1008 }, information: [] } }, resourceCleanupComplete: true }
}
test('native diagnostic parser is strict and import has no native execution', async () => {
  const module = await nativeDiagnosticModule()
  assert.deepEqual(module.parseDiagnosticArgs(['--evidence', 'new-dir', '--offline']), { evidence: 'new-dir', offline: true })
  for (const args of [[], ['--evidence', 'x'], ['--offline', '--script', 'x'], ['--evidence', 'x', '--evidence', 'y', '--offline'], ['--evidence', 'x', '--offline', '--offline']]) assert.throws(() => module.parseDiagnosticArgs(args))
  assert.throws(() => module.parseNativeReport('not-json'))
  assert.throws(() => module.parseNativeReport(' '.repeat(65537)))
  const fixture = nativeReportFixture(module)
  assert.deepEqual(module.parseNativeReport(JSON.stringify(fixture)), fixture)
  for (const mutate of [x => { x.pid = 0 }, x => { x.folders.pop() }, x => { x.folders[0].flags = 32768 }, x => { x.folders[0].hTokenMode = 'other-user' }, x => { x.folders[0].cookie = 'SECRET' }, x => { x.tokens.process.information[0].value = 99 }, x => { x.resourceCleanupComplete = false }]) {
    const bad = structuredClone(fixture); mutate(bad); assert.throws(() => module.parseNativeReport(JSON.stringify(bad)))
  }
})
test('native diagnostic records API failure separately from collection completeness', async () => {
  const module = await nativeDiagnosticModule(); const fixture = nativeReportFixture(module)
  fixture.folders[0].hresult = '0x80070005'; fixture.folders[0].path = null
  fixture.tokens.process = { open: { ok: false, error: 5 }, information: [] }
  const context = await phase4.createInspectionNativeContext(process.env)
  let calls = 0
  const result = await module.collectNativeDiagnostic(context, { execute: async request => {
    calls++; assert.equal(request.timeoutMs, 15000); assert.equal(request.terminateTree, true)
    assert.ok(request.executable.endsWith('WindowsPowerShell\\v1.0\\powershell.exe') || request.executable.endsWith('WindowsPowerShell/v1.0/powershell.exe'))
    assert.deepEqual(request.argv.slice(0, 3), ['-NoProfile', '-NonInteractive', '-File'])
    assert.equal(request.env.OASIS_DIAGNOSTIC_ROOT, context.cwd)
    assert.equal(request.env.NODE_OPTIONS, undefined)
    return { exitCode: 0, closed: true, timedOut: false, pid: 42, stdout: JSON.stringify(fixture), stderr: '' }
  }, inspect: async () => { throw Error('OUTSIDE_PATH_ACCESSED') } })
  assert.equal(calls, 1); assert.equal(result.collectionComplete, true)
  assert.equal(result.browserStarted, false); assert.equal(result.dshStarted, false)
  assert.equal(result.preflightComplete, false)
  assert.equal(result.folders[0].comparison, 'unknown')
  assert.equal(result.folders[1].metadata.status, 'outside-scope')
})
test('native diagnostic fails closed on spawn timeout compile malformed or identity mismatch', async () => {
  const module = await nativeDiagnosticModule(); const context = await phase4.createInspectionNativeContext(process.env)
  const base = { exitCode: 0, closed: true, timedOut: false, pid: 42, stdout: JSON.stringify(nativeReportFixture(module)), stderr: '' }
  for (const patch of [{ exitCode: 1 }, { timedOut: true }, { closed: false }, { stdout: 'garbage' }, { pid: 43 }, { treeTermination: { ok: false } }]) {
    const result = await module.collectNativeDiagnostic(context, { execute: async () => ({ ...base, ...patch }) })
    assert.equal(result.collectionComplete, false); assert.equal(result.exitCode, 1)
  }
})
test('native diagnostic never inspects external UNC or reparse paths', async () => {
  const module = await nativeDiagnosticModule(); const context = await phase4.createInspectionNativeContext(process.env)
  for (const external of ['C:\\outside\\profile', '\\\\server\\share', context.cwd + '-sibling\\data']) {
    let visits = 0
    const result = await module.inspectDiagnosticPath(context.cwd, external, { lstat: async () => { visits++; throw Error('VISITED') } })
    assert.equal(result.status, 'outside-scope'); assert.equal(visits, 0)
  }
  const target = join(context.cwd, 'linked', 'data')
  const result = await module.inspectDiagnosticPath(context.cwd, target, { lstat: async p => ({ isSymbolicLink: () => p.endsWith('linked'), isDirectory: () => true }), realpath: async p => p })
  assert.equal(result.status, 'reparse-rejected')
})
test('native diagnostic exclusive evidence gate rejects reused and external paths before execution', async () => {
  const module = await nativeDiagnosticModule(); let called = false
  await assert.rejects(module.runWindowsDiagnostic(['--evidence', 'C:\\outside\\new', '--offline'], { execute: async () => { called = true } }))
  assert.equal(called, false)
  const folder = join(process.cwd(), 'docs/evidence/oasis-api-browser-diagnostics-2026-09-03/attempt-001')
  await assert.rejects(module.runWindowsDiagnostic(['--evidence', folder, '--offline'], { execute: async () => { called = true } }))
  assert.equal(called, false)
})
test('native diagnostic probe declares only readonly self token and no-create known-folder calls', async () => {
  await nativeDiagnosticModule()
  const source = await readFile(new URL('../../scripts/oasis-api-phase4-windows-probe.ps1', import.meta.url), 'utf8')
  for (const api of ['SHGetKnownFolderPath', 'OpenProcessToken', 'OpenThreadToken', 'GetTokenInformation', 'CloseHandle', 'FreeCoTaskMem', 'FreeHGlobal']) assert.ok(source.includes(api), api)
  assert.doesNotMatch(source, /DuplicateTokenEx|SetThreadToken|AdjustTokenPrivileges|LoadUserProfile|SHSetKnownFolderPath|ExecutionPolicy|Start-Process|Invoke-WebRequest/)
  assert.ok(source.includes('0x4000')); assert.ok(source.includes('0x0008'))
})
test('browser evidence refuses a worker identity never captured in its inventory', () => {
  const input = evidenceInput()
  input.observed = [{ pid: 39672, name: 'msedge.exe', created: evidenceTime }]
  assert.equal(phase4.assessBrowserClosure(input).status, 'unknown')
})
test('native diagnostic preserves fixed probe failure codes without raw stderr', async () => {
  const module = await nativeDiagnosticModule(); const context = await phase4.createInspectionNativeContext(process.env)
  const result = await module.collectNativeDiagnostic(context, { execute: async () => ({ exitCode: 1, closed: true, stdout: '', stderr: 'NATIVE_PROBE_COMPILE_FAILED\r\n' }) })
  assert.equal(result.failure.code, 'NATIVE_PROBE_COMPILE_FAILED')
  const unsafe = await module.collectNativeDiagnostic(context, { execute: async () => ({ exitCode: 1, closed: true, stdout: '', stderr: 'SECRET compilation details' }) })
  assert.doesNotMatch(JSON.stringify(unsafe), /SECRET/)
})
test('native diagnostic rejects impossible relative or URL folder results', async () => {
  const module = await nativeDiagnosticModule()
  for (const path of ['C:relative', 'https://example.invalid', 'relative', '\\device-relative']) {
    const fixture = nativeReportFixture(module); fixture.folders[0].path = path
    assert.throws(() => module.parseNativeReport(JSON.stringify(fixture)))
  }
})
test('native diagnostic evidence write failure cannot return collection success', async () => {
  const module = await nativeDiagnosticModule()
  const out = join(process.cwd(), 'docs/evidence/oasis-api-browser-diagnostics-2026-09-03/attempt-001', `save-failure-${Date.now()}`)
  await assert.rejects(module.runWindowsDiagnostic(['--evidence', out, '--offline'], { execute: async () => {
    await mkdir(join(out, 'native-result.json'))
    return { exitCode: 0, closed: true, pid: 42, stdout: JSON.stringify(nativeReportFixture(module)), stderr: '' }
  } }))
})

test('browser preflight dispatch never enters prepare, inspect or default integration', async () => {
  let preflights = 0
  const forbidden = async () => { throw Error('DSH_BRANCH_ENTERED') }
  await phase4.runVerification(['--stage', 'browser-preflight', '--evidence', 'fresh', '--offline'], {
    browserPreflight: async options => { preflights++; assert.equal(options.stage, 'browser-preflight') },
    prepare: forbidden, inspect: forbidden, saveBlocked: forbidden,
  })
  assert.equal(preflights, 1)
})

function browserState() {
  assert.equal(typeof phase4.createBrowserLifecycle, 'function', 'browser lifecycle must be explicit')
  return phase4.createBrowserLifecycle('preflight')
}

function browserEvent(state, type, data = {}) {
  return phase4.applyBrowserEvent(state, { sequence: state.sequence + 1, at: new Date().toISOString(), mode: state.mode, type, data })
}

test('browser launch rejection without a context must not imply closed', async () => {
  const state = browserState()
  browserEvent(state, 'boot')
  browserEvent(state, 'launch-requested')
  browserEvent(state, 'failure', { code: 'BROWSER_LAUNCH_FAILED', phase: 'launch' })
  await phase4.settleBrowserLifecycle(state, { workerClosed: true, censusConfirmed: false, save: async () => {} })
  assert.equal(state.contextConnected, false)
  assert.equal(state.closed, false)
  assert.equal(state.terminationConfirmed, false)
  assert.equal(state.failedPhase, 'launch')
})

test('browser primary, cleanup and evidence failures survive together', async () => {
  const state = browserState()
  browserEvent(state, 'boot')
  browserEvent(state, 'failure', { code: 'BROWSER_LAUNCH_FAILED', phase: 'launch' })
  browserEvent(state, 'closing')
  browserEvent(state, 'cleanup-failure', { code: 'BROWSER_CLOSE_TIMEOUT' })
  await phase4.settleBrowserLifecycle(state, { workerClosed: true, censusConfirmed: true, save: async () => { throw codedError('DISK_FULL') } })
  assert.equal(state.primaryFailure.code, 'BROWSER_LAUNCH_FAILED')
  assert.equal(state.cleanupFailures[0].code, 'BROWSER_CLOSE_TIMEOUT')
  assert.equal(state.evidenceFailures[0].code, 'DISK_FULL')
  assert.equal(state.ok, false)
  assert.equal(JSON.stringify(state).includes('sensitive-error-body'), false)
})

test('browser worker crash, missing page and uncertain descendants all fail closed', async () => {
  for (const [workerClosed, censusConfirmed] of [[false, true], [true, false], [true, true]]) {
    const state = browserState()
    browserEvent(state, 'boot')
    await phase4.settleBrowserLifecycle(state, { workerClosed, censusConfirmed, save: async () => {} })
    assert.equal(state.ok, false)
    assert.equal(state.closed, workerClosed && censusConfirmed)
  }
})

test('browser IPC rejects late success, duplicate sequence and wrong mode', () => {
  const state = browserState()
  browserEvent(state, 'boot')
  browserEvent(state, 'launch-requested')
  browserEvent(state, 'failure', { code: 'BROWSER_LAUNCH_FAILED', phase: 'launch' })
  assert.throws(() => browserEvent(state, 'context-connected'), { code: 'BROWSER_IPC_INVALID' })
  assert.throws(() => phase4.applyBrowserEvent(state, { sequence: 1, at: new Date().toISOString(), mode: state.mode, type: 'boot', data: {} }), { code: 'BROWSER_IPC_INVALID' })
  assert.throws(() => phase4.applyBrowserEvent(state, { sequence: state.sequence + 1, at: new Date().toISOString(), mode: 'other', type: 'closing', data: {} }), { code: 'BROWSER_IPC_INVALID' })
})

test('browser success requires connected page, API close and process exit proof', async () => {
  const state = browserState()
  for (const type of ['boot', 'launch-requested', 'context-connected', 'page-ready', 'closing', 'closed']) browserEvent(state, type)
  await phase4.settleBrowserLifecycle(state, { workerClosed: true, censusConfirmed: true, save: async () => {} })
  assert.equal(state.ok, true)
  assert.equal(state.closed, true)
  assert.equal(state.observationCoverage.prelaunchNetworkObserved, false)
})

test('browser page guard rejects external origin, wrong port and every mutation by default', () => {
  assert.equal(typeof phase4.browserRequestDecision, 'function')
  const origin = 'http://127.0.0.1:5151'
  assert.equal(phase4.browserRequestDecision(origin, `${origin}/assets/app.js`, 'GET'), 'allow')
  for (const [url, method] of [['https://example.com/a', 'GET'], ['http://127.0.0.1:5152/a', 'GET'], [`${origin}/api/credentials.set`, 'POST'], [`${origin}/api/unknown`, 'POST'], [`${origin}/api/model.run`, 'POST']]) {
    assert.notEqual(phase4.browserRequestDecision(origin, url, method), 'allow')
  }
})

test('owned process identity check rejects PID reuse and uncertain inventories', () => {
  assert.equal(typeof phase4.verifyOwnedWorkerIdentity, 'function')
  const expected = { pid: 42, created: '2026-09-03T00:00:00.000Z' }
  assert.equal(phase4.verifyOwnedWorkerIdentity(expected, [{ ...expected }]), true)
  assert.equal(phase4.verifyOwnedWorkerIdentity(expected, [{ pid: 42, created: 'later' }]), false)
  assert.equal(phase4.verifyOwnedWorkerIdentity(expected, null), false)
})

test('client peer drift cannot be promoted from physical resolution to browser compatibility', () => {
  assert.equal(typeof phase4.classifyInspectionPeers, 'function')
  const result = phase4.classifyInspectionPeers([
    { name: 'react', expected: '18.2.0', version: '18.3.1', path: 'isolated/react' },
    { name: 'react-dom', expected: '18.2.0', version: '19.2.8', path: 'isolated/react-dom' },
    { name: '@deepseek-ai/cordis', expected: '4.0.1', version: '4.0.1', path: 'isolated/cordis' },
  ])
  assert.equal(result.hostReady, true)
  assert.equal(result.compatibilityComplete, false)
  assert.equal(result.rows[0].clientRuntimeVersion, null)
  assert.equal(phase4.classifyInspectionPeers([{ name: '@deepseek-ai/cordis', expected: '4.0.1', version: null }]).hostReady, false)
})

function fakeBrowserDriver({ launchError, navigationError, close = async () => {} } = {}) {
  const page = { on() {}, goto: async () => { if (navigationError) throw navigationError },
    getByTestId: () => ({ waitFor: async () => {} }), screenshot: async () => {} }
  const context = { route: async () => {}, routeWebSocket: async () => {}, on() {}, pages: () => [page], close }
  const chromium = { launchPersistentContext: async () => { if (launchError) throw launchError; return context },
    launch: async () => { if (launchError) throw launchError; return { newContext: async () => context, close } } }
  return chromium
}

test('browser driver records launch failure without reporting an API close', async () => {
  const state = browserState(); browserEvent(state, 'boot')
  const result = await phase4.runBrowserDriver({ task: 'preflight', mode: 'preflight', method: 'persistent', baseUrl: 'http://127.0.0.1:5151' }, {
    chromium: fakeBrowserDriver({ launchError: codedError('SPAWN_DENIED') }), cwd: 'C:/isolated',
    emit: async (type, data = {}) => browserEvent(state, type, data),
  })
  assert.equal(result.primaryFailure.code, 'SPAWN_DENIED')
  assert.equal(state.apiClosed, false)
  assert.equal(state.closed, false)
})

test('browser driver bounds hanging close and preserves navigation failure', async () => {
  const state = browserState(); browserEvent(state, 'boot')
  const result = await phase4.runBrowserDriver({ task: 'preflight', mode: 'preflight', method: 'ephemeral', baseUrl: 'http://127.0.0.1:5151' }, {
    chromium: fakeBrowserDriver({ navigationError: codedError('NAVIGATION_FAILED'), close: () => new Promise(() => {}) }),
    cwd: 'C:/isolated', closeMs: 10, emit: async (type, data = {}) => browserEvent(state, type, data),
  })
  assert.equal(result.primaryFailure.code, 'NAVIGATION_FAILED')
  assert.equal(result.cleanupFailures[0].code, 'BROWSER_CLOSE_TIMEOUT')
  assert.equal(state.closed, false)
})

test('browser driver preserves a thrown close error separately from a primary failure', async () => {
  const state = browserState(); browserEvent(state, 'boot')
  await phase4.runBrowserDriver({ task: 'preflight', mode: 'preflight', method: 'ephemeral', baseUrl: 'http://127.0.0.1:5151' }, {
    chromium: fakeBrowserDriver({ navigationError: codedError('NAVIGATION_FAILED'), close: async () => { throw codedError('CLOSE_FAILED') } }),
    cwd: 'C:/isolated', emit: async (type, data = {}) => browserEvent(state, type, data),
  })
  assert.equal(state.primaryFailure.code, 'NAVIGATION_FAILED')
  assert.equal(state.cleanupFailures[0].code, 'CLOSE_FAILED')
})

test('browser driver rejects a preflight request bearing a DSH inspection mode before launch', async () => {
  let launched = false
  await assert.rejects(phase4.runBrowserDriver({ task: 'preflight', mode: 'standalone', method: 'persistent', baseUrl: 'http://127.0.0.1:5151' }, {
    chromium: { launchPersistentContext: async () => { launched = true; throw codedError('WRONG_BRANCH') } },
    cwd: 'C:/isolated', emit: async () => {},
  }), { code: 'BROWSER_CONFIG_INVALID' })
  assert.equal(launched, false)
})

test('inspection observer preserves user Git configuration visibility but strips credentials', () => {
  assert.equal(typeof phase4.inspectionObserverEnvironment, 'function')
  const env = phase4.inspectionObserverEnvironment({ PATH: 'tools', HOME: 'C:/owner', USERPROFILE: 'C:/owner', API_KEY: 'secret-canary', NODE_OPTIONS: 'injection', GIT_CONFIG_COUNT: '1' })
  assert.equal(env.HOME, 'C:/owner')
  assert.equal(env.GIT_OPTIONAL_LOCKS, '0')
  assert.equal(env.API_KEY, undefined)
  assert.equal(env.NODE_OPTIONS, undefined)
  assert.equal(env.GIT_CONFIG_COUNT, undefined)
})

test('browser inspection requires a fresh proven preflight before any DSH work', async () => {
  assert.equal(typeof phase4.requireInspectionBrowserPreflight, 'function')
  const options = { evidence: 'new-inspect', offline: true }
  await assert.rejects(phase4.requireInspectionBrowserPreflight(options, async () => ({ preflightComplete: false, selectedMethod: null })), { code: 'BROWSER_PREFLIGHT_REQUIRED' })
  const method = await phase4.requireInspectionBrowserPreflight(options, async request => {
    assert.equal(request.stage, 'browser-preflight'); assert.equal(request.modes, undefined)
    return { preflightComplete: true, selectedMethod: 'ephemeral', exitCode: 0 }
  })
  assert.equal(method, 'ephemeral')
  const source = await readFile(new URL('../../scripts/verify-oasis-api-phase4.mjs', import.meta.url), 'utf8')
  const run = source.slice(source.indexOf('async function runPrepareVerification(options)'))
  assert.ok(run.indexOf('await requireInspectionBrowserPreflight(options)') < run.indexOf('await resolveDshLaunch('))
  assert.equal(source.includes('await import(pathToFileURL(inspectionPlaywright).href)'), false)
})

test('browser inherited native helper receives isolated environment and cwd without secret canary', async () => {
  const context = await phase4.createInspectionNativeContext({ ...process.env, API_KEY: 'browser-secret-canary' })
  const helper = join(context.cwd, 'inheritance.mjs')
  await writeFile(helper, "import {spawnSync} from 'node:child_process';const r=spawnSync(process.env.ComSpec,['/d','/c','echo %ProgramData% & cd'],{encoding:'utf8',windowsHide:true});console.log(JSON.stringify({stdout:r.stdout,status:r.status,secret:process.env.API_KEY??null}));")
  const result = await phase4.runRecordedCommand({ executable: process.execPath, argv: [helper], cwd: context.cwd, env: context.env })
  assert.equal(result.exitCode, 0)
  const body = JSON.parse(result.stdout)
  assert.equal(body.status, 0); assert.equal(body.secret, null)
  assert.ok(body.stdout.includes(context.env.ProgramData)); assert.ok(body.stdout.includes(context.cwd))
})

test('inspection native environment must be complete before any Windows CLI launch', () => {
  assert.equal(typeof phase4.assertInspectionNativeEnvironment, 'function')
  assert.throws(() => phase4.assertInspectionNativeEnvironment(isolatedEnvironment({ SystemRoot: 'C:/Windows' }, 'C:/isolated')), { code: 'INSPECTION_WINDOWS_ENVIRONMENT_INCOMPLETE' })
  assert.throws(() => phase4.assertInspectionNativeEnvironment({ SystemDrive: '%SystemDrive%', ProgramData: 'relative', ALLUSERSPROFILE: 'relative' }), { code: 'INSPECTION_WINDOWS_ENVIRONMENT_INCOMPLETE' })
})

test('inspection installs bundles in explicit order without version-collapsing overrides', () => {
  assert.equal(typeof phase4.inspectionInstallCommands, 'function')
  const commands = phase4.inspectionInstallCommands('cli.js', { product: 'product.tgz', probe: 'probe.tgz', sidebar: 'C:/isolated/sidebar', store: 'C:/isolated/store' })
  assert.deepEqual(commands.map(item => item.label), ['product', 'probe', 'sidebar'])
  assert.deepEqual(commands.map(item => item.argv[5]), ['product.tgz', 'probe.tgz', 'link:C:/isolated/sidebar'])
  assert.ok(commands.every(item => item.argv.includes('--offline') && item.argv.includes('--ignore-scripts')))
  assert.equal(JSON.stringify(commands).includes('overrides'), false)
})

test('inspect dispatch is explicit and never opens default integration', async () => {
  const args = ['--evidence', 'attempt', '--modes', 'standalone,better-sidebar', '--offline']
  let inspected = 0; let prepared = 0; let blocked = 0
  const hooks = { inspect: async options => { inspected++; assert.equal(options.stage, 'inspect') }, prepare: async () => { prepared++ }, saveBlocked: async () => { blocked++ } }
  await phase4.runVerification([...args, '--stage', 'inspect'], hooks)
  await assert.rejects(phase4.runVerification(args, hooks), { code: 'INTEGRATION_NOT_READY' })
  assert.deepEqual([inspected, prepared, blocked], [1, 0, 1])
})

test('inspect completion requires both live contracts and all protection checks', async () => {
  const common = { requestedStage: 'inspect', checks: [{ name: 'protected', kind: 'preservation', run: async () => ({ ok: true }) }], save: async () => {} }
  const ledger = ['standalone', 'better-sidebar'].map(mode => ({ layer: 'platform-contract', mode, result: 'verified' }))
  const complete = await phase4.finalizeVerification({ ...common, ledger })
  assert.equal(complete.stageComplete, true); assert.equal(complete.phase4Complete, false)
  const missing = await phase4.finalizeVerification({ ...common, ledger: ledger.slice(0, 1) })
  assert.equal(missing.stageComplete, false); assert.equal(missing.exitCode, 1)
  const drift = await phase4.finalizeVerification({ ...common, ledger, primaryFailure: codedError('REAL_PROFILE_DRIFT') })
  assert.equal(drift.stageComplete, false)
})

async function physicalInspectionTree() {
  const root = await mkdtemp(join(tmpdir(), 'oasis-dsh-p4-inspect-test-'))
  const source = join(root, 'source', 'node_modules')
  await mkdir(join(root, 'copy'))
  const specs = [
    ['plugin', { name: 'plugin', version: '1.0.0', dependencies: { dep: '*', other: '*' } }, "import a from 'dep'; import b from 'other'; console.log(a+':'+b)"],
    ['dep', { name: 'dep', version: '1.0.0' }, "export default 'one'"],
    ['other', { name: 'other', version: '1.0.0', dependencies: { dep: '*' } }, "import d from 'dep'; export default d"],
    ['other/node_modules/dep', { name: 'dep', version: '2.0.0' }, "export default 'two'"],
  ]
  for (const [location, manifest, body] of specs) {
    const dir = join(source, location); await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'package.json'), JSON.stringify({ ...manifest, type: 'module', exports: './index.js' }))
    await writeFile(join(dir, 'index.js'), body)
  }
  return { root, source, destination: join(root, 'copy', 'node_modules') }
}

test('inspection package selection preserves actual nested multiversion resolution', async () => {
  assert.equal(typeof phase4.copyInspectionPackages, 'function')
  const tree = await physicalInspectionTree()
  const result = await phase4.copyInspectionPackages(tree.source, 'plugin', tree.destination)
  assert.equal(result.packages.length, 4)
  const run = await phase4.runRecordedCommand({ executable: process.execPath, argv: [join(tree.destination, 'plugin/index.js')], cwd: tree.root, env: {}, timeoutMs: 5000 })
  assert.equal(run.exitCode, 0, run.stderr); assert.equal(run.stdout.trim(), 'one:two')
  await assert.rejects(phase4.copyInspectionPackages(tree.source, 'plugin', tree.destination))
})

test('inspection copy rejects missing dependency, escaping link and source changes', async () => {
  assert.equal(typeof phase4.copyInspectionPackages, 'function')
  const missing = await physicalInspectionTree()
  await writeFile(join(missing.source, 'plugin/package.json'), JSON.stringify({ name: 'plugin', dependencies: { missing: '*' } }))
  await assert.rejects(phase4.copyInspectionPackages(missing.source, 'plugin', missing.destination), { code: 'OFFLINE_DEPENDENCY_MISSING' })
  const linked = await physicalInspectionTree()
  await symlink(linked.root, join(linked.source, 'plugin/outside'), process.platform === 'win32' ? 'junction' : 'dir')
  await assert.rejects(phase4.copyInspectionPackages(linked.source, 'plugin', linked.destination), { code: 'INSPECTION_SOURCE_LINK' })
  const changed = await physicalInspectionTree()
  await assert.rejects(phase4.copyInspectionPackages(changed.source, 'plugin', changed.destination, { afterCopy: async () => writeFile(join(changed.source, 'dep/index.js'), 'changed') }), { code: 'DEPENDENCY_SOURCE_DRIFT' })
})

async function probeHarness(query = async (...args) => ({ query: args.slice(0, 4) }), timeoutMs = 25) {
  const source = new URL('../fixtures/oasis-api-phase4-slot-probe/src/index.js', import.meta.url)
  assert.equal(await readFile(source, 'utf8').then(() => true, () => false), true, 'bounded Slot probe must exist')
  const { createProbeHandler } = await import(source.href)
  const agent = {}; const handler = createProbeHandler({ agents: { get: id => id === 'session-1' ? agent : undefined }, cordisInspect: { query } }, { timeoutMs })
  return async (url = '/__oasis-phase4-slot-contract?sessionId=session-1', overrides = {}) => {
    let body; const headers = {}; const res = { statusCode: 200, setHeader: (k, v) => { headers[k] = v }, end: value => { body = JSON.parse(value) } }
    await handler({ method: 'GET', url, headers: { host: '127.0.0.1:12345' }, socket: { remoteAddress: '127.0.0.1' }, ...overrides }, res)
    return { status: res.statusCode, body, headers }
  }
}

test('probe exposes full and exact Slot queries only', async () => {
  const query = await probeHarness()
  assert.deepEqual((await query()).body.query, ['client', 'Slots', 'listSubTree', {}])
  for (const root of ['settings.section', 'settings.plugins.tab', 'settings.plugin.item', 'conversation.input.right', 'shell.overlay', 'details']) {
    assert.deepEqual((await query('/__oasis-phase4-slot-contract?sessionId=session-1&root=' + root)).body.query[3], { root })
  }
})

test('probe rejects cross-origin, non-loopback, duplicate and unknown parameters without querying', async () => {
  let calls = 0; const query = await probeHarness(async () => { calls++; return {} })
  for (const suffix of ['&root=unsafe', '&root=details&root=details', '&token=secret', '&sessionId=session-1']) assert.equal((await query('/__oasis-phase4-slot-contract?sessionId=session-1'+suffix)).status, 400)
  assert.equal((await query(undefined, { method: 'POST' })).status, 405)
  assert.equal((await query(undefined, { socket: { remoteAddress: '10.0.0.1' } })).status, 403)
  assert.equal((await query(undefined, { headers: { host: 'evil.example', origin: 'http://evil.example' } })).status, 403)
  assert.equal((await query('/other?sessionId=session-1')).status, 404)
  assert.equal(calls, 0)
})

test('probe timeout and errors are bounded and never echo secrets', async () => {
  const timed = await probeHarness(async () => new Promise(() => {}), 10)
  assert.equal((await timed()).status, 504)
  const broken = await probeHarness(async () => { throw new Error('sensitive-secret') })
  const result = await broken(); assert.equal(result.status, 500); assert.equal(JSON.stringify(result).includes('sensitive-secret'), false)
})

test('inspection Host lifecycle closes its process on success and probe failure', async () => {
  assert.equal(typeof phase4.withInspectionHost, 'function')
  for (const broken of [false, true]) {
    const home = await mkdtemp(join(tmpdir(), 'oasis-dsh-p4-host-test-'))
    const script = join(home, 'host.mjs')
    await writeFile(script, "import http from 'node:http';const port=Number(process.argv.at(-1));http.createServer((q,r)=>r.end('ready')).listen(port,'127.0.0.1',()=>console.log('http://127.0.0.1:'+port));")
    let record; let observedPid
    const run = phase4.withInspectionHost({ home, executable: process.execPath, argv: [script], cwd: home, env: {}, readinessMs: 5000, save: async value => { record = value } }, async ({ pid }) => {
      observedPid = pid
      if (broken) throw codedError('PROBE_FAILED')
      return 'observed'
    })
    if (broken) await assert.rejects(run, { code: 'PROBE_FAILED' })
    else assert.equal(await run, 'observed')
    assert.equal(record.closed, true); assert.equal(record.portClosed, true)
    assert.throws(() => process.kill(observedPid, 0))
    const lease = await acquireHostLease(home); await lease.release()
  }
})

test('inspection Host refuses busy port and bounds startup failures without leaking leases', async () => {
  assert.equal(typeof phase4.withInspectionHost, 'function')
  const home = await mkdtemp(join(tmpdir(), 'oasis-dsh-p4-host-test-'))
  const occupied = createServer(); await new Promise(resolve => occupied.listen(0, '127.0.0.1', resolve))
  try {
    await assert.rejects(phase4.withInspectionHost({ home, port: occupied.address().port, executable: 'not-launched', argv: [], cwd: home, env: {}, save: async () => {} }, async () => {}), { code: 'HOST_PORT_BUSY' })
  } finally { await new Promise(resolve => occupied.close(resolve)) }
  for (const kind of ['missing', 'early-exit', 'timeout']) {
    const script = join(home, kind+'.mjs'); await writeFile(script, kind === 'timeout' ? 'setInterval(()=>{},1000)' : 'process.exit(2)')
    let record
    await assert.rejects(phase4.withInspectionHost({ home, executable: kind === 'missing' ? join(home, 'missing.exe') : process.execPath, argv: [script], cwd: home, env: {}, readinessMs: 200, save: async value => { record = value } }, async () => assert.fail('must not probe')))
    assert.equal(record.closed, true)
    const lease = await acquireHostLease(home); await lease.release()
  }
})

test('inspection scope checks ordered full and exact query completion, not HTTP 200 alone', async () => {
  assert.equal(typeof phase4.collectSlotContracts, 'function')
  const roots = ['settings.section', 'settings.plugins.tab', 'settings.plugin.item', 'conversation.input.right', 'shell.overlay', 'details']
  const calls = []; const saved = []
  const query = async root => { calls.push(root); return { trees: [{ name: root ?? 'root', purpose: 'fixture', children: [] }], ...(root === null ? {} : { requestedRoot: { name: root, available: true }, selected: { name: root, kind: 'list', scope: 'root', occupants: [], catalog: { registration: [], ownerProps: [], standardProps: [], replaceRisk: 'fixture' } } }) } }
  await phase4.collectSlotContracts({ query, save: async (name, body) => { saved.push({ name, body }) } })
  assert.deepEqual(calls, [null, ...roots]); assert.equal(saved.length, 7)
  let count = 0
  await assert.rejects(phase4.collectSlotContracts({ query: async root => { if (++count === 3) throw codedError('PROBE_FAILED'); return query(root) }, save: async () => {} }), { code: 'PROBE_FAILED' })
  assert.equal(count, 3)
  await assert.rejects(phase4.collectSlotContracts({ query: async () => ({}), save: async () => {} }), { code: 'SLOT_CONTRACT_INCOMPLETE' })
})

test('inspection CLI timeout terminates its owned nested process tree on Windows', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oasis-dsh-p4-cli-test-'))
  const leaf = join(root, 'leaf.mjs'); const parent = join(root, 'parent.mjs')
  await writeFile(leaf, 'setInterval(()=>{},1000)')
  await writeFile(parent, "import {spawn} from 'node:child_process';const c=spawn(process.execPath,[process.argv[2]],{stdio:'ignore',windowsHide:true});console.log(c.pid);setInterval(()=>{},1000)")
  assert.equal(typeof phase4.terminateOwnedProcessTree, 'function')
  const result = await phase4.runRecordedCommand({ executable: process.execPath, argv: [parent, leaf], cwd: root, env: process.env, timeoutMs: 750, terminateTree: true })
  const pid = Number(result.stdout.trim())
  console.log(JSON.stringify({ nativeProcessResult: result }))
  assert.ok(pid > 0); assert.equal(result.timedOut, true); assert.equal(result.treeTermination.ok, true)
  assert.throws(() => process.kill(pid, 0)); assert.throws(() => process.kill(result.pid, 0))
  assert.equal(result.treeTermination.closed, true)
  assert.match(result.treeTermination.cwd, /oasis-dsh-p4-native-/)
  assert.notEqual(result.treeTermination.cwd, root)
  assert.equal(result.treeTermination.environment.ProgramData, join(result.treeTermination.cwd, 'programdata'))
  assert.match(result.treeTermination.environment.SystemDrive, /^[a-z]:$/i)
  console.log(JSON.stringify({ nativeCleanup: result.treeTermination }))
})

test('failed tree termination is reported and does not leave the command promise pending', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oasis-dsh-p4-cli-test-'))
  const file = join(root, 'single.mjs'); await writeFile(file, 'setInterval(()=>{},1000)')
  const result = await phase4.runRecordedCommand({ executable: process.execPath, argv: [file], cwd: root, env: {}, timeoutMs: 50,
    terminateTree: async () => ({ ok: false, error: { code: 'TERMINATION_DENIED' } }) })
  assert.equal(result.timedOut, true); assert.equal(result.treeTermination.ok, false)
  assert.equal(result.treeTermination.error.code, 'TERMINATION_DENIED'); assert.equal(result.closed, true)
})

test('finalizer preserves primary failure and attempts every protection check', async () => {
  assert.equal(typeof phase4.finalizeVerification, 'function', 'independent finalizer is required')
  const attempted = []; const saved = new Map()
  const result = await phase4.finalizeVerification({
    requestedStage: 'prepare', primaryFailure: codedError('BUILD_FAILED'),
    checks: ['resources', 'profile', 'files', 'authority', 'head', 'stage', 'additions'].map(name => ({
      name, kind: name === 'resources' ? 'cleanup' : 'preservation',
      async run() { attempted.push(name); if (name === 'profile') throw codedError('REAL_PROFILE_DRIFT'); if (name === 'authority') throw codedError('API_DRIFT'); return { ok: true } },
    })),
    save: async (name, data) => { saved.set(name, data) },
  })
  assert.equal(attempted.length, 7)
  assert.equal(result.primaryFailure.code, 'BUILD_FAILED')
  assert.deepEqual(result.preservationFailures.map(item => item.code), ['REAL_PROFILE_DRIFT', 'API_DRIFT'])
  assert.equal(result.stageComplete, false); assert.equal(result.phase4Complete, false); assert.equal(result.exitCode, 1)
  assert.equal(result.status, 'BLOCKED_WAITING_FOR_USER')
  assert.ok(saved.has('evidence-ledger.json'))
  assert.equal(JSON.stringify([...saved]).includes('sensitive-error-body'), false)
})

test('finalizer continues after evidence-write failure and cannot claim completion', async () => {
  assert.equal(typeof phase4.finalizeVerification, 'function')
  const saves = []
  const result = await phase4.finalizeVerification({ requestedStage: 'prepare', checks: [
    { name: 'profile', kind: 'preservation', run: async () => ({ ok: true }) },
    { name: 'head', kind: 'preservation', run: async () => ({ ok: true }) },
  ], save: async name => { saves.push(name); if (name === 'profile.json' || name === 'evidence-ledger.json') throw codedError('EACCES') } })
  assert.ok(saves.includes('head.json')); assert.ok(saves.includes('commands.json'))
  assert.equal(result.evidenceFailures.length, 2); assert.equal(result.exitCode, 1); assert.equal(result.stageComplete, false)
})

test('finalizer reports uncollected baseline and cleanup errors without suppressing other checks', async () => {
  assert.equal(typeof phase4.finalizeVerification, 'function')
  const result = await phase4.finalizeVerification({ requestedStage: 'prepare', checks: [
    { name: 'resources', kind: 'cleanup', run: async () => { throw codedError('CHILD_STOP_FAILED') } },
    { name: 'files', kind: 'preservation', run: null },
    { name: 'head', kind: 'preservation', run: async () => ({ ok: true }) },
  ], save: async () => {} })
  assert.equal(result.checks[1].result, 'not-collected'); assert.equal(result.checks[2].result, 'checked')
  assert.equal(result.cleanupFailures[0].code, 'CHILD_STOP_FAILED'); assert.equal(result.exitCode, 1)
})

test('file hashing collects all missing files rather than short-circuiting', async () => {
  assert.equal(typeof phase4.hashFiles, 'function')
  const root = await mkdtemp(join(tmpdir(), 'oasis-dsh-p4-test-'))
  await writeFile(join(root, 'present'), 'synthetic')
  const result = await phase4.hashFiles(root, ['absent-a', 'present', 'absent-b'])
  assert.equal(result.rows.length, 1); assert.equal(result.errors.length, 2)
  assert.deepEqual(result.errors.map(item => item.path), ['absent-a', 'absent-b'])
})

test('command runner records spawn errors and waits for timed-out child exit', async () => {
  assert.equal(typeof phase4.runRecordedCommand, 'function')
  const root = await mkdtemp(join(tmpdir(), 'oasis-dsh-p4-test-'))
  const missing = await phase4.runRecordedCommand({ executable: join(root, 'missing.exe'), argv: [], cwd: root, env: {}, timeoutMs: 1000 })
  assert.equal(missing.spawnError.code, 'ENOENT'); assert.equal(missing.exitCode, null)
  assert.ok(missing.startedAt); assert.ok(missing.finishedAt)
  const script = join(root, 'wait.mjs'); await writeFile(script, 'setInterval(() => {}, 1000)')
  const slow = await phase4.runRecordedCommand({ executable: process.execPath, argv: [script], cwd: root, env: {}, timeoutMs: 100 })
  assert.equal(slow.timedOut, true); assert.equal(slow.closed, true)
  assert.throws(() => process.kill(slow.pid, 0))
})

async function dependencyTree() {
  const root = await mkdtemp(join(tmpdir(), 'oasis-dsh-p4-test-'))
  const source = join(root, 'source'); await mkdir(source)
  const packages = { tool: ['tool@1', "import a from 'dep'; import b from 'other'; console.log(a + ':' + b)"], dep1: ['dep@1', "import v from 'leaf'; export default 'one-'+v"], dep2: ['dep@2', "export default 'two'"], leaf: ['leaf@1', "export default 'leaf'"], other: ['other@1', "import d from 'dep'; export default d"] }
  const locations = {}
  for (const [key, [store, body]] of Object.entries(packages)) {
    const name = store.split('@')[0]; const directory = join(source, '.pnpm', store, 'node_modules', name)
    await mkdir(directory, { recursive: true }); locations[key] = directory
    await writeFile(join(directory, 'package.json'), JSON.stringify({ name, type: 'module', exports: './index.js' }))
    await writeFile(join(directory, 'index.js'), body)
  }
  const link = (from, to) => symlink(to, from, process.platform === 'win32' ? 'junction' : 'dir')
  await link(join(source, 'tool'), locations.tool)
  await link(join(locations.tool, '..', 'dep'), locations.dep1)
  await link(join(locations.tool, '..', 'other'), locations.other)
  await link(join(locations.dep1, '..', 'leaf'), locations.leaf)
  await link(join(locations.other, '..', 'dep'), locations.dep2)
  return { root, source, destination: join(root, 'copy'), locations, link }
}

test('isolated dependency copy preserves multilevel and multiple-version ESM resolution', async () => {
  assert.equal(typeof phase4.copyIsolatedNodeModules, 'function', 'topology-preserving copy is required')
  const tree = await dependencyTree()
  const copied = await phase4.copyIsolatedNodeModules(tree.source, tree.destination)
  assert.equal(copied.links.length, 5); assert.equal(copied.files, 10)
  for (const item of copied.links) assert.ok((await realpath(join(tree.destination, item.path))).startsWith(await realpath(tree.destination)))
  const result = await phase4.runRecordedCommand({ executable: process.execPath, argv: [join(tree.destination, 'tool/index.js')], cwd: tree.root, env: {}, timeoutMs: 5000 })
  assert.equal(result.exitCode, 0, result.stderr); assert.equal(result.stdout.trim(), 'one-leaf:two')
  await assert.rejects(phase4.copyIsolatedNodeModules(tree.source, tree.destination), { code: 'EEXIST' })
})

for (const kind of ['outside', 'dangling', 'file-target']) test(`dependency copier rejects ${kind} link without following it`, async () => {
  assert.equal(typeof phase4.copyIsolatedNodeModules, 'function')
  const tree = await dependencyTree()
  let target = join(tree.root, 'outside')
  if (kind === 'outside') await mkdir(target)
  if (kind === 'file-target') { target = join(tree.source, 'file'); await writeFile(target, 'synthetic') }
  await tree.link(join(tree.source, 'unsafe'), target)
  await assert.rejects(phase4.copyIsolatedNodeModules(tree.source, tree.destination))
  await assert.rejects(readFile(join(tree.destination, 'tool/package.json')))
})

test('dependency copy detects source change during copy and retains the rejected destination', async () => {
  assert.equal(typeof phase4.copyIsolatedNodeModules, 'function')
  const tree = await dependencyTree()
  await assert.rejects(phase4.copyIsolatedNodeModules(tree.source, tree.destination, {
    afterCopy: async () => writeFile(join(tree.locations.leaf, 'index.js'), "export default 'changed'"),
  }), { code: 'DEPENDENCY_SOURCE_DRIFT' })
  assert.equal(await readFile(join(tree.destination, '.pnpm/leaf@1/node_modules/leaf/index.js'), 'utf8'), "export default 'leaf'")
})

test('dependency copy rejects source metadata drift even when bytes are unchanged', async () => {
  const tree = await dependencyTree()
  await assert.rejects(phase4.copyIsolatedNodeModules(tree.source, tree.destination, {
    afterCopy: async () => utimes(join(tree.locations.leaf, 'index.js'), new Date('2020-01-01'), new Date('2020-01-01')),
  }), { code: 'DEPENDENCY_SOURCE_DRIFT' })
})

test('Profile gate requires three matching snapshots spaced by five seconds', async () => {
  assert.equal(typeof phase4.requireStableProfile, 'function')
  let calls = 0; const delays = []; const collected = []
  const result = await phase4.requireStableProfile('synthetic', {
    snapshot: async () => { calls++; return [{ path: 'a', sha256: 'fixed' }] },
    sleep: async ms => { delays.push(ms) }, onSnapshot: async (rows, index) => { collected.push(index) },
  })
  assert.equal(calls, 3); assert.deepEqual(delays, [5000, 5000]); assert.deepEqual(collected, [0, 1, 2])
  assert.equal(result[0].sha256, 'fixed')
})

for (const change of ['content', 'addition', 'deletion', 'link', 'metadata', 'unreadable']) test(`Profile gate rejects ${change} without rebaselining`, async () => {
  assert.equal(typeof phase4.requireStableProfile, 'function')
  let calls = 0
  await assert.rejects(phase4.requireStableProfile('synthetic', {
    snapshot: async () => {
      if (++calls === 1) return [{ path: 'a', sha256: 'fixed', target: '', mtimeMs: 1 }]
      if (change === 'unreadable') throw codedError('EACCES')
      if (change === 'deletion') return []
      if (change === 'addition') return [{ path: 'a', sha256: 'fixed', target: '', mtimeMs: 1 }, { path: 'b' }]
      return [{ path: 'a', sha256: change === 'content' ? 'changed' : 'fixed', target: change === 'link' ? 'other' : '', mtimeMs: change === 'metadata' ? 2 : 1 }]
    }, sleep: async () => {},
  }), { code: 'PROFILE_UNSTABLE' })
  assert.equal(calls, 2)
})

test('strong snapshot detects a file modified during its hash read', async () => {
  assert.equal(typeof phase4.snapshotTree, 'function')
  const root = await mkdtemp(join(tmpdir(), 'oasis-dsh-p4-test-'))
  await writeFile(join(root, 'a'), 'before')
  await assert.rejects(phase4.snapshotTree(root, { afterHash: async name => writeFile(name, 'changed-size') }), { code: 'SNAPSHOT_UNSTABLE' })
})

test('strong snapshot never follows links to external credential-like data', async () => {
  assert.equal(typeof phase4.snapshotTree, 'function')
  const root = await mkdtemp(join(tmpdir(), 'oasis-dsh-p4-test-'))
  const inside = join(root, 'inside'); const outside = join(root, 'outside')
  await mkdir(inside); await mkdir(outside); await writeFile(join(outside, 'secret'), 'not-to-be-read')
  await symlink(outside, join(inside, 'link'), process.platform === 'win32' ? 'junction' : 'dir')
  let reads = 0
  const result = await phase4.snapshotTree(inside, { afterHash: async () => { reads++ } })
  assert.equal(reads, 0); assert.equal(result.length, 1); assert.equal(result[0].kind, 'link')
  assert.equal(JSON.stringify(result).includes('not-to-be-read'), false)
})

test('stage parser rejects ambiguity and defaults to gated integration', () => {
  assert.equal(typeof phase4.parseVerificationArgs, 'function')
  const args = ['--evidence', 'attempt', '--modes', 'standalone,better-sidebar', '--offline']
  assert.equal(phase4.parseVerificationArgs(args).stage, 'integration')
  assert.equal(phase4.parseVerificationArgs([...args, '--stage', 'prepare']).stage, 'prepare')
  for (const extra of [['--stage'], ['--stage', 'unknown'], ['--offline'], ['--stage', 'prepare', '--stage', 'prepare'], ['--evidence', '--offline'], ['--url', 'http://example.com']]) assert.throws(() => phase4.parseVerificationArgs([...args, ...extra]))
})

test('stage dispatch refuses integration before preparation or any service startup', async () => {
  assert.equal(typeof phase4.runVerification, 'function')
  let prepared = 0; let blocked = 0
  const hooks = { prepare: async options => { prepared++; assert.equal(options.stage, 'prepare') }, saveBlocked: async () => { blocked++ } }
  const args = ['--evidence', 'attempt', '--modes', 'standalone,better-sidebar', '--offline']
  await assert.rejects(phase4.runVerification(args, hooks), { code: 'INTEGRATION_NOT_READY' })
  await assert.rejects(phase4.runVerification([...args, '--stage', 'integration'], hooks), { code: 'INTEGRATION_NOT_READY' })
  assert.equal(prepared, 0); assert.equal(blocked, 2)
  await phase4.runVerification([...args, '--stage', 'prepare'], hooks)
  assert.equal(prepared, 1); assert.equal(blocked, 2)
})

test('successful preparation still does not claim full fourth-batch completion', async () => {
  const result = await phase4.finalizeVerification({ requestedStage: 'prepare', checks: [
    { name: 'synthetic', kind: 'preservation', run: async () => ({ ok: true }) },
  ], save: async () => {} })
  assert.equal(result.exitCode, 0); assert.equal(result.stageComplete, true)
  assert.equal(result.phase4Complete, false); assert.equal(result.status, 'STATIC_ONLY')
})

test('tarball verification checks actual contents and rejects unlisted or mismatched files', async () => {
  assert.equal(typeof phase4.verifyPackageTarball, 'function')
  const root = await mkdtemp(join(tmpdir(), 'oasis-dsh-p4-test-'))
  await mkdir(join(root, 'package')); await writeFile(join(root, 'package/a.txt'), 'synthetic')
  const tar = createRequire('C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js')('tar')
  const file = join(root, 'test.tgz'); await tar.c({ cwd: root, file, gzip: true }, ['package'])
  const expected = [{ path: 'a.txt', sha256: createHash('sha256').update('synthetic').digest('hex').toUpperCase() }]
  assert.equal((await phase4.verifyPackageTarball(file, expected)).files.length, 1)
  await assert.rejects(phase4.verifyPackageTarball(file, []), { code: 'TARBALL_CONTENT_MISMATCH' })
  await assert.rejects(phase4.verifyPackageTarball(file, [{ path: 'a.txt', sha256: 'wrong' }]), { code: 'TARBALL_CONTENT_MISMATCH' })
})

test('evidence directories cannot be reused', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oasis-dsh-p4-test-'))
  const target = join(root, 'attempt-001')
  await claimEvidenceRoot(target, root)
  await assert.rejects(claimEvidenceRoot(target, root))
  await assert.rejects(claimEvidenceRoot(join(root, '..', 'outside'), root))
})

test('only literal loopback HTTP origin is accepted', () => {
  assert.equal(assertLoopbackUrl('http://127.0.0.1:12345'), 'http://127.0.0.1:12345')
  for (const value of ['https://example.com', 'http://localhost:1234', 'http://127.1:1234', 'http://user@127.0.0.1:1234', 'http://127.0.0.1:1234/a', 'http://127.0.0.1:1234?token=x']) assert.throws(() => assertLoopbackUrl(value))
})

test('Home isolation rejects real Profile, shared paths and junctions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oasis-dsh-p4-test-'))
  const a = join(root, 'a'); const b = join(root, 'b')
  await mkdir(a); await mkdir(b)
  await assertIndependentHomes([a, b], root)
  await assert.rejects(assertIndependentHomes([a, a], root))
  await assert.rejects(assertIndependentHomes([a, join(a, 'child')], root))
  await assert.rejects(assertIndependentHomes(['C:/Users/TinaD/.dsh'], root))
  const link = join(root, 'link')
  await symlink(b, link, process.platform === 'win32' ? 'junction' : 'dir')
  await assert.rejects(assertIndependentHomes([link], root))
})

test('child environment never inherits credential or external configuration', () => {
  const env = isolatedEnvironment({ PATH: 'tool-path', SystemRoot: 'C:/Windows', OASIS_USER_JWT: 'DO-NOT-INHERIT', OPENAI_API_KEY: 'DO-NOT-INHERIT', NODE_OPTIONS: '--require unsafe', DSH_HOME: 'real-home', npm_config_userconfig: 'real-config' }, 'C:/isolated')
  assert.equal(env.PATH, 'tool-path')
  assert.equal(env.DSH_HOME, 'C:/isolated/home')
  for (const key of ['OASIS_USER_JWT', 'OPENAI_API_KEY', 'NODE_OPTIONS']) assert.equal(env[key], undefined)
  assert.notEqual(env.npm_config_userconfig, 'real-config')
  assert.equal(env.npm_config_offline, 'true')
})

test('missing offline package and duplicate Host fail closed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oasis-dsh-p4-test-'))
  await assert.rejects(requireOfflinePackages([{ name: 'missing', path: join(root, 'missing') }]), /OFFLINE_DEPENDENCY_MISSING/)
  const pkg = join(root, 'pkg'); await mkdir(pkg)
  await writeFile(join(pkg, 'package.json'), JSON.stringify({ name: 'test', version: '1.0.0' }))
  assert.equal((await requireOfflinePackages([{ name: 'test', path: pkg }])).length, 1)
  await assert.rejects(requireOfflinePackages([{ name: 'other', path: pkg }]))
  const lease = await acquireHostLease(root)
  await assert.rejects(acquireHostLease(root))
  await lease.release()
  const second = await acquireHostLease(root); await second.release()
})

test('fixture has exactly the frozen nine business endpoints', () => {
  assert.deepEqual(FIXTURE_OPERATIONS.map(({ method, path }) => ({ method, path })), OASIS_API_ENDPOINTS.map(({ method, path }) => ({ method, path })))
})

async function withClient(scenario, callback) {
  const fixture = await startFixture({ scenario })
  const client = createOasisApiClient({ baseUrl: fixture.origin, resolveToken: async () => FIXTURE_TOKEN })
  try { await callback(client, fixture) } finally { await fixture.close() }
}
const createInput = (origin) => ({ id: FIXTURE_SERVICE.id, key: 'synthetic-request-key-p4', inputs: { topic: 'synthetic topic', material: { type: 'document', transfer_method: 'remote_url', url: `${origin}/files/material.txt` } }, apiProcess: FIXTURE_SERVICE.process, folderId: FIXTURE_SERVICE.folderId })

test('actual adapter uses HTTP for all nine operations without logging sensitive values', async () => {
  await withClient('success', async (client, fixture) => {
    assert.equal((await client.getUserDetail()).balance, 100)
    assert.equal((await client.getCategoryCatalog())[0].apiId, FIXTURE_SERVICE.id)
    assert.equal((await client.getApiDetail(FIXTURE_SERVICE.endpoint)).inputFields.length, 2)
    assert.equal((await client.getFolderList()).items[0].id, FIXTURE_SERVICE.folderId)
    assert.equal((await client.getFolderDetail(FIXTURE_SERVICE.folderId)).id, FIXTURE_SERVICE.folderId)
    assert.equal(await client.uploadFile({ bytes: Buffer.from(FIXTURE_MATERIAL), fileName: 'material.txt', mediaType: 'text/plain' }), `${fixture.origin}/files/material.txt`)
    const created = await client.createWorkflow(createInput(fixture.origin))
    assert.equal(created.resolved, true); assert.equal(created.result.fileUrls.length, 2)
    assert.equal((await client.queryProcess('synthetic-request-key-p4')).status, 'completed')
    assert.equal((await client.getRunningWater()).items.length, 1)
    assert.equal(fixture.snapshot().events.length, 9)
    assert.equal(fixture.snapshot().violations.length, 0)
    const logs = JSON.stringify(fixture.snapshot())
    for (const secret of [FIXTURE_TOKEN, FIXTURE_MATERIAL, 'synthetic-request-key-p4', 'synthetic topic', 'answer_text', 'authorization']) assert.equal(logs.includes(secret), false)
  })
})

for (const scenario of ['receipt', 'lost-create', 'no-create-id']) test(`fixture supports ${scenario} without another create`, async () => {
  await withClient(scenario, async (client, fixture) => {
    if (scenario === 'lost-create') await assert.rejects(client.createWorkflow(createInput(fixture.origin)))
    else {
      const created = await client.createWorkflow(createInput(fixture.origin))
      if (scenario === 'receipt') assert.equal(created.resolved, false)
      else assert.equal(created.result.recordId, undefined)
    }
    assert.equal((await client.queryProcess('synthetic-request-key-p4')).status, 'completed')
    assert.equal(fixture.snapshot().counts.create, 1)
  })
})

for (const scenario of ['unsafe-query', 'unsafe-fragment', 'unsafe-userinfo']) test(`adapter rejects ${scenario} response`, async () => {
  await withClient(scenario, async (client, fixture) => {
    await assert.rejects(client.createWorkflow(createInput(fixture.origin)), { code: 'UNTRUSTED_REMOTE_URL' })
    assert.equal(fixture.snapshot().counts.create, 1)
  })
})

for (const scenario of ['ledger-raw', 'ledger-empty', 'ledger-duplicate', 'ledger-malformed', 'unauthorized']) test(`adapter observes ${scenario}`, async () => {
  await withClient(scenario, async (client) => {
    if (scenario === 'ledger-malformed') await assert.rejects(client.getRunningWater(), { code: 'INVALID_RESPONSE' })
    else if (scenario === 'unauthorized') await assert.rejects(client.getRunningWater(), { code: 'AUTH_REQUIRED' })
    else assert.equal((await client.getRunningWater()).items.length, scenario === 'ledger-empty' ? 0 : scenario === 'ledger-duplicate' ? 2 : 1)
  })
})

test('fixture rejects extra create fields, unexpected endpoint, query and malformed material', async () => {
  await withClient('success', async (_client, fixture) => {
    const request = async (url, options = {}) => fetch(fixture.origin + url, { ...options, headers: { authorization: `Bearer ${FIXTURE_TOKEN}`, 'content-type': 'application/json' }, redirect: 'error' })
    const { apiProcess, folderId, ...input } = createInput(fixture.origin)
    const wire = { ...input, api_process: apiProcess, folder_id: folderId }
    assert.equal((await request('/api/apicategories/create', { method: 'POST', body: JSON.stringify({ ...wire, extra: true }) })).status, 400)
    assert.equal((await request('/api/fixture/control')).status, 400)
    assert.equal((await request('/api/user/detail?x=1')).status, 400)
    assert.equal((await request('/api/user/upload', { method: 'POST', body: '{}' })).status, 400)
    assert.equal(fixture.snapshot().violations.length, 4)
  })
  await withClient('success', async (_client, fixture) => {
    const { apiProcess, folderId, ...input } = createInput(fixture.origin)
    const response = await fetch(fixture.origin + '/api/apicategories/create', { method: 'POST', headers: { authorization: `Bearer ${FIXTURE_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify({ ...input, api_process: apiProcess, folder_id: folderId }), redirect: 'error' })
    assert.equal(response.status, 200); assert.equal(fixture.snapshot().violations.length, 0)
  })
})


test('inspection environment derives the real OS drive and redirects all writable Windows roots', () => {
  assert.equal(typeof phase4.inspectionEnvironment, 'function')
  const parent = { Path: 'tools', SystemRoot: 'C:/Windows', WINDIR: 'C:/Windows', ProgramData: 'C:/ProgramData', ALLUSERSPROFILE: 'C:/ProgramData', OASIS_USER_JWT: 'NEVER-COPY' }
  const env = phase4.inspectionEnvironment(parent, 'D:/isolated')
  assert.equal(env.SystemDrive, 'C:')
  assert.equal(env.SystemRoot, 'C:\\Windows')
  assert.equal(env.ProgramData, join('D:/isolated', 'programdata'))
  assert.equal(env.ALLUSERSPROFILE, env.ProgramData)
  assert.equal(env.OASIS_USER_JWT, undefined)
  phase4.assertInspectionNativeEnvironment(env)
  assert.equal(parent.ProgramData, 'C:/ProgramData')
  assert.equal(isolatedEnvironment(parent, 'D:/isolated').ProgramData, undefined, 'prepare remains unchanged')
})

test('inspection environment rejects missing unresolved conflicting and ambiguous Windows values', () => {
  assert.equal(typeof phase4.inspectionEnvironment, 'function')
  for (const parent of [{}, { SystemRoot: '%SystemRoot%' }, { SystemRoot: 'relative' }, { SystemRoot: 'C:/Windows', SystemDrive: 'D:' }, { SystemRoot: 'C:/Windows', WINDIR: 'D:/Windows' }, { SystemRoot: 'C:/Windows', systemroot: 'D:/Windows' }, { SystemRoot: 'C:/Windows', ProgramData: '%UNKNOWN%' }]) {
    assert.throws(() => phase4.inspectionEnvironment(parent, 'C:/isolated'), { code: 'INSPECTION_WINDOWS_ENVIRONMENT_INCOMPLETE' })
  }
  assert.throws(() => phase4.inspectionEnvironment({ SystemRoot: 'C:/Windows' }, 'C:/%UNKNOWN%/isolated'), { code: 'INSPECTION_WINDOWS_ENVIRONMENT_INCOMPLETE' })
  for (const field of ['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'ProgramData', 'ALLUSERSPROFILE', 'ComSpec']) {
    const env = phase4.inspectionEnvironment({ SystemRoot: 'C:/Windows' }, 'C:/isolated')
    env[field] = '%UNRESOLVED%'
    assert.throws(() => phase4.assertInspectionNativeEnvironment(env), { code: 'INSPECTION_WINDOWS_ENVIRONMENT_INCOMPLETE' })
  }
})

test('native cleanup context is fresh no-link ASCII temp and records explicit environment', async () => {
  assert.equal(typeof phase4.createInspectionNativeContext, 'function')
  const first = await phase4.createInspectionNativeContext(process.env)
  const second = await phase4.createInspectionNativeContext(process.env)
  assert.notEqual(first.cwd, second.cwd)
  assert.match(first.cwd, /oasis-dsh-p4-native-/)
  assert.equal(/[^\x20-\x7E]/.test(first.cwd), false)
  assert.equal(first.env.ProgramData, join(first.cwd, 'programdata'))
  assert.equal(await realpath(first.env.TEMP), await realpath(join(first.cwd, 'tmp')))
  assert.equal(first.executable, join(first.env.SystemRoot, 'System32', 'taskkill.exe'))
  phase4.assertInspectionNativeEnvironment(first.env)
  await assert.rejects(phase4.createInspectionNativeContext({ SystemRoot: 'C:/not-an-installed-windows' }))
  await assert.rejects(phase4.terminateOwnedProcessTree({ pid: 123, exitCode: null, signalCode: null }), { code: 'NATIVE_CONTEXT_REQUIRED' })
})


test('inspection environment rejects conflicting command and malformed parent native paths', () => {
  for (const extra of [{ ComSpec: 'C:/other/cmd.exe' }, { ProgramData: 'relative' }, { ALLUSERSPROFILE: 'relative' }, { SystemDrive: '' }]) {
    assert.throws(() => phase4.inspectionEnvironment({ SystemRoot: 'C:/Windows', ...extra }, 'C:/isolated'), { code: 'INSPECTION_WINDOWS_ENVIRONMENT_INCOMPLETE' })
  }
})

test('native context rejects a linked Windows executable ancestry before any process starts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oasis-dsh-p4-env-link-test-'))
  const link = join(root, 'Windows')
  await symlink(process.env.SystemRoot, link, 'junction')
  await assert.rejects(phase4.createInspectionNativeContext({ SystemRoot: link }), /reparse path rejected/)
})


test('native context rejects a redirected temporary root before resolving its target', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oasis-dsh-p4-temp-link-test-'))
  const target = join(root, 'target'); const link = join(root, 'link')
  await mkdir(target); await symlink(target, link, 'junction')
  const previous = process.env.TEMP
  try {
    process.env.TEMP = link
    await assert.rejects(phase4.createInspectionNativeContext(process.env), /reparse path rejected/)
  } finally {
    if (previous === undefined) delete process.env.TEMP
    else process.env.TEMP = previous
  }
})
