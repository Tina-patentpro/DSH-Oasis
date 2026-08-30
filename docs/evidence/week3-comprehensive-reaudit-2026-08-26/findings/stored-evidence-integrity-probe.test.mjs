import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

import { createCanonicalInputSnapshot } from '../../../../packages/oasis-professional-service/src/local-mock-runner.js'
import { parseWorkbenchRecord } from '../../../../packages/oasis-professional-service/src/workbench-domain.js'
import {
  createMaterialReference,
  createV2Record,
  NOW,
} from '../../../../packages/oasis-professional-service/test/workbench-fixtures.mjs'

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function validRecord() {
  const material = createMaterialReference()
  const inputSnapshot = createCanonicalInputSnapshot({
    workflowId: 'technical-rd',
    workflowVersion: '1',
    formValues: { objective: 'audit objective' },
    inputRefs: [material],
    capturedAt: NOW,
  })
  const body = '## audit\n\nstored evidence integrity probe\n'
  const artifactHash = sha256(body)
  const record = createV2Record('workspace-a', 1, { withEvidence: true })
  record.tasks['task-a'].runs['run-a'].inputSnapshot = structuredClone(inputSnapshot)
  record.tasks['task-a'].runs['run-a'].result.artifact = {
    artifactId: `sha256:${artifactHash}`,
    suggestedFileName: 'audit.md',
    mediaType: 'text/markdown',
    body,
    sha256: artifactHash,
  }
  return record
}

test('stored record rejects an artifact body that no longer matches its declared hash', () => {
  const record = validRecord()
  parseWorkbenchRecord('workspace-a', record)
  record.tasks['task-a'].runs['run-a'].result.artifact.body += 'tampered'
  assert.throws(() => parseWorkbenchRecord('workspace-a', record), /sha256|hash|artifact/i)
})

test('stored record rejects form values that no longer match the input snapshot hash', () => {
  const record = validRecord()
  parseWorkbenchRecord('workspace-a', record)
  record.tasks['task-a'].runs['run-a'].inputSnapshot.formValues.objective = 'tampered objective'
  assert.throws(() => parseWorkbenchRecord('workspace-a', record), /sha256|hash|input/i)
})
