import assert from 'node:assert/strict'
import test from 'node:test'
import { executionHarness } from './claims-api-execution-harness.mjs'
import { normalizeApiDetail, normalizeCategoryCatalog } from '../src/oasis-api-contract.js'
import { parseWorkbenchRecord } from '../src/workbench-domain.js'
import { normalizeProductRuntimeConfig } from '../src/oasis-runtime-config.js'
import { createOasisRemoteService } from '../src/oasis-remote-service.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { createWorkbenchRemote } from '../src/client/workbench-remote.js'
import { createConnectionFixture } from './connection-fixture.mjs'
import { createWorkbenchStore } from '../src/client/workbench-store.js'
import { fastDetail, fastCatalog } from './fast-service-fixture.mjs'

async function setup(t) {
  const h = await executionHarness(t), reads = []
  const origin = 'https://lzhxpy.oasisintwrite.com'
  const link = { workspaceId: 'workspace-a', workspacePath: h.workspace.path, apiBaseOrigin: origin,
    accountId: 101, folderId: 8, folderName: 'test', confirmedAt: '2026-09-27T00:00:00.000Z' }
  h.value.workspaceApiBindings = []; h.value.websiteProjectLinks = [link]
  h.active.environmentKind = 'production'; h.active.apiBaseOrigin = origin
  const detail = normalizeApiDetail(structuredClone(fastDetail))
  const catalog = normalizeCategoryCatalog(structuredClone(fastCatalog))
  const folder = { id: 8, name: 'test', owner_id: 101 }
  h.client.getUserDetail = async () => { reads.push('user'); return structuredClone(h.user) }
  h.client.getCategoryCatalog = async () => { reads.push('catalog'); return structuredClone(catalog) }
  h.client.getApiDetail = async name => { assert.equal(name, '权利要求书生成-Fast'); reads.push('detail'); return structuredClone(detail) }
  h.client.getFolderDetail = async id => { assert.equal(id, 8); reads.push('folder'); return structuredClone(folder) }
  h.client.uploadFile = async file => { h.calls.push({ kind: 'upload', file }); return origin + '/synthetic-disclosure.txt' }
  const professional = createOasisRemoteService({ ...h.options, resolveConfig: normalizeProductRuntimeConfig })
  const remote = createWorkbenchRemote(createConnectionFixture(createWorkbenchRpcHandler(h.service, professional)))
  const prepare = () => remote.prepareClaimsApi({ ...h.base(), remoteReadConfirmed: true })
  const preview = async () => { const p = await prepare(); return professional.previewClaims({ ...h.base(), preparationSha256: p.preparationSha256, remoteReadConfirmed: true }) }
  const start = p => professional.startClaims({ ...h.base(), confirmationToken: p.confirmationToken, requestKey: 'fast-test', priceConfirmed: true, externalTransferConfirmed: true })
  return { ...h, professional, remote, link, reads, detail, catalog, folder, prepare, preview, start }
}

function capturedIdentity(h) {
  h.active.accountIdentity = Object.freeze({ accountId: 101, origin: h.active.apiBaseOrigin, revision: 'synthetic-grant' })
}

test('Fast missing detail ID uses the same login identity through preview, confirmation and common result', async t => {
  const h = await setup(t); capturedIdentity(h); delete h.user.id
  const preview = await h.preview()
  assert.equal(preview.accountId, 101); assert.equal(preview.balance, 20)
  assert.deepEqual(h.calls, [], 'metadata must not upload or create')
  await h.start(preview)
  const executionId = h.state().tasks['task-a'].remoteExecutionOrder[0]
  await h.professional.continue({ workspaceId: 'workspace-a', taskId: 'task-a', executionId })
  assert.deepEqual(h.calls.map(c => c.kind), ['upload', 'create'])
  const task = h.state().tasks['task-a']
  assert.equal(task.runs[task.activeRunId].review.status, 'not-reviewed')
  assert.equal(task.remoteExecutions[executionId].accountId, 101)
})

for (const [name, change, code] of [
  ['no captured identity', h => { delete h.user.id }, 'REMOTE_ACCOUNT_UNVERIFIED'],
  ['string ID', h => { h.user.id = '101' }, 'REMOTE_ACCOUNT_UNVERIFIED'],
  ['null ID', h => { h.user.id = null }, 'REMOTE_ACCOUNT_UNVERIFIED'],
  ['undefined ID', h => { h.user.id = undefined }, 'REMOTE_ACCOUNT_UNVERIFIED'],
  ['unsafe ID', h => { h.user.id = Number.MAX_SAFE_INTEGER + 1 }, 'REMOTE_ACCOUNT_UNVERIFIED'],
  ['snapshot conflicts with detail', h => { h.active.accountIdentity = { ...h.active.accountIdentity, accountId: 999 } }, 'REMOTE_ACCOUNT_MISMATCH'],
  ['snapshot conflicts with project', h => { delete h.user.id; h.link.accountId = 999 }, 'REMOTE_ACCOUNT_MISMATCH'],
  ['snapshot origin changed', h => { delete h.user.id; h.active.accountIdentity = { ...h.active.accountIdentity, origin: 'https://other.invalid' } }, 'REMOTE_ACCOUNT_UNVERIFIED'],
  ['no current-grant checker', h => { delete h.user.id; delete h.active.assertCurrent }, 'REMOTE_ACCOUNT_UNVERIFIED'],
  ['malformed detail object', h => { h.client.getUserDetail = async () => null }, 'REMOTE_ACCOUNT_UNVERIFIED'],
  ['late credential change', h => { h.client.getUserDetail = async () => { h.changeRuntime(); return { balance: 20 } } }, 'REMOTE_RUNTIME_CHANGED'],
  ['folder owner after missing detail ID', h => { delete h.user.id; h.folder.owner_id = 999 }, 'REMOTE_FOLDER_MISMATCH'],
]) test(`captured Fast identity rejects ${name} without upload`, async t => {
  const h = await setup(t)
  if (name !== 'no captured identity') capturedIdentity(h)
  change(h)
  await assert.rejects(h.prepare(), { code })
  assert.deepEqual(h.calls, [])
})

test('missing detail ID does not revive confirmation after a credential change', async t => {
  const h = await setup(t); capturedIdentity(h); delete h.user.id
  const preview = await h.preview(); await h.start(preview); h.changeRuntime()
  await assert.rejects(h.professional.continue({ workspaceId: 'workspace-a', taskId: 'task-a',
    executionId: h.state().tasks['task-a'].remoteExecutionOrder[0] }), { code: 'REMOTE_RUNTIME_CHANGED' })
  assert.deepEqual(h.calls, [])
})

test('non-production cannot use a production grant as a missing-ID fallback', async t => {
  const h = await executionHarness(t)
  h.active.accountIdentity = { accountId: 101, origin: h.active.apiBaseOrigin, revision: 'synthetic' }
  delete h.user.id
  await assert.rejects(h.preview(), { code: 'REMOTE_ACCOUNT_UNVERIFIED' })
  assert.deepEqual(h.calls, [])
})

test('linked Fast prepares through real RPC without old binding or settings mutation', async t => {
  const h = await setup(t), before = structuredClone(h.value)
  const p = await h.prepare()
  assert.equal(p.snapshot.binding.apiId, 39)
  assert.equal(p.snapshot.binding.catalogEntryId, 211)
  assert.equal(p.snapshot.binding.apiEndpoint, '权利要求书生成-Fast')
  assert.equal(p.snapshot.binding.apiProcess, '输入内容整理,核心独立权利要求撰写,权利要求架构搭建,从属权利要求撰写,审查权利要求书初稿,权利要求')
  assert.equal(p.snapshot.binding.folderId, 8)
  assert.equal(p.snapshot.expectedSettingsRevision, 7)
  assert.deepEqual(h.value, before); assert.deepEqual(h.calls, [])
  assert.ok(h.reads.includes('catalog')); assert.ok(h.reads.includes('folder'))
})

test('unconfirmed production preparation stays local and never falls back to old binding', async t => {
  const h = await setup(t); h.value.workspaceApiBindings = [h.binding]
  await assert.rejects(h.professional.prepareClaimsMapping(h.base()), { code: 'API_SERVICE_MAPPING_REQUIRED' })
  assert.deepEqual(h.reads, []); assert.deepEqual(h.calls, [])
})

for (const [name, change, code] of [
  ['account', h => h.user.id++, 'REMOTE_ACCOUNT_MISMATCH'],
  ['folder owner', h => h.folder.owner_id++, 'REMOTE_FOLDER_MISMATCH'],
  ['missing owner', h => delete h.folder.owner_id, 'REMOTE_FOLDER_MISMATCH'],
  ['folder id', h => h.folder.id++, 'REMOTE_FOLDER_MISMATCH'],
  ['workspace path', h => h.link.workspacePath += '-other', 'WORKSPACE_ROOT_CHANGED'],
  ['catalog endpoint', h => h.catalog[0].apiEndpoint = '权利要求书生成-Basic', 'REMOTE_SERVICE_MISMATCH'],
  ['duplicate catalog', h => h.catalog.push({ ...h.catalog[0] }), 'REMOTE_SERVICE_MISMATCH'],
  ['Basic', h => { h.detail.id = 46; h.detail.name = '权利要求书生成-Basic' }, 'REMOTE_SERVICE_MISMATCH'],
  ['async', h => h.detail.executionMode = 'async', 'REMOTE_SCHEMA_CHANGED'],
  ['input type', h => h.detail.inputFields[0].type = 'file', 'REMOTE_SCHEMA_CHANGED'],
  ['input meaning', h => h.detail.inputFields[0].description = 'changed', 'REMOTE_SCHEMA_CHANGED'],
  ['raw required flag', h => h.detail.raw.input_schema[0].required = true, 'REMOTE_SCHEMA_CHANGED'],
  ['raw field constraint', h => h.detail.raw.input_schema[0].max_length = 1, 'REMOTE_SCHEMA_CHANGED'],
  ['additional required field', h => h.detail.inputFields.push({ ...h.detail.inputFields[0], fieldId: 'new' }), 'REMOTE_SCHEMA_CHANGED'],
  ['output', h => h.detail.outputFields[0].fieldId = 'claims_docx', 'REMOTE_SCHEMA_CHANGED'],
]) test(`Fast metadata rejects ${name} before uploading`, async t => {
  const h = await setup(t); change(h)
  await assert.rejects(h.prepare(), { code }); assert.deepEqual(h.calls, [])
})

test('late metadata cannot cache a mapping after settings or website link changes', async t => {
  const h = await setup(t), original = h.client.getApiDetail
  h.client.getApiDetail = async name => { const d = await original(name); h.bumpSettings(); return d }
  await assert.rejects(h.prepare(), { code: 'SETTINGS_CONFLICT' })
  await assert.rejects(h.professional.prepareClaimsMapping(h.base()), { code: 'API_SERVICE_MAPPING_REQUIRED' })
  assert.deepEqual(h.calls, [])
})

test('Fast same-page preview shows current price and creates only after explicit confirmation', async t => {
  const h = await setup(t); h.detail.price = 4
  const store = createWorkbenchStore({ remote: h.remote, saveDelayMs: 0 }); t.after(() => store.dispose())
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }]); await store.hydrateWorkspace('workspace-a'); await store.loadWorkflowCatalog('workspace-a')
  await store.createRun('workspace-a', 'task-a')
  const p = store.getWorkspaceState('workspace-a').pageOperations['task-a'].apiPreview
  assert.equal(p.apiEndpoint, '权利要求书生成-Fast'); assert.equal(p.price, 4); assert.deepEqual(h.calls, [])
  await store.createRun('workspace-a', 'task-a', true)
  assert.deepEqual(h.calls.map(v => v.kind), ['upload', 'create'])
  const body = h.calls[1].body; assert.equal(body.id, 39); assert.equal(body.folderId, 8)
  const task = h.state().tasks['task-a'], run = task.runs[task.activeRunId]
  assert.equal(run.mode, 'oasis-api'); assert.equal(run.review.status, 'not-reviewed')
  assert.equal(run.result.artifact.body, h.reply.answerText)
  assert.equal(run.providerSnapshot.apiId, 39)
  assert.equal(run.providerSnapshot.catalogEntryId, 211)
  const execution = task.remoteExecutions[run.executionId]
  assert.equal(execution.serviceSnapshot.catalogEntryId, 211)
  assert.equal(execution.unifiedClaims.binding.catalogEntryId, 211)
  const record = structuredClone(h.state())
  assert.deepEqual(parseWorkbenchRecord('workspace-a', record), record)
  for (const change of [
    r => { r.tasks['task-a'].remoteExecutions[run.executionId].serviceSnapshot.catalogEntryId++ },
    r => { r.tasks['task-a'].runs[run.runId].providerSnapshot.catalogEntryId++ },
    r => {
      const e = r.tasks['task-a'].remoteExecutions[run.executionId]
      e.serviceSnapshot.catalogEntryId++; e.unifiedClaims.binding.catalogEntryId++
      r.tasks['task-a'].runs[run.runId].providerSnapshot.catalogEntryId++
    },
  ]) { const changed = structuredClone(record); change(changed); assert.throws(() => parseWorkbenchRecord('workspace-a', changed)) }
})

test('Fast captures an observed catalog ID rather than hardcoding 211', async t => {
  const h = await setup(t); h.catalog[0].apiId = 987
  const p = await h.prepare()
  assert.equal(p.snapshot.binding.catalogEntryId, 987); assert.equal(p.snapshot.binding.apiId, 39)
  assert.deepEqual(h.calls, [])
})

test('production preparation cannot omit catalog identity or acquire a fallback detail ID', async t => {
  const h = await setup(t); delete h.catalog[0].apiId
  await assert.rejects(h.prepare(), { code: 'REMOTE_SERVICE_MISMATCH' })
  assert.deepEqual(h.calls, [])
})

test('Fast unknown creation keeps both identities after restart and never resubmits', async t => {
  const h = await setup(t)
  h.client.createWorkflow = async body => { h.calls.push({ kind: 'create', body }); throw Error('lost response') }
  const p = await h.preview(); await h.start(p)
  const executionId = h.state().tasks['task-a'].remoteExecutionOrder[0]
  await h.professional.continue({ workspaceId: 'workspace-a', taskId: 'task-a', executionId })
  const before = h.state().tasks['task-a'].remoteExecutions[executionId]
  assert.equal(before.serviceSnapshot.apiId, 39); assert.equal(before.serviceSnapshot.catalogEntryId, 211)
  const reopened = createOasisRemoteService({ ...h.options, resolveConfig: normalizeProductRuntimeConfig })
  await reopened.continue({ workspaceId: 'workspace-a', taskId: 'task-a', executionId })
  assert.equal(h.calls.filter(c => c.kind === 'create').length, 1)
  assert.equal(h.calls.filter(c => c.kind === 'upload').length, 1)
  assert.equal(h.calls.find(c => c.kind === 'create').body.id, 39)
  assert.equal(h.state().tasks['task-a'].remoteExecutions[executionId].inputSha, before.inputSha)
})

for (const [label, change] of [
  ['ID', h => h.catalog[0].apiId++],
  ['endpoint', h => { h.catalog[0].apiEndpoint += '-changed' }],
  ['process', h => { h.catalog[0].apiProcess += ',changed' }],
  ['duplicate endpoint with different identity', h => h.catalog.push({ ...h.catalog[0], apiId: 999, apiProcess: 'other' })],
]) for (const phase of ['confirmation', 'before-upload', 'before-create']) {
  test(`Fast rejects catalog ${label} drift ${phase} without creating`, async t => {
    const h = await setup(t), p = await h.preview()
    if (phase === 'confirmation') {
      change(h); await assert.rejects(h.start(p), { code: 'REMOTE_SERVICE_MISMATCH' })
    } else {
      await h.start(p)
      if (phase === 'before-upload') change(h)
      else {
        const upload = h.client.uploadFile
        h.client.uploadFile = async file => { const url = await upload(file); change(h); return url }
      }
      await assert.rejects(h.professional.continue({ workspaceId: 'workspace-a', taskId: 'task-a',
        executionId: h.state().tasks['task-a'].remoteExecutionOrder[0] }), { code: 'REMOTE_SERVICE_MISMATCH' })
    }
    assert.deepEqual(h.calls.map(c => c.kind), phase === 'before-create' ? ['upload'] : [])
  })
}

test('legacy snapshots without catalog identity remain readable without changing hashes', async t => {
  const h = await executionHarness(t), task = await h.execute()
  const original = structuredClone(h.state()), execution = task.remoteExecutions[task.remoteExecutionOrder[0]]
  assert.equal(Object.hasOwn(execution.serviceSnapshot, 'catalogEntryId'), false)
  assert.equal(Object.hasOwn(task.runs[task.activeRunId].providerSnapshot, 'catalogEntryId'), false)
  assert.deepEqual(parseWorkbenchRecord('workspace-a', original), original)
})

test('Fast checks folder ownership again before upload', async t => {
  const h = await setup(t), p = await h.preview(); await h.start(p)
  h.folder.owner_id = 999
  await assert.rejects(h.professional.continue({ workspaceId: 'workspace-a', taskId: 'task-a', executionId: h.state().tasks['task-a'].remoteExecutionOrder[0] }), { code: 'REMOTE_FOLDER_MISMATCH' })
  assert.deepEqual(h.calls, [])
})

test('Fast rejects an unlinked or changed project after confirmation', async t => {
  const h = await setup(t), p = await h.preview(); h.value.websiteProjectLinks = []
  await assert.rejects(h.start(p)); assert.deepEqual(h.calls, [])
})

test('Fast rechecks raw schema constraints before upload after confirmation', async t => {
  const h = await setup(t), p = await h.preview(); await h.start(p)
  h.detail.raw.input_schema[0].required = true
  await assert.rejects(h.professional.continue({ workspaceId: 'workspace-a', taskId: 'task-a', executionId: h.state().tasks['task-a'].remoteExecutionOrder[0] }), { code: 'REMOTE_SCHEMA_CHANGED' })
  assert.deepEqual(h.calls, [])
})
