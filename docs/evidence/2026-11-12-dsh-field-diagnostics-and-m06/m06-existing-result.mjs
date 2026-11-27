import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import tls from 'node:tls'

const [evidence, mode] = process.argv.slice(2)
assert(['save', 'save-continue', 'restore'].includes(mode))
const json = async path => JSON.parse(await fs.readFile(path, 'utf8'))
const { m06 } = await json(join(evidence, 'execution-preflight.json'))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const business = join(m06.root, 'data/home/storages/oasis_workbench.json')
const workspaceRoot = join(m06.root, 'data/workspace-b')
let outbound = 0
const denyNetwork = () => { outbound++; throw new Error('Outbound activity denied') }
globalThis.fetch = denyNetwork
http.request = http.get = https.request = https.get = denyNetwork
net.connect = net.createConnection = net.Socket.prototype.connect = tls.connect = denyNetwork
const writeReceipt = (file, value) => fs.writeFile(join(evidence, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
const controller = await import(pathToFileURL(join(m06.root, 'control/scripts/f-installed-runtime.mjs')))

const result = await controller.withInstalledWriter(m06.root, 'sdk', async installed => {
  assert.equal(installed.current, m06.bundle)
  Object.assign(process.env, installed.env)
  const release = join(m06.root, 'releases', installed.current)
  const require = createRequire(join(release, 'App/DSH Desktop.app/Contents/Resources/app/package.json'))
  const load = name => import(pathToFileURL(require.resolve(name)))
  const component = name => import(pathToFileURL(join(release, 'components/c3/src', name)))
  const { Context } = await load('@deepseek-ai/cordis')
  const { JsonStorageBackend } = await load('@deepseek-ai/dsh-storage-json')
  const { DomainFacility } = await load('@deepseek-ai/dsh-storage-domain')
  const { default: Jsonl } = await load('@deepseek-ai/dsh-session-persistence-jsonl')
  const { WorkspaceRegistry } = await load('@deepseek-ai/dsh-workspace')
  const { createSingleOwnerJsonBackend } = await import(pathToFileURL(join(release, 'components/c5/index.mjs')))
  const { openOasisWorkbenchRepository } = await component('workbench-repository.js')
  const { createWorkbenchService } = await component('workbench-service.js')
  const { createWorkspaceMaterialManager } = await component('workspace-materials.js')
  const { createWorkbenchRpcHandler } = await component('workbench-rpc.js')
  const { getV340Versions } = await component('v340-runtime-contract.js')
  const backend = await createSingleOwnerJsonBackend(dirname(business), JsonStorageBackend)
  const facility = new DomainFacility({
    storage: { backend: { get: name => { assert.equal(name, 'json'); return backend } } },
    emit() {}, logger: { warn() {}, error() {} },
  }, { backend: 'json' })
  const context = new Context()
  let repository, service
  try {
    context.provide('storageDomain', facility)
    await context.plugin(Jsonl, { root: join(m06.root, 'data/home/sessions') })
    await context.plugin(WorkspaceRegistry)
    const registry = context.workspaceRegistry
    const workspace = registry.get(m06.workspace)
    assert.equal(workspace?.path, workspaceRoot)
    assert.equal(await workspace.status(), 'ok')
    assert(workspace.sessionIds.includes(m06.session))
    repository = await openOasisWorkbenchRepository(facility)
    service = createWorkbenchService({ repository, workspaceRegistry: registry,
      materialManager: createWorkspaceMaterialManager({ workspaceRegistry: registry }) })
    const handler = createWorkbenchRpcHandler(service)
    const prefix = 'workflow/v340/result/'
    async function rpc(action, payload) {
      const reply = await handler(prefix + action, payload)
      if (!reply.ok) throw new Error(action + ' ' + reply.error.code)
      return reply.value
    }
    const record = () => repository.get(m06.workspace)
    const task = state => state.tasks[m06.task].v340
    const original = state => task(state).runs[m06.run]
    const version = state => getV340Versions(original(state)).find(v => v.versionId === m06.run)
    const target = { workspaceId: m06.workspace, taskId: m06.task, runId: m06.run,
      versionId: m06.run, resultSha256: m06.originalSha256 }
    const selected = () => ({ ...target, expectedRevision: record().revision })
    const initial = record()
    const run = original(initial)
    assert.equal(run.status, 'completed')
    assert.equal(sha(run.result.body), m06.originalSha256)
    assert.equal(version(initial).result.sha256, m06.originalSha256)
    const fileName = run.result.fileName
    assert.match(fileName, /^claims_[0-9]{14}_89dd69c1\.md$/)
    const draftPath = () => original(record()).coreResultDrafts?.[m06.run]
    const draftPayload = body => ({ workspaceId: m06.workspace, taskId: m06.task, runId: m06.run,
      expectedRevision: record().revision, baseSha256: m06.originalSha256, body, format: 'core-markdown' })
    if (mode === 'restore') {
      const prior = await json(join(evidence, 'm06-save.json'))
      assert.equal(initial.revision, prior.draftRevision)
      assert.equal(sha(draftPath().body), prior.unsavedDraftSha256)
      assert.equal(draftPath().baseSha256, m06.originalSha256)
      assert.equal(version(initial).review.status, 'approved')
      assert.equal(task(initial).activeRunId, prior.unchangedActiveRunId)
      const fileReceipts = version(initial).writebacks.find(w => w.writebackId === prior.writebackId).files
      for (const file of fileReceipts) assert.equal(sha(await fs.readFile(join(workspaceRoot, file.relativePath))), file.sha256)
      await rpc('draft', draftPayload(null))
      assert.equal(draftPath(), undefined)
      const after = record()
      assert.deepEqual(task(after).runOrder, task(initial).runOrder)
      assert.equal(task(after).activeRunId, prior.unchangedActiveRunId)
      assert.equal(sha(original(after).result.body), m06.originalSha256)
      for (const [key, before] of Object.entries(task(initial).runs)) {
        if (key !== m06.run) assert.deepEqual(task(after).runs[key], before)
      }
      for (const [key, before] of Object.entries(initial.tasks)) {
        if (key !== m06.task) assert.deepEqual(after.tasks[key], before)
      }
      assert.equal(outbound, 0)
      return { mode, pid: process.pid, originalRecovered: true, savedFilesRecovered: true,
        unsavedDraftRecovered: true, temporaryDraftCleared: true, revision: after.revision,
        resultSha256: m06.originalSha256, outbound, newModelRuns: 0 }
    }
    assert.equal(draftPath(), undefined)
    assert.equal(await fs.realpath(workspaceRoot), workspaceRoot)
    const core = run.result.snapshot.current_result.core_result_markdown
    if (mode === 'save') {
      assert.equal(initial.revision, m06.revision)
      assert.equal(sha(await fs.readFile(business)), m06.storageSha256)
      assert.equal(version(initial).review.status, 'not-reviewed')
      await fs.copyFile(business, join(evidence, 'm06-business-before.json'), fs.constants.COPYFILE_EXCL)
      await fs.chmod(join(evidence, 'm06-business-before.json'), 0o600)
      await assert.rejects(() => rpc('prepare-save', selected()), /V340_REVIEW_REQUIRED/)
      for (const feature of ['底座','导向槽','滑块','锁止件']) assert(core.includes(feature), feature)
      assert(run.result.snapshot.warnings.length > 0)
      await writeReceipt('m06-intent.json', { ...target, bundle: installed.current, originalBytes: Buffer.byteLength(run.result.body),
        beforeRevision: initial.revision, activeRunId: task(initial).activeRunId, fileName, professionalAcceptance: false })
      await rpc('review', { ...selected(), confirmed: true })
    } else {
      const intent = await json(join(evidence, 'm06-intent.json'))
      assert.equal(sha(await fs.readFile(join(evidence, 'm06-business-before.json'))), m06.storageSha256)
      assert.equal(initial.revision, intent.beforeRevision + 1)
      assert.equal(task(initial).activeRunId, intent.activeRunId)
      assert.equal(version(initial).writebacks.length, 0)
    }
    assert.equal(version(record()).review.status, 'approved')
    const plan = await rpc('prepare-save', selected())
    assert.equal(plan.manifest.workspaceId, m06.workspace)
    assert.equal(plan.manifest.artifactId, 'sha256:' + m06.originalSha256)
    assert.equal(plan.manifest.absoluteTarget, workspaceRoot)
    const expectedFiles = [fileName, fileName.replace(/\.md$/, '.oasis.json')]
    for (const file of expectedFiles) await assert.rejects(fs.lstat(join(workspaceRoot, file)), { code: 'ENOENT' })
    await writeReceipt('m06-save-intent.json', { revision: record().revision, manifest: plan.manifest })
    const saved = await rpc('commit-save', { confirmationToken: plan.confirmationToken })
    assert.equal(saved.committed, true)
    const receipt = version(record()).writebacks.at(-1)
    assert.deepEqual(receipt.files.map(f => f.relativePath).sort(), expectedFiles.sort())
    for (const file of receipt.files) assert.equal(sha(await fs.readFile(join(workspaceRoot, file.relativePath))), file.sha256)
    const opened = await rpc('saved-file', { ...selected(), writebackId: receipt.writebackId })
    assert.equal(opened.absolutePath, join(workspaceRoot, fileName))
    assert(opened.matchesReviewed)
    const reference = await rpc('conversation-draft', selected())
    assert.equal(reference.artifactId, 'sha256:' + m06.originalSha256)
    assert(reference.text.endsWith(run.result.body))
    const scratchDraft = core + '\n\n<!-- 原 B 恢复验证临时草稿，未提交 -->\n'
    await rpc('draft', draftPayload(scratchDraft))
    assert.equal(sha(draftPath().body), sha(scratchDraft))
    assert.deepEqual(task(record()).runOrder, task(initial).runOrder)
    assert.equal(task(record()).activeRunId, task(initial).activeRunId)
    assert.equal(outbound, 0)
    return { mode, pid: process.pid, bundle: installed.current, runId: m06.run, review: 'approved-engineering',
      resultSha256: m06.originalSha256, reviewedOriginal: true, unchangedActiveRunId: task(initial).activeRunId,
      writebackId: receipt.writebackId, files: receipt.files, safeFileResolved: true, fixedReferencePrepared: true,
      draftRevision: record().revision, unsavedDraftSha256: sha(scratchDraft), outbound, newModelRuns: 0 }
  } finally {
    await service?.closeV340Runtime()
    await repository?.close()
    await context.fiber.dispose()
    await facility.closeAll()
    await backend.close()
  }
})
await writeReceipt(mode === 'restore' ? 'm06-restore.json' : 'm06-save.json', { ...result, finalStorageSha256: sha(await fs.readFile(business)) })
console.log('M06', mode, result.revision ?? result.draftRevision, result.resultSha256)
