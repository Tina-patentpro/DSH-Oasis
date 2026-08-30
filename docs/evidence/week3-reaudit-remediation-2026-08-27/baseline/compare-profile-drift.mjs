import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

import { compareRows, parseBaselineTsv } from '../../../../scripts/baseline-capture-core.mjs'

const projectRoot = resolve(process.cwd())
const previousPath = resolve(
  projectRoot,
  'docs/evidence/week3-comprehensive-reaudit-2026-08-26/baseline/profile-hashes-after.tsv',
)
const currentPath = resolve(
  projectRoot,
  'docs/evidence/week3-reaudit-remediation-2026-08-27/baseline/profile-hashes-before.tsv',
)
const outputPath = resolve(
  projectRoot,
  'docs/evidence/week3-reaudit-remediation-2026-08-27/baseline/profile-drift-since-reaudit.json',
)

const previous = parseBaselineTsv(await readFile(previousPath, 'utf8'))
const current = parseBaselineTsv(await readFile(currentPath, 'utf8'))
const comparison = compareRows(previous, current)
const report = {
  generatedAt: new Date().toISOString(),
  previousPath,
  currentPath,
  previousEntries: previous.length,
  currentEntries: current.length,
  changeCount: comparison.changes.length,
  changes: comparison.changes,
}

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(`previous_entries=${previous.length}`)
console.log(`current_entries=${current.length}`)
console.log(`change_count=${comparison.changes.length}`)
for (const change of comparison.changes) {
  console.log(`${change.kind}\t${change.path}`)
}
