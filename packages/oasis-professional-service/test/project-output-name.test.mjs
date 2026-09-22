import test from 'node:test'
import assert from 'node:assert/strict'
import { projectOutputFileName } from '../src/project-output-name.js'
test('shared project naming only marks API with terminal OIW; version comes from selected run order', () => {
  const run = { runId: 'a', source: 'local-skill', workflowId: 'patent-claims', completedAt: '2026-09-22T06:30:00Z' }
  assert.equal(projectOutputFileName({ runOrder: ['a', 'b'] }, run), '权利要求书_20260922-143000_v1.md')
  assert.equal(projectOutputFileName({ runOrder: ['a', 'b'] }, { ...run, runId: 'b', source: 'oasis-api' }), '权利要求书_20260922-143000_v2_OIW.md')
  assert.throws(() => projectOutputFileName({ runOrder: ['b'] }, run))
})
