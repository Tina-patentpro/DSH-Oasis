import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { freezeV340 } from './v340-catalog.js'

// Independent distribution identity. Historical 0.1.2/0.1.3 pins are untouched.
export const M06_PUBLIC_RESOURCE_SHA256 = 'e06aa1523338af87b255cbdcb428ae7e693765791820dedc94f69a26ddc37f1d'
export const M06_PUBLIC_MANIFEST_SHA256 = '254a685fe95c9063be7232cb8dcb25333c1864ed9a5e670c0f62a04af3f3ccd4'
const hash = value => createHash('sha256').update(value).digest('hex')
const unavailable = () => Object.assign(new Error('M06 公开发行候选资源不可用；未开始生成。'), { code: 'M06_BUSINESS_RESOURCE_UNAVAILABLE' })

export function verifyM06PublicResources(bytes) {
  try {
    if (hash(bytes) !== M06_PUBLIC_RESOURCE_SHA256) throw unavailable()
    const rawManifest = readFileSync(new URL('./m06-public-manifest-r1.json', import.meta.url))
    if (hash(rawManifest) !== M06_PUBLIC_MANIFEST_SHA256) throw unavailable()
    const manifest = JSON.parse(rawManifest)
    const bundle = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    if (bundle.schemaVersion !== 1 || bundle.resourceVersion !== '0.1.3-public.1'
      || bundle.skillId !== 'm06-claims-draft' || bundle.skillVersion !== '0.1.3'
      || bundle.frontmatterVersion !== '0.1.3-candidate' || bundle.candidateOnly !== true
      || bundle.nodeId !== 'Flow-2-6' || bundle.businessVersion !== 'V3.4.0'
      || bundle.producerManifestSHA256 !== M06_PUBLIC_MANIFEST_SHA256
      || bundle.resources.length !== 8 || bundle.qualifications.length !== 2
      || manifest.resourceVersion !== bundle.resourceVersion || manifest.resources.length !== 10) throw unavailable()
    for (const [index, item] of [...bundle.resources, ...bundle.qualifications].entries()) {
      const pin = manifest.resources[index]
      if (item.path !== pin.path || item.role !== pin.role || item.bytes !== pin.bytes || item.sha256 !== pin.sha256
        || typeof item.content !== 'string' || Buffer.byteLength(item.content) !== pin.bytes
        || hash(item.content) !== pin.sha256
        || item.role !== (index < 8 ? 'generation' : 'operator-only-not-generation')) throw unavailable()
    }
    return freezeV340(bundle)
  } catch { throw unavailable() }
}

export function loadM06PublicInstruction() {
  try {
    const bundle = verifyM06PublicResources(readFileSync(new URL('./m06-business-public-r1.json', import.meta.url)))
    const body = bundle.resources.map(item => `## Fixed M06 resource: ${item.path}\n\n${item.content}`).join('\n\n')
    if (!body.trim() || body.length > 300000) throw unavailable()
    return freezeV340({ nodeId: bundle.nodeId, version: bundle.businessVersion, body, sha256: hash(body),
      provenance: { skillId: bundle.skillId, skillVersion: bundle.skillVersion, frontmatterVersion: bundle.frontmatterVersion,
        resourceVersion: bundle.resourceVersion, candidateOnly: true,
        producerManifestSHA256: M06_PUBLIC_MANIFEST_SHA256, businessResourceSHA256: M06_PUBLIC_RESOURCE_SHA256,
        resources: bundle.resources.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })),
        qualifications: bundle.qualifications.map(({ path, bytes, sha256, role }) => ({ path, bytes, sha256, role })) } })
  } catch { throw unavailable() }
}
