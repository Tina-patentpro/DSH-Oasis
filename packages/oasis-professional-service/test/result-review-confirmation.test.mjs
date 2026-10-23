import assert from 'node:assert/strict'
import test from 'node:test'
import { resultEditFixture } from './result-edit-fixture.mjs'

const target = h => ({ workspaceId: 'workspace-a', artifactId: h.page().runs['run-1'].result.artifact.artifactId,
  revision: h.store.getWorkspaceState('workspace-a').revision })

test('a confirmation cannot approve after version selection changed or against a different project', async t => {
  const h = await resultEditFixture(t, () => ({}))
  h.store.activateRun('workspace-a', 'task-a', 'run-1'); await h.store.whenSettled('workspace-a')
  const confirmation = target(h)
  h.store.activateRun('workspace-a', 'task-a', 'run-2'); await h.store.whenSettled('workspace-a')
  await assert.rejects(h.store.reviewRun('workspace-a', 'task-a', 'run-1', 'approved', '', confirmation), /审核确认.*失效/)
  await assert.rejects(h.store.reviewRun('workspace-b', 'task-a', 'run-1', 'approved', '', confirmation), /审核确认.*失效/)
  assert.equal(h.state().tasks['task-a'].runs['run-1'].review.status, 'not-reviewed')
})

test('the fixed review target is rechecked after flushing and duplicate approval dispatch is prevented', async t => {
  let dispatches = 0
  const h = await resultEditFixture(t, remote => ({ async reviewRun(...args) { dispatches++; return remote.reviewRun(...args) } }))
  h.store.activateRun('workspace-a', 'task-a', 'run-1'); await h.store.whenSettled('workspace-a')
  const confirmation = target(h)
  const pending = h.store.reviewRun('workspace-a', 'task-a', 'run-1', 'approved', '', confirmation)
  await assert.rejects(h.store.reviewRun('workspace-a', 'task-a', 'run-1', 'approved', '', confirmation))
  await pending
  assert.equal(dispatches, 1)
  assert.equal(h.state().tasks['task-a'].runs['run-1'].review.status, 'approved')
  assert.equal(h.state().tasks['task-a'].runs['run-2'].review.status, 'not-reviewed')
  await assert.rejects(h.store.reviewRun('workspace-a', 'task-a', 'run-1', 'approved', '', confirmation), /审核确认.*失效/)
})

test('selection changed while review awaits flushing prevents any Host approval', async t => {
  let calls = 0
  const h = await resultEditFixture(t, remote => ({async reviewRun(...args) { calls++; return remote.reviewRun(...args) }}))
  h.store.activateRun('workspace-a', 'task-a', 'run-1'); await h.store.whenSettled('workspace-a')
  const pending = h.store.reviewRun('workspace-a','task-a','run-1','approved','',target(h))
  h.store.activateRun('workspace-a', 'task-a', 'run-2')
  await assert.rejects(pending)
  assert.equal(calls, 0)
})
