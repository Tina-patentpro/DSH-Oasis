import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const baseUrl = 'http://127.0.0.1:9120'
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const playwrightModule = join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')
const outputRoot = resolve('docs/evidence/week3-reaudit-remediation-2026-08-27/task6/runtime/week1-workflow-debug')
const rpc = JSON.parse(await readFile(resolve(
  'docs/evidence/week3-reaudit-remediation-2026-08-27/task6/week1/runtime/verifier-rpc.json',
), 'utf8'))
const sessionId = rpc.session.result.value.sessionId

await mkdir(outputRoot, { recursive: true })
const { chromium } = await import(pathToFileURL(playwrightModule).href)
const browser = await chromium.launch({ executablePath: edge, headless: true })
const context = await browser.newContext({ viewport: { width: 1600, height: 980 } })
const page = await context.newPage()
const consoleProblems = []
const pageErrors = []
page.on('console', (message) => {
  if (['error', 'warning'].includes(message.type())) consoleProblems.push({ type: message.type(), text: message.text() })
})
page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message))

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30_000 })
  for (const label of ['继续', '稍后配置']) {
    const action = page.getByRole('button', { name: label, exact: true })
    if (await action.isVisible()) await action.click()
  }
  const workspace = page.getByRole('treeitem').filter({ hasText: '9、绿洲慧写4.0预研' }).first()
  await workspace.waitFor({ state: 'visible' })
  if (await workspace.getAttribute('aria-expanded') !== 'true') await workspace.click()
  const session = page.getByRole('treeitem').filter({ hasText: 'Oasis 验证 A-1' }).first()
  await session.waitFor({ state: 'visible' })
  await session.click()
  const entry = page.getByTestId('oasis-workbench-entry')
  await entry.waitFor({ state: 'visible', timeout: 20_000 })
  await entry.click()
  const panel = page.getByTestId('oasis-panel')
  await panel.waitFor({ state: 'visible' })
  await page.getByTestId('oasis-new-page').click()
  await page.getByRole('heading', { name: '选择工作流' }).waitFor()
  const tabs = panel.getByRole('tab')
  await tabs.last().click()
  await page.getByTestId('oasis-workflow-technical-rd').click()
  await panel.getByRole('heading', { name: '工作流输入' }).waitFor()
  await page.waitForTimeout(2_000)

  const result = await panel.evaluate((element, currentSessionId) => ({
    currentSessionId,
    text: element.innerText,
    html: element.outerHTML,
    fieldIds: [...element.querySelectorAll('[data-field-id]')].map((item) => item.getAttribute('data-field-id')),
    testIds: [...element.querySelectorAll('[data-testid]')].map((item) => item.getAttribute('data-testid')),
  }), sessionId)
  await writeFile(resolve(outputRoot, 'panel-state.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  await writeFile(resolve(outputRoot, 'console-problems.json'), `${JSON.stringify(consoleProblems, null, 2)}\n`, 'utf8')
  await writeFile(resolve(outputRoot, 'page-errors.json'), `${JSON.stringify(pageErrors, null, 2)}\n`, 'utf8')
  await page.screenshot({ path: resolve(outputRoot, 'panel.png'), fullPage: true })
  console.log(`field_count=${result.fieldIds.length}`)
  console.log(`field_ids=${result.fieldIds.join(',')}`)
} finally {
  await context.close()
  await browser.close()
}
