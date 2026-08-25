import assert from 'node:assert/strict'
import test from 'node:test'

import { recordToWorkspaceState } from '../../../../packages/oasis-professional-service/src/client/workbench-model.js'

const NOW = '2026-08-25T00:00:00.000Z'

test('Client rejects a malformed task returned across the generic RPC boundary', () => {
  const malformed = {
    schemaVersion: 1,
    workspaceId: 'workspace-a',
    revision: 1,
    panelMode: 'normal',
    activeTaskId: 'task-a',
    taskOrder: ['task-a'],
    tasks: {
      'task-a': {
        taskId: 'task-a',
        title: { not: 'renderable React text' },
        workType: 'unsupported-work-type',
        workflowId: 'technical-rd',
        workflowVersion: '1',
        inputRefs: [],
        formValues: {},
        run: { unexpected: true },
        preview: null,
        review: 'approved-without-review',
        createdAt: 'not-a-timestamp',
        updatedAt: NOW,
      },
    },
    updatedAt: NOW,
  }

  assert.throws(
    () => recordToWorkspaceState(malformed),
    /invalid|malformed|title|workType|review|timestamp/i,
  )
})
