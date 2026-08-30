import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createWorkbenchRemote,
  WorkbenchRemoteError,
} from '../src/client/workbench-remote.js'
import {
  createEditableDraft,
  createV2Record,
} from './workbench-fixtures.mjs'

test('uses the dedicated DSH Connection channel for schema-v2 get and replace', async () => {
  const calls = []
  const connection = {
    rpc: {
      async call(channel, endpoint, payload, signal) {
        calls.push({ channel, endpoint, payload, signal })
        return {
          ok: true,
          value: endpoint === 'state/get'
            ? createV2Record('workspace-a', 3, { empty: true })
            : { committed: true, current: createV2Record('workspace-a', 4, { empty: true }) },
        }
      },
    },
  }
  const remote = createWorkbenchRemote(connection)
  const signal = new AbortController().signal
  const draft = createEditableDraft()

  assert.deepEqual(await remote.get('workspace-a', signal), createV2Record('workspace-a', 3, { empty: true }))
  assert.deepEqual(await remote.replace('workspace-a', 3, draft, signal), {
    committed: true,
    current: createV2Record('workspace-a', 4, { empty: true }),
  })
  assert.deepEqual(calls, [
    { channel: '/oasis-workbench', endpoint: 'state/get', payload: { workspaceId: 'workspace-a' }, signal },
    {
      channel: '/oasis-workbench', endpoint: 'state/replace',
      payload: { workspaceId: 'workspace-a', expectedRevision: 3, state: draft }, signal,
    },
  ])
})

test('turns DSH RpcResult errors into typed Client errors', async () => {
  const remote = createWorkbenchRemote({
    rpc: { async call() { return { ok: false, error: { code: 'bad-request', message: 'invalid state', details: { issues: [] } } } } },
  })
  await assert.rejects(remote.get('workspace-a'), (error) => {
    assert.equal(error instanceof WorkbenchRemoteError, true)
    assert.equal(error.code, 'bad-request')
    assert.deepEqual(error.details, { issues: [] })
    return true
  })
})

test('loads and strictly validates the Host workflow catalog', async () => {
  const calls = []
  const value = {
    schemaVersion: 1,
    workflows: [{
      workflowId: 'technical-rd',
      workflowVersion: '1',
      workType: 'technical-rd',
      title: '技术研发辅助',
      description: '本地演练',
      executionMode: 'local-mock',
      materialPolicy: {
        acceptedExtensions: ['.md'], maxFiles: 64, maxFileBytes: 50 * 1024 * 1024, contentReadMode: 'metadata-only',
      },
      outputSections: ['problem-decomposition'],
      form: { fields: [] },
    }],
  }
  const remote = createWorkbenchRemote({
    rpc: {
      async call(channel, endpoint, payload, signal) {
        calls.push({ channel, endpoint, payload, signal })
        return { ok: true, value }
      },
    },
  })
  const signal = new AbortController().signal
  assert.deepEqual(await remote.getWorkflowCatalog('technical-rd', signal), value)
  assert.deepEqual(calls, [{
    channel: '/oasis-workbench', endpoint: 'workflow/catalog', payload: { workType: 'technical-rd' }, signal,
  }])

  const malformed = createWorkbenchRemote({ rpc: { async call() { return { ok: true, value: { schemaVersion: 1 } } } } })
  await assert.rejects(malformed.getWorkflowCatalog(), /malformed/i)
})

test('fails closed on malformed Connection and nested v2 results', async () => {
  const malformed = createV2Record('workspace-a', 1, { withEvidence: true })
  malformed.tasks['task-a'].runs['run-a'].result.artifact.sha256 = 'invalid'

  for (const value of [
    { value: 'missing discriminator' },
    { ok: true, value: malformed },
    { ok: true, value: { committed: true, current: malformed } },
  ]) {
    const remote = createWorkbenchRemote({ rpc: { async call() { return value } } })
    const operation = value.value?.committed === true
      ? remote.replace('workspace-a', 0, createEditableDraft())
      : remote.get('workspace-a')
    await assert.rejects(operation, /malformed/i)
  }
})

test('calls strict material endpoints and validates their authoritative replacement results', async () => {
  const calls = []
  const value = { committed: true, current: createV2Record('workspace-a', 4, { withEvidence: true }) }
  const remote = createWorkbenchRemote({
    rpc: {
      async call(channel, endpoint, payload, signal) {
        calls.push({ channel, endpoint, payload, signal })
        return { ok: true, value }
      },
    },
  })
  const signal = new AbortController().signal
  const add = {
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 3,
    relativePath: 'materials\\spec.md', confirmed: true,
  }
  const refresh = { workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 3, referenceId: 'ref-a' }
  const remove = { ...refresh }

  assert.deepEqual(await remote.addMaterial(add, signal), value)
  assert.deepEqual(await remote.refreshMaterial(refresh, signal), value)
  assert.deepEqual(await remote.removeMaterial(remove, signal), value)
  assert.deepEqual(calls, [
    { channel: '/oasis-workbench', endpoint: 'material/add', payload: add, signal },
    { channel: '/oasis-workbench', endpoint: 'material/refresh', payload: refresh, signal },
    { channel: '/oasis-workbench', endpoint: 'material/remove', payload: remove, signal },
  ])

  const malformed = createWorkbenchRemote({ rpc: { async call() { return { ok: true, value: { committed: true } } } } })
  await assert.rejects(malformed.addMaterial(add), /malformed/i)
})

test('calls task create and review endpoints and validates authoritative replacement results', async () => {
  const calls = []
  const value = { committed: true, current: createV2Record('workspace-a', 4, { withEvidence: true }) }
  const remote = createWorkbenchRemote({
    rpc: {
      async call(channel, endpoint, payload, signal) {
        calls.push({ channel, endpoint, payload, signal })
        return { ok: true, value }
      },
    },
  })
  const signal = new AbortController().signal
  const create = {
    workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 3, requestKey: 'request-a',
  }
  const review = {
    workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-a', expectedRevision: 3,
    status: 'approved', note: '已人工检查结构',
  }

  assert.deepEqual(await remote.createRun(create, signal), value)
  assert.deepEqual(await remote.reviewRun(review, signal), value)
  assert.deepEqual(calls, [
    { channel: '/oasis-workbench', endpoint: 'task/create', payload: create, signal },
    { channel: '/oasis-workbench', endpoint: 'task/review', payload: review, signal },
  ])

  const malformed = createWorkbenchRemote({ rpc: { async call() { return { ok: true, value: { committed: true } } } } })
  await assert.rejects(malformed.createRun(create), /malformed/i)
  await assert.rejects(malformed.reviewRun(review), /malformed/i)
})

test('calls two-phase writeback endpoints and fails closed on malformed manifests', async () => {
  const calls = []
  const prepared = {
    confirmationToken: 'secret-token',
    manifest: {
      schemaVersion: 1,
      workspaceId: 'workspace-a',
      taskId: 'task-a',
      runId: 'run-a',
      artifactId: `sha256:${'c'.repeat(64)}`,
      relativeDirectory: 'outputs\\run-a',
      absoluteTarget: 'D:\\workspace\\outputs\\run-a',
      files: [
        {
          relativePath: 'outputs\\run-a\\result.md', absolutePath: 'D:\\workspace\\outputs\\run-a\\result.md',
          sizeBytes: 24, sha256: 'c'.repeat(64), mediaType: 'text/markdown',
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
  const committed = { committed: true, current: createV2Record('workspace-a', 4, { withEvidence: true }) }
  const remote = createWorkbenchRemote({
    rpc: {
      async call(channel, endpoint, payload, signal) {
        calls.push({ channel, endpoint, payload, signal })
        return { ok: true, value: endpoint === 'artifact/prepare-writeback' ? prepared : committed }
      },
    },
  })
  const signal = new AbortController().signal
  const prepare = {
    workspaceId: 'workspace-a', taskId: 'task-a', runId: 'run-a', expectedRevision: 3,
    artifactId: `sha256:${'c'.repeat(64)}`, relativeDirectory: 'outputs\\run-a',
  }
  assert.deepEqual(await remote.prepareWriteback(prepare, signal), prepared)
  assert.deepEqual(await remote.commitWriteback('secret-token', signal), committed)
  assert.deepEqual(calls, [
    { channel: '/oasis-workbench', endpoint: 'artifact/prepare-writeback', payload: prepare, signal },
    {
      channel: '/oasis-workbench', endpoint: 'artifact/commit-writeback',
      payload: { confirmationToken: 'secret-token' }, signal,
    },
  ])

  const malformed = createWorkbenchRemote({
    rpc: { async call() { return { ok: true, value: { confirmationToken: 'secret-token', manifest: {} } } } },
  })
  await assert.rejects(malformed.prepareWriteback(prepare), /malformed/i)
})
