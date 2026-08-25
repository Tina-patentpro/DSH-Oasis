import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'

const [rootValue, outputValue, ...excludedValues] = process.argv.slice(2)

if (!rootValue || !outputValue) {
  throw new Error('usage: node hash-tree.mjs <root> <output> [excluded-relative-path ...]')
}

const root = resolve(rootValue)
const output = resolve(outputValue)
const excluded = excludedValues.map((value) => resolve(root, value))
const rows = []

function isExcluded(path) {
  return excluded.some((candidate) => path === candidate || path.startsWith(`${candidate}${sep}`))
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  entries.sort((left, right) => left.name.localeCompare(right.name, 'en'))

  for (const entry of entries) {
    const path = resolve(directory, entry.name)
    if (path === output || isExcluded(path) || entry.isSymbolicLink()) continue
    if (entry.isDirectory()) {
      await walk(path)
      continue
    }
    if (!entry.isFile()) continue

    const content = await readFile(path)
    const hash = createHash('sha256').update(content).digest('hex').toUpperCase()
    rows.push(`${hash}  ${relative(root, path)}`)
  }
}

await walk(root)
await writeFile(output, `${rows.join('\n')}\n`, 'utf8')
console.log(JSON.stringify({ root, output, files: rows.length }))
