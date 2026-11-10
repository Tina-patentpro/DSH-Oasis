import { createElement, useEffect, useRef, useState, useSyncExternalStore } from 'react'

const unavailable = Object.freeze({ connected: false, settingsWritable: false, credentialWritable: false, apiBaseUrl: '', downloadOrigins: [] })
const noSubscribe = () => () => {}
const getUnavailable = () => unavailable
const fieldStyle = { display: 'grid', gap: 4, fontSize: 12 }
const inputStyle = { width: '100%', boxSizing: 'border-box', font: 'inherit', padding: 6 }

export function ConnectionSettingsForm({
  snapshot, controller, apiDraft = '', downloadDraft = '', passwordRef,
  surface = 'workbench',
  onApiDraft = () => {}, onDownloadDraft = () => {},
}) {
  const disabledSettings = !snapshot.settingsWritable || snapshot.busy
  const disabledCredential = !snapshot.credentialWritable || !snapshot.settingsWritable
    || snapshot.settingsStatus !== 'ready' || snapshot.apiBaseUrl === '' || snapshot.busy
  const clearPassword = () => { if (passwordRef.current) passwordRef.current.value = '' }
  return createElement('details', {
    'data-testid': 'oasis-connection-settings',
    style: surface === 'settings'
      ? { width: '100%', boxSizing: 'border-box' }
      : { flexShrink: 0, maxHeight: '50%', overflowY: 'auto', padding: '10px 14px', borderBottom: '1px solid #dedee1' },
    onToggle: (event) => { if (!event.currentTarget.open) clearPassword() },
  },
  createElement('summary', { style: { cursor: 'pointer', fontSize: 13 } }, '专业服务连接配置'),
  createElement('div', { style: { display: 'grid', gap: 8, paddingTop: 10 } },
    createElement('p', { role: 'status', style: { margin: 0, fontSize: 12 } },
      !snapshot.connected ? '尚未连接可配置的本机 Host；本地工作流仍可使用。'
        : snapshot.settingsStatus !== 'ready' ? '公共配置服务不可用或配置引用不匹配；本地工作流仍可使用。'
          : `环境：${snapshot.environmentKind === 'production' ? '线上服务' : '非生产'}；普通设置和凭据分别保存。`),
    createElement('label', { style: fieldStyle }, '服务环境', createElement('select', {
      'aria-label': '服务环境', value: snapshot.environmentKind ?? 'non-production', disabled: disabledSettings,
      onChange: event => { clearPassword(); void controller.saveEnvironmentKind(event.currentTarget.value) },
    }, createElement('option', { value: 'non-production' }, '非生产'), createElement('option', { value: 'production' }, '线上服务'))),
    createElement('small', null, '切换环境会清空地址和下载来源并解除凭据绑定；不会自动上传或生成。'),
    createElement('label', { style: fieldStyle }, 'API origin', createElement('input', {
      value: apiDraft, disabled: disabledSettings, style: inputStyle, autoComplete: 'off',
      placeholder: snapshot.environmentKind === 'production' ? 'https://lzhxpy.oasisintwrite.com' : 'https://非生产服务域名', onChange: (event) => onApiDraft(event.currentTarget.value),
    })),
    createElement('button', { type: 'button', disabled: disabledSettings, onClick: () => { void controller.saveApiBaseUrl(apiDraft) } }, '保存 API 地址'),
    createElement('label', { style: fieldStyle }, '允许的下载 origin（可空，每行一个）', createElement('textarea', {
      value: downloadDraft, rows: 2, disabled: disabledSettings, style: inputStyle,
      onChange: (event) => onDownloadDraft(event.currentTarget.value),
    })),
    createElement('button', { type: 'button', disabled: disabledSettings, onClick: () => { void controller.saveDownloadOrigins(downloadDraft) } }, '保存下载来源'),
    createElement('p', { style: { margin: 0, fontSize: 12 } }, '保存设置后需手工重启 Host 并刷新页面；空 API 地址表示禁用远程服务。'),
    createElement('label', { style: fieldStyle }, 'JWT · OASIS_USER_JWT', createElement('input', {
      ref: passwordRef, type: 'password', disabled: disabledCredential, style: inputStyle,
      autoComplete: 'new-password', spellCheck: false, placeholder: '留空不更改已有凭据',
    })),
    createElement('div', { role: 'status', style: { fontSize: 12 } },
      snapshot.credentialStatus !== 'ready' ? '凭据状态尚未确认。'
        : snapshot.credentialConfigured ? '凭据已绑定当前 API 地址（不读取或显示原值）。'
          : snapshot.credentialStored
            ? '凭据已保存，但未绑定当前 API 地址；请重新输入凭据以激活。'
            : '尚未配置凭据。'),
    createElement('button', {
      type: 'button', disabled: disabledCredential, 'data-testid': 'oasis-credential-save',
      onClick: () => {
        const value = passwordRef.current?.value ?? ''
        clearPassword()
        void controller.updateCredential(value)
      },
    }, '更新凭据'),
    createElement('button', {
      type: 'button', disabled: !snapshot.connected || snapshot.busy,
      onClick: () => { void controller.refresh() },
    }, '刷新配置与目录状态'),
    snapshot.restartRequired ? createElement('div', { role: 'status' }, '设置尚待重启生效；已暂停新业务提交，请重启 Host 并刷新页面。') : null,
    snapshot.notice ? createElement('div', { role: 'status' }, snapshot.notice) : null,
    snapshot.error ? createElement('div', { role: 'alert' }, snapshot.error) : null))
}

export function OasisConnectionSettings({ controller, visible = true, surface = 'workbench' }) {
  const snapshot = useSyncExternalStore(controller?.subscribe ?? noSubscribe, controller?.getSnapshot ?? getUnavailable, controller?.getSnapshot ?? getUnavailable)
  const [apiDraft, setApiDraft] = useState(snapshot.apiBaseUrl)
  const [downloadDraft, setDownloadDraft] = useState(snapshot.downloadOrigins.join('\n'))
  const passwordRef = useRef(null)
  useEffect(() => { setApiDraft(snapshot.apiBaseUrl) }, [snapshot.apiBaseUrl])
  const originsText = snapshot.downloadOrigins.join('\n')
  useEffect(() => { setDownloadDraft(originsText) }, [originsText])
  useEffect(() => {
    const input = passwordRef.current
    if (!visible || !snapshot.connected || !snapshot.credentialWritable) { if (input) input.value = '' }
    return () => { if (input) input.value = '' }
  }, [visible, snapshot.connected, snapshot.credentialWritable, controller])
  if (!visible) return null
  return createElement(ConnectionSettingsForm, {
    snapshot, controller, apiDraft, downloadDraft, passwordRef, surface,
    onApiDraft: setApiDraft, onDownloadDraft: setDownloadDraft,
  })
}
