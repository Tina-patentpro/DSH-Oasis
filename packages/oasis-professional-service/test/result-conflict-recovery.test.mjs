import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { resultEditFixture } from './result-edit-fixture.mjs'
import { PanelPages } from '../src/client/PanelPages.js'

for (const status of ['conflict', 'error']) {
  test(`${status} recovery exposes every task's exact dirty result without cross-Workspace reuse`, async t => {
    let failGet = false
    const h = await resultEditFixture(t, remote => ({
      async get(...args) { if (failGet) throw Error('synthetic Host unavailable'); return remote.get(...args) },
      async editUnifiedResult() { return { committed: false, reason: 'revision-conflict', current: await remote.get('workspace-a') } },
    }))
    const a = structuredClone(h.state())
    a.tasks['task-b'] = { ...structuredClone(a.tasks['task-a']), taskId: 'task-b', title: '非活动任务' }
    a.taskOrder.push('task-b'); h.records.set('workspace-a', a)
    await h.store.hydrateWorkspace('workspace-a', { force: true })
    h.store.updateResultEditDraft('workspace-a', 'task-a', 'run-1', '甲\n  空白保全\n<script>public</script>')
    h.store.updateResultEditDraft('workspace-a', 'task-b', 'run-2', '非活动任务正文')
    h.store.updateResultEditDraft('workspace-b', 'task-a', 'run-1', 'OTHER_WORKSPACE_CANARY')
    if (status === 'conflict') {
      await assert.rejects(h.store.editUnifiedResult('workspace-a', 'task-a', 'run-1', h.draft().body))
    } else {
      failGet = true
      await h.store.hydrateWorkspace('workspace-a', { force: true })
    }
    const state = h.store.getWorkspaceState('workspace-a')
    assert.equal(state.syncStatus, status)
    const markup = renderToStaticMarkup(createElement(PanelPages, { state,
      onDiscardResultEditDraft: (...args) => h.store.discardResultEditDraft('workspace-a', ...args) }))
    assert.equal((markup.match(/<textarea/g) ?? []).length, 2)
    assert.match(markup, /readonly=""/)
    assert.match(markup, /甲\n  空白保全\n&lt;script&gt;public&lt;\/script&gt;/)
    assert.match(markup, /非活动任务正文/)
    assert.match(markup, new RegExp(h.draft().baseArtifactId))
    assert.doesNotMatch(markup, /OTHER_WORKSPACE_CANARY|<script>/)
    assert.match(markup, /放弃此结果编辑/)
    await assert.rejects(h.store.reloadWorkspace('workspace-a'), /未保存/)
    h.store.discardResultEditDraft('workspace-a', 'task-a', 'run-1')
    await assert.rejects(h.store.reloadWorkspace('workspace-a'), /未保存/)
    assert.equal(h.store.getWorkspaceState('workspace-a').pageOperations['task-b'].resultEditDrafts['run-2'].body, '非活动任务正文')
    h.store.discardResultEditDraft('workspace-a', 'task-b', 'run-2')
    failGet = false
    await h.store.reloadWorkspace('workspace-a')
    assert.equal(h.store.getWorkspaceState('workspace-a').syncStatus, 'ready')
    assert.equal(h.draft('run-1', 'workspace-b').body, 'OTHER_WORKSPACE_CANARY')
  })
}

test('discarding a stale recovery snapshot cannot erase a newer edit or alter input fields', async t => {
  const h = await resultEditFixture(t)
  h.store.updateResultEditDraft('workspace-a', 'task-a', 'run-1', '已展示的恢复正文')
  const shown = h.draft()
  h.store.updateResultEditDraft('workspace-a', 'task-a', 'run-1', '随后产生的新编辑')
  assert.throws(() => h.store.discardResultEditDraft('workspace-a', 'task-a', 'run-1', shown), /草稿已变化/)
  assert.equal(h.draft().body, '随后产生的新编辑')
  const input = structuredClone(h.page().formValues)
  h.store.discardResultEditDraft('workspace-a', 'task-a', 'run-1', h.draft())
  assert.equal(h.draft(), undefined)
  assert.deepEqual(h.page().formValues, input)
})

test('recovery cannot discard an edit while its save is in flight', async t => {
  let entered, release
  const started = new Promise(r => { entered = r })
  const gate = new Promise(r => { release = r })
  const h = await resultEditFixture(t, () => ({ async editUnifiedResult() { entered(); await gate; throw Error('synthetic lost response') } }))
  h.store.updateResultEditDraft('workspace-a', 'task-a', 'run-1', '保存中的草稿')
  const saving = h.store.editUnifiedResult('workspace-a', 'task-a', 'run-1', h.draft().body)
  await started
  try {
    assert.throws(() => h.store.discardResultEditDraft('workspace-a', 'task-a', 'run-1', h.draft()), /等待/)
  } finally { release() }
  await assert.rejects(saving)
  assert.equal(h.draft().body, '保存中的草稿')
})
