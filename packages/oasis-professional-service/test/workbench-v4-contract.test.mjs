import assert from 'node:assert/strict'
import test from 'node:test'
import { createEmptyWorkbenchRecord, parseStoredWorkbenchRecord } from '../src/workbench-domain.js'
import { getWorkflowCatalog, validateWorkflowForm } from '../src/workflow-catalog.js'
import { createLegacyRecord, createStoredV2Record, createV3Record } from './workbench-fixtures.mjs'
import { createWorkbenchService } from '../src/workbench-service.js'
import { openOasisWorkbenchRepository } from '../src/workbench-repository.js'
import { workspaceStateToDraft, recordToWorkspaceState } from '../src/client/workbench-model.js'

test('new workspaces use v4, without relabeling old mock evidence', () => {
  assert.equal(createEmptyWorkbenchRecord('workspace-a').schemaVersion, 4)
  for (const source of [createLegacyRecord(), createStoredV2Record('workspace-a', 1, { withEvidence: true }), createV3Record('workspace-a', 1, { withEvidence: true })]) {
    const before = structuredClone(source)
    const migrated = parseStoredWorkbenchRecord('workspace-a', source)
    assert.equal(migrated.schemaVersion, 4)
    assert.equal(migrated.tasks['task-a'].generation, null)
    if (source.tasks['task-a'].runs) assert.deepEqual(migrated.tasks['task-a'].runs, source.tasks['task-a'].runs)
    assert.deepEqual(source, before)
    assert.equal(Object.isFrozen(migrated.tasks['task-a']), true)
  }
})

function claimsRecord() {
  const record = structuredClone(parseStoredWorkbenchRecord('workspace-a', createV3Record()))
  const task = record.tasks['task-a']
  Object.assign(task, {
    workType: 'cn-invention-patent', workflowId: 'patent-claims', workflowVersion: '1',
    generation: { inputSchemaVersion: '1', source: 'local-skill' },
    formValues: { claims: '待审阅文字', technicalField: '', background: '', benefits: '', embodiments: '', drawings: '', instructions: '' },
  })
  return record
}

test('v4 rejects forged source, schema, extra form and cross-template metadata', () => {
  const record = claimsRecord()
  assert.doesNotThrow(() => parseStoredWorkbenchRecord('workspace-a', record))
  for (const mutate of [
    task => { task.generation.source = 'local-mock' },
    task => { task.generation.inputSchemaVersion = '2' },
    task => { task.generation.skillBody = 'must not persist' },
    task => { task.formValues.hiddenInput = 'extra' },
    task => { task.workflowId = 'technical-rd' },
    task => { task.generation = null },
  ]) {
    const changed = structuredClone(record)
    mutate(changed.tasks['task-a'])
    assert.throws(() => parseStoredWorkbenchRecord('workspace-a', changed))
  }
})

test('v4 rejects old-client metadata loss, retains revision conflicts and reopens the source', async () => {
  let stored = claimsRecord()
  const storage = { async open() { return { table() { return { get() { return stored }, async put(key, value) { stored = value } } }, async close() {} } } }
  let repository = await openOasisWorkbenchRepository(storage)
  try {
    const oldDraft = workspaceStateToDraft(recordToWorkspaceState(stored))
    const stale = structuredClone(oldDraft)
    stale.schemaVersion = 3
    delete stale.tasks['task-a'].generation
    await assert.rejects(repository.replaceEditable('workspace-a', stored.revision, stale), /generation|older/i)
    const draft = structuredClone(oldDraft)
    draft.tasks['task-a'].generation.source = 'oasis-api'
    const saved = await repository.replaceEditable('workspace-a', stored.revision, draft)
    assert.equal(saved.committed, true)
    assert.equal((await repository.replaceEditable('workspace-a', stored.revision - 1, oldDraft)).reason, 'revision-conflict')
    await repository.close()
    repository = await openOasisWorkbenchRepository(storage)
    assert.equal(repository.get('workspace-a').tasks['task-a'].generation.source, 'oasis-api')
  } finally { await repository.close() }
})

test('Host refuses new claims through the old mock execution path before reading material', async () => {
  const record = claimsRecord()
  const calls = []
  const service = createWorkbenchService({
    repository: { get() { return record }, replaceEditable() {}, async mutate(w, r, fn) { return fn(record) } },
    materialManager: { confirm() {}, refresh() {}, async recheckAll() { calls.push('material'); return [] } },
    localMockRunner() { calls.push('mock'); throw new Error('wrong execution path') },
  })
  await assert.rejects(service.createRun({ workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: 1, requestKey: 'key' }), error => error.code === 'GENERATION_NOT_ENABLED')
  assert.deepEqual(calls, [])
})

test('Host catalog provides claims with seven ordered text tabs, not a real Skill or API binding', () => {
  const workflow = getWorkflowCatalog().workflows.find(w => w.workflowId === 'patent-claims')
  assert.ok(workflow, 'confirmed claims template must be present')
  assert.equal(workflow.executionMode, 'unified-text')
  assert.equal(workflow.title, '权利要求书生成')
  assert.deepEqual(workflow.form.fields.map(f => f.label), ['权利要求书', '技术领域', '背景技术', '有益效果', '具体实施方式', '附图说明', '用户指令'])
  assert.deepEqual(workflow.form.fields.filter(f => f.required).map(f => f.fieldId), ['claims'])
  const values = Object.fromEntries(workflow.form.fields.map(f => [f.fieldId, '']))
  assert.throws(() => validateWorkflowForm('patent-claims', '1', values))
  values.claims = '一项待审阅的权利要求草稿'
  assert.deepEqual(validateWorkflowForm('patent-claims', '1', values), values)
  assert.throws(() => validateWorkflowForm('patent-claims', '1', { ...values, invented: 'field' }))
  assert.throws(() => validateWorkflowForm('patent-claims', '1', { ...values, claims: 'x'.repeat(20001) }))
})
