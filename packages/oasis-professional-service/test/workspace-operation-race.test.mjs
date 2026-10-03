import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fixtureHarness } from './unified-generation-harness.mjs'
import { executionHarness } from './claims-api-execution-harness.mjs'
import { normalizeApiDetail } from '../src/oasis-api-contract.js'
import { fastDetail } from './fast-service-fixture.mjs'
import { createWebsiteImportService } from '../src/website-import-service.js'
import { hasPendingUnifiedRun } from '../src/generation-contract.js'
import { isOasisRemoteExecutionUnresolved } from '../src/workbench-contract.js'
import { createWorkspaceOperationGuard as operations } from '../src/workspace-operation-guard.js'
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const busy = { code: 'WORKSPACE_OPERATION_BUSY' }

async function fixture(t) {
  const guard = operations(), generation = deferred(), dispatched = deferred()
  const h = await fixtureHarness({ workspaceOperations: guard, unifiedFixtureEnabled: true,
    localGeneration: { enabled: true, evidenceKind: 'native-offline',
      resolveContext: () => ({ sessionId: 'session-a', route: { provider: 'offline', model: 'text' } }),
      instruction: { version: 'public-1', body: 'Synthetic review only' },
      adapter: { generate: () => { dispatched.resolve(); return generation.promise } } } })
  t.after(async () => { generation.resolve({ status: 'failed', code: 'ABORTED' }); await h.service.closeLocalGeneration(); await h.repository.close() })
  const root = await mkdtemp(join(tmpdir(), 'oasis-r1-')), entered = deferred(), release = deferred()
  const link = { workspaceId: 'workspace-a', workspacePath: root, apiBaseOrigin: 'https://lzhxpy.oasisintwrite.com',
    accountId: 7, folderId: 2, folderName: 'synthetic', confirmedAt: new Date().toISOString() }
  let revision = 0, pause = false, fail = false, writes = 0
  let value = { websiteProjectLinks: [link], workspaceApiBindings: [] }
  const settings = { writable: true, describe: () => [{ ns: 'oasis-professional-service', revision, value }],
    update: async (_ns, patch, expected) => {
      assert.equal(expected, revision); entered.resolve()
      if (pause) await release.promise
      if (fail) throw Error('synthetic persistence failure')
      value = { ...value, ...patch }; revision++; writes++
    } }
  const row = { key: 'history:9:text', kind: 'text', sourceId: 9, fileName: 'claims_OIW.md', name: 'claims', size: 6, downloadable: true, reason: null }
  const client = { project: async id => ({ id, name: 'synthetic' }), listItems: async () => ({ total: 1, items: [row] }), download: async () => Buffer.from('# text') }
  const importer = createWebsiteImportService({ workspaceOperations: guard, settings, createClient: () => client,
    workspaceRegistry: { get: () => ({ path: root, status: async () => 'ok' }) },
    accountService: { status: async () => ({ authenticated: true, accountId: 7, revision: 'r1' }), captureToken: async () => async () => 'synthetic-token' },
    isWorkspaceBusy: id => Object.values(h.repository.get(id).tasks).some(task => hasPendingUnifiedRun(task)
      || Object.values(task.remoteExecutions).some(isOasisRemoteExecutionUnresolved)) })
  t.after(() => importer.dispose())
  const open = () => importer.open({ workspaceId: 'workspace-a', confirmed: true })
  const unlink = s => importer.unlink({ token: s.token, expectedSettingsRevision: s.settingsRevision, confirmed: true })
  return { ...h, guard, root, importer, client, row, open, unlink, entered, release, dispatched,
    pause: () => { pause = true }, fail: v => { fail = v }, value: () => value, writes: () => writes }
}

test('R1 unlink persistence excludes concurrent local generation and preserves files', async t => {
  const h = await fixture(t), s = await h.open()
  await writeFile(join(h.root, 'keep.md'), 'reviewed bytes')
  h.pause(); const unlink = h.unlink(s); await h.entered.promise
  try {
    await assert.rejects(h.service.createLocalRun(h.command({ sessionId: 'session-a' })), busy)
    assert.equal(h.state().tasks['task-a'].runOrder.length, 0)
  } finally { h.release.resolve(); await unlink }
  assert.equal(h.value().websiteProjectLinks.length, 0)
  assert.equal(await readFile(join(h.root, 'keep.md'), 'utf8'), 'reviewed bytes')
  await assert.rejects(h.importer.projects({ token: s.token }), { code: 'IMPORT_EXPIRED' })
  assert.equal((await h.service.createLocalRun(h.command({ sessionId: 'session-a' }))).committed, true)
})

test('R1 local admission excludes unlink before prepared exists; unresolved state protects after release', async t => {
  const h = await fixture(t), s = await h.open(), entered = deferred(), release = deferred()
  const mutate = h.repository.mutate.bind(h.repository)
  h.repository.mutate = async (...args) => { entered.resolve(); await release.promise; return mutate(...args) }
  const pending = h.service.createLocalRun(h.command({ sessionId: 'session-a' })); await entered.promise
  try { await assert.rejects(h.unlink(s), busy); assert.equal(h.writes(), 0) }
  finally { release.resolve(); await pending; h.repository.mutate = mutate }
  await h.dispatched.promise
  await assert.rejects(h.unlink(s), { code: 'IMPORT_WORKSPACE_BUSY' })
  assert.equal(h.value().websiteProjectLinks.length, 1)
})

test('R1 import lock lasts through downloads and blocks synthetic and compatibility admission', async t => {
  const h = await fixture(t), s = await h.open(), entered = deferred(), release = deferred()
  await h.importer.items({ token: s.token, folderId: 2, kind: 'history' })
  h.client.download = async () => { entered.resolve(); await release.promise; return Buffer.from('# text') }
  const pending = h.importer.commit({ token: s.token, folderId: 2, keys: [h.row.key], confirmed: true }); await entered.promise
  try {
    await assert.rejects(h.service.createUnifiedRun(h.command()), busy)
    await assert.rejects(Promise.resolve().then(() => h.service.createRun(h.command())), busy)
  } finally { release.resolve(); await pending }
  assert.equal(await readFile(join(h.root, 'claims_OIW.md'), 'utf8'), '# text')
})

test('R1 failed settings persistence releases lock without clearing link or permitting automatic generation', async t => {
  const h = await fixture(t), s = await h.open(); h.fail(true)
  await assert.rejects(h.unlink(s), /synthetic persistence failure/)
  assert.equal(h.value().websiteProjectLinks.length, 1); assert.equal(h.state().tasks['task-a'].runOrder.length, 0)
  h.fail(false)
  assert.equal((await h.unlink(s)).status, 'unlinked')
  assert.equal(h.writes(), 1)
})

test('R1 guard rejects same project immediately, allows another project, and releases on exception', async () => {
  const guard = operations(), entered = deferred(), release = deferred()
  const first = guard.run('a', async () => { entered.resolve(); await release.promise; throw Error('expected') })
  const rejected = assert.rejects(first, /expected/); await entered.promise
  try {
    await assert.rejects(guard.run('a', () => assert.fail('not queued')), busy)
    assert.equal(await guard.run('b', () => 2), 2)
  } finally { release.resolve(); await rejected }
  assert.equal(await guard.run('a', () => 3), 3)
})

test('R1 API final admission rechecks settings after repository queue delay, with no upload/create', async t => {
  const h = await executionHarness(t), p = await h.preview(), entered = deferred(), release = deferred()
  const mutate = h.repository.mutate.bind(h.repository)
  h.repository.mutate = async (...args) => { entered.resolve(); await release.promise; return mutate(...args) }
  const started = h.start(p)
  // Attach rejection handling before releasing the synthetic queue.
  const result = started.then(value => ({ value }), error => ({ error }))
  await entered.promise; h.bumpSettings(); release.resolve()
  const observed = await result
  assert.equal(observed.error?.code, 'SETTINGS_CONFLICT')
  assert.equal(h.state().tasks['task-a'].remoteExecutionOrder.length, 0)
  assert.equal(h.calls.length, 0)
})

async function apiFixture(t) {
  const h = await executionHarness(t, { workspaceOperations: operations() })
  const root = await mkdtemp(join(tmpdir(), 'oasis-r1-api-'))
  h.workspace.path = root; h.binding.workspacePath = root
  h.binding.apiBaseOrigin = h.active.apiBaseOrigin = h.value.apiBaseUrl = h.value.credentialOrigin = 'https://lzhxpy.oasisintwrite.com'
  h.binding.environmentKind = h.active.environmentKind = h.value.environmentKind = 'production'
  h.value.websiteProjectLinks = [{ workspaceId: 'workspace-a', workspacePath: root,
    apiBaseOrigin: h.binding.apiBaseOrigin, accountId: 101, folderId: 8, folderName: 'test', confirmedAt: new Date().toISOString() }]
  h.client.getApiDetail = async () => normalizeApiDetail(structuredClone(fastDetail))
  h.client.getCategoryCatalog = async () => [{ apiId: 39, apiEndpoint: fastDetail.name, apiProcess: 'synthetic-process' }]
  h.client.getFolderDetail = async () => ({ id: 8, name: 'test', owner_id: 101 })
  h.preview = async () => {
    const p = await h.professional.prepareLinkedClaimsMapping({ ...h.base(), remoteReadConfirmed: true })
    return h.professional.previewClaims({ ...h.base(), preparationSha256: p.preparationSha256, remoteReadConfirmed: true })
  }
  const entered = deferred(), release = deferred()
  Object.assign(h.options.settings, { writable: true, update: async (_ns, patch, expected) => {
    assert.equal(expected, h.base().expectedSettingsRevision)
    entered.resolve(); await release.promise; Object.assign(h.value, patch); h.bumpSettings()
  } })
  const importer = createWebsiteImportService({ workspaceOperations: h.options.workspaceOperations,
    settings: h.options.settings, workspaceRegistry: h.options.workspaceRegistry,
    accountService: { status: async () => ({ authenticated: true, accountId: 101, revision: 'r1' }),
      captureToken: async () => async () => 'synthetic-token' },
    isWorkspaceBusy: id => Object.values(h.repository.get(id).tasks).some(task => hasPendingUnifiedRun(task)
      || Object.values(task.remoteExecutions).some(isOasisRemoteExecutionUnresolved)) })
  t.after(() => { release.resolve(); importer.dispose() })
  const s = await importer.open({ workspaceId: 'workspace-a', confirmed: true })
  return { ...h, entered, release,
    unlink: () => importer.unlink({ token: s.token, expectedSettingsRevision: s.settingsRevision, confirmed: true }) }
}

test('R1 unlink excludes confirmed API admission and invalidates old preview without any upload', async t => {
  const h = await apiFixture(t), p = await h.preview()
  const pending = h.unlink(); await h.entered.promise
  try { await assert.rejects(h.start(p), busy) }
  finally { h.release.resolve(); await pending }
  await assert.rejects(h.start(p), { code: 'API_PREPARATION_CHANGED' })
  assert.equal(h.calls.length, 0)
  assert.equal(h.state().tasks['task-a'].remoteExecutionOrder.length, 0)
})

test('R1 API admission excludes unlink before prepared and unresolved execution protects after', async t => {
  const h = await apiFixture(t), p = await h.preview(), entered = deferred(), release = deferred()
  const mutate = h.repository.mutate.bind(h.repository)
  h.repository.mutate = async (...args) => { entered.resolve(); await release.promise; return mutate(...args) }
  const pending = h.start(p); await entered.promise
  try { await assert.rejects(h.unlink(), busy) }
  finally { release.resolve(); await pending; h.repository.mutate = mutate }
  await assert.rejects(h.unlink(), { code: 'IMPORT_WORKSPACE_BUSY' })
  assert.equal(h.value.websiteProjectLinks.length, 1)
  assert.equal(h.calls.length, 0, 'admission does not perform upload or paid creation')
})
