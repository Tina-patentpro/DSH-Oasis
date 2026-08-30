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
const PANEL_HOST_MODES = Object.freeze(['standalone', 'better-sidebar'])
const panelHostMode = process.env.OASIS_PANEL_HOST_MODE ?? 'standalone'
const panelTestId = panelHostMode === 'better-sidebar' ? 'oasis-embedded-workbench' : 'oasis-panel'

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

async function waitReady(page, workspaceId) {
  await page.waitForFunction(({ expectedWorkspaceId, expectedPanelTestId }) => {
    const panel = document.querySelector(`[data-testid="${expectedPanelTestId}"]`)
    return panel?.getAttribute('data-workspace-id') === expectedWorkspaceId
      && panel.textContent?.includes('已与当前DSH项目同步')
  }, { expectedWorkspaceId: workspaceId, expectedPanelTestId: panelTestId })
  return page.getByTestId(panelTestId)
}

async function ensurePanel(page, workspaceId) {
  const panel = page.getByTestId(panelTestId)
  if (!await panel.isVisible()) {
    const entry = page.getByTestId('oasis-workbench-entry')
    await entry.waitFor({ state: 'visible' })
    assert.equal(await entry.getAttribute('data-oasis-host-mode'), panelHostMode)
    await entry.click()
  }
  await panel.waitFor({ state: 'visible' })
  return await waitReady(page, workspaceId)
}

async function waitPanelText(panel, text) {
  await panel.getByText(text, { exact: false }).first().waitFor({ state: 'visible' })
}

async function tabNames(panel) {
  return (await panel.getByRole('tab').allTextContents()).map((value) => value.trim())
}

async function captureLayout(page) {
  return await page.evaluate(() => {
    const directFrameChild = (frame, node) => {
      let current = node
      while (current?.parentElement && current.parentElement !== frame) current = current.parentElement
      return current?.parentElement === frame ? current : null
    }
    const root = document.getElementById('root')
    const overlay = document.querySelector('[data-shell-overlay]')
    const frame = overlay?.parentElement ?? null
    const sidebar = directFrameChild(frame, frame?.querySelector('[data-slot="sidebar"]'))
    const conversation = directFrameChild(frame, frame?.querySelector('[data-slot="conversation"]'))
    const details = directFrameChild(frame, frame?.querySelector('[data-slot="details"]'))
    const panel = document.querySelector('[data-testid="oasis-panel"]')
    const embedded = document.querySelector('[data-testid="oasis-embedded-workbench"]')
    const surface = panel ?? embedded
    const betterSidebar = document.querySelector('[data-dsh-better-sidebar]')
    const entry = document.querySelector('[data-testid="oasis-workbench-entry"]')
    const rectangle = (element) => {
      const rect = element?.getBoundingClientRect()
      return rect ? { left: rect.left, right: rect.right, width: rect.width, height: rect.height } : null
    }
    return {
      requestedMode: surface?.getAttribute('data-requested-mode') ?? null,
      effectiveMode: surface?.getAttribute('data-mode') ?? null,
      layoutStatus: surface?.getAttribute('data-layout-status') ?? null,
      rootOwner: root?.getAttribute('data-oasis-layout-owner') ?? null,
      rootContract: root?.getAttribute('data-oasis-layout-contract') ?? null,
      rootMarginRight: root ? getComputedStyle(root).marginRight : null,
      widthVariable: document.documentElement.style.getPropertyValue('--oasis-right-rail-width'),
      panel: rectangle(surface),
      standalonePanelCount: document.querySelectorAll('[data-testid="oasis-panel"]').length,
      embeddedPanelCount: document.querySelectorAll('[data-testid="oasis-embedded-workbench"]').length,
      embeddedVisible: embedded?.getAttribute('data-visible') ?? null,
      betterSidebarMarkerCount: document.querySelectorAll('[data-dsh-better-sidebar]').length,
      betterSidebar: rectangle(betterSidebar),
      entryHostMode: entry?.getAttribute('data-oasis-host-mode') ?? null,
      entryHostVersion: entry?.getAttribute('data-oasis-host-version') ?? null,
      sidebar: rectangle(sidebar), conversation: rectangle(conversation), details: rectangle(details),
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

async function captureNativeIdentity(page) {
  return await page.evaluate(() => {
    const overlay = document.querySelector('[data-shell-overlay]')
    const frame = overlay?.parentElement ?? null
    const directFrameChild = (node) => {
      let current = node
      while (current?.parentElement && current.parentElement !== frame) current = current.parentElement
      return current?.parentElement === frame ? current : null
    }
    const sidebar = directFrameChild(frame?.querySelector('[data-slot="sidebar"]'))
    const conversation = directFrameChild(frame?.querySelector('[data-slot="conversation"]'))
    globalThis.__oasisWeek3NativeIdentity ??= { sidebar, conversation }
    return {
      sidebarPresent: Boolean(sidebar),
      conversationPresent: Boolean(conversation),
      sidebarSame: globalThis.__oasisWeek3NativeIdentity.sidebar === sidebar,
      conversationSame: globalThis.__oasisWeek3NativeIdentity.conversation === conversation,
    }
  })
}

test('Host2 browser completes the project-bound local professional loop without native DOM replacement or external business traffic', async () => {
  assert.ok(PANEL_HOST_MODES.includes(panelHostMode), `unsupported OASIS_PANEL_HOST_MODE: ${panelHostMode}`)
  const baseUrl = process.env.OASIS_DSH_BASE_URL
  const workspaceAId = process.env.OASIS_WORKSPACE_A_ID
  const workspaceBId = process.env.OASIS_WORKSPACE_B_ID
  const workspaceALabel = process.env.OASIS_WORKSPACE_A_LABEL
  const workspaceBLabel = process.env.OASIS_WORKSPACE_B_LABEL
  const sessionA1Title = process.env.OASIS_SESSION_A1_TITLE
  const sessionA2Title = process.env.OASIS_SESSION_A2_TITLE
  const sessionBTitle = process.env.OASIS_SESSION_B_TITLE
  const expectedBetterSidebarVersion = process.env.OASIS_BETTER_SIDEBAR_VERSION
  assert.ok(
    baseUrl && workspaceAId && workspaceBId && workspaceALabel && workspaceBLabel
      && sessionA1Title && sessionA2Title && sessionBTitle,
    'explicit Host2, Workspace, and visible-session evidence is required; the test never targets an implicit DSH Host',
  )
  if (panelHostMode === 'better-sidebar') {
    assert.equal(expectedBetterSidebarVersion, '0.15.2', 'native-host verification requires exact Better Sidebar 0.15.2')
  }
  const parsedBaseUrl = new URL(baseUrl)
  const expectedHostname = parsedBaseUrl.hostname.replace(/^\[|\]$/g, '')
  assert.equal(parsedBaseUrl.protocol, 'http:')
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(expectedHostname), 'browser test refuses non-loopback Hosts')

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
  const requests = []
  const layouts = {}
  const nativeIdentity = {}
  const userFacingControls = {}
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
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      requests.push({ method: request.method(), protocol: url.protocol, hostname: url.hostname, port: url.port, pathname: url.pathname })
    }
  })

  try {
    await page.goto(parsedBaseUrl.href, { waitUntil: 'networkidle', timeout: 30_000 })
    await dismissOnboarding(page)
    assert.equal(await page.title(), 'DeepSeek Harness')

    await openWorkspaceSession(page, workspaceALabel, sessionA1Title)
    let panel = await ensurePanel(page, workspaceAId)
    assert.ok((await tabNames(panel)).includes('Host1 技术闭环'))

    await page.getByTestId('oasis-new-page').click()
    const chooserPanelId = await panel.getByRole('tabpanel').getAttribute('id')
    await panel.getByRole('heading', { name: '选择工作流' }).waitFor()
    await page.getByTestId('oasis-workflow-technical-rd').click()
    await panel.getByRole('heading', { name: '工作流输入' }).waitFor()
    assert.equal(await panel.getByRole('tabpanel').getAttribute('id'), chooserPanelId, 'workflow chooser must convert in place')
    assert.equal(await panel.locator('[data-field-id]').count(), 5, 'technical schema must render all Host fields')
    await panel.getByRole('textbox', { name: '任务名称' }).fill('浏览器技术闭环')
    await panel.getByRole('textbox', { name: '任务名称' }).press('Tab')
    await page.waitForTimeout(700)
    await waitReady(page, workspaceAId)

    await panel.locator('[data-field-id="objective"] textarea').fill('验证浏览器端确定性技术闭环')
    await panel.locator('[data-field-id="currentState"] textarea').fill('已有隔离 Host 与临时 Workspace 基线')
    await panel.locator('[data-field-id="constraints"] textarea').fill('不得覆盖既有文件\n不得访问外部业务系统')
    await panel.locator('[data-field-id="evidenceStatus"] select').selectOption('verified')
    await panel.locator('[data-field-id="expectedDeliverable"] textarea').fill('生成、审核并回写 Markdown 与元数据')
    await page.waitForTimeout(700)
    await waitReady(page, workspaceAId)

    const materialSection = panel.locator('section[aria-labelledby^="oasis-material-title-"]').first()
    await materialSection.getByRole('textbox', { name: 'Workspace 内材料相对路径' }).fill('materials\\technical.md')
    await materialSection.getByRole('checkbox').check()
    await materialSection.getByRole('button', { name: '登记材料', exact: true }).click()
    await waitPanelText(panel, '材料证据已登记')
    assert.ok((await materialSection.innerText()).includes('SHA-256'))
    assert.ok(!(await panel.innerText()).includes('WEEK3-TECHNICAL-MATERIAL-DO-NOT-READ-INTO-RESULT'))

    const generate = panel.getByRole('button', { name: '生成新运行', exact: true })
    await generate.click()
    await panel.getByRole('button', { name: '运行 1', exact: true }).waitFor()
    await panel.locator('[data-field-id="objective"] textarea').fill('验证浏览器端第二次技术运行')
    await waitPanelText(panel, '草稿已偏离此运行')
    await page.waitForTimeout(700)
    await waitReady(page, workspaceAId)
    await generate.click()
    await panel.getByRole('button', { name: '运行 2', exact: true }).waitFor()
    assert.equal(await panel.getByRole('button', { name: /^运行 \d+$/ }).count(), 2)
    await panel.locator('[data-field-id="currentState"] textarea').fill('第二次运行完成后的偏离草稿')
    await waitPanelText(panel, '草稿已偏离此运行')
    await page.getByTestId('oasis-review-approve').click()
    await waitPanelText(panel, '已记录人工批准')

    const writebackSection = panel.locator('section[aria-label="项目回写"]')
    await writebackSection.getByRole('textbox', { name: 'Workspace 内新目录' }).fill('browser-export')
    await writebackSection.getByRole('button', { name: '准备回写清单', exact: true }).click()
    await waitPanelText(panel, '待确认目标')
    assert.equal(await writebackSection.locator('code').count() >= 3, true)
    await writebackSection.getByRole('checkbox').check()
    await page.getByTestId('oasis-writeback-commit').click()
    await waitPanelText(panel, '回写成功')
    await page.screenshot({ path: resolve(outputDirectory, 'local-loop-approved-writeback.png'), fullPage: true })

    await page.reload({ waitUntil: 'networkidle' })
    await dismissOnboarding(page)
    await openWorkspaceSession(page, workspaceALabel, sessionA1Title)
    panel = await ensurePanel(page, workspaceAId)
    assert.ok((await tabNames(panel)).includes('浏览器技术闭环'))
    await waitPanelText(panel, '已记录人工批准')
    assert.equal(await panel.getByRole('button', { name: /^运行 \d+$/ }).count(), 2)

    await openWorkspaceSession(page, workspaceALabel, sessionA2Title)
    panel = await ensurePanel(page, workspaceAId)
    assert.ok((await tabNames(panel)).includes('浏览器技术闭环'))

    await openWorkspaceSession(page, workspaceBLabel, sessionBTitle)
    panel = await ensurePanel(page, workspaceBId)
    assert.ok((await tabNames(panel)).includes('Host1 专利闭环'))
    await panel.getByRole('button', { name: '运行 1', exact: true }).click()
    await waitPanelText(panel, '该运行包含阻断结果')
    assert.equal(await panel.getByTestId('oasis-review-approve').count(), 0, 'blocked result must not expose approval')
    await panel.getByRole('button', { name: '运行 2', exact: true }).click()
    await waitPanelText(panel, '已记录人工批准')

    await openWorkspaceSession(page, workspaceALabel, sessionA1Title)
    panel = await ensurePanel(page, workspaceAId)
    if (panelHostMode === 'standalone') {
      layouts.normal = await captureLayout(page)
      assert.equal(layouts.normal.requestedMode, 'normal')
      assert.equal(layouts.normal.effectiveMode, 'normal')
      assert.equal(layouts.normal.rootOwner, 'oasis-professional-service')
      assert.equal(layouts.normal.widthVariable, '360px')
      assert.equal(layouts.normal.betterSidebarMarkerCount, 0)
      nativeIdentity.normal = await captureNativeIdentity(page)
      assert.deepEqual(nativeIdentity.normal, {
        sidebarPresent: true, conversationPresent: true, sidebarSame: true, conversationSame: true,
      })

      await page.getByTestId('oasis-panel-expand').click()
      await page.waitForFunction(() => document.querySelector('[data-testid="oasis-panel"]')?.getAttribute('data-mode') === 'expanded')
      layouts.expanded = await captureLayout(page)
      assertLayoutRestored(layouts.expanded, 'expanded')
      assert.ok(layouts.expanded.panel.width > 900)
      nativeIdentity.expanded = await captureNativeIdentity(page)

      await page.getByTestId('oasis-panel-restore').click()
      await page.waitForFunction(() => document.querySelector('[data-testid="oasis-panel"]')?.getAttribute('data-mode') === 'normal')
      await page.getByTestId('oasis-panel-hide').click()
      await panel.waitFor({ state: 'detached' })
      layouts.hidden = await captureLayout(page)
      assertLayoutRestored(layouts.hidden, 'hidden')
      nativeIdentity.hidden = await captureNativeIdentity(page)

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
      nativeIdentity.hiddenNativeDetails = await captureNativeIdentity(page)
      await nativeClose.click()

      await page.getByTestId('oasis-workbench-entry').click()
      panel = await waitReady(page, workspaceAId)
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
      nativeIdentity.narrow = await captureNativeIdentity(page)
      await page.screenshot({ path: resolve(outputDirectory, 'local-loop-layout-narrow.png'), fullPage: true })
    } else {
      layouts.embeddedWide = await captureLayout(page)
      assertLayoutRestored(layouts.embeddedWide, 'embedded-wide')
      assert.equal(layouts.embeddedWide.requestedMode, 'hidden')
      assert.equal(layouts.embeddedWide.effectiveMode, 'embedded')
      assert.equal(layouts.embeddedWide.layoutStatus, 'better-sidebar-owned')
      assert.equal(layouts.embeddedWide.standalonePanelCount, 0)
      assert.equal(layouts.embeddedWide.embeddedPanelCount, 1)
      assert.equal(layouts.embeddedWide.embeddedVisible, 'true')
      assert.equal(layouts.embeddedWide.betterSidebarMarkerCount, 1)
      assert.equal(layouts.embeddedWide.entryHostMode, 'better-sidebar')
      assert.equal(layouts.embeddedWide.entryHostVersion, expectedBetterSidebarVersion)
      assert.equal(await page.getByTestId('oasis-panel-expand').count(), 0)
      assert.equal(await page.getByTestId('oasis-panel-hide').count(), 0)
      nativeIdentity.embeddedWide = await captureNativeIdentity(page)
      userFacingControls.embeddedWide = await page.getByRole('button').evaluateAll((buttons) => buttons.map((button) => ({
        ariaLabel: button.getAttribute('aria-label'),
        title: button.getAttribute('title'),
        text: button.textContent?.trim() ?? '',
        visible: Boolean(button.offsetWidth || button.offsetHeight || button.getClientRects().length),
      })).filter((button) => button.visible))

      const collapseNativeSidebar = page.getByRole('button', { name: '折叠侧边栏', exact: true })
      await collapseNativeSidebar.waitFor({ state: 'visible' })
      await collapseNativeSidebar.click()
      await page.waitForFunction(() => (
        document.querySelector('[data-testid="oasis-embedded-workbench"]')?.getAttribute('data-visible') === 'false'
      ))
      layouts.embeddedCollapsed = await captureLayout(page)
      assertLayoutRestored(layouts.embeddedCollapsed, 'embedded-collapsed')
      assert.equal(layouts.embeddedCollapsed.standalonePanelCount, 0)
      assert.equal(layouts.embeddedCollapsed.embeddedPanelCount, 1)
      assert.equal(layouts.embeddedCollapsed.embeddedVisible, 'false')

      const expandNativeSidebar = page.getByRole('button', { name: '展开侧边栏', exact: true })
      await expandNativeSidebar.waitFor({ state: 'visible' })
      await expandNativeSidebar.click()
      await panel.waitFor({ state: 'visible' })
      await page.waitForFunction(() => (
        document.querySelector('[data-testid="oasis-embedded-workbench"]')?.getAttribute('data-visible') === 'true'
      ))
      layouts.embeddedRestored = await captureLayout(page)
      assertLayoutRestored(layouts.embeddedRestored, 'embedded-restored')
      assert.equal(layouts.embeddedRestored.standalonePanelCount, 0)
      assert.equal(layouts.embeddedRestored.embeddedPanelCount, 1)
      assert.equal(layouts.embeddedRestored.embeddedVisible, 'true')

      await page.setViewportSize({ width: 900, height: 980 })
      await panel.waitFor({ state: 'visible' })
      layouts.embeddedNarrow = await captureLayout(page)
      assertLayoutRestored(layouts.embeddedNarrow, 'embedded-narrow')
      assert.equal(layouts.embeddedNarrow.standalonePanelCount, 0)
      assert.equal(layouts.embeddedNarrow.embeddedPanelCount, 1)
      assert.equal(layouts.embeddedNarrow.betterSidebarMarkerCount, 1)
      assert.ok(layouts.embeddedNarrow.panel.width >= layouts.embeddedWide.panel.width)
      assert.ok(layouts.embeddedNarrow.horizontalOverflow <= 2)
      nativeIdentity.embeddedNarrow = await captureNativeIdentity(page)
      await page.screenshot({ path: resolve(outputDirectory, 'local-loop-better-sidebar-narrow.png'), fullPage: true })
    }

    for (const [label, identity] of Object.entries(nativeIdentity)) {
      assert.equal(identity.sidebarSame, true, `${label}: sidebar DOM node was replaced`)
      assert.equal(identity.conversationSame, true, `${label}: conversation DOM node was replaced`)
    }
    assert.ok(pluginResponses.some((response) => response.status === 200))
    const nonLoopback = requests.filter(({ hostname }) => !['127.0.0.1', 'localhost', '::1'].includes(hostname.replace(/^\[|\]$/g, '')))
    assert.deepEqual(nonLoopback, [], `non-loopback browser requests: ${JSON.stringify(nonLoopback)}`)
    const forbiddenBusinessRequests = requests.filter(({ pathname, hostname }) => /dify|billing|payment|charge/i.test(`${hostname}${pathname}`))
    assert.deepEqual(forbiddenBusinessRequests, [], `forbidden business requests: ${JSON.stringify(forbiddenBusinessRequests)}`)
    assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('\n')}`)
    assert.deepEqual(consoleProblems, [], `console problems: ${JSON.stringify(consoleProblems)}`)
  } finally {
    await save(resolve(outputDirectory, 'layouts.json'), `${JSON.stringify(layouts, null, 2)}\n`)
    await save(resolve(outputDirectory, 'native-node-identity.json'), `${JSON.stringify(nativeIdentity, null, 2)}\n`)
    await save(resolve(outputDirectory, 'plugin-responses.json'), `${JSON.stringify(pluginResponses, null, 2)}\n`)
    await save(resolve(outputDirectory, 'browser-requests.json'), `${JSON.stringify(requests, null, 2)}\n`)
    await save(resolve(outputDirectory, 'console-problems.json'), `${JSON.stringify(consoleProblems, null, 2)}\n`)
    await save(resolve(outputDirectory, 'page-errors.json'), `${JSON.stringify(pageErrors, null, 2)}\n`)
    await save(resolve(outputDirectory, 'user-facing-controls.json'), `${JSON.stringify(userFacingControls, null, 2)}\n`)
    await context.close()
    await browser.close()
  }
})
