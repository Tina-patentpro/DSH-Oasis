import { createElement } from 'react'

function shortHash(hash) {
  return typeof hash === 'string' ? `${hash.slice(0, 8)}…` : '—'
}

const buttonStyle = {
  border: '1px solid var(--dsw-alias-border-l2, #d7d9d8)', borderRadius: 7,
  padding: '7px 10px', background: 'var(--dsw-alias-bg-base, #fff)', color: 'inherit',
}

export function WritebackPanel({ run, operation, disabled, onDraft, onPrepare, onConfirm, onCommit }) {
  if (!run || run.result.contentStatus === 'blocked' || run.review.status !== 'approved') return null
  const prepared = operation.writebackPlan
  const commitDisabled = disabled || !prepared || !operation.writebackConfirmed
  return createElement('section', {
    'aria-label': '项目回写',
    style: { borderTop: '1px solid var(--dsw-alias-border-l2, #e0e3e1)', paddingTop: 14, display: 'grid', gap: 10 },
  },
  createElement('h4', { style: { margin: 0, fontSize: 15 } }, '项目回写'),
  createElement('p', { style: { margin: 0, fontSize: 12, color: 'var(--dsw-alias-text-secondary, #66706b)' } },
    '仅可创建全新目录；不会覆盖既有路径。人工批准与回写均不构成专业或法律结论。'),
  createElement('label', { htmlFor: 'oasis-writeback-directory', style: { fontSize: 13, fontWeight: 650 } }, 'Workspace 内新目录'),
  createElement('input', {
    id: 'oasis-writeback-directory', value: operation.writebackDirectory, disabled,
    onChange: (event) => onDraft(event.currentTarget.value, false),
    style: { width: '100%', boxSizing: 'border-box', border: '1px solid #d7d9d8', borderRadius: 8, padding: 9 },
  }),
  createElement('button', {
    type: 'button', disabled: disabled || operation.writebackDirectory.trim().length === 0,
    onClick: onPrepare, style: buttonStyle,
  }, operation.activeOperation === 'writeback-prepare' ? '正在准备…' : '准备回写清单'),
  prepared ? createElement('div', { style: { border: '1px solid #cbd7d0', borderRadius: 9, padding: 11, display: 'grid', gap: 7 } },
    createElement('strong', { style: { fontSize: 13 } }, '待确认目标'),
    createElement('code', { style: { overflowWrap: 'anywhere', fontSize: 12 } }, prepared.manifest.absoluteTarget),
    ...prepared.manifest.files.map((file) => createElement('div', { key: file.absolutePath, style: { fontSize: 12 } },
      createElement('code', { style: { overflowWrap: 'anywhere' } }, file.absolutePath),
      createElement('span', null, ` · SHA-256 ${shortHash(file.sha256)}`))),
    createElement('label', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, marginTop: 4 } },
      createElement('input', {
        type: 'checkbox', checked: operation.writebackConfirmed, disabled,
        onChange: (event) => onConfirm(event.currentTarget.checked),
      }),
      createElement('span', null, '我已复核绝对目标路径和两份文件哈希，同意创建该全新目录。')),
    createElement('button', {
      type: 'button', 'data-testid': 'oasis-writeback-commit', disabled: commitDisabled,
      onClick: onCommit, style: { ...buttonStyle, background: '#245d47', color: '#fff', borderColor: '#245d47' },
    }, operation.activeOperation === 'writeback-commit' ? '正在提交…' : '确认创建新目录')) : null,
  createElement('div', { role: operation.feedback === 'index-warning' ? 'alert' : 'status', 'aria-live': 'polite', style: { fontSize: 12 } },
    operation.feedback === 'writeback-success' ? '回写成功：新目录和索引均已提交。' : '',
    operation.feedback === 'conflict' ? '版本或目标路径冲突：未执行覆盖，请重新准备。' : '',
    operation.feedback === 'index-warning' ? '文件已创建，但任务索引更新失败；请按恢复清单人工核对。' : ''),
  operation.indexWarningManifest ? createElement('div', { style: { border: '1px solid #d7a69d', borderRadius: 8, padding: 9, fontSize: 12 } },
    createElement('strong', null, '恢复清单'),
    createElement('div', null, operation.indexWarningManifest.relativeDirectory),
    ...operation.indexWarningManifest.files.map((file) => createElement('div', { key: file.relativePath },
      createElement('code', null, file.relativePath), ` · ${shortHash(file.sha256)}`))) : null)
}
