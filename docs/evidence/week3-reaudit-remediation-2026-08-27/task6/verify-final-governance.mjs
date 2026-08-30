import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

async function text(path) {
  return readFile(resolve(path), 'utf8')
}

const design = await text('docs/plans/2026-08-25-week3-design.md')
const overall = await text('docs/plans/2026-08-24-dsh-beta-overall-plan.md')
const remediationPlan = await text('docs/plans/2026-08-26-week3-reaudit-remediation.md')
const historicalAudit = await text('docs/第三周-全面审计报告.md')
const historicalLoop = await text('docs/第三周-本地闭环验证报告.md')
const independentReview = await text('docs/第三周-全面复审报告.md')
const finalReport = await text('docs/第三周-全面复审修复报告.md')

assert.match(design, /状态：.*复审修复完成.*重新关闭/)
assert.match(overall, /第三周（已关闭，复审修复完成）/)
assert.match(remediationPlan, /执行状态：已完成/)
assert.match(historicalAudit, /历史报告 \/ 已被后续复审取代/)
assert.match(historicalLoop, /历史报告 \/ 已被后续复审取代/)
assert.match(independentReview, /第三周-全面复审修复报告\.md/)
assert.match(finalReport, /PASS_WITH_CONCERNS/)
assert.match(finalReport, /W3R-01/)
assert.match(finalReport, /W3R-06/)
assert.match(finalReport, /STATIC_PACKAGE_ONLY/)
assert.match(finalReport, /Task 6 确认基线/)

console.log('governance_state=REAUDIT_REMEDIATION_CLOSED')
console.log('historical_reports=UNCHANGED_VERDICT_CHAIN_PRESERVED')
console.log('final_report_status=PASS_WITH_CONCERNS')
