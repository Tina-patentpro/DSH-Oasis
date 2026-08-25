import { createElement } from 'react'

import { CodexPanelIcon } from './codex-icons.js'

const iconButtonStyle = {
  width: 32,
  height: 32,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 0,
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--dsw-alias-text-primary, #202123)',
  cursor: 'pointer',
}

function IconButton({ label, icon, onClick, testId, disabled = false }) {
  return createElement('button', {
    type: 'button',
    title: label,
    'aria-label': label,
    'data-testid': testId,
    onClick,
    disabled,
    style: { ...iconButtonStyle, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 },
  }, createElement(CodexPanelIcon, { name: icon }))
}

export function getKeyboardTabTarget(pages, pageId, key) {
  const index = pages.findIndex((page) => page.pageId === pageId)
  if (index < 0 || pages.length === 0) return null
  if (key === 'Home') return pages[0].pageId
  if (key === 'End') return pages[pages.length - 1].pageId
  if (key === 'ArrowLeft') return pages[(index - 1 + pages.length) % pages.length].pageId
  if (key === 'ArrowRight') return pages[(index + 1) % pages.length].pageId
  if (key === 'Delete') {
    if (pages.length === 1) return null
    return pages[index + 1]?.pageId ?? pages[index - 1].pageId
  }
  return null
}

function scheduleAfterRender(callback) {
  if (typeof globalThis.requestAnimationFrame === 'function') {
    globalThis.requestAnimationFrame(callback)
    return
  }
  globalThis.queueMicrotask(callback)
}

function syncStatusLabel(status) {
  if (status === 'loading') return '正在读取当前项目…'
  if (status === 'saving') return '正在保存…'
  if (status === 'ready') return '已与当前DSH项目同步'
  if (status === 'conflict') return '需要解决版本冲突'
  if (status === 'error') return '同步失败'
  return '等待加载当前项目'
}

export function focusTabAfterUpdate(tabList, pageId, schedule = scheduleAfterRender) {
  schedule(() => {
    if (pageId === null) {
      tabList?.querySelector('[data-testid="oasis-new-page"]')?.focus()
      return
    }
    const targetId = `oasis-tab-${pageId}`
    const target = [...(tabList?.querySelectorAll('[role="tab"]') ?? [])]
      .find((tab) => tab.id === targetId)
    target?.focus()
  })
}

export function PanelChrome({
  state,
  titleRef,
  onActivatePage,
  onClosePage,
  onCreatePage,
  onHide,
  onToggleExpanded,
}) {
  const effectiveExpanded = state.effectiveMode === 'expanded'
  const autoExpanded = state.panelMode === 'normal' && effectiveExpanded
  const canPersist = ['ready', 'saving'].includes(state.syncStatus)

  function moveTab(event, pageId) {
    if (!canPersist) return
    const handled = ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Delete'].includes(event.key)
    if (!handled) return
    const targetPageId = getKeyboardTabTarget(state.pages, pageId, event.key)
    event.preventDefault()
    if (event.key === 'Delete') {
      onClosePage(pageId)
    }
    if (targetPageId !== null) {
      onActivatePage(targetPageId)
    }
    const tabList = event.currentTarget.closest?.('[role="tablist"]') ?? event.currentTarget.parentElement
    focusTabAfterUpdate(tabList, targetPageId)
  }

  return createElement('header', {
    style: {
      flex: '0 0 auto',
      borderBottom: '1px solid var(--dsw-alias-border-l2, #e3e3e5)',
      background: 'var(--dsw-alias-bg-base, #fff)',
    },
  },
  createElement('div', {
    style: {
      minHeight: 52,
      padding: '0 12px 0 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    },
  },
  createElement('div', { style: { minWidth: 0, flex: 1 } },
    createElement('h2', {
      ref: titleRef,
      tabIndex: -1,
      style: { margin: 0, fontSize: 15, lineHeight: 1.25, fontWeight: 650, outline: 'none' },
    }, '绿洲专业工作台'),
    createElement('div', {
      role: 'status',
      'aria-live': 'polite',
      style: { marginTop: 2, color: 'var(--dsw-alias-text-secondary, #6b7280)', fontSize: 11 },
    }, `与当前DSH项目关联 · ${syncStatusLabel(state.syncStatus)}`)),
  createElement(IconButton, {
    label: autoExpanded ? '窗口过窄，右栏已自动展开' : effectiveExpanded ? '恢复右栏宽度' : '展开右栏',
    icon: effectiveExpanded ? 'restore' : 'expand',
    testId: effectiveExpanded ? 'oasis-panel-restore' : 'oasis-panel-expand',
    onClick: onToggleExpanded,
    disabled: autoExpanded || !canPersist,
  }),
  createElement(IconButton, {
    label: '隐藏右栏',
    icon: 'showHide',
    testId: 'oasis-panel-hide',
    onClick: onHide,
  })),
  createElement('div', {
    role: 'tablist',
    'aria-label': '绿洲任务页',
    style: {
      minHeight: 38,
      padding: '0 10px',
      display: 'flex',
      alignItems: 'end',
      gap: 4,
      overflowX: 'auto',
    },
  },
  ...state.pages.map((page) => createElement('div', {
    key: page.pageId,
    role: 'presentation',
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      borderBottom: state.activePageId === page.pageId ? '2px solid #10a37f' : '2px solid transparent',
      borderRadius: '8px 8px 0 0',
    },
  },
  createElement('button', {
    id: `oasis-tab-${page.pageId}`,
    type: 'button',
    role: 'tab',
    'aria-selected': state.activePageId === page.pageId,
    'aria-controls': `oasis-panel-${page.pageId}`,
    tabIndex: state.activePageId === page.pageId ? 0 : -1,
    disabled: !canPersist,
    onClick: () => onActivatePage(page.pageId),
    onKeyDown: (event) => moveTab(event, page.pageId),
    style: {
      maxWidth: 150,
      border: 0,
      background: 'transparent',
      color: 'var(--dsw-alias-text-primary, #202123)',
      padding: '8px 4px 7px 10px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      cursor: canPersist ? 'pointer' : 'not-allowed',
    },
  }, page.title),
  createElement('button', {
    type: 'button',
    'aria-label': `关闭任务页 ${page.title}`,
    title: `关闭任务页 ${page.title}`,
    disabled: !canPersist,
    onClick: () => onClosePage(page.pageId),
    style: {
      border: 0,
      background: 'transparent',
      padding: '6px 7px 6px 3px',
      color: 'var(--dsw-alias-text-secondary, #6b7280)',
      cursor: canPersist ? 'pointer' : 'not-allowed',
    },
  }, '×'))),
  createElement('button', {
    type: 'button',
    title: '新建任务页',
    'aria-label': '新建任务页',
    'data-testid': 'oasis-new-page',
    disabled: !canPersist,
    onClick: onCreatePage,
    style: {
      ...iconButtonStyle,
      width: 30,
      height: 30,
      flex: '0 0 auto',
      fontSize: 20,
      cursor: canPersist ? 'pointer' : 'not-allowed',
      opacity: canPersist ? 1 : 0.5,
    },
  }, '+')))
}
