import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveConfig } from '@deepseek-ai/cordis'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as host from '../src/index.js'
import { createProductSettings } from '../src/client/product-settings.js'
import { OasisSettingsSection } from '../src/client/OasisSettingsSection.js'
import { UnifiedGenerationPage } from '../src/client/UnifiedGenerationPage.js'
import { getWorkflowDefinition } from '../src/workflow-catalog.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'

test('old profiles default to Oasis and a saved suite survives opening settings again', async () => {
  assert.equal(resolveConfig(host, {}).get().localSkillSuite, 'oasis')
  assert.equal(resolveConfig(host, { localSkillSuite: 'patent-disclosure' }).get().localSkillSuite, 'patent-disclosure')
  let value = {}, accept = true
  const listeners = new Set()
  const form = {
    getSnapshot: () => ({ status: 'ready', mode: 'host', writable: true, value }),
    subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn) },
    async set(field, next) {
      if (!accept) return false
      value = { ...value, [field]: next }
      for (const fn of listeners) fn()
      return true
    },
  }
  const services = { configForms: { get: () => form }, remote: { $host: { isLoopback: true } },
    connection: { isLoopback: true, generation: { getSnapshot: () => 1, subscribe: () => () => {} } } }
  const makeController = () => {
    const controller = createProductSettings({ remote: { accountStatus: async () => ({
      authenticated: false, available: false, writable: false, accountId: null, revision: null, retryAfterSeconds: 0,
    }) } })
    controller.bind(services)
    return controller
  }
  const controller = makeController()
  assert.equal(controller.getSnapshot().localSkillSuite, 'oasis')
  assert.equal(await controller.saveLocalSkillSuite('patent-disclosure'), true)
  assert.equal(await controller.saveLocalSkillSuite('unrecognized'), false)
  accept = false
  assert.equal(await controller.saveLocalSkillSuite('oasis'), false)
  assert.equal(controller.getSnapshot().localSkillSuite, 'patent-disclosure')
  assert.match(controller.getSnapshot().localSkillSuiteError, /未能保存/)
  controller.dispose()

  const reopened = makeController()
  assert.equal(reopened.getSnapshot().localSkillSuite, 'patent-disclosure')
  reopened.dispose()
})

test('settings presents both repositories with Oasis selected by default', () => {
  const controller = createProductSettings({ remote: {} })
  const html = renderToStaticMarkup(createElement(OasisSettingsSection, { controller }))
  assert.match(html, /本地 Skills 套件/)
  assert.match(html, /<option value="oasis" selected="">绿洲慧写/)
  assert.match(html, /<option value="patent-disclosure">中国专利 Skill/)
  controller.dispose()
})

test('the selected external suite disables local generation without hiding the task inputs', () => {
  const page = { pageId: 'p', title: 'Claims', generation: { source: 'local-skill' },
    formValues: { claims: 'Public test material', technicalField: '', background: '', benefits: '', embodiments: '', drawings: '', instructions: '' },
    inputRefs: [], remoteExecutionOrder: [], remoteExecutions: {}, runs: {}, runOrder: [], activeRunId: null }
  const props = { page, workflow: getWorkflowDefinition('patent-claims', '1'), workspaceId: 'w', syncStatus: 'ready',
    operation: { activeOperation: null }, localGenerationEnabled: true }
  const html = renderToStaticMarkup(createElement(UnifiedGenerationPage, { ...props, localSkillSuite: 'patent-disclosure' }))
  const oasis = renderToStaticMarkup(createElement(UnifiedGenerationPage, props))
  assert.match(oasis, /data-testid="oasis-unified-generate">生成离线样本/)
  assert.match(html, /data-testid="oasis-unified-generate" disabled=""/)
  assert.match(html, /尚未适配.*中国专利 Skill/)
  assert.match(html, /Public test material/)
})

test('switching the host suite blocks pending local confirmation and controlled generation without switching executors', async () => {
  let selected = 'oasis', reached = 0
  const calls = {
    prepareLocalRun() { reached++; return {} },
    createLocalRun() { reached++; return {} },
    prepareV340CandidateConfirmation() { reached++; return {} },
    createV340Run() { reached++; return {} },
    getState() { return { revision: 0 } },
  }
  const professional = { prepareClaimsMapping: () => ({ mapped: true }) }
  const dispatch = createWorkbenchRpcHandler(calls, professional, null, null, {
    m06Candidate013: true, getLocalSkillSuite: () => selected,
  })
  const command = { workspaceId: 'w', taskId: 't', expectedRevision: 0, sessionId: 's' }
  assert.equal((await dispatch('task/prepare-local', command)).ok, true)
  selected = 'patent-disclosure'
  const candidateCommand = { workspaceId: 'w', taskId: 't', expectedRevision: 0 }
  const confirmation = { confirmed: true, sha256: 'a'.repeat(64) }
  for (const [endpoint, payload] of [
    ['task/prepare-local', command],
    ['task/create-local', { ...command, requestKey: 'r', confirmation }],
    ['workflow/v340/candidate/prepare', { ...command, confirmed: true }],
    ['workflow/v340/candidate/run', { ...candidateCommand, requestKey: 'r', candidate: { ...confirmation, sessionId: 's' } }],
  ]) {
    const response = await dispatch(endpoint, payload)
    assert.equal(response.error?.code, 'LOCAL_SKILL_SUITE_UNAVAILABLE', endpoint)
  }
  assert.equal(reached, 1)
  assert.deepEqual(await dispatch('state/get', { workspaceId: 'w' }), { ok: true, value: { revision: 0 } })
  assert.deepEqual(await dispatch('task/prepare-api', { ...candidateCommand, expectedSettingsRevision: 0 }),
    { ok: true, value: { mapped: true } })
  selected = 'oasis'
  assert.equal((await dispatch('task/prepare-local', command)).ok, true)
  assert.equal(reached, 2)
})
