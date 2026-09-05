import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdir, lstat, symlink } from 'node:fs/promises'
import { join, win32 } from 'node:path'
import { fileURLToPath } from 'node:url'
import childProcess from 'node:child_process'
import { syncBuiltinESMExports } from 'node:module'
import { EventEmitter } from 'node:events'
import * as phase4 from '../../scripts/verify-oasis-api-phase4.mjs'

const root = fileURLToPath(new URL('../..', import.meta.url))
const evidence = join(root, 'docs/evidence/oasis-api-path-parity-2026-09-03/attempt-001')
const probe = join(root, 'scripts/oasis-api-path-parity-probe.ps1')
const guid = 'F1B32785-6FBA-4FCF-9D55-7B8E7F157091'
const cwd = 'C:\\Temp\\oasis-parity-fixture'
const local = win32.join(cwd, 'os-home/AppData/Local')
const context = { cwd, env: phase4.inspectionEnvironment(process.env, cwd) }
const time = '2026-09-03T03:00:00.000Z'
const bounds = { cwd, pid: 456, startedAt: time, finishedAt: '2026-09-03T03:00:01.000Z' }
const missing = async () => ({ status: 'missing', error: 'ENOENT' })
let sequence = 0
const fresh = label => join(evidence, label + '-' + process.pid + '-' + (++sequence))

async function moduleUnderTest() {
  let module
  try { module = await import('../../scripts/diagnose-oasis-api-path-parity.mjs') }
  catch (error) { assert.fail('path parity entry must exist and import safely: ' + error.code) }
  for (const name of ['parseParityArgs', 'parseParityReport', 'collectPathParity', 'runPathParity']) assert.equal(typeof module[name], 'function', name)
  return module
}
function report() {
  return { schemaVersion: 1, kind: 'path-api-contract-parity', generatedAt: time, pid: 456, createdAt: time, bitness: 64,
    resourceCleanupComplete: true, calls: [
      { id: 'known-dont-verify', api: 'SHGetKnownFolderPath', guid, csidl: null, flags: 16384, hTokenMode: 'current-user', hwndMode: null },
      { id: 'legacy-current', api: 'SHGetFolderPathW', guid: null, csidl: 28, flags: 0, hTokenMode: 'current-user', hwndMode: 'null' },
      { id: 'known-verify', api: 'SHGetKnownFolderPath', guid, csidl: null, flags: 0, hTokenMode: 'current-user', hwndMode: null },
    ].map(row => ({ ...row, at: time, status: 'executed', hresult: '0x00000000', path: local, guardCode: null })) }
}
function output(data = report(), overrides = {}) {
  return { ...bounds, exitCode: 0, closed: true, timedOut: false, spawnError: null, treeTermination: null,
    rootOnlyTermination: false, outputLimitExceeded: false, stdout: JSON.stringify(data), stderr: '', ...overrides }
}
function skipped(data, code) {
  data.calls[0].guardCode = code
  for (const row of data.calls.slice(1)) Object.assign(row, { status: 'skipped-safety-guard', at: null, hresult: null, path: null, guardCode: code })
  return data
}
function assertNoPromotion(value) {
  for (const key of ['browserStarted', 'dshStarted', 'preflightComplete', 'stageComplete', 'phase4Complete']) assert.equal(value[key], false, key)
}

test('path parity import has no process launch', async t => {
  t.mock.method(childProcess, 'spawn', () => assert.fail('import launched a process'))
  syncBuiltinESMExports()
  try { await moduleUnderTest() } finally { t.mock.restoreAll(); syncBuiltinESMExports() }
})
test('path parity CLI accepts only the two fixed options', async () => {
  const m = await moduleUnderTest()
  assert.deepEqual(m.parseParityArgs(['--evidence', 'fresh', '--offline']), { evidence: 'fresh', offline: true })
  for (const args of [[], ['--offline'], ['--evidence', 'x'], ['--offline', '--offline', '--evidence', 'x'],
    ['--evidence', 'x', '--evidence', 'y', '--offline'], ['--evidence', '--offline'], ['--evidence', 'x\n', '--offline'],
    ['--evidence', 'x', '--offline', '--pid', '4'], ['--api', 'anything', '--offline']]) {
    assert.throws(() => m.parseParityArgs(args), { code: 'PARITY_ARGUMENT_INVALID' })
  }
})
test('path parity report strictly accepts the three fixed calls and nonzero HRESULT evidence', async () => {
  const m = await moduleUnderTest(); const data = report()
  data.calls[1].hresult = '0x80070002'; data.calls[1].path = null
  data.calls[2].hresult = '0x00000001'; data.calls[2].path = null
  assert.deepEqual(m.parseParityReport(JSON.stringify(data), bounds), data)
})
test('path parity report rejects protocol injection, wrong order, flags, times and buffer results', async () => {
  const m = await moduleUnderTest()
  const mutations = [r => { r.extra = true }, r => { r.calls.reverse() }, r => { r.calls[0].flags = 32768 },
    r => { r.calls[1].csidl = 32796 }, r => { r.calls[1].api = 'SHGetKnownFolderPath' }, r => { r.calls[0].guid = 'other' },
    r => { r.calls[2].hTokenMode = 'other-user' }, r => { r.calls[0].path = '' }, r => { r.calls[0].path = null },
    r => { r.calls[1].hresult = '0x00000001' }, r => { r.calls[1].hresult = '0x8007000a' },
    r => { r.calls[0].at = 'invalid' }, r => { r.calls[2].at = '2026-09-03T02:59:55.000Z' },
    r => { r.calls[1].path = 'C:\\' + 'x'.repeat(260) }, r => { r.calls[0].path = 'relative' },
    r => { r.calls[0].path = 'C:\\bad\u0001path' }, r => { r.bitness = 128 }, r => { r.calls.push(r.calls[2]) },
    r => { r.resourceCleanupComplete = 'true' }]
  for (const mutate of mutations) { const data = report(); mutate(data); assert.throws(() => m.parseParityReport(JSON.stringify(data), bounds), { code: 'PARITY_REPORT_INVALID' }) }
  for (const value of ['not-json', 'null', JSON.stringify(report()) + 'x', 'x'.repeat(65537)]) assert.throws(() => m.parseParityReport(value, bounds), { code: 'PARITY_REPORT_INVALID' })
})
test('path parity enforces process identity and command-time bounds', async () => {
  const m = await moduleUnderTest()
  for (const change of [r => { r.pid++ }, r => { r.createdAt = '2026-09-03T02:59:57.000Z' }, r => { r.generatedAt = '2026-09-03T03:01:00.000Z' }]) {
    const data = report(); change(data); assert.throws(() => m.parseParityReport(JSON.stringify(data), bounds), { code: 'PARITY_REPORT_INVALID' })
  }
})
test('path parity blocks remaining calls after an unsafe first path or first HRESULT', async () => {
  const m = await moduleUnderTest()
  for (const [firstPath, hr, code] of [['C:\\Users\\outside', '0x00000000', 'PATH_OUTSIDE_SCOPE'],
    ['\\\\server\\share\\x', '0x00000000', 'PATH_OUTSIDE_SCOPE'], [null, '0x80070005', 'FIRST_CALL_FAILED']]) {
    const data = skipped(report(), code); data.calls[0].path = firstPath; data.calls[0].hresult = hr
    assert.deepEqual(m.parseParityReport(JSON.stringify(data), bounds), data)
    const bad = structuredClone(data); Object.assign(bad.calls[1], report().calls[1])
    assert.throws(() => m.parseParityReport(JSON.stringify(bad), bounds), { code: 'PARITY_REPORT_INVALID' })
  }
})
test('path parity collection uses fixed command and keeps HRESULT failures below completion', async () => {
  const m = await moduleUnderTest(); const data = report(); data.calls[1].hresult = '0x80070002'; data.calls[1].path = null
  let calls = 0; const visited = []
  const result = await m.collectPathParity(context, { execute: async request => {
    calls++; assert.equal(win32.normalize(request.executable), 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe')
    assert.deepEqual(request.argv, ['-NoProfile', '-NonInteractive', '-File', probe])
    assert.equal(request.cwd, cwd); assert.equal(request.env.OASIS_PATH_PARITY_ROOT, cwd); assert.equal(request.timeoutMs, 15000)
    assert.equal(request.env.API_KEY, undefined); assert.equal(request.env.NODE_OPTIONS, undefined)
    return output(data)
  }, inspect: async (base, target) => { visited.push(target); assert.equal(base, cwd); return missing() } })
  assert.equal(calls, 1); assert.deepEqual(visited, [local, local]); assert.equal(result.collectionComplete, true)
  assert.equal(result.exitCode, 0); assertNoPromotion(result); assert.equal(result.report.calls[1].hresult, '0x80070002')
})
test('path parity never follows externally returned strings or treats safety skips as success', async () => {
  const m = await moduleUnderTest(); const data = skipped(report(), 'PATH_OUTSIDE_SCOPE'); data.calls[0].path = 'C:\\Users\\outside'
  const visited = []; let count = 0
  const result = await m.collectPathParity(context, { execute: async () => { count++; return output(data, { exitCode: 1 }) },
    inspect: async (base, target) => { visited.push(target); assert.equal(target, local); return missing() } })
  assert.equal(count, 1); assert.equal(result.collectionComplete, false); assert.equal(result.exitCode, 1)
  assert.equal(result.failure.code, 'PARITY_SAFETY_GUARD'); assertNoPromotion(result)
  assert.deepEqual(visited, [local]); assert.equal(result.report.calls[1].status, 'skipped-safety-guard')
})
test('path parity setup metadata fails closed before spawning', async () => {
  const m = await moduleUnderTest()
  for (const status of ['outside-scope', 'reparse-rejected', 'unreadable']) {
    const result = await m.collectPathParity(context, { execute: async () => assert.fail('unsafe spawn'), inspect: async () => ({ status }) })
    assert.equal(result.collectionComplete, false); assert.equal(result.failure.code, 'PARITY_PATH_UNSAFE')
  }
})
test('path parity captures compiler codes without recording raw stderr or malformed payloads', async () => {
  const m = await moduleUnderTest()
  for (const stage of ['SETUP', 'COMPILE', 'CALL']) {
    const result = await m.collectPathParity(context, { execute: async () => output(null, { stdout: '', stderr: 'PARITY_PROBE_' + stage + '_FAILED\r\n', exitCode: 1 }), inspect: missing })
    assert.equal(result.failure.code, 'PARITY_PROBE_' + stage + '_FAILED'); assertNoPromotion(result)
  }
  const result = await m.collectPathParity(context, { execute: async () => output(null, { stdout: 'secret-canary-payload', stderr: 'Authorization: Bearer secret-canary-payload', exitCode: 1 }), inspect: missing })
  assert.equal(JSON.stringify(result).includes('secret-canary-payload'), false)
})
test('path parity command and resource failures never promote collection or retry', async () => {
  const m = await moduleUnderTest()
  for (const override of [{ closed: false }, { timedOut: true }, { exitCode: 3 }, { spawnError: { code: 'SPAWN_FAILED' } },
    { treeTermination: { ok: false } }, { rootOnlyTermination: true }, { outputLimitExceeded: true },
    { stdout: 'broken' }, { pid: 9 }]) {
    let count = 0; const result = await m.collectPathParity(context, { execute: async () => { count++; return output(report(), override) }, inspect: missing })
    assert.equal(count, 1); assert.equal(result.collectionComplete, false); assert.equal(result.exitCode, 1); assertNoPromotion(result)
  }
  const data = report(); data.resourceCleanupComplete = false
  const result = await m.collectPathParity(context, { execute: async () => output(data), inspect: missing })
  assert.equal(result.collectionComplete, false); assert.equal(result.failure.code, 'PARITY_RESOURCE_CLEANUP_FAILED')
})
test('path parity claims fresh evidence and rejects reuse, outside paths and junctions before execution', async () => {
  const m = await moduleUnderTest(); const already = fresh('reused'); await mkdir(already)
  let count = 0; const deps = { execute: async () => { count++; return output() }, inspect: missing }
  for (const target of [already, 'C:\\outside-parity', evidence + '-sibling']) await assert.rejects(m.runPathParity(['--evidence', target, '--offline'], deps))
  const link = fresh('junction'); await symlink(already, link, 'junction')
  await assert.rejects(m.runPathParity(['--evidence', join(link, 'child'), '--offline'], deps))
  assert.equal(count, 0)
})
test('path parity evidence write failure cannot return success', async () => {
  const m = await moduleUnderTest(); const target = fresh('write-failure')
  await assert.rejects(m.runPathParity(['--evidence', target, '--offline'], { inspect: missing, execute: async request => {
    await mkdir(join(target, 'parity-result.json'))
    const data = report(); for (const call of data.calls) call.path = win32.join(request.cwd, 'os-home/AppData/Local')
    return output(data)
  } }))
  assert.equal((await lstat(join(target, 'parity-result.json'))).isDirectory(), true)
})
test('path parity native source has fixed calls, pre-verification guard and no mutation APIs', async () => {
  await moduleUnderTest(); const source = await readFile(probe, 'utf8')
  assert.match(source, /EntryPoint\s*=\s*"SHGetFolderPathW"/)
  assert.match(source, /CharSet\s*=\s*CharSet\.Unicode/)
  assert.match(source, /StringBuilder\(260\)/)
  assert.match(source, /0x001[cC]/)
  assert.match(source, /Marshal\.FreeCoTaskMem/)
  assert.match(source, /finally/)
  assert.match(source, /ReparsePoint/)
  assert.match(source, /GuardPath/)
  assert.ok(source.indexOf('GuardPath(first.path)') < source.indexOf('calls[1] = Legacy'))
  assert.doesNotMatch(source, /GetLastWin32Error|SetLastError|GetLastError|CSIDL_FLAG_CREATE|KF_FLAG_CREATE|SHSetKnownFolderPath|CreateDirectory|New-Item|Set-Acl|AdjustTokenPrivileges|Impersonate|LoadUserProfile|ExecutionPolicy|OpenProcessToken|OpenThreadToken/)
})

function harness(onStart, onTerminate) {
  let now = Date.parse(time); let next = 0; let announce
  const timers = new Map(); const started = new Promise(resolve => { announce = resolve })
  const child = new EventEmitter()
  Object.assign(child, { pid: 456, exitCode: null, signalCode: null, stdout: new EventEmitter(), stderr: new EventEmitter() })
  child.stdout.destroy = () => { child.stdout.destroyed = true }
  child.stderr.destroy = () => { child.stderr.destroyed = true }
  const kills = []; let spawns = 0; let terminations = 0
  child.unref = () => {}; child.kill = signal => { kills.push(signal); return true }
  const close = (code = 0) => { child.exitCode = code; child.emit('close', code, null) }
  const runtime = {
    now: () => now,
    setTimeout(fn, delay) { const id = ++next; timers.set(id, { at: now + delay, fn }); return id },
    clearTimeout(id) { timers.delete(id) },
    spawn(executable, argv, options) {
      spawns++; assert.equal(win32.basename(executable), 'powershell.exe'); assert.equal(options.shell, false)
      assert.equal(options.windowsHide, true); assert.deepEqual(argv, ['-NoProfile', '-NonInteractive', '-File', probe])
      queueMicrotask(() => { onStart?.(child, close); announce() }); return child
    },
    terminate: async owned => { assert.equal(owned, child); terminations++; return onTerminate ? onTerminate(child, close) : (close(1), { ok: true }) },
  }
  const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve() }
  const tick = async duration => {
    const end = now + duration
    for (;;) {
      await flush()
      const entry = [...timers].sort((a, b) => a[1].at - b[1].at)[0]
      if (!entry || entry[1].at > end) break
      now = entry[1].at; timers.delete(entry[0]); entry[1].fn()
    }
    now = end; await flush()
  }
  return { runtime, started, tick, child, close, timers, kills, counts: () => ({ spawns, terminations }) }
}
test('path parity bounded executor preserves UTF-8 chunks and uses hidden fixed child only', async () => {
  const m = await moduleUnderTest()
  const h = harness((child, close) => { for (const byte of Buffer.from(JSON.stringify(report()))) child.stdout.emit('data', Buffer.from([byte])); close() })
  const result = await m.collectPathParity(context, { inspect: missing, runtime: h.runtime })
  assert.equal(result.collectionComplete, true); assert.deepEqual(h.counts(), { spawns: 1, terminations: 0 })
  assert.equal(h.timers.size, 0); assert.equal(result.commandResult.closed, true)
})
test('path parity bounded executor stops once on stdout or stderr overflow', async () => {
  const m = await moduleUnderTest()
  for (const [channel, bytes] of [['stdout', 65537], ['stderr', 8193]]) {
    const h = harness(child => { child[channel].emit('data', Buffer.alloc(bytes, 120)); child[channel].emit('data', Buffer.from('canary-secret')) })
    const result = await m.collectPathParity(context, { inspect: missing, runtime: h.runtime })
    assert.equal(result.collectionComplete, false); assert.equal(result.commandResult.outputLimitExceeded, true)
    assert.deepEqual(h.counts(), { spawns: 1, terminations: 1 }); assert.equal(h.timers.size, 0)
    assert.equal(JSON.stringify(result).includes('canary-secret'), false)
  }
})
test('path parity bounded executor rejects malformed output without persisting split secrets', async () => {
  const m = await moduleUnderTest()
  const h = harness((child, close) => {
    for (const byte of Buffer.from('Authorization: Bearer 中文-canary-secret')) child.stderr.emit('data', Buffer.from([byte]))
    child.stdout.emit('data', Buffer.from('malformed-canary-secret')); close(1)
  })
  const result = await m.collectPathParity(context, { inspect: missing, runtime: h.runtime })
  assert.equal(result.collectionComplete, false); assert.equal(JSON.stringify(result).includes('canary-secret'), false)
  assert.equal(h.timers.size, 0)
})
test('path parity bounded executor timeout records close and never retries', async () => {
  const m = await moduleUnderTest(); const h = harness()
  const pending = m.collectPathParity(context, { inspect: missing, runtime: h.runtime })
  await h.started; await h.tick(15000); const result = await pending
  assert.equal(result.collectionComplete, false); assert.equal(result.commandResult.timedOut, true)
  assert.equal(result.commandResult.closed, true); assert.deepEqual(h.counts(), { spawns: 1, terminations: 1 })
  assert.equal(h.timers.size, 0)
})
test('path parity bounded executor gives up on unknown tree cleanup without a second probe', async () => {
  const m = await moduleUnderTest(); const h = harness(undefined, () => new Promise(() => {}))
  const pending = m.collectPathParity(context, { inspect: missing, runtime: h.runtime })
  await h.started; await h.tick(30000); const result = await pending
  assert.equal(result.collectionComplete, false); assert.equal(result.commandResult.closed, false)
  assert.equal(result.commandResult.rootOnlyTermination, true); assert.deepEqual(h.counts(), { spawns: 1, terminations: 1 })
  assert.deepEqual(h.kills, ['SIGKILL']); assert.equal(h.timers.size, 0)
  const frozen = JSON.stringify(result); h.close(); await h.tick(10000); assert.equal(JSON.stringify(result), frozen)
})
test('path parity bounded executor handles synchronous spawn failure without unsafe termination', async () => {
  const m = await moduleUnderTest(); const h = harness()
  h.runtime.spawn = () => { throw Error('canary-secret') }
  const result = await m.collectPathParity(context, { inspect: missing, runtime: h.runtime })
  assert.equal(result.collectionComplete, false); assert.equal(result.commandResult.spawnError.code, 'PARITY_SPAWN_FAILED')
  assert.equal(JSON.stringify(result).includes('canary-secret'), false); assert.equal(h.timers.size, 0)
})

test('path parity rejects coerced HRESULT and non-boolean close evidence', async () => {
  const m = await moduleUnderTest(); const data = skipped(report(), 'FIRST_CALL_FAILED')
  data.calls[0].hresult = ['0x80070002']; data.calls[0].path = null
  assert.throws(() => m.parseParityReport(JSON.stringify(data), bounds), { code: 'PARITY_REPORT_INVALID' })
  const result = await m.collectPathParity(context, { inspect: missing, execute: async () => output(report(), { closed: 'yes' }) })
  assert.equal(result.collectionComplete, false)
})
test('path parity native missing-root guard cannot authorize validating calls', async () => {
  await moduleUnderTest(); const source = await readFile(probe, 'utf8')
  assert.match(source, /FileNotFoundException\)\s*\{\s*return MissingPathGuard\(item\);/)
  assert.match(source, /DirectoryNotFoundException\)\s*\{\s*return MissingPathGuard\(item\);/)
  assert.match(source, /String\.Equals\(item, root, StringComparison\.OrdinalIgnoreCase\)/)
})
test('path parity completed mock CLI saves validated evidence without creating the target Local directory', async () => {
  const m = await moduleUnderTest(); const target = fresh('mock-success'); let calls = 0
  const result = await m.runPathParity(['--offline', '--evidence', target], { execute: async request => {
    calls++; const data = report(); for (const row of data.calls) row.path = win32.join(request.cwd, 'os-home/AppData/Local')
    return output(data)
  } })
  assert.equal(calls, 1); assert.equal(result.collectionComplete, true); assertNoPromotion(result)
  assert.deepEqual(JSON.parse(await readFile(join(target, 'parity-result.json'), 'utf8')), result)
  assert.equal(result.pathMetadata.before.status, 'missing'); assert.equal(result.pathMetadata.after.status, 'missing')
  await assert.rejects(lstat(result.pathMetadata.target), { code: 'ENOENT' })
})
test('path parity native string evidence preserves multi-byte output without following it', async () => {
  const m = await moduleUnderTest(); const data = skipped(report(), 'PATH_OUTSIDE_SCOPE'); data.calls[0].path = 'C:\\Users\\中文目录'
  const h = harness((child, close) => { for (const byte of Buffer.from(JSON.stringify(data))) child.stdout.emit('data', Buffer.from([byte])); close(1) })
  const result = await m.collectPathParity(context, { inspect: missing, runtime: h.runtime })
  assert.equal(result.failure.code, 'PARITY_SAFETY_GUARD'); assert.equal(result.report.calls[0].path, data.calls[0].path)
})
test('path parity asynchronous spawn errors and signal close fail without raw messages', async () => {
  const m = await moduleUnderTest()
  const h = harness(child => { child.pid = undefined; child.emit('error', Error('secret-canary')) })
  const result = await m.collectPathParity(context, { inspect: missing, runtime: h.runtime })
  assert.equal(result.collectionComplete, false); assert.equal(h.timers.size, 0); assert.equal(JSON.stringify(result).includes('secret-canary'), false)
  const signalled = harness(child => { child.stdout.emit('data', Buffer.from(JSON.stringify(report()))); child.emit('close', null, 'SIGTERM') })
  const other = await m.collectPathParity(context, { inspect: missing, runtime: signalled.runtime })
  assert.equal(other.collectionComplete, false); assert.equal(other.commandResult.exitCode, null)
})
