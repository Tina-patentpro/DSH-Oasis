import { createHash } from 'node:crypto'
import { lstat, readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import { basename, join, relative, resolve } from 'node:path'

const [sourceArgument, copyArgument, outputArgument] = process.argv.slice(2)
if (!sourceArgument || !copyArgument || !outputArgument) {
  throw new Error('source, copy, and output paths are required')
}

const selectedPaths = [
  '.dsh',
  '.gitignore',
  'README.md',
  'scripts',
  'tests',
  'packages/oasis-professional-service',
]
const excludedDirectoryNames = new Set(['.dsh-test', 'node_modules'])
const excludedGeneratedPrefixes = ['packages/oasis-professional-service/lib']

async function hashFile(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex')
}

async function collect(root) {
  const rows = []

  async function visit(path) {
    const portablePath = relative(root, path).split('\\').join('/')
    if (excludedGeneratedPrefixes.some((prefix) => portablePath === prefix || portablePath.startsWith(`${prefix}/`))) return
    const info = await lstat(path)
    if (info.isSymbolicLink()) throw new Error(`copy proof refuses links: ${path}`)
    if (info.isFile()) {
      rows.push({
        path: portablePath,
        bytes: info.size,
        sha256: await hashFile(path),
      })
      return
    }
    if (!info.isDirectory()) throw new Error(`copy proof refuses non-file entries: ${path}`)
    const entries = await readdir(path, { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name, 'en'))
    for (const entry of entries) {
      if (excludedDirectoryNames.has(entry.name)) continue
      await visit(join(path, entry.name))
    }
  }

  for (const selectedPath of selectedPaths) await visit(resolve(root, selectedPath))
  rows.sort((left, right) => left.path.localeCompare(right.path, 'en'))
  return rows
}

const source = await realpath(resolve(sourceArgument))
const copy = await realpath(resolve(copyArgument))
const sourceRows = await collect(source)
const copyRows = await collect(copy)
const renamed = basename(source) !== basename(copy)
const identical = JSON.stringify(sourceRows) === JSON.stringify(copyRows)
const sourceByPath = new Map(sourceRows.map((row) => [row.path, row]))
const copyByPath = new Map(copyRows.map((row) => [row.path, row]))
const mismatches = [...new Set([...sourceByPath.keys(), ...copyByPath.keys()])]
  .sort((left, right) => left.localeCompare(right, 'en'))
  .flatMap((path) => {
    const sourceRow = sourceByPath.get(path) ?? null
    const copyRow = copyByPath.get(path) ?? null
    return JSON.stringify(sourceRow) === JSON.stringify(copyRow) ? [] : [{ path, source: sourceRow, copy: copyRow }]
  })
const result = {
  source,
  copy,
  sourceDisplayName: basename(source),
  copyDisplayName: basename(copy),
  renamed,
  identical,
  fileCount: sourceRows.length,
  copyFileCount: copyRows.length,
  mismatches,
  rows: sourceRows,
}
await writeFile(resolve(outputArgument), `${JSON.stringify(result, null, 2)}\n`, 'utf8')
if (!renamed) throw new Error('copy final directory name did not change')
if (!identical) throw new Error('selected verifier source trees are not hash-identical')
console.log(`renamed=${renamed} identical=${identical} files=${sourceRows.length}`)
