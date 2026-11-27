import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createWorkbenchRemote } from '../src/client/workbench-remote.js'
import { createWorkbenchStore } from '../src/client/workbench-store.js'
import { createProductSettings } from '../src/client/product-settings.js'
import { V340GenerationPage } from '../src/client/V340GenerationPage.js'
import { setupM06ControlledHost } from './helpers/m06-controlled-host-harness.mjs'

async function client(t, { loseRunReply = false, loseBeforeAdmission = false, holdPreview, beforeApply, connectionSettings } = {}) {
  const host = await setupM06ControlledHost(t, { beforeApply }), calls = []
  let sessionId = 's'
  const remote = createWorkbenchRemote({ rpc: { async call(channel, method, payload, signal) {
    assert.equal(channel, '/api'); signal?.throwIfAborted()
    const endpoint = method.slice('oasis-workbench/'.length)
    calls.push(endpoint)
    if (loseBeforeAdmission && endpoint === 'workflow/v340/candidate/run') throw Error('synthetic unknown before admission')
    const result = await host.rpc(endpoint, payload)
    if (holdPreview && endpoint === 'workflow/v340/candidate/prepare') await holdPreview(result)
    if (loseRunReply && endpoint === 'workflow/v340/candidate/run') throw Error('synthetic lost reply after real admission')
    return result
  } } })
  const store = createWorkbenchStore({ remote, connectionSettings, saveDelayMs: 0, getGenerationSession: () => sessionId })
  t.after(() => store.dispose())
  store.syncWorkspaces([{ workspaceId: 'w' }]); await store.hydrateWorkspace('w'); await store.loadWorkflowCatalog('w')
  // Host task creation does not select a client tab; exercise the actual selection/save path.
  store.activatePage('w', 't'); await store.flushWorkspace('w')
  return { host, remote, store, calls, setSession(value) { sessionId = value },
    state: () => store.getWorkspaceState('w'), operation: () => store.getWorkspaceState('w').pageOperations.t ?? {} }
}
function requireCandidate(c) {
  assert.equal(typeof c.remote.prepareV340Candidate, 'function', 'typed candidate preparation transport missing')
  assert.equal(typeof c.remote.createV340CandidateRun, 'function', 'typed candidate dispatch transport missing')
  assert.equal(typeof c.store.prepareV340Candidate, 'function', 'candidate preparation action missing')
  assert.equal(typeof c.store.confirmV340Candidate, 'function', 'explicit candidate confirmation missing')
  assert.equal(typeof c.store.cancelV340Candidate, 'function', 'candidate cancellation missing')
}

test('client preparation and cancellation do not dispatch; explicit confirmation dispatches only once', async t => {
  const c = await client(t); requireCandidate(c)
  await c.store.prepareV340Candidate('w', 't')
  assert.equal(c.operation().v340CandidatePreview.businessSkillVersion, '0.1.3')
  assert.equal(c.host.calls.adapter, 0)
  c.store.cancelV340Candidate('w', 't')
  assert.equal(c.operation().v340CandidatePreview, null)
  await assert.rejects(() => c.store.confirmV340Candidate('w', 't'))
  await c.store.prepareV340Candidate('w', 't')
  const first = c.store.confirmV340Candidate('w', 't')
  await assert.rejects(() => c.store.confirmV340Candidate('w', 't'))
  await first
  const record = await c.host.state(), run = Object.values(record.tasks.t.v340.runs)[0]
  assert.ok(run)
  await c.store.v340Action('w', 't', 'run/observe', { runId: run.runId })
  assert.equal(c.calls.filter(x => x === 'workflow/v340/candidate/run').length, 1)
  assert.equal(c.host.calls.adapter, 1); assert.equal(c.host.calls.credentials, 0)
  if (process.env.OASIS_M06_CONTROLLED_CLIENT_EVIDENCE_DIR) await writeFile(join(process.env.OASIS_M06_CONTROLLED_CLIENT_EVIDENCE_DIR, 'client-observation.json'),
    JSON.stringify({ scope: 'ACTUAL_STORE_TYPED_REMOTE_REGISTERED_FETCH_INSTALLED_SDK_OFFLINE', calls: c.calls,
      counts: c.host.calls, state: c.state(), record: await c.host.state(), operation: c.operation() }, null, 2) + '\n', { flag: 'wx' })
})

test('late preparation after cancellation, page change, workspace removal or configuration change cannot be confirmed', async t => {
  for (const change of ['cancel', 'page', 'workspace', 'configuration']) await t.test(change, async t => {
    let release, arrived
    const wait = new Promise(resolve => { release = resolve }), entered = new Promise(resolve => { arrived = resolve })
    const c = await client(t, { holdPreview: async () => { arrived(); await wait } })
    const otherPage = change === 'page' ? c.store.createPage('w') : null
    if (otherPage) { c.store.activatePage('w', 't'); await c.store.flushWorkspace('w') }
    const preparation = c.store.prepareV340Candidate('w', 't')
    const rejected = assert.rejects(preparation)
    await entered
    if (change === 'cancel') c.store.cancelV340Candidate('w', 't')
    if (change === 'page') c.store.activatePage('w', otherPage.pageId)
    if (change === 'workspace') c.store.syncWorkspaces([])
    if (change === 'configuration') await c.store.refreshProfessionalConfiguration(false)
    release(); await rejected
    if (change === 'workspace') c.store.syncWorkspaces([{ workspaceId: 'w' }])
    await assert.rejects(() => c.store.confirmV340Candidate('w', 't'))
    assert.equal(c.operation().v340CandidatePreview, null)
    assert.equal(c.host.calls.adapter, 0)
    assert.equal(c.calls.filter(x => x === 'workflow/v340/candidate/run').length, 0)
  })
})

test('read-only reconciliation without the original run keeps UNKNOWN and blocks another dispatch', async t => {
  const c = await client(t, { loseBeforeAdmission: true })
  await c.store.prepareV340Candidate('w', 't')
  await assert.rejects(() => c.store.confirmV340Candidate('w', 't'), /synthetic unknown/)
  const key = c.operation().v340CandidateRequestKey
  await c.store.reconcileV340Candidate('w', 't')
  assert.equal(c.operation().v340CandidateUnconfirmed, true)
  assert.equal(c.operation().v340CandidateRequestKey, key)
  await assert.rejects(() => c.store.prepareV340Candidate('w', 't'))
  await assert.rejects(() => c.store.confirmV340Candidate('w', 't'))
  assert.throws(() => c.store.saveV340Draft('w', 't', c.state().pages.find(p => p.pageId === 't').v340.draft), /未确认/)
  assert.equal(c.calls.filter(x => x === 'workflow/v340/candidate/run').length, 1)
  assert.equal(c.host.calls.adapter, 0)
})

test('changing session or saving changed inputs invalidates candidate confirmation before transport', async t => {
  const c = await client(t); requireCandidate(c)
  await c.store.prepareV340Candidate('w', 't')
  c.setSession('different-session')
  await assert.rejects(() => c.store.confirmV340Candidate('w', 't'))
  assert.notEqual(c.operation().v340CandidateUnconfirmed, true)
  c.setSession('s')
  await c.store.prepareV340Candidate('w', 't')
  const page = c.state().pages.find(p => p.pageId === 't'), draft = structuredClone(page.v340.draft)
  draft.textInputs.disclosure_text = '公开修改后的壳体与阀芯材料。'
  await c.store.saveV340Draft('w', 't', draft)
  await assert.rejects(() => c.store.confirmV340Candidate('w', 't'))
  assert.equal(c.calls.filter(x => x === 'workflow/v340/candidate/run').length, 0)
  assert.equal(c.host.calls.adapter, 0)
})

test('lost candidate reply preserves the request and never prepares or dispatches another request automatically', async t => {
  const c = await client(t, { loseRunReply: true }); requireCandidate(c)
  assert.equal(typeof c.store.reconcileV340Candidate, 'function', 'read-only reconciliation missing')
  await c.store.prepareV340Candidate('w', 't')
  await assert.rejects(() => c.store.confirmV340Candidate('w', 't'), /synthetic lost reply/)
  const key = c.operation().v340CandidateRequestKey
  assert.equal(typeof key, 'string'); assert.equal(c.operation().v340CandidateUnconfirmed, true)
  await assert.rejects(() => c.store.prepareV340Candidate('w', 't'))
  assert.equal(c.calls.filter(x => x === 'workflow/v340/candidate/run').length, 1)
  await c.store.reconcileV340Candidate('w', 't')
  assert.equal(c.operation().v340CandidateUnconfirmed, false)
  const page = c.state().pages.find(p => p.pageId === 't')
  assert.ok(Object.values(page.v340.runs).some(run => run.requestKey === key))
  assert.equal(c.host.calls.adapter, 1)
  assert.equal(c.calls.filter(x => x === 'workflow/v340/candidate/run').length, 1)
})

test('typed candidate transport rejects mismatched preparation identity and generic mutation access', async t => {
  const c = await client(t); requireCandidate(c)
  const current = await c.host.state(), input = { workspaceId: 'w', taskId: 't', expectedRevision: current.revision, sessionId: 's', confirmed: true }
  const good = await c.host.preview()
  assert.equal(good.ok, true)
  const malformed = createWorkbenchRemote({ rpc: { call: async () => ({ ok: true, value: { ...good.value, workspaceId: 'another' } }) } })
  await assert.rejects(() => malformed.prepareV340Candidate(input), /不一致|Malformed/)
  await assert.rejects(() => c.remote.v340('candidate/prepare', input), /不可用/)
  assert.equal(c.host.calls.adapter, 0)
})

test('controlled input page presents model confirmation while the ordinary input page remains disabled', async t => {
  const c = await client(t); requireCandidate(c)
  let state = c.state(), page = state.pages.find(p => p.pageId === 't'), node = state.v340Catalog.nodes.find(n => n.nodeId === 'Flow-2-6')
  const actions = { prepareCandidate() {}, confirmCandidate() {}, cancelCandidate() {} }
  const normal = renderToStaticMarkup(createElement(V340GenerationPage, { page, state, node: { ...node, m06Candidate: undefined }, actions }))
  assert.match(normal, /生成（暂不可用）/)
  const ready = renderToStaticMarkup(createElement(V340GenerationPage, { page, state, node, actions }))
  assert.match(ready, /核对模型与材料/); assert.doesNotMatch(ready, /确认生成一次/)
  assert.equal(c.host.calls.adapter, 0)
  await c.store.prepareV340Candidate('w', 't'); state = c.state(); page = state.pages.find(p => p.pageId === 't')
  const confirm = renderToStaticMarkup(createElement(V340GenerationPage, { page, state, node, actions, operation: c.operation() }))
  assert.match(confirm, /确认生成一次/); assert.match(confirm, /fixture-model/); assert.match(confirm, /synthetic-native-test/)
  assert.match(confirm, /专业/); assert.match(confirm, /取消/)
  assert.equal(c.host.calls.adapter, 0)
})

test('saving the GitHub suite in settings enables the third-party task preview and runs it through the Host', async t => {
  let value = {}, listener, invalidate
  const settings = createProductSettings({
    remote: { async accountStatus() {
      return { authenticated: false, available: false, writable: false, accountId: null, revision: null, retryAfterSeconds: 0 }
    } },
    onInvalidated: () => invalidate?.(),
  })
  t.after(() => settings.dispose())
  const form = {
    getSnapshot: () => ({ status: 'ready', mode: 'host', writable: true, value }),
    subscribe(fn) { listener = fn; return () => {} },
    async set(key, next) { value = { ...value, [key]: next }; listener(); return true },
  }
  settings.bind({ configForms: { get: () => form }, remote: { $host: { isLoopback: true } },
    connection: { isLoopback: true, generation: { getSnapshot: () => 1, subscribe: () => () => {} } } })
  const c = await client(t, { connectionSettings: settings, beforeApply(ctx) {
    ctx.settings.register = (_namespace, _schema, options) => ({ get: () => ({ ...options.base, ...value }) })
  } })
  invalidate = () => c.store.refreshProfessionalConfiguration(false)
  await c.store.prepareV340Candidate('w', 't')
  assert.equal(c.operation().v340CandidatePreview.businessSkillId, 'm06-claims-draft')
  assert.equal(await settings.saveLocalSkillSuite('patent-disclosure'), true)
  await assert.rejects(c.store.confirmV340Candidate('w', 't'))
  assert.equal(c.host.calls.adapter, 0)
  await c.store.prepareV340Candidate('w', 't')
  const state = { ...c.state(), localSkillSuite: settings.getSnapshot().localSkillSuite }
  const html = renderToStaticMarkup(createElement(V340GenerationPage, {
    state, page: state.pages.find(p => p.pageId === 't'), node: state.v340Catalog.nodes.find(n => n.nodeId === 'Flow-2-6'),
    operation: c.operation(), actions: { prepareCandidate() {}, confirmCandidate() {} },
  }))
  assert.match(html, /中国专利 Skill · 权利要求初稿/)
  assert.match(html, /确认生成一次/)
  await c.store.confirmV340Candidate('w', 't')
  const record = await c.host.state(), run = Object.values(record.tasks.t.v340.runs)[0]
  assert.equal(run.nativeCandidate.businessSkillId, 'patent-disclosure-claims')
  await c.store.v340Action('w', 't', 'run/observe', { runId: run.runId })
  assert.equal(c.host.calls.adapter, 1)
  assert.equal(c.host.calls.network, 0)
  assert.match(c.host.actualCall.system, /先有 .application_plan.yaml. 的 .claim_tree./)
  let persisted
  for (let i = 0; i < 100; i++) {
    persisted = (await c.host.state()).tasks.t.v340.runs[run.runId]
    if (persisted.status !== 'prepared') break
    await new Promise(resolve => setTimeout(resolve, 5))
  }
  assert.equal(persisted.status, 'completed')
})
