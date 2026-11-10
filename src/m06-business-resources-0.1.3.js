import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { freezeV340 } from './v340-catalog.js'

export const M06_BUSINESS_013_RESOURCE_SHA256 = '26ec83ae26f26783fb4b56abf7b1ac75081214770d0cefaaf2ca0fd0ec56deca'
const producer = '7ec58d41d870b122f763657ab983ad0a45d9f266a466983775b8d066dc8c63b9'
const paths = ['SKILL.md', 'THIRD-PARTY-NOTICE.md', 'references/01-official-basis.md',
  'references/02-n01-feature-and-independent-claim.md', 'references/03-n02-claim-graph-and-fallback.md',
  'references/04-n03-support-terms-parameters.md', 'references/05-source-and-output-contract.md', 'references/output-schema.json']
const qualificationPins = [
  ['operator/source-audit-R27.md', '28e6a5d4fcce6c40568789940013841acdba187fba808dd388bc8bac36311405'],
  ['operator/history-qualification-R01.json', 'd64461fc51bba766cf1f6175f8af72c017dde74ee2f9a660665038854c371288'],
]
const hash = value => createHash('sha256').update(value).digest('hex')
const unavailable = () => Object.assign(new Error('M06 候选资源不可用；未开始生成。'), { code: 'M06_BUSINESS_RESOURCE_UNAVAILABLE' })

// A second explicitly selected resource, not a replacement or auto-upgrade of 0.1.2.
export function verifyM06BusinessResources013(bytes) {
  try {
    if (hash(bytes) !== M06_BUSINESS_013_RESOURCE_SHA256) throw unavailable()
    const bundle = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (bundle.schemaVersion !== 1 || bundle.skillId !== 'm06-claims-draft' || bundle.skillVersion !== '0.1.3'
      || bundle.frontmatterVersion !== '0.1.3-candidate' || bundle.candidateOnly !== true
      || bundle.nodeId !== 'Flow-2-6' || bundle.businessVersion !== 'V3.4.0'
      || bundle.producerManifestSHA256 !== producer || bundle.resources.length !== paths.length
      || bundle.qualifications.length !== qualificationPins.length) throw unavailable()
    for (const [index, item] of bundle.resources.entries()) if (item.path !== paths[index]) throw unavailable()
    for (const [index, item] of bundle.qualifications.entries()) {
      if (item.path !== qualificationPins[index][0] || item.sha256 !== qualificationPins[index][1]
        || item.role !== 'operator-only-not-generation') throw unavailable()
    }
    for (const item of [...bundle.resources, ...bundle.qualifications]) {
      if (typeof item.content !== 'string' || Buffer.byteLength(item.content, 'utf8') !== item.bytes
        || hash(item.content) !== item.sha256) throw unavailable()
    }
    return freezeV340(bundle)
  } catch { throw unavailable() }
}

export function loadM06BusinessInstruction013() {
  try {
    const bundle = verifyM06BusinessResources013(readFileSync(new URL('./m06-business-candidate-0.1.3.json', import.meta.url)))
    // Source/history qualifications travel with the resource for operators; they are not generation context.
    const body = bundle.resources.map(item => `## Fixed M06 resource: ${item.path}\n\n${item.content}`).join('\n\n')
    if (!body.trim() || body.length > 300000) throw unavailable()
    return freezeV340({ nodeId: bundle.nodeId, version: bundle.businessVersion, body, sha256: hash(body),
      provenance: { skillId: bundle.skillId, skillVersion: bundle.skillVersion, frontmatterVersion: bundle.frontmatterVersion,
        candidateOnly: true, producerManifestSHA256: producer, businessResourceSHA256: M06_BUSINESS_013_RESOURCE_SHA256,
        resources: bundle.resources.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })),
        qualifications: bundle.qualifications.map(({ path, bytes, sha256, role }) => ({ path, bytes, sha256, role })) } })
  } catch { throw unavailable() }
}
