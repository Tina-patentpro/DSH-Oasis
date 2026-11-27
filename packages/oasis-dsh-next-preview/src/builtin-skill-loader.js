import { createHash } from 'node:crypto'
import { lstat, realpath, open } from 'node:fs/promises'
import { isAbsolute, resolve, dirname, join } from 'node:path'
import { z } from 'zod'

const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const sha = z.string().regex(/^[0-9a-f]{64}$/)
const version = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/)
const expectedSchema = z.object({ skillId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(63),
  skillVersion: version, inputSchemaVersion: version, outputSchemaVersion: version, executionContractVersion: version }).strict()
const layout = [
  ['SKILL.md', 'instruction'],
  ['references/drafting-rules.md', 'reference'],
  ['references/special-domain-boundary.md', 'reference'],
  ['assets/claims-output-template.md', 'output-template'],
]
const resourceSchema = z.object({ path: z.string(), role: z.enum(['instruction', 'reference', 'output-template']), sha256: sha }).strict()
const manifestSchema = expectedSchema.extend({ schemaVersion: z.literal(1), resources: z.array(resourceSchema).length(layout.length) }).strict()
const decoder = new TextDecoder('utf-8', { fatal: true })
const normalized = path => process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path)
function requireValue(condition) { if (!condition) throw new Error('invalid resource') }
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

async function rejectRedirects(path) {
  for (let current = path; ; current = dirname(current)) {
    const stat = await lstat(current)
    requireValue(!stat.isSymbolicLink() && normalized(await realpath(current)) === normalized(current))
    if (dirname(current) === current) break
  }
}

async function readBounded(path, limit) {
  await rejectRedirects(path)
  const handle = await open(path, 'r')
  try {
    const stat = await handle.stat()
    requireValue(stat.isFile() && stat.size > 0 && stat.size <= limit)
    const buffer = Buffer.alloc(limit + 1)
    let size = 0
    while (size < buffer.length) {
      const chunk = await handle.read(buffer, size, buffer.length - size, size)
      if (!chunk.bytesRead) break
      size += chunk.bytesRead
    }
    requireValue(size > 0 && size <= limit)
    await rejectRedirects(path)
    return buffer.subarray(0, size)
  } finally { await handle.close() }
}

function skillBody(text, skillId) {
  // Deliberately narrow valid YAML subset; no tags, aliases, includes or executable metadata.
  const match = /^---\nname: ([a-z0-9-]+)\ndescription: ("[^\n]+")\n---\n([\s\S]+)$/.exec(text.replaceAll('\r\n', '\n'))
  requireValue(match && match[1] === skillId)
  const description = JSON.parse(match[2])
  requireValue(typeof description === 'string' && description.trim() && description.length <= 1024 && !/[\r\n\0]/.test(description))
  requireValue(match[3].trim())
  return match[3]
}

// Host-internal only: root, manifest pin and expected contracts must come from trusted composition,
// never a business RPC or the model. Loading grants no execution, filesystem or model authority.
export async function loadBuiltinSkill(options) {
  try {
    const { root, manifestSha256, expected } = options
    requireValue(typeof root === 'string' && isAbsolute(root) && !root.startsWith('\\\\') && !root.startsWith('//'))
    sha.parse(manifestSha256)
    const contracts = expectedSchema.parse(expected)
    const directory = resolve(root)
    await rejectRedirects(directory)
    requireValue((await lstat(directory)).isDirectory())
    const manifestBytes = await readBounded(join(directory, 'manifest.json'), 16384)
    requireValue(hash(manifestBytes) === manifestSha256)
    const manifest = manifestSchema.parse(JSON.parse(decoder.decode(manifestBytes)))
    for (const key of Object.keys(contracts)) requireValue(manifest[key] === contracts[key])
    const sections = []
    let total = 0
    for (let index = 0; index < layout.length; index++) {
      const resource = manifest.resources[index]
      const [path, role] = layout[index]
      requireValue(resource.path === path && resource.role === role)
      const bytes = await readBounded(join(directory, path), 65536)
      total += bytes.length
      requireValue(total <= 131072 && hash(bytes) === resource.sha256)
      let text = decoder.decode(bytes)
      requireValue(text.trim() && !text.includes('\0'))
      if (role === 'instruction') text = skillBody(text, manifest.skillId)
      sections.push(`## ${role === 'output-template' ? 'Output format reference (not executable)' : role}: ${path}\n\n${text}`)
    }
    const body = sections.join('\n\n')
    requireValue(body.length <= 64000)
    return freeze({ instruction: { version: manifest.skillVersion, body },
      provenance: { ...contracts, manifestSha256, assemblySha256: hash(body), resources: manifest.resources } })
  } catch {
    // Never retain a cause or expose parser text, absolute paths, resource bodies or OS errors.
    throw Object.assign(new Error('内置 Skill 资源不可用；未开始生成。'), { code: 'BUILTIN_SKILL_UNAVAILABLE' })
  }
}
