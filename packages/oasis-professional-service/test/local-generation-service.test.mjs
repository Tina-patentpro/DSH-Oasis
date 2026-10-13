import { createConnectionFixture } from './connection-fixture.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { fixtureHarness } from './unified-generation-harness.mjs'
import { hasPendingUnifiedRun } from '../src/generation-contract.js'
import { createLocalGenerationService } from '../src/local-generation-service.js'
import { parseStoredWorkbenchRecord } from '../src/workbench-domain.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { createWorkbenchRemote } from '../src/client/workbench-remote.js'
import { createWorkbenchStore } from '../src/client/workbench-store.js'
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const context = () => ({ sessionId: 'session-a', route: { provider: 'offline', model: 'text' } })
const instruction = { version: 'public-1', body: 'PUBLIC_INSTRUCTION_CANARY' }
const runtime = generate => ({ enabled: true, evidenceKind: 'native-offline', resolveContext: context, instruction, adapter: { generate } })
const tick = () => new Promise(resolve => setImmediate(resolve))

test('restart observes durable admission as unknown without replay or unlocking, and detects snapshot tampering', async () => {
  let release
  const h = await fixtureHarness({ localGeneration: runtime(() => new Promise(resolve => { release = resolve })) })
  try {
    const admission = await h.service.createLocalRun(h.command({ sessionId: 'session-a' }))
    await tick()
    const id = admission.current.tasks['task-a'].activeRunId
    const restarted = createLocalGenerationService({ repository: h.repository, runtime: runtime(() => assert.fail('must not replay')),
      clock: () => new Date().toISOString(), runIdFactory: () => 'must-not-create' })
    await restarted.observeLocalRun({ workspaceId: 'workspace-a', taskId: 'task-a', runId: id })
    assert.equal(h.state().tasks['task-a'].runs[id].failureCode, 'INTERRUPTED')
    assert.equal(hasPendingUnifiedRun(h.state().tasks['task-a']), true)
    const corrupt = structuredClone(h.state())
    corrupt.tasks['task-a'].runs[id].contextSnapshot.route.model = 'other'
    assert.throws(() => parseStoredWorkbenchRecord('workspace-a', corrupt), /integrity/)
    const handler = createWorkbenchRpcHandler(h.service)
    const response = await handler('task/create-local', { ...h.command({ sessionId: 'session-a' }), route: context().route, instruction })
    assert.equal(response.ok, false)
    release({ status: 'completed', body: 'late' }); await tick(); await tick()
    assert.equal(h.state().tasks['task-a'].runs[id].result, null)
  } finally { await h.repository.close() }
})

test('local Host path persists distinct admission and reuses reviewed artifact actions without raw instruction', async () => {
  let calls = 0
  const h = await fixtureHarness({ localGeneration: runtime(async () => { calls++; return { status: 'completed', body: '公开离线正文', model: context().route } }) })
  try {
    assert.equal(typeof h.service.createLocalRun, 'function')
    const cmd = h.command({ sessionId: 'session-a' })
    const admission = await h.service.createLocalRun(cmd)
    const id = admission.current.tasks['task-a'].activeRunId
    assert.equal(admission.current.tasks['task-a'].runs[id].mode, 'dsh-local')
    for (let n = 0; n < 20 && h.state().tasks['task-a'].runs[id].status === 'prepared'; n++) await tick()
    const run = h.state().tasks['task-a'].runs[id]
    assert.equal(run.status, 'completed')
    assert.equal(run.evidenceKind, 'native-offline')
    assert.ok(!JSON.stringify(h.state()).includes(instruction.body))
    await h.service.createLocalRun({ ...cmd, expectedRevision: h.state().revision })
    assert.equal(calls, 1)
    await h.service.reviewRun(h.command({ runId: id, status: 'approved', note: '' }))
    assert.match(h.service.prepareConversationDraft(h.command({ runId: id, artifactId: run.result.artifact.artifactId })).text, /公开离线正文/)
    await h.service.editUnifiedResult(h.command({ runId: id, artifactId: run.result.artifact.artifactId, body: '人工修改' }))
    assert.equal(h.state().tasks['task-a'].runs[h.state().tasks['task-a'].activeRunId].review.status, 'not-reviewed')
  } finally { await h.repository.close() }
})

test('unknown local run stays locked after stop and ignores late success, with no replay', async () => {
  let release, calls = 0
  const h = await fixtureHarness({ localGeneration: runtime(() => { calls++; return new Promise(resolve => { release = resolve }) }) })
  try {
    assert.equal(typeof h.service.createLocalRun, 'function')
    const admission = await h.service.createLocalRun(h.command({ sessionId: 'session-a' }))
    await tick()
    const id = admission.current.tasks['task-a'].activeRunId
    await h.service.stopUnifiedRun(h.command({ runId: id }))
    assert.equal(h.state().tasks['task-a'].runs[id].status, 'unknown')
    assert.equal(hasPendingUnifiedRun(h.state().tasks['task-a']), true)
    release({ status: 'completed', body: 'late', model: context().route }); await tick(); await tick()
    assert.equal(h.state().tasks['task-a'].runs[id].result, null)
    await assert.rejects(h.service.createLocalRun(h.command({ sessionId: 'session-a', requestKey: 'second' })), e => e.code === 'WORKSPACE_GENERATION_ACTIVE')
    const draft = h.draft(); draft.tasks['task-a'].formValues.claims = 'changed'
    await assert.rejects(h.repository.replaceEditable('workspace-a', h.state().revision, draft), /locked/)
    assert.equal(calls, 1)
  } finally { await h.repository.close() }
})

test('local capability rejects real-model evidence and missing native context before admission', async () => {
  for (const localGeneration of [undefined, { ...runtime(() => assert.fail()), evidenceKind: 'real-model' },
    { ...runtime(() => assert.fail()), resolveContext() { throw Error(instruction.body) } }]) {
    const h = await fixtureHarness({ localGeneration })
    try {
      assert.equal(typeof h.service.createLocalRun, 'function')
      await assert.rejects(h.service.createLocalRun(h.command({ sessionId: 'session-a' })), e => !e.message.includes(instruction.body))
      assert.equal(h.state().tasks['task-a'].runOrder.length, 0)
    } finally { await h.repository.close() }
  }
})

test('same Store RPC page uses local admission, observation, review and no-overwrite save', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'oasis-4c-')))
  const h = await fixtureHarness({ localGeneration: runtime(async () => ({ status: 'completed', body: '离线保存正文', model: context().route })),
    workspaceRegistry: { get: () => ({ path: root, async status() { return 'ok' } }) } })
  const handler = createWorkbenchRpcHandler(h.service)
  const remote = createWorkbenchRemote(createConnectionFixture(handler))
  const store = createWorkbenchStore({ remote, getGenerationSession: () => 'session-a', saveDelayMs: 0 })
  try {
    store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
    await store.hydrateWorkspace('workspace-a'); await store.loadWorkflowCatalog('workspace-a')
    assert.equal(store.getWorkspaceState('workspace-a').localGenerationEnabled, true)
    await store.createRun('workspace-a', 'task-a')
    await tick(); await tick()
    await store.observeUnifiedRun('workspace-a', 'task-a')
    const page = store.getWorkspaceState('workspace-a').pages[0]
    const run = page.runs[page.activeRunId]
    assert.equal(run.status, 'completed')
    await store.reviewRun('workspace-a', 'task-a', run.runId, 'approved', '')
    store.setWritebackDraft('workspace-a', 'task-a', 'output', false)
    const prepared = await store.prepareWriteback('workspace-a', 'task-a', run.runId)
    assert.equal(prepared.manifest.relativeDirectory, '.')
    assert.match(prepared.manifest.files[0].relativePath, /^权利要求书_\d{8}-\d{6}_v1\.md$/)
    store.setWritebackConfirmation('workspace-a', 'task-a', true)
    await store.commitWriteback('workspace-a', 'task-a')
    assert.equal(await readFile(prepared.manifest.files[0].absolutePath, 'utf8'), '离线保存正文')
    const metadata = JSON.parse(await readFile(prepared.manifest.files[1].absolutePath, 'utf8'))
    assert.equal(metadata.execution.mode, 'dsh-local')
    assert.equal(metadata.execution.evidenceKind, 'native-offline')
    assert.ok(!JSON.stringify(metadata).includes(instruction.body))
  } finally { await store.dispose(); await h.repository.close(); await rm(root, { recursive: true }) }
})
