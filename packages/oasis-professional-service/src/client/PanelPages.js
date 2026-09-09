import { createElement } from 'react'

import { MaterialReferences } from './MaterialReferences.js'
import { ProfessionalServicePanel } from './ProfessionalServicePanel.js'
import { RunPreview } from './RunPreview.js'
import { WorkflowForm, validateWorkflowFormValues } from './WorkflowForm.js'
import { WritebackPanel } from './WritebackPanel.js'
import { UnifiedGenerationPage } from './UnifiedGenerationPage.js'
import { FunctionCenter } from './FunctionCenter.js'

const surfaceStyle = {
  border: '1px solid var(--dsw-alias-border-l2, #dfe2e0)',
  borderRadius: 12,
  padding: 16,
  background: 'var(--dsw-alias-bg-base, #fff)',
}

const syncNoticeStyle = {
  margin: 20,
  border: '1px solid var(--dsw-alias-border-l2, #d7d9d8)',
  borderRadius: 12,
  padding: 16,
  color: 'var(--dsw-alias-text-primary, #1f2623)',
  background: 'var(--dsw-alias-bg-base, #fff)',
}

function reloadButton(onReload, label) {
  return createElement('button', {
    type: 'button', onClick: onReload,
    style: { marginTop: 12, border: '1px solid #d7d9d8', borderRadius: 8, padding: '7px 10px', background: '#fff', color: 'inherit' },
  }, label)
}

function activeRun(page) {
  return page.activeRunId === null ? null : page.runs[page.activeRunId]
}

export function PanelPages({
  state,
  markdownRenderer,
  savedFileUnavailableReason = '安全文件预览不可用', onOpenSavedFile = () => {},
  showFunctionCenter = false, nativeAvailability = {}, onOpenNative = () => false,
  effectiveMode = 'normal',
  onSelectWorkflow,
  onRenamePage,
  onReload,
  onUpdateForm = () => {},
  onSetGenerationSource = () => {},
  onSelectClaimsUpstream = () => {},
  onObserveUnified = () => {}, onStopUnified = () => {}, onEditResult = () => {}, onUseInConversation = () => {},
  onMaterialDraft = () => {},
  onAddMaterial = () => {},
  onRefreshMaterial = () => {},
  onRemoveMaterial = () => {},
  onGenerate = () => {},
  onActivateRun = () => {},
  onReviewNote = () => {},
  onReview = () => {},
  onWritebackDraft = () => {},
  onPrepareWriteback = () => {},
  onWritebackConfirm = () => {},
  onCommitWriteback = () => {},
  onSelectProfessionalService = () => {},
  onUpdateProfessionalField = () => {},
  onSelectProfessionalFolder = () => {},
  onProfessionalConfirm = () => {},
  onStartProfessional = () => {},
  onContinueProfessional = () => {},
  onStopProfessional = () => {},
  onObserveRunningWater = () => {},
}) {
  if (state.syncStatus === 'idle' || state.syncStatus === 'loading') {
    return createElement('div', { role: 'status', 'aria-live': 'polite', style: syncNoticeStyle }, '正在读取当前项目的绿洲任务页…')
  }
  if (state.syncStatus === 'conflict') {
    const currentRevision = state.conflictCurrent?.revision ?? '未知'
    return createElement('div', { role: 'alert', tabIndex: -1, style: syncNoticeStyle },
      createElement('strong', null, '检测到版本冲突'),
      createElement('div', { style: { marginTop: 6, fontSize: 13 } },
        `服务端当前为 revision ${currentRevision}。本地草稿仍保留，系统不会自动覆盖。`),
      reloadButton(onReload, '重新载入服务端版本（舍弃本地草稿）'))
  }
  if (state.syncStatus === 'error') {
    return createElement('div', { role: 'alert', tabIndex: -1, style: syncNoticeStyle },
      createElement('strong', null, '保存或读取失败'),
      createElement('div', { style: { marginTop: 6, fontSize: 13 } },
        '本地草稿仍保留。请检查 DSH Host 后，再明确重新载入服务端版本。'),
      reloadButton(onReload, '重新载入服务端版本'))
  }

  const page = state.pages.find((item) => item.pageId === state.activePageId)
  if (!page) return createElement('div', { style: { padding: 20, color: '#66706b' } }, '请新建任务页。')

  const titleEditor = createElement('div', {
    style: { padding: '14px 20px', display: 'grid', gap: 5, borderBottom: '1px solid var(--dsw-alias-border-l2, #eceeec)' },
  },
  createElement('label', { htmlFor: `oasis-task-title-${page.pageId}`, style: { fontSize: 11, color: '#66706b', fontWeight: 650 } }, '任务名称'),
  createElement('input', {
    key: `${page.pageId}:${page.title}`,
    id: `oasis-task-title-${page.pageId}`,
    'aria-label': '任务名称',
    defaultValue: page.title,
    maxLength: 200,
    disabled: !['ready', 'saving'].includes(state.syncStatus),
    onBlur: (event) => {
      const title = event.currentTarget.value.trim()
      if (title.length === 0) return void (event.currentTarget.value = page.title)
      if (title !== page.title) onRenamePage(page.pageId, title)
    },
    style: { width: '100%', boxSizing: 'border-box', border: 0, padding: 0, background: 'transparent', color: 'inherit', fontSize: 16, fontWeight: 680 },
  }))

  let content
  if (page.view === 'chooser' || showFunctionCenter) {
    content = createElement(FunctionCenter, {
      state,
      nativeAvailability, onOpenNative,
      onSelect: (workflowId) => onSelectWorkflow(page.pageId, workflowId),
    })
  } else {
    const workflow = state.workflows.find((item) => (
      item.workflowId === page.workflowId && item.workflowVersion === page.workflowVersion
    ))
    if (!workflow) {
      content = createElement('div', { role: 'alert', tabIndex: -1, style: syncNoticeStyle },
        '当前任务引用的工作流版本不在 Host 目录中。为避免错误解释，已停止编辑和生成。')
    } else {
      const operation = state.pageOperations[page.pageId] ?? {
        materialPath: '', materialConfirmed: false, reviewNote: '', writebackDirectory: '',
        writebackConfirmed: false, writebackPlan: null, requestKey: null, activeOperation: null,
        error: null, errorCode: null, feedback: null, materialsChanged: false, indexWarningManifest: null,
        professionalDetail: null, priceConfirmed: false, externalTransferConfirmed: false,
        runningWaterStatus: 'idle', runningWaterObservation: null,
      }
      const validation = validateWorkflowFormValues(workflow, page.formValues)
      const operationDisabled = operation.activeOperation !== null
      const run = activeRun(page)
      content = workflow.executionMode === 'unified-text' && page.generation
        ? createElement(UnifiedGenerationPage, {
            key: page.pageId, page, workflow, markdownRenderer, workspaceId: state.workspaceId, syncStatus: state.syncStatus, operation,
            onRenamePage, onUpdateForm, onSetGenerationSource, onSelectClaimsUpstream,
            fixtureEnabled: state.unifiedFixtureEnabled === true,
            localGenerationEnabled: state.localGenerationEnabled === true,
            localGenerationKind: state.localGenerationKind,
            conversationUnavailableReason: state.conversationUnavailableReason === undefined ? '当前对话输入接口不可用' : state.conversationUnavailableReason,
            onGenerate, onObserveUnified, onStopUnified, onEditResult, onUseInConversation,
            savedFileUnavailableReason, onOpenSavedFile,
            onActivateRun, onReview, onWritebackDraft, onPrepareWriteback, onWritebackConfirm, onCommitWriteback,
          })
        : createElement('div', {
        'data-workspace-layout': true,
        'data-mode': effectiveMode,
        style: {
          display: 'grid',
          gridTemplateColumns: effectiveMode === 'expanded' ? 'minmax(300px, .9fr) minmax(360px, 1.1fr)' : 'minmax(0, 1fr)',
          gap: 14,
          padding: 14,
          alignItems: 'start',
        },
      },
      createElement('div', { style: { display: 'grid', gap: 14, minWidth: 0 } },
        createElement('div', { style: surfaceStyle },
          createElement(WorkflowForm, {
            pageId: page.pageId,
            workflow,
            values: page.formValues,
            validation,
            disabled: operationDisabled,
            onChange: (fieldId, value) => onUpdateForm(page.pageId, fieldId, value),
          })),
        createElement('div', { style: surfaceStyle },
          createElement(MaterialReferences, {
            page, workflow, operation, disabled: operationDisabled,
            onMaterialDraft: (path, confirmed) => onMaterialDraft(page.pageId, path, confirmed),
            onAdd: () => onAddMaterial(page.pageId),
            onRefresh: (referenceId) => onRefreshMaterial(page.pageId, referenceId),
            onRemove: (referenceId, confirmed) => onRemoveMaterial(page.pageId, referenceId, confirmed),
          })),
        createElement(ProfessionalServicePanel, {
          state, page, operation,
          onSelectService: (apiEndpoint) => onSelectProfessionalService(page.pageId, apiEndpoint),
          onUpdateField: (fieldId, value) => onUpdateProfessionalField(page.pageId, fieldId, value),
          onSelectFolder: (folderId) => onSelectProfessionalFolder(page.pageId, folderId),
          onConfirm: (value) => onProfessionalConfirm(page.pageId, value),
          onStart: () => onStartProfessional(page.pageId),
          onContinue: (executionId) => onContinueProfessional(page.pageId, executionId),
          onStop: (executionId) => onStopProfessional(page.pageId, executionId),
          onObserveRunningWater: (runId) => onObserveRunningWater(page.pageId, runId),
        })),
      createElement('div', { style: { ...surfaceStyle, display: 'grid', gap: 16, minWidth: 0 } },
        createElement(RunPreview, {
          page, operation, workflow, validation, syncStatus: state.syncStatus,
          onGenerate: () => onGenerate(page.pageId),
          onActivateRun: (runId) => onActivateRun(page.pageId, runId),
          onReviewNote: (note) => onReviewNote(page.pageId, note),
          onReview: (status, note) => onReview(page.pageId, page.activeRunId, status, note),
        }),
        createElement(WritebackPanel, {
          run,
          operation,
          disabled: operationDisabled,
          onDraft: (directory, confirmed) => onWritebackDraft(page.pageId, directory, confirmed),
          onPrepare: () => onPrepareWriteback(page.pageId, page.activeRunId),
          onConfirm: (confirmed) => onWritebackConfirm(page.pageId, confirmed),
          onCommit: () => onCommitWriteback(page.pageId),
        })))
    }
  }

  return createElement('main', {
    key: page.pageId,
    id: `oasis-panel-${page.pageId}`,
    role: 'tabpanel',
    'aria-labelledby': `oasis-tab-${page.pageId}`,
    style: { flex: 1, minHeight: 0, overflow: 'auto', background: 'var(--dsw-alias-bg-subtle, #f5f7f5)' },
  }, page.generation || page.view === 'chooser' || showFunctionCenter ? null : titleEditor, content)
}
