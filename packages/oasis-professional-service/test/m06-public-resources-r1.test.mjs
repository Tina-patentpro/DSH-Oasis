import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const url = new URL('../src/m06-public-resources-r1.js', import.meta.url)
const api = await import(url).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url === url.href) return {}
  throw error
})
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const requireLoader = () => assert.equal(typeof api.loadM06PublicInstruction, 'function', 'public distribution resource loader is missing')

// Catches operator text leaking into the system body, stale resource identity,
// or a public resource accidentally resolving an excluded source container.
test('public resources load the approved portable bodies with operator qualifications outside generation', () => {
  requireLoader()
  const loaded = api.loadM06PublicInstruction()
  const bytes = readFileSync(new URL('../src/m06-business-public-r1.json', import.meta.url))
  const bundle = api.verifyM06PublicResources(bytes)
  assert.equal(bundle.resourceVersion, '0.1.3-public.1')
  assert.equal(bundle.resources.length, 8)
  assert.equal(bundle.qualifications.length, 2)
  for (const item of bundle.resources) assert.ok(loaded.body.includes(item.content), item.path)
  for (const item of bundle.qualifications) {
    assert.equal(item.role, 'operator-only-not-generation')
    assert.equal(loaded.body.includes(item.content), false, item.path)
  }
  assert.doesNotMatch(loaded.body, /\/Users\/|\/Volumes\//)
  assert.equal(loaded.provenance.businessResourceSHA256, hash(bytes))
  assert.notEqual(loaded.provenance.businessResourceSHA256, '26ec83ae26f26783fb4b56abf7b1ac75081214770d0cefaaf2ca0fd0ec56deca')
  assert.equal(loaded.provenance.resourceVersion, '0.1.3-public.1')
  assert.ok(Object.isFrozen(bundle) && Object.isFrozen(bundle.qualifications))
})

// Catches accepting a changed body/operator record or an old internal bundle
// under the new distribution's identity.
test('public loader rejects tampering and the old internal container without fallback', () => {
  requireLoader()
  const bytes = readFileSync(new URL('../src/m06-business-public-r1.json', import.meta.url))
  const tampered = JSON.parse(bytes)
  tampered.resources[0].content += '\nchanged'
  assert.throws(() => api.verifyM06PublicResources(Buffer.from(JSON.stringify(tampered))), { code: 'M06_BUSINESS_RESOURCE_UNAVAILABLE' })
  assert.throws(() => api.verifyM06PublicResources(Buffer.from('{}')), { code: 'M06_BUSINESS_RESOURCE_UNAVAILABLE' })
  // No old container is required in the public archive.
  const old = new URL('../src/m06-business-candidate-0.1.3.json', import.meta.url)
  if (process.env.OASIS_PUBLIC_ARCHIVE !== '1') {
    assert.throws(() => api.verifyM06PublicResources(readFileSync(old)), { code: 'M06_BUSINESS_RESOURCE_UNAVAILABLE' })
  }
})
