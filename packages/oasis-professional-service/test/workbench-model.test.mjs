import assert from 'node:assert/strict'
import test from 'node:test'

import {
  recordToWorkspaceState,
  reduceWorkspaceState,
  workspaceStateToDraft,
} from '../src/client/workbench-model.js'
import {
  NOW,
  createV3Record,
  recordToEditableDraft,
} from './workbench-fixtures.mjs'

const technicalWorkflow = Object.freeze({
  workflowId: 'remote-technical-rd',
  workflowVersion: '2026.08',
  workType: 'technical-rd',
  title: '远程目录中的研发工作流',
  description: '测试目录定义，而非 Client 硬编码。',
  executionMode: 'local-mock',
  materialPolicy: {
    acceptedExtensions: ['.md'],
    maxFiles: 8,
    maxFileBytes: 4096,
    contentReadMode: 'metadata-only',
  },
  outputSections: ['summary'],
  form: {
    fields: [
      { fieldId: 'objective', control: 'long-text', label: '目标', description: '', required: true, maxChars: 200 },
      { fieldId: 'constraints', control: 'string-list', label: '约束', description: '', required: false, maxItems: 3, itemMaxChars: 40 },
      {
        fieldId: 'evidence', control: 'select', label: '证据', description: '', required: true,
        options: [{ value: 'verified', label: '已核验' }],
      },
    ],
  },
})

test('maps Host evidence to pages but excludes it from editable replacement drafts', () => {
  const record = createV3Record('workspace-a', 4, { withEvidence: true, panelMode: 'expanded' })
  const state = recordToWorkspaceState(record)
  assert.equal(state.syncStatus, 'ready')
  assert.equal(state.pages[0].inputRefs.length, 1)
  assert.equal(state.pages[0].runOrder[0], 'run-a')
  assert.equal(state.pages[0].runs['run-a'].result.contentStatus, 'warning')

  const draft = workspaceStateToDraft(state)
  const expected = recordToEditableDraft(record)
  expected.schemaVersion = 4
  for (const task of Object.values(expected.tasks)) task.generation = null
  assert.deepEqual(draft, expected)
  assert.equal(Object.hasOwn(draft.tasks['task-a'], 'inputRefs'), false)
  assert.equal(Object.hasOwn(draft.tasks['task-a'], 'runs'), false)
})

test('fails closed when a persisted record contains malformed evidence', () => {
  const malformed = createV3Record('workspace-a', 1, { withEvidence: true })
  malformed.tasks['task-a'].runs['run-a'].result.artifact.sha256 = 'not-a-hash'
  assert.throws(() => recordToWorkspaceState(malformed))
})

test('creates tasks with durable schema-v4 defaults before workflow selection', () => {
  const state = recordToWorkspaceState(createV3Record('workspace-a', 0, { empty: true }))
  const next = reduceWorkspaceState(state, { type: 'create-page' }, {
    createId: () => 'task-created',
    now: () => NOW,
  })
  assert.deepEqual(next.pages[0], {
    pageId: 'task-created',
    title: '新任务',
    workType: null,
    workflowId: null,
    workflowVersion: null,
    inputRefs: [],
    formValues: {},
    professionalDraft: null,
    generation: null,
    activeRunId: null,
    runOrder: [],
    runs: {},
    remoteExecutionOrder: [],
    remoteExecutions: {},
    createdAt: NOW,
    updatedAt: NOW,
    view: 'chooser',
  })
  assert.equal(workspaceStateToDraft(next).schemaVersion, 4)
})

test('selects a remote workflow definition in place, updates form values, renames, and closes deterministically', () => {
  const env = { createId: () => 'task-a', now: () => NOW }
  let state = reduceWorkspaceState(
    recordToWorkspaceState(createV3Record('workspace-a', 0, { empty: true })),
    { type: 'create-page' },
    env,
  )
  state = reduceWorkspaceState(state, {
    type: 'select-workflow', pageId: 'task-a', workflow: technicalWorkflow,
  }, env)
  assert.equal(state.pages[0].pageId, 'task-a')
  assert.equal(state.pages[0].workType, 'technical-rd')
  assert.equal(state.pages[0].workflowId, 'remote-technical-rd')
  assert.equal(state.pages[0].workflowVersion, '2026.08')
  assert.equal(state.pages[0].title, '远程目录中的研发工作流')
  assert.deepEqual(state.pages[0].formValues, {
    objective: '',
    constraints: [],
    evidence: '',
  })
  assert.equal(state.pages[0].view, 'workspace')

  const selectedPage = state.pages[0]
  state = reduceWorkspaceState(state, {
    type: 'update-form-value', pageId: 'task-a', fieldId: 'objective', value: '降低泵组振动',
  }, env)
  assert.equal(state.pages[0].pageId, selectedPage.pageId)
  assert.equal(state.pages[0].formValues.objective, '降低泵组振动')
  assert.equal(workspaceStateToDraft(state).tasks['task-a'].formValues.objective, '降低泵组振动')

  state = reduceWorkspaceState(state, { type: 'rename-page', pageId: 'task-a', title: '泵站研发' }, env)
  assert.equal(state.pages[0].title, '泵站研发')
  state = reduceWorkspaceState(state, { type: 'close-page', pageId: 'task-a' }, env)
  assert.equal(state.activePageId, null)
  assert.deepEqual(state.pages, [])
})

test('does not mutate immutable run snapshots when the editable form diverges', () => {
  const record = createV3Record('workspace-a', 4, { withEvidence: true })
  record.tasks['task-a'].formValues = { objective: '旧草稿' }
  const state = recordToWorkspaceState(record)
  const previousSnapshot = structuredClone(state.pages[0].runs['run-a'].inputSnapshot.formValues)
  const next = reduceWorkspaceState(state, {
    type: 'update-form-value', pageId: 'task-a', fieldId: 'objective', value: '新草稿',
  }, { createId: () => 'unused', now: () => NOW })

  assert.equal(next.pages[0].formValues.objective, '新草稿')
  assert.deepEqual(next.pages[0].runs['run-a'].inputSnapshot.formValues, previousSnapshot)
})

test('activates an existing historical run without changing its snapshot', () => {
  const record = createV3Record('workspace-a', 4, { withEvidence: true })
  const second = structuredClone(record.tasks['task-a'].runs['run-a'])
  second.runId = 'run-b'
  second.requestKey = 'request-b'
  record.tasks['task-a'].runs['run-b'] = second
  record.tasks['task-a'].runOrder.push('run-b')
  const state = recordToWorkspaceState(record)
  const next = reduceWorkspaceState(state, {
    type: 'activate-run', pageId: 'task-a', runId: 'run-b',
  }, { createId: () => 'unused', now: () => NOW })

  assert.equal(next.pages[0].activeRunId, 'run-b')
  assert.deepEqual(next.pages[0].runs['run-a'], state.pages[0].runs['run-a'])
  assert.throws(() => reduceWorkspaceState(state, {
    type: 'activate-run', pageId: 'task-a', runId: 'missing',
  }, { createId: () => 'unused', now: () => NOW }), /unknown run/i)
})
