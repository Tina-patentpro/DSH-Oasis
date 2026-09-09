import { createElement, useEffect, useState, useSyncExternalStore } from 'react'

import { OasisConnectionSettings } from './OasisConnectionSettings.js'

const empty = Object.freeze({ settingsWritable: false, defaultGenerationSource: 'local-skill', outputDirectoryPrefix: '' })
const noSubscribe = () => () => {}
const getEmpty = () => empty

function NewTaskPreferences({ controller }) {
  const snapshot = useSyncExternalStore(controller?.subscribe ?? noSubscribe, controller?.getSnapshot ?? getEmpty, controller?.getSnapshot ?? getEmpty)
  const [prefix, setPrefix] = useState(snapshot.outputDirectoryPrefix ?? '')
  useEffect(() => { setPrefix(snapshot.outputDirectoryPrefix ?? '') }, [snapshot.outputDirectoryPrefix])
  const disabled = !snapshot.settingsWritable || snapshot.busy
  return createElement('div', { style: { display: 'grid', gap: 10 } },
    createElement('label', null, '默认生成来源', createElement('select', { 'aria-label': '默认生成来源',
      value: snapshot.defaultGenerationSource ?? 'local-skill', disabled,
      onChange: event => { void controller.savePreference('defaultGenerationSource', event.currentTarget.value) },
      style: { display: 'block', padding: 8, marginTop: 5 } },
      createElement('option', { value: 'local-skill' }, '本地 Skills'), createElement('option', { value: 'oasis-api' }, '专业 API'))),
    createElement('label', null, '保存目录前缀', createElement('input', { 'aria-label': '保存目录前缀', value: prefix, disabled, maxLength: 200,
      placeholder: '项目内相对目录（可空）', onChange: event => setPrefix(event.currentTarget.value),
      style: { display: 'block', boxSizing: 'border-box', width: '100%', padding: 8, marginTop: 5 } })),
    createElement('button', { type: 'button', disabled, onClick: () => { void controller.savePreference('outputDirectoryPrefix', prefix) } }, '保存目录偏好'),
    createElement('small', null, '仅用于新任务；保存文件仍需逐次确认。'),
    createElement('label', null, createElement('input', { type: 'checkbox', 'aria-label': '启用本地 Skills 真实模型生成',
      checked: snapshot.localModelEnabled === true, disabled,
      onChange: event => { void controller.saveLocalModelEnabled(event.currentTarget.checked) } }), '启用本地 Skills 真实模型生成'),
    createElement('small', null, '重启 Host 后生效；使用 DSH 当前会话模型。云端模型会接收材料和内置 Skill，可能产生费用，每次生成前确认。'),
    snapshot.error ? createElement('div', { role: 'alert' }, snapshot.error) : null,
    snapshot.notice ? createElement('div', { role: 'status' }, snapshot.notice) : null)
}

export function OasisSettingsSection({ controller }) {
  return createElement('section', {
    'data-testid': 'oasis-settings-section',
    'aria-label': '绿洲工作台设置',
    style: { display: 'grid', gap: 12, minWidth: 0 },
  },
  createElement('h2', { style: { margin: 0, fontSize: 18 } }, '绿洲工作台'),
  createElement(NewTaskPreferences, { controller }),
  createElement(OasisConnectionSettings, {
    controller,
    surface: 'settings',
    visible: true,
  }))
}
