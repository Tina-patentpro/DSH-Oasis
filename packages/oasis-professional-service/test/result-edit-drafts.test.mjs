import assert from 'node:assert/strict'
import test from 'node:test'
import { resultEditFixture } from './result-edit-fixture.mjs'
import { createHash } from 'node:crypto'

test('version, task and workspace view changes retain exact result edits without cross-project reuse', async t => {
  const h = await resultEditFixture(t, () => ({}))
  assert.equal(typeof h.store.updateResultEditDraft, 'function')
  h.store.updateResultEditDraft('workspace-a', 'task-a', 'run-1', '甲\n  保留空白\n')
  h.store.activateRun('workspace-a', 'task-a', 'run-2')
  h.store.activateRun('workspace-a', 'task-a', 'run-1')
  h.store.createPage('workspace-a')
  h.store.activatePage('workspace-a', 'task-a')
  h.store.setPanelMode('workspace-a', 'hidden')
  h.store.setPanelMode('workspace-a', 'normal')
  assert.equal(h.draft().body, '甲\n  保留空白\n')
  h.store.updateResultEditDraft('workspace-b', 'task-a', 'run-1', '乙项目正文')
  assert.equal(h.draft('run-1', 'workspace-b').body, '乙项目正文')
  assert.equal(h.draft().body, '甲\n  保留空白\n')
  assert.throws(() => h.store.closePage('workspace-a', 'task-a'), /未保存/)
  await assert.rejects(h.store.reloadWorkspace('workspace-a'), /未保存/)
  await h.store.whenSettled('workspace-a')
  assert.doesNotMatch(JSON.stringify(h.state()), /保留空白|乙项目正文/, 'client draft is not an approved Host artifact')
  h.store.discardResultEditDraft('workspace-a', 'task-a', 'run-1')
  assert.equal(h.draft(), undefined)
})

test('successful edit produces a new unreviewed version and clears only the submitted draft revision', async t => {
  let release, entered
  const started = new Promise(r => { entered = r })
  const gate = new Promise(r => { release = r })
  const h = await resultEditFixture(t, remote => ({ async editUnifiedResult(...args) { entered(); await gate; return remote.editUnifiedResult(...args) } }))
  assert.equal(typeof h.store.updateResultEditDraft, 'function')
  const original = h.page().runs['run-1'].result.artifact.body
  h.store.updateResultEditDraft('workspace-a', 'task-a', 'run-1', '保存的第一稿')
  const saving = h.store.editUnifiedResult('workspace-a', 'task-a', 'run-1', '保存的第一稿')
  await started
  h.store.updateResultEditDraft('workspace-a', 'task-a', 'run-1', '保存期间的新编辑')
  release(); await saving
  assert.equal(h.draft().body, '保存期间的新编辑')
  assert.equal(h.page().runs['run-1'].result.artifact.body, original)
  assert.equal(h.page().runs[h.page().activeRunId].result.artifact.body, '保存的第一稿')
  assert.equal(h.page().runs[h.page().activeRunId].review.status, 'not-reviewed')
  await h.store.editUnifiedResult('workspace-a', 'task-a', 'run-1', '保存期间的新编辑')
  assert.equal(h.draft(), undefined)
})

for (const mode of ['transport-failure', 'revision-conflict']) {
  test(`${mode} preserves the exact draft instead of reporting it saved`, async t => {
    const h = await resultEditFixture(t, remote => ({ async editUnifiedResult() {
      if (mode === 'transport-failure') throw Error('public synthetic disconnected edit')
      return { committed: false, reason: 'revision-conflict', current: await remote.get('workspace-a') }
    } }))
    assert.equal(typeof h.store.updateResultEditDraft, 'function')
    h.store.updateResultEditDraft('workspace-a', 'task-a', 'run-1', '不可丢失的修订')
    await assert.rejects(h.store.editUnifiedResult('workspace-a', 'task-a', 'run-1', '不可丢失的修订'))
    assert.equal(h.draft().body, '不可丢失的修订')
    assert.equal(h.draft().dirty, true)
    assert.throws(() => h.store.closePage('workspace-a', 'task-a'), /未保存/)
  })
}

test('dirty drafts prohibit review, conversation preparation and writeback through the store', async t => {
  const h = await resultEditFixture(t, () => ({}))
  assert.equal(typeof h.store.updateResultEditDraft, 'function')
  await h.store.reviewRun('workspace-a', 'task-a', 'run-1', 'approved', '')
  h.store.updateResultEditDraft('workspace-a', 'task-a', 'run-1', '未保存编辑')
  await assert.rejects(h.store.reviewRun('workspace-a', 'task-a', 'run-1', 'approved', ''), /未保存/)
  await assert.rejects(h.store.useInConversation('workspace-a', 'task-a', 'run-1'), /未保存/)
  await assert.rejects(h.store.prepareWriteback('workspace-a', 'task-a', 'run-1'), /未保存/)
  assert.throws(() => h.store.updateResultEditDraft('workspace-a', 'task-a', 'unknown-run', '正文'))
  assert.throws(() => h.store.updateResultEditDraft('workspace-a', 'task-a', 'run-1', 'x'.repeat(100001)))
})

test('an authoritative artifact change retains the old edit but refuses to save it against the new base', async t => {
  const h = await resultEditFixture(t, () => ({}))
  h.store.updateResultEditDraft('workspace-a', 'task-a', 'run-1', '旧基准的珍贵草稿')
  const baseId = h.draft().baseArtifactId
  const next = structuredClone(h.state())
  const artifact = next.tasks['task-a'].runs['run-1'].result.artifact
  artifact.body = 'changed authoritative result'
  artifact.sha256 = createHash('sha256').update(artifact.body).digest('hex')
  artifact.artifactId = 'sha256:' + artifact.sha256
  next.revision++
  h.records.set('workspace-a', next)
  await h.store.hydrateWorkspace('workspace-a', { force: true })
  assert.equal(h.draft().body, '旧基准的珍贵草稿')
  assert.equal(h.draft().baseArtifactId, baseId)
  await assert.rejects(h.store.editUnifiedResult('workspace-a', 'task-a', 'run-1', '旧基准的珍贵草稿'), /基准/)
  assert.throws(() => h.store.updateResultEditDraft('workspace-a', 'task-a', 'run-1', '另一稿'), /基准/)
  h.store.discardResultEditDraft('workspace-a', 'task-a', 'run-1')
  assert.equal(h.draft(), undefined)
})
