import { createElement as h, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { OasisAccountSettings } from './OasisAccountSettings.js'
import { createWebsiteImportController } from './website-import-controller.js'

const button = { padding: '8px 12px', border: '1px solid #cfd8d3', borderRadius: 8, background: 'var(--dsw-alias-bg-base, white)', color: 'inherit', font: 'inherit', cursor: 'pointer' }
export function WebsiteImportDialog({ workspaceId, remote, accountController, onClose, onOpenFiles }) {
  const account = useSyncExternalStore(accountController.subscribe, accountController.getSnapshot, accountController.getSnapshot)
  const scope = useRef({ workspaceId, accountRevision: account.accountRevision })
  scope.current = { workspaceId, accountRevision: account.accountRevision }
  const controller = useMemo(() => createWebsiteImportController({ remote, getWorkspaceId: () => scope.current.workspaceId,
    getAccountRevision: () => scope.current.accountRevision }), [remote])
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const dialog = useRef(null), busy = useRef(false)
  busy.current = state.busy
  const [keyword, setKeyword] = useState('')
  useEffect(() => { controller.invalidate() }, [controller, workspaceId, account.accountRevision])
  useEffect(() => () => controller.dispose(), [controller])
  useEffect(() => {
    const node = dialog.current
    node?.showModal()
    return () => node?.close()
  }, [])
  const btn = (text, fn, disabled = false) => h('button', { type: 'button', style: button, disabled: disabled || state.busy, onClick: () => { void fn() } }, text)
  return h('dialog', { ref: dialog, 'aria-labelledby': 'oasis-import-title', onCancel: event => { event.preventDefault(); if (!busy.current) onClose() },
    style: { width: 'min(1000px, 90vw)', maxHeight: '85vh', padding: 24, border: '1px solid #cfd8d3', borderRadius: 16,
      background: 'var(--dsw-alias-bg-base, white)', color: 'var(--dsw-alias-text-primary, #202123)', overflow: 'auto' } },
    h('header', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      h('h2', { id: 'oasis-import-title' }, '从网站导入到当前项目'), btn('关闭', onClose)),
    h('p', null, '在此选择网站项目及文件，无需打开网站。只下载勾选内容，不上传本地材料、不生成、不自动同步。'),
    !account.credentialConfigured ? h(OasisAccountSettings, { controller: accountController }) :
      h('p', null, `已登录绿洲账户 ${account.accountId}`),
    btn(state.session ? '重新读取项目' : '读取网站项目', () => controller.start(), !account.credentialConfigured),
    state.session ? h('div', null,
      h('p', { style: { overflowWrap: 'anywhere' } }, `保存到：${state.session.workspacePath}`),
      state.session.link ? h('p', null, `当前关联：${state.session.link.folderName}；不会替换为其他项目。`) : null,
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 20 } },
        h('section', { 'aria-label': '网站项目' }, h('h3', null, '选择项目'),
          h('form', { onSubmit: e => { e.preventDefault(); void controller.browse({ page: 1, keyword, parentId: 0 }) } },
            h('input', { 'aria-label': '搜索网站项目', placeholder: '搜索项目名称', maxLength: 200, value: keyword, disabled: state.busy,
              onChange: e => setKeyword(e.target.value), style: { ...button, width: '70%' } }),
            h('button', { type: 'submit', style: button, disabled: state.busy }, '搜索')),
          state.parentId !== 0 ? btn('返回顶层项目', () => controller.browse({ parentId: 0, page: 1 })) : null,
          ...state.projects.map(p => h('div', { key: p.id, style: { display: 'flex', gap: 6, marginTop: 8 } },
            btn(`${p.name}${state.project?.id === p.id ? ' ✓' : ''}`, () => controller.selectProject(p), state.submitted),
            p.hasChildren ? btn('子项目', () => controller.browse({ parentId: p.id, page: 1, keyword: '' }), state.submitted) : null)),
          !state.projects.length ? h('p', null, '此页没有项目') : null,
          h('p', null, `第 ${state.projectPage} 页 · ${state.totalProjects} 个项目`),
          btn('上一页', () => controller.browse({ page: state.projectPage - 1 }), state.projectPage <= 1),
          btn('下一页', () => controller.browse({ page: state.projectPage + 1 }), state.projectPage * 20 >= state.totalProjects)),
        h('section', { 'aria-label': '项目内容' }, h('h3', null, state.project ? `选择内容 · ${state.project.name}` : '请先选择项目'),
          state.project ? h('div', null,
            btn('历史生成内容及附件', () => controller.items({ kind: 'history' }), state.submitted),
            btn('项目文件', () => controller.items({ kind: 'files' }), state.submitted),
            h('p', null, state.kind === 'history' ? '网站历史正文和生成附件' : '网站项目文件'),
            ...state.items.map(row => h('label', { key: row.key, style: { display: 'block', padding: '8px 0', overflowWrap: 'anywhere' } },
              h('input', { type: 'checkbox', checked: state.selected.includes(row.key), disabled: state.busy || state.submitted || !row.downloadable,
                onChange: () => controller.toggle(row.key) }), ` ${row.fileName} · ${row.size === null ? '大小待下载核实' : `${row.size} 字节`}`,
              row.reason ? h('small', null, ` — ${row.reason}`) : null)),
            !state.items.length ? h('p', null, '此页没有可列出的内容；子项目需单独选择。') : null,
            h('p', null, `第 ${state.itemPage} 页 · ${state.totalItems} 条源记录`),
            btn('上一页内容', () => controller.items({ page: state.itemPage - 1 }), state.itemPage <= 1 || state.submitted),
            btn('下一页内容', () => controller.items({ page: state.itemPage + 1 }), state.itemPage * 20 >= state.totalItems || state.submitted)) : null)),
      h('hr'), h('p', null, `已勾选 ${state.selected.length} 项。单文件最多 32 MiB，每次最多 100 项 / 100 MiB。`),
      h('p', null, '导入同时确认所选网站项目与当前本地项目的关联。历史正文以 _OIW.md 保存；附件保留文件名。同名不覆盖、同内容跳过，导入内容未在本地审核。'),
      btn('导入到当前项目', () => controller.commit(), !state.selected.length || state.submitted)) : null,
    state.busy ? h('p', { role: 'status' }, state.submitted ? '正在逐项下载并保存，请勿关闭 Host…' : '正在读取…') : null,
    state.error ? h('p', { role: 'alert' }, state.error) : null,
    state.result ? h('section', { 'aria-label': '导入结果' }, h('h3', null, state.result.status === 'completed' ? '导入完成' : '部分内容未完成'),
      ...state.result.items.map(row => h('p', { key: row.key }, `${{ saved: '已保存', skipped: '相同内容已跳过', failed: '未完成' }[row.status]}：${row.fileName}${row.code ? `（${row.code}）` : ''}`)),
      h('p', { style: { overflowWrap: 'anywhere' } }, `导入清单：${state.result.manifest}`),
      btn('打开 DSH 文件管理', () => onOpenFiles(), !onOpenFiles)) : null)
}
