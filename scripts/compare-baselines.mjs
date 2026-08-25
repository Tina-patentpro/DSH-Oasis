import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { compareRows, parseBaselineTsv } from './baseline-capture-core.mjs'

const [beforePath, afterPath, allowlistPath, outputPath] = process.argv.slice(2)
if (!beforePath || !afterPath || !allowlistPath || !outputPath) {
  throw new Error('usage: node scripts/compare-baselines.mjs <before.tsv> <after.tsv> <allowlist.txt> <output.json>')
}

const [beforeText, afterText, allowlistText] = await Promise.all([
  readFile(resolve(beforePath), 'utf8'),
  readFile(resolve(afterPath), 'utf8'),
  readFile(resolve(allowlistPath), 'utf8'),
])
const allowedPaths = allowlistText.split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
const result = compareRows(parseBaselineTsv(beforeText), parseBaselineTsv(afterText), allowedPaths)
await writeFile(resolve(outputPath), `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(`allowed_changes=${result.allowed.length}`)
console.log(`unexpected_changes=${result.unexpected.length}`)
if (!result.ok) process.exitCode = 1
