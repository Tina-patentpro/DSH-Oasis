import { createElement } from 'react'

function materialIdentity(reference) {
  return reference?.kind === 'project-file'
    ? [reference.referenceId, reference.relativePath, reference.sha256, reference.sizeBytes]
    : [reference?.referenceId, reference?.kind]
}

export function hasDraftDiverged(page, run) {
  if (!run) return false
  return JSON.stringify(page.formValues) !== JSON.stringify(run.inputSnapshot.formValues)
    || JSON.stringify(page.inputRefs.map(materialIdentity)) !== JSON.stringify(run.inputSnapshot.inputRefs.map(materialIdentity))
}

export function generationDisabledReason({ syncStatus, validation, operation }) {
  if (syncStatus !== 'ready') return syncStatus === 'saving' ? '正在保存草稿' : '工作区尚未就绪'
  if (!validation.valid) return '请先修正表单错误'
  if (operation.materialsChanged) return '材料已变化，请先刷新'
  if (operation.activeOperation !== null) return '任务正在处理中'
  return null
}

function statusText(status) {
  if (status === 'blocked') return '阻断'
  return '需人工复核'
}

const buttonStyle = {
  border: '1px solid var(--dsw-alias-border-l2, #d7d9d8)', borderRadius: 7,
  padding: '7px 10px', background: 'var(--dsw-alias-bg-base, #fff)', color: 'inherit',
}

export function RunPreview({
  page,
  operation,
  validation,
  syncStatus,
  onGenerate,
  onActivateRun,
  onReviewNote,
  onReview,
}) {
  const disabledReason = generationDisabledReason({ syncStatus, validation, operation })
  const run = page.activeRunId === null ? null : page.runs[page.activeRunId]
  const blocked = run?.result.contentStatus === 'blocked'
  return createElement('section', { 'aria-labelledby': `oasis-run-title-${page.pageId}` },
    createElement('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 } },
      createElement('div', null,
        createElement('h4', { id: `oasis-run-title-${page.pageId}`, style: { margin: 0, fontSize: 15 } }, '生成与结果'),
        createElement('p', { style: { margin: '5px 0 0', fontSize: 12, color: 'var(--dsw-alias-text-secondary, #66706b)' } },
          '本地确定性演练；结果必须经过人工审核。')),
      createElement('button', {
        type: 'button', disabled: disabledReason !== null, onClick: onGenerate,
        title: disabledReason ?? '基于已保存表单和已确认材料生成',
        'aria-describedby': disabledReason ? `oasis-generate-reason-${page.pageId}` : undefined,
        style: { ...buttonStyle, background: '#245d47', color: '#fff', borderColor: '#245d47', whiteSpace: 'nowrap' },
      }, operation.activeOperation === 'run-create' ? '生成中…' : '生成新运行')),
    createElement('div', { id: `oasis-generate-reason-${page.pageId}`, role: 'status', 'aria-live': 'polite', style: { minHeight: 18, fontSize: 12, color: '#8a4b2f' } },
      disabledReason ?? (operation.feedback === 'run-completed' ? '新运行已完成。' : ''),
      !validation.valid && validation.firstInvalidFieldId
        ? createElement('button', {
            type: 'button',
            onClick: () => globalThis.document?.getElementById(
              `oasis-field-${page.pageId}-${validation.firstInvalidFieldId}`,
            )?.focus(),
            style: { ...buttonStyle, marginLeft: 8, padding: '3px 7px', fontSize: 11 },
          }, '定位首个错误')
        : null),
    operation.error ? createElement('div', { role: 'alert', tabIndex: -1, style: { marginBottom: 10, color: '#8b2f24', fontSize: 12 } },
      `操作失败（${operation.errorCode ?? 'unknown'}）。草稿与既有运行仍保留。`) : null,
    page.runOrder.length > 0 ? createElement('nav', { 'aria-label': '运行历史', style: { display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 0 12px' } },
      ...[...page.runOrder].reverse().map((runId, index) => createElement('button', {
        key: runId, type: 'button', onClick: () => onActivateRun(runId),
        'aria-current': runId === page.activeRunId ? 'true' : undefined,
        style: { ...buttonStyle, background: runId === page.activeRunId ? '#e7f0eb' : buttonStyle.background, whiteSpace: 'nowrap' },
      }, `运行 ${page.runOrder.length - index}`))) : null,
    run ? createElement('article', { style: { display: 'grid', gap: 12 } },
      createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 } },
        createElement('strong', null, statusText(run.result.contentStatus)),
        createElement('span', null, run.completedAt),
        hasDraftDiverged(page, run)
          ? createElement('span', { style: { color: '#8a4b2f' } }, '草稿已偏离此运行；旧运行快照保持不变。')
          : createElement('span', { style: { color: '#2f6653' } }, '当前草稿与此运行输入一致。')),
      ...run.result.sections.map((section) => createElement('section', {
        key: section.sectionId,
        style: { borderTop: '1px solid var(--dsw-alias-border-l2, #e0e3e1)', paddingTop: 10 },
      },
      createElement('h5', { style: { margin: '0 0 6px', fontSize: 13 } }, section.title),
      createElement('pre', { style: { margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', font: 'inherit', fontSize: 13, lineHeight: 1.65 } }, section.body))),
      run.result.risks.length > 0 ? createElement('div', null,
        createElement('strong', { style: { fontSize: 13 } }, '风险'),
        createElement('ul', null, ...run.result.risks.map((risk, index) => createElement('li', { key: index }, risk)))) : null,
      createElement('p', { style: { margin: 0, fontSize: 12, color: 'var(--dsw-alias-text-secondary, #66706b)' } }, run.result.disclaimer),
      blocked
        ? createElement('div', { role: 'alert', style: { border: '1px solid #d7a69d', borderRadius: 8, padding: 10, color: '#8b2f24' } },
            '该运行包含阻断结果；阻断结果不能批准或回写。请补充信息后生成新运行。')
        : createElement('div', { style: { borderTop: '1px solid var(--dsw-alias-border-l2, #e0e3e1)', paddingTop: 12, display: 'grid', gap: 8 } },
            createElement('label', { htmlFor: `oasis-review-note-${page.pageId}`, style: { fontWeight: 650, fontSize: 13 } }, '审核意见'),
            createElement('textarea', {
              id: `oasis-review-note-${page.pageId}`, value: operation.reviewNote, rows: 3,
              disabled: operation.activeOperation !== null,
              onChange: (event) => onReviewNote(event.currentTarget.value),
              style: { width: '100%', boxSizing: 'border-box', border: '1px solid #d7d9d8', borderRadius: 8, padding: 9 },
            }),
            createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              createElement('button', {
                type: 'button', disabled: operation.reviewNote.trim().length === 0 || operation.activeOperation !== null,
                onClick: () => onReview('changes-requested', operation.reviewNote), style: buttonStyle,
              }, '要求修改'),
              createElement('button', {
                type: 'button', 'data-testid': 'oasis-review-approve', disabled: operation.activeOperation !== null,
                onClick: () => onReview('approved', operation.reviewNote), style: buttonStyle,
              }, '批准此运行')),
            run.review.status === 'approved'
              ? createElement('p', { style: { margin: 0, color: '#2f6653', fontSize: 12 } },
                  '已记录人工批准；此状态不代表专业、技术或法律结论。')
              : run.review.status === 'changes-requested'
                ? createElement('p', { style: { margin: 0, color: '#8a4b2f', fontSize: 12 } }, `已要求修改：${run.review.note}`)
                : null))
    : createElement('div', { style: { border: '1px dashed #c8ceca', borderRadius: 10, padding: 18, color: 'var(--dsw-alias-text-secondary, #66706b)', fontSize: 13 } },
        '保存有效表单并确认材料后，可生成第一个本地运行。'))
}
