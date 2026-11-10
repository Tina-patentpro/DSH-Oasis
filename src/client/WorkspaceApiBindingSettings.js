import { createElement, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { createWorkspaceApiBindingController } from './workspace-api-binding-controller.js'
import { resolveWorkspaceId } from './project-resolution.js'

export function WorkspaceApiBindingSettings({ remote, coordinator, configuration }) {
  const getWorkspaceId = () => {
    const context = coordinator.getSnapshot().workspaceContext
    return context?.status === 'ready' ? resolveWorkspaceId(context.currentSessionId, context.workspaceItems) : null
  }
  const binding = useMemo(() => createWorkspaceApiBindingController({ remote, getWorkspaceId,
    getConfiguration: configuration.getSnapshot }), [remote, coordinator, configuration])
  const snapshot = useSyncExternalStore(binding.subscribe, binding.getSnapshot, binding.getSnapshot)
  useSyncExternalStore(coordinator.subscribe, coordinator.getSnapshot, coordinator.getSnapshot)
  const config = useSyncExternalStore(configuration.subscribe, configuration.getSnapshot, configuration.getSnapshot)
  const workspaceId = getWorkspaceId()
  const [confirmed, setConfirmed] = useState(false)
  useEffect(() => { binding.invalidate(); setConfirmed(false) }, [binding, workspaceId, config])
  useEffect(() => { setConfirmed(false) }, [snapshot.options, snapshot.detail, snapshot.folderId])
  const action = operation => { void Promise.resolve().then(operation).catch(() => {}) }
  const disabled = snapshot.busy || !workspaceId || !config.canSubmit
  return createElement('section', { 'aria-label': '当前项目 API 绑定', style: { display: 'grid', gap: 8, overflowWrap: 'anywhere' } },
    createElement('h3', null, '当前项目 API 绑定'),
    createElement('small', null, workspaceId ? `当前 DSH 项目：${workspaceId}` : '请先在 DSH 选择一个已关联的项目会话。'),
    createElement('button', { type: 'button', disabled, onClick: () => action(() => binding.read()) }, '读取账户、服务与目录（不上传材料）'),
    snapshot.options ? createElement('div', { style: { display: 'grid', gap: 8 } },
      createElement('div', null, `绿洲账户 ${snapshot.options.accountId}`),
      createElement('small', null, snapshot.options.workspacePath),
      createElement('label', null, '专业服务', createElement('select', { value: snapshot.endpoint, disabled,
        onChange: e => { const value = e.currentTarget.value; action(() => binding.selectService(value)) } },
        createElement('option', { value: '', disabled: true }, '请选择服务'),
        ...snapshot.options.services.map(s => createElement('option', { key: s.apiEndpoint, value: s.apiEndpoint }, `${s.apiEndpoint} (${s.apiId})`)))),
      createElement('label', null, '后台项目目录', createElement('select', { value: snapshot.folderId, disabled,
        onChange: e => { const value = e.currentTarget.value; action(() => binding.selectFolder(value)) } },
        createElement('option', { value: '', disabled: true }, '请选择目录'),
        ...snapshot.options.folders.map(f => createElement('option', { key: f.id, value: String(f.id) }, `${f.name} (${f.id})`)))),
      snapshot.detail ? createElement('small', null, `服务/映射指纹：${snapshot.detail.schemaHash}`) : null,
      createElement('label', null, createElement('input', { type: 'checkbox', checked: confirmed, disabled,
        onChange: e => setConfirmed(e.target.checked) }), '确认将当前项目绑定到上述账户、服务和目录；同名不代表同一项目。'),
      createElement('button', { type: 'button', disabled: disabled || !config.settingsWritable || !snapshot.detail || snapshot.folderId === '' || !confirmed,
        onClick: () => { setConfirmed(false); action(() => binding.confirm(true)) } }, '保存项目绑定')) : null,
    snapshot.error ? createElement('p', { role: 'alert' }, snapshot.error) : null,
    snapshot.notice ? createElement('p', { role: 'status' }, snapshot.notice) : null)
}
