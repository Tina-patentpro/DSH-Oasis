import { createElement, useState, useEffect } from 'react'
import { generationUnavailableReason, hasPendingUnifiedRun } from '../generation-contract.js'
import { isOasisRemoteExecutionUnresolved } from '../workbench-contract.js'
import { GenerationSourceSwitch } from './GenerationSourceSwitch.js'
import { WorkflowForm, validateWorkflowFormValues } from './WorkflowForm.js'
import { UnifiedResultPanel } from './UnifiedResultPanel.js'

function generationErrorMessage(code) {
  const messages = {
    WORKSPACE_OPERATION_BUSY: '当前项目正在导入、解除关联或准备生成，请等待原操作结束后重新确认；不会自动重试。',
    AUTH_REQUIRED: '请在 DSH 设置 → 绿洲工作台登录账户；如已提交生成，请先查看原运行，不要重复提交。',
    REMOTE_ACCOUNT_UNVERIFIED: '账户身份未能核实，已阻止提交；请检查登录状态并提供此错误码，不要清空任务或重复生成。',
    REMOTE_ACCOUNT_MISMATCH: '当前账户与项目关联或服务返回的账户不一致，已阻止提交；请核对原登录账户，不要重复生成。',
    REMOTE_RUNTIME_CHANGED: '登录状态已变化或暂不可用，本次确认已失效；请检查当前账户后重新核对，已有运行请先查看，不会自动重试。',
    REMOTE_SERVICE_MISMATCH: '服务目录或服务详情与本次确认不匹配，已阻止提交；请重新核对服务与材料，已有运行请先查看，不会自动重试。',
    WORKSPACE_BINDING_REQUIRED: '请在功能中心打开“从网站导入”，选择网站项目并关联；可以不勾选文件。',
    API_SERVICE_MAPPING_REQUIRED: '网站项目已关联，但当前版本尚未确认本模板的专业 API 服务映射；请使用本地 Skills 或等待映射更新，无需填写 JWT 或绑定表单。',
    REMOTE_MAPPING_UNSUPPORTED: '本模板的专业 API 服务映射不兼容，已阻止提交；请使用本地 Skills 或等待映射更新。',
    WEBSITE_PROJECT_LINK_CONFLICT: '网站项目与原服务绑定冲突；请在“从网站导入”窗口明确解除关联，再重新选择项目。本地文件保留。',
    UNRESOLVED_RESPONSE: '尚未取得可用结果，请查看原运行；不会自动重发。停止等待不表示后端取消或退款。',
  }
  return messages[code] ?? '请检查连接和当前材料；如已有未决任务，请先查看原运行。不会自动重试。'
}

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

export function UnifiedGenerationPage({ page, workflow, workspaceId, syncStatus, operation, fixtureEnabled = false, apiExecutionAvailable = false, apiConfigurationReady = true, localGenerationEnabled = false, localGenerationKind = null, markdownRenderer,
  onRenamePage = () => {}, onUpdateForm = () => {}, onSetGenerationSource = () => {}, onGenerate = () => {},
  onSelectClaimsUpstream = () => {},
  onObserveUnified = () => {}, onStopUnified = () => {}, ...resultActions }) {
  const [activeFieldId, setActiveFieldId] = useState(workflow.form.fields[0]?.fieldId)
  const [view, setView] = useState('input')
  const [preview, setPreview] = useState(false)
  const [upstreamPath, setUpstreamPath] = useState(page.generation.upstream?.relativePath ?? '')
  const source = page.generation.source
  const local = localGenerationEnabled && source === 'local-skill'
  const real = local && localGenerationKind === 'native-model'
  const api = source === 'oasis-api' && apiExecutionAvailable && !fixtureEnabled
  const confirmation = api ? operation.apiPreview : operation.localModelPreview
  const [confirmed, setConfirmed] = useState(false)
  useEffect(() => { setConfirmed(false) }, [confirmation?.sha256, confirmation?.confirmationToken, source])
  const locked = !['ready', 'saving'].includes(syncStatus) || operation.activeOperation !== null
    || operation.generationUncertain || hasPendingUnifiedRun(page)
    || page.remoteExecutionOrder.some(id => isOasisRemoteExecutionUnresolved(page.remoteExecutions[id]))
  const readOnlyDisabled = syncStatus !== 'ready' || operation.activeOperation !== null || operation.generationUncertain === true
  const validation = validateWorkflowFormValues(workflow, page.formValues)
  const pendingApi = Object.values(page.remoteExecutions).find(e => e.unifiedClaims && isOasisRemoteExecutionUnresolved(e))
  const latestApi = [...page.remoteExecutionOrder].reverse().map(id => page.remoteExecutions[id]).find(e => e.unifiedClaims)
  const reason = (real || api) && page.workflowVersion !== '2' ? '请新建权利要求任务，历史任务仅供查看'
    : api && !apiConfigurationReady ? '请先在 DSH 设置 → 绿洲工作台登录账户'
    : api && (page.generation.upstream || page.inputRefs.length) ? '当前 API 映射不支持上游/文件引用；请先取消选择，不会静默忽略材料'
    : !fixtureEnabled && !local && !api ? generationUnavailableReason(source)
    : operation.generationUncertain ? '结果未确认，请查看原运行'
      : hasPendingUnifiedRun(page) || pendingApi ? '原运行未决，请查看状态；不会自动重发' : !validation.valid ? '请填写必填材料' : null
  const pending = Object.values(page.runs).find(run => hasPendingUnifiedRun({ runs: { run } }))
  useEffect(() => {
    if (pending?.mode !== 'dsh-local' || pending.status !== 'prepared' || operation.activeOperation !== null || operation.error || syncStatus !== 'ready') return
    const timer = setTimeout(() => { Promise.resolve(onObserveUnified(page.pageId)).catch(() => {}) }, 1000)
    return () => clearTimeout(timer)
  }, [pending, operation.activeOperation, operation.error, syncStatus, onObserveUnified, page.pageId])
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
      createElement('div', { className: 'generation-notice', role: 'status' }, real ? '本地 Skills · 使用 DSH 模型' : local ? '原生离线验收 · 无真实调用' : fixtureEnabled ? '合成验收 · 无真实调用' : api ? '专业 API · 逐次确认上传与费用' : source === 'local-skill' ? '本地 Skills · 模型服务暂不可用' : '专业 API · 待绑定'),
      createElement('div', { className: 'generation-views', 'aria-label': '输入与结果视图' },
        ...[['input', '输入'], ['result', '结果']].map(([id, label]) => createElement('button', {
          key: id, type: 'button', 'aria-pressed': view === id, onClick: () => setView(id),
        }, label)))),
    createElement('div', { className: 'generation-panes' },
      createElement('section', { className: 'generation-pane', 'data-visible': view === 'input' },
        createElement('h3', null, '输入材料'),
        page.workflowVersion === '2' ? createElement('div', { style: { fontSize: 11, marginBottom: 8 } },
          createElement('label', null, '上游累计文稿', createElement('input', { 'aria-label': '上游 Markdown 相对路径', value: upstreamPath,
            placeholder: '当前项目内的 .md 路径', disabled: locked, style: { width: '100%', minWidth: 0 }, onChange: e => setUpstreamPath(e.currentTarget.value) })),
          createElement('button', { type: 'button', disabled: locked || !upstreamPath.trim(), onClick: () => Promise.resolve(onSelectClaimsUpstream(page.pageId, upstreamPath.trim())).catch(() => {}) }, '确认读取'),
          page.generation.upstream ? createElement('button', { type: 'button', disabled: locked, onClick: () => Promise.resolve(onSelectClaimsUpstream(page.pageId, null)).catch(() => {}) }, '取消选择') : null,
          createElement('div', { role: 'status' }, page.generation.upstream ? `已确认：${page.generation.upstream.displayName} · ${page.generation.upstream.sha256.slice(0,8)}` : '上游累计材料：未选择'),
          createElement('div', null, '仅读取所选文件；明确替换请在用户指令单独写一行“替换：内容ID”。')) : null,
        createElement('div', { className: 'editor-tools' },
          createElement('button', { type: 'button', 'aria-pressed': !preview, onClick: () => setPreview(false) }, '编辑 Markdown'),
          createElement('button', { type: 'button', 'aria-pressed': preview, onClick: () => setPreview(true) }, markdownRenderer?.resourcePolicyVersion === 1 ? '预览效果' : '文本预览')),
        createElement(WorkflowForm, { pageId: page.pageId, workflow, values: page.formValues, validation, disabled: locked,
          presentation: 'tabs', activeFieldId, onActivateField: setActiveFieldId, preview, markdownRenderer,
          onChange: (fieldId, value) => onUpdateForm(page.pageId, fieldId, value) }),
        createElement('div', { className: 'generation-submit' },
          api && confirmation ? createElement('div', { role: 'group', 'aria-label': '本次 API 调用确认', style: { fontSize: 12, marginBottom: 8, overflowWrap: 'anywhere' } },
            createElement('div', null, `目的地：${confirmation.apiBaseOrigin} · ${confirmation.environmentKind === 'production' ? '生产' : '非生产'}`),
            createElement('div', null, `账户 ${confirmation.accountId} · 目录 ${confirmation.folderName} (${confirmation.folderId}) · 服务 ${confirmation.apiEndpoint}`),
            createElement('div', null, `技术交底以 technical-disclosure.txt 上传（${confirmation.documentBytes} 字节）；四字段共 ${confirmation.characterCount} 字符，未填字段省略。参考费用 ${confirmation.price}，余额 ${confirmation.balance}。`),
            createElement('label', null, createElement('input', { type: 'checkbox', checked: confirmed, disabled: locked,
              onChange: event => setConfirmed(event.currentTarget.checked) }), '我确认将本次材料上传至上述服务并生成，可能产生费用；失败不自动切换或重发。'),
            createElement('button', { type: 'button', disabled: locked || !confirmed || reason !== null,
              onClick: () => { setConfirmed(false); onGenerate(page.pageId, true) } }, '确认上传并生成')) : null,
          real && confirmation ? createElement('div', { role: 'group', 'aria-label': '本次模型调用确认', style: { fontSize: 12, marginBottom: 8, overflowWrap: 'anywhere' } },
            createElement('div', null, `模型：${confirmation.route.provider} / ${confirmation.route.model}${confirmation.route.reasoningEffort ? ` / ${confirmation.route.reasoningEffort}` : ''}`),
            createElement('div', null, `发送四选项卡文本${confirmation.upstreamIncluded ? '及已选择的上游全文' : '（未选上游文稿）'}，共 ${confirmation.characterCount} 字符${confirmation.skill ? `，另含内置 Skill ${confirmation.skill.id}/${confirmation.skill.version}` : ''}。`),
            createElement('label', null, createElement('input', { type: 'checkbox', checked: confirmed, disabled: locked,
              onChange: event => setConfirmed(event.currentTarget.checked) }), '我确认向上述模型发送材料和 Skill；云端模型可能产生费用，金额由 DSH 模型配置决定。'),
            createElement('button', { type: 'button', disabled: locked || !confirmed || reason !== null,
              onClick: () => { setConfirmed(false); onGenerate(page.pageId, true) } }, '确认并生成')) : null,
          createElement('button', { type: 'button', 'data-testid': 'oasis-unified-generate', disabled: locked || syncStatus !== 'ready' || reason !== null,
            title: reason ?? undefined, onClick: () => onGenerate(page.pageId) }, ['run-create', 'api-create'].includes(operation.activeOperation) ? '生成中…' : api ? '核对服务与材料（读取账户与目录）' : real ? confirmation ? '重新核对模型与材料' : '核对模型与材料' : local ? '生成离线样本' : fixtureEnabled ? '生成合成样本' : '生成'),
          operation.error ? createElement('p', { role: 'alert' }, `操作未完成。${generationErrorMessage(operation.errorCode)}`) : null,
          latestApi ? createElement('p', { role: 'status', style: { fontSize: 12 } }, `API 原运行：${latestApi.status}${latestApi.safeError ? `（${latestApi.safeError.code}）` : ''}。停止等待不代表后端取消或退款。`) : null,
          reason ? createElement('p', { role: 'status', style: { margin: '8px 0 0', fontSize: 12 } }, reason) : null,
          (pending || pendingApi || operation.generationUncertain) ? createElement('div', null,
            createElement('button', { type: 'button', disabled: operation.activeOperation !== null, onClick: () => onObserveUnified(page.pageId) }, '查看原运行'),
            pendingApi && (pendingApi.submittedAt !== null || ['prepared', 'ready-to-submit'].includes(pendingApi.status)) ? createElement('button', { type: 'button', disabled: operation.activeOperation !== null,
              onClick: () => onStopUnified(page.pageId, pendingApi.executionId) }, pendingApi.submittedAt === null ? '放弃提交前准备（保留回执）' : '停止本地等待') : null,
            pending?.status === 'prepared' ? createElement('button', { type: 'button', disabled: operation.activeOperation !== null,
              onClick: () => onStopUnified(page.pageId, pending.runId) }, pending.mode === 'dsh-local' ? '停止等待' : '结束未完成合成') : null) : null)),
      createElement('section', { className: 'generation-pane generation-result', 'data-visible': view === 'result' },
        createElement('h3', null, '生成结果'),
        createElement(UnifiedResultPanel, { page, operation, markdownRenderer, workspaceId, disabled: locked || syncStatus !== 'ready', readOnlyDisabled, ...resultActions }))))
}
