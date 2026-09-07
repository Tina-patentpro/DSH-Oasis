import assert from 'node:assert/strict'
import test from 'node:test'

import { PanelChrome } from '../src/client/PanelChrome.js'
import { PanelPages } from '../src/client/PanelPages.js'

function childrenOf(element) {
  const children = element?.props?.children
  return children === undefined ? [] : Array.isArray(children) ? children : [children]
}

function allNodes(root) {
  const nodes = []
  function visit(value) {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (value === null || value === undefined || typeof value === 'boolean') return
    nodes.push(value)
    if (typeof value === 'object') childrenOf(value).forEach(visit)
  }
  visit(root)
  return nodes
}

function textOf(root) {
  return allNodes(root).filter((value) => typeof value === 'string').join(' ')
}

function baseState(overrides = {}) {
  return {
    workspaceId: 'workspace-a',
    revision: 2,
    syncStatus: 'ready',
    syncError: null,
    conflictCurrent: null,
    panelMode: 'normal',
    activePageId: null,
    pages: [],
    effectiveMode: 'normal',
    layoutStatus: 'ready',
    ...overrides,
  }
}

test('renders loading, conflict, and transport failure as distinct accessible states', () => {
  const loading = PanelPages({ state: baseState({ syncStatus: 'loading' }) })
  assert.match(textOf(loading), /正在读取当前项目/)
  assert.equal(loading.props.role, 'status')

  const conflict = PanelPages({
    state: baseState({ syncStatus: 'conflict', conflictCurrent: { revision: 4 } }),
    onReload: () => {},
  })
  assert.match(textOf(conflict), /版本冲突/)
  assert.match(textOf(conflict), /revision 4/)
  assert.equal(conflict.props.role, 'alert')

  const failed = PanelPages({
    state: baseState({ syncStatus: 'error', syncError: 'connection lost' }),
    onReload: () => {},
  })
  assert.match(textOf(failed), /保存或读取失败/)
  assert.doesNotMatch(textOf(failed), /connection lost/)
  assert.equal(failed.props.role, 'alert')
})

test('exposes task rename and explicit close controls while preserving saving feedback', () => {
  const page = {
    pageId: 'task-a', title: '原任务', workflowId: 'historical-template', view: 'workspace',
  }
  const renamed = []
  const pages = PanelPages({
    state: baseState({ syncStatus: 'saving', activePageId: 'task-a', pages: [page], workflows: [] }),
    onRenamePage: (pageId, title) => renamed.push([pageId, title]),
    onSelectWorkflow: () => {},
  })
  const input = allNodes(pages).find((node) => node?.props?.['aria-label'] === '任务名称')
  assert.ok(input)
  assert.equal(input.key, 'task-a:原任务')
  input.props.onBlur({ currentTarget: { value: ' 新任务名称 ' } })
  assert.deepEqual(renamed, [['task-a', '新任务名称']])

  const chrome = PanelChrome({
    state: baseState({ syncStatus: 'saving', activePageId: 'task-a', pages: [page] }),
    onActivatePage: () => {}, onClosePage: () => {}, onCreatePage: () => {},
    onHide: () => {}, onToggleExpanded: () => {},
  })
  assert.match(textOf(chrome), /正在保存/)
  const close = allNodes(chrome).find((node) => node?.props?.['aria-label'] === '关闭任务页 原任务')
  assert.ok(close)
  assert.equal(close.props.disabled, false)
})

test('disables persistent mutations while conflict resolution is required', () => {
  const page = { pageId: 'task-a', title: '冲突任务', workflowId: null, view: 'chooser' }
  const chrome = PanelChrome({
    state: baseState({
      syncStatus: 'conflict', activePageId: 'task-a', pages: [page], conflictCurrent: { revision: 4 },
    }),
    onActivatePage: () => {}, onClosePage: () => {}, onCreatePage: () => {},
    onHide: () => {}, onToggleExpanded: () => {},
  })
  const newPage = allNodes(chrome).find((node) => node?.props?.['data-testid'] === 'oasis-new-page')
  const close = allNodes(chrome).find((node) => node?.props?.['aria-label'] === '关闭任务页 冲突任务')
  assert.equal(newPage.props.disabled, true)
  assert.equal(close.props.disabled, true)
})
