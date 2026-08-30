import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'

test('Week 2 verifier constructs drafts through the current editable contract', async () => {
  const relativePath = 'scripts/verify-week2-persistence.mjs'
  const source = await readFile(resolve(relativePath), 'utf8')
  assert.match(source, /import \{ parseWorkbenchEditableDraft \}/,
    'the verifier must reuse the current production draft parser')
  assert.equal((source.match(/schemaVersion: 2/g) ?? []).length, 2,
    'both workspace draft factories must emit schemaVersion 2')
  const taskFactory = source.slice(source.indexOf('function createTask'), source.indexOf('function draftA'))
  assert.match(taskFactory, /activeRunId: null/)
  assert.doesNotMatch(taskFactory, /\binputRefs:/)
  assert.doesNotMatch(taskFactory, /\brunOrder:/)
  assert.doesNotMatch(taskFactory, /\bruns:/)
  assert.doesNotMatch(taskFactory, /\brun: null/)
  assert.doesNotMatch(taskFactory, /\bpreview: null/)
  assert.doesNotMatch(taskFactory, /review: 'not-reviewed'/)
  assert.equal((source.match(/return parseWorkbenchEditableDraft\(/g) ?? []).length, 2,
    'both draft factories must fail closed against the current contract before RPC')
})

test('Week 1 and Week 2 browser verification receives the workspace display name from the verifier', async () => {
  const fixedName = '9、绿洲慧写4.0预研'
  for (const [verifierPath, browserPath, browserUsage] of [
    [
      'scripts/verify-week1-supplement.mjs',
      'tests/integration/week1-supplement-browser.test.mjs',
      /hasText: workspaceDisplayName/,
    ],
    [
      'scripts/verify-week2-persistence.mjs',
      'tests/integration/week2-persistence-browser.test.mjs',
      /openWorkspaceSession\(page, workspaceDisplayName/,
    ],
  ]) {
    const verifier = await readFile(resolve(verifierPath), 'utf8')
    const browser = await readFile(resolve(browserPath), 'utf8')
    assert.match(verifier, /const workspaceDisplayName = basename\(projectRoot\)/,
      `${verifierPath} must derive the display name from its actual project root`)
    assert.match(verifier, /OASIS_WORKSPACE_DISPLAY_NAME:\s*workspaceDisplayName/,
      `${verifierPath} must pass the derived display name to its browser test`)
    assert.match(browser, /const workspaceDisplayName = process\.env\.OASIS_WORKSPACE_DISPLAY_NAME\?\.trim\(\)/,
      `${browserPath} must read and normalize the required verifier input`)
    assert.match(browser, /assert\.ok\(workspaceDisplayName, 'OASIS_WORKSPACE_DISPLAY_NAME is required/,
      `${browserPath} must fail fast when the verifier input is missing`)
    assert.match(browser, browserUsage,
      `${browserPath} must select the project Workspace through the verifier-provided name`)
    assert.doesNotMatch(browser, new RegExp(fixedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})
