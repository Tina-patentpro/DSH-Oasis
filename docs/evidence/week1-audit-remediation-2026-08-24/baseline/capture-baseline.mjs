import { createHash } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import process from 'node:process'

const projectRoot = resolve(process.cwd())
const outputRoot = resolve(projectRoot, 'docs/evidence/week1-audit-remediation-2026-08-24/baseline')
const profileRoot = resolve(process.env.USERPROFILE ?? '', '.dsh')
const label = process.argv[2] ?? 'before'
if (!['before', 'after'].includes(label)) throw new Error('baseline label must be before or after')
const sourceRoots = [
  '.dsh/skills',
  'packages/oasis-professional-service/src',
  'packages/oasis-professional-service/test',
  'packages/oasis-professional-service/package.json',
  'packages/oasis-professional-service/pnpm-lock.yaml',
  'packages/oasis-professional-service/cordis.patch.yml',
  'packages/oasis-professional-service/tsdown.config.mjs',
  'scripts',
  'tests',
  'README.md',
  '.gitignore',
]

function portable(path) {
  return path.replaceAll('/', '\\')
}

async function collect(root, base = root, rows = []) {
  const info = await lstat(root)
  const path = portable(relative(base, root) || '.')
  if (info.isSymbolicLink()) {
    rows.push({ path, kind: 'link', size: info.size, sha256: '' })
    return rows
  }
  if (info.isDirectory()) {
    const names = await readdir(root)
    names.sort((a, b) => a.localeCompare(b, 'en'))
    for (const name of names) await collect(join(root, name), base, rows)
    return rows
  }
  if (info.isFile()) {
    const data = await readFile(root)
    rows.push({
      path,
      kind: 'file',
      size: info.size,
      sha256: createHash('sha256').update(data).digest('hex').toUpperCase(),
    })
  }
  return rows
}

async function collectProductSources() {
  const rows = []
  for (const item of sourceRoots) {
    const absolute = resolve(projectRoot, item)
    const itemRows = await collect(absolute, projectRoot)
    rows.push(...itemRows)
  }
  rows.sort((a, b) => a.path.localeCompare(b.path, 'en'))
  return rows
}

async function writeTsv(path, rows) {
  const header = 'SHA256\tLength\tKind\tPath\n'
  const body = rows.map((row) => `${row.sha256}\t${row.size}\t${row.kind}\t${row.path}`).join('\n')
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${header}${body}${body === '' ? '' : '\n'}`, 'utf8')
}

await mkdir(outputRoot, { recursive: true })
const sourceRows = await collectProductSources()
const profileRows = await collect(profileRoot, profileRoot)
const resolvedProfileRoot = await realpath(profileRoot)

await writeTsv(resolve(outputRoot, `source-hashes-${label}.tsv`), sourceRows)
await writeTsv(resolve(outputRoot, `profile-hashes-${label}.tsv`), profileRows)
const summaryName = label === 'before' ? 'baseline-summary.json' : 'baseline-summary-after.json'
await writeFile(resolve(outputRoot, summaryName), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  projectRoot,
  profileRoot,
  resolvedProfileRoot,
  sourceEntries: sourceRows.length,
  sourceLinks: sourceRows.filter((row) => row.kind === 'link').length,
  profileEntries: profileRows.length,
  profileLinks: profileRows.filter((row) => row.kind === 'link').length,
  nodeVersion: process.version,
}, null, 2)}\n`, 'utf8')

console.log(`source_entries=${sourceRows.length}`)
console.log(`profile_entries=${profileRows.length}`)
console.log(`profile_links=${profileRows.filter((row) => row.kind === 'link').length}`)
