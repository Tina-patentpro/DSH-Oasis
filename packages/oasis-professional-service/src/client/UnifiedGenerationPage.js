import { createElement, useState } from 'react'
import { generationUnavailableReason, hasPendingUnifiedRun } from '../generation-contract.js'
import { isOasisRemoteExecutionUnresolved } from '../workbench-contract.js'
import { GenerationSourceSwitch } from './GenerationSourceSwitch.js'
import { WorkflowForm, validateWorkflowFormValues } from './WorkflowForm.js'
import { UnifiedResultPanel } from './UnifiedResultPanel.js'

const css = `
.oasis-unified { container: oasis-generation / inline-size; min-width: 0; color: var(--dsw-alias-text-primary, #24352f); }
.oasis-unified * { box-sizing: border-box; }
.oasis-unified .generation-heading { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--dsw-alias-border-l2, #dfe6e2); align-items: center; }
.oasis-unified .generation-title { min-width: 0; }
.oasis-unified .generation-title input { width: 100%; border: 0; background: transparent; color: inherit; font: inherit; font-weight: 650; }
.oasis-unified .generation-notice { grid-column: 2; grid-row: 2; font-size: 11px; text-align: right; color: var(--dsw-alias-text-secondary, #66706b); }
.oasis-unified .generation-views { grid-column: 1; grid-row: 2; display: flex; gap: 4px; }
.oasis-unified .generation-views button, .oasis-unified .editor-tools button { border: 1px solid var(--dsw-alias-border-l2, #dce4df); border-radius: 8px; padding: 6px 9px; background: var(--dsw-alias-bg-base, #fff); color: inherit; cursor: pointer; }
.oasis-unified .generation-panes { display: grid; grid-template-columns: minmax(0, 1fr); }
.oasis-unified .generation-pane { min-width: 0; padding: 16px; }
.oasis-unified .generation-pane[data-visible="false"] { display: none; }
.oasis-unified h3 { font-size: 16px; margin: 0 0 12px; }
.oasis-unified textarea { min-height: 260px; resize: vertical; }
.oasis-unified .editor-tools { display: flex; justify-content: flex-end; gap: 6px; margin-bottom: 12px; }
.oasis-unified .generation-submit { position: sticky; bottom: 0; padding: 14px 0; background: var(--dsw-alias-bg-base, #fff); }
.oasis-unified .generation-submit button { width: 100%; border: 0; border-radius: 9px; padding: 13px; font: inherit; background: #196e55; color: white; }
.oasis-unified .generation-submit button:disabled { opacity: .55; cursor: not-allowed; }
@container oasis-generation (min-width: 680px) {
  .oasis-unified .generation-heading { grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); }
  .oasis-unified .generation-notice { grid-column: 3; grid-row: 1; }
  .oasis-unified .generation-views { display: none; }
  .oasis-unified .generation-panes { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .oasis-unified .generation-pane[data-visible="false"] { display: block; }
  .oasis-unified .generation-result { border-left: 1px solid var(--dsw-alias-border-l2, #dfe6e2); }
}
`

export function UnifiedGenerationPage({ page, workflow, workspaceId, syncStatus, operation, fixtureEnabled = false, markdownRenderer,
  onRenamePage = () => {}, onUpdateForm = () => {}, onSetGenerationSource = () => {}, onGenerate = () => {},
  onObserveUnified = () => {}, onStopUnified = () => {}, ...resultActions }) {
  const [activeFieldId, setActiveFieldId] = useState(workflow.form.fields[0]?.fieldId)
  const [view, setView] = useState('input')
  const [preview, setPreview] = useState(false)
  const source = page.generation.source
  const locked = !['ready', 'saving'].includes(syncStatus) || operation.activeOperation !== null
    || operation.generationUncertain || hasPendingUnifiedRun(page)
    || page.remoteExecutionOrder.some(id => isOasisRemoteExecutionUnresolved(page.remoteExecutions[id]))
  const validation = validateWorkflowFormValues(workflow, page.formValues)
  const reason = !fixtureEnabled ? generationUnavailableReason(source)
    : operation.generationUncertain ? '结果未确认，请查看原运行'
      : hasPendingUnifiedRun(page) ? '原合成运行尚未结束' : !validation.valid ? '请填写必填材料' : null
  const pending = Object.values(page.runs).find(run => run.mode === 'unified-fixture' && run.status === 'prepared')
  return createElement('div', { className: 'oasis-unified', 'data-testid': 'oasis-unified-page' },
    createElement('style', null, css),
    createElement('header', { className: 'generation-heading' },
      createElement('div', { className: 'generation-title' },
        createElement('input', { key: `${page.pageId}:${page.title}`, 'aria-label': '任务名称', defaultValue: page.title, maxLength: 200, disabled: locked,
          onBlur: event => {
            const title = event.currentTarget.value.trim()
            if (!title) event.currentTarget.value = page.title
            else if (title !== page.title) onRenamePage(page.pageId, title)
          } }),
        createElement('div', { title: workspaceId, style: { fontSize: 11, overflowWrap: 'anywhere', color: 'var(--dsw-alias-text-secondary, #66706b)' } }, `项目：${workspaceId}`)),
      createElement(GenerationSourceSwitch, { value: source, disabled: locked, onChange: value => onSetGenerationSource(page.pageId, value) }),
      createElement('div', { className: 'generation-notice', role: 'status' }, fixtureEnabled ? '合成验收 · 无真实调用' : source === 'local-skill' ? '本地 Skills · 未启用' : '专业 API · 待绑定'),
      createElement('div', { className: 'generation-views', 'aria-label': '输入与结果视图' },
        ...[['input', '输入'], ['result', '结果']].map(([id, label]) => createElement('button', {
          key: id, type: 'button', 'aria-pressed': view === id, onClick: () => setView(id),
        }, label)))),
    createElement('div', { className: 'generation-panes' },
      createElement('section', { className: 'generation-pane', 'data-visible': view === 'input' },
        createElement('h3', null, '输入材料'),
        createElement('div', { className: 'editor-tools' },
          createElement('button', { type: 'button', 'aria-pressed': !preview, onClick: () => setPreview(false) }, '编辑 Markdown'),
          createElement('button', { type: 'button', 'aria-pressed': preview, onClick: () => setPreview(true) }, markdownRenderer?.resourcePolicyVersion === 1 ? '预览效果' : '文本预览')),
        createElement(WorkflowForm, { pageId: page.pageId, workflow, values: page.formValues, validation, disabled: locked,
          presentation: 'tabs', activeFieldId, onActivateField: setActiveFieldId, preview, markdownRenderer,
          onChange: (fieldId, value) => onUpdateForm(page.pageId, fieldId, value) }),
        createElement('div', { className: 'generation-submit' },
          createElement('button', { type: 'button', 'data-testid': 'oasis-unified-generate', disabled: locked || syncStatus !== 'ready' || reason !== null,
            title: reason ?? undefined, onClick: () => onGenerate(page.pageId) }, operation.activeOperation === 'run-create' ? '生成中…' : fixtureEnabled ? '生成合成样本' : '生成'),
          reason ? createElement('p', { role: 'status', style: { margin: '8px 0 0', fontSize: 12 } }, reason) : null,
          (pending || operation.generationUncertain) ? createElement('div', null,
            createElement('button', { type: 'button', disabled: operation.activeOperation !== null, onClick: () => onObserveUnified(page.pageId) }, '查看原运行'),
            pending ? createElement('button', { type: 'button', disabled: operation.activeOperation !== null,
              onClick: () => onStopUnified(page.pageId, pending.runId) }, '结束未完成合成') : null) : null)),
      createElement('section', { className: 'generation-pane generation-result', 'data-visible': view === 'result' },
        createElement('h3', null, '生成结果'),
        createElement(UnifiedResultPanel, { page, operation, markdownRenderer, disabled: locked || syncStatus !== 'ready', ...resultActions }))))
}
