import assert from 'node:assert/strict'
import test from 'node:test'

import {
  WORKBENCH_LIMITS,
  workbenchDraftSchema,
  workbenchGetResponseSchema,
  workbenchRecordSchema,
  workbenchReplaceResponseSchema,
} from '../src/workbench-contract.js'

const NOW = '2026-08-25T00:00:00.000Z'

function createRecord() {
  return {
    schemaVersion: 1,
    workspaceId: 'workspace-a',
    revision: 1,
    panelMode: 'normal',
    activeTaskId: 'task-a',
    taskOrder: ['task-a'],
    tasks: {
      'task-a': {
        taskId: 'task-a',
        title: '技术研发任务',
        workType: 'technical-rd',
        workflowId: 'technical-rd',
        workflowVersion: '1',
        inputRefs: [],
        formValues: {},
        run: null,
        preview: null,
        review: 'not-reviewed',
        createdAt: NOW,
        updatedAt: NOW,
      },
    },
    updatedAt: NOW,
  }
}

function createTask(taskId) {
  return {
    ...createRecord().tasks['task-a'],
    taskId,
  }
}

function createDraftWithTasks(count) {
  const taskOrder = Array.from({ length: count }, (_, index) => `task-${index}`)
  return {
    schemaVersion: 1,
    panelMode: 'normal',
    activeTaskId: taskOrder[0] ?? null,
    taskOrder,
    tasks: Object.fromEntries(taskOrder.map((taskId) => [taskId, createTask(taskId)])),
  }
}

function nestArray(depth, leaf = 'value') {
  let value = leaf
  for (let index = 0; index < depth; index += 1) value = [value]
  return value
}

test('strictly validates complete records including nested task fields and root metadata', () => {
  assert.deepEqual(workbenchRecordSchema.parse(createRecord()), createRecord())

  const malformedTitle = createRecord()
  malformedTitle.tasks['task-a'].title = { text: 'not a string' }
  assert.throws(() => workbenchRecordSchema.parse(malformedTitle))

  assert.throws(() => workbenchRecordSchema.parse({ ...createRecord(), updatedAt: 'not-a-time' }))
  assert.throws(() => workbenchRecordSchema.parse({ ...createRecord(), extra: true }))
  assert.throws(() => workbenchRecordSchema.parse({ ...createRecord(), revision: Number.MAX_SAFE_INTEGER + 1 }))
})

test('strictly validates get and both replace response variants', () => {
  const current = createRecord()
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

  assert.throws(() => workbenchReplaceResponseSchema.parse({ committed: true }))
  assert.throws(() => workbenchReplaceResponseSchema.parse({ committed: false, reason: 'other', current }))
  assert.throws(() => workbenchReplaceResponseSchema.parse({ committed: true, current, extra: true }))
})

test('publishes immutable fixed Beta resource budgets', () => {
  assert.deepEqual(WORKBENCH_LIMITS, {
    maxTasksPerWorkspace: 32,
    maxInputRefsPerTask: 64,
    maxJsonDepth: 8,
    maxJsonArrayItems: 1024,
    maxJsonObjectKeys: 256,
    maxJsonStringBytes: 256 * 1024,
    maxDraftBytes: 1024 * 1024,
  })
  assert.equal(Object.isFrozen(WORKBENCH_LIMITS), true)
})

test('enforces task and input-reference cardinality at the boundary', () => {
  assert.doesNotThrow(() => workbenchDraftSchema.parse(createDraftWithTasks(32)))
  assert.throws(() => workbenchDraftSchema.parse(createDraftWithTasks(33)))

  const atLimit = createDraftWithTasks(1)
  atLimit.tasks['task-0'].inputRefs = Array.from({ length: 64 }, () => ({}))
  assert.doesNotThrow(() => workbenchDraftSchema.parse(atLimit))
  atLimit.tasks['task-0'].inputRefs.push({})
  assert.throws(() => workbenchDraftSchema.parse(atLimit))
})

test('enforces JSON depth, collection, key, and UTF-8 string budgets at the boundary', () => {
  const draft = createDraftWithTasks(1)
  const task = draft.tasks['task-0']

  task.formValues = { value: nestArray(8) }
  assert.doesNotThrow(() => workbenchDraftSchema.parse(draft))
  task.formValues = { value: nestArray(9) }
  assert.throws(() => workbenchDraftSchema.parse(draft))

  task.formValues = { value: Array.from({ length: 1024 }, () => null) }
  assert.doesNotThrow(() => workbenchDraftSchema.parse(draft))
  task.formValues.value.push(null)
  assert.throws(() => workbenchDraftSchema.parse(draft))

  task.formValues = Object.fromEntries(Array.from({ length: 256 }, (_, index) => [`key-${index}`, null]))
  assert.doesNotThrow(() => workbenchDraftSchema.parse(draft))
  task.formValues['key-256'] = null
  assert.throws(() => workbenchDraftSchema.parse(draft))

  task.formValues = { value: 'a'.repeat(256 * 1024) }
  assert.doesNotThrow(() => workbenchDraftSchema.parse(draft))
  task.formValues.value += 'a'
  assert.throws(() => workbenchDraftSchema.parse(draft))
})

test('enforces the serialized draft byte budget', () => {
  const draft = createDraftWithTasks(1)
  draft.tasks['task-0'].formValues = Object.fromEntries(
    Array.from({ length: 4 }, (_, index) => [`part-${index}`, 'a'.repeat(250 * 1024)]),
  )
  assert.doesNotThrow(() => workbenchDraftSchema.parse(draft))

  draft.tasks['task-0'].formValues['part-4'] = 'a'.repeat(250 * 1024)
  assert.throws(() => workbenchDraftSchema.parse(draft), /byte|size|large/i)
})
