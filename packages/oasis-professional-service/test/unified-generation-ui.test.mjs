import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { WorkflowForm, validateWorkflowFormValues } from '../src/client/WorkflowForm.js'
import { PanelPages } from '../src/client/PanelPages.js'
import { createWorkbenchStore } from '../src/client/workbench-store.js'
import { getWorkflowCatalog } from '../src/workflow-catalog.js'
import { recordToWorkspaceState, workspaceStateToDraft } from '../src/client/workbench-model.js'
import { createEmptyWorkbenchRecord } from '../src/workbench-domain.js'
import { NOW } from './workbench-fixtures.mjs'

function nodes(root) {
  if (root == null || typeof root === 'boolean') return []
  if (Array.isArray(root)) return root.flatMap(nodes)
  return [root, ...nodes(root?.props?.children)]
}

test('material preview uses a capable native renderer with images disabled, otherwise plain text', () => {
  const calls = []
  function NativeRenderer(props) { calls.push(props); return createElement('strong', null, 'native-rich-preview') }
  const workflow = getWorkflowCatalog().workflows.find(w => w.workflowId === 'patent-claims')
  const values = { claims: '# Material ![x](https://example.invalid/x)' }
  const props = { pageId: 'p', workflow, values, validation: validateWorkflowFormValues(workflow, values),
    presentation: 'tabs', activeFieldId: 'claims', preview: true, markdownRenderer: NativeRenderer }
  let html = renderToStaticMarkup(createElement(WorkflowForm, props))
  assert.equal(calls.length, 0, 'unpatched native renderer must not run')
  assert.match(html, /# Material/)
  NativeRenderer.resourcePolicyVersion = 1
  html = renderToStaticMarkup(createElement(WorkflowForm, props))
  assert.match(html, /native-rich-preview/)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].allowRemoteImages, false)
  assert.equal(calls[0].text, values.claims)
  assert.equal(calls[0].fileMentions, undefined)
})

test('native default source and output prefix only seed newly selected tasks', async () => {
  let preferences = { defaultGenerationSource: 'oasis-api', outputDirectoryPrefix: '产物' }
  let sequence = 0
  const store = createWorkbenchStore({ workflowCatalog: getWorkflowCatalog(), createId: () => `task-${++sequence}`,
    connectionSettings: { getSnapshot: () => preferences } })
  try {
    store.syncWorkspaces([{ workspaceId: 'a' }])
    store.createPage('a'); store.selectWorkflow('a', 'task-1', 'patent-claims')
    store.updateFormValue('a', 'task-1', 'claims', '保留原稿')
    assert.equal(store.getWorkspaceState('a').pages[0].generation.source, 'oasis-api')
    assert.equal(store.getWorkspaceState('a').pageOperations['task-1'].writebackDirectory, '产物\\task-1')
    preferences = { defaultGenerationSource: 'local-skill', outputDirectoryPrefix: '新产物' }
    store.createPage('a'); store.selectWorkflow('a', 'task-2', 'patent-claims')
    const state = store.getWorkspaceState('a')
    assert.equal(state.pages[0].generation.source, 'oasis-api')
    assert.equal(state.pages[0].formValues.claims, '保留原稿')
    assert.equal(state.pages[1].generation.source, 'local-skill')
    assert.equal(state.pageOperations['task-1'].writebackDirectory, '产物\\task-1')
    assert.equal(state.pageOperations['task-2'].writebackDirectory, '新产物\\task-2')
    assert.equal(state.pages.every(page => page.runOrder.length === 0), true)
  } finally { await store.dispose() }
})

test('tabbed materials render exactly one editor and preserve inactive values with keyboard selection', () => {
  const workflow = getWorkflowCatalog().workflows.find(w => w.workflowId === 'patent-claims')
  const values = Object.fromEntries(workflow.form.fields.map(f => [f.fieldId, f.label]))
  const original = structuredClone(values)
  const activated = []
  const changed = []
  const props = { pageId: 'task-a', workflow, values, validation: validateWorkflowFormValues(workflow, values), disabled: false,
    presentation: 'tabs', activeFieldId: 'claims', onActivateField: id => activated.push(id), onChange: (id, value) => changed.push([id, value]) }
  const tree = WorkflowForm(props)
  const tabs = nodes(tree).filter(n => n?.props?.role === 'tab')
  assert.equal(tabs.length, 7)
  assert.equal(nodes(tree).filter(n => n?.type === 'textarea').length, 1)
  assert.equal(tabs[0].props['aria-selected'], true)
  tabs[1].props.onClick()
  tabs[0].props.onKeyDown({ key: 'End', preventDefault() {}, currentTarget: { parentElement: { children: [] } } })
  assert.deepEqual(activated, ['technicalField', 'instructions'])
  const next = WorkflowForm({ ...props, activeFieldId: 'technicalField' })
  const editor = nodes(next).find(n => n?.type === 'textarea')
  assert.equal(editor.props.value, '技术领域')
  editor.props.onChange({ currentTarget: { value: '更新技术领域' } })
  assert.deepEqual(changed, [['technicalField', '更新技术领域']])
  assert.deepEqual(values, original)
})

test('claims page has a single form, source switch and disabled generation, without the legacy API panel', () => {
  const workflow = getWorkflowCatalog().workflows.find(w => w.workflowId === 'patent-claims')
  const page = {
    pageId: 'task-a', title: workflow.title, workflowId: workflow.workflowId, workflowVersion: '1', workType: workflow.workType,
    generation: { inputSchemaVersion: '1', source: 'local-skill' },
    formValues: Object.fromEntries(workflow.form.fields.map(f => [f.fieldId, ''])),
    activeRunId: null, runOrder: [], runs: {}, inputRefs: [], professionalDraft: null, remoteExecutionOrder: [], remoteExecutions: {}, view: 'workspace',
  }
  const state = { workspaceId: 'workspace-a', syncStatus: 'ready', pages: [page], activePageId: page.pageId, workflows: [workflow], pageOperations: {} }
  for (const source of ['local-skill', 'oasis-api']) {
    page.generation.source = source
    const html = renderToStaticMarkup(createElement(PanelPages, { state, effectiveMode: 'embedded' }))
    assert.match(html, /data-testid="oasis-generation-source"/)
    assert.equal((html.match(/<textarea/g) ?? []).length, 1)
    assert.match(html, /本地 Skills/)
    assert.match(html, /专业 API/)
    assert.match(html, /data-testid="oasis-unified-generate"[^>]*disabled/)
    assert.doesNotMatch(html, /观察当前页流水|提交专业服务|登记材料|API origin/)
    assert.match(html, /min-width: 680px/)
  }
})

test('source switching preserves one persisted draft, clears confirmations, and never generates', async () => {
  let stored = createEmptyWorkbenchRecord('workspace-a')
  const calls = []
  const remote = {
    async get() { return stored },
    async replace(workspaceId, expectedRevision, draft) {
      calls.push('save')
      stored = { ...draft, workspaceId, revision: expectedRevision + 1, updatedAt: NOW,
        tasks: Object.fromEntries(draft.taskOrder.map(id => [id, { ...draft.tasks[id], inputRefs: [], runOrder: [], runs: {}, remoteExecutionOrder: [], remoteExecutions: {} }])) }
      return { committed: true, current: stored }
    },
    async createRun() { calls.push('generate'); throw new Error('must not run') },
  }
  const store = createWorkbenchStore({ remote, workflowCatalog: getWorkflowCatalog(), createId: () => 'task-a', clock: () => NOW, saveDelayMs: 0 })
  try {
    store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
    await store.hydrateWorkspace('workspace-a')
    store.createPage('workspace-a')
    assert.ok(getWorkflowCatalog().workflows.some(w => w.workflowId === 'patent-claims'))
    store.selectWorkflow('workspace-a', 'task-a', 'patent-claims')
    store.updateFormValue('workspace-a', 'task-a', 'claims', '保留草稿')
    assert.equal(typeof store.setGenerationSource, 'function')
    store.setProfessionalConfirmations('workspace-a', 'task-a', { priceConfirmed: true, externalTransferConfirmed: true })
    store.setGenerationSource('workspace-a', 'task-a', 'oasis-api')
    assert.equal(store.getWorkspaceState('workspace-a').pageOperations['task-a'].priceConfirmed, false)
    assert.equal(store.getWorkspaceState('workspace-a').pageOperations['task-a'].externalTransferConfirmed, false)
    store.setGenerationSource('workspace-a', 'task-a', 'local-skill')
    await store.whenSettled('workspace-a')
    const state = recordToWorkspaceState(stored)
    assert.equal(state.pages[0].formValues.claims, '保留草稿')
    assert.deepEqual(state.pages[0].generation, { inputSchemaVersion: '1', source: 'local-skill' })
    assert.equal(workspaceStateToDraft(state).schemaVersion, 4)
    assert.equal(calls.every(c => c === 'save'), true)
    await assert.rejects(() => store.createRun('workspace-a', 'task-a'), /未启用|not enabled/i)
    assert.equal(calls.includes('generate'), false)
  } finally { await store.dispose() }
})
