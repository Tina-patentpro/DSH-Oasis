import { createElement as h, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { OasisAccountSettings } from './OasisAccountSettings.js'
import { createWebsiteImportController, explain } from './website-import-controller.js'

const button = { padding: '8px 12px', border: '1px solid #cfd8d3', borderRadius: 8, background: 'var(--dsw-alias-bg-base, white)', color: 'inherit', font: 'inherit', cursor: 'pointer' }
const roles = { text: '历史正文', input: '输入材料', output: '输出附件' }
export function WebsiteRecordItems({ state, onToggle }) {
  const visible = state.items.filter(row => row.role === state.role)
  return h('div', null,
    state.pageState === 'partial' ? h('p', { role: 'status' }, '部分记录或材料无法读取；已验证项仍可选择，不能据此认定项目材料完整。') : null,
    ...state.issues.map(issue => h('p', { key: issue.recordId, role: 'status' }, `记录 ${issue.recordId} 未读取：${issue.code}${issue.details.httpStatus ? `，HTTP ${issue.details.httpStatus}` : ''}`)),
    ...visible.map(row => h('label', { key: row.key, style: { display: 'block', padding: '8px 0', overflowWrap: 'anywhere' } },
      h('input', { type: 'checkbox', checked: state.selected.includes(row.key), disabled: state.busy || state.submitted || !row.downloadable,
        onChange: () => onToggle(row.key) }), ` ${row.fileName} · ${roles[row.role]} · 记录 ${row.recordId}（${row.name}）${row.inputField ? ` · 字段 ${row.inputField}` : ''} · ${row.size === null ? '大小待下载核实' : `${row.size} 字节`}`,
      row.reason ? h('small', null, ` — ${row.reason}`) : null)),
    !visible.length ? h('p', null, state.pageState === 'partial' ? '当前筛选暂无可列项，不能判断是否没有材料。'
      : state.pageState === 'complete' ? state.items.length ? '当前筛选没有可识别材料。' : '本页没有可识别材料；不代表项目全部页都无材料。'
        : '材料尚未成功读取；可明确重试或仅关联项目。') : null,
    state.selectedRows.length ? h('section', { 'aria-label': '已选清单' }, h('h4', null, '已选清单（含其他页和筛选）'),
      ...state.selectedRows.map(row => h('div', { key: row.key }, `${row.fileName} · ${roles[row.role]} · 记录 ${row.recordId} `,
        h('button', { type: 'button', disabled: state.busy || state.submitted, onClick: () => onToggle(row.key) }, '取消选择')))) : null)
}
export function WebsiteImportResultItem({ row }) {
  return h('p', null, `${{ saved: '已保存', skipped: '相同内容已跳过', failed: '未完成' }[row.status]}：${row.fileName}${row.code ? `（${row.code}）` : ''}`,
    row.status === 'failed' && row.details ? ` ${explain(row)}` : null)
}
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
  const [unlinkConfirm, setUnlinkConfirm] = useState(false)
  useEffect(() => { setUnlinkConfirm(false) }, [workspaceId, account.accountRevision, state.session?.token])
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
      state.session.link ? h('div', null,
        h('p', null, `当前关联：${state.session.link.folderName}（账户 ${state.session.link.accountId}）；不会自动替换。`),
        unlinkConfirm ? h('div', { role: 'group', 'aria-label': '确认解除网站项目关联' },
          h('p', null, '解除当前项目的网站关联及专业 API 服务绑定；已有文件、生成结果和审核记录保留。未结束的生成或导入会阻止解除。'),
          btn('确认解除关联', () => controller.unlink({ confirmed: true })),
          btn('取消解除', () => setUnlinkConfirm(false))) : btn('解除关联', () => setUnlinkConfirm(true))) : null,
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
            ...Object.entries(roles).map(([role, label]) => btn(`${label}${state.role === role ? ' ✓' : ''}`, () => controller.filter(role), state.submitted)),
            h('p', null, '来自所选项目的业务记录；筛选不发请求，不读取独立文件库。'),
            btn('重新读取本页记录', () => controller.items(), state.submitted),
            h(WebsiteRecordItems, { state, onToggle: key => controller.toggle(key) }),
            h('p', null, `第 ${state.itemPage} 页 · ${state.totalItems} 条源记录`),
            btn('上一页内容', () => controller.items({ page: state.itemPage - 1 }), state.itemPage <= 1 || state.submitted),
            btn('下一页内容', () => controller.items({ page: state.itemPage + 1 }), state.itemPage * 20 >= state.totalItems || state.submitted)) : null)),
      h('hr'), h('p', null, `已勾选 ${state.selected.length} 项。单文件最多 32 MiB，每次最多 100 项 / 100 MiB。`),
      h('p', null, '不勾选文件也可仅关联项目。勾选时，历史正文以 _OIW.md 保存；附件保留文件名。同名不覆盖、同内容跳过，导入内容未在本地审核。'),
      btn(state.selected.length ? '关联并导入选中文件' : '关联到当前项目', () => controller.commit(), !state.project || state.submitted || unlinkConfirm)) : null,
    state.busy ? h('p', { role: 'status' }, state.submitted ? '正在逐项下载并保存，请勿关闭 Host…' : '正在读取…') : null,
    state.error ? h('p', { role: 'alert' }, state.error) : null,
    state.notice ? h('p', { role: 'status' }, state.notice) : null,
    state.result ? h('section', { 'aria-label': '导入结果' }, h('h3', null, '项目关联已保存'),
      h('p', null, `文件：${state.result.items.filter(v => v.status === 'saved').length} 项保存，${state.result.items.filter(v => v.status === 'skipped').length} 项同内容跳过，${state.result.items.filter(v => v.status === 'failed').length} 项失败。`),
      h('p', null, '需要解除或更换关联时，请先点击“重新读取项目”。'),
      ...state.result.items.map(row => h(WebsiteImportResultItem, { key: row.key, row })),
      h('p', { style: { overflowWrap: 'anywhere' } }, `导入清单：${state.result.manifest}`),
      btn('打开 DSH 文件管理', () => onOpenFiles(), !onOpenFiles)) : null)
}
