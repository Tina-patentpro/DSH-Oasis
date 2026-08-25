import { createElement } from 'react'

const cardStyle = {
  width: '100%',
  textAlign: 'left',
  border: '1px solid var(--dsw-alias-border-l2, #dedee1)',
  borderRadius: 12,
  padding: 16,
  background: 'var(--dsw-alias-bg-base, #fff)',
  color: 'var(--dsw-alias-text-primary, #202123)',
  cursor: 'pointer',
}

const skeletonStyle = {
  border: '1px solid var(--dsw-alias-border-l2, #dedee1)',
  borderRadius: 12,
  padding: 16,
  background: 'var(--dsw-alias-bg-base, #fff)',
}

function WorkflowChooser({ onSelect }) {
  const workflows = [
    {
      id: 'technical-rd',
      title: '技术研发辅助',
      description: '整理研发目标、技术材料与阶段性成果。',
    },
    {
      id: 'cn-invention-patent',
      title: '中国发明专利撰写',
      description: '组织技术交底材料与发明专利文稿骨架。',
    },
  ]
  return createElement('div', { style: { padding: 20 } },
    createElement('h3', { style: { margin: '0 0 6px', fontSize: 18 } }, '选择工作流'),
    createElement('p', {
      style: { margin: '0 0 18px', color: 'var(--dsw-alias-text-secondary, #6b7280)', fontSize: 13 },
    }, '选择后，本页将在原位转为材料输入与结果预览骨架。'),
    createElement('div', { style: { display: 'grid', gap: 12 } },
      ...workflows.map((workflow) => createElement('button', {
        key: workflow.id,
        type: 'button',
        'data-testid': `oasis-workflow-${workflow.id}`,
        onClick: () => onSelect(workflow.id),
        style: cardStyle,
      },
      createElement('strong', { style: { display: 'block', marginBottom: 5, fontSize: 15 } }, workflow.title),
      createElement('span', {
        style: { display: 'block', color: 'var(--dsw-alias-text-secondary, #6b7280)', fontSize: 13 },
      }, workflow.description)))),
  )
}

function WorkspaceSkeleton({ page }) {
  return createElement('div', { style: { padding: 20, display: 'grid', gap: 14 } },
    createElement('div', null,
      createElement('h3', { style: { margin: 0, fontSize: 18 } }, page.title),
      createElement('p', {
        style: { margin: '5px 0 0', color: 'var(--dsw-alias-text-secondary, #6b7280)', fontSize: 13 },
      }, '第二周已接入项目状态持久化；专业生成服务尚未接入。')),
    createElement('section', { style: skeletonStyle, 'aria-label': '输入材料' },
      createElement('h4', { style: { margin: '0 0 8px', fontSize: 14 } }, '输入材料'),
      createElement('div', {
        style: { minHeight: 92, borderRadius: 8, background: 'var(--dsw-alias-bg-subtle, #f5f5f6)', padding: 12, color: '#777' },
      }, '材料输入区域骨架（第三周接入专业工作流）')),
    createElement('section', { style: skeletonStyle, 'aria-label': '生成结果预览' },
      createElement('h4', { style: { margin: '0 0 8px', fontSize: 14 } }, '生成结果预览'),
      createElement('div', {
        style: { minHeight: 180, borderRadius: 8, background: 'var(--dsw-alias-bg-subtle, #f5f5f6)', padding: 12, color: '#777' },
      }, '结果预览区域骨架（第三周接入专业工作流）')))
}

const syncNoticeStyle = {
  margin: 20,
  border: '1px solid var(--dsw-alias-border-l2, #dedee1)',
  borderRadius: 12,
  padding: 16,
  color: 'var(--dsw-alias-text-primary, #202123)',
  background: 'var(--dsw-alias-bg-base, #fff)',
}

function reloadButton(onReload, label) {
  return createElement('button', {
    type: 'button',
    onClick: onReload,
    style: {
      marginTop: 12,
      border: '1px solid var(--dsw-alias-border-l2, #dedee1)',
      borderRadius: 8,
      padding: '7px 10px',
      background: 'var(--dsw-alias-bg-base, #fff)',
      color: 'var(--dsw-alias-text-primary, #202123)',
      cursor: 'pointer',
    },
  }, label)
}

export function PanelPages({ state, onSelectWorkflow, onRenamePage, onReload }) {
  if (state.syncStatus === 'idle' || state.syncStatus === 'loading') {
    return createElement('div', {
      role: 'status',
      'aria-live': 'polite',
      style: syncNoticeStyle,
    }, '正在读取当前项目的绿洲任务页…')
  }

  if (state.syncStatus === 'conflict') {
    const currentRevision = state.conflictCurrent?.revision ?? '未知'
    return createElement('div', { role: 'alert', style: syncNoticeStyle },
      createElement('strong', null, '检测到版本冲突'),
      createElement('div', { style: { marginTop: 6, fontSize: 13 } },
        `服务端当前为 revision ${currentRevision}。本地草稿仍保留，系统不会自动覆盖。`),
      reloadButton(onReload, '重新载入服务端版本（舍弃本地草稿）'))
  }

  if (state.syncStatus === 'error') {
    return createElement('div', { role: 'alert', style: syncNoticeStyle },
      createElement('strong', null, '保存或读取失败'),
      createElement('div', { style: { marginTop: 6, fontSize: 13 } },
        '本地草稿仍保留。请检查 DSH Host 后，再明确重新载入服务端版本。'),
      reloadButton(onReload, '重新载入服务端版本'))
  }

  const page = state.pages.find((item) => item.pageId === state.activePageId)
  if (!page) {
    return createElement('div', { style: { padding: 20, color: '#777' } }, '请新建任务页。')
  }
  return createElement('main', {
    id: `oasis-panel-${page.pageId}`,
    role: 'tabpanel',
    'aria-labelledby': `oasis-tab-${page.pageId}`,
    style: { flex: 1, minHeight: 0, overflow: 'auto' },
  },
  createElement('div', {
    style: {
      padding: '14px 20px 0',
      display: 'grid',
      gap: 5,
      borderBottom: '1px solid var(--dsw-alias-border-l2, #ececef)',
      paddingBottom: 14,
    },
  },
  createElement('label', {
    htmlFor: `oasis-task-title-${page.pageId}`,
    style: { fontSize: 12, color: 'var(--dsw-alias-text-secondary, #6b7280)' },
  }, '任务名称'),
  createElement('input', {
    key: `${page.pageId}:${page.title}`,
    id: `oasis-task-title-${page.pageId}`,
    'aria-label': '任务名称',
    defaultValue: page.title,
    maxLength: 200,
    onBlur: (event) => {
      const title = event.currentTarget.value.trim()
      if (title.length === 0) {
        event.currentTarget.value = page.title
        return
      }
      if (title !== page.title) onRenamePage(page.pageId, title)
    },
    style: {
      width: '100%',
      boxSizing: 'border-box',
      border: '1px solid var(--dsw-alias-border-l2, #dedee1)',
      borderRadius: 8,
      padding: '8px 10px',
      background: 'var(--dsw-alias-bg-base, #fff)',
      color: 'var(--dsw-alias-text-primary, #202123)',
      fontSize: 14,
    },
  })),
  page.view === 'chooser'
    ? createElement(WorkflowChooser, { onSelect: (workflowId) => onSelectWorkflow(page.pageId, workflowId) })
    : createElement(WorkspaceSkeleton, { page }))
}
