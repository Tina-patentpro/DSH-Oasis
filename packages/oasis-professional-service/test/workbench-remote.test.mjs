import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createWorkbenchRemote,
  WorkbenchRemoteError,
} from '../src/client/workbench-remote.js'

const NOW = '2026-08-25T00:00:00.000Z'

function createRecord(revision = 0) {
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

test('uses the dedicated DSH Connection channel for get and replace', async () => {
  const calls = []
  const connection = {
    rpc: {
      async call(channel, endpoint, payload, signal) {
        calls.push({ channel, endpoint, payload, signal })
        return {
          ok: true,
          value: endpoint === 'state/get'
            ? createRecord(3)
            : { committed: true, current: createRecord(4) },
        }
      },
    },
  }
  const remote = createWorkbenchRemote(connection)
  const signal = new AbortController().signal

  assert.deepEqual(await remote.get('workspace-a', signal), createRecord(3))
  assert.deepEqual(await remote.replace('workspace-a', 3, { schemaVersion: 1 }, signal), {
    committed: true,
    current: createRecord(4),
  })
  assert.deepEqual(calls, [
    {
      channel: '/oasis-workbench',
      endpoint: 'state/get',
      payload: { workspaceId: 'workspace-a' },
      signal,
    },
    {
      channel: '/oasis-workbench',
      endpoint: 'state/replace',
      payload: { workspaceId: 'workspace-a', expectedRevision: 3, state: { schemaVersion: 1 } },
      signal,
    },
  ])
})

test('turns DSH RpcResult errors into typed client errors without losing the code', async () => {
  const remote = createWorkbenchRemote({
    rpc: {
      async call() {
        return {
          ok: false,
          error: { code: 'bad-request', message: 'invalid state', details: { issues: [] } },
        }
      },
    },
  })

  await assert.rejects(remote.get('workspace-a'), (error) => {
    assert.equal(error instanceof WorkbenchRemoteError, true)
    assert.equal(error.code, 'bad-request')
    assert.deepEqual(error.details, { issues: [] })
    return true
  })
})

test('fails closed on malformed Connection results', async () => {
  const remote = createWorkbenchRemote({ rpc: { async call() { return { value: 'missing discriminator' } } } })
  await assert.rejects(remote.get('workspace-a'), /malformed/i)
})

test('fails closed on malformed nested get and replace payloads', async () => {
  const malformed = createRecord(1)
  malformed.tasks = {
    'task-a': {
      taskId: 'task-a',
      title: { text: 'not a string' },
    },
  }
  malformed.taskOrder = ['task-a']
  malformed.activeTaskId = 'task-a'

  for (const value of [malformed, { committed: true, current: malformed }]) {
    const remote = createWorkbenchRemote({ rpc: { async call() { return { ok: true, value } } } })
    const operation = value.committed === true
      ? remote.replace('workspace-a', 0, { schemaVersion: 1 })
      : remote.get('workspace-a')
    await assert.rejects(operation, (error) => {
      assert.equal(error instanceof WorkbenchRemoteError, true)
      assert.equal(error.code, 'malformed-response')
      return true
    })
  }
})
