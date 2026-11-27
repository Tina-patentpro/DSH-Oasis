import { createElement as h, useEffect, useRef, useState, useSyncExternalStore } from 'react'

export function OasisAccountSettings({ controller }) {
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const [mode, setMode] = useState('sms')
  const [remaining, setRemaining] = useState(snapshot.retryAfterSeconds ?? 0)
  const phone = useRef(null), secret = useRef(null)
  const disabled = !snapshot.connected || !snapshot.credentialWritable || snapshot.busy
  const clear = () => { if (secret.current) secret.current.value = '' }
  useEffect(() => {
    setRemaining(snapshot.retryAfterSeconds ?? 0)
    const timer = setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000)
    return () => clearInterval(timer)
  }, [snapshot.retryAfterSeconds])
  useEffect(() => {
    const input = secret.current
    if (!snapshot.connected && input) input.value = ''
    return () => { if (input) input.value = '' }
  }, [snapshot.connected, controller])
  return h('section', { 'aria-label': '绿洲账户', style: { display: 'grid', gap: 10 } },
    h('h3', null, '绿洲账户'),
    h('p', null, '专业 API 使用网站账户登录；本地 Skills 不需要登录。服务地址随版本维护，无需配置。'),
    !snapshot.connected || snapshot.credentialStatus !== 'ready' ? h('p', { role: 'status' }, '登录服务尚未就绪，请检查本机 Host 连接或刷新状态。')
      : !snapshot.credentialWritable ? h('p', { role: 'status' }, '当前模式未开放账户登录或凭据不可写；本地 Skills 不受影响。') : null,
    snapshot.credentialConfigured ? h('div', null,
      h('p', { role: 'status' }, `已登录 · 账户 ${snapshot.accountId}`),
      h('button', { type: 'button', disabled: snapshot.busy, onClick: () => { clear(); void controller.logout() } }, '退出本插件账户')) :
      h('form', { onSubmit: event => {
        event.preventDefault()
        const payload = { mode, phone: phone.current?.value.trim() ?? '', confirmed: true, [mode === 'sms' ? 'code' : 'password']: secret.current?.value ?? '' }
        clear(); void controller.login(payload)
      }, style: { display: 'grid', gap: 10 } },
      h('label', null, '登录方式 ', h('select', { value: mode, disabled, onChange: event => { clear(); setMode(event.target.value) } },
        h('option', { value: 'sms' }, '手机验证码'), h('option', { value: 'password' }, '手机号与密码'))),
      h('label', null, '手机号 ', h('input', { ref: phone, type: 'tel', autoComplete: 'username', required: true, pattern: '1[3-9][0-9]{9}', maxLength: 11, disabled })),
      mode === 'sms' ? h('button', { type: 'button', disabled: disabled || remaining > 0, onClick: () => { void controller.sendSms({ phone: phone.current?.value.trim() ?? '', confirmed: true }) } }, remaining > 0 ? `${remaining} 秒后可重新发送` : '发送验证码') : null,
      h('label', null, mode === 'sms' ? '验证码 ' : '密码 ', h('input', { key: mode, ref: secret, type: mode === 'sms' ? 'text' : 'password', required: true,
        autoComplete: mode === 'sms' ? 'one-time-code' : 'current-password', maxLength: mode === 'sms' ? 8 : 256, disabled })),
      h('small', null, '点击发送或登录，仅将对应登录信息发送到绿洲网站服务；不上传项目材料、不生成内容。'),
      h('button', { type: 'submit', disabled }, '登录')),
    h('button', { type: 'button', disabled: !snapshot.connected || snapshot.busy, onClick: () => { clear(); void controller.refresh() } }, '刷新登录状态'),
    snapshot.error ? h('div', { role: 'alert' }, snapshot.error) : null,
    snapshot.notice ? h('div', { role: 'status' }, snapshot.notice) : null)
}
