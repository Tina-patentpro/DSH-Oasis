import { createHash } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, readlink, realpath, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import process from 'node:process'

const projectRoot = resolve(process.cwd())
const outputRoot = resolve(projectRoot, 'docs/evidence/week2-repair-2026-08-25/baseline')
const profileRoot = resolve(process.env.USERPROFILE ?? '', '.dsh')
const label = process.argv[2]
if (!['before', 'after'].includes(label)) throw new Error('label must be before or after')

const productRoots = [
  '.dsh/skills',
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
  'docs/plans/2026-08-25-week2-design.md',
  'docs/plans/2026-08-25-week2-implementation.md',
  'docs/plans/2026-08-24-dsh-beta-overall-plan.md',
  'docs/evidence/week2-implementation-2026-08-25',
  'docs/evidence/week2-repair-2026-08-25/capture-repair-baseline.mjs',
  'docs/evidence/week2-repair-2026-08-25/allowed-changes.txt',
]

function sha256(data) {
  return createHash('sha256').update(data).digest('hex').toUpperCase()
}

async function collect(root, base, rows) {
  const info = await lstat(root)
  const path = relative(base, root).replaceAll('/', '\\') || '.'
  if (info.isSymbolicLink()) {
    const target = await readlink(root)
    rows.push({ path, kind: 'link', size: info.size, sha256: sha256(target), target })
    return
  }
  if (info.isDirectory()) {
    const names = await readdir(root)
    names.sort((a, b) => a.localeCompare(b, 'en'))
    for (const name of names) await collect(join(root, name), base, rows)
    return
  }
  if (info.isFile()) {
    const data = await readFile(root)
    rows.push({ path, kind: 'file', size: info.size, sha256: sha256(data), target: '' })
  }
}

async function writeTsv(path, rows) {
  const header = 'SHA256\tLength\tKind\tPath\tLinkTarget\n'
  const body = rows.map((row) => `${row.sha256}\t${row.size}\t${row.kind}\t${row.path}\t${row.target}`).join('\n')
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${header}${body}${body ? '\n' : ''}`, 'utf8')
}

const productRows = []
for (const item of productRoots) await collect(resolve(projectRoot, item), projectRoot, productRows)
productRows.sort((a, b) => a.path.localeCompare(b.path, 'en'))
const profileRows = []
await collect(profileRoot, profileRoot, profileRows)
profileRows.sort((a, b) => a.path.localeCompare(b.path, 'en'))

await writeTsv(resolve(outputRoot, `product-hashes-${label}.tsv`), productRows)
await writeTsv(resolve(outputRoot, `profile-hashes-${label}.tsv`), profileRows)
await writeFile(resolve(outputRoot, `summary-${label}.json`), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  command: `node docs/evidence/week2-repair-2026-08-25/capture-repair-baseline.mjs ${label}`,
  productRoots,
  productRootsSha256: sha256(JSON.stringify(productRoots)),
  projectRoot,
  profileRoot,
  resolvedProfileRoot: await realpath(profileRoot),
  productEntries: productRows.length,
  profileEntries: profileRows.length,
  profileLinks: profileRows.filter((row) => row.kind === 'link').length,
  linkPolicy: 'lstat plus readlink target text; link targets are not traversed',
}, null, 2)}\n`, 'utf8')

console.log(`product_entries=${productRows.length}`)
console.log(`profile_entries=${profileRows.length}`)
console.log(`profile_links=${profileRows.filter((row) => row.kind === 'link').length}`)
