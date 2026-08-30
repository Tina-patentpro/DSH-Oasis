import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { compareRows, parseBaselineTsv } from '../../../../scripts/baseline-capture-core.mjs'

const root = resolve(process.cwd(), 'docs/evidence/week3-implementation-2026-08-25/baseline')
const before = parseBaselineTsv(await readFile(resolve(root, 'profile-hashes-before.tsv'), 'utf8'))
const after = parseBaselineTsv(await readFile(resolve(root, 'profile-hashes-after.tsv'), 'utf8'))
const comparison = compareRows(before, after)

const byKind = Object.fromEntries(['added', 'removed', 'modified'].map((kind) => [
  kind,
  comparison.changes.filter((change) => change.kind === kind).length,
]))
const topLevel = new Map()
for (const change of comparison.changes) {
  const prefix = change.path.split('\\')[0]
  topLevel.set(prefix, (topLevel.get(prefix) ?? 0) + 1)
}

const summary = {
  generatedAt: new Date().toISOString(),
  proofBoundary: 'Path, type, size, link target, and SHA-256 metadata only; no Profile file contents are copied.',
  beforeEntries: before.length,
  afterEntries: after.length,
  changeCounts: byKind,
  topLevelChanges: [...topLevel.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((left, right) => right.count - left.count || left.path.localeCompare(right.path, 'en')),
  existingPathChanges: comparison.changes
    .filter((change) => change.kind !== 'added')
    .map(({ path, kind, before: previous, after: current }) => ({
      path,
      kind,
      beforeSha256: previous?.sha256 ?? null,
      afterSha256: current?.sha256 ?? null,
    })),
  notableAddedPaths: comparison.changes
    .filter((change) => change.kind === 'added' && (
      change.path.startsWith('backups\\')
      || change.path.startsWith('sessions\\')
      || change.path.startsWith('storages\\')
      || /oasis|better-sidebar/i.test(change.path)
    ))
    .slice(0, 200)
    .map(({ path, after: current }) => ({ path, kind: current.kind, sha256: current.sha256 })),
}

await writeFile(resolve(root, 'profile-diff-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
console.log(`changes=${comparison.changes.length}`)
console.log(`added=${byKind.added}`)
console.log(`removed=${byKind.removed}`)
console.log(`modified=${byKind.modified}`)
