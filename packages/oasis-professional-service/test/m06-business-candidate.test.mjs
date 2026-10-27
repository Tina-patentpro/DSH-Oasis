import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { setupNative, Assembler, MODEL_OUTPUT, NOW } from './helpers/v340-native-harness.mjs'
import * as nativeApi from '../src/v340-native-model.js'
import { createV340RuntimeService } from '../src/v340-runtime-service.js'
import { parseStoredWorkbenchRecord } from '../src/workbench-domain.js'
import { getV340Catalog, loadV340Instruction } from '../src/v340-catalog.js'
import { canonicalJson } from '../src/local-mock-runner.js'
const resourceUrl = new URL('../src/m06-business-resources.js', import.meta.url)
const resources = await import(resourceUrl).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url === resourceUrl.href) return {}
  throw error
})
const hash = value => createHash('sha256').update(value).digest('hex')
async function observe(name, value) {
  if (process.env.OASIS_M06_EVIDENCE_DIRECTORY) await writeFile(join(process.env.OASIS_M06_EVIDENCE_DIRECTORY, name + '.json'),
    JSON.stringify(value, null, 2) + '\n', { flag: 'wx' })
}
const PRODUCER = 'a76dfe99c9e9a6616bfd65da6ac368b014bcccfc16581e773c36a1eda84fd6b8'
const PATHS = ['SKILL.md', 'THIRD-PARTY-NOTICE.md', 'references/01-official-basis.md',
  'references/02-n01-feature-and-independent-claim.md', 'references/03-n02-claim-graph-and-fallback.md',
  'references/04-n03-support-terms-parameters.md', 'references/05-source-and-output-contract.md', 'references/output-schema.json']
function requireBusinessApi() {
  assert.equal(typeof resources.loadM06BusinessInstruction, 'function', 'fixed M06 resources are unavailable')
  assert.equal(typeof nativeApi.createM06BusinessNativeCandidate, 'function', 'explicit M06 consumer is unavailable')
}
async function setupBusiness(t) {
  requireBusinessApi()
  const h = await setupNative(t)
  await h.service.closeV340Runtime()
  const executor = nativeApi.createM06BusinessNativeCandidate({ ctx: h.ctx,
    native: { BlockAssembler: Assembler, createUserMessage: v => ({ role: 'user', ...v }) }, timeoutMs: 200 })
  const service = createV340RuntimeService({ repository: h.repository, preparation: h.preparation, executor, clock: () => NOW })
  const confirm = async () => {
    const draft = h.task().draft
    const { prepared } = await h.preparation.prepareV340({ workspaceId: 'w', nodeId: 'Flow-2-6', confirmed: true,
      textInputs: draft.textInputs, filePaths: draft.filePaths, configuration: draft.configuration })
    return executor.prepareConfirmation({ workspaceId: 'w', taskId: 't', sessionId: 's',
      expectedRevision: h.repository.get('w').revision, prepared })
  }
  const create = async (key, confirmation) => service.createV340Run(h.command({ requestKey: key,
    candidate: confirmation ?? { sessionId: 's', confirmed: true, sha256: (await confirm()).sha256 } }))
  return { h, executor, service, confirm, create }
}
test('M06 fixed eight resources retain exact provider bytes and a distinct immutable provenance', async () => {
  requireBusinessApi()
  const bytes = await readFile(new URL('../src/m06-business-candidate-0.1.2.json', import.meta.url))
  const bundle = resources.verifyM06BusinessResources(bytes)
  assert.equal(hash(bytes), resources.M06_BUSINESS_RESOURCE_SHA256)
  assert.equal(bundle.producerManifestSHA256, PRODUCER)
  assert.equal(bundle.skillVersion, '0.1.2')
  assert.deepEqual(bundle.resources.map(r => r.path), PATHS)
  assert.equal(bundle.resources.reduce((sum, r) => sum + r.bytes, 0), 151313)
  for (const resource of bundle.resources) {
    assert.equal(Buffer.byteLength(resource.content), resource.bytes)
    assert.equal(hash(resource.content), resource.sha256)
  }
  const loaded = resources.loadM06BusinessInstruction()
  assert.equal(loaded.provenance.producerManifestSHA256, PRODUCER)
  assert.equal(loaded.provenance.businessResourceSHA256, hash(bytes))
  assert.equal(loaded.sha256, hash(loaded.body))
  assert.ok(Object.isFrozen(loaded) && Object.isFrozen(loaded.provenance))
  for (const resource of bundle.resources) assert.ok(loaded.body.includes(resource.content), resource.path)
  assert.ok(loaded.body.length < 300000)
})
test('M06 rejects changed, incomplete and extra resource bundles without accepting a new pin', async () => {
  requireBusinessApi()
  const bytes = await readFile(new URL('../src/m06-business-candidate-0.1.2.json', import.meta.url))
  for (const mutate of [
    b => { b.resources[0].content += 'altered' },
    b => { b.resources.pop() },
    b => { b.resources.push({ ...b.resources[0], path: 'extra.md' }) },
    b => { b.skillVersion = '0.1.3' },
  ]) {
    const bad = JSON.parse(bytes); mutate(bad)
    assert.throws(() => resources.verifyM06BusinessResources(Buffer.from(JSON.stringify(bad))),
      error => error.code === 'M06_BUSINESS_RESOURCE_UNAVAILABLE' && !/SKILL|altered|extra\.md/.test(error.message))
  }
})
test('M06 actual injected seam uses new resources once and persists their identity separately from the old catalogue', async t => {
  const b = await setupBusiness(t), { h } = b
  try {
    await b.create('m06-business-one'); const run = await h.settle()
    assert.equal(run.status, 'completed')
    assert.equal(run.nativeCandidate.version, 'v340-native-candidate-3')
    assert.equal(run.nativeCandidate.businessSkillVersion, '0.1.2')
    assert.equal(run.nativeCandidate.businessManifestSHA256, PRODUCER)
    assert.equal(run.nativeCandidate.businessResourceSHA256, resources.M06_BUSINESS_RESOURCE_SHA256)
    assert.equal(run.inputSnapshot.resourceSHA256, getV340Catalog().resourceSHA256)
    assert.equal(run.nativeCandidate.resourceSHA256, getV340Catalog().resourceSHA256)
    assert.equal(run.nativeCandidate.instructionSHA256, resources.loadM06BusinessInstruction().sha256)
    assert.equal(run.nativeCandidate.systemSHA256, hash(h.seen.options.system))
    assert.ok(h.seen.options.system.includes(resources.loadM06BusinessInstruction().body))
    assert.ok(h.seen.options.system.length <= 300000)
    assert.equal(h.seen.options.tools, undefined)
    assert.equal(h.seen.prepare, 1); assert.equal(h.seen.stream, 1)
    assert.deepEqual(run.nativeCandidate.budget, { maxCalls: 1, usedCalls: 1 })
    assert.equal(run.nativeCandidate.realCallVerified, false)
    const payload = JSON.parse(h.seen.options.messages[0].content[0].text)
    assert.equal(payload.values.disclosure_text, h.task().draft.textInputs.disclosure_text)
    assert.equal(run.nativeCandidate.requestSHA256, hash(h.seen.options.messages[0].content[0].text))
    assert.deepEqual(Object.keys(MODEL_OUTPUT).sort(), ['summary', 'core_result_markdown', 'updates', 'tables', 'terms_master', 'warnings', 'model_completions'].sort())
    const unchanged = JSON.stringify(h.repository.get('w'))
    parseStoredWorkbenchRecord('w', JSON.parse(unchanged))
    assert.equal(JSON.stringify(h.repository.get('w')), unchanged)
    await b.create('m06-business-one'); assert.equal(h.seen.stream, 1)
    await observe('actual-business-seam', { phase: 'PUBLIC_SYNTHETIC_CONFIGURED_FAKE_NATIVE_NOT_REAL_PROVIDER',
      preparedCalls: h.seen.prepare, streamCalls: h.seen.stream, instruction: resources.loadM06BusinessInstruction(),
      actualSystem: h.seen.options.system, actualRequest: h.seen.options.messages[0].content[0].text,
      record: h.repository.get('w'), defaultCatalogue: getV340Catalog() })
  } finally { await b.service.closeV340Runtime() }
})
test('an old confirmation cannot authorize M06 business resources and no native call begins', async t => {
  const b = await setupBusiness(t), { h } = b
  try {
    const old = await h.confirm()
    const current = await b.confirm(); assert.notEqual(old.sha256, current.sha256)
    let rejected
    await assert.rejects(() => b.create('old-confirmation', { sessionId: 's', confirmed: true, sha256: old.sha256 }),
      error => { rejected = { name: error.name, message: error.message }; return true })
    assert.equal(h.seen.prepare, 0); assert.equal(h.seen.stream, 0)
    assert.equal(h.task().runOrder.length, 0)
    await observe('old-confirmation-rejection', { old, current, rejected, preparedCalls: h.seen.prepare,
      streamCalls: h.seen.stream, runOrder: h.task().runOrder })
  } finally { await b.service.closeV340Runtime() }
})
test('M06 business identity tampering is rejected during persisted-record validation', async t => {
  const b = await setupBusiness(t), { h } = b
  try {
    await b.create('identity-control'); await h.settle()
    for (const field of ['businessResourceSHA256', 'businessManifestSHA256', 'instructionSHA256', 'systemSHA256']) {
      const record = structuredClone(h.repository.get('w'))
      const candidate = record.tasks.t.v340.runs[h.run().runId].nativeCandidate
      candidate[field] = 'f'.repeat(64)
      const { admissionSHA256, ...data } = candidate
      candidate.admissionSHA256 = hash(canonicalJson(data))
      assert.throws(() => parseStoredWorkbenchRecord('w', record), field)
    }
    assert.equal(h.seen.stream, 1)
  } finally { await b.service.closeV340Runtime() }
})
test('M06 addition leaves historical v1 records, default v2 instruction identity and disabled sources intact', async t => {
  requireBusinessApi()
  for (const name of ['prepared', 'completed']) {
    const raw = JSON.parse(await readFile(new URL(`./fixtures/v340-native-candidate-v1/${name}.json`, import.meta.url), 'utf8'))
    parseStoredWorkbenchRecord(raw.workspaceId, raw)
  }
  const h = await setupNative(t)
  await h.create('unchanged-v2'); const run = await h.settle()
  assert.equal(run.nativeCandidate.version, 'v340-native-candidate-2')
  assert.equal(run.nativeCandidate.instructionSHA256, (await loadV340Instruction('Flow-2-6')).sha256)
  assert.equal(Object.hasOwn(run.nativeCandidate, 'businessResourceSHA256'), false)
  assert.equal(getV340Catalog().dispatchEnabled, false)
  const originalInstructions = []
  for (const node of getV340Catalog().nodes) {
    const instruction = await loadV340Instruction(node.nodeId)
    originalInstructions.push({ nodeId: node.nodeId, sha256: instruction.sha256, resourceSHA256: instruction.resourceSHA256 })
    assert.equal(node.sources['local-skill'].enabled, false)
    assert.equal(node.sources['oasis-api'].enabled, false)
  }
  await observe('legacy-compatibility', { phase: 'PUBLIC_SYNTHETIC_DEFAULT_V2',
    originalInstructions, defaultRun: run, preparedCalls: h.seen.prepare, streamCalls: h.seen.stream })
})
