import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp, rm, copyFile, symlink } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { getV340Catalog, loadV340Instruction } from '../src/v340-catalog.js'

const checkerUrl = new URL('../../../scripts/check-v340-source-mapping.mjs', import.meta.url)
const checker = await import(checkerUrl).catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url === checkerUrl.href) return {}
  throw error
})
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
const manifestPath = 'docs/business-baseline/v340-source-mapping.json'
const frozen = JSON.parse(await readFile(resolve(repoRoot, manifestPath), 'utf8'))
async function variant(t, mutate = () => {}, isolated = false) {
  await mkdir(resolve(repoRoot, '.local'), { recursive: true })
  const dir = await mkdtemp(resolve(repoRoot, '.local/v340-mapping-test-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const value = structuredClone(frozen)
  mutate(value)
  const root = isolated ? dir : repoRoot
  if (isolated) {
    for (const path of [...frozen.evidence.map(e => e.path), ...frozen.legacyReference.resources.map(e => e.path)]) {
      await mkdir(dirname(resolve(root, path)), { recursive: true })
      await copyFile(resolve(repoRoot, path), resolve(root, path))
    }
  }
  const path = resolve(dir, 'mapping.json')
  await writeFile(path, JSON.stringify(value))
  return { path, root, dir, value }
}
async function rejectVariant(t, mutate) {
  const v = await variant(t, mutate)
  await assert.rejects(checker.verifyV340SourceMapping({ repoRoot, manifestPath: v.path }), { code: 'MAPPING_INVALID' })
}

test('offline mapping verification is available without enabling a source', async () => {
  assert.equal(typeof checker.verifyV340SourceMapping, 'function', 'B batch offline verifier is missing')
  const result = await checker.verifyV340SourceMapping({
    manifestPath, repoRoot,
  })
  assert.equal(result.businessVersion, 'V3.4.0')
  assert.equal(result.nodeCount, 14)
  assert.equal(result.sourceCellCount, 28)
  assert.equal(result.dispatchEnabled, false)
  assert.equal(result.realCallVerified, false)
  assert.equal(result.gaps.filter(g => g.code === 'API_SCHEMA_MISSING').length, 14)
  assert.equal(result.gaps.filter(g => g.code === 'LOCAL_ADAPTER_UNWIRED').length, 14)
  assert.equal(result.gaps.length, 114)
  for (const node of frozen.nodes) {
    assert.equal((await loadV340Instruction(node.nodeId)).sha256, node.local.assembledSHA256)
    assert.equal(node.api.serviceId, null)
    assert.equal(node.api.projectAccountEvidence, null)
  }
  assert.equal(getV340Catalog().dispatchEnabled, false)
  for (const node of getV340Catalog().nodes) {
    assert.equal(node.sources['local-skill'].enabled, false)
    assert.equal(node.sources['oasis-api'].enabled, false)
  }
})

// Each mutation would otherwise turn a missing binding or changed resource into false evidence.
const mutations = [
  ['missing node', m => m.nodes.pop()],
  ['duplicate node', m => m.nodes[13] = structuredClone(m.nodes[0])],
  ['wrong business version', m => m.businessVersion = '0.2.2'],
  ['wrong business original hash', m => m.sourceSHA256 = '0'.repeat(64)],
  ['replaced pack pin', m => m.resourceSHA256 = '0'.repeat(64)],
  ['resource order changed', m => m.nodes[5].local.resources.reverse()],
  ['resource hash changed', m => m.nodes[5].local.resources[1].sha256 = '0'.repeat(64)],
  ['another node instruction substituted', m => m.nodes[5].local.resources[1] = m.nodes[6].local.resources[1]],
  ['legacy resource masquerades as V340', m => m.nodes[5].local.resources[1] = m.legacyReference.resources[0]],
  ['wrong assembly hash', m => m.nodes[5].local.assembledSHA256 = '0'.repeat(64)],
  ['duplicate input', m => m.nodes[0].inputs.push(m.nodes[0].inputs[0])],
  ['user input treated as a material file', m => m.nodes[0].inputs.at(-1).channel = '用户文件'],
  ['single document boundary lost', m => m.nodes[13].inputs[7].boundary = 'all documents merged'],
  ['API input omitted', m => m.nodes[5].api.inputMapping.pop()],
  ['API required field added', m => m.nodes[5].api.inputMapping.push({ inputId: 'new_required', apiField: 'extra', required: true, transform: null })],
  ['API requiredness claimed without schema', m => m.nodes[5].api.inputMapping[0].required = true],
  ['API schema fingerprint claimed', m => m.nodes[5].api.schemaSHA256 = '1'.repeat(64)],
  ['URL-only result called a delivered body', m => { m.nodes[5].api.resultMapping.urlField = 'file_url'; m.nodes[5].api.resultMapping.bodyDelivered = true }],
  ['service ID guessed from node name', m => m.nodes[5].api.serviceId = 'flow-2-6'],
  ['legacy create endpoint treated as deployed binding', m => { m.nodes[5].api.method = 'POST'; m.nodes[5].api.path = '/api/apicategories/create' }],
  ['ready without project ownership', m => m.nodes[5].api.status = 'READY'],
  ['synthetic account used as project evidence', m => m.nodes[5].api.projectAccountEvidence = { workspaceId: 'same-name', accountId: 1, folderId: 1 }],
  ['root dispatch enabled', m => m.dispatchEnabled = true],
  ['root real call claimed', m => m.realCallVerified = true],
  ['local enabled', m => m.nodes[5].local.enabled = true],
  ['API enabled', m => m.nodes[5].api.enabled = true],
  ['local real call claimed', m => m.nodes[5].local.realCallVerified = true],
  ['API real call claimed', m => m.nodes[5].api.realCallVerified = true],
  ['legacy version reassigned', m => m.legacyReference.appliesToV340 = true],
  ['missing gap hides unresolved API schema', m => m.nodes[5].api.gaps.splice(1, 1)],
  ['historical evidence described as actual deployment', m => m.evidence[5].evidenceKind = 'real-call'],
  ['extra unchecked readiness property', m => m.nodes[0].runtimeReady = true],
  ['evidence path escape', m => m.evidence[0].path = '../outside.md'],
  ['resource points to credential path', m => m.nodes[0].local.resources[0].path = '.dsh-test/mac-dev/credentials.json'],
]
for (const [name, mutate] of mutations) test(`mapping refuses ${name}`, t => rejectVariant(t, mutate))

test('offline checker accepts JSON object key reordering without hiding any gaps', async t => {
  const v = await variant(t)
  await writeFile(v.path, JSON.stringify(Object.fromEntries(Object.entries(v.value).reverse())))
  const result = await checker.verifyV340SourceMapping({ repoRoot, manifestPath: v.path })
  assert.equal(result.nodeCount, 14)
  assert.equal(result.gaps.length, 114)
})

for (const [name, target] of [
  ['pinned pack', frozen.evidence[1].path],
  ['catalog assembly and disabled routing', frozen.evidence[2].path],
  ['legacy API authority', frozen.evidence[5].path],
  ['old Skill resource', frozen.legacyReference.resources[0].path],
]) test(`mapping refuses actual disk drift in ${name}`, async t => {
  const v = await variant(t, () => {}, true)
  await writeFile(resolve(v.root, target), 'changed bytes')
  await assert.rejects(checker.verifyV340SourceMapping({ repoRoot: v.root, manifestPath: v.path }), { code: 'MAPPING_RESOURCE_DRIFT' })
})

test('mapping refuses an explicit manifest outside the repository', async () => {
  await assert.rejects(checker.verifyV340SourceMapping({ repoRoot, manifestPath: '../mapping.json' }), { code: 'MAPPING_PATH' })
})
test('mapping refuses non-manifest repository files even if they contain matching JSON', async t => {
  const v = await variant(t)
  const path = resolve(v.dir, 'credentials.json')
  await writeFile(path, JSON.stringify(v.value))
  await assert.rejects(checker.verifyV340SourceMapping({ repoRoot, manifestPath: path }), { code: 'MAPPING_PATH' })
})
test('mapping refuses a symlink manifest even when it targets an allowed repository file', async t => {
  const v = await variant(t)
  const link = resolve(v.dir, 'linked.json')
  await symlink(v.path, link)
  await assert.rejects(checker.verifyV340SourceMapping({ repoRoot, manifestPath: link }), { code: 'MAPPING_PATH' })
})
test('mapping refuses a symlinked parent of a fixed resource before following it', async t => {
  const v = await variant(t, () => {}, true)
  await rm(resolve(v.root, 'packages'), { recursive: true })
  await symlink(resolve(repoRoot, 'packages'), resolve(v.root, 'packages'))
  await assert.rejects(checker.verifyV340SourceMapping({ repoRoot: v.root, manifestPath: v.path }), { code: 'MAPPING_PATH' })
})
test('mapping refuses a symlinked fixed resource even when its bytes match', async t => {
  const v = await variant(t, () => {}, true)
  const path = resolve(v.root, frozen.evidence[1].path)
  await rm(path)
  await symlink(resolve(repoRoot, frozen.evidence[1].path), path)
  await assert.rejects(checker.verifyV340SourceMapping({ repoRoot: v.root, manifestPath: v.path }), { code: 'MAPPING_PATH' })
})
test('mapping CLI emits only a bounded summary and fails closed without echoing input', async t => {
  const good = spawnSync(process.execPath, [fileURLToPath(checkerUrl), '--manifest', manifestPath], { cwd: repoRoot, encoding: 'utf8' })
  assert.equal(good.status, 0, good.stderr)
  assert.notEqual(good.stdout.trim(), '', 'CLI must emit a verification summary')
  assert.equal(JSON.parse(good.stdout).sourceCellCount, 28)
  assert.equal(JSON.parse(good.stdout).realCallVerified, false)
  const v = await variant(t, m => m.authorization = 'SYNTHETIC_SECRET_DO_NOT_ECHO')
  const bad = spawnSync(process.execPath, [fileURLToPath(checkerUrl), '--manifest', v.path], { cwd: repoRoot, encoding: 'utf8' })
  assert.equal(bad.status, 1)
  assert.match(bad.stderr, /MAPPING_INVALID/)
  assert.equal(bad.stdout, '')
  assert.doesNotMatch(bad.stderr, /SYNTHETIC_SECRET_DO_NOT_ECHO/)
})
