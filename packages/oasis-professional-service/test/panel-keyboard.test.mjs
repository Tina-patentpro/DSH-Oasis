import assert from 'node:assert/strict'
import test from 'node:test'

import { PanelChrome, focusTabAfterUpdate, getKeyboardTabTarget } from '../src/client/PanelChrome.js'

const pages = [
  { pageId: 'page-a' },
  { pageId: 'page-b' },
  { pageId: 'page-c' },
]

test('resolves Arrow, Home, End, and Delete focus targets with wrapping', () => {
  assert.equal(getKeyboardTabTarget(pages, 'page-a', 'ArrowLeft'), 'page-c')
  assert.equal(getKeyboardTabTarget(pages, 'page-c', 'ArrowRight'), 'page-a')
  assert.equal(getKeyboardTabTarget(pages, 'page-b', 'Home'), 'page-a')
  assert.equal(getKeyboardTabTarget(pages, 'page-b', 'End'), 'page-c')
  assert.equal(getKeyboardTabTarget(pages, 'page-b', 'Delete'), 'page-c')
  assert.equal(getKeyboardTabTarget(pages, 'page-c', 'Delete'), 'page-b')
  assert.equal(getKeyboardTabTarget([{ pageId: 'only' }], 'only', 'Delete'), null)
  assert.equal(getKeyboardTabTarget(pages, 'missing', 'ArrowRight'), null)
})

test('moves DOM focus to the selected tab after render', () => {
  const focused = []
  const tabList = {
    querySelectorAll() {
      return [
        { id: 'oasis-tab-page-a', focus: () => focused.push('page-a') },
        { id: 'oasis-tab-page-b', focus: () => focused.push('page-b') },
      ]
    },
    querySelector() {
      return { focus: () => focused.push('new-page') }
    },
  }

  focusTabAfterUpdate(tabList, 'page-b', (callback) => callback())
  focusTabAfterUpdate(tabList, null, (callback) => callback())
  assert.deepEqual(focused, ['page-b', 'new-page'])
})

test('auto-expanded narrow mode shows restore semantics but disables an impossible restore', () => {
  const tree = PanelChrome({
    state: { panelMode: 'normal', effectiveMode: 'expanded', pages: [], activePageId: null },
    onActivatePage() {}, onClosePage() {}, onCreatePage() {}, onHide() {}, onToggleExpanded() {},
  })
  const pending = [tree]
  let control = null
  while (pending.length > 0) {
    const node = pending.shift()
    if (!node || typeof node !== 'object') continue
    if (node.props?.testId === 'oasis-panel-restore') {
      control = node
      break
    }
    const children = node.props?.children
    pending.push(...(Array.isArray(children) ? children : [children]))
  }
  assert.ok(control)
  const renderedButton = control.type(control.props)
  assert.equal(renderedButton.props.disabled, true)
  assert.equal(renderedButton.props['aria-label'], '窗口过窄，右栏已自动展开')
})
