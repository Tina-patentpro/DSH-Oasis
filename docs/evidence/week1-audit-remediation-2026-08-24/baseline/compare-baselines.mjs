import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve('docs/evidence/week1-audit-remediation-2026-08-24/baseline')

async function parse(name) {
  const lines = (await readFile(resolve(root, name), 'utf8')).trimEnd().split('\n').slice(1)
  return new Map(lines.filter(Boolean).map((line) => {
    const [sha256, length, kind, ...pathParts] = line.split('\t')
    const path = pathParts.join('\t')
    return [path, { sha256, length: Number(length), kind }]
  }))
}

async function compare(prefix) {
  const before = await parse(`${prefix}-hashes-before.tsv`)
  const after = await parse(`${prefix}-hashes-after.tsv`)
  const added = [...after.keys()].filter((path) => !before.has(path)).sort()
  const removed = [...before.keys()].filter((path) => !after.has(path)).sort()
  const modified = [...after.keys()].filter((path) => {
    if (!before.has(path)) return false
    return JSON.stringify(before.get(path)) !== JSON.stringify(after.get(path))
  }).sort().map((path) => ({ path, before: before.get(path), after: after.get(path) }))
  const result = { added, removed, modified }
  await writeFile(resolve(root, `${prefix}-delta.json`), `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(`${prefix}: added=${added.length} removed=${removed.length} modified=${modified.length}`)
}

await compare('source')
await compare('profile')
