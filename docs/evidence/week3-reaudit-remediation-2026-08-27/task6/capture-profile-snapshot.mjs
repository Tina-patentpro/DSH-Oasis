import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

import {
  collectTree,
  compareRows,
  parseBaselineTsv,
  sha256,
  writeBaselineTsv,
} from '../../../../scripts/baseline-capture-core.mjs'

const label = process.argv[2]
if (!['preflight', 'confirmed', 'stable', 'after'].includes(label)) {
  throw new Error('usage: node capture-profile-snapshot.mjs <preflight|confirmed|stable|after>')
}

const projectRoot = resolve(process.cwd())
const profileRoot = resolve(process.env.OASIS_REAL_DSH_PROFILE ?? resolve(process.env.USERPROFILE ?? '', '.dsh'))
const outputRoot = resolve(projectRoot, 'docs/evidence/week3-reaudit-remediation-2026-08-27/task6/runtime')
const rows = await collectTree(profileRoot, profileRoot)
const outputPath = resolve(outputRoot, `profile-${label}.tsv`)
await writeBaselineTsv(outputPath, rows)

const canonical = rows.map(({ path, kind, size, sha256: digest, target = '' }) => ({
  path,
  kind,
  size,
  sha256: digest,
  target,
}))
const summary = {
  generatedAt: new Date().toISOString(),
  profileRoot,
  entries: rows.length,
  links: rows.filter((row) => row.kind === 'link').length,
  contentSha256: sha256(JSON.stringify(canonical)),
}

if (label === 'preflight') {
  const remediationBefore = parseBaselineTsv(await readFile(resolve(
    projectRoot,
    'docs/evidence/week3-reaudit-remediation-2026-08-27/baseline/profile-hashes-before.tsv',
  ), 'utf8'))
  const comparison = compareRows(remediationBefore, rows)
  summary.remediationStartEqual = comparison.changes.length === 0
  summary.remediationStartChangeCount = comparison.changes.length
  await writeFile(resolve(outputRoot, 'profile-drift-before-task6.json'), `${JSON.stringify({
    generatedAt: summary.generatedAt,
    equal: summary.remediationStartEqual,
    changeCount: comparison.changes.length,
    changes: comparison.changes,
  }, null, 2)}\n`, 'utf8')
} else if (label === 'confirmed') {
  const preflight = parseBaselineTsv(await readFile(resolve(outputRoot, 'profile-preflight.tsv'), 'utf8'))
  const comparison = compareRows(preflight, rows)
  summary.preflightEqual = comparison.changes.length === 0
  summary.preflightChangeCount = comparison.changes.length
  await writeFile(resolve(outputRoot, 'profile-confirmed-comparison.json'), `${JSON.stringify({
    generatedAt: summary.generatedAt,
    equal: summary.preflightEqual,
    changeCount: comparison.changes.length,
    changes: comparison.changes,
  }, null, 2)}\n`, 'utf8')
} else if (label === 'stable') {
  const confirmed = parseBaselineTsv(await readFile(resolve(outputRoot, 'profile-confirmed.tsv'), 'utf8'))
  const comparison = compareRows(confirmed, rows)
  summary.confirmedEqual = comparison.changes.length === 0
  summary.confirmedChangeCount = comparison.changes.length
  await writeFile(resolve(outputRoot, 'profile-stability-comparison.json'), `${JSON.stringify({
    generatedAt: summary.generatedAt,
    equal: summary.confirmedEqual,
    changeCount: comparison.changes.length,
    changes: comparison.changes,
  }, null, 2)}\n`, 'utf8')
} else {
  const confirmed = parseBaselineTsv(await readFile(resolve(outputRoot, 'profile-confirmed.tsv'), 'utf8'))
  const comparison = compareRows(confirmed, rows)
  summary.task6Equal = comparison.changes.length === 0
  summary.task6ChangeCount = comparison.changes.length
  await writeFile(resolve(outputRoot, 'profile-task6-comparison.json'), `${JSON.stringify({
    generatedAt: summary.generatedAt,
    equal: summary.task6Equal,
    changeCount: comparison.changes.length,
    changes: comparison.changes,
  }, null, 2)}\n`, 'utf8')
}

await writeFile(resolve(outputRoot, `profile-${label}-summary.json`), `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
console.log(`profile_entries=${summary.entries}`)
console.log(`profile_links=${summary.links}`)
console.log(`profile_sha256=${summary.contentSha256}`)
if (label === 'preflight') console.log(`remediation_start_equal=${summary.remediationStartEqual}`)
if (label === 'confirmed') console.log(`preflight_equal=${summary.preflightEqual}`)
if (label === 'stable') console.log(`confirmed_equal=${summary.confirmedEqual}`)
if (label === 'after') console.log(`task6_equal=${summary.task6Equal}`)
