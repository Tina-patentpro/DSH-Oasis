import { createElement } from 'react'

const fieldShellStyle = {
  display: 'grid',
  gap: 6,
  padding: '0 0 16px',
}

const controlStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--dsw-alias-border-l2, #d7d9d8)',
  borderRadius: 8,
  padding: '9px 10px',
  background: 'var(--dsw-alias-bg-base, #fff)',
  color: 'var(--dsw-alias-text-primary, #1f2623)',
  font: 'inherit',
  lineHeight: 1.5,
}

function fieldError(field, value) {
  if (field.control === 'short-text' || field.control === 'long-text') {
    if (typeof value !== 'string') return '字段值格式不正确。'
    if (field.required && value.trim().length === 0) return '此项为必填项。'
    if (value.length > field.maxChars) return `最多输入 ${field.maxChars} 个字符。`
    return null
  }
  if (field.control === 'string-list') {
    if (!Array.isArray(value)) return '列表格式不正确。'
    if (field.required && value.length === 0) return '请至少填写一项。'
    if (value.length > field.maxItems) return `最多填写 ${field.maxItems} 项。`
    if (value.some((item) => typeof item !== 'string' || item.trim().length === 0)) return '列表项不能为空。'
    if (value.some((item) => item.length > field.itemMaxChars)) return `每项最多 ${field.itemMaxChars} 个字符。`
    return null
  }
  if (field.control === 'select') {
    if (field.required && (typeof value !== 'string' || value.length === 0)) return '请选择一个选项。'
    if (value !== '' && !field.options.some((option) => option.value === value)) return '请选择目录中提供的选项。'
    return null
  }
  return '不支持的字段控件。'
}

export function validateWorkflowFormValues(workflow, values) {
  const errors = {}
  for (const field of workflow?.form?.fields ?? []) {
    const error = fieldError(field, values?.[field.fieldId])
    if (error !== null) errors[field.fieldId] = error
  }
  const firstInvalidFieldId = Object.keys(errors)[0] ?? null
  return Object.freeze({ valid: firstInvalidFieldId === null, errors: Object.freeze(errors), firstInvalidFieldId })
}

function controlFor({ pageId, field, value, error, firstInvalidFieldId, disabled, onChange }) {
  const id = `oasis-field-${pageId}-${field.fieldId}`
  const describedBy = `${id}-description${error ? ` ${id}-error` : ''}`
  const shared = {
    id,
    name: field.fieldId,
    disabled,
    'data-control': field.control,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy,
    'data-first-error': firstInvalidFieldId === field.fieldId || undefined,
    style: {
      ...controlStyle,
      borderColor: error ? 'var(--dsw-alias-color-danger, #b42318)' : 'var(--dsw-alias-border-l2, #d7d9d8)',
    },
  }
  if (field.control === 'short-text') {
    return createElement('input', {
      ...shared, type: 'text', value: value ?? '', maxLength: field.maxChars,
      onChange: (event) => onChange(field.fieldId, event.currentTarget.value),
    })
  }
  if (field.control === 'long-text') {
    return createElement('textarea', {
      ...shared, value: value ?? '', maxLength: field.maxChars, rows: 5,
      onChange: (event) => onChange(field.fieldId, event.currentTarget.value),
    })
  }
  if (field.control === 'string-list') {
    return createElement('textarea', {
      ...shared, value: Array.isArray(value) ? value.join('\n') : '', rows: 4,
      onChange: (event) => onChange(
        field.fieldId,
        event.currentTarget.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
      ),
    })
  }
  return createElement('select', {
    ...shared, value: value ?? '',
    onChange: (event) => onChange(field.fieldId, event.currentTarget.value),
  },
  createElement('option', { value: '' }, '请选择'),
  ...field.options.map((option) => createElement('option', { key: option.value, value: option.value }, option.label)))
}

export function WorkflowForm({ pageId, workflow, values, validation, disabled, onChange }) {
  return createElement('section', { 'aria-labelledby': `oasis-form-title-${pageId}` },
    createElement('div', { style: { marginBottom: 16 } },
      createElement('h4', { id: `oasis-form-title-${pageId}`, style: { margin: 0, fontSize: 15 } }, '工作流输入'),
      createElement('p', { style: { margin: '5px 0 0', color: 'var(--dsw-alias-text-secondary, #66706b)', fontSize: 12 } },
        `字段来自 Host 工作流目录 · ${workflow.workflowId}@${workflow.workflowVersion}`)),
    ...workflow.form.fields.map((field) => {
      const id = `oasis-field-${pageId}-${field.fieldId}`
      const error = validation.errors[field.fieldId]
      return createElement('div', { key: field.fieldId, style: fieldShellStyle, 'data-field-id': field.fieldId },
        createElement('label', { htmlFor: id, style: { fontWeight: 650, fontSize: 13 } },
          field.label,
          field.required ? createElement('span', { 'aria-hidden': true, style: { color: '#9b3d2f', marginLeft: 4 } }, '＊') : null),
        createElement('span', { id: `${id}-description`, style: { color: 'var(--dsw-alias-text-secondary, #66706b)', fontSize: 12 } }, field.description),
        controlFor({ pageId, field, value: values[field.fieldId], error, firstInvalidFieldId: validation.firstInvalidFieldId, disabled, onChange }),
        error ? createElement('span', { id: `${id}-error`, style: { color: 'var(--dsw-alias-color-danger, #b42318)', fontSize: 12 } }, error) : null)
    }))
}
