import { mkdtemp, mkdir, writeFile, readFile, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'

export const digest = bytes => createHash('sha256').update(bytes).digest('hex')
export const PUBLIC_MARKERS = ['PUBLIC_4E_MAIN', 'PUBLIC_4E_RULES', 'PUBLIC_4E_DOMAIN', 'PUBLIC_4E_TEMPLATE']
export const contracts = Object.freeze({ inputSchemaVersion: '1', outputSchemaVersion: 'unified-text-1', executionContractVersion: 'single-call-text-1' })

// Independent public fixture, never read authoring resources or user attachments.
export async function publicSkillFixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'oasis-builtin-public-')))
  const content = [
    ['SKILL.md', 'instruction', '---\nname: oasis-patent-claims\ndescription: "Public offline resource-loading test only."\n---\nPUBLIC_4E_MAIN\nUse the supplied public text only. Do not read other files.'],
    ['references/drafting-rules.md', 'reference', 'PUBLIC_4E_RULES\nPublic rule: return the fixed test result.'],
    ['references/special-domain-boundary.md', 'reference', 'PUBLIC_4E_DOMAIN\nNo specialist knowledge is claimed.'],
    ['assets/claims-output-template.md', 'output-template', 'PUBLIC_4E_TEMPLATE\n# Public output\nThe test provider supplies the body.'],
  ]
  for (const [path, , body] of content) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), body, { flag: 'wx' })
  }
  const manifest = { schemaVersion: 1, skillId: 'oasis-patent-claims', skillVersion: 'public-4e-1', ...contracts,
    resources: content.map(([path, role, body]) => ({ path, role, sha256: digest(body) })) }
  async function pin() {
    const bytes = JSON.stringify(manifest, null, 2) + '\n'
    await writeFile(join(root, 'manifest.json'), bytes)
    return { root, manifestSha256: digest(bytes), expected: { skillId: manifest.skillId, skillVersion: manifest.skillVersion, ...contracts } }
  }
  const options = await pin()
  return { root, manifest, options, pin, async change(path, body) {
    await writeFile(join(root, path), body)
    manifest.resources.find(r => r.path === path).sha256 = digest(await readFile(join(root, path)))
  } }
}
