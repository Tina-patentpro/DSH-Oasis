import assert from 'node:assert/strict'
import test from 'node:test'

import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'

const NOW = '2026-08-25T01:02:03.000Z'

function createState(workspaceId = 'workspace-a', revision = 0) {
  return {
    schemaVersion: 1,
    workspaceId,
    revision,
    panelMode: 'hidden',
    activeTaskId: null,
    taskOrder: [],
    tasks: {},
    updatedAt: revision === 0 ? '1970-01-01T00:00:00.000Z' : NOW,
  }
}

function createDraft() {
  const { workspaceId: _workspaceId, revision: _revision, updatedAt: _updatedAt, ...draft } = createState()
  return draft
}

test('dispatches only the two workbench state endpoints', async () => {
  const calls = []
  const repository = {
    get(workspaceId) {
      calls.push(['get', workspaceId])
      return createState(workspaceId)
    },
    async replace(workspaceId, expectedRevision, state) {
      calls.push(['replace', workspaceId, expectedRevision, state])
      return { committed: true, current: createState(workspaceId, 1) }
    },
  }
  const handler = createWorkbenchRpcHandler(repository)

  assert.deepEqual(await handler('state/get', { workspaceId: 'workspace-a' }), {
    ok: true,
    value: createState('workspace-a'),
  })
  assert.deepEqual(await handler('state/replace', {
    workspaceId: 'workspace-a',
    expectedRevision: 0,
    state: createDraft(),
  }), {
    ok: true,
    value: { committed: true, current: createState('workspace-a', 1) },
  })
  assert.deepEqual(calls.map((call) => call[0]), ['get', 'replace'])
})

test('returns revision conflict as a successful business payload', async () => {
  const current = createState('workspace-a', 2)
  const handler = createWorkbenchRpcHandler({
    async replace() {
      return { committed: false, reason: 'revision-conflict', current }
    },
  })

  assert.deepEqual(await handler('state/replace', {
    workspaceId: 'workspace-a',
    expectedRevision: 1,
    state: createDraft(),
  }), {
    ok: true,
    value: { committed: false, reason: 'revision-conflict', current },
  })
})

test('maps unknown endpoints, extra fields, and injected identity fields to bad-request', async () => {
  const handler = createWorkbenchRpcHandler({
    get() {
      throw new Error('repository must not be called')
    },
    async replace() {
      throw new Error('repository must not be called')
    },
  })

  for (const [endpoint, payload] of [
    ['state/delete', { workspaceId: 'workspace-a' }],
    ['state/get', { workspaceId: 'workspace-a', extra: true }],
    ['state/replace', {
      workspaceId: 'workspace-a',
      expectedRevision: 0,
      state: { ...createDraft(), workspaceId: 'workspace-b' },
    }],
  ]) {
    const result = await handler(endpoint, payload)
    assert.equal(result.ok, false)
    assert.equal(result.error.code, 'bad-request')
    assert.equal(Array.isArray(result.error.details.issues), true)
    assert.equal(result.error.details.issues.length > 0, true)
  }
})

test('does not disguise repository infrastructure failures as business results', async () => {
  const handler = createWorkbenchRpcHandler({
    get() {
      throw new Error('storage corrupt')
    },
  })

  await assert.rejects(handler('state/get', { workspaceId: 'workspace-a' }), /storage corrupt/)
})

test('rejects over-budget workspace drafts before calling the repository', async () => {
  const handler = createWorkbenchRpcHandler({
    async replace() {
      throw new Error('repository must not be called')
    },
  })
  const state = createDraft()
  state.taskOrder = Array.from({ length: 33 }, (_, index) => `task-${index}`)
  state.activeTaskId = state.taskOrder[0]
  state.tasks = Object.fromEntries(state.taskOrder.map((taskId) => [taskId, {
    taskId,
    title: '任务',
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
  }]))

  const result = await handler('state/replace', {
    workspaceId: 'workspace-a',
    expectedRevision: 0,
    state,
  })
  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'bad-request')
})
