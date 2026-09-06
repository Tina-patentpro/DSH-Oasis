import { createElement } from 'react'

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

function latestExecution(page) {
  const id = page.remoteExecutionOrder.at(-1)
  return id ? page.remoteExecutions[id] : null
}

export function ProfessionalServicePanel({
  state,
  page,
  operation,
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
      createElement('strong', null, '非生产专业服务'),
      createElement('p', { role: 'status' }, '请前往 DSH 设置 → 绿洲工作台完成连接配置。设置保存后须重启 Host 并刷新页面；本地工作流仍可继续使用。'),
      waiting && execution ? createElement('button', {
        type: 'button', onClick: () => onStop(execution.executionId), 'data-testid': 'oasis-professional-stop',
      }, '停止本地等待') : null)
  }
  if (state.professionalStatus === 'idle' || state.professionalStatus === 'loading') {
    return createElement('section', { style: boxStyle, 'data-testid': 'oasis-professional-service' },
      createElement('strong', null, '非生产专业服务'),
      createElement('div', { role: 'status' }, '正在读取 Host 专业服务目录…'))
  }
  if (state.professionalStatus === 'error') {
    return createElement('section', { style: boxStyle, 'data-testid': 'oasis-professional-service' },
      createElement('strong', null, '非生产专业服务'),
      createElement('div', { role: 'alert' }, '专业服务目录读取失败；本地工作流仍可继续使用。'))
  }
  const bootstrap = state.professionalBootstrap
  if (!bootstrap?.remoteEnabled) {
    return createElement('section', { style: boxStyle, 'data-testid': 'oasis-professional-service' },
      createElement('strong', null, '非生产专业服务'),
      createElement('p', { style: { margin: 0, color: '#66706b' } }, 'Host 尚未启用非生产 API 地址。请前往 DSH 设置 → 绿洲工作台保存，随后重启 Host 并刷新页面。'))
  }
  if (!bootstrap.credentialConfigured) {
    return createElement('section', { style: boxStyle, 'data-testid': 'oasis-professional-service' },
      createElement('strong', null, '非生产专业服务'),
      createElement('p', { style: { margin: 0, color: '#8b2f24' } }, '请前往 DSH 设置 → 绿洲工作台重新输入 JWT 并绑定当前 API 地址；凭证不会进入工作台状态。'))
  }

  const draft = page.professionalDraft
  const detail = operation.professionalDetail
  const execution = latestExecution(page)
  const busy = operation.activeOperation !== null
  const canStart = !configurationBlocked && detail && draft && operation.priceConfirmed && operation.externalTransferConfirmed && !busy
  const canContinue = !configurationBlocked && execution && ['submission-unknown', 'waiting-result', 'wait-stopped', 'auth-required'].includes(execution.status) && !busy
  const activeRemoteRun = page.activeRunId === null ? null : page.runs[page.activeRunId]
  const showRunningWater = activeRemoteRun?.mode === 'oasis-legacy'
    && activeRemoteRun.status === 'completed'
  const canObserveRunningWater = showRunningWater && !busy
  const observation = operation.runningWaterObservation?.runId === activeRemoteRun?.runId
    ? operation.runningWaterObservation
    : null

  return createElement('section', { style: boxStyle, 'data-testid': 'oasis-professional-service' },
    createElement('div', null,
      createElement('strong', null, '非生产专业服务'),
      createElement('div', { style: { marginTop: 4, color: '#66706b', fontSize: 12 } },
        `环境：非生产 · 余额：${bootstrap.balance ?? '未知'} · 价格仅作提交前快照`)),
    createElement('label', { style: fieldStyle },
      createElement('span', null, '服务'),
      createElement('select', {
        value: draft?.selectedApiEndpoint ?? '',
        disabled: busy,
        onChange: (event) => { if (event.currentTarget.value) onSelectService(event.currentTarget.value) },
        style: controlStyle,
        'data-testid': 'oasis-professional-service-select',
      },
      createElement('option', { value: '' }, '请选择服务'),
      ...bootstrap.services.map((service) => createElement('option', {
        key: service.apiEndpoint, value: service.apiEndpoint,
      }, `${service.categoryName} / ${service.apiEndpoint}`)))),
    draft && !detail
      ? createElement('button', {
          type: 'button', disabled: busy, onClick: () => onSelectService(draft.selectedApiEndpoint),
          'data-testid': 'oasis-professional-load-detail',
        }, '加载并校验服务定义')
      : null,
    detail
      ? createElement('div', { style: { display: 'grid', gap: 10 } },
          ...detail.inputFields.map((field) => createElement('label', { key: field.fieldId, style: fieldStyle },
            createElement('span', null, field.label),
            field.control === 'single-file'
              ? createElement('select', {
                  value: draft.formValues[field.fieldId] ?? '', disabled: busy, style: controlStyle,
                  onChange: (event) => onUpdateField(field.fieldId, event.currentTarget.value),
                  'data-testid': `oasis-professional-field-${field.fieldId}`,
                },
                createElement('option', { value: '' }, '不上传文件'),
                ...page.inputRefs.filter((item) => item.kind === 'project-file').map((reference) => createElement('option', {
                  key: reference.referenceId, value: reference.referenceId,
                }, reference.displayName)))
              : createElement(field.control === 'long-text' ? 'textarea' : 'input', {
                  value: draft.formValues[field.fieldId] ?? '', disabled: busy, style: controlStyle,
                  onChange: (event) => onUpdateField(field.fieldId, event.currentTarget.value),
                  'data-testid': `oasis-professional-field-${field.fieldId}`,
                }))),
          createElement('label', { style: fieldStyle },
            createElement('span', null, '项目文件夹（当前返回页）'),
            createElement('select', {
              value: draft.folderId, disabled: busy, style: controlStyle,
              onChange: (event) => onSelectFolder(Number(event.currentTarget.value)),
              'data-testid': 'oasis-professional-folder',
            }, ...bootstrap.folders.map((folder) => createElement('option', { key: folder.id, value: folder.id }, folder.name)))),
          createElement('div', { style: { fontSize: 12 } }, `参考价格：${detail.price}`),
          createElement('label', { style: fieldStyle },
            createElement('span', null,
              createElement('input', {
                type: 'checkbox', checked: operation.priceConfirmed, disabled: busy,
                onChange: (event) => onConfirm({
                  priceConfirmed: event.currentTarget.checked,
                  externalTransferConfirmed: operation.externalTransferConfirmed,
                }),
              }),
              ' 我已确认本次参考价格与余额快照')),
          createElement('label', { style: fieldStyle },
            createElement('span', null,
              createElement('input', {
                type: 'checkbox', checked: operation.externalTransferConfirmed, disabled: busy,
                onChange: (event) => onConfirm({
                  priceConfirmed: operation.priceConfirmed,
                  externalTransferConfirmed: event.currentTarget.checked,
                }),
              }),
              ' 我确认所选材料将上传至已配置的非生产绿洲环境')),
          createElement('button', {
            type: 'button', disabled: !canStart, onClick: onStart,
            'data-testid': 'oasis-professional-start',
          }, busy ? '处理中…' : '提交专业服务'))
      : null,
    execution
      ? createElement('div', { role: 'status', style: { borderTop: '1px solid #eceeec', paddingTop: 10, fontSize: 12 } },
          `执行状态：${execution.status}`,
          execution.safeError ? createElement('div', { role: 'alert' }, execution.safeError.message) : null,
          canContinue ? createElement('button', {
            type: 'button', onClick: () => onContinue(execution.executionId),
            'data-testid': 'oasis-professional-continue',
          }, '继续按原请求 key 对账') : null,
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
