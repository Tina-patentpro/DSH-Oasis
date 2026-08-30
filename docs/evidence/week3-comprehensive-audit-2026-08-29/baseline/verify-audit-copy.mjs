import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { collectTree, compareRows } from '../../../../scripts/baseline-capture-core.mjs'

const sourceRoot = resolve(process.cwd())
const copyRoot = resolve(process.argv[2] ?? 'C:/Users/TinaD/.codex/visualizations/2026/08/21/01a026ba-0115-7760-a697-cde3f3e68624/week3-comprehensive-audit-workspace-2026-08-29')
const outputName = process.argv[3] ?? 'audit-copy-comparison.json'
const outputPath = resolve(sourceRoot, 'docs/evidence/week3-comprehensive-audit-2026-08-29/baseline', outputName)
const roots = [
  '.dsh/skills/dsh-plugin-development',
  'packages/oasis-professional-service/src',
  'packages/oasis-professional-service/test',
  'packages/oasis-professional-service/lib',
  'packages/oasis-professional-service/package.json',
  'packages/oasis-professional-service/pnpm-lock.yaml',
  'packages/oasis-professional-service/cordis.patch.yml',
  'packages/oasis-professional-service/tsdown.config.mjs',
  'scripts',
  'tests',
  'README.md',
  '.gitignore',
  'docs/PRD-DSH免费工作台.md',
  'docs/plans/2026-08-24-dsh-beta-overall-plan.md',
  'docs/plans/2026-08-25-week3-design.md',
  'docs/plans/2026-08-25-week3-implementation.md',
  'docs/plans/2026-08-26-week3-reaudit-remediation.md',
  'docs/第三周-本地闭环验证报告.md',
  'docs/第三周-全面审计报告.md',
  'docs/第三周-全面复审报告.md',
  'docs/第三周-全面复审修复报告.md',
]

async function collect(root) {
  const rows = []
  for (const relativePath of roots) rows.push(...await collectTree(resolve(root, relativePath), root))
  rows.sort((left, right) => left.path.localeCompare(right.path, 'en'))
  return rows
}

const sourceRows = await collect(sourceRoot)
const copyRows = await collect(copyRoot)
const comparison = compareRows(sourceRows, copyRows)
const report = {
  generatedAt: new Date().toISOString(),
  sourceRoot,
  copyRoot,
  roots,
  sourceEntries: sourceRows.length,
  copyEntries: copyRows.length,
  ...comparison,
}
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(`source_entries=${sourceRows.length}`)
console.log(`copy_entries=${copyRows.length}`)
console.log(`copy_changes=${comparison.changes.length}`)
if (!comparison.ok) process.exitCode = 1
