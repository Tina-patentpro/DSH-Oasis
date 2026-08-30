import assert from 'node:assert/strict'
import { Context, Service } from '@deepseek-ai/cordis'
import { ToolRuntime } from '@deepseek-ai/dsh-tools'
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import * as oasisPlugin from '../src/index.js'
import { createEditableDraft } from './workbench-fixtures.mjs'

let storageDomainStub
let connectionStub
let workspaceRegistryStub

class SystemPromptStub extends Service {
  constructor(ctx) {
    super(ctx, 'systemPrompt')
  }

  tools() {
    return () => {}
  }

  section() {
    return () => {}
  }
}

class StorageDomainStub extends Service {
  constructor(ctx) {
    super(ctx, 'storageDomain')
    storageDomainStub = this
    this.records = new Map()
    this.closed = 0
  }

  async open(spec) {
    assert.equal(spec.name, 'oasis_workbench')
    return {
      table: () => ({
        get: (key) => this.records.get(key),
        put: async (key, value) => { this.records.set(key, value) },
      }),
      close: async () => { this.closed += 1 },
    }
  }
}

class ConnectionStub extends Service {
  constructor(ctx) {
    super(ctx, 'connection')
    connectionStub = this
    this.disposed = 0
    this.registration = undefined
    this.rpc = {
      handle: (channel, handler, options) => {
        this.registration = { channel, handler, options }
        return async () => { this.disposed += 1 }
      },
    }
  }
}

class WorkspaceRegistryStub extends Service {
  constructor(ctx) {
    super(ctx, 'workspaceRegistry')
    workspaceRegistryStub = this
    this.workspace = undefined
  }

  get(workspaceId) {
    return workspaceId === this.workspace?.id ? this.workspace : undefined
  }
}

test('real Cordis tools service lists and executes oasis_workbench_status', async () => {
  const root = new Context()
  const tempRoot = await mkdtemp(join(tmpdir(), 'oasis-host-materials-'))
  try {
    await root.plugin(SystemPromptStub)
    await root.plugin(ToolRuntime)
    await root.plugin(StorageDomainStub)
    await root.plugin(ConnectionStub)
    await root.plugin(WorkspaceRegistryStub)
    const workspacePath = join(tempRoot, 'workspace')
    await mkdir(join(workspacePath, 'materials'), { recursive: true })
    await writeFile(join(workspacePath, 'materials', 'spec.md'), 'Host material integration fixture')
    workspaceRegistryStub.workspace = {
      id: 'workspace-a',
      path: await realpath(workspacePath),
      async status() { return 'ok' },
    }
    await root.plugin(oasisPlugin)

    const schema = root.tools.schemas().find((entry) => entry.name === 'oasis_workbench_status')
    assert.ok(schema, 'oasis_workbench_status must be visible in the real registry')

    const result = await root.tools.execute({
      callId: 'week1-supplement-runtime-call',
      name: 'oasis_workbench_status',
      arguments: {},
      signal: new AbortController().signal,
    })
    assert.equal(result.isError, false)
    assert.equal(result.content.length, 1)
    assert.equal(result.content[0].type, 'text')
    const value = JSON.parse(result.content[0].text)
    assert.equal(value.phase, 'week-3')
    assert.equal(value.capabilityLevel, 'local-professional-loop')
    assert.deepEqual(value.supportedWorkTypes, ['technical-rd', 'cn-invention-patent'])

    assert.equal(connectionStub.registration.channel, '/oasis-workbench')
    assert.deepEqual(connectionStub.registration.options, { authority: 'loopback' })
    const state = await connectionStub.registration.handler('state/get', { workspaceId: 'workspace-a' })
    assert.equal(state.ok, true)
    assert.equal(state.value.revision, 0)

    const created = await connectionStub.registration.handler('state/replace', {
      workspaceId: 'workspace-a', expectedRevision: 0, state: createEditableDraft(),
    })
    assert.equal(created.value.current.revision, 1)
    const added = await connectionStub.registration.handler('material/add', {
      workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 1,
      relativePath: 'materials\\spec.md', confirmed: true,
    })
    assert.equal(added.ok, true)
    assert.equal(added.value.current.tasks['task-a'].inputRefs.length, 1)
    assert.equal(added.value.current.tasks['task-a'].inputRefs[0].relativePath, 'materials\\spec.md')
    assert.equal(Object.hasOwn(added.value.current.tasks['task-a'].inputRefs[0], 'absolutePath'), false)
  } finally {
    await root.fiber.dispose()
    await rm(tempRoot, { recursive: true, force: true })
  }

  assert.equal(connectionStub.disposed, 1)
  assert.equal(storageDomainStub.closed, 1)
})
