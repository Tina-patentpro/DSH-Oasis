import { readFile, readdir } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import process from 'node:process'

const root = resolve(process.cwd())
const packageRoot = resolve(root, 'packages/oasis-professional-service')

async function filesUnder(path, rows = []) {
  const entries = await readdir(path, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(path, entry.name)
    if (entry.isDirectory()) await filesUnder(full, rows)
    else if (entry.isFile()) rows.push(full)
  }
  return rows
}

const textFiles = [
  ...await filesUnder(resolve(packageRoot, 'src')),
  resolve(packageRoot, 'lib/client.js'),
  resolve(packageRoot, 'package.json'),
  resolve(packageRoot, 'cordis.patch.yml'),
]

const patterns = [
  ['browser-business-storage', /\b(?:localStorage|sessionStorage)\b/],
  ['occupied-details-api', /\b(?:openDetails|closeDetails)\b/],
  ['occupied-details-registration', /name\s*:\s*['"]details['"]/],
  ['private-key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/],
  ['literal-api-secret', /\b(?:api[_-]?key|secret)\s*[:=]\s*['"][^'"]+['"]/i],
]

const matches = []
for (const file of textFiles) {
  const text = await readFile(file, 'utf8')
  for (const [name, pattern] of patterns) {
    if (pattern.test(text)) matches.push({ name, file: relative(root, file).replaceAll('/', '\\') })
  }
}

const hostSurface = `${await readFile(resolve(packageRoot, 'src/index.js'), 'utf8')}\n${await readFile(resolve(packageRoot, 'src/status.js'), 'utf8')}`
const hostBusinessStateLeak = /workspaceState|activeTaskId|taskOrder|formValues|inputRefs/.test(hostSurface)

const pack = JSON.parse(await readFile(resolve(root, 'docs/evidence/week2-audit-2026-08-25/verification/pack-dry-run.json'), 'utf8'))
const packPaths = pack.flatMap((entry) => entry.files.map((file) => file.path))
const disallowedPackPaths = packPaths.filter((path) => /(?:^|\/)(?:test|tests|docs|node_modules|\.dsh-test|\.env)(?:\/|$)/i.test(path))
const requiredPackPaths = [
  'lib/client.js',
  'src/workbench-domain.js',
  'src/workbench-repository.js',
  'src/workbench-rpc.js',
]
const missingPackPaths = requiredPackPaths.filter((path) => !packPaths.includes(path))

const result = {
  generatedAt: new Date().toISOString(),
  command: 'node docs/evidence/week2-audit-2026-08-25/verification/static-contract-scan.mjs',
  scannedFiles: textFiles.length,
  forbiddenMatches: matches,
  hostBusinessStateLeak,
  packEntryCount: packPaths.length,
  disallowedPackPaths,
  missingPackPaths,
  ok: matches.length === 0 && !hostBusinessStateLeak && disallowedPackPaths.length === 0 && missingPackPaths.length === 0,
}

console.log(JSON.stringify(result, null, 2))
if (!result.ok) process.exitCode = 1
