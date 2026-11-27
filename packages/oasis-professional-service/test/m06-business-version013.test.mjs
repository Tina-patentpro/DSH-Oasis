import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { setupNative, Assembler, MODEL_OUTPUT, NOW } from './helpers/v340-native-harness.mjs'
import * as api from '../src/v340-native-model.js'
import { createV340RuntimeService } from '../src/v340-runtime-service.js'
import { prepareV340Inputs, assembleV340Document } from '../src/v340-document.js'
import { parseStoredWorkbenchRecord } from '../src/workbench-domain.js'
const url = new URL('../src/m06-business-resources-0.1.3.js', import.meta.url)
const resource = await import(url).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url === url.href) return {}
  throw error
})
const hash = value => createHash('sha256').update(value).digest('hex')
const manifest = '7ec58d41d870b122f763657ab983ad0a45d9f266a466983775b8d066dc8c63b9'
const oldRecordUrl = new URL('./fixtures/m06-native-012-record.json', import.meta.url)
function require013() {
  assert.equal(typeof resource.loadM06BusinessInstruction013, 'function', 'fixed 0.1.3 resource loader is unavailable')
  assert.equal(typeof api.createM06BusinessNativeCandidate013, 'function', 'explicit 0.1.3 composition is unavailable')
}
test('0.1.3 keeps eight generation resources exact and carries qualifications outside the model body', async () => {
  require013()
  const bytes = await readFile(new URL('../src/m06-business-candidate-0.1.3.json', import.meta.url))
  const bundle = resource.verifyM06BusinessResources013(bytes), loaded = resource.loadM06BusinessInstruction013()
  assert.equal(bundle.producerManifestSHA256, manifest)
  assert.equal(bundle.resources.length, 8)
  assert.equal(bundle.resources.reduce((s, r) => s + r.bytes, 0), 161209)
  assert.equal(bundle.qualifications.length, 2)
  for (const item of [...bundle.resources, ...bundle.qualifications]) {
    assert.equal(item.bytes, Buffer.byteLength(item.content)); assert.equal(item.sha256, hash(item.content))
  }
  for (const item of bundle.resources) assert.ok(loaded.body.includes(item.content), item.path)
  for (const item of bundle.qualifications) assert.equal(loaded.body.includes(item.content), false, item.path)
  assert.equal(loaded.provenance.businessResourceSHA256, hash(bytes))
  assert.equal(loaded.provenance.producerManifestSHA256, manifest)
  assert.equal(loaded.provenance.skillVersion, '0.1.3')
  assert.ok(loaded.body.length < 300000)
  const bad = Buffer.from(bytes); bad[bad.length - 1] ^= 1
  assert.throws(() => resource.verifyM06BusinessResources013(bad), error => error.code === 'M06_BUSINESS_RESOURCE_UNAVAILABLE')
})
test('0.1.2 confirmation cannot authorize the eight-channel 0.1.3 composition; fresh confirmation dispatches once', async t => {
  require013()
  const h = await setupNative(t); await h.service.closeV340Runtime()
  const native = { BlockAssembler: Assembler, createUserMessage: v => ({ role: 'user', ...v }) }
  const executor = api.createM06BusinessNativeCandidate013({ ctx: h.ctx, native, timeoutMs: 500 })
  const prior = api.createM06BusinessNativeCandidate({ ctx: h.ctx, native, timeoutMs: 500 })
  const service = createV340RuntimeService({ repository: h.repository, preparation: h.preparation, executor, clock: () => NOW })
  try {
    const parent = assembleV340Document({ nodeId: 'Flow-1-5', workflowRunUid: '61616161-6161-4161-8161-616161616161', generatedAt: NOW,
      prepared: prepareV340Inputs('Flow-1-5', { technical_disclosure_text: '公开自编机械导向材料。' }), output: MODEL_OUTPUT })
    const files = { [parent.fileName]: parent.body, 'disclosure.md': '公开自编：底座设导向槽，滑块沿槽移动。',
      'drawing.txt': '文字附图说明，非实际图片。', 'requirements.md': '装置草稿，保留未知。' }
    for (const [name, body] of Object.entries(files)) await writeFile(join(h.root, name), body, { flag: 'wx' })
    const draft = { source: 'local-skill', configuration: {}, filePaths: { upstream_md_file: parent.fileName,
      disclosure_file: 'disclosure.md', drawings_file: 'drawing.txt', claim_requirements_file: 'requirements.md' },
      textInputs: { disclosure_text: '公开文字补充：锁止件保持滑块位置。', drawings_text: '仅文字关系，无图像核查。',
        claim_requirements_text: '保留范围和支持缺项。', user_input: '只按本轮公开材料，不作确认。' } }
    await service.updateV340Draft(h.command({ draft }))
    const { prepared } = await h.preparation.prepareV340({ workspaceId: 'w', nodeId: 'Flow-2-6', confirmed: true,
      filePaths: draft.filePaths, textInputs: draft.textInputs, configuration: {} })
    const command = { workspaceId: 'w', taskId: 't', sessionId: 's', expectedRevision: h.repository.get('w').revision, prepared }
    const old = await prior.prepareConfirmation(command), current = await executor.prepareConfirmation(command)
    assert.notEqual(old.sha256, current.sha256)
    let rejected
    await assert.rejects(() => service.createV340Run(h.command({ requestKey: 'old-confirmation-for-013',
      candidate: { sessionId: 's', confirmed: true, sha256: old.sha256 } })),
      error => { rejected = { name: error.name, message: error.message }; assert.match(error.message, /V340_NATIVE_CANDIDATE_INVALID/); return true })
    assert.equal(h.seen.prepare, 0); assert.equal(h.task().runOrder.length, 0)
    await service.createV340Run(h.command({ requestKey: 'new-013', candidate: { sessionId: 's', confirmed: true, sha256: current.sha256 } }))
    const run = await h.settle(); assert.equal(run.status, 'completed')
    assert.equal(run.nativeCandidate.businessSkillVersion, '0.1.3')
    assert.equal(run.nativeCandidate.businessManifestSHA256, manifest)
    assert.equal(run.nativeCandidate.businessResourceSHA256, resource.M06_BUSINESS_013_RESOURCE_SHA256)
    assert.equal(run.nativeCandidate.systemSHA256, hash(h.seen.options.system))
    const text = h.seen.options.messages[0].content[0].text, request = JSON.parse(text)
    assert.equal(Object.keys(request.values).length, 8); assert.equal(Object.keys(request.receipts).length, 8)
    for (const [id, receipt] of Object.entries(request.receipts)) {
      assert.equal(receipt.status, 'accepted', id)
      assert.equal(receipt.sha256, hash(id.endsWith('_file') ? files[draft.filePaths[id]] : draft.textInputs[id]), id)
    }
    assert.equal(h.seen.prepare, 1); assert.equal(h.seen.stream, 1)
    // A valid v3 receipt for another business version is not authorization to use the old system body.
    const wrongVersionResult = await prior.generate({ candidateRun: { ...structuredClone(run), status: 'prepared' },
      runId: run.runId, workspaceId: run.workspaceId, taskId: run.taskId, nodeId: run.nodeId,
      source: run.source, workflowRunUid: run.workflowRunUid, prepared, signal: new AbortController().signal })
    assert.deepEqual(wrongVersionResult, { status: 'failed', code: 'INVALID_INPUT' })
    assert.equal(h.seen.prepare, 1); assert.equal(h.seen.stream, 1)
    parseStoredWorkbenchRecord('w', structuredClone(h.repository.get('w')))
    await service.createV340Run(h.command({ requestKey: 'new-013', candidate: { sessionId: 's', confirmed: true, sha256: current.sha256 } }))
    assert.equal(h.seen.stream, 1)
    if (process.env.OASIS_M06_013_EVIDENCE_DIRECTORY) await writeFile(join(process.env.OASIS_M06_013_EVIDENCE_DIRECTORY, 'actual-013-seam.json'),
      JSON.stringify({ phase: 'PUBLIC_SYNTHETIC_CONFIGURED_FAKE_NATIVE', oldConfirmation: old, currentConfirmation: current,
        rejected, wrongVersionResult, negativeBeforeControlCounts: { prepare: 0, stream: 0 }, finalCounts: { prepare: h.seen.prepare, stream: h.seen.stream },
        prepared, actualSystem: h.seen.options.system, actualRequest: text, record: h.repository.get('w'),
        instruction: resource.loadM06BusinessInstruction013() }, null, 2) + '\n', { flag: 'wx' })
  } finally { await service.closeV340Runtime() }
})
test('the already frozen 0.1.2 v3 record remains readable with its original resource and system hashes', async () => {
  const old = JSON.parse(await readFile(oldRecordUrl, 'utf8')).record
  const before = JSON.stringify(old)
  parseStoredWorkbenchRecord(old.workspaceId, old)
  assert.equal(JSON.stringify(old), before)
  const run = Object.values(old.tasks.t.v340.runs)[0]
  assert.equal(run.nativeCandidate.businessSkillVersion, '0.1.2')
  assert.equal(run.nativeCandidate.systemSHA256, 'd3d69530111925d8b42cda4d165dc74ebdbd813659c5ff7880938623f1c0de2c')
})

test('the selected GitHub suite binds a different confirmation and dispatches its pinned claim resources once', async t => {
  const h = await setupNative(t); await h.service.closeV340Runtime()
  let suite = 'oasis'
  const executor = api.createM06BusinessNativeCandidate013({
    ctx: h.ctx, native: { BlockAssembler: Assembler, createUserMessage: v => ({ role: 'user', ...v }) },
    getLocalSkillSuite: () => suite,
  })
  const service = createV340RuntimeService({ repository: h.repository, preparation: h.preparation, executor, clock: () => NOW })
  try {
    const command = h.command({ sessionId: 's', confirmed: true })
    const oasis = await service.prepareV340CandidateConfirmation(command)
    assert.equal(oasis.businessSkillId, 'm06-claims-draft')
    suite = 'patent-disclosure'
    const external = await service.prepareV340CandidateConfirmation(command)
    assert.equal(external.businessSkillId, 'patent-disclosure-claims')
    assert.equal(external.businessSkillVersion, 'b4bbec6f0a1c3c32a904faabeb249639c0b30d98')
    assert.notEqual(external.sha256, oasis.sha256)
    const create = preview => service.createV340Run(h.command({ requestKey: 'claims-source-switch',
      candidate: { sessionId: 's', confirmed: true, sha256: preview.sha256 } }))
    await assert.rejects(create(oasis))
    assert.equal(h.seen.prepare, 0)
    await create(external)
    suite = 'oasis'
    const run = await h.settle()
    assert.equal(run.status, 'completed')
    assert.equal(run.nativeCandidate.businessSkillId, 'patent-disclosure-claims')
    assert.equal(run.nativeCandidate.systemSHA256, hash(h.seen.options.system))
    assert.match(h.seen.options.system, /先有 .application_plan.yaml. 的 .claim_tree./)
    assert.match(h.seen.options.system, /不要.*重新自行判断必要性/)
    assert.equal(h.seen.stream, 1)
    parseStoredWorkbenchRecord('w', structuredClone(h.repository.get('w')))
  } finally { await service.closeV340Runtime() }
})
