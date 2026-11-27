import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { freezeV340 } from './v340-catalog.js'

export const M06_BUSINESS_RESOURCE_SHA256 = 'ef01f5cb9b6f99b9b6ee39b8619fe0a56d1accc6b0a0d099e4d15bcdc4b5b7e7'
const producer = 'a76dfe99c9e9a6616bfd65da6ac368b014bcccfc16581e773c36a1eda84fd6b8'
const paths = ['SKILL.md', 'THIRD-PARTY-NOTICE.md', 'references/01-official-basis.md',
  'references/02-n01-feature-and-independent-claim.md', 'references/03-n02-claim-graph-and-fallback.md',
  'references/04-n03-support-terms-parameters.md', 'references/05-source-and-output-contract.md', 'references/output-schema.json']
const hash = value => createHash('sha256').update(value).digest('hex')
const unavailable = () => Object.assign(new Error('M06 候选资源不可用；未开始生成。'), { code: 'M06_BUSINESS_RESOURCE_UNAVAILABLE' })

// A trusted, fixed Host resource. No business-selected path, native Skill or resource discovery.
export function verifyM06BusinessResources(bytes) {
  try {
    if (hash(bytes) !== M06_BUSINESS_RESOURCE_SHA256) throw unavailable()
    const bundle = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (bundle.schemaVersion !== 1 || bundle.skillId !== 'm06-claims-draft' || bundle.skillVersion !== '0.1.2'
      || bundle.frontmatterVersion !== '0.1.2-candidate' || bundle.candidateOnly !== true
      || bundle.nodeId !== 'Flow-2-6' || bundle.businessVersion !== 'V3.4.0'
      || bundle.producerManifestSHA256 !== producer || bundle.resources.length !== paths.length) throw unavailable()
    for (const [index, resource] of bundle.resources.entries()) {
      if (resource.path !== paths[index] || typeof resource.content !== 'string'
        || Buffer.byteLength(resource.content, 'utf8') !== resource.bytes || hash(resource.content) !== resource.sha256) throw unavailable()
    }
    return freezeV340(bundle)
  } catch { throw unavailable() }
}

// Read only on explicit M06 composition; historical v1/v2 loading never needs this bundle.
export function loadM06BusinessInstruction() {
  try {
    const bundle = verifyM06BusinessResources(readFileSync(new URL('./m06-business-candidate-0.1.2.json', import.meta.url)))
    const body = bundle.resources.map(resource => `## Fixed M06 resource: ${resource.path}\n\n${resource.content}`).join('\n\n')
    if (!body.trim() || body.length > 300000) throw unavailable()
    return freezeV340({ nodeId: bundle.nodeId, version: bundle.businessVersion, body, sha256: hash(body),
      provenance: { skillId: bundle.skillId, skillVersion: bundle.skillVersion, frontmatterVersion: bundle.frontmatterVersion,
        candidateOnly: true, producerManifestSHA256: producer, businessResourceSHA256: M06_BUSINESS_RESOURCE_SHA256,
        resources: bundle.resources.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })) } })
  } catch { throw unavailable() }
}
