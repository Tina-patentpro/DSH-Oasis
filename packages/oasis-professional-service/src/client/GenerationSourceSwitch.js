import { createElement } from 'react'

const SOURCES = [['local-skill', '本地 Skills'], ['oasis-api', '专业 API']]

export function GenerationSourceSwitch({ value, disabled = false, onChange }) {
  return createElement('div', {
    role: 'radiogroup', 'aria-label': '生成来源', 'data-testid': 'oasis-generation-source',
    style: { display: 'inline-flex', padding: 3, borderRadius: 10, background: 'var(--dsw-alias-bg-subtle, #edf2f0)', whiteSpace: 'nowrap' },
  }, ...SOURCES.map(([source, label], index) => createElement('button', {
    key: source, type: 'button', role: 'radio', 'aria-checked': value === source, disabled,
    tabIndex: value === source ? 0 : -1,
    onClick: () => { if (!disabled && value !== source) onChange(source) },
    onKeyDown: event => {
      if (disabled) return
      const target = event.key === 'Home' ? 0 : event.key === 'End' ? 1
        : ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) ? 1 - index : null
      if (target === null) return
      event.preventDefault()
      onChange(SOURCES[target][0])
      event.currentTarget.parentElement?.children[target]?.focus()
    },
    style: { border: 0, borderRadius: 8, padding: '8px 10px', cursor: disabled ? 'not-allowed' : 'pointer', font: 'inherit', fontSize: 12,
      opacity: disabled ? 0.55 : 1,
      color: value === source ? 'var(--dsw-alias-text-primary, #137259)' : 'var(--dsw-alias-text-secondary, #66706b)',
      background: value === source ? 'var(--dsw-alias-bg-base, #fff)' : 'transparent' },
  }, label)))
}
