import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [tarballArgument, outputArgument] = process.argv.slice(2)
if (!tarballArgument || !outputArgument) {
  console.error('usage: node scripts/audit-week3-closure.mjs <package.tgz> <report.json>')
  process.exit(2)
}

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const tarballPath = resolve(projectRoot, tarballArgument)
const outputPath = resolve(projectRoot, outputArgument)
const tarball = await readFile(tarballPath)

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function runTar(args) {
  const result = spawnSync('tar.exe', args, {
    cwd: projectRoot,
    encoding: null,
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
  })
  if (result.status !== 0) {
    throw new Error(`tar.exe ${args[0]} failed: ${result.stderr?.toString('utf8') ?? ''}`)
  }
  return result.stdout
}

const entries = runTar(['-tf', tarballPath])
  .toString('utf8')
  .split(/\r?\n/)
  .map((value) => value.trim())
  .filter(Boolean)
  .sort()

const findings = []
const checks = []
function check(id, condition, details) {
  checks.push({ id, passed: Boolean(condition), details })
  if (!condition) findings.push({ severity: 'P1', id, details })
}

check('package-root-allowlist', entries.every((entry) => (
  entry === 'package/package.json'
  || entry === 'package/cordis.patch.yml'
  || entry.startsWith('package/src/')
  || entry.startsWith('package/lib/')
)), entries.filter((entry) => !(
  entry === 'package/package.json'
  || entry === 'package/cordis.patch.yml'
  || entry.startsWith('package/src/')
  || entry.startsWith('package/lib/')
)))

const deniedEntryPattern = /(?:^|\/)(?:test|tests|fixtures|docs|evidence|\.dsh)(?:\/|$)|(?:^|\/)\.env(?:\.|$)/i
check('no-private-or-test-entries', !entries.some((entry) => deniedEntryPattern.test(entry)),
  entries.filter((entry) => deniedEntryPattern.test(entry)))
check('required-package-contract', [
  'package/package.json',
  'package/cordis.patch.yml',
  'package/lib/client.js',
  'package/src/index.js',
].every((entry) => entries.includes(entry)), entries)

const manifest = []
const textByEntry = new Map()
for (const entry of entries) {
  const bytes = runTar(['-xOf', tarballPath, entry])
  manifest.push({ path: entry, sizeBytes: bytes.byteLength, sha256: sha256(bytes) })
  if (!bytes.includes(0)) textByEntry.set(entry, bytes.toString('utf8'))
}

const allText = [...textByEntry.entries()].map(([entry, value]) => `\n/* ${entry} */\n${value}`).join('')
const sensitivePatterns = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['github-token', /\bgh[pousr]_[A-Za-z0-9]{20,}\b/],
  ['provider-api-key', /\b(?:sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,})\b/],
  ['hardcoded-secret', /\b(?:api[_-]?key|password|client[_-]?secret)\s*[:=]\s*['"][^'"]{8,}['"]/i],
  ['personal-absolute-path', /(?:C:[\\/]Users[\\/]TinaD|D:[\\/]OneDrive[\\/])/i],
  ['fixture-body', /(?:WEEK3-[A-Z-]*DO-NOT-READ|CONFIDENTIAL-SENTINEL|Local persistence marker)/],
]
for (const [id, pattern] of sensitivePatterns) {
  check(`content-${id}`, !pattern.test(allText), pattern.source)
}

const sourceText = [...textByEntry.entries()]
  .filter(([entry]) => entry.startsWith('package/src/'))
  .map(([entry, value]) => `\n/* ${entry} */\n${value}`)
  .join('')
const zeroOccurrencePolicies = [
  ['host-owned-persistence-only', /\b(?:localStorage|sessionStorage|indexedDB)\b/],
  ['no-html-injection', /dangerouslySetInnerHTML|\.innerHTML\s*=/],
  ['no-excluded-business-scope', /\b(?:dify|billing|pricing|payment)\b|收费|计费/i],
  ['no-network-listener', /\b0\.0\.0\.0\b|\bcreateServer\s*\(|\bserver\.listen\s*\(/],
  ['no-recursive-delete', /\brm\s*\([^)]*recursive\s*:\s*true/s],
]
for (const [id, pattern] of zeroOccurrencePolicies) {
  check(id, !pattern.test(sourceText), pattern.source)
}

const packageJson = JSON.parse(textByEntry.get('package/package.json'))
check('no-install-lifecycle-script', !['preinstall', 'install', 'postinstall', 'prepare'].some((name) => name in (packageJson.scripts ?? {})),
  Object.keys(packageJson.scripts ?? {}))
check('package-files-explicit', JSON.stringify(packageJson.files) === JSON.stringify(['src', 'lib', 'cordis.patch.yml']), packageJson.files)
check('package-private', packageJson.private === true, packageJson.private)

const report = {
  generatedAt: new Date().toISOString(),
  command: `node scripts/audit-week3-closure.mjs ${tarballArgument} ${outputArgument}`,
  scope: 'STATIC_PACKAGE_ONLY',
  semanticProof: false,
  limitations: [
    'Does not prove path traversal, reparse-point, TOCTOU, concurrency, or runtime no-overwrite behavior.',
    'Does not prove Domain persistence, migration, recovery, or state consistency.',
    'Does not prove DSH Host or browser integration behavior.',
    'Does not prove technical, patent, legal, or other professional content quality.',
  ],
  tarball: {
    path: tarballArgument.replaceAll('\\', '/'),
    sizeBytes: tarball.byteLength,
    sha256: sha256(tarball),
    entryCount: entries.length,
  },
  checks,
  findings,
  manifest,
  result: findings.length === 0 ? 'CLEAN' : 'FINDINGS',
}
await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(`week-3 static package audit ${report.result}; entries=${entries.length}; findings=${findings.length}`)
if (findings.length > 0) process.exitCode = 1
