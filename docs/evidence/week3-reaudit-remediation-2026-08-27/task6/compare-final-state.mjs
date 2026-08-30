import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  compareRows,
  parseBaselineTsv,
  sha256,
} from '../../../../scripts/baseline-capture-core.mjs'

const projectRoot = resolve(process.cwd())
const remediationRoot = resolve(projectRoot, 'docs/evidence/week3-reaudit-remediation-2026-08-27')
const baselineRoot = resolve(remediationRoot, 'baseline')
const task6Root = resolve(remediationRoot, 'task6')

const allowedProductPaths = [
  'packages/oasis-professional-service/src/writeback-service.js',
  'packages/oasis-professional-service/test/writeback-service.test.mjs',
  'packages/oasis-professional-service/src/local-mock-runner.js',
  'packages/oasis-professional-service/src/workbench-domain.js',
  'packages/oasis-professional-service/test/workbench-fixtures.mjs',
  'packages/oasis-professional-service/test/workbench-domain.test.mjs',
  'packages/oasis-professional-service/test/workbench-service.test.mjs',
  'packages/oasis-professional-service/test/workbench-contract.test.mjs',
  'scripts/verify-week1-supplement.mjs',
  'scripts/audit-week3-closure.mjs',
  'tests/scripts/real-profile-baseline-contract.test.mjs',
  'tests/scripts/week3-package-audit-scope.test.mjs',
  'tests/integration/week1-supplement-browser.test.mjs',
  'README.md',
  'docs/plans/2026-08-24-dsh-beta-overall-plan.md',
  'docs/plans/2026-08-25-week3-design.md',
  'docs/plans/2026-08-25-week3-implementation.md',
  'docs/plans/2026-08-26-week3-reaudit-remediation.md',
  'docs/第三周-本地闭环验证报告.md',
  'docs/第三周-全面审计报告.md',
  'docs/第三周-全面复审报告.md',
]

async function json(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function rows(stem, label) {
  return parseBaselineTsv(await readFile(resolve(baselineRoot, `${stem}-${label}.tsv`), 'utf8'))
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

const beforeSummary = await json(resolve(baselineRoot, 'baseline-summary-before.json'))
const afterSummary = await json(resolve(baselineRoot, 'baseline-summary-after.json'))
const productComparison = compareRows(
  await rows('product-hashes', 'before'),
  await rows('product-hashes', 'after'),
  allowedProductPaths,
)
const historicalEvidenceComparison = compareRows(
  await rows('historical-evidence-hashes', 'before'),
  await rows('historical-evidence-hashes', 'after'),
)
const remediationStartProfileComparison = compareRows(
  await rows('profile-hashes', 'before'),
  await rows('profile-hashes', 'after'),
)
const task6ProfileComparison = compareRows(
  parseBaselineTsv(await readFile(resolve(task6Root, 'runtime/profile-confirmed.tsv'), 'utf8')),
  await rows('profile-hashes', 'after'),
)
const workspaceContractsBefore = await json(resolve(baselineRoot, 'workspace-contracts-before.json'))
const workspaceContractsAfter = await json(resolve(baselineRoot, 'workspace-contracts-after.json'))
const packageAudit = await json(resolve(task6Root, 'package/package-audit.json'))
const currentHeadResult = spawnSync('git.exe', ['rev-parse', 'HEAD'], {
  cwd: projectRoot,
  encoding: 'utf8',
  windowsHide: true,
})
const currentHead = currentHeadResult.stdout?.trim() ?? ''

const browserChecks = []
for (const week of ['week1', 'week2', 'week3']) {
  const browserRoot = resolve(task6Root, week, 'browser')
  const consoleProblems = await json(resolve(browserRoot, 'console-problems.json'))
  const pageErrors = await json(resolve(browserRoot, 'page-errors.json'))
  const item = {
    week,
    consoleProblems: consoleProblems.length,
    pageErrors: pageErrors.length,
  }
  if (week === 'week3') {
    const requests = await json(resolve(browserRoot, 'browser-requests.json'))
    item.requests = requests.length
    item.nonLoopbackRequests = requests.filter((request) => (
      request.hostname !== '127.0.0.1' && request.hostname !== 'localhost'
    )).length
  }
  browserChecks.push(item)
}

const finalReport = resolve(projectRoot, 'docs/第三周-全面复审修复报告.md')
const finalReportInfo = await stat(finalReport)
const finalReportBytes = await readFile(finalReport)
const result = {
  generatedAt: new Date().toISOString(),
  git: {
    remediationStartHead: beforeSummary.gitHeadAtRemediationStart,
    afterBaselineHead: afterSummary.gitHeadAtRemediationStart,
    currentHead,
    equal: currentHeadResult.status === 0
      && currentHead === beforeSummary.gitHeadAtRemediationStart
      && afterSummary.gitHeadAtRemediationStart === beforeSummary.gitHeadAtRemediationStart,
  },
  product: productComparison,
  historicalEvidence: historicalEvidenceComparison,
  workspaceContractsEqual: sameJson(workspaceContractsBefore, workspaceContractsAfter),
  profile: {
    remediationStartEqual: remediationStartProfileComparison.changes.length === 0,
    remediationStartChangeCount: remediationStartProfileComparison.changes.length,
    task6ConfirmedEqual: task6ProfileComparison.changes.length === 0,
    task6ConfirmedChangeCount: task6ProfileComparison.changes.length,
    afterSummaryTask6Equal: afterSummary.task6ProfileEqual,
  },
  packageAudit: {
    scope: packageAudit.scope,
    semanticProof: packageAudit.semanticProof,
    result: packageAudit.result,
    entryCount: packageAudit.tarball?.entryCount,
    sha256: packageAudit.tarball?.sha256,
  },
  browserChecks,
  finalReport: {
    path: finalReport,
    isFile: finalReportInfo.isFile(),
    size: finalReportInfo.size,
    sha256: sha256(finalReportBytes),
  },
}

await writeFile(resolve(task6Root, 'final-state-comparison.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8')

assert.equal(result.git.equal, true, 'Git HEAD changed after remediation began')
assert.equal(productComparison.ok, true, `unexpected product changes: ${productComparison.unexpected.map((item) => item.path).join(', ')}`)
assert.equal(historicalEvidenceComparison.ok, true, 'historical evidence changed')
assert.equal(result.workspaceContractsEqual, true, 'installed DSH workspace contracts changed')
assert.equal(result.profile.task6ConfirmedEqual, true, 'real Profile changed after the confirmed Task 6 baseline')
assert.equal(result.profile.afterSummaryTask6Equal, true, 'after baseline did not confirm Task 6 Profile equality')
assert.equal(packageAudit.scope, 'STATIC_PACKAGE_ONLY')
assert.equal(packageAudit.semanticProof, false)
assert.equal(packageAudit.result, 'CLEAN')
assert.equal(packageAudit.tarball?.entryCount, 33)
for (const check of browserChecks) {
  assert.equal(check.consoleProblems, 0, `${check.week} browser console problems`)
  assert.equal(check.pageErrors, 0, `${check.week} browser page errors`)
  if (check.week === 'week3') assert.equal(check.nonLoopbackRequests, 0, 'Week 3 made a non-loopback browser request')
}
assert.equal(result.finalReport.isFile, true)
assert.ok(result.finalReport.size > 0)

console.log(`allowed_product_changes=${productComparison.allowed.length}`)
console.log(`unexpected_product_changes=${productComparison.unexpected.length}`)
console.log(`historical_evidence_changes=${historicalEvidenceComparison.changes.length}`)
console.log(`task6_profile_changes=${task6ProfileComparison.changes.length}`)
console.log(`remediation_start_profile_changes=${remediationStartProfileComparison.changes.length}`)
console.log(`package_entries=${packageAudit.tarball.entryCount}`)
console.log('final_state_comparison=CLEAN')
