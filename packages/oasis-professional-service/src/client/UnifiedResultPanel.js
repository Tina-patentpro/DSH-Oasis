import { createElement, useState } from 'react'
import { WritebackPanel } from './WritebackPanel.js'
import { SafeMarkdownPreview } from './SafeMarkdownPreview.js'

const button = { border: '1px solid var(--dsw-alias-border-l2, #d7d9d8)', borderRadius: 7, padding: '7px 10px', background: 'var(--dsw-alias-bg-base, #fff)', color: 'inherit' }

function ResultVersion({ page, run, operation, disabled, readOnlyDisabled = disabled, markdownRenderer, onReview = () => {}, onEditResult = () => {},
  conversationUnavailableReason = null,
  savedFileUnavailableReason = '安全文件预览不可用', onOpenSavedFile = () => {},
  onUseInConversation = () => {}, onWritebackDraft = () => {}, onPrepareWriteback = () => {},
  onWritebackConfirm = () => {}, onCommitWriteback = () => {} }) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(run.result.artifact.body)
  const [error, setError] = useState(null)
  async function action(fn) {
    setError(null)
    try { await fn() } catch { setError('操作未完成，请检查当前任务状态。') }
  }
  return createElement('article', { style: { display: 'grid', gap: 12 } },
    createElement('div', { style: { fontSize: 12 } }, `${run.source === 'local-skill' ? '本地 Skills' : '专业 API'} · ${run.evidenceKind === 'native-model' ? '原生模型生成' : run.mode === 'dsh-local' ? '原生离线验收' : '合成验收'} · ${run.review.status === 'approved' ? '已审核' : '待审核'}`),
    editing ? createElement('textarea', { 'aria-label': '修订结果', value: body, maxLength: 100000, disabled,
      onChange: event => setBody(event.currentTarget.value), style: { width: '100%' } })
      : createElement(SafeMarkdownPreview, { markdownRenderer, text: run.result.artifact.body, style: { fontSize: 13, lineHeight: 1.65 } }),
    createElement('div', { style: { fontSize: 12, color: 'var(--dsw-alias-text-secondary, #66706b)' } }, '风险未评估 · 待确认问题未评估'),
    createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
      createElement('button', { type: 'button', style: button, disabled, onClick: () => setEditing(!editing) }, editing ? '放弃编辑' : '编辑结果'),
      editing ? createElement('button', { type: 'button', style: button, disabled: disabled || !body.trim() || body === run.result.artifact.body,
        onClick: () => action(() => onEditResult(page.pageId, run.runId, body)) }, '保存为新版本') : null,
      createElement('button', { type: 'button', style: button, disabled: disabled || editing || run.review.status === 'approved',
        onClick: () => action(() => onReview(page.pageId, run.runId, 'approved', '')) }, '审核此版本'),
      createElement('button', { type: 'button', style: button, title: conversationUnavailableReason ?? undefined,
        disabled: readOnlyDisabled || editing || run.review.status !== 'approved' || conversationUnavailableReason !== null,
        onClick: () => action(() => onUseInConversation(page.pageId, run.runId)) }, '在对话中使用')),
    error || operation.error ? createElement('div', { role: 'alert' }, error ?? `操作未完成（${operation.errorCode ?? '连接失败'}）`) : null,
    operation.feedback === 'conversation-draft-ready' ? createElement('div', { role: 'status' }, '已放入对话草稿，尚未发送。') : null,
    run.writebacks.length ? createElement('section', { 'aria-label': '已保存文件', style: { display: 'grid', gap: 6 } },
      ...run.writebacks.map(record => createElement('div', { key: record.writebackId, style: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' } },
        createElement('span', { style: { fontSize: 12, overflowWrap: 'anywhere' } }, record.files.find(file => file.mediaType === 'text/markdown')?.relativePath),
        createElement('button', { type: 'button', style: button, title: savedFileUnavailableReason ?? undefined,
          disabled: readOnlyDisabled || editing || run.review.status !== 'approved' || savedFileUnavailableReason !== null,
          onClick: () => action(() => onOpenSavedFile(page.pageId, run.runId, record.writebackId)) }, '打开当前文件'))),
      createElement('small', null, '当前文件可编辑，不沿用审核结论。')) : null,
    createElement(WritebackPanel, { run, operation, disabled: disabled || editing,
      onDraft: (directory, confirmed) => onWritebackDraft(page.pageId, directory, confirmed),
      onPrepare: () => onPrepareWriteback(page.pageId, run.runId),
      onConfirm: confirmed => onWritebackConfirm(page.pageId, confirmed),
      onCommit: () => onCommitWriteback(page.pageId),
    }))
}

export function UnifiedResultPanel({ page, onActivateRun = () => {}, ...props }) {
  const run = page.runs[page.activeRunId]
  return createElement('div', null,
    createElement('nav', { 'aria-label': '结果版本', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
      ...page.runOrder.map((id, index) => createElement('button', { key: id, type: 'button', style: button,
        disabled: props.readOnlyDisabled ?? props.disabled, 'aria-current': id === page.activeRunId ? 'true' : undefined,
        onClick: () => onActivateRun(page.pageId, id) }, `版本 ${index + 1}`))),
    run?.status === 'completed' && run.result
      ? createElement(ResultVersion, { key: run.runId, page, run, ...props })
      : createElement('p', { role: 'status', style: { fontSize: 13 } }, !run ? '暂无生成内容'
        : run.mode === 'dsh-local' ? run.status === 'prepared' ? run.evidenceKind === 'native-model' ? '原生模型生成中…' : '原生离线生成中…' : run.status === 'unknown'
          ? `运行状态未确认（${run.failureCode}）；已停止本地等待，不代表提供方取消或退款，不会自动重发。`
          : `未取得有效正文（${run.failureCode}），不会自动重试。`
        : run.status === 'prepared' ? '合成运行未完成；请查看原运行，不会自动重发。'
          : run.status === 'stopped' ? '合成运行已结束，未保存结果。' : '合成失败，未取得正文。'))
}
