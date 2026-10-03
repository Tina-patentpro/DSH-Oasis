import assert from 'node:assert/strict'
import test from 'node:test'
import { executionHarness } from './claims-api-execution-harness.mjs'
import { createOasisRemoteService } from '../src/oasis-remote-service.js'
import { parseStoredWorkbenchRecord } from '../src/workbench-domain.js'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { createWorkbenchRemote } from '../src/client/workbench-remote.js'
import { createConnectionFixture } from './connection-fixture.mjs'
import { normalizeProductRuntimeConfig } from '../src/oasis-runtime-config.js'
import { normalizeApiDetail } from '../src/oasis-api-contract.js'
import { fastDetail } from './fast-service-fixture.mjs'

test('typed Connection API preview and start preserve scope and require both confirmations', async t => {
  const h = await executionHarness(t), handler = createWorkbenchRpcHandler(h.service, h.professional)
  const remote = createWorkbenchRemote(createConnectionFixture(handler))
  const binding = await remote.getWorkspaceBinding({ workspaceId: 'workspace-a' })
  assert.equal(binding.settingsRevision, 7)
  const prepared = await remote.prepareClaimsApi(h.base())
  const p = await remote.previewClaimsApi({ ...h.base(), preparationSha256: prepared.preparationSha256, remoteReadConfirmed: true })
  assert.equal(h.calls.length, 0)
  const payload = { ...h.base(), confirmationToken: p.confirmationToken, requestKey: 'rpc-api', priceConfirmed: true, externalTransferConfirmed: true }
  assert.equal((await handler('task/start-api', { ...payload, externalTransferConfirmed: false })).ok, false)
  const started = await remote.startClaimsApi(payload)
  const executionId = started.current.tasks['task-a'].remoteExecutionOrder[0]
  const done = await remote.continueProfessional({ workspaceId: 'workspace-a', taskId: 'task-a', executionId })
  assert.equal(done.current.tasks['task-a'].runs[done.current.tasks['task-a'].activeRunId].mode, 'oasis-api')
})

test('API reviewed original and edited child save through the common no-overwrite path', async t => {
  const root = await mkdtemp(join(tmpdir(), 'oasis-api-writeback-'))
  t.after(() => rm(root, { recursive: true }))
  const h = await executionHarness(t, { workspaceRegistry: { get: () => ({ path: root, status: async () => 'ok' }) } })
  const task = await h.execute(), original = task.runs[task.activeRunId]
  for (const directory of ['original', 'edited']) {
    const current = h.state().tasks['task-a'], run = current.runs[current.activeRunId]
    const selection = { workspaceId: 'workspace-a', taskId: 'task-a', runId: run.runId, artifactId: run.result.artifact.artifactId }
    await h.service.reviewRun({ ...selection, expectedRevision: h.state().revision, status: 'approved', note: '' })
    const payload = { ...selection, expectedRevision: h.state().revision, relativeDirectory: directory }
    const plan = await h.service.prepareWriteback(payload)
    await h.service.commitWriteback({ confirmationToken: plan.confirmationToken })
    assert.equal(await readFile(join(root, directory, run.result.artifact.suggestedFileName), 'utf8'), run.result.artifact.body)
    const metadata = JSON.parse(await readFile(join(root, directory, 'patent-claims.oasis.json'), 'utf8'))
    assert.equal(metadata.execution.mode, 'oasis-api'); assert.equal(metadata.execution.evidenceKind, 'non-production-api')
    assert.equal(metadata.execution.parentRunId, run.parentRunId)
    await assert.rejects(h.service.prepareWriteback({ ...payload, expectedRevision: h.state().revision }), e => e.code === 'WRITEBACK_TARGET_EXISTS')
    if (directory === 'original') await h.service.editUnifiedResult({ ...selection, expectedRevision: h.state().revision, requestKey: 'api-edit-save', body: '修订后的正文' })
  }
  assert.equal(h.calls.length, 2); assert.equal(h.state().tasks['task-a'].runs[original.runId].review.status, 'approved')
})

test('API root saves keep terminal OIW on original and edited versions without mutating original artifact names', async t => {
  const root = await mkdtemp(join(tmpdir(), 'oasis-api-root-'))
  t.after(() => rm(root, { recursive: true }))
  const h = await executionHarness(t, { workspaceRegistry: { get: () => ({ path: root, status: async () => 'ok' }) } })
  await h.execute()
  for (let version = 1; version <= 2; version++) {
    const task = h.state().tasks['task-a'], run = task.runs[task.activeRunId]
    const selection = { workspaceId: 'workspace-a', taskId: 'task-a', runId: run.runId, artifactId: run.result.artifact.artifactId }
    await h.service.reviewRun({ ...selection, expectedRevision: h.state().revision, status: 'approved', note: '' })
    const before = structuredClone(h.state().tasks['task-a'].runs[run.runId].result.artifact)
    const plan = await h.service.prepareWriteback({ ...selection, expectedRevision: h.state().revision, relativeDirectory: '.' })
    assert.equal(plan.manifest.absoluteTarget, root)
    assert.match(plan.manifest.files[0].relativePath, new RegExp(`_v${version}_OIW\\.md$`))
    await h.service.commitWriteback({ confirmationToken: plan.confirmationToken })
    assert.equal(await readFile(plan.manifest.files[0].absolutePath, 'utf8'), before.body)
    assert.deepEqual(h.state().tasks['task-a'].runs[run.runId].result.artifact, before)
    assert.doesNotThrow(() => parseStoredWorkbenchRecord('workspace-a', h.state()))
    if (version === 1) await h.service.editUnifiedResult({ ...selection, expectedRevision: h.state().revision, requestKey: 'root-edit', body: '修订正文' })
  }
})

test('product preparation uses release destination even with old Profile settings', async t => {
  const h = await executionHarness(t)
  Object.assign(h.binding, { environmentKind: 'production', apiBaseOrigin: 'https://lzhxpy.oasisintwrite.com' })
  Object.assign(h.active, { environmentKind: 'production', apiBaseOrigin: h.binding.apiBaseOrigin })
  h.value.websiteProjectLinks = [{ workspaceId: 'workspace-a', workspacePath: h.workspace.path,
    apiBaseOrigin: h.binding.apiBaseOrigin, accountId: 101, folderId: 8, folderName: 'test', confirmedAt: new Date().toISOString() }]
  h.client.getApiDetail = async () => normalizeApiDetail(structuredClone(fastDetail))
  h.client.getCategoryCatalog = async () => [{ apiId: 39, apiEndpoint: fastDetail.name, apiProcess: 'synthetic-process' }]
  h.client.getFolderDetail = async () => ({ id: 8, name: 'test', owner_id: 101 })
  const professional = createOasisRemoteService({ ...h.options, resolveConfig: normalizeProductRuntimeConfig })
  const prepared = await professional.prepareLinkedClaimsMapping({ ...h.base(), remoteReadConfirmed: true })
  assert.deepEqual(prepared.snapshot.allowedUploadOrigins, ['https://lzhxpy.oasisintwrite.com'])
  assert.equal(h.calls.length, 0)
})

test('explicit pre-submit stop abandons only a known safe checkpoint after restart', async t => {
  const h = await executionHarness(t), p = await h.preview(); await h.start(p)
  const reopened = createOasisRemoteService(h.options), executionId = h.state().tasks['task-a'].remoteExecutionOrder[0]
  await reopened.stop({ workspaceId: 'workspace-a', taskId: 'task-a', executionId })
  assert.equal(h.state().tasks['task-a'].remoteExecutions[executionId].status, 'failed')
  await h.start(await h.preview(), { requestKey: 'new-explicit-confirmation' })
  assert.equal(h.calls.length, 0)
})

test('unified API executes one derived TXT and publishes a plain common result without a second draft', async t => {
  const h = await executionHarness(t), original = h.state().tasks['task-a'].formValues.disclosure_text
  const task = await h.execute()
  assert.equal(task.professionalDraft, null)
  assert.deepEqual(h.calls.map(c => c.kind), ['upload', 'create'])
  assert.equal(new TextDecoder().decode(h.calls[0].file.bytes), original)
  assert.deepEqual(Object.keys(h.calls[1].body.inputs), ['Technical_Disclosure_file'])
  const run = task.runs[task.activeRunId]
  assert.equal(run.mode, 'oasis-api'); assert.equal(run.source, 'oasis-api')
  assert.equal(run.result.artifact.body, h.reply.answerText)
  assert.equal(run.review.status, 'not-reviewed'); assert.equal(run.result.riskAssessment, 'not-assessed')
  assert.doesNotThrow(() => parseStoredWorkbenchRecord('workspace-a', h.state()))
  await h.professional.continue({ workspaceId: 'workspace-a', taskId: 'task-a', executionId: task.remoteExecutionOrder[0] })
  assert.equal(h.state().tasks['task-a'].runOrder.length, 1); assert.equal(h.calls.length, 2)
})

test('API result can be reviewed, edited as a child and placed in conversation only after review', async t => {
  const h = await executionHarness(t), task = await h.execute(), run = task.runs[task.activeRunId]
  const selection = { workspaceId: 'workspace-a', taskId: 'task-a', runId: run.runId, artifactId: run.result.artifact.artifactId }
  assert.throws(() => h.service.prepareConversationDraft({ ...selection, expectedRevision: h.state().revision }), /审核/)
  await h.service.reviewRun({ ...selection, expectedRevision: h.state().revision, status: 'approved', note: '' })
  const draft = h.service.prepareConversationDraft({ ...selection, expectedRevision: h.state().revision })
  assert.match(draft.text, /专业 API/); assert.doesNotMatch(draft.text, /合成验收/)
  await h.service.editUnifiedResult({ ...selection, expectedRevision: h.state().revision, requestKey: 'edit-api', body: '人工修订正文' })
  const editedTask = h.state().tasks['task-a'], edited = editedTask.runs[editedTask.activeRunId]
  assert.equal(edited.parentRunId, run.runId); assert.equal(edited.review.status, 'not-reviewed')
  assert.equal(edited.result.artifact.body, '人工修订正文'); assert.equal(h.calls.length, 2)
  assert.doesNotThrow(() => parseStoredWorkbenchRecord('workspace-a', h.state()))
})

for (const kind of ['runtime', 'settings', 'draft', 'price', 'account']) test(`stale ${kind} confirmation has no upload or create`, async t => {
  const h = await executionHarness(t), p = await h.preview()
  if (kind === 'runtime') h.changeRuntime()
  if (kind === 'settings') h.bumpSettings()
  if (kind === 'price') h.detail.price = 3
  if (kind === 'account') h.user.id = 202
  if (kind === 'draft') { const d = h.draft(); d.tasks['task-a'].formValues.disclosure_text += '变'; await h.service.replaceState('workspace-a', h.state().revision, d) }
  await assert.rejects(h.start(p)); assert.equal(h.calls.length, 0)
})

test('missing explicit external confirmation is refused before admission', async t => {
  const h = await executionHarness(t), p = await h.preview()
  await assert.rejects(h.start(p, { externalTransferConfirmed: false }))
  assert.equal(h.calls.length, 0); assert.equal(h.state().tasks['task-a'].remoteExecutionOrder.length, 0)
})

test('file-only response does not fabricate an approved-capable text result', async t => {
  const h = await executionHarness(t); h.reply.answerText = ' '; h.reply.fileUrls = ['https://files-staging.example/out.md']
  const task = await h.execute()
  assert.equal(task.runOrder.length, 0); assert.equal(task.remoteExecutions[task.remoteExecutionOrder[0]].safeError.code, 'REMOTE_TEXT_REQUIRED')
})

test('unknown create remains original request after service restart, never a second upload or create', async t => {
  const h = await executionHarness(t)
  h.client.createWorkflow = async body => { h.calls.push({ kind: 'create', body }); throw Error('connection lost') }
  const task = await h.execute()
  const reopened = createOasisRemoteService(h.options)
  await reopened.continue({ workspaceId: 'workspace-a', taskId: 'task-a', executionId: task.remoteExecutionOrder[0] })
  assert.equal(h.calls.filter(c => c.kind === 'create').length, 1)
  assert.equal(h.calls.filter(c => c.kind === 'upload').length, 1)
  assert.equal(h.state().tasks['task-a'].runOrder.length, 0)
})

test('pre-submit Host restart never resumes an upload without a fresh explicit confirmation', async t => {
  const h = await executionHarness(t), p = await h.preview(); await h.start(p)
  const reopened = createOasisRemoteService(h.options)
  await assert.rejects(reopened.continue({ workspaceId: 'workspace-a', taskId: 'task-a', executionId: h.state().tasks['task-a'].remoteExecutionOrder[0] }))
  assert.equal(h.calls.length, 0)
})

for (const kind of ['price', 'account', 'settings']) test(`destination changed during upload cannot create: ${kind}`, async t => {
  const h = await executionHarness(t), upload = h.client.uploadFile
  h.client.uploadFile = async file => { const url = await upload(file)
    if (kind === 'price') h.detail.price++
    if (kind === 'account') h.user.id++
    if (kind === 'settings') h.bumpSettings()
    return url
  }
  await assert.rejects(h.execute())
  assert.deepEqual(h.calls.map(c => c.kind), ['upload'])
  assert.equal(h.state().tasks['task-a'].remoteExecutions[h.state().tasks['task-a'].remoteExecutionOrder[0]].uploadedFiles.length, 1)
})

test('same consent cannot admit concurrent requests and execution continuation shares one dispatch', async t => {
  const h = await executionHarness(t), p = await h.preview()
  const attempts = await Promise.allSettled([h.start(p), h.start(p)])
  assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1)
  const executionId = h.state().tasks['task-a'].remoteExecutionOrder[0]
  await Promise.all(Array.from({ length: 3 }, () => h.professional.continue({ workspaceId: 'workspace-a', taskId: 'task-a', executionId })))
  assert.deepEqual(h.calls.map(c => c.kind), ['upload', 'create'])
})

test('a complete API execution cannot be copied into another Workspace by changing outer identity', async t => {
  const h = await executionHarness(t); await h.execute()
  const copied = structuredClone(h.state()); copied.workspaceId = 'workspace-b'
  assert.throws(() => parseStoredWorkbenchRecord('workspace-b', copied))
})

test('preview runtime failure is sanitized at the new RPC boundary', async t => {
  const h = await executionHarness(t), prepared = await h.professional.prepareClaimsMapping(h.base())
  let reads = 0
  h.options.getRuntime = async () => { if (++reads === 2) throw Error('private-provider-secret'); return h.active }
  const handler = createWorkbenchRpcHandler(h.service, createOasisRemoteService(h.options))
  const response = await handler('task/preview-api', { ...h.base(), preparationSha256: prepared.preparationSha256, remoteReadConfirmed: true })
  assert.equal(response.ok, false); assert.equal(JSON.stringify(response).includes('private-provider-secret'), false)
  assert.equal(h.calls.length, 0)
})
