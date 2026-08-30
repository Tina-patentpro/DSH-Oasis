import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

async function text(path) {
  return readFile(resolve(path), 'utf8')
}

const design = await text('docs/plans/2026-08-25-week3-design.md')
const overall = await text('docs/plans/2026-08-24-dsh-beta-overall-plan.md')
const historicalAudit = await text('docs/第三周-全面审计报告.md')
const historicalLoop = await text('docs/第三周-本地闭环验证报告.md')
const independentReview = await text('docs/第三周-全面复审报告.md')

assert.match(design, /状态：已确认.*重新打开.*修复中/)
assert.doesNotMatch(design, /状态：待确认/)
assert.match(overall, /第三周（重新打开，修复中）/)
assert.doesNotMatch(overall, /第三周（已关闭/)
assert.match(historicalAudit, /历史报告 \/ 已被后续复审取代/)
assert.match(historicalLoop, /历史报告 \/ 已被后续复审取代/)
assert.match(independentReview, /后续状态：2026-08-27.*进入修复/)
assert.match(independentReview, /week3-reaudit-remediation-2026-08-27\/evidence-ledger\.md/)

let finalReportExists = true
try {
  await access(resolve('docs/第三周-全面复审修复报告.md'))
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
  finalReportExists = false
}
assert.equal(finalReportExists, false, 'final repair report must not exist before Task 6 passes')

console.log('governance_state=REOPENED_REMEDIATION_IN_PROGRESS')
console.log('historical_pass_reports=superseded')
console.log('independent_review_verdict=FAIL_PRESERVED')
console.log('final_repair_report_exists=false')
