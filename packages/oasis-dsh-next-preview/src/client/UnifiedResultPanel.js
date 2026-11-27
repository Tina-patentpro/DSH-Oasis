import { createElement, useEffect, useRef, useState } from 'react'
import { WritebackPanel } from './WritebackPanel.js'
import { SafeMarkdownPreview } from './SafeMarkdownPreview.js'

const button = { border: '1px solid var(--dsw-alias-border-l2, #d7d9d8)', borderRadius: 7, padding: '7px 10px', background: 'var(--dsw-alias-bg-base, #fff)', color: 'inherit' }

function LocalExecutionSummary({ run }) {
  if (run?.mode !== 'dsh-local' || run.status === 'prepared') return null
  const summary = run.executionSummary
  const stages = { preparation: '调用准备', stream: '流处理', 'result-contract': '结果格式校验' }
  const finishes = { stop: '正常结束', 'max-tokens': '输出上限', 'tool-calls': '工具调用', error: '提供方错误', aborted: '中止' }
  const counters = { inputTokens: '输入（不含缓存命中）', cacheReadTokens: '缓存命中', outputTokens: '输出', reasoningTokens: '其中推理', totalTokens: '总计' }
  const usage = Object.entries(counters).filter(([key]) => Number.isSafeInteger(summary?.usage?.[key]) && summary.usage[key] >= 0)
    .map(([key, label]) => `${label} ${summary.usage[key]}`).join(' · ')
  return createElement('details', { style: { fontSize: 12, marginTop: 8 } },
    createElement('summary', null, run.parentRunId ? '原始调用记录（非新增调用）' : '调用记录'),
    run.status !== 'completed' ? createElement('div', null, `失败阶段：${stages[summary?.failureStage] ?? '未记录'}`) : null,
    createElement('div', null, `结束原因：${finishes[summary?.finishKind] ?? '未记录'}`),
    createElement('div', null, `用量：${usage || '未记录'}`),
    usage ? createElement('small', null, '提供方报告的 tokens；不代表实扣或退款。') : null)
}

function localFailureText(run) {
  if (run.executionSummary?.failureStage === 'result-contract') return '结果格式不符合业务要求，未保存产物；不会自动重试。'
  if (run.executionSummary?.failureStage === 'stream' && run.executionSummary?.finishKind === 'max-tokens') {
    return '模型达到输出上限，未取得完整结果；不会自动重试。'
  }
  if (run.failureCode === 'INVALID_OUTPUT' && run.executionSummary?.failureStage === 'stream') return '模型输出流未通过校验，未保存产物；不会自动重试。'
  return `未取得有效正文（${run.failureCode}），不会自动重试。`
}

function ResultVersion({ page, run, operation, disabled, readOnlyDisabled = disabled, markdownRenderer, onReview = () => {}, onEditResult = () => {},
  workspaceId, workspaceRevision,
  onUpdateResultEditDraft, onDiscardResultEditDraft,
  conversationUnavailableReason = null,
  savedFileUnavailableReason = '安全文件预览不可用', onOpenSavedFile = () => {},
  onUseInConversation = () => {}, onWritebackDraft = () => {}, onPrepareWriteback = () => {},
  onWritebackConfirm = () => {}, onCommitWriteback = () => {} }) {
  const draft = operation.resultEditDrafts?.[run.runId]
  const editing = draft !== undefined
  const body = draft?.body ?? run.result.artifact.body
  const staleDraft = editing && draft.baseArtifactId !== run.result.artifact.artifactId
  const [error, setError] = useState(null)
  const [reviewConfirmation, setReviewConfirmation] = useState(null)
  const reviewEntry = useRef(null)
  const reviewTarget = useRef(null)
  const reviewPending = useRef(false)
  const live = useRef(true)
  const reviewIdentity = JSON.stringify([workspaceId, workspaceRevision, page.pageId, run.runId, run.result.artifact.artifactId])
  const currentIdentity = useRef(null)
  currentIdentity.current = disabled || editing || run.review.status === 'approved' ? null : reviewIdentity
  useEffect(() => { live.current = true; return () => { live.current = false } }, [])
  useEffect(() => { reviewTarget.current = null; setReviewConfirmation(null) }, [reviewIdentity, disabled, editing, run.review.status])
  function cancelReview() {
    reviewTarget.current = null; setReviewConfirmation(null)
    reviewEntry.current?.focus()
  }
  function openReview() {
    if (currentIdentity.current === null || reviewPending.current) return
    const target = { workspaceId, revision: workspaceRevision, artifactId: run.result.artifact.artifactId, identity: reviewIdentity }
    reviewTarget.current = target; setReviewConfirmation(target)
  }
  async function confirmReview() {
    const target = reviewConfirmation
    if (!live.current || !target || reviewTarget.current !== target || reviewPending.current || currentIdentity.current !== target.identity) return
    reviewPending.current = true
    reviewTarget.current = null; setReviewConfirmation(null)
    try { await action(() => onReview(page.pageId, run.runId, 'approved', '',
      { workspaceId: target.workspaceId, revision: target.revision, artifactId: target.artifactId })) }
    finally { reviewPending.current = false }
  }
  async function action(fn) {
    setError(null)
    try { await fn() } catch { setError('操作未完成，请检查当前任务状态。') }
  }
  return createElement('article', { style: { display: 'grid', gap: 12 } },
    createElement('div', { style: { fontSize: 12 } }, `${run.source === 'local-skill' ? '本地 Skills' : '专业 API'} · ${run.mode === 'oasis-api' ? run.evidenceKind === 'production-api' ? '生产 API 响应' : '非生产 API 响应' : run.evidenceKind === 'native-model' ? '原生模型生成' : run.mode === 'dsh-local' ? '原生离线验收' : '合成验收'} · ${run.review.status === 'approved' ? '已审核' : '待审核'}`),
    run.mode === 'oasis-api' ? createElement('small', null, `服务 ${run.providerSnapshot.apiEndpoint}；远端文件 ${run.remoteResponse.fileUrls.length} 个，仅记录来源，未下载/未验证，不视为已交付。`) : null,
    editing ? createElement('textarea', { 'aria-label': '修订结果', value: body, maxLength: 100000, disabled,
      onChange: event => action(() => onUpdateResultEditDraft(page.pageId, run.runId, event.currentTarget.value)), style: { width: '100%' } })
      : createElement(SafeMarkdownPreview, { markdownRenderer, text: run.result.artifact.body, style: { fontSize: 13, lineHeight: 1.65 } }),
    createElement('div', { style: { fontSize: 12, color: 'var(--dsw-alias-text-secondary, #66706b)' } }, '风险未评估 · 待确认问题未评估'),
    editing ? createElement('p', { role: 'status' }, staleDraft ? '编辑基准已变化，原草稿保留；请复制保全或明确放弃后重新编辑。'
      : draft.dirty ? '有未保存的结果编辑；切换版本会保留本次编辑，请保存为新版本或明确放弃。' : '结果编辑中；原版本保持不变。') : null,
    createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
      createElement('button', { type: 'button', style: button, disabled: disabled || !onUpdateResultEditDraft || !onDiscardResultEditDraft,
        onClick: () => action(() => editing ? onDiscardResultEditDraft(page.pageId, run.runId)
          : onUpdateResultEditDraft(page.pageId, run.runId, run.result.artifact.body)) }, editing ? '放弃编辑' : '编辑结果'),
      editing ? createElement('button', { type: 'button', style: button, disabled: disabled || staleDraft || !body.trim() || body === run.result.artifact.body,
        onClick: () => action(() => onEditResult(page.pageId, run.runId, body)) }, '保存为新版本') : null,
      createElement('button', { ref: reviewEntry, type: 'button', style: button, disabled: disabled || editing || run.review.status === 'approved',
        onClick: openReview }, '审核此版本'),
      createElement('button', { type: 'button', style: button, title: conversationUnavailableReason ?? undefined,
        disabled: readOnlyDisabled || editing || run.review.status !== 'approved' || conversationUnavailableReason !== null,
        onClick: () => action(() => onUseInConversation(page.pageId, run.runId)) }, '在对话中使用')),
    reviewConfirmation ? createElement('section', { role: 'group', 'aria-label': '审核确认',
      onKeyDown: event => { if (event.key === 'Escape') { event.preventDefault(); cancelReview() } } },
      createElement('p', null, `当前固定版本${page.runOrder.indexOf(run.runId) + 1} · ${run.source === 'local-skill' ? '本地 Skills' : '专业 API'} · 哈希 ${(run.result.artifact.sha256 ?? run.result.artifact.artifactId ?? '未记录').replace('sha256:', '').slice(0, 12)}`),
      createElement('p', null, '风险未评估 · 待确认问题未评估。确认仅登记此固定版本的人工审核结论。'),
      createElement('button', { type: 'button', style: button, disabled: disabled || editing,
        onClick: confirmReview }, `确认审核版本${page.runOrder.indexOf(run.runId) + 1}`),
      createElement('button', { type: 'button', style: button, onClick: cancelReview }, '取消审核')) : null,
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
          : localFailureText(run)
        : run.status === 'prepared' ? '合成运行未完成；请查看原运行，不会自动重发。'
          : run.status === 'stopped' ? '合成运行已结束，未保存结果。' : '合成失败，未取得正文。'),
    createElement(LocalExecutionSummary, { run }))
}
