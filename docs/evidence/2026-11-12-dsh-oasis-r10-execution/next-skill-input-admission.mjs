import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(process.argv[2])
const baseline = join(root, 'docs/evidence/2026-11-12-dsh-skill-test-prep')
const inputs = join(baseline, 'inputs')
const candidate = join(root, '.local/dsh-next-field-diagnostics-20261112/package')
const upstream = join(root, '.local/skill-upstream-20261112.sav788fm')
const read = async p => JSON.parse(await readFile(p, 'utf8'))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const { createV340PreparationService } = await import(pathToFileURL(join(candidate, 'src/v340-preparation.js')))
const { createWorkspaceMaterialManager } = await import(pathToFileURL(join(candidate, 'src/workspace-materials.js')))
const cases = await read(join(baseline, 'cases.json'))
const manifest = await read(join(baseline, 'prepared-manifest.json'))
const m05 = await read(join(root, 'docs/evidence/2026-11-12-dsh-oasis-r10-execution/m05-observe.json'))
assert.equal(sha(await readFile(join(baseline, 'cases.json'))), manifest.casesSha256)
const workspaceId = 'r10-preparation-fixture'
const handoffWorkspaceId = 'r10-m05-m06-handoff'
const preparation = createV340PreparationService({
  materialManager: createWorkspaceMaterialManager({ workspaceRegistry: {
    get(id) {
      const path = id === workspaceId ? inputs : id === handoffWorkspaceId ? m05.workspace : null
      return path ? { id, path, async status() { return 'ok' } } : null
    },
  } }),
})

async function material(field) {
  const bytes = await readFile(join(inputs, field.path))
  const expected = manifest.inputFiles.find(file => file.path === field.path)
  assert.equal(expected?.sha256, sha(bytes))
  assert.equal(expected.role, 'run_input')
  const text = bytes.toString('utf8')
  if (!field.section) return text
  const start = '<!-- case:start ' + field.section + ' -->'
  const end = '<!-- case:end ' + field.section + ' -->'
  const pieces = text.split(start)
  assert.equal(pieces.length, 2)
  assert(pieces[1].includes(end))
  return pieces[1].split(end)[0].trim()
}
const bindings = []
for (const id of ['M08', 'M09', 'M10']) {
  const sample = cases.cases.find(c => c.id === id)
  const pin = manifest.caseResources.find(c => c.case === id)
  const dir = join(upstream, 'oasis', 'skills', sample.skill)
  const originalManifest = await readFile(join(dir, 'manifest.json'))
  assert.equal(sha(originalManifest), pin.packageManifestSha256)
  const pack = JSON.parse(originalManifest)
  assert.equal(pack.version, pin.version)
  for (const file of pack.files) {
    const raw = await readFile(join(dir, file.path))
    assert.equal(raw.length, file.bytes)
    assert.equal(sha(raw), file.sha256)
  }
  assert.equal(sha(await readFile(join(dir, 'SKILL.md'))), pin.skillSha256)
  const textInputs = { user_input: sample.request + '\n\n' + cases.commonUserInstruction }
  const filePaths = {}
  for (const [name, field] of Object.entries(sample.fields)) {
    const content = await material(field)
    if (name.endsWith('_file')) filePaths[name] = field.path
    else textInputs[name] = content
  }
  const common = { workspaceId, nodeId: sample.nodeId, confirmed: true, configuration: {} }
  const valid = await preparation.prepareV340({ ...common, textInputs, filePaths })
  assert.equal(valid.dispatchEnabled, false)
  const fields = Object.fromEntries(Object.keys({ ...textInputs, ...filePaths }).map(k => [k, valid.prepared.receipts[k].sha256]))
  assert(Object.values(fields).every(x => /^[a-f0-9]{64}$/.test(x)))
  const row = { id, nodeId: sample.nodeId, skill: sample.skill, version: pin.version,
    sourceCommit: manifest.suiteSources.oasis.split('/').at(-1), manifestSha256: pin.packageManifestSha256,
    verifiedPackageFiles: pack.files.length, inputSha256: valid.prepared.inputHash, inputFields: fields,
    upstreamStatus: valid.prepared.receipts.upstream_md_file.status,
    executableOnR3: false }
  if (id === 'M08') {
    const variant = cases.variants.find(c => c.id === 'M08-MISSING-TEXT')
    const partial = await preparation.prepareV340({ ...common, textInputs: {
      ...textInputs, user_input: variant.request + '\n\n' + cases.commonUserInstruction,
    }, filePaths: {} })
    assert.equal(partial.prepared.receipts.comparison_doc_1_file.status, 'not_provided')
    assert.notEqual(partial.prepared.inputHash, valid.prepared.inputHash)
    await assert.rejects(preparation.prepareV340({ ...common, textInputs,
      filePaths: { comparison_doc_1_file: '../simulated-reference.md' } }), { code: 'V340_PREPARATION_FAILED' })
    row.missingText = { inputSha256: partial.prepared.inputHash,
      receipt: partial.prepared.receipts.comparison_doc_1_file.status, outsideWorkspaceRejected: true }
  }
  bindings.push(row)
}
const china = []
for (const id of ['CN-DISCLOSURE', 'CN-READER', 'CN-APPLICATION']) {
  const sample = cases.cases.find(c => c.id === id)
  const pin = manifest.caseResources.find(c => c.case === id)
  assert.equal(sha(await readFile(join(upstream, 'china', pin.sourcePath))), pin.skillSha256)
  for (const field of sample.attachments) await material(field)
  china.push({ id, skill: sample.skill, revision: pin.version, skillSha256: pin.skillSha256,
    inputs: sample.attachments, executionLayer: 'source-and-input-admission' })
}
const savedMarkdown = m05.files.find(file => file.mediaType === 'text/markdown')
assert.equal(savedMarkdown.sha256, m05.reviewedSha256)
const next = await preparation.prepareV340({
  workspaceId: handoffWorkspaceId, nodeId: 'Flow-2-6', confirmed: true, configuration: {},
  textInputs: { user_input: '只以当前审核版本及原交底为资料，保留未决项。' },
  filePaths: { upstream_md_file: savedMarkdown.relativePath, disclosure_file: 'public-disclosure.md' },
})
const source = next.prepared.receipts.upstream_md_file
assert.equal(source.sha256, m05.reviewedSha256)
assert.equal(source.content_origin, 'upstream_snapshot')
assert.equal(next.prepared.upstream.snapshot.node_id, 'Flow-1-5')
assert.equal(next.dispatchEnabled, false)
console.log(JSON.stringify({ bindings, china, handoff: { source, inputSha256: next.prepared.inputHash,
  predecessor: next.prepared.upstream.snapshot.workflow_run_uid, target: next.nodeId },
  modelRequests: 0, professionalApiRequests: 0 }, null, 2))
