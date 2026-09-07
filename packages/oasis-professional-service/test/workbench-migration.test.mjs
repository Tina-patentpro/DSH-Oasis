import assert from 'node:assert/strict'
import test from 'node:test'

import {
  migrateWorkbenchRecordV1ToV2,
  parseStoredWorkbenchRecord,
} from '../src/workbench-domain.js'
import {
  createLegacyRecord,
  createStoredV2Record,
  createV3Record,
} from './workbench-fixtures.mjs'

test('migrates an exact legal v1 record to schema v2 without inventing run evidence', () => {
  const source = createLegacyRecord()
  const migrated = migrateWorkbenchRecordV1ToV2(source)

  assert.equal(migrated.schemaVersion, 2)
  assert.equal(migrated.workspaceId, source.workspaceId)
  assert.equal(migrated.revision, source.revision)
  assert.equal(migrated.tasks['task-a'].activeRunId, null)
  assert.deepEqual(migrated.tasks['task-a'].runOrder, [])
  assert.deepEqual(migrated.tasks['task-a'].runs, {})
  assert.deepEqual(source, createLegacyRecord(), 'migration must not mutate the v1 source')
  assert.equal(Object.isFrozen(migrated.tasks['task-a']), true)
})

test('preserves arbitrary legal v1 inputRefs as isolated legacy values without fake path or hash', () => {
  const source = createLegacyRecord()
  source.tasks['task-a'].inputRefs = [
    { source: 'old-ui', nested: { value: 3 } },
    { path: 'must-not-be-trusted.md', sha256: 'not-authoritative' },
  ]

  const migrated = migrateWorkbenchRecordV1ToV2(source)
  assert.deepEqual(migrated.tasks['task-a'].inputRefs, [
    {
      referenceId: 'legacy-v1-1',
      kind: 'legacy-v1',
      legacyValue: source.tasks['task-a'].inputRefs[0],
    },
    {
      referenceId: 'legacy-v1-2',
      kind: 'legacy-v1',
      legacyValue: source.tasks['task-a'].inputRefs[1],
    },
  ])
  assert.equal(Object.hasOwn(migrated.tasks['task-a'].inputRefs[1], 'relativePath'), false)
  assert.equal(Object.hasOwn(migrated.tasks['task-a'].inputRefs[1], 'sha256'), false)
})

test('preserves a legal v1 partial workflow identity without inventing missing values', () => {
  const source = createLegacyRecord()
  source.tasks['task-a'].workflowVersion = null

  const migrated = migrateWorkbenchRecordV1ToV2(source)
  assert.deepEqual({
    workType: migrated.tasks['task-a'].workType,
    workflowId: migrated.tasks['task-a'].workflowId,
    workflowVersion: migrated.tasks['task-a'].workflowVersion,
  }, {
    workType: source.tasks['task-a'].workType,
    workflowId: source.tasks['task-a'].workflowId,
    workflowVersion: null,
  })
})

test('accepts v1, v2, or v3 storage rows and always publishes detached frozen v4 records', () => {
  for (const source of [createLegacyRecord(), createStoredV2Record(), createV3Record()]) {
    const parsed = parseStoredWorkbenchRecord('workspace-a', source)
    assert.equal(parsed.schemaVersion, 4)
    assert.notEqual(parsed, source)
    assert.equal(Object.isFrozen(parsed), true)
  }
})

test('rejects unknown storage versions instead of guessing a migration', () => {
  assert.throws(
    () => parseStoredWorkbenchRecord('workspace-a', { ...createV3Record(), schemaVersion: 5 }),
    /unsupported.*schemaVersion|schemaVersion.*unsupported/i,
  )
})
