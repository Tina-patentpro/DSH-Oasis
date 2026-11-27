import { createElement } from 'react'
import { isOasisRemoteExecutionUnresolved } from '../workbench-contract.js'

const boxStyle = {
  border: '1px solid var(--dsw-alias-border-l2, #d7d9d8)',
  borderRadius: 12,
  padding: 16,
  background: 'var(--dsw-alias-bg-base, #fff)',
  display: 'grid',
  gap: 12,
}

const fieldStyle = { display: 'grid', gap: 5, fontSize: 12 }
const controlStyle = { width: '100%', boxSizing: 'border-box', border: '1px solid #cfd5d1', borderRadius: 8, padding: 8 }

function fieldControl(field, page, value, disabled, onChange, scoped) {
  const props = { disabled, style: controlStyle, required: field.required === true,
    'data-testid': `oasis-professional-field-${field.fieldId}` }
  const files = field.control === 'single-file' || field.control === 'multi-file'
  if (files) {
    const multiple = field.control === 'multi-file'
    const references = page.inputRefs.filter(ref => ref.kind === 'project-file'
      && (field.fieldId !== 'drawings_images' || ref.mediaType.startsWith('image/')))
    return createElement('select', { ...props, multiple, value: multiple ? (Array.isArray(value) ? value : []) : (value ?? ''),
      onChange: event => onChange(multiple
        ? Array.from(event.currentTarget.selectedOptions, option => option.value) : event.currentTarget.value) },
    multiple ? null : createElement('option', { value: '' }, '请选择项目材料'),
    ...references.map(ref => createElement('option', { key: ref.referenceId, value: ref.referenceId }, ref.displayName)))
  }
  const element = scoped || field.control === 'long-text' ? 'textarea' : 'input'
  return createElement(element, { ...props, value: value ?? '',
    onChange: event => onChange(event.currentTarget.value) })
}

function latestExecution(page) {
  const id = page.remoteExecutionOrder.at(-1)
  return id ? page.remoteExecutions[id] : null
}

export function ProfessionalServicePanel({
  state,
  page,
  operation,
  scoped = false,
  onSelectService = () => {},
  onUpdateField = () => {},
  onSelectFolder = () => {},
  onConfirm = () => {},
  onStart = () => {},
  onContinue = () => {},
  onStop = () => {},
  onObserveRunningWater = () => {},
}) {
  const configurationBlocked = state.professionalConfigurationBlocked === true
  const waiting = ['professional-run', 'professional-continue'].includes(operation.activeOperation)
  if (configurationBlocked) {
    const execution = latestExecution(page)
    return createElement('section', { style: boxStyle, 'data-testid': 'oasis-professional-service' },
      createElement('strong', null, '专业服务'),
      createElement('p', { role: 'status' }, '请前往 DSH 设置 → 绿洲工作台登录账户。'),
      waiting && execution ? createElement('button', {
        type: 'button', onClick: () => onStop(execution.executionId), 'data-testid': 'oasis-professional-stop',
      }, '停止本地等待') : null)
  }
  if (state.professionalStatus === 'idle' || state.professionalStatus === 'loading') {
    return createElement('section', { style: boxStyle, 'data-testid': 'oasis-professional-service' },
      createElement('strong', null, '专业服务'),
      createElement('div', { role: 'status' }, '正在读取 Host 专业服务目录…'))
  }
  if (state.professionalStatus === 'error') {
    return createElement('section', { style: boxStyle, 'data-testid': 'oasis-professional-service' },
      createElement('strong', null, '专业服务'),
      createElement('div', { role: 'alert' }, '专业服务目录读取失败；本地工作流仍可继续使用。'))
  }
  const bootstrap = state.professionalBootstrap
  if (!bootstrap?.remoteEnabled) {
    return createElement('section', { style: boxStyle, 'data-testid': 'oasis-professional-service' },
      createElement('strong', null, '专业服务'),
      createElement('p', { style: { margin: 0, color: '#66706b' } }, 'Host 尚未启用专业 API 地址。请前往 DSH 设置 → 绿洲工作台保存，随后重启 Host 并刷新页面。'))
  }
  if (!bootstrap.credentialConfigured) {
    return createElement('section', { style: boxStyle, 'data-testid': 'oasis-professional-service' },
      createElement('strong', null, '专业服务'),
      createElement('p', { style: { margin: 0, color: '#8b2f24' } }, '请前往 DSH 设置 → 绿洲工作台登录账户；登录信息不会进入工作台状态。'))
  }

  const draft = page.professionalDraft
  const detail = operation.professionalDetail
  const execution = latestExecution(page)
  const busy = operation.activeOperation !== null
  const unresolved = !!execution && isOasisRemoteExecutionUnresolved(execution)
  const editDisabled = busy || (scoped && unresolved)
  const canStart = detail && draft && operation.priceConfirmed && operation.externalTransferConfirmed && !editDisabled
    && (!scoped || (bootstrap.folders.some(folder => folder.id === draft.folderId)
      && Object.values(draft.formValues).some(value => Array.isArray(value) ? value.length > 0 : String(value).trim())))
  const groups = new Map()
  for (const service of bootstrap.services) {
    const entries = groups.get(service.group) ?? new Map()
    entries.set(service.apiEndpoint, service)
    groups.set(service.group, entries)
  }
  const canContinue = execution && isOasisRemoteExecutionUnresolved(execution) && !busy
    && (scoped || ['submission-unknown', 'waiting-result', 'wait-stopped', 'auth-required'].includes(execution.status))
  const canSelect = !editDisabled && (scoped || bootstrap.folders.length > 0)
  const activeRemoteRun = page.activeRunId === null ? null : page.runs[page.activeRunId]
  const showRunningWater = activeRemoteRun?.mode === 'oasis-legacy'
    && activeRemoteRun.status === 'completed'
  const canObserveRunningWater = showRunningWater && !busy
  const observation = operation.runningWaterObservation?.runId === activeRemoteRun?.runId
    ? operation.runningWaterObservation
    : null

  return createElement('section', { style: boxStyle, 'data-testid': 'oasis-professional-service' },
    createElement('div', null,
      createElement('strong', null, '专业服务'),
      createElement('div', { style: { marginTop: 4, color: '#66706b', fontSize: 12 } },
        `环境：${bootstrap.environmentKind === 'production' ? '线上服务' : '非生产'} · 余额：${bootstrap.balance ?? '未知'} · 价格仅作提交前快照`)),
    operation.activeOperation === 'professional-detail'
      ? createElement('p', { role: 'status' }, '正在读取服务定义…') : null,
    operation.errorCode === 'PROFESSIONAL_DETAIL_UNAVAILABLE'
      ? createElement('p', { role: 'alert' }, '当前服务定义暂不可用。请选择其他服务或重新读取。') : null,
    createElement('label', { style: fieldStyle },
      createElement('span', null, '服务'),
      createElement('select', {
        value: draft?.selectedApiEndpoint ?? '',
        disabled: !canSelect,
        onChange: (event) => { if (event.currentTarget.value) onSelectService(event.currentTarget.value) },
        style: controlStyle,
        'data-testid': 'oasis-professional-service-select',
      },
      createElement('option', { value: '' }, '请选择服务'),
      ...[...groups].map(([group, services]) => createElement('optgroup', { key: group, label: group },
        ...[...services.values()].map(service => createElement('option', { key: service.apiEndpoint, value: service.apiEndpoint },
          `${service.categoryName} / ${service.apiEndpoint}`)))))),
    scoped && bootstrap.services.length === 0
      ? createElement('p', { role: 'status' }, '当前绿洲账户的服务目录未返回此节点对应的服务。') : null,
    bootstrap.folders.length === 0
      ? createElement('p', { role: 'status' }, '当前账户没有可用项目文件夹。请在绿洲网站创建后重新打开工作台。') : null,
    draft && !detail
      ? createElement('button', {
          type: 'button', disabled: !canSelect, onClick: () => onSelectService(draft.selectedApiEndpoint),
          'data-testid': 'oasis-professional-load-detail',
        }, '加载并校验服务定义')
      : null,
    detail
      ? createElement('div', { style: { display: 'grid', gap: 10 } },
          createElement('div', { style: { fontSize: 12 } }, detail.executionMode === 'async' ? '异步执行' : '同步执行'),
          ...detail.inputFields.map(field => createElement('label', { key: field.fieldId, style: fieldStyle },
            createElement('span', null, field.label),
            fieldControl(field, page, draft.formValues[field.fieldId], editDisabled, value => onUpdateField(field.fieldId, value), scoped),
            field.control === 'multi-file' ? createElement('small', null, '按住 Command 或 Ctrl 可选择多个项目文件。') : null,
            field.description ? createElement('small', null, field.description) : null)),
          createElement('label', { style: fieldStyle },
            createElement('span', null, '项目文件夹（当前返回页）'),
            createElement('select', {
              value: draft.folderId, disabled: editDisabled, style: controlStyle,
              onChange: (event) => onSelectFolder(Number(event.currentTarget.value)),
              'data-testid': 'oasis-professional-folder',
            }, scoped ? createElement('option', { value: 0 }, '请选择本次绿洲项目') : null, ...bootstrap.folders.map((folder) => createElement('option', { key: folder.id, value: folder.id }, folder.name)))),
          createElement('div', { style: { fontSize: 12 } }, `参考价格：${detail.price}`),
          createElement('label', { style: fieldStyle },
            createElement('span', null,
              createElement('input', {
                type: 'checkbox', checked: operation.priceConfirmed, disabled: editDisabled,
                onChange: (event) => onConfirm({
                  priceConfirmed: event.currentTarget.checked,
                  externalTransferConfirmed: operation.externalTransferConfirmed,
                }),
              }),
              ' 我已确认本次参考价格与余额快照')),
          createElement('label', { style: fieldStyle },
            createElement('span', null,
              createElement('input', {
                type: 'checkbox', checked: operation.externalTransferConfirmed, disabled: editDisabled,
                onChange: (event) => onConfirm({
                  priceConfirmed: operation.priceConfirmed,
                  externalTransferConfirmed: event.currentTarget.checked,
                }),
              }),
              ` 我确认本次输入的文字和所选材料将提交至${bootstrap.environmentKind === 'production' ? '线上' : '非生产'}绿洲环境`)),
          createElement('button', {
            type: 'button', disabled: !canStart, onClick: onStart,
            'data-testid': 'oasis-professional-start',
          }, busy ? '处理中…' : '提交专业服务'))
      : null,
    execution
      ? createElement('div', { role: 'status', style: { borderTop: '1px solid #eceeec', paddingTop: 10, fontSize: 12 } },
          `执行状态：${execution.status}`,
          execution.safeError ? createElement('div', { role: 'alert' }, execution.safeError.message) : null,
          execution.serviceSnapshot.executionMode === 'async' && execution.safeError?.code === 'WAIT_LIMIT_REACHED'
            ? createElement('p', null, '后台尚未返回可关联的结果。可在绿洲网站的通知中心或所选项目的历史记录中查看。')
            : null,
          canContinue ? createElement('button', {
            type: 'button', onClick: () => onContinue(execution.executionId),
            'data-testid': 'oasis-professional-continue',
          }, execution.submittedAt === null ? '继续本次提交' : '继续检查原请求结果') : null,
          ['professional-run', 'professional-continue'].includes(operation.activeOperation) ? createElement('button', {
            type: 'button', onClick: () => onStop(execution.executionId),
            'data-testid': 'oasis-professional-stop',
          }, '停止本地等待') : null)
      : null,
    showRunningWater
      ? createElement('div', { style: { borderTop: '1px solid #eceeec', paddingTop: 10, fontSize: 12 } },
          createElement('button', {
            type: 'button',
            disabled: !canObserveRunningWater,
            onClick: () => onObserveRunningWater(activeRemoteRun.runId),
            'data-testid': 'oasis-professional-running-water',
          }, operation.runningWaterStatus === 'loading' ? '正在观察流水…' : '观察当前页流水'),
          createElement('div', { style: { marginTop: 6, color: '#66706b' } },
            '仅表示当前页观察结果；同 link_id 仅为候选，关联未验证，不代表结算、退款或资金锁定。'),
          observation
            ? createElement('div', { role: 'status', style: { marginTop: 6 } },
                observation.status === 'observed'
                  ? `已观察到同 link_id 的候选流水（关联未验证）：${observation.item.type} ${observation.item.money}，余额 ${observation.item.balance}`
                  : observation.status === 'not-observed'
                    ? '当前返回页未观察到同 link_id 候选；不能据此判断不存在或未结算。'
                    : '没有来源已验证的创建记录 id，本次观察不可验证。')
            : null)
      : null,
    operation.error ? createElement('div', { role: 'alert' }, operation.error) : null)
}
