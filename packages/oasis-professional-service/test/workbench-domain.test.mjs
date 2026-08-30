import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import {
  createCanonicalInputSnapshot,
  runLocalMock,
} from '../src/local-mock-runner.js'
import {
  createEmptyWorkbenchRecord,
  oasisWorkbenchDomainSpec,
  parseWorkbenchEditableDraft,
  parseWorkbenchRecord,
  parseStoredWorkbenchRecord,
} from '../src/workbench-domain.js'
import {
  NOW,
  createEditableDraft,
  createLegacyRecord,
  createMaterialReference,
  createRunSnapshot,
  createV2Record,
} from './workbench-fixtures.mjs'

test('keeps the fixed DSH Domain identity while the record schema advances', () => {
  assert.equal(oasisWorkbenchDomainSpec.name, 'oasis_workbench')
  assert.equal(oasisWorkbenchDomainSpec.version, 1)
  assert.deepEqual(Object.keys(oasisWorkbenchDomainSpec.tables), ['workspaces'])
})

test('projects a deterministic deeply frozen schema-v2 revision-zero state', () => {
  const value = createEmptyWorkbenchRecord('workspace-a')
  assert.deepEqual(value, createV2Record('workspace-a', 0, { empty: true }))
  assert.equal(Object.isFrozen(value), true)
  assert.equal(Object.isFrozen(value.taskOrder), true)
  assert.equal(Object.isFrozen(value.tasks), true)
  assert.throws(() => value.taskOrder.push('task-a'), TypeError)
})

test('parses complete and stored records into detached frozen schema-v2 values', () => {
  for (const source of [createV2Record(), createLegacyRecord()]) {
    const parsed = source.schemaVersion === 2
      ? parseWorkbenchRecord('workspace-a', source)
      : parseStoredWorkbenchRecord('workspace-a', source)
    assert.equal(parsed.schemaVersion, 2)
    assert.notEqual(parsed, source)
    assert.equal(Object.isFrozen(parsed.tasks['task-a']), true)
  }
})

test('accepts only the Client-owned editable projection', () => {
  const draft = createEditableDraft()
  assert.deepEqual(parseWorkbenchEditableDraft(draft), draft)
  assert.throws(() => parseWorkbenchEditableDraft({ ...draft, revision: 2 }), /unrecognized|revision/i)

  const injected = structuredClone(draft)
  injected.tasks['task-a'].runs = {}
  assert.throws(() => parseWorkbenchEditableDraft(injected), /unrecognized|runs/i)
})

test('rejects unknown versions, identity mismatch, invalid calendar times, and unsafe revisions', () => {
  assert.throws(() => parseStoredWorkbenchRecord('workspace-a', { ...createV2Record(), schemaVersion: 3 }), /unsupported/i)
  assert.throws(() => parseWorkbenchRecord('workspace-b', createV2Record()), /workspaceId/i)

  const invalidTime = createV2Record()
  invalidTime.updatedAt = '2026-02-30T00:00:00.000Z'
  assert.throws(() => parseWorkbenchRecord('workspace-a', invalidTime), /ISO-8601/i)

  assert.throws(() => parseWorkbenchRecord('workspace-a', {
    ...createV2Record(),
    revision: Number.MAX_SAFE_INTEGER + 1,
  }), /revision|safe/i)
})

test('rejects task-order and map inconsistencies after migration', () => {
  const duplicate = createV2Record()
  duplicate.taskOrder.push('task-a')
  assert.throws(() => parseWorkbenchRecord('workspace-a', duplicate), /duplicate/i)

  const missing = createV2Record()
  missing.taskOrder = ['task-missing']
  assert.throws(() => parseWorkbenchRecord('workspace-a', missing), /missing/i)

  const orphan = createV2Record()
  orphan.tasks['task-orphan'] = { ...orphan.tasks['task-a'], taskId: 'task-orphan' }
  assert.throws(() => parseWorkbenchRecord('workspace-a', orphan), /orphan/i)

  const mismatch = createV2Record()
  mismatch.tasks['task-a'].taskId = 'task-b'
  assert.throws(() => parseWorkbenchRecord('workspace-a', mismatch), /map key/i)
})

test('rejects stored runs whose canonical input or artifact body no longer matches its digest', () => {
  const inputTampered = createV2Record('workspace-a', 1, { withEvidence: true })
  inputTampered.tasks['task-a'].runs['run-a'].inputSnapshot.formValues.objective = '篡改后的目标'
  assert.throws(
    () => parseStoredWorkbenchRecord('workspace-a', inputTampered),
    /input integrity.*task-a.*run-a/i,
  )

  const artifactTampered = createV2Record('workspace-a', 1, { withEvidence: true })
  artifactTampered.tasks['task-a'].runs['run-a'].result.artifact.body += '篡改'
  assert.throws(
    () => parseStoredWorkbenchRecord('workspace-a', artifactTampered),
    /artifact integrity.*task-a.*run-a/i,
  )
})

test('rejects every persisted local-mock result field that differs from deterministic replay', () => {
  function createReplayableRecord() {
    const inputSnapshot = createCanonicalInputSnapshot({
      workflowId: 'technical-rd',
      workflowVersion: '1',
      formValues: {
        objective: '降低能耗',
        currentState: '已有能耗基线',
        evidenceStatus: 'verified',
        expectedDeliverable: '技术验证计划',
        constraints: ['不改变核心设备'],
      },
      inputRefs: [createMaterialReference()],
      capturedAt: '2026-08-25T01:02:03.000Z',
    })
    const result = runLocalMock({
      workflowId: 'technical-rd',
      workflowVersion: '1',
      inputSnapshot,
    })
    const record = createV2Record('workspace-a', 1, { withEvidence: true })
    record.tasks['task-a'].runs['run-a'] = createRunSnapshot({
      inputSnapshot: structuredClone(inputSnapshot),
      result: structuredClone(result),
    })
    return record
  }

  const corruptions = [
    ['contentStatus', (result) => { result.contentStatus = 'blocked' }],
    ['sections', (result) => { result.sections[0].body += '篡改' }],
    ['risks', (result) => { result.risks.push('篡改风险') }],
    ['questions', (result) => { result.questions.push('篡改问题') }],
    ['disclaimer', (result) => { result.disclaimer += '篡改' }],
    ['artifact metadata', (result) => { result.artifact.suggestedFileName = 'tampered.md' }],
    ['artifact body with matching forged digests', (result) => {
      result.artifact.body += '篡改但同步更新摘要'
      result.artifact.sha256 = createHash('sha256').update(result.artifact.body, 'utf8').digest('hex')
      result.artifact.artifactId = `sha256:${result.artifact.sha256}`
    }],
  ]

  for (const [field, corrupt] of corruptions) {
    const record = createReplayableRecord()
    corrupt(record.tasks['task-a'].runs['run-a'].result)
    assert.throws(
      () => parseStoredWorkbenchRecord('workspace-a', record),
      /result integrity.*task-a.*run-a/i,
      `must reject corrupted ${field}`,
    )
  }
})

test('keeps legitimate human review and writeback lifecycle fields outside result replay', () => {
  const record = createV2Record('workspace-a', 2, { withEvidence: true })
  const run = record.tasks['task-a'].runs['run-a']
  run.review = {
    status: 'approved',
    note: '已由人工复核结构和材料元数据。',
    updatedAt: NOW,
  }
  run.writebacks = [{
    writebackId: 'writeback-a',
    artifactId: run.result.artifact.artifactId,
    relativeDirectory: 'outputs\\run-a',
    files: [
      {
        relativePath: 'outputs\\run-a\\result.md',
        sha256: run.result.artifact.sha256,
        mediaType: 'text/markdown',
      },
      {
        relativePath: 'outputs\\run-a\\result.oasis.json',
        sha256: 'b'.repeat(64),
        mediaType: 'application/json',
      },
    ],
    reviewStatus: 'approved',
    committedAt: NOW,
  }]

  assert.doesNotThrow(() => parseStoredWorkbenchRecord('workspace-a', record))
})
