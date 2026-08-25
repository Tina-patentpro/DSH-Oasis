import assert from 'node:assert/strict'
import test from 'node:test'

import {
  recordToWorkspaceState,
  reduceWorkspaceState,
  workspaceStateToDraft,
} from '../src/client/workbench-model.js'

const NOW = '2026-08-25T02:00:00.000Z'

function emptyRecord(revision = 0) {
  return {
    schemaVersion: 1,
    workspaceId: 'workspace-a',
    revision,
    panelMode: 'hidden',
    activeTaskId: null,
    taskOrder: [],
    tasks: {},
    updatedAt: revision === 0 ? '1970-01-01T00:00:00.000Z' : NOW,
  }
}

test('maps a persisted record to UI pages and back without transport metadata', () => {
  const record = {
    ...emptyRecord(4),
    panelMode: 'expanded',
    activeTaskId: 'task-a',
    taskOrder: ['task-a'],
    tasks: {
      'task-a': {
        taskId: 'task-a',
        title: '专利任务',
        workType: 'cn-invention-patent',
        workflowId: 'cn-invention-patent',
        workflowVersion: '1',
        inputRefs: [],
        formValues: { invention: 'demo' },
        run: null,
        preview: null,
        review: 'not-reviewed',
        createdAt: NOW,
        updatedAt: NOW,
      },
    },
  }

  const state = recordToWorkspaceState(record)
  assert.equal(state.syncStatus, 'ready')
  assert.equal(state.activePageId, 'task-a')
  assert.equal(state.pages[0].view, 'workspace')
  assert.equal(state.pages[0].formValues.invention, 'demo')
  assert.deepEqual(workspaceStateToDraft(state), {
    schemaVersion: 1,
    panelMode: 'expanded',
    activeTaskId: 'task-a',
    taskOrder: ['task-a'],
    tasks: record.tasks,
  })
})

test('fails closed when a persisted record contains malformed nested task data', () => {
  const malformed = {
    ...emptyRecord(1),
    activeTaskId: 'task-a',
    taskOrder: ['task-a'],
    tasks: {
      'task-a': {
        taskId: 'task-a',
        title: { text: 'not a string' },
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
  }

  assert.throws(() => recordToWorkspaceState(malformed))
})

test('creates UUID-backed tasks with all durable defaults before workflow selection', () => {
  const state = recordToWorkspaceState(emptyRecord())
  const next = reduceWorkspaceState(state, { type: 'create-page' }, {
    createId: () => 'task-created',
    now: () => NOW,
  })

  assert.equal(next.activePageId, 'task-created')
  assert.deepEqual(next.pages[0], {
    pageId: 'task-created',
    title: '新任务',
    workType: null,
    workflowId: null,
    workflowVersion: null,
    inputRefs: [],
    formValues: {},
    run: null,
    preview: null,
    review: 'not-reviewed',
    createdAt: NOW,
    updatedAt: NOW,
    view: 'chooser',
  })
})

test('selects a workflow, renames a task, and closes the active task deterministically', () => {
  const env = { createId: () => 'task-a', now: () => NOW }
  let state = reduceWorkspaceState(recordToWorkspaceState(emptyRecord()), { type: 'create-page' }, env)
  state = reduceWorkspaceState(state, {
    type: 'select-workflow', pageId: 'task-a', workflowId: 'technical-rd',
  }, env)
  assert.equal(state.pages[0].workType, 'technical-rd')
  assert.equal(state.pages[0].title, '技术研发辅助')
  assert.equal(state.pages[0].view, 'workspace')

  state = reduceWorkspaceState(state, { type: 'rename-page', pageId: 'task-a', title: '泵站研发' }, env)
  assert.equal(state.pages[0].title, '泵站研发')
  state = reduceWorkspaceState(state, { type: 'close-page', pageId: 'task-a' }, env)
  assert.equal(state.activePageId, null)
  assert.deepEqual(state.pages, [])
})
