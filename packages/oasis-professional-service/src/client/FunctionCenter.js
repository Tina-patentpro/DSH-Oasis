import { createElement, useState } from 'react'

export const NATIVE_TOOLS = Object.freeze([
  { id: 'editor', title: '文件', icon: '▱' },
  { id: 'subagent', title: '任务管理', icon: '◎' },
  { id: 'sidechat', title: '侧边对话', icon: '⊕' },
  { id: 'browser', title: '浏览器', icon: '◉' },
])
const button = { border: '1px solid var(--dsw-alias-border-l2, #dce4df)', borderRadius: 10, padding: 12,
  background: 'var(--dsw-alias-bg-base, #fff)', color: 'inherit', cursor: 'pointer', font: 'inherit' }

export function FunctionCenter({ state, nativeAvailability = {}, onOpenNative = () => false, onSelect = () => {}, onSelectV340, onResumeV340, onRetryV340Catalog, onImport }) {
  const [category, setCategory] = useState('patent')
  const [notice, setNotice] = useState(null)
  const ready = state.catalogStatus === 'ready'
  const tasks = category === 'patent'
    ? [{ id: 'patent-claims', title: '权利要求书生成' }, { id: 'patent-description', title: '说明书生成' }, { id: 'patent-check', title: '申请文件检查' }]
    : category === 'rd' ? [{ id: 'technical-rd', title: '技术研发辅助' }] : []
  return createElement('section', { 'aria-label': '功能中心', style: { padding: 20, display: 'grid', gap: 18 } },
    createElement('header', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' } },
      createElement('h3', { style: { margin: 0, fontSize: 19 } }, '功能中心'),
      createElement('small', { style: { color: '#307560', fontSize: 10 } }, 'BETTER SIDEBAR × OASIS')),
    onImport ? createElement('button', { type: 'button', onClick: onImport, style: button }, '从网站导入') : null,
    createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 } },
      ...NATIVE_TOOLS.map(tool => createElement('button', { key: tool.id, type: 'button', style: button,
        disabled: nativeAvailability[tool.id] !== true, title: nativeAvailability[tool.id] === true ? undefined : '原生功能不可用或已在侧边卡片设置中关闭',
        onClick: () => { if (!onOpenNative(tool.id)) setNotice('当前原生功能不可用，请检查会话与侧边卡片设置。') } },
        createElement('span', { 'aria-hidden': true, style: { display: 'block', fontSize: 20, marginBottom: 6 } }, tool.icon), tool.title))),
    createElement('div', { 'aria-label': '业务分类', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 } },
      ...[['rd', '技术研发'], ['patent', '专利撰写'], ['tools', '辅助工具']].map(([id, label]) => createElement('button', {
        key: id, type: 'button', 'aria-pressed': category === id, onClick: () => setCategory(id),
        style: { ...button, borderRadius: 18, padding: '7px 12px', background: category === id ? '#90bfff' : button.background, color: category === id ? '#fff' : 'inherit' },
      }, label))),
    createElement('div', { style: { display: 'grid', gap: 8 } }, ...tasks.map(task => {
      const supported = ready && state.workflows.some(w => w.workflowId === task.id && w.executionMode === 'unified-text')
      return createElement('button', { key: task.id, type: 'button', disabled: !supported,
        'data-testid': supported ? `oasis-workflow-${task.id}` : undefined,
        onClick: () => onSelect(task.id), style: { ...button, display: 'flex', justifyContent: 'space-between', textAlign: 'left', opacity: supported ? 1 : .55 } },
        task.title, createElement('small', null, supported ? '打开 →' : '待接入'))
    })),
    onSelectV340&&state.v340Catalog?createElement('section',{'aria-label':'专利工作流',style:{display:'grid',gap:8}},
      ...state.v340Catalog.nodes.filter(node=>category==='rd'?node.nodeId.startsWith('Flow-1-'):category==='patent'?!node.nodeId.startsWith('Flow-1-'):false)
        .map(node=>createElement('button',{key:node.nodeId,type:'button',disabled:state.v340Creating===true,style:{...button,textAlign:'left'},
          onClick:()=>onSelectV340(node.nodeId)},node.title,createElement('small',{style:{display:'block',marginTop:4}},'输入与结果 · 生成待接入')))):null,
    state.v340CreateError?createElement('p',{role:'alert'},state.v340CreateError):null,
    state.v340CatalogStatus==='error'?createElement('section',{role:'alert'},createElement('p',null,state.v340CatalogError),
      createElement('button',{type:'button',style:button,disabled:!onRetryV340Catalog,onClick:()=>{void onRetryV340Catalog?.().catch(()=>{})}},'重试新版目录')):null,
    onResumeV340&&state.closedV340Tabs?.length?createElement('section',{'aria-label':'已保留任务'},createElement('small',null,'已关闭的任务页，记录仍保留'),
      ...state.pages.filter(p=>state.closedV340Tabs.includes(p.pageId)).map(p=>createElement('button',{key:p.pageId,type:'button',style:button,onClick:()=>onResumeV340(p.pageId)},`重新打开 ${p.title}`))):null,
    !ready ? createElement('div', { role: state.catalogStatus === 'error' ? 'alert' : 'status' },
      state.catalogStatus === 'error' ? '工作流目录读取失败' : '正在读取工作流目录…') : null,
    tasks.length === 0 ? createElement('small', null, '暂无已接入任务') : null,
    notice ? createElement('div', { role: 'status' }, notice) : null)
}
