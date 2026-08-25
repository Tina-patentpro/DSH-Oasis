import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createEmptyWorkbenchRecord,
  oasisWorkbenchDomainSpec,
  parseWorkbenchDraft,
  parseWorkbenchRecord,
} from '../src/workbench-domain.js'

const NOW = '2026-08-25T00:00:00.000Z'

function createTask(taskId = 'task-a') {
  return {
    taskId,
    title: '未命名任务',
    workType: 'technical-rd',
    workflowId: 'workflow-a',
    workflowVersion: '1',
    inputRefs: [],
    formValues: {},
    run: null,
    preview: null,
    review: 'not-reviewed',
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function createRecord() {
  return {
    schemaVersion: 1,
    workspaceId: 'workspace-a',
    revision: 1,
    panelMode: 'normal',
    activeTaskId: 'task-a',
    taskOrder: ['task-a'],
    tasks: { 'task-a': createTask() },
    updatedAt: NOW,
  }
}

test('declares the fixed DSH domain identity and workspace table', () => {
  assert.equal(oasisWorkbenchDomainSpec.name, 'oasis_workbench')
  assert.equal(oasisWorkbenchDomainSpec.version, 1)
  assert.deepEqual(Object.keys(oasisWorkbenchDomainSpec.tables), ['workspaces'])
})

test('projects a deterministic, deeply frozen revision-zero state without materializing it', () => {
  const value = createEmptyWorkbenchRecord('workspace-a')

  assert.deepEqual(value, {
    schemaVersion: 1,
    workspaceId: 'workspace-a',
    revision: 0,
    panelMode: 'hidden',
    activeTaskId: null,
    taskOrder: [],
    tasks: {},
    updatedAt: '1970-01-01T00:00:00.000Z',
  })
  assert.equal(Object.isFrozen(value), true)
  assert.equal(Object.isFrozen(value.taskOrder), true)
  assert.equal(Object.isFrozen(value.tasks), true)
  assert.throws(() => value.taskOrder.push('task-a'), TypeError)
})

test('parses a complete record and returns a detached frozen value', () => {
  const source = createRecord()
  const parsed = parseWorkbenchRecord('workspace-a', source)

  assert.deepEqual(parsed, source)
  assert.notEqual(parsed, source)
  assert.notEqual(parsed.tasks['task-a'], source.tasks['task-a'])
  assert.equal(Object.isFrozen(parsed.tasks['task-a']), true)
  source.tasks['task-a'].title = 'mutated-after-parse'
  assert.equal(parsed.tasks['task-a'].title, '未命名任务')
})

test('accepts only the client-owned draft fields', () => {
  const { workspaceId: _workspaceId, revision: _revision, updatedAt: _updatedAt, ...draft } = createRecord()
  assert.deepEqual(parseWorkbenchDraft(draft), draft)
  assert.throws(() => parseWorkbenchDraft({ ...draft, revision: 2 }), /unrecognized|revision/i)
})

test('rejects unsupported schema versions and Workspace identity mismatch', () => {
  assert.throws(() => parseWorkbenchRecord('workspace-a', { ...createRecord(), schemaVersion: 2 }), /schemaVersion/i)
  assert.throws(() => parseWorkbenchRecord('workspace-b', createRecord()), /workspaceId/i)
})

test('rejects duplicate, missing, orphan, inactive, and map-key-mismatched tasks', () => {
  const duplicate = createRecord()
  duplicate.taskOrder.push('task-a')
  assert.throws(() => parseWorkbenchRecord('workspace-a', duplicate), /duplicate/i)

  const missing = createRecord()
  missing.taskOrder = ['task-missing']
  assert.throws(() => parseWorkbenchRecord('workspace-a', missing), /missing/i)

  const orphan = createRecord()
  orphan.tasks['task-orphan'] = createTask('task-orphan')
  assert.throws(() => parseWorkbenchRecord('workspace-a', orphan), /orphan/i)

  const inactive = createRecord()
  inactive.activeTaskId = 'task-missing'
  assert.throws(() => parseWorkbenchRecord('workspace-a', inactive), /activeTaskId/i)

  const mismatched = createRecord()
  mismatched.tasks['task-a'].taskId = 'task-b'
  assert.throws(() => parseWorkbenchRecord('workspace-a', mismatched), /map key/i)
})

test('rejects non-JSON form values and unknown record fields', () => {
  const nonJson = createRecord()
  nonJson.tasks['task-a'].formValues.callback = () => {}
  assert.throws(() => parseWorkbenchRecord('workspace-a', nonJson))
  assert.throws(() => parseWorkbenchRecord('workspace-a', { ...createRecord(), extra: true }), /unrecognized|extra/i)
})

test('rejects lexically ISO-looking timestamps that are not real calendar instants', () => {
  const invalid = createRecord()
  invalid.updatedAt = '2026-02-30T00:00:00.000Z'
  assert.throws(() => parseWorkbenchRecord('workspace-a', invalid), /ISO-8601/i)
})

test('rejects revisions outside the non-negative safe-integer range', () => {
  assert.throws(() => parseWorkbenchRecord('workspace-a', {
    ...createRecord(),
    revision: Number.MAX_SAFE_INTEGER + 1,
  }), /revision|safe/i)
})
