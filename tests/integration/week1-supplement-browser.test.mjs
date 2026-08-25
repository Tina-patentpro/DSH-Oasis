import assert from 'node:assert/strict'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

const DEFAULT_PLAYWRIGHT = join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')
const DEFAULT_BROWSERS = [
  join(homedir(), 'AppData/Local/Google/Chrome/Application/chrome.exe'),
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
]

async function firstExisting(paths) {
  for (const path of paths) {
    try {
      await access(path)
      return path
    } catch {}
  }
  return null
}

async function save(path, value) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, value, 'utf8')
}

async function querySlotEvidence(page, sessionId) {
  return await page.evaluate(async (currentSessionId) => {
    const query = async (root) => {
      const rootQuery = root === null ? '' : `&root=${encodeURIComponent(root)}`
      const response = await fetch(`/__oasis-week1-slot-evidence?sessionId=${encodeURIComponent(currentSessionId)}${rootQuery}`)
      return { status: response.status, body: await response.json() }
    }
    return {
      full: await query(null),
      entry: await query('conversation.input.right'),
      overlay: await query('shell.overlay'),
      details: await query('details'),
    }
  }, sessionId)
}

async function captureLayout(page) {
  return await page.evaluate(() => {
    const rectangle = (element) => {
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return {
        left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
        width: rect.width, height: rect.height,
      }
    }
    const directFrameChild = (frame, node) => {
      let current = node
      while (current?.parentElement && current.parentElement !== frame) current = current.parentElement
      return current?.parentElement === frame ? current : null
    }
    const root = document.getElementById('root')
    const rootSlots = root ? [...root.querySelectorAll('[data-slot="root"]')] : []
    const overlays = [...document.querySelectorAll('[data-shell-overlay]')]
    const frame = overlays.length === 1 ? overlays[0].parentElement : null
    const sidebarSlots = frame ? [...frame.querySelectorAll('[data-slot="sidebar"]')] : []
    const conversationSlots = frame ? [...frame.querySelectorAll('[data-slot="conversation"]')] : []
    const detailsSlots = frame ? [...frame.querySelectorAll('[data-slot="details"]')] : []
    const sidebarColumn = sidebarSlots.length === 1 ? directFrameChild(frame, sidebarSlots[0]) : null
    const conversationColumn = conversationSlots.length === 1 ? directFrameChild(frame, conversationSlots[0]) : null
    const detailsColumn = detailsSlots.length === 1 ? directFrameChild(frame, detailsSlots[0]) : null
    const panel = document.querySelector('[data-testid="oasis-panel"]')
    const composer = [...document.querySelectorAll('textarea,[contenteditable="true"]')].find((element) => {
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
    return {
      anchorCounts: {
        rootSlot: rootSlots.length, overlay: overlays.length, sidebar: sidebarSlots.length,
        conversation: conversationSlots.length, details: detailsSlots.length,
      },
      root: {
        rect: rectangle(root),
        owner: root?.getAttribute('data-oasis-layout-owner') ?? null,
        contract: root?.getAttribute('data-oasis-layout-contract') ?? null,
        computedMarginRight: root ? getComputedStyle(root).marginRight : null,
      },
      frame: rectangle(frame),
      sidebar: rectangle(sidebarColumn),
      conversation: rectangle(conversationColumn),
      details: rectangle(detailsColumn),
      panel: rectangle(panel),
      composer: rectangle(composer),
      widthVariable: document.documentElement.style.getPropertyValue('--oasis-right-rail-width'),
      portalCount: document.querySelectorAll('[data-oasis-panel-portal]').length,
      styleCount: document.querySelectorAll('[data-oasis-layout-style]').length,
      panelCount: document.querySelectorAll('[data-testid="oasis-panel"]').length,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }
  })
}

function assertNear(actual, expected, tolerance, label) {
  assert.ok(Number.isFinite(actual) && Number.isFinite(expected), `${label} is not finite`)
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected} ± ${tolerance}, got ${actual}`)
}

function assertNoOwnedPush(layout, label) {
  assert.equal(layout.root.owner, null, `${label}: root owner was not removed`)
  assert.equal(layout.root.contract, null, `${label}: root contract was not removed`)
  assert.equal(layout.widthVariable, '', `${label}: CSS width variable was not removed`)
  assert.ok(layout.scrollWidth <= layout.clientWidth + 2, `${label}: horizontal overflow remains`)
}

test('isolated DSH preserves native layout while operating the project-bound Oasis panel', async () => {
  const baseUrl = process.env.OASIS_DSH_BASE_URL
  const sessionA1Id = process.env.OASIS_SESSION_A1_ID
  assert.ok(baseUrl, 'OASIS_DSH_BASE_URL is required; the integration test never starts or targets an implicit Host')
  assert.ok(sessionA1Id, 'OASIS_SESSION_A1_ID is required for the live Client Slot query')
  const parsedBaseUrl = new URL(baseUrl)
  const normalizedHostname = parsedBaseUrl.hostname.replace(/^\[|\]$/g, '')
  assert.equal(parsedBaseUrl.protocol, 'http:')
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(normalizedHostname), 'browser test refuses non-loopback Hosts')

  const playwrightModule = process.env.OASIS_PLAYWRIGHT_MODULE ?? DEFAULT_PLAYWRIGHT
  await access(playwrightModule)
  const browserExecutable = process.env.OASIS_BROWSER_EXECUTABLE ?? await firstExisting(DEFAULT_BROWSERS)
  assert.ok(browserExecutable, 'no supported local Chrome or Edge executable was found')
  const { chromium } = await import(pathToFileURL(playwrightModule).href)
  const outputDirectory = resolve(process.env.OASIS_BROWSER_OUTPUT ?? 'docs/evidence/week1-supplement-2026-08-24/browser')
  await mkdir(outputDirectory, { recursive: true })

  const browser = await chromium.launch({ executablePath: browserExecutable, headless: true })
  const context = await browser.newContext({ viewport: { width: 1600, height: 980 } })
  const page = await context.newPage()
  const consoleProblems = []
  const pageErrors = []
  const pluginResponses = []
  const geometryEvidence = {}
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleProblems.push({ type: message.type(), text: message.text() })
    }
  })
  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message))
  page.on('response', (response) => {
    if (response.url().includes('/plugins/oasis-professional-service/client.js')) {
      pluginResponses.push({ url: response.url(), status: response.status(), contentType: response.headers()['content-type'] ?? '' })
    }
  })

  try {
    await page.goto(parsedBaseUrl.href, { waitUntil: 'networkidle', timeout: 30_000 })
    await save(resolve(outputDirectory, 'initial-body.txt'), await page.locator('body').innerText())
    assert.equal(await page.title(), 'DeepSeek Harness')

    for (const label of ['继续', '稍后配置']) {
      const action = page.getByRole('button', { name: label, exact: true })
      if (await action.isVisible()) {
        await action.click()
        await page.waitForTimeout(250)
      }
    }

    const workspaceARow = page.getByRole('treeitem').filter({ hasText: '9、绿洲慧写4.0预研' }).first()
    await workspaceARow.waitFor({ state: 'visible' })
    if (await workspaceARow.getAttribute('aria-expanded') !== 'true') await workspaceARow.click()
    await save(resolve(outputDirectory, 'treeitems.json'), `${JSON.stringify(await page.getByRole('treeitem').evaluateAll((items) => items.map((item) => ({
      text: item.textContent?.trim() ?? '',
      ariaExpanded: item.getAttribute('aria-expanded'),
      ariaSelected: item.getAttribute('aria-selected'),
      level: item.getAttribute('aria-level'),
      outerHTML: item.outerHTML,
    }))), null, 2)}\n`)
    const sessionA1 = page.getByRole('treeitem').filter({ hasText: 'Oasis 验证 A-1' }).first()
    const sessionA2 = page.getByRole('treeitem').filter({ hasText: 'Oasis 验证 A-2' }).first()
    await sessionA1.waitFor({ state: 'visible' })
    await sessionA2.waitFor({ state: 'visible' })
    await sessionA1.click()

    const entry = page.getByTestId('oasis-workbench-entry')
    await entry.waitFor({ state: 'visible', timeout: 20_000 })
    assert.equal(await entry.isEnabled(), true)
    geometryEvidence.baseline = await captureLayout(page)
    assertNoOwnedPush(geometryEvidence.baseline, 'baseline')
    assert.deepEqual(geometryEvidence.baseline.anchorCounts, {
      rootSlot: 1, overlay: 1, sidebar: 1, conversation: 1, details: 1,
    })
    assert.equal(geometryEvidence.baseline.portalCount, 1)
    assert.equal(geometryEvidence.baseline.styleCount, 1)

    await entry.click()
    const panel = page.getByTestId('oasis-panel')
    await panel.waitFor({ state: 'visible' })
    await page.waitForTimeout(320)
    assert.equal(await panel.getAttribute('data-requested-mode'), 'normal')
    assert.equal(await panel.getAttribute('data-mode'), 'normal')
    assert.equal(await panel.getAttribute('data-layout-status'), 'active')
    await page.getByRole('heading', { name: '选择工作流' }).waitFor()

    geometryEvidence.normal = await captureLayout(page)
    assert.equal(geometryEvidence.normal.root.owner, 'oasis-professional-service')
    assert.equal(geometryEvidence.normal.root.contract, 'dsh-0.1.1-rc.2')
    assert.equal(geometryEvidence.normal.widthVariable, '360px')
    assertNear(geometryEvidence.normal.root.rect.right, geometryEvidence.normal.panel.left, 2, 'normal root/panel boundary')
    assertNear(geometryEvidence.normal.sidebar.left, geometryEvidence.baseline.sidebar.left, 1, 'normal sidebar left')
    assertNear(geometryEvidence.normal.sidebar.width, geometryEvidence.baseline.sidebar.width, 1, 'normal sidebar width')
    assert.ok(geometryEvidence.normal.conversation.right <= geometryEvidence.normal.panel.left + 2, 'normal panel overlaps conversation')
    assert.ok(geometryEvidence.normal.composer?.right <= geometryEvidence.normal.panel.left + 2, 'normal panel overlaps composer')
    assert.ok(geometryEvidence.normal.scrollWidth <= geometryEvidence.normal.clientWidth + 2)
    const composer = page.getByPlaceholder('给智能体发消息').first()
    await composer.click()
    assert.equal(await composer.evaluate((element) => document.activeElement === element), true)

    const slotsBefore = await querySlotEvidence(page, sessionA1Id)
    await save(resolve(outputDirectory, 'live-slot-subtrees-before-hide.json'), `${JSON.stringify(slotsBefore, null, 2)}\n`)
    for (const [key, result] of Object.entries(slotsBefore)) assert.equal(result.status, 200, `live Slot query ${key} failed`)
    assert.ok(slotsBefore.full.body.trees?.length > 0)
    assert.equal(slotsBefore.entry.body.selected?.kind, 'list')
    assert.equal(slotsBefore.entry.body.selected?.scope, 'session')
    assert.ok(JSON.stringify(slotsBefore.entry.body.selected?.occupants ?? []).includes('oasis-professional-entry'))
    assert.equal(slotsBefore.overlay.body.selected?.kind, 'list')
    assert.equal(slotsBefore.overlay.body.selected?.scope, 'root')
    assert.ok(JSON.stringify(slotsBefore.overlay.body.selected?.occupants ?? []).includes('oasis-professional-panel'))
    assert.equal(slotsBefore.details.body.selected?.kind, 'single')
    assert.equal(slotsBefore.details.body.selected?.scope, 'session')
    assert.ok((slotsBefore.details.body.selected?.occupants ?? []).length > 0)
    assert.ok(!JSON.stringify(slotsBefore.details.body.selected?.occupants ?? []).includes('oasis-professional'))

    await page.getByTestId('oasis-new-page').click()
    assert.equal(await panel.getByRole('tab').count(), 2)
    const tabs = panel.getByRole('tab')
    await tabs.nth(0).focus()
    await tabs.nth(0).press('End')
    assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true')
    assert.equal(await tabs.nth(1).evaluate((element) => document.activeElement === element), true)
    await tabs.nth(1).press('Home')
    assert.equal(await tabs.nth(0).getAttribute('aria-selected'), 'true')
    assert.equal(await tabs.nth(0).evaluate((element) => document.activeElement === element), true)
    await tabs.nth(1).click()
    await page.getByTestId('oasis-workflow-technical-rd').click()
    await page.getByRole('region', { name: '输入材料' }).waitFor()
    await page.getByRole('region', { name: '生成结果预览' }).waitFor()
    await tabs.nth(0).click()
    await page.getByTestId('oasis-workflow-cn-invention-patent').click()
    await page.getByRole('heading', { name: '中国发明专利撰写' }).waitFor()

    await page.screenshot({ path: resolve(outputDirectory, 'oasis-panel-normal.png'), fullPage: true })
    await page.getByTestId('oasis-panel-expand').click()
    await page.waitForFunction(() => {
      const panelElement = document.querySelector('[data-testid="oasis-panel"]')
      return panelElement?.getAttribute('data-mode') === 'expanded'
        && !document.getElementById('root')?.hasAttribute('data-oasis-layout-owner')
        && document.documentElement.style.getPropertyValue('--oasis-right-rail-width') === ''
        && panelElement.getBoundingClientRect().width > 900
    })
    await page.waitForTimeout(220)
    geometryEvidence.expanded = await captureLayout(page)
    assertNoOwnedPush(geometryEvidence.expanded, 'expanded')
    assertNear(geometryEvidence.expanded.panel.left, geometryEvidence.expanded.sidebar.right, 2, 'expanded boundary')
    await page.screenshot({ path: resolve(outputDirectory, 'oasis-panel-expanded.png'), fullPage: true })

    await page.getByTestId('oasis-panel-restore').click()
    await page.waitForFunction(() => document.querySelector('[data-testid="oasis-panel"]')?.getAttribute('data-mode') === 'normal'
      && document.getElementById('root')?.getAttribute('data-oasis-layout-owner') === 'oasis-professional-service')
    await page.waitForTimeout(320)
    await page.getByTestId('oasis-panel-hide').click()
    await panel.waitFor({ state: 'detached' })
    assert.equal(await entry.evaluate((element) => document.activeElement === element), true)
    await page.waitForTimeout(220)
    geometryEvidence.hidden = await captureLayout(page)
    assertNoOwnedPush(geometryEvidence.hidden, 'hidden')
    assert.equal(geometryEvidence.hidden.panelCount, 0)
    assertNear(geometryEvidence.hidden.root.rect.width, geometryEvidence.baseline.root.rect.width, 2, 'hidden root width')
    assertNear(geometryEvidence.hidden.sidebar.width, geometryEvidence.baseline.sidebar.width, 1, 'hidden sidebar width')
    assertNear(geometryEvidence.hidden.conversation.width, geometryEvidence.baseline.conversation.width, 2, 'hidden conversation width')

    const slotsAfter = await querySlotEvidence(page, sessionA1Id)
    await save(resolve(outputDirectory, 'live-slot-subtrees-after-hide.json'), `${JSON.stringify(slotsAfter, null, 2)}\n`)
    assert.equal(slotsAfter.details.status, 200)
    assert.deepEqual(slotsAfter.details.body.selected?.occupants, slotsBefore.details.body.selected?.occupants)

    const nativeOpen = page.getByTestId('oasis-native-details-open')
    const nativeClose = page.getByTestId('oasis-native-details-close')
    await nativeOpen.waitFor({ state: 'visible' })
    await nativeOpen.click()
    await page.waitForFunction(() => {
      let column = document.querySelector('[data-slot="details"]')
      const frame = document.querySelector('[data-shell-overlay]')?.parentElement
      while (column?.parentElement && column.parentElement !== frame) column = column.parentElement
      return column?.getBoundingClientRect().width > 200
    })
    geometryEvidence.hiddenNativeDetailsOpen = await captureLayout(page)
    assertNoOwnedPush(geometryEvidence.hiddenNativeDetailsOpen, 'hidden native details open')
    assert.ok(geometryEvidence.hiddenNativeDetailsOpen.details.width > 200)
    await page.screenshot({ path: resolve(outputDirectory, 'oasis-panel-hidden-native-details.png'), fullPage: true })
    await nativeClose.click()
    await page.waitForFunction(() => {
      let column = document.querySelector('[data-slot="details"]')
      const frame = document.querySelector('[data-shell-overlay]')?.parentElement
      while (column?.parentElement && column.parentElement !== frame) column = column.parentElement
      return (column?.getBoundingClientRect().width ?? 1) < 2
    })

    await entry.click()
    await panel.waitFor({ state: 'visible' })
    assert.equal(await panel.getByRole('tab').count(), 2)
    const workspaceA = await panel.getAttribute('data-workspace-id')
    assert.ok(workspaceA)
    await sessionA2.click()
    assert.equal(await panel.getAttribute('data-workspace-id'), workspaceA)
    assert.equal(await panel.getByRole('tab').count(), 2)

    const workspaceBRow = page.getByRole('treeitem').filter({ hasText: 'oasis-professional-service' }).first()
    await workspaceBRow.waitFor({ state: 'visible' })
    if (await workspaceBRow.getAttribute('aria-expanded') !== 'true') await workspaceBRow.click()
    const sessionB = page.getByRole('treeitem').filter({ hasText: 'Oasis 验证 B-1' }).first()
    await sessionB.waitFor({ state: 'visible' })
    await sessionB.click()
    await panel.waitFor({ state: 'detached' })
    await entry.click()
    await panel.waitFor({ state: 'visible' })
    const workspaceB = await panel.getAttribute('data-workspace-id')
    assert.ok(workspaceB && workspaceB !== workspaceA)
    assert.equal(await panel.getByRole('tab').count(), 1)
    await page.screenshot({ path: resolve(outputDirectory, 'oasis-panel-workspace-b.png'), fullPage: true })

    await sessionA1.click()
    await panel.waitFor({ state: 'visible' })
    assert.equal(await panel.getAttribute('data-workspace-id'), workspaceA)
    assert.equal(await panel.getByRole('tab').count(), 2)
    await page.getByTestId('oasis-panel-hide').click()
    await panel.waitFor({ state: 'detached' })
    assert.equal(await entry.evaluate((element) => document.activeElement === element), true)
    await entry.click()
    await panel.waitFor({ state: 'visible' })

    await page.setViewportSize({ width: 900, height: 980 })
    await page.waitForFunction(() => {
      const panelElement = document.querySelector('[data-testid="oasis-panel"]')
      return panelElement?.getAttribute('data-requested-mode') === 'normal'
        && panelElement.getAttribute('data-mode') === 'expanded'
        && panelElement.getAttribute('data-layout-status') === 'narrow-expanded'
    })
    geometryEvidence.narrow = await captureLayout(page)
    assertNoOwnedPush(geometryEvidence.narrow, 'narrow auto-expanded')
    assertNear(geometryEvidence.narrow.panel.left, geometryEvidence.narrow.sidebar.right, 2, 'narrow boundary')
    assert.equal(await page.getByTestId('oasis-panel-restore').isDisabled(), true)
    await page.screenshot({ path: resolve(outputDirectory, 'oasis-panel-narrow-auto-expanded.png'), fullPage: true })

    await page.setViewportSize({ width: 1600, height: 980 })
    await page.waitForFunction(() => document.querySelector('[data-testid="oasis-panel"]')?.getAttribute('data-mode') === 'normal'
      && document.getElementById('root')?.getAttribute('data-oasis-layout-owner') === 'oasis-professional-service')
    await page.waitForTimeout(320)
    geometryEvidence.normalAfterNarrow = await captureLayout(page)
    assertNear(geometryEvidence.normalAfterNarrow.root.rect.right, geometryEvidence.normalAfterNarrow.panel.left, 2, 'normal after narrow')

    assert.ok(pluginResponses.some((response) => response.status === 200))
    assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('\n')}`)
    assert.deepEqual(consoleProblems, [], `console problems: ${JSON.stringify(consoleProblems)}`)
  } finally {
    await save(resolve(outputDirectory, 'layout-geometry.json'), `${JSON.stringify(geometryEvidence, null, 2)}\n`)
    await save(resolve(outputDirectory, 'plugin-responses.json'), `${JSON.stringify(pluginResponses, null, 2)}\n`)
    await save(resolve(outputDirectory, 'console-problems.json'), `${JSON.stringify(consoleProblems, null, 2)}\n`)
    await save(resolve(outputDirectory, 'page-errors.json'), `${JSON.stringify(pageErrors, null, 2)}\n`)
    await context.close()
    await browser.close()
  }
})
