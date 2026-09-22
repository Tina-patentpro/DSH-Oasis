import assert from 'node:assert/strict'
import test from 'node:test'
import { executionHarness } from './claims-api-execution-harness.mjs'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { createWorkbenchRemote } from '../src/client/workbench-remote.js'
import { createConnectionFixture } from './connection-fixture.mjs'
import { createWorkbenchStore } from '../src/client/workbench-store.js'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PanelPages } from '../src/client/PanelPages.js'

async function setup(t, wrap = r => r) {
  const h = await executionHarness(t)
  const endpoints = []
  const handler = createWorkbenchRpcHandler(h.service, h.professional)
  const remote = wrap(createWorkbenchRemote(createConnectionFixture((endpoint, payload) => { endpoints.push(endpoint); return handler(endpoint, payload) })))
  const store = createWorkbenchStore({ remote, saveDelayMs: 0 })
  t.after(() => store.dispose())
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }]); await store.hydrateWorkspace('workspace-a'); await store.loadWorkflowCatalog('workspace-a')
  return { ...h, endpoints, remote, store, operation: () => store.getWorkspaceState('workspace-a').pageOperations['task-a'] }
}

test('same-page API source has no network effects until metadata preview and explicit confirmation', async t => {
  const h = await setup(t)
  h.store.setGenerationSource('workspace-a', 'task-a', 'local-skill')
  h.store.setGenerationSource('workspace-a', 'task-a', 'oasis-api')
  assert.equal(h.calls.length, 0); assert.ok(!h.endpoints.includes('task/preview-api'))
  await h.store.createRun('workspace-a', 'task-a')
  assert.ok(h.operation().apiPreview); assert.equal(h.calls.length, 0)
  const html = renderToStaticMarkup(createElement(PanelPages, { state: h.store.getWorkspaceState('workspace-a') }))
  assert.match(html, /本次 API 调用确认/); assert.match(html, /technical-disclosure.txt/); assert.match(html, /可能产生费用/)
  await h.store.createRun('workspace-a', 'task-a', true)
  const page = h.store.getWorkspaceState('workspace-a').pages[0]
  assert.equal(page.runs[page.activeRunId].mode, 'oasis-api'); assert.equal(page.professionalDraft, null)
  assert.deepEqual(h.calls.map(c => c.kind), ['upload', 'create'])
  const resultHtml = renderToStaticMarkup(createElement(PanelPages, { state: h.store.getWorkspaceState('workspace-a') }))
  assert.match(resultHtml, /非生产 API 响应/); assert.doesNotMatch(resultHtml, /合成验收/)
})

test('editing clears API consent and confirmation cannot silently prepare or submit again', async t => {
  const h = await setup(t)
  await h.store.createRun('workspace-a', 'task-a')
  h.store.updateFormValue('workspace-a', 'task-a', 'disclosure_text', '新的极简技术交底')
  assert.equal(h.operation().apiPreview, null)
  await assert.rejects(h.store.createRun('workspace-a', 'task-a', true))
  assert.equal(h.calls.length, 0)
})

test('unready native connection shows a settings prerequisite instead of a silent generate failure', async t => {
  const h = await setup(t)
  const html = renderToStaticMarkup(createElement(PanelPages, { state: { ...h.store.getWorkspaceState('workspace-a'), professionalConfigurationBlocked: true } }))
  assert.match(html, /请先在 DSH 设置 → 绿洲工作台登录账户/)
  assert.equal(h.calls.length, 0)
})

test('late API metadata cannot revive confirmation invalidated by settings', async t => {
  let release
  const wait = new Promise(resolve => { release = resolve })
  const h = await setup(t, remote => ({ ...remote, async previewClaimsApi(payload) { const p = await remote.previewClaimsApi(payload); await wait; return p } }))
  const job = h.store.createRun('workspace-a', 'task-a')
  job.catch(() => {})
  for (let i = 0; i < 100 && !h.endpoints.includes('task/preview-api'); i++) await new Promise(resolve => setTimeout(resolve, 1))
  await h.store.refreshProfessionalConfiguration(false); release()
  await assert.rejects(job); assert.equal(h.operation().apiPreview, null); assert.equal(h.calls.length, 0)
})

test('explicit observe resolves a lost upload intent without uploading again or requiring live credentials', async t => {
  const h = await setup(t)
  const p = await h.preview(); await h.start(p)
  const executionId = h.state().tasks['task-a'].remoteExecutionOrder[0]
  await h.repository.mutate('workspace-a', h.state().revision, current => {
    const next = structuredClone(current); next.tasks['task-a'].remoteExecutions[executionId].status = 'uploading'; return next
  })
  await h.store.reloadWorkspace('workspace-a')
  await h.store.observeUnifiedRun('workspace-a', 'task-a')
  assert.equal(h.state().tasks['task-a'].remoteExecutions[executionId].status, 'failed')
  assert.equal(h.calls.length, 0)
})
