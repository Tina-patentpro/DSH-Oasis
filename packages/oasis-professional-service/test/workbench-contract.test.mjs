import assert from 'node:assert/strict'
import test from 'node:test'

import {
  WORKBENCH_LIMITS,
  workbenchEditableDraftSchema,
  workbenchGetResponseSchema,
  workbenchRecordSchema,
  workbenchReplaceResponseSchema,
  writebackPrepareResponseSchema,
  writebackRecoveryManifestSchema,
} from '../src/workbench-contract.js'
import {
  createEditableDraft,
  createMaterialReference,
  createRunSnapshot,
  createV3Record,
  RUN_ARTIFACT_SHA256,
} from './workbench-fixtures.mjs'

function createDraftWithTasks(count) {
  const taskOrder = Array.from({ length: count }, (_, index) => `task-${index}`)
  return {
    schemaVersion: 3,
    panelMode: 'normal',
    activeTaskId: taskOrder[0] ?? null,
    taskOrder,
    tasks: Object.fromEntries(taskOrder.map((taskId) => [taskId, {
      taskId,
      title: '任务',
      workType: null,
      workflowId: null,
      workflowVersion: null,
      formValues: {},
      professionalDraft: null,
      activeRunId: null,
      createdAt: '2026-08-25T01:02:03.000Z',
      updatedAt: '2026-08-25T01:02:03.000Z',
    }])),
  }
}

function nestArray(depth, leaf = 'value') {
  let value = leaf
  for (let index = 0; index < depth; index += 1) value = [value]
  return value
}

test('strictly validates complete v3 records and both response variants', () => {
  const current = createV3Record('workspace-a', 1, { withEvidence: true })
  assert.deepEqual(workbenchRecordSchema.parse(current), current)
  assert.deepEqual(workbenchGetResponseSchema.parse(current), current)
  assert.deepEqual(workbenchReplaceResponseSchema.parse({ committed: true, current }), { committed: true, current })
  assert.deepEqual(workbenchReplaceResponseSchema.parse({
    committed: false,
    reason: 'revision-conflict',
    current,
  }), {
    committed: false,
    reason: 'revision-conflict',
    current,
  })
  assert.throws(() => workbenchRecordSchema.parse({ ...current, schemaVersion: 1 }))
  assert.throws(() => workbenchRecordSchema.parse({ ...current, extra: true }))
  assert.throws(() => workbenchReplaceResponseSchema.parse({ committed: true }))
})

test('publishes immutable fixed Week 3 resource budgets', () => {
  assert.deepEqual(WORKBENCH_LIMITS, {
    maxTasksPerWorkspace: 32,
    maxInputRefsPerTask: 64,
    maxRunsPerTask: 8,
    maxRemoteExecutionsPerTask: 8,
    maxWritebacksPerRun: 8,
    maxResultItems: 64,
    maxWritebackFiles: 2,
    maxReviewNoteChars: 2000,
    maxArtifactBytes: 256 * 1024,
    maxJsonDepth: 8,
    maxJsonArrayItems: 1024,
    maxJsonObjectKeys: 256,
    maxJsonStringBytes: 256 * 1024,
    maxDraftBytes: 1024 * 1024,
  })
  assert.equal(Object.isFrozen(WORKBENCH_LIMITS), true)
})

test('editable drafts reject Host-owned material, run, and writeback evidence', () => {
  const draft = createEditableDraft()
  assert.deepEqual(workbenchEditableDraftSchema.parse(draft), draft)
  for (const [field, value] of [
    ['inputRefs', [createMaterialReference()]],
    ['runOrder', ['run-a']],
    ['runs', { 'run-a': createRunSnapshot() }],
  ]) {
    const injected = structuredClone(draft)
    injected.tasks['task-a'][field] = value
    assert.throws(() => workbenchEditableDraftSchema.parse(injected), /unrecognized|extra/i)
  }
})

test('enforces material and run ownership invariants in complete records', () => {
  const record = createV3Record('workspace-a', 1, { withEvidence: true })
  const duplicate = structuredClone(record)
  duplicate.tasks['task-a'].runOrder.push('run-a')
  assert.throws(() => workbenchRecordSchema.parse(duplicate), /duplicate/i)

  const missing = structuredClone(record)
  missing.tasks['task-a'].runOrder = ['run-missing']
  assert.throws(() => workbenchRecordSchema.parse(missing), /missing/i)

  const orphan = structuredClone(record)
  orphan.tasks['task-a'].runs['run-orphan'] = createRunSnapshot({ runId: 'run-orphan' })
  assert.throws(() => workbenchRecordSchema.parse(orphan), /orphan/i)

  const mismatched = structuredClone(record)
  mismatched.tasks['task-a'].runs['run-a'].workflowId = 'other-workflow'
  assert.throws(() => workbenchRecordSchema.parse(mismatched), /workflow/i)

  const duplicateRequestKey = structuredClone(record)
  duplicateRequestKey.tasks['task-a'].runOrder.push('run-b')
  duplicateRequestKey.tasks['task-a'].runs['run-b'] = createRunSnapshot({ runId: 'run-b' })
  assert.throws(() => workbenchRecordSchema.parse(duplicateRequestKey), /request.*duplicate|duplicate.*request/i)

  const badWriteback = structuredClone(record)
  badWriteback.tasks['task-a'].runs['run-a'].writebacks = [{
    writebackId: 'writeback-a',
    artifactId: `sha256:${'d'.repeat(64)}`,
    relativeDirectory: 'output-a',
    files: [{ relativePath: 'output-a\\result.md', sha256: 'c'.repeat(64), mediaType: 'text/markdown' }],
    reviewStatus: 'approved',
    committedAt: '2026-08-25T01:02:03.000Z',
  }]
  assert.throws(() => workbenchRecordSchema.parse(badWriteback), /artifact/i)
})

test('enforces task, input-reference, and run cardinality', () => {
  assert.doesNotThrow(() => workbenchEditableDraftSchema.parse(createDraftWithTasks(32)))
  assert.throws(() => workbenchEditableDraftSchema.parse(createDraftWithTasks(33)))

  const record = createV3Record()
  record.tasks['task-a'].inputRefs = Array.from({ length: 64 }, (_, index) => createMaterialReference({ referenceId: `ref-${index}` }))
  assert.doesNotThrow(() => workbenchRecordSchema.parse(record))
  record.tasks['task-a'].inputRefs.push(createMaterialReference({ referenceId: 'ref-over' }))
  assert.throws(() => workbenchRecordSchema.parse(record))

  const runs = createV3Record()
  runs.tasks['task-a'].runOrder = Array.from({ length: 9 }, (_, index) => `run-${index}`)
  runs.tasks['task-a'].runs = Object.fromEntries(runs.tasks['task-a'].runOrder.map((runId) => [
    runId,
    createRunSnapshot({ runId }),
  ]))
  runs.tasks['task-a'].activeRunId = 'run-0'
  assert.throws(() => workbenchRecordSchema.parse(runs), /8|run/i)
})

test('enforces JSON and serialized draft budgets', () => {
  const draft = createEditableDraft()
  const task = draft.tasks['task-a']
  task.formValues = { value: nestArray(8) }
  assert.doesNotThrow(() => workbenchEditableDraftSchema.parse(draft))
  task.formValues = { value: nestArray(9) }
  assert.throws(() => workbenchEditableDraftSchema.parse(draft))

  task.formValues = { value: Array.from({ length: 1024 }, () => null) }
  assert.doesNotThrow(() => workbenchEditableDraftSchema.parse(draft))
  task.formValues.value.push(null)
  assert.throws(() => workbenchEditableDraftSchema.parse(draft))

  task.formValues = Object.fromEntries(Array.from({ length: 256 }, (_, index) => [`key-${index}`, null]))
  assert.doesNotThrow(() => workbenchEditableDraftSchema.parse(draft))
  task.formValues['key-256'] = null
  assert.throws(() => workbenchEditableDraftSchema.parse(draft))

  task.formValues = { value: 'a'.repeat(256 * 1024) }
  assert.doesNotThrow(() => workbenchEditableDraftSchema.parse(draft))
  task.formValues.value += 'a'
  assert.throws(() => workbenchEditableDraftSchema.parse(draft))

  const oversized = createEditableDraft()
  oversized.tasks['task-a'].formValues = Object.fromEntries(
    Array.from({ length: 5 }, (_, index) => [`part-${index}`, 'a'.repeat(250 * 1024)]),
  )
  assert.throws(() => workbenchEditableDraftSchema.parse(oversized), /byte|size|large/i)
})

test('enforces artifact bytes and review-note limits', () => {
  const record = createV3Record('workspace-a', 1, { withEvidence: true })
  record.tasks['task-a'].runs['run-a'].result.artifact.body = 'a'.repeat(256 * 1024)
  assert.doesNotThrow(() => workbenchRecordSchema.parse(record))
  record.tasks['task-a'].runs['run-a'].result.artifact.body += 'a'
  assert.throws(() => workbenchRecordSchema.parse(record), /artifact|byte/i)

  const note = createV3Record('workspace-a', 1, { withEvidence: true })
  note.tasks['task-a'].runs['run-a'].review.note = 'a'.repeat(2001)
  assert.throws(() => workbenchRecordSchema.parse(note), /review|2000|too big/i)
})

test('keeps absolute paths and confirmation tokens out of persisted and recovery writeback contracts', () => {
  const files = [
    { relativePath: 'outputs\\run-a\\result.md', sha256: RUN_ARTIFACT_SHA256, mediaType: 'text/markdown' },
    { relativePath: 'outputs\\run-a\\result.oasis.json', sha256: 'd'.repeat(64), mediaType: 'application/json' },
  ]
  const recovery = {
    schemaVersion: 1,
    workspaceId: 'workspace-a',
    taskId: 'task-a',
    runId: 'run-a',
    artifactId: `sha256:${RUN_ARTIFACT_SHA256}`,
    relativeDirectory: 'outputs\\run-a',
    files,
  }
  assert.deepEqual(writebackRecoveryManifestSchema.parse(recovery), recovery)
  for (const unsafe of [
    { ...recovery, absoluteTarget: 'D:\\workspace\\outputs\\run-a' },
    { ...recovery, relativeDirectory: 'D:\\workspace\\outputs\\run-a' },
    { ...recovery, files: [{ ...files[0], relativePath: 'D:\\workspace\\result.md' }, files[1]] },
  ]) {
    assert.throws(() => writebackRecoveryManifestSchema.parse(unsafe))
  }

  const prepared = {
    confirmationToken: 'secret-token',
    manifest: {
      ...recovery,
      absoluteTarget: 'D:\\workspace\\outputs\\run-a',
      files: files.map((file) => ({
        ...file,
        absolutePath: `D:\\workspace\\${file.relativePath}`,
        sizeBytes: 128,
      })),
      expiresAt: '2026-08-26T01:12:03.000Z',
    },
  }
  assert.deepEqual(writebackPrepareResponseSchema.parse(prepared), prepared)
  for (const unsafe of [
    { ...prepared.manifest, confirmationToken: 'secret-token' },
    { ...prepared.manifest, absoluteTarget: 'outputs\\run-a' },
    {
      ...prepared.manifest,
      files: [{ ...prepared.manifest.files[0], absolutePath: 'D:\\other\\result.md' }, prepared.manifest.files[1]],
    },
  ]) {
    assert.throws(() => writebackPrepareResponseSchema.parse({ ...prepared, manifest: unsafe }))
  }

  const record = createV3Record('workspace-a', 1, { withEvidence: true })
  record.tasks['task-a'].runs['run-a'].writebacks = [{
    writebackId: 'writeback-a',
    artifactId: recovery.artifactId,
    relativeDirectory: recovery.relativeDirectory,
    files,
    reviewStatus: 'approved',
    committedAt: '2026-08-26T01:02:03.000Z',
  }]
  assert.doesNotThrow(() => workbenchRecordSchema.parse(record))
  record.tasks['task-a'].runs['run-a'].writebacks[0].relativeDirectory = 'D:\\workspace\\outputs\\run-a'
  assert.throws(() => workbenchRecordSchema.parse(record), /relative|path/i)

  const outsideDirectory = createV3Record('workspace-a', 1, { withEvidence: true })
  outsideDirectory.tasks['task-a'].runs['run-a'].writebacks = [{
    writebackId: 'writeback-a',
    artifactId: recovery.artifactId,
    relativeDirectory: recovery.relativeDirectory,
    files: [{ ...files[0], relativePath: 'other\\result.md' }, files[1]],
    reviewStatus: 'approved',
    committedAt: '2026-08-26T01:02:03.000Z',
  }]
  assert.throws(() => workbenchRecordSchema.parse(outsideDirectory), /directory|path/i)
})
