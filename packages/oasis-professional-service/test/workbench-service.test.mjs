import assert from 'node:assert/strict'
import test from 'node:test'

import { workbenchRecordSchema } from '../src/workbench-contract.js'
import { createWorkbenchService } from '../src/workbench-service.js'
import {
  createEditableDraft,
  createMaterialReference,
  createRunSnapshot,
  createV3Record,
  createV3Task,
  RUN_ARTIFACT_SHA256,
  RUN_INPUT_SHA256,
} from './workbench-fixtures.mjs'

const CLOCK = () => '2026-08-26T01:02:03.000Z'

function createMaterialManager(overrides = {}) {
  return {
    async confirm(_workspaceId, _relativePath, _policy, referenceId, confirmedAt) {
      return createMaterialReference({ referenceId, confirmedAt, observedAt: confirmedAt })
    },
    async refresh(_workspaceId, reference) { return reference },
    async recheckAll(_workspaceId, references) { return references },
    ...overrides,
  }
}

function createMutableRepository(initial) {
  let current = structuredClone(initial)
  const calls = []
  return {
    calls,
    get(workspaceId) {
      calls.push(['get', workspaceId])
      return structuredClone(current)
    },
    async replaceEditable() { throw new Error('not used') },
    async mutate(workspaceId, expectedRevision, mutation) {
      calls.push(['mutate', workspaceId, expectedRevision])
      if (current.revision !== expectedRevision) {
        return { committed: false, reason: 'revision-conflict', current: structuredClone(current) }
      }
      const mutationCurrent = structuredClone(current)
      const candidate = await mutation(mutationCurrent)
      if (candidate === mutationCurrent) {
        return { committed: true, current: structuredClone(current) }
      }
      current = { ...candidate, workspaceId, revision: current.revision + 1, updatedAt: CLOCK() }
      return { committed: true, current: structuredClone(current) }
    },
  }
}

test('keeps state orchestration behind the service boundary', async () => {
  const calls = []
  const repository = {
    get(workspaceId) {
      calls.push(['get', workspaceId])
      return createV3Record(workspaceId, 0, { empty: true })
    },
    async replaceEditable(workspaceId, expectedRevision, state) {
      calls.push(['replaceEditable', workspaceId, expectedRevision, state])
      return { committed: true, current: createV3Record(workspaceId, 1, { empty: true }) }
    },
    async mutate() {},
  }
  const service = createWorkbenchService({ repository, materialManager: createMaterialManager() })
  const draft = createEditableDraft()
  assert.equal(service.getState('workspace-a').schemaVersion, 3)
  assert.equal((await service.replaceState('workspace-a', 0, draft)).committed, true)
  assert.deepEqual(calls.map((call) => call[0]), ['get', 'replaceEditable'])
})

function technicalForm(overrides = {}) {
  return {
    objective: '降低装置能耗',
    currentState: '现有方案采用固定控制参数。',
    constraints: ['不改变设备接口'],
    evidenceStatus: 'partial',
    expectedDeliverable: '验证计划和交付清单',
    ...overrides,
  }
}

function runnableRecord(revision = 3, overrides = {}) {
  const task = createV3Task('task-a', { formValues: technicalForm(), ...overrides })
  return createV3Record('workspace-a', revision, {
    tasks: { 'task-a': task }, taskOrder: ['task-a'], activeTaskId: 'task-a',
  })
}

function writebackReadyRecord(revision = 3, runOverrides = {}) {
  const run = createRunSnapshot({
    review: { status: 'approved', note: '已人工检查结构', updatedAt: CLOCK() },
    ...runOverrides,
  })
  return runnableRecord(revision, {
    runs: { [run.runId]: run },
    runOrder: [run.runId],
    activeRunId: run.runId,
  })
}

function writebackRecord(overrides = {}) {
  return {
    writebackId: 'writeback-a',
    artifactId: `sha256:${RUN_ARTIFACT_SHA256}`,
    relativeDirectory: 'outputs\\run-a',
    files: [
      { relativePath: 'outputs\\run-a\\result.md', sha256: RUN_ARTIFACT_SHA256, mediaType: 'text/markdown' },
      { relativePath: 'outputs\\run-a\\result.oasis.json', sha256: 'd'.repeat(64), mediaType: 'application/json' },
    ],
    reviewStatus: 'approved',
    committedAt: CLOCK(),
    ...overrides,
  }
}

function createWritebackManager(overrides = {}) {
  const calls = []
  const plan = {
    workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-a', expectedRevision: 3,
    artifactId: `sha256:${RUN_ARTIFACT_SHA256}`, relativeDirectory: 'outputs\\run-a',
  }
  return {
    calls,
    async prepare(input) {
      calls.push(['prepare', input])
      return {
        confirmationToken: 'secret-token',
        manifest: {
          schemaVersion: 1,
          workspaceId: input.workspaceId,
          taskId: input.taskId,
          runId: input.runId,
          artifactId: input.artifact.artifactId,
          relativeDirectory: input.relativeDirectory,
          absoluteTarget: 'D:\\workspace\\outputs\\run-a',
          files: [
            {
              relativePath: 'outputs\\run-a\\result.md', absolutePath: 'D:\\workspace\\outputs\\run-a\\result.md',
              sizeBytes: 24, sha256: RUN_ARTIFACT_SHA256, mediaType: 'text/markdown',
            },
            {
              relativePath: 'outputs\\run-a\\result.oasis.json',
              absolutePath: 'D:\\workspace\\outputs\\run-a\\result.oasis.json',
              sizeBytes: 128, sha256: 'd'.repeat(64), mediaType: 'application/json',
            },
          ],
          expiresAt: '2026-08-26T01:12:03.000Z',
        },
      }
    },
    consume(token) { calls.push(['consume', token]); return plan },
    async publish(value) { calls.push(['publish', value]); return writebackRecord() },
    ...overrides,
  }
}

async function expectServiceCode(operation, code) {
  await assert.rejects(operation, (error) => {
    assert.equal(error.code, code)
    return true
  })
}

test('creates a run only from authoritative validated draft and rechecked materials', async () => {
  const repository = createMutableRepository(runnableRecord())
  const checked = [createMaterialReference({ observedAt: CLOCK() })]
  const calls = []
  const service = createWorkbenchService({
    repository,
    materialManager: createMaterialManager({
      async recheckAll(workspaceId, references, policy) {
        calls.push({ workspaceId, references, policy })
        return checked
      },
    }),
    clock: CLOCK,
    runIdFactory: () => 'run-new',
  })

  const result = await service.createRun({
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 3, requestKey: 'request-new',
  })
  assert.equal(result.committed, true)
  assert.equal(result.current.revision, 4)
  const task = result.current.tasks['task-a']
  const run = task.runs['run-new']
  assert.deepEqual(task.runOrder, ['run-new'])
  assert.equal(task.activeRunId, 'run-new')
  assert.deepEqual(run.inputSnapshot.formValues, technicalForm())
  assert.deepEqual(run.inputSnapshot.inputRefs, checked)
  assert.match(run.inputSnapshot.sha256, /^[a-f0-9]{64}$/)
  assert.equal(run.result.contentStatus, 'warning')
  assert.equal(run.review.status, 'not-reviewed')
  assert.equal(run.createdAt, CLOCK())
  assert.equal(calls[0].policy.contentReadMode, 'metadata-only')
})

test('makes request keys idempotent for one snapshot and conflicts after draft change', async () => {
  let recheckCount = 0
  const repository = createMutableRepository(runnableRecord())
  const service = createWorkbenchService({
    repository,
    materialManager: createMaterialManager({
      async recheckAll(_workspaceId, references) {
        recheckCount += 1
        return references.map((reference) => ({
          ...reference,
          observedAt: recheckCount === 1 ? CLOCK() : '2026-08-26T02:03:04.000Z',
        }))
      },
    }),
    clock: CLOCK,
    runIdFactory: () => 'run-idempotent',
  })

  const first = await service.createRun({
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 3, requestKey: 'request-same',
  })
  const retry = await service.createRun({
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 4, requestKey: 'request-same',
  })
  assert.equal(retry.committed, true)
  assert.equal(retry.current.revision, 4)
  assert.deepEqual(retry.current.tasks['task-a'].runOrder, ['run-idempotent'])
  assert.deepEqual(retry.current.tasks['task-a'].runs['run-idempotent'], first.current.tasks['task-a'].runs['run-idempotent'])

  await repository.mutate('workspace-a', 4, (current) => {
    const next = structuredClone(current)
    next.tasks['task-a'].formValues.objective = '改为降低装置噪声'
    return next
  })
  await expectServiceCode(service.createRun({
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 5, requestKey: 'request-same',
  }), 'IDEMPOTENCY_CONFLICT')
  assert.deepEqual(repository.get('workspace-a').tasks['task-a'].runOrder, ['run-idempotent'])
})

test('rejects the ninth run without changing the first eight snapshots', async () => {
  const runs = {}
  const runOrder = []
  for (let index = 0; index < 8; index += 1) {
    const runId = `run-${index}`
    runOrder.push(runId)
    runs[runId] = createRunSnapshot({ runId, requestKey: `request-${index}` })
  }
  const repository = createMutableRepository(runnableRecord(8, { runs, runOrder, activeRunId: 'run-7' }))
  const before = JSON.stringify(repository.get('workspace-a').tasks['task-a'].runs)
  const service = createWorkbenchService({
    repository, materialManager: createMaterialManager(), clock: CLOCK, runIdFactory: () => 'run-8',
  })

  await expectServiceCode(service.createRun({
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 8, requestKey: 'request-8',
  }), 'RUN_LIMIT_REACHED')
  const after = repository.get('workspace-a')
  assert.equal(after.revision, 8)
  assert.deepEqual(after.tasks['task-a'].runOrder, runOrder)
  assert.equal(JSON.stringify(after.tasks['task-a'].runs), before)
})

test('new runs preserve old bytes and review changes only the selected run', async () => {
  const oldRun = createRunSnapshot()
  const blockedRun = createRunSnapshot({
    runId: 'run-blocked',
    requestKey: 'request-blocked',
    result: { ...createRunSnapshot().result, contentStatus: 'blocked' },
  })
  const repository = createMutableRepository(runnableRecord(5, {
    runs: { 'run-a': oldRun, 'run-blocked': blockedRun },
    runOrder: ['run-a', 'run-blocked'],
    activeRunId: 'run-blocked',
  }))
  const service = createWorkbenchService({
    repository, materialManager: createMaterialManager(), clock: CLOCK, runIdFactory: () => 'run-new',
  })

  const created = await service.createRun({
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 5, requestKey: 'request-new',
  })
  assert.deepEqual(created.current.tasks['task-a'].runs['run-a'], oldRun)
  assert.deepEqual(created.current.tasks['task-a'].runs['run-blocked'], blockedRun)

  await expectServiceCode(service.reviewRun({
    workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-blocked', expectedRevision: 6,
    status: 'approved', note: '已检查',
  }), 'RUN_BLOCKED')
  await expectServiceCode(Promise.resolve().then(() => service.reviewRun({
    workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-a', expectedRevision: 6,
    status: 'changes-requested', note: '   ',
  })), 'REVIEW_NOTE_REQUIRED')

  const targetBefore = structuredClone(oldRun)
  const otherBefore = structuredClone(blockedRun)
  const reviewed = await service.reviewRun({
    workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-a', expectedRevision: 6,
    status: 'changes-requested', note: '请补充验证标准',
  })
  assert.equal(reviewed.current.tasks['task-a'].runs['run-a'].review.status, 'changes-requested')
  assert.equal(reviewed.current.tasks['task-a'].runs['run-a'].review.note, '请补充验证标准')
  assert.deepEqual(reviewed.current.tasks['task-a'].runs['run-a'].inputSnapshot, targetBefore.inputSnapshot)
  assert.deepEqual(reviewed.current.tasks['task-a'].runs['run-a'].result, targetBefore.result)
  assert.deepEqual(reviewed.current.tasks['task-a'].runs['run-blocked'], otherBefore)

  const approved = await service.reviewRun({
    workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-a', expectedRevision: 7,
    status: 'approved', note: '已人工检查结构',
  })
  assert.equal(approved.current.tasks['task-a'].runs['run-a'].review.status, 'approved')
  assert.deepEqual(approved.current.tasks['task-a'].runs['run-blocked'], otherBefore)
})

test('publishes catalog through the service without leaking the repository', () => {
  const service = createWorkbenchService({
    repository: { get() {}, replaceEditable() {}, mutate() {} },
    materialManager: createMaterialManager(),
  })
  const catalog = service.getWorkflowCatalog('cn-invention-patent')
  assert.deepEqual(catalog.workflows.map((workflow) => workflow.workflowId), [
    'patent-claims',
    'patent-claims',
    'cn-invention-patent',
  ])
  assert.deepEqual(catalog.workflows.filter(w => w.workflowId === 'patent-claims').map(w => w.workflowVersion), ['2', '1'])
  assert.equal(Object.hasOwn(service, 'repository'), false)
  assert.equal(Object.isFrozen(service), true)
})

test('requires the complete repository and material-manager boundaries', () => {
  assert.throws(() => createWorkbenchService({ repository: null }), /repository/i)
  assert.throws(() => createWorkbenchService({ repository: { get() {} } }), /replaceEditable/i)
  assert.throws(() => createWorkbenchService({
    repository: { get() {}, replaceEditable() {} },
    materialManager: createMaterialManager(),
  }), /mutate/i)
})

test('adds a confirmed material through the repository Workspace queue', async () => {
  const repository = createMutableRepository(createV3Record('workspace-a', 3))
  const managerCalls = []
  const materialManager = createMaterialManager({
    async confirm(workspaceId, relativePath, policy, referenceId, confirmedAt) {
      managerCalls.push({ workspaceId, relativePath, policy, referenceId, confirmedAt })
      return createMaterialReference({
        referenceId,
        relativePath: 'materials\\spec.md',
        observedAt: confirmedAt,
        confirmedAt,
      })
    },
  })
  const service = createWorkbenchService({
    repository,
    materialManager,
    clock: CLOCK,
    idFactory: () => 'ref-new',
  })

  const result = await service.addMaterial({
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 3,
    relativePath: 'materials/spec.md', confirmed: true,
  })
  assert.equal(result.committed, true)
  assert.deepEqual(result.current.tasks['task-a'].inputRefs, [createMaterialReference({
    referenceId: 'ref-new',
    relativePath: 'materials\\spec.md',
    observedAt: CLOCK(),
    confirmedAt: CLOCK(),
  })])
  assert.equal(managerCalls[0].policy.contentReadMode, 'metadata-only')
  assert.deepEqual(repository.calls.map((call) => call[0]), ['mutate'])
})

test('refreshes or removes only the current reference and preserves historical run snapshots', async () => {
  const initial = createV3Record('workspace-a', 5, { withEvidence: true })
  const historicalInput = structuredClone(initial.tasks['task-a'].runs['run-a'].inputSnapshot.inputRefs)
  const repository = createMutableRepository(initial)
  const materialManager = createMaterialManager({
    async refresh(_workspaceId, reference) {
      return createMaterialReference({ ...reference, sha256: 'd'.repeat(64), observedAt: CLOCK() })
    },
  })
  const service = createWorkbenchService({ repository, materialManager, clock: CLOCK, idFactory: () => 'unused' })

  const refreshed = await service.refreshMaterial({
    workspaceId: 'workspace-a', taskId: 'task-a', referenceId: 'ref-a', expectedRevision: 5,
  })
  assert.equal(refreshed.current.tasks['task-a'].inputRefs[0].referenceId, 'ref-a')
  assert.equal(refreshed.current.tasks['task-a'].inputRefs[0].sha256, 'd'.repeat(64))
  assert.deepEqual(refreshed.current.tasks['task-a'].runs['run-a'].inputSnapshot.inputRefs, historicalInput)

  const removed = await service.removeMaterial({
    workspaceId: 'workspace-a', taskId: 'task-a', referenceId: 'ref-a', expectedRevision: 6,
  })
  assert.deepEqual(removed.current.tasks['task-a'].inputRefs, [])
  assert.deepEqual(removed.current.tasks['task-a'].runs['run-a'].inputSnapshot.inputRefs, historicalInput)
})

test('rechecks task materials without mutating authoritative state', async () => {
  const initial = createV3Record('workspace-a', 2, { withEvidence: true })
  const repository = createMutableRepository(initial)
  const checked = [createMaterialReference({ observedAt: CLOCK() })]
  const materialManager = createMaterialManager({
    async recheckAll(workspaceId, references, policy) {
      assert.equal(workspaceId, 'workspace-a')
      assert.deepEqual(references, initial.tasks['task-a'].inputRefs)
      assert.equal(policy.maxFileBytes, 50 * 1024 * 1024)
      return checked
    },
  })
  const service = createWorkbenchService({ repository, materialManager })
  assert.deepEqual(await service.recheckTaskMaterials('workspace-a', 'task-a'), checked)
  assert.deepEqual(repository.calls.map((call) => call[0]), ['get'])
})

test('returns revision conflict before inspecting any file', async () => {
  const repository = createMutableRepository(createV3Record('workspace-a', 4))
  let inspected = false
  const materialManager = createMaterialManager({
    async confirm() { inspected = true; throw new Error('must not inspect') },
  })
  const service = createWorkbenchService({ repository, materialManager })
  const result = await service.addMaterial({
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 3,
    relativePath: 'materials\\spec.md', confirmed: true,
  })
  assert.equal(result.committed, false)
  assert.equal(result.reason, 'revision-conflict')
  assert.equal(inspected, false)
})

test('prepares writeback only from the authoritative approved run artifact', async () => {
  const repository = createMutableRepository(writebackReadyRecord())
  const writebackManager = createWritebackManager()
  const service = createWorkbenchService({
    repository,
    materialManager: createMaterialManager(),
    writebackManager,
  })
  const value = await service.prepareWriteback({
    workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-a',
    artifactId: `sha256:${RUN_ARTIFACT_SHA256}`, expectedRevision: 3,
    relativeDirectory: 'outputs\\run-a',
  })
  assert.equal(value.confirmationToken, 'secret-token')
  const input = writebackManager.calls[0][1]
  assert.equal(input.expectedRevision, 3)
  assert.deepEqual(input.artifact, createRunSnapshot().result.artifact)
  assert.equal(input.reviewStatus, 'approved')
  assert.equal(input.inputSha256, RUN_INPUT_SHA256)
  assert.deepEqual(repository.calls.map((call) => call[0]), ['get'])
})

test('prepares remote writeback metadata without the raw request key or provider price', async () => {
  const artifact = createRunSnapshot().result.artifact
  const run = {
    runId: 'remote-run-a',
    requestKey: 'remote-request-a',
    mode: 'oasis-legacy',
    status: 'completed',
    executionId: 'execution-a',
    providerSnapshot: {
      apiBaseOrigin: 'https://oasis-staging.example',
      apiId: 132,
      apiEndpoint: 'claims-v1',
      apiProcess: '整理,撰写',
      folderId: 8,
      price: 3,
    },
    inputSnapshot: {
      formValues: { User_input: '生成权利要求书' },
      inputRefs: [],
      sha256: 'b'.repeat(64),
      capturedAt: CLOCK(),
    },
    result: {
      answerText: '远程草稿',
      fileUrls: ['https://files-staging.example/result/claims.docx'],
      fileStatus: 'undownloaded-unverified',
      responseSha: 'c'.repeat(64),
      artifact,
    },
    review: { status: 'approved', note: '已人工检查', updatedAt: CLOCK() },
    writebacks: [],
    createdAt: CLOCK(),
    completedAt: CLOCK(),
  }
  const repository = createMutableRepository(runnableRecord(3, {
    runs: { [run.runId]: run },
    runOrder: [run.runId],
    activeRunId: run.runId,
  }))
  const writebackManager = createWritebackManager()
  const service = createWorkbenchService({
    repository,
    materialManager: createMaterialManager(),
    writebackManager,
  })

  await service.prepareWriteback({
    workspaceId: 'workspace-a', taskId: 'task-a', runId: run.runId,
    artifactId: artifact.artifactId, expectedRevision: 3,
    relativeDirectory: 'outputs\\remote-run-a',
  })

  const input = writebackManager.calls[0][1]
  assert.equal(input.mode, 'oasis-legacy')
  assert.equal(input.workflowId, undefined)
  assert.equal(input.workflowVersion, undefined)
  assert.deepEqual(input.remote, {
    executionId: 'execution-a',
    requestKeySha256: input.remote.requestKeySha256,
    provider: {
      apiBaseOrigin: 'https://oasis-staging.example',
      apiId: 132,
      apiEndpoint: 'claims-v1',
      apiProcess: '整理,撰写',
      folderId: 8,
    },
    files: {
      status: 'undownloaded-unverified',
      urls: ['https://files-staging.example/result/claims.docx'],
    },
  })
  assert.match(input.remote.requestKeySha256, /^[a-f0-9]{64}$/)
  assert.equal(JSON.stringify(input.remote).includes('remote-request-a'), false)
  assert.equal(JSON.stringify(input.remote).includes('price'), false)
})

test('rejects stale, unapproved, blocked, foreign-artifact, and over-limit prepare requests', async () => {
  const cases = [
    {
      code: 'WRITEBACK_REVISION_CONFLICT',
      record: writebackReadyRecord(4),
      request: { expectedRevision: 3 },
    },
    {
      code: 'WRITEBACK_REVIEW_REQUIRED',
      record: writebackReadyRecord(3, {
        review: { status: 'not-reviewed', note: '', updatedAt: CLOCK() },
      }),
    },
    {
      code: 'WRITEBACK_RUN_BLOCKED',
      record: writebackReadyRecord(3, {
        result: { ...createRunSnapshot().result, contentStatus: 'blocked' },
        review: { status: 'not-reviewed', note: '', updatedAt: CLOCK() },
      }),
    },
    {
      code: 'WRITEBACK_ARTIFACT_MISMATCH',
      record: writebackReadyRecord(),
      request: { artifactId: `sha256:${'e'.repeat(64)}` },
    },
    {
      code: 'WRITEBACK_LIMIT_REACHED',
      record: writebackReadyRecord(3, { writebacks: Array.from({ length: 8 }, (_, index) => (
        writebackRecord({ writebackId: `writeback-${index}` })
      )) }),
    },
  ]
  for (const item of cases) {
    const manager = createWritebackManager()
    const service = createWorkbenchService({
      repository: createMutableRepository(item.record),
      materialManager: createMaterialManager(),
      writebackManager: manager,
    })
    await expectServiceCode(service.prepareWriteback({
      workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-a',
      artifactId: `sha256:${RUN_ARTIFACT_SHA256}`, expectedRevision: 3,
      relativeDirectory: 'outputs\\run-a',
      ...item.request,
    }), item.code)
    assert.equal(manager.calls.length, 0)
  }
})

test('commits a consumed plan through one Host mutation and appends only a relative WritebackRecord', async () => {
  const repository = createMutableRepository(writebackReadyRecord())
  const writebackManager = createWritebackManager()
  const service = createWorkbenchService({
    repository,
    materialManager: createMaterialManager(),
    writebackManager,
  })
  const value = await service.commitWriteback({ confirmationToken: 'secret-token' })
  assert.equal(value.committed, true)
  assert.equal(value.current.revision, 4)
  assert.deepEqual(value.current.tasks['task-a'].runs['run-a'].writebacks, [writebackRecord()])
  assert.doesNotThrow(() => workbenchRecordSchema.parse(value.current))
  const serialized = JSON.stringify(value.current)
  assert.equal(serialized.includes('secret-token'), false)
  assert.equal(serialized.includes('D:\\workspace'), false)
  assert.deepEqual(writebackManager.calls.map((call) => call[0]), ['consume', 'publish'])
})

test('commit consumes the token but does not publish on revision conflict or stale plan identity', async () => {
  const conflictManager = createWritebackManager()
  const conflictService = createWorkbenchService({
    repository: createMutableRepository(writebackReadyRecord(4)),
    materialManager: createMaterialManager(),
    writebackManager: conflictManager,
  })
  const conflict = await conflictService.commitWriteback({ confirmationToken: 'secret-token' })
  assert.equal(conflict.committed, false)
  assert.deepEqual(conflictManager.calls.map((call) => call[0]), ['consume'])

  const staleManager = createWritebackManager({
    consume(token) {
      this.calls?.push?.(['consume', token])
      return {
        workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-a', expectedRevision: 3,
        artifactId: `sha256:${'e'.repeat(64)}`, relativeDirectory: 'outputs\\run-a',
      }
    },
  })
  const staleService = createWorkbenchService({
    repository: createMutableRepository(writebackReadyRecord()),
    materialManager: createMaterialManager(),
    writebackManager: staleManager,
  })
  await expectServiceCode(
    staleService.commitWriteback({ confirmationToken: 'secret-token' }),
    'WRITEBACK_PLAN_STALE',
  )
  assert.equal(staleManager.calls.some((call) => call[0] === 'publish'), false)
})

test('reports committed files separately when the Domain index write fails and keeps a safe recovery manifest', async () => {
  const initial = writebackReadyRecord()
  let published = false
  const writebackManager = createWritebackManager({
    async publish() { published = true; return writebackRecord() },
  })
  const repository = {
    get() { return structuredClone(initial) },
    async replaceEditable() { throw new Error('not used') },
    async mutate(_workspaceId, _expectedRevision, mutation) {
      await mutation(structuredClone(initial))
      throw new Error('Domain index offline')
    },
  }
  const service = createWorkbenchService({
    repository,
    materialManager: createMaterialManager(),
    writebackManager,
  })
  await assert.rejects(service.commitWriteback({ confirmationToken: 'secret-token' }), (error) => {
    assert.equal(error.code, 'WRITEBACK_COMMITTED_INDEX_FAILED')
    assert.equal(published, true)
    assert.equal(error.details.manifest.relativeDirectory, 'outputs\\run-a')
    const serialized = JSON.stringify(error.details)
    assert.equal(serialized.includes('secret-token'), false)
    assert.equal(serialized.includes('D:\\workspace'), false)
    assert.equal(serialized.includes(createRunSnapshot().result.artifact.body), false)
    return true
  })
})
