import { createElement } from 'react'

function shortHash(hash) {
  return typeof hash === 'string' ? `${hash.slice(0, 8)}…` : '—'
}

const buttonStyle = {
  border: '1px solid var(--dsw-alias-border-l2, #d7d9d8)', borderRadius: 7,
  padding: '7px 10px', background: 'var(--dsw-alias-bg-base, #fff)', color: 'inherit',
}

export function WritebackPanel({ run, operation, disabled, onPrepare, onConfirm, onCommit }) {
  if (!run || run.result.contentStatus === 'blocked' || run.review.status !== 'approved') return null
  const prepared = operation.writebackPlan
  const commitDisabled = disabled || !prepared || !operation.writebackConfirmed
  return createElement('section', {
    'aria-label': '项目回写',
    style: { borderTop: '1px solid var(--dsw-alias-border-l2, #e0e3e1)', paddingTop: 14, display: 'grid', gap: 10 },
  },
  createElement('h4', { style: { margin: 0, fontSize: 15 } }, '项目回写'),
  createElement('p', { style: { margin: 0, fontSize: 12, color: 'var(--dsw-alias-text-secondary, #66706b)' } },
    '保存到当前 DSH 项目目录，使用 DSH 文件管理查看与编辑。同名文件不会覆盖；专业 API 文件名以 _OIW 结尾。审核与保存不构成专业或法律结论。'),
  createElement('button', {
    type: 'button', disabled,
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
      createElement('span', null, '我已复核项目路径和两份文件哈希，同意在当前项目中创建新文件。')),
    createElement('button', {
      type: 'button', 'data-testid': 'oasis-writeback-commit', disabled: commitDisabled,
      onClick: onCommit, style: { ...buttonStyle, background: '#245d47', color: '#fff', borderColor: '#245d47' },
    }, operation.activeOperation === 'writeback-commit' ? '正在提交…' : '确认保存到项目')) : null,
  createElement('div', { role: operation.feedback === 'index-warning' ? 'alert' : 'status', 'aria-live': 'polite', style: { fontSize: 12 } },
    operation.feedback === 'writeback-success' ? '保存成功：项目文件和索引均已提交。' : '',
    operation.feedback === 'conflict' ? '版本或目标路径冲突：未执行覆盖，请重新准备。' : '',
    operation.feedback === 'index-warning' ? '文件或索引未完整提交；已创建文件予以保留，请按恢复清单人工核对，不要自动重试。' : ''),
  operation.indexWarningManifest ? createElement('div', { style: { border: '1px solid #d7a69d', borderRadius: 8, padding: 9, fontSize: 12 } },
    createElement('strong', null, '恢复清单'),
    createElement('div', null, operation.indexWarningManifest.relativeDirectory),
    ...operation.indexWarningManifest.files.map((file) => createElement('div', { key: file.relativePath },
      createElement('code', null, file.relativePath), ` · ${shortHash(file.sha256)}`))) : null)
}
