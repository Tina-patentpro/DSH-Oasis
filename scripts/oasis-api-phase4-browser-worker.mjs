import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const BROWSER_EXECUTABLE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
export const PLAYWRIGHT_ENTRY = 'C:/Users/TinaD/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
const errorCode = (error, fallback) => /^[A-Z][A-Z0-9_]{0,79}$/.test(error?.code ?? '') ? error.code : fallback
const fail = code => Object.assign(new Error(code), { code })

export function createBrowserLifecycle(mode) {
  if (!['preflight', 'standalone', 'better-sidebar'].includes(mode)) throw fail('BROWSER_MODE_INVALID')
  return { kind: 'inspection-browser', mode, sequence: 0, phase: 'created', workerSpawned: false,
    browserProcessObserved: false, launchRequested: false, contextConnected: false, pageReady: false,
    apiClosed: false, closed: false, terminationConfirmed: false, primaryFailure: null, failedPhase: null,
    cleanupFailures: [], evidenceFailures: [], events: [], ok: false,
    observationCoverage: { prelaunchNetworkObserved: false, pageListenersInstalled: false } }
}

export function applyBrowserEvent(state, message) {
  const invalid = () => { throw fail('BROWSER_IPC_INVALID') }
  if (!message || Buffer.byteLength(JSON.stringify(message)) > 65536 || message.mode !== state.mode ||
    message.sequence !== state.sequence + 1 || !Number.isFinite(Date.parse(message.at)) ||
    !message.data || typeof message.data !== 'object' || Array.isArray(message.data)) invalid()
  const transitions = { boot: ['created'], 'launch-requested': ['boot'], 'context-connected': ['launch-requested'],
    'page-ready': ['context-connected'], failure: ['boot', 'launch-requested', 'context-connected', 'page-ready'],
    closing: ['boot', 'launch-requested', 'context-connected', 'page-ready', 'failure'],
    'cleanup-failure': ['closing'], closed: ['closing'] }
  if (!transitions[message.type]?.includes(state.phase) || (state.primaryFailure && ['context-connected', 'page-ready'].includes(message.type))) invalid()
  if (['failure', 'cleanup-failure'].includes(message.type)) {
    if (!/^[A-Z][A-Z0-9_]{0,79}$/.test(message.data.code ?? '')) invalid()
    if (message.type === 'failure') {
      if (!['bootstrap', 'launch', 'navigation', 'inspection', 'ipc'].includes(message.data.phase)) invalid()
      if (message.data.diagnostic !== undefined) {
        const diagnostic = message.data.diagnostic
        if (!diagnostic || Object.keys(diagnostic).some(key => !['errorName', 'elapsedMs'].includes(key)) ||
          !['TimeoutError', 'Error', 'other'].includes(diagnostic.errorName) || !Number.isFinite(diagnostic.elapsedMs) ||
          diagnostic.elapsedMs < 0 || diagnostic.elapsedMs > 300000) invalid()
        state.failureDiagnostic ??= { errorName: diagnostic.errorName, elapsedMs: diagnostic.elapsedMs }
      }
      state.primaryFailure ??= { code: message.data.code }
      state.failedPhase ??= message.data.phase
    } else state.cleanupFailures.push({ code: message.data.code })
  }
  state.sequence = message.sequence
  if (message.type !== 'cleanup-failure') state.phase = message.type
  if (message.type === 'boot') state.workerSpawned = true
  if (message.type === 'launch-requested') state.launchRequested = true
  if (message.type === 'context-connected') state.contextConnected = true
  if (message.type === 'page-ready') { state.pageReady = true; state.observationCoverage.pageListenersInstalled = true }
  if (message.type === 'closed') state.apiClosed = true
  state.events.push({ sequence: message.sequence, at: message.at, type: message.type })
}

export async function settleBrowserLifecycle(state, { workerClosed, censusConfirmed, save }) {
  state.terminationConfirmed = workerClosed === true && censusConfirmed === true
  state.closed = state.terminationConfirmed
  const summarize = () => { state.ok = state.closed && state.apiClosed && state.pageReady && state.contextConnected &&
    !state.primaryFailure && !state.cleanupFailures.length && !state.evidenceFailures.length }
  summarize()
  try { await save(structuredClone(state)) }
  catch (error) { state.evidenceFailures.push({ code: errorCode(error, 'EVIDENCE_WRITE_FAILED') }) }
  summarize()
  return state
}

export function browserRequestDecision(baseUrl, target, method) {
  let base; let url
  try { base = new URL(baseUrl); url = new URL(target) } catch { return 'invalid-url' }
  if (base.protocol !== 'http:' || base.hostname !== '127.0.0.1' || !base.port || base.username || base.password ||
    url.origin !== base.origin || url.username || url.password) return 'external-origin'
  return ['GET', 'HEAD'].includes(method) ? 'allow' : 'mutation'
}

function validateDriverConfig(config) {
  if (!config || !['persistent', 'ephemeral'].includes(config.method) || !['preflight', 'inspect'].includes(config.task) ||
    !['preflight', 'standalone', 'better-sidebar'].includes(config.mode) || !/^http:\/\/127\.0\.0\.1:[1-9]\d*$/.test(config.baseUrl)) throw fail('BROWSER_CONFIG_INVALID')
  const url = new URL(config.baseUrl)
  if (+url.port > 65535 || (config.task === 'preflight') !== (config.mode === 'preflight') ||
    (config.task === 'inspect' && (typeof config.title !== 'string' || config.title.length > 80))) throw fail('BROWSER_CONFIG_INVALID')
}

export async function runBrowserDriver(config, { chromium, emit, cwd, closeMs = 5000 }) {
  validateDriverConfig(config)
  const startedAt = Date.now()
  let browser; let context; let phase = 'launch'; let primaryFailure = null; const cleanupFailures = []
  const pageErrors = []; const blockedRequests = []; const failedRequests = []
  let screenshotName = null
  const launch = { executablePath: BROWSER_EXECUTABLE, headless: true, timeout: 30000,
    proxy: { server: 'http://127.0.0.1:9', bypass: '127.0.0.1' },
    args: ['--disable-background-networking', '--no-first-run'] }
  const options = { serviceWorkers: 'block', viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' }
  try {
    await emit('launch-requested')
    if (config.method === 'persistent') context = await chromium.launchPersistentContext(join(cwd, 'browser-data'), { ...launch, ...options })
    else { browser = await chromium.launch(launch); context = await browser.newContext(options) }
    // Parent inventories the live owned tree before acknowledging this boundary.
    await emit('context-connected')
    await context.route('**/*', async route => {
      const request = route.request()
      const decision = browserRequestDecision(config.baseUrl, request.url(), request.method())
      if (decision !== 'allow') { blockedRequests.push({ reason: decision }); return route.abort() }
      return route.continue()
    })
    const observed = new WeakSet()
    const observe = page => {
      if (observed.has(page)) return
      observed.add(page)
      page.on('pageerror', () => pageErrors.push('PAGE_ERROR'))
      page.on('console', message => { if (message.type() === 'error') pageErrors.push('CONSOLE_ERROR') })
      page.on('requestfailed', () => failedRequests.push('REQUEST_FAILED'))
      // WebSocket traffic is separately denied, not assumed covered by HTTP routing.
    }
    if (typeof context.routeWebSocket !== 'function') throw fail('BROWSER_WEBSOCKET_GUARD_UNAVAILABLE')
    await context.routeWebSocket('**/*', socket => { blockedRequests.push({ reason: 'websocket' }); socket.close() })
    context.on('page', observe)
    const page = context.pages()[0] ?? await context.newPage()
    if (context.pages().includes(page)) observe(page)
    phase = 'navigation'
    await page.goto(config.baseUrl, { waitUntil: 'domcontentloaded', timeout: config.task === 'preflight' ? 10000 : 30000 })
    if (config.task === 'preflight') {
      await page.getByTestId('oasis-browser-preflight').waitFor({ state: 'visible', timeout: 10000 })
      screenshotName = 'preflight.png'
    } else {
      phase = 'inspection'
      for (const label of ['继续', '稍后配置']) {
        const button = page.getByRole('button', { name: label, exact: true })
        if (await button.isVisible()) await button.click({ timeout: 10000 })
      }
      const row = page.getByRole('treeitem').filter({ hasText: config.title }).first()
      if (await row.isVisible()) await row.click({ timeout: 10000 })
      else {
        const workspace = page.getByRole('treeitem').filter({ hasText: 'workspace-a' }).first()
        await workspace.waitFor({ state: 'visible', timeout: 10000 })
        if (await workspace.getAttribute('aria-expanded') !== 'true') await workspace.click({ timeout: 10000 })
        await row.click({ timeout: 10000 })
      }
      await page.getByTestId('oasis-workbench-entry').waitFor({ state: 'visible', timeout: 10000 })
      await page.getByRole('button', { name: /^(设置|Settings)$/ }).first().click({ timeout: 10000 })
      screenshotName = 'settings.png'
    }
    if (pageErrors.length || blockedRequests.length || failedRequests.length) throw fail('INSPECTION_BROWSER_ERROR')
    await emit('page-ready', { pageErrors, blockedRequests, failedRequests })
    await page.screenshot({ path: join(cwd, screenshotName), fullPage: true, timeout: 10000 })
    if (pageErrors.length || blockedRequests.length || failedRequests.length) throw fail('INSPECTION_BROWSER_ERROR')
  } catch (error) {
    primaryFailure = { code: errorCode(error, phase === 'launch' ? 'BROWSER_LAUNCH_FAILED' : 'BROWSER_INSPECTION_FAILED'), phase }
    await emit('failure', { ...primaryFailure, diagnostic: {
      errorName: ['TimeoutError', 'Error'].includes(error?.name) ? error.name : 'other', elapsedMs: Math.min(300000, Math.max(0, Date.now() - startedAt)),
    } })
  } finally {
    await emit('closing')
    // A timeout here does not abandon an unowned process: the parent still owns
    // the worker and must terminate/verify its entire observed tree.
    let timer
    try {
      if (context || browser) await Promise.race([
        Promise.resolve().then(() => browser ? browser.close() : context.close()),
        new Promise((_, reject) => { timer = setTimeout(() => reject(fail('BROWSER_CLOSE_TIMEOUT')), closeMs) }),
      ])
      if (context || browser) await emit('closed', { screenshotName: primaryFailure ? null : screenshotName })
    } catch (error) {
      const issue = { code: errorCode(error, 'BROWSER_CLOSE_FAILED') }; cleanupFailures.push(issue)
      await emit('cleanup-failure', issue)
    } finally { clearTimeout(timer) }
  }
  return { primaryFailure, cleanupFailures }
}

async function workerMain() {
  if (!process.send || process.argv.length !== 2) throw fail('BROWSER_WORKER_IPC_REQUIRED')
  let sequence = 0; let mode; let configured = false; let pending; let complete = false
  const send = (type, data = {}) => new Promise((resolveAck, reject) => {
    pending = { resolve: resolveAck, reject, sequence: ++sequence }
    process.send({ sequence, at: new Date().toISOString(), mode, type, data }, error => { if (error) reject(fail('BROWSER_IPC_FAILED')) })
  })
  process.on('message', async message => {
    if (message?.type === 'ack' && pending && message.sequence === pending.sequence) { const item = pending; pending = null; item.resolve(); return }
    if (message?.type === 'exit' && complete) { process.disconnect(); return }
    if (configured || message?.type !== 'init') return
    configured = true
    try {
      validateDriverConfig(message.config); mode = message.config.mode
      await send('boot')
      const { chromium } = await import(PLAYWRIGHT_ENTRY.startsWith('file:') ? PLAYWRIGHT_ENTRY : pathToFileURL(PLAYWRIGHT_ENTRY).href)
      await runBrowserDriver(message.config, { chromium, emit: send, cwd: process.cwd() })
    } catch (error) {
      if (mode && !pending) await send('failure', { code: errorCode(error, 'BROWSER_WORKER_FAILED'), phase: 'bootstrap' }).catch(() => {})
    } finally { complete = true; process.send?.({ type: 'done', mode, sequence: sequence + 1 }) }
  })
  process.on('disconnect', () => { process.exitCode = complete ? 0 : 1 })
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  workerMain().catch(() => { console.error('BROWSER_WORKER_FAILED'); process.exitCode = 1 })
}
