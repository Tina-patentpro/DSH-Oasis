import assert from 'node:assert/strict'
import { access, mkdir, realpath, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

const DEFAULT_PLAYWRIGHT = join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')
const DEFAULT_BROWSERS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  join(homedir(), 'AppData/Local/Google/Chrome/Application/chrome.exe'),
]

async function firstExisting(paths) {
  for (const path of paths) {
    try {
      const info = await stat(path)
      if (!info.isFile()) continue
      return await realpath(path)
    } catch {}
  }
  return null
}

async function save(path, value) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, value, 'utf8')
}

async function dismissOnboarding(page) {
  for (const label of ['继续', '稍后配置']) {
    const action = page.getByRole('button', { name: label, exact: true })
    if (await action.isVisible()) {
      await action.click()
      await page.waitForTimeout(250)
    }
  }
}

async function openWorkspaceSession(page, workspaceLabel, sessionTitle) {
  const workspace = page.getByRole('treeitem').filter({ hasText: workspaceLabel }).first()
  await workspace.waitFor({ state: 'visible' })
  if (await workspace.getAttribute('aria-expanded') !== 'true') await workspace.click()
  const session = page.getByRole('treeitem').filter({ hasText: sessionTitle }).first()
  await session.waitFor({ state: 'visible' })
  await session.click()
  return session
}

async function waitReady(page, workspaceId) {
  await page.waitForFunction((expectedWorkspaceId) => {
    const panel = document.querySelector('[data-testid="oasis-panel"]')
    return panel?.getAttribute('data-workspace-id') === expectedWorkspaceId
      && panel.textContent?.includes('已与当前DSH项目同步')
  }, workspaceId)
  return page.getByTestId('oasis-panel')
}

async function ensurePanel(page, workspaceId) {
  const panel = page.getByTestId('oasis-panel')
  if (!await panel.isVisible()) {
    const entry = page.getByTestId('oasis-workbench-entry')
    await entry.waitFor({ state: 'visible' })
    await entry.click()
  }
  await panel.waitFor({ state: 'visible' })
  return await waitReady(page, workspaceId)
}

async function tabNames(panel) {
  return (await panel.getByRole('tab').allTextContents()).map((title) => title.trim())
}

async function captureLayout(page) {
  return await page.evaluate(() => {
    const root = document.getElementById('root')
    const panel = document.querySelector('[data-testid="oasis-panel"]')
    const rect = panel?.getBoundingClientRect()
    return {
      requestedMode: panel?.getAttribute('data-requested-mode') ?? null,
      effectiveMode: panel?.getAttribute('data-mode') ?? null,
      layoutStatus: panel?.getAttribute('data-layout-status') ?? null,
      panelWidth: rect?.width ?? 0,
      rootOwner: root?.getAttribute('data-oasis-layout-owner') ?? null,
      rootContract: root?.getAttribute('data-oasis-layout-contract') ?? null,
      rootMarginRight: root ? getComputedStyle(root).marginRight : null,
      widthVariable: document.documentElement.style.getPropertyValue('--oasis-right-rail-width'),
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
}

function assertLayoutRestored(layout, label) {
  assert.equal(layout.rootOwner, null, `${label}: layout owner remains`)
  assert.equal(layout.rootContract, null, `${label}: layout contract remains`)
  assert.equal(layout.widthVariable, '', `${label}: CSS width variable remains`)
  assert.ok(layout.horizontalOverflow <= 2, `${label}: horizontal overflow remains`)
}

test('Host2 browser restores per-Workspace state and persists refresh, rename, close, and panel modes', async () => {
  const baseUrl = process.env.OASIS_DSH_BASE_URL
  const workspaceAId = process.env.OASIS_WORKSPACE_A_ID
  const workspaceBId = process.env.OASIS_WORKSPACE_B_ID
  const workspaceDisplayName = process.env.OASIS_WORKSPACE_DISPLAY_NAME?.trim()
  const expectedATitle = process.env.OASIS_EXPECTED_A_TITLE
  assert.ok(baseUrl && workspaceAId && workspaceBId && expectedATitle, 'explicit Host2 and seeded Workspace evidence is required')
  assert.ok(workspaceDisplayName, 'OASIS_WORKSPACE_DISPLAY_NAME is required for project Workspace selection')
  const parsedBaseUrl = new URL(baseUrl)
  assert.equal(parsedBaseUrl.protocol, 'http:')
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(parsedBaseUrl.hostname.replace(/^\[|\]$/g, '')))

  const playwrightModule = process.env.OASIS_PLAYWRIGHT_MODULE ?? DEFAULT_PLAYWRIGHT
  await access(playwrightModule)
  const browserExecutable = process.env.OASIS_BROWSER_EXECUTABLE ?? await firstExisting(DEFAULT_BROWSERS)
  assert.ok(browserExecutable, 'no supported local Chrome or Edge executable was found')
  const { chromium } = await import(pathToFileURL(playwrightModule).href)
  const outputDirectory = resolve(process.env.OASIS_BROWSER_OUTPUT)
  await mkdir(outputDirectory, { recursive: true })

  const browser = await chromium.launch({ executablePath: browserExecutable, headless: true })
  const context = await browser.newContext({ viewport: { width: 1600, height: 980 } })
  const page = await context.newPage()
  const consoleProblems = []
  const pageErrors = []
  const pluginResponses = []
  const layouts = {}
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push({ type: message.type(), text: message.text() })
    }
  })
  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message))
  page.on('response', (response) => {
    if (response.url().includes('/plugins/oasis-professional-service/client.js')) {
      pluginResponses.push({ status: response.status(), url: response.url() })
    }
  })

  try {
    await page.goto(parsedBaseUrl.href, { waitUntil: 'networkidle', timeout: 30_000 })
    await dismissOnboarding(page)
    assert.equal(await page.title(), 'DeepSeek Harness')
    await save(resolve(outputDirectory, 'initial-body.txt'), await page.locator('body').innerText())
    await save(resolve(outputDirectory, 'initial-treeitems.json'), `${JSON.stringify(
      await page.getByRole('treeitem').evaluateAll((items) => items.map((item) => ({
        text: item.textContent?.trim() ?? '',
        ariaExpanded: item.getAttribute('aria-expanded'),
        ariaSelected: item.getAttribute('aria-selected'),
      }))),
      null,
      2,
    )}\n`)

    await openWorkspaceSession(page, workspaceDisplayName, 'Oasis 持久化 A-1')
    let panel = await ensurePanel(page, workspaceAId)
    assert.deepEqual(await tabNames(panel), [expectedATitle, 'Host1 A 研发任务'])
    layouts.normal = await captureLayout(page)
    assert.equal(layouts.normal.requestedMode, 'normal')
    assert.equal(layouts.normal.effectiveMode, 'normal')
    assert.equal(layouts.normal.rootOwner, 'oasis-professional-service')
    assert.equal(layouts.normal.widthVariable, '360px')

    await openWorkspaceSession(page, workspaceDisplayName, 'Oasis 持久化 A-2')
    panel = await waitReady(page, workspaceAId)
    assert.deepEqual(await tabNames(panel), [expectedATitle, 'Host1 A 研发任务'])

    await openWorkspaceSession(page, 'oasis-professional-service', 'Oasis 持久化 B-1')
    await panel.waitFor({ state: 'detached' })
    panel = await ensurePanel(page, workspaceBId)
    assert.deepEqual(await tabNames(panel), ['Host1 B 专利任务'])

    await openWorkspaceSession(page, workspaceDisplayName, 'Oasis 持久化 A-1')
    panel = await waitReady(page, workspaceAId)
    assert.deepEqual(await tabNames(panel), [expectedATitle, 'Host1 A 研发任务'])

    await page.reload({ waitUntil: 'networkidle' })
    await dismissOnboarding(page)
    await openWorkspaceSession(page, workspaceDisplayName, 'Oasis 持久化 A-1')
    panel = await ensurePanel(page, workspaceAId)
    assert.deepEqual(await tabNames(panel), [expectedATitle, 'Host1 A 研发任务'])

    const renamedTitle = '浏览器重命名后任务'
    const titleInput = panel.getByRole('textbox', { name: '任务名称' })
    await titleInput.fill(renamedTitle)
    await titleInput.press('Tab')
    await waitReady(page, workspaceAId)
    await panel.getByRole('button', { name: '关闭任务页 Host1 A 研发任务', exact: true }).click()
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="oasis-panel"] [role="tab"]').length === 1)
    await waitReady(page, workspaceAId)
    assert.deepEqual(await tabNames(panel), [renamedTitle])

    await page.reload({ waitUntil: 'networkidle' })
    await dismissOnboarding(page)
    await openWorkspaceSession(page, workspaceDisplayName, 'Oasis 持久化 A-1')
    panel = await ensurePanel(page, workspaceAId)
    assert.deepEqual(await tabNames(panel), [renamedTitle])

    await page.getByTestId('oasis-panel-expand').click()
    await page.waitForFunction(() => document.querySelector('[data-testid="oasis-panel"]')?.getAttribute('data-mode') === 'expanded')
    layouts.expanded = await captureLayout(page)
    assertLayoutRestored(layouts.expanded, 'expanded')
    assert.ok(layouts.expanded.panelWidth > 900)
    await page.screenshot({ path: resolve(outputDirectory, 'host2-expanded.png'), fullPage: true })

    await page.getByTestId('oasis-panel-restore').click()
    await page.waitForFunction(() => document.querySelector('[data-testid="oasis-panel"]')?.getAttribute('data-mode') === 'normal')
    await page.setViewportSize({ width: 900, height: 980 })
    await page.waitForFunction(() => {
      const current = document.querySelector('[data-testid="oasis-panel"]')
      return current?.getAttribute('data-requested-mode') === 'normal'
        && current.getAttribute('data-mode') === 'expanded'
        && current.getAttribute('data-layout-status') === 'narrow-expanded'
    })
    layouts.narrow = await captureLayout(page)
    assertLayoutRestored(layouts.narrow, 'narrow')
    assert.equal(await page.getByTestId('oasis-panel-restore').isDisabled(), true)
    await page.screenshot({ path: resolve(outputDirectory, 'host2-narrow.png'), fullPage: true })

    await page.setViewportSize({ width: 1600, height: 980 })
    await page.waitForFunction(() => document.querySelector('[data-testid="oasis-panel"]')?.getAttribute('data-mode') === 'normal')
    await page.getByTestId('oasis-panel-hide').click()
    await panel.waitFor({ state: 'detached' })
    layouts.hidden = await captureLayout(page)
    assertLayoutRestored(layouts.hidden, 'hidden')

    const nativeOpen = page.getByTestId('oasis-native-details-open')
    const nativeClose = page.getByTestId('oasis-native-details-close')
    await nativeOpen.waitFor({ state: 'visible' })
    await nativeOpen.click()
    await page.waitForFunction(() => {
      let column = document.querySelector('[data-slot="details"]')
      const frame = document.querySelector('[data-shell-overlay]')?.parentElement
      while (column?.parentElement && column.parentElement !== frame) column = column.parentElement
      return (column?.getBoundingClientRect().width ?? 0) > 200
    })
    layouts.hiddenNativeDetails = await captureLayout(page)
    assertLayoutRestored(layouts.hiddenNativeDetails, 'hidden-native-details')
    await page.screenshot({ path: resolve(outputDirectory, 'host2-hidden-native-details.png'), fullPage: true })
    await nativeClose.click()

    assert.ok(pluginResponses.some((response) => response.status === 200))
    assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('\n')}`)
    assert.deepEqual(consoleProblems, [], `console problems: ${JSON.stringify(consoleProblems)}`)
    await save(resolve(outputDirectory, 'final-ui-state.json'), `${JSON.stringify({
      workspaceAId,
      workspaceBId,
      renamedTitle,
      tabs: await tabNames(await ensurePanel(page, workspaceAId)),
    }, null, 2)}\n`)
  } finally {
    await save(resolve(outputDirectory, 'layouts.json'), `${JSON.stringify(layouts, null, 2)}\n`)
    await save(resolve(outputDirectory, 'plugin-responses.json'), `${JSON.stringify(pluginResponses, null, 2)}\n`)
    await save(resolve(outputDirectory, 'console-problems.json'), `${JSON.stringify(consoleProblems, null, 2)}\n`)
    await save(resolve(outputDirectory, 'page-errors.json'), `${JSON.stringify(pageErrors, null, 2)}\n`)
    await context.close()
    await browser.close()
  }
})
