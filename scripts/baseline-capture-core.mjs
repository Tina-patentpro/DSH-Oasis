import { createHash } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, readlink, realpath, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'

export const LINK_POLICY = 'lstat plus readlink target text; link targets are not traversed'

export function sha256(data) {
  return createHash('sha256').update(data).digest('hex').toUpperCase()
}

function portable(path) {
  return path.replaceAll('/', '\\')
}

function canonicalRows(rows) {
  return JSON.stringify(rows.map(({ path, kind, size, sha256: digest, target = '' }) => ({
    path,
    kind,
    size,
    sha256: digest,
    target,
  })))
}

export async function collectTree(root, base = root, rows = []) {
  const info = await lstat(root)
  const path = portable(relative(base, root) || '.')
  if (info.isSymbolicLink()) {
    const target = await readlink(root)
    rows.push({ path, kind: 'link', size: info.size, sha256: sha256(target), target })
  } else if (info.isDirectory()) {
    const names = await readdir(root)
    names.sort((a, b) => a.localeCompare(b, 'en'))
    for (const name of names) await collectTree(join(root, name), base, rows)
  } else if (info.isFile()) {
    const data = await readFile(root)
    rows.push({ path, kind: 'file', size: info.size, sha256: sha256(data), target: '' })
  }
  rows.sort((a, b) => a.path.localeCompare(b.path, 'en'))
  return rows
}

export async function writeBaselineTsv(path, rows) {
  const header = 'SHA256\tLength\tKind\tPath\tLinkTarget\n'
  const body = rows.map((row) => [
    row.sha256,
    row.size,
    row.kind,
    row.path,
    row.target ?? '',
  ].join('\t')).join('\n')
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${header}${body}${body ? '\n' : ''}`, 'utf8')
}

export async function captureFilesystemBaseline({
  projectRoot,
  profileRoot,
  outputRoot,
  label,
  productRoots,
  command,
  productHashesStem = 'product-hashes',
  summaryStem = 'summary',
  extraSummary = {},
}) {
  if (!['before', 'after'].includes(label)) throw new Error('baseline label must be before or after')
  if (!Array.isArray(productRoots) || productRoots.length === 0) throw new Error('productRoots must not be empty')
  if (typeof command !== 'string' || command.length === 0) throw new Error('capture command is required')

  const normalizedProjectRoot = resolve(projectRoot)
  const normalizedProfileRoot = resolve(profileRoot)
  const normalizedOutputRoot = resolve(outputRoot)
  const productRows = []
  for (const item of productRoots) {
    productRows.push(...await collectTree(resolve(normalizedProjectRoot, item), normalizedProjectRoot))
  }
  productRows.sort((a, b) => a.path.localeCompare(b.path, 'en'))
  const duplicate = productRows.find((row, index) => index > 0 && row.path === productRows[index - 1].path)
  if (duplicate) throw new Error(`duplicate baseline input path: ${duplicate.path}`)

  const profileRows = await collectTree(normalizedProfileRoot, normalizedProfileRoot)
  const summary = {
    generatedAt: new Date().toISOString(),
    command,
    productRoots,
    productRootsSha256: sha256(JSON.stringify(productRoots)),
    productContentSha256: sha256(canonicalRows(productRows)),
    profileContentSha256: sha256(canonicalRows(profileRows)),
    projectRoot: normalizedProjectRoot,
    profileRoot: normalizedProfileRoot,
    resolvedProfileRoot: await realpath(normalizedProfileRoot),
    productEntries: productRows.length,
    productLinks: productRows.filter((row) => row.kind === 'link').length,
    profileEntries: profileRows.length,
    profileLinks: profileRows.filter((row) => row.kind === 'link').length,
    linkPolicy: LINK_POLICY,
    ...extraSummary,
  }

  await mkdir(normalizedOutputRoot, { recursive: true })
  await writeBaselineTsv(resolve(normalizedOutputRoot, `${productHashesStem}-${label}.tsv`), productRows)
  await writeBaselineTsv(resolve(normalizedOutputRoot, `profile-hashes-${label}.tsv`), profileRows)
  await writeFile(
    resolve(normalizedOutputRoot, `${summaryStem}-${label}.json`),
    `${JSON.stringify(summary, null, 2)}\n`,
    'utf8',
  )

  return { productRows, profileRows, summary }
}

function normalizeAllowedPath(path) {
  return portable(path.trim())
}

export function compareRows(beforeRows, afterRows, allowedPaths = []) {
  const allowedSet = new Set(allowedPaths.map(normalizeAllowedPath))
  const before = new Map(beforeRows.map((row) => [portable(row.path), row]))
  const after = new Map(afterRows.map((row) => [portable(row.path), row]))
  const paths = [...new Set([...before.keys(), ...after.keys()])]
    .sort((a, b) => a.localeCompare(b, 'en'))
  const changes = []

  for (const path of paths) {
    const previous = before.get(path)
    const current = after.get(path)
    if (previous === undefined) {
      changes.push({ path, kind: 'added', before: null, after: current })
    } else if (current === undefined) {
      changes.push({ path, kind: 'removed', before: previous, after: null })
    } else if (canonicalRows([previous]) !== canonicalRows([current])) {
      changes.push({ path, kind: 'modified', before: previous, after: current })
    }
  }

  const allowed = changes.filter((entry) => allowedSet.has(entry.path))
  const unexpected = changes.filter((entry) => !allowedSet.has(entry.path))
  return { ok: unexpected.length === 0, allowed, unexpected, changes }
}

export function parseBaselineTsv(text) {
  const lines = text.trimEnd().split(/\r?\n/)
  if (lines.shift() !== 'SHA256\tLength\tKind\tPath\tLinkTarget') {
    throw new Error('unsupported baseline TSV header')
  }
  return lines.filter(Boolean).map((line) => {
    const [digest, size, kind, path, target = ''] = line.split('\t')
    return { sha256: digest, size: Number(size), kind, path, target }
  })
}
