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
      if (info.isFile()) return await realpath(path)
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
}

test('isolated Better Sidebar uninstall restores the standalone Oasis layout without residual host artifacts', async () => {
  const baseUrl = process.env.OASIS_DSH_BASE_URL
  const workspaceId = process.env.OASIS_WORKSPACE_A_ID
  const workspaceLabel = process.env.OASIS_WORKSPACE_A_LABEL
  const sessionTitle = process.env.OASIS_SESSION_A1_TITLE
  assert.ok(baseUrl && workspaceId && workspaceLabel && sessionTitle, 'explicit isolated cleanup Host evidence is required')
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
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push({ type: message.type(), text: message.text() })
    }
  })
  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message))
  page.on('response', (response) => {
    if (response.url().includes('/plugins/')) pluginResponses.push({ status: response.status(), url: response.url() })
  })

  let layout = null
  try {
    await page.goto(parsedBaseUrl.href, { waitUntil: 'networkidle', timeout: 30_000 })
    await dismissOnboarding(page)
    await openWorkspaceSession(page, workspaceLabel, sessionTitle)
    const entry = page.getByTestId('oasis-workbench-entry')
    await entry.waitFor({ state: 'visible' })
    assert.equal(await entry.getAttribute('data-oasis-host-mode'), 'standalone')
    assert.equal(await entry.getAttribute('data-oasis-host-version'), null)
    assert.equal(await page.locator('[data-dsh-better-sidebar]').count(), 0)
    assert.equal(await page.getByTestId('oasis-embedded-workbench').count(), 0)

    await entry.click()
    const panel = page.getByTestId('oasis-panel')
    await panel.waitFor({ state: 'visible' })
    await page.waitForFunction((expectedWorkspaceId) => {
      const current = document.querySelector('[data-testid="oasis-panel"]')
      return current?.getAttribute('data-workspace-id') === expectedWorkspaceId
        && current.textContent?.includes('已与当前DSH项目同步')
    }, workspaceId)
    layout = await page.evaluate(() => {
      const root = document.getElementById('root')
      const panel = document.querySelector('[data-testid="oasis-panel"]')
      const rect = panel?.getBoundingClientRect()
      return {
        rootOwner: root?.getAttribute('data-oasis-layout-owner') ?? null,
        rootContract: root?.getAttribute('data-oasis-layout-contract') ?? null,
        rootMarginRight: root ? getComputedStyle(root).marginRight : null,
        widthVariable: document.documentElement.style.getPropertyValue('--oasis-right-rail-width'),
        panelWidth: rect?.width ?? null,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }
    })
    assert.equal(layout.rootOwner, 'oasis-professional-service')
    assert.equal(layout.widthVariable, '360px')
    assert.equal(layout.panelWidth, 360)
    assert.ok(layout.horizontalOverflow <= 2)

    await page.getByTestId('oasis-panel-hide').click()
    await panel.waitFor({ state: 'detached' })
    const released = await page.evaluate(() => {
      const root = document.getElementById('root')
      return {
        rootOwner: root?.getAttribute('data-oasis-layout-owner') ?? null,
        rootContract: root?.getAttribute('data-oasis-layout-contract') ?? null,
        widthVariable: document.documentElement.style.getPropertyValue('--oasis-right-rail-width'),
        rootMarginRight: root ? getComputedStyle(root).marginRight : null,
      }
    })
    assert.deepEqual(released, { rootOwner: null, rootContract: null, widthVariable: '', rootMarginRight: '0px' })
    assert.equal(pluginResponses.some(({ url }) => url.includes('/plugins/dsh-better-sidebar/')), false)
    assert.deepEqual(pageErrors, [])
    assert.deepEqual(consoleProblems, [])
  } finally {
    await save(resolve(outputDirectory, 'layout.json'), `${JSON.stringify(layout, null, 2)}\n`)
    await save(resolve(outputDirectory, 'plugin-responses.json'), `${JSON.stringify(pluginResponses, null, 2)}\n`)
    await save(resolve(outputDirectory, 'console-problems.json'), `${JSON.stringify(consoleProblems, null, 2)}\n`)
    await save(resolve(outputDirectory, 'page-errors.json'), `${JSON.stringify(pageErrors, null, 2)}\n`)
    await context.close()
    await browser.close()
  }
})
