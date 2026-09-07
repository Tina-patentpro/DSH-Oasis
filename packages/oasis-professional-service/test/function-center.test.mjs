import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PanelPages } from '../src/client/PanelPages.js'
import { createPanelHostCoordinator } from '../src/client/panel-host-coordinator.js'
import { getWorkflowCatalog } from '../src/workflow-catalog.js'

test('function center retains native side chat and business categories without obsolete feature cards', () => {
  const state = { workspaceId: 'a', syncStatus: 'ready', catalogStatus: 'ready', workflows: getWorkflowCatalog().workflows,
    pages: [{ pageId: 'new', title: '新任务', view: 'chooser' }], activePageId: 'new', pageOperations: {} }
  const html = renderToStaticMarkup(createElement(PanelPages, { state }))
  for (const label of ['功能中心', '技术研发', '专利撰写', '辅助工具', '文件', '任务管理', '侧边对话', '浏览器', '权利要求书生成']) assert.ok(html.includes(label), label)
  assert.doesNotMatch(html, /OASIS PROFESSIONAL LOOP|文件变动|终端|任务名称/)
  assert.match(html, /data-testid="oasis-workflow-patent-claims"/)
  assert.doesNotMatch(html, /data-testid="oasis-workflow-cn-invention-patent"/)
})

test('native actions recheck public registry, settings and unique current session on each click', () => {
  const calls = []
  const events = new Set()
  const tabs = ['editor', 'subagent', 'sidechat', 'browser', 'terminal', 'git'].map(id => ({ id }))
  let allowed = true
  const service = { version: '0.18.0', features: ['targetedOpen', 'stateSubscription'],
    registerTab: () => () => {}, getTabs: () => tabs, isTabEnabled: () => allowed,
    getSnapshot: () => ({ sessionId: 's-a', state: {} }), subscribeState: fn => { events.add(fn); return () => events.delete(fn) },
    subscribe: () => () => {}, openTab: (...args) => calls.push(args) }
  const c = createPanelHostCoordinator({ layoutAdapter: { releaseStandalone() {} } })
  c.attachBetterSidebar(service, { id: 'oasis-professional-service:workbench', single: true, component() {} })
  c.updateWorkspaceContext({ status: 'ready', currentSessionId: 's-a', workspaceItems: [{ workspaceId: 'a', sessionIds: ['s-a'] }] })
  assert.equal(typeof c.openNativeTool, 'function')
  assert.equal(c.openNativeTool('a', 'sidechat'), true)
  assert.deepEqual(calls, [[{ type: 'sidechat' }, { sessionId: 's-a' }]])
  assert.equal(c.openNativeTool('a', 'terminal'), false)
  assert.equal(c.openNativeTool('a', 'git'), false)
  assert.equal(c.openNativeTool('b', 'editor'), false)
  allowed = false
  assert.equal(c.openNativeTool('a', 'browser'), false)
  allowed = true
  c.updateWorkspaceContext({ status: 'ready', currentSessionId: 's-a', workspaceItems: [{ workspaceId: 'a', sessionIds: ['s-a'] }, { workspaceId: 'b', sessionIds: ['s-a'] }] })
  assert.equal(c.openNativeTool('a', 'editor'), false)
  c.dispose()
  assert.equal(c.openNativeTool('a', 'sidechat'), false)
  assert.equal(events.size, 0)
  assert.equal(calls.length, 1)
})

test('saved-file opening requires safe capability and refuses late or cross-workspace targets', () => {
  const calls = []
  const service = { version: '0.18.0', features: ['targetedOpen', 'openFile', 'safeFilePreview'],
    registerTab: () => () => {}, getTabs: () => [{ id: 'editor' }], isTabEnabled: () => true,
    openTab() {}, openFile: (...args) => calls.push(args) }
  const coordinator = createPanelHostCoordinator({ layoutAdapter: { releaseStandalone() {} } })
  coordinator.attachBetterSidebar(service, { id: 'oasis-professional-service:workbench', single: true, component() {} })
  const context = { status: 'ready', currentSessionId: 's-a', workspaceItems: [{ workspaceId: 'a', sessionIds: ['s-a'] }] }
  coordinator.updateWorkspaceContext(context)
  assert.equal(typeof coordinator.captureSavedFileTarget, 'function')
  const target = coordinator.captureSavedFileTarget('a')
  const file = { workspaceId: 'a', absolutePath: 'C:/project/claims.md', kind: 'current-file' }
  assert.equal(coordinator.openSavedFile(target, { ...file, workspaceId: 'b' }), false)
  assert.equal(coordinator.openSavedFile(target, file), true)
  assert.deepEqual(calls[0], [{ sessionId: 's-a' }, file.absolutePath, undefined, { safePreview: true }])
  coordinator.updateWorkspaceContext({ ...context, currentSessionId: 's-b' })
  assert.equal(coordinator.openSavedFile(target, file), false)
  coordinator.dispose()
  assert.equal(calls.length, 1)
})
