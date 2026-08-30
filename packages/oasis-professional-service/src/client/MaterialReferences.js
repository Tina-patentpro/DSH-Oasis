import { createElement } from 'react'

function shortHash(hash) {
  return typeof hash === 'string' && hash.length >= 8 ? `${hash.slice(0, 8)}…` : '—'
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const actionStyle = {
  border: '1px solid var(--dsw-alias-border-l2, #d7d9d8)',
  borderRadius: 7,
  padding: '6px 9px',
  background: 'var(--dsw-alias-bg-base, #fff)',
  color: 'var(--dsw-alias-text-primary, #1f2623)',
}

export function MaterialReferences({
  page,
  workflow,
  operation,
  disabled,
  onMaterialDraft,
  onAdd,
  onRefresh,
  onRemove,
  confirmRemove = (message) => globalThis.confirm?.(message) === true,
}) {
  const addDisabled = disabled || !operation.materialConfirmed || operation.materialPath.trim().length === 0
  return createElement('section', { 'aria-labelledby': `oasis-material-title-${page.pageId}` },
    createElement('h4', { id: `oasis-material-title-${page.pageId}`, style: { margin: '0 0 5px', fontSize: 15 } }, '项目材料'),
    createElement('p', { style: { margin: '0 0 12px', color: 'var(--dsw-alias-text-secondary, #66706b)', fontSize: 12 } },
      `仅登记元数据与哈希；文件在本机流式读取以计算哈希，正文不提取、不持久化且不用于生成。支持 ${workflow.materialPolicy.acceptedExtensions.join('、')}。`),
    createElement('div', { style: { display: 'grid', gap: 8, marginBottom: 12 } },
      createElement('label', { htmlFor: `oasis-material-path-${page.pageId}`, style: { fontSize: 13, fontWeight: 650 } }, 'Workspace 内相对路径'),
      createElement('input', {
        id: `oasis-material-path-${page.pageId}`,
        'aria-label': 'Workspace 内材料相对路径',
        value: operation.materialPath,
        disabled,
        onChange: (event) => onMaterialDraft(event.currentTarget.value, false),
        style: { ...actionStyle, width: '100%', boxSizing: 'border-box', padding: '9px 10px' },
      }),
      createElement('label', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12 } },
        createElement('input', {
          type: 'checkbox', checked: operation.materialConfirmed, disabled,
          onChange: (event) => onMaterialDraft(operation.materialPath, event.currentTarget.checked),
        }),
        createElement('span', null, '我确认该相对路径属于当前项目，并同意登记文件元数据与 SHA-256。')),
      createElement('button', {
        type: 'button', disabled: addDisabled, onClick: onAdd, style: actionStyle,
        title: addDisabled ? '填写路径并勾选确认后才可登记' : undefined,
      }, '登记材料')),
    createElement('div', { style: { display: 'grid', gap: 8 } },
      ...page.inputRefs.map((reference) => createElement('article', {
        key: reference.referenceId,
        style: { border: '1px solid var(--dsw-alias-border-l2, #dfe2e0)', borderRadius: 9, padding: 11, display: 'grid', gap: 7 },
      },
      createElement('strong', { style: { fontSize: 13, overflowWrap: 'anywhere' } }, reference.displayName ?? reference.relativePath ?? '旧版材料'),
      reference.kind === 'project-file'
        ? createElement('div', { style: { fontSize: 12, color: 'var(--dsw-alias-text-secondary, #66706b)' } },
            `${reference.relativePath} · ${formatBytes(reference.sizeBytes)} · SHA-256 ${shortHash(reference.sha256)}`)
        : createElement('div', { style: { fontSize: 12, color: '#9b3d2f' } }, '旧版材料需移除后重新确认。'),
      createElement('div', { style: { display: 'flex', gap: 7 } },
        createElement('button', {
          type: 'button', disabled: disabled || reference.kind !== 'project-file',
          'data-testid': `oasis-material-refresh-${reference.referenceId}`,
          onClick: () => onRefresh(reference.referenceId), style: actionStyle,
        }, '刷新证据'),
        createElement('button', {
          type: 'button', disabled,
          'data-testid': `oasis-material-remove-${reference.referenceId}`,
          onClick: () => onRemove(
            reference.referenceId,
            confirmRemove(`确认从任务中移除材料“${reference.displayName ?? reference.referenceId}”？不会删除项目文件。`),
          ),
          style: actionStyle,
        }, '移除登记'))))),
    operation.error ? createElement('div', { role: 'alert', tabIndex: -1, style: { marginTop: 10, color: '#9b3d2f', fontSize: 12 } },
      `操作失败（${operation.errorCode ?? 'unknown'}）。本地项目文件未被删除或覆盖。`) : null,
    createElement('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: 8, fontSize: 12, color: '#2f6653' } },
      operation.feedback === 'material-added' ? '材料证据已登记。' : '',
      operation.materialsChanged ? '材料已发生变化，请刷新证据后再生成。' : ''))
}
