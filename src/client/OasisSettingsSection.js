import { createElement, useId, useSyncExternalStore } from 'react'

import { DEFAULT_LOCAL_SKILL_SUITE, LOCAL_SKILL_SUITES } from '../local-skill-suites.js'
import { OasisAccountSettings } from './OasisAccountSettings.js'

function SkillSuiteSettings({ controller }) {
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const id = useId()
  const suite = snapshot.localSkillSuite ?? DEFAULT_LOCAL_SKILL_SUITE
  const disabled = !snapshot.settingsWritable || snapshot.savingLocalSkillSuite
    || snapshot.nativeZeroGeneration || snapshot.nativeBusinessRecovery
  return createElement('div', { style: { display: 'grid', gap: 6, justifyItems: 'start' } },
    createElement('label', { htmlFor: id }, '本地 Skills 套件'),
    createElement('select', {
      id, value: suite, disabled, 'aria-describedby': id + '-help',
      onChange: event => { void controller.saveLocalSkillSuite(event.currentTarget.value) },
    }, ...Object.entries(LOCAL_SKILL_SUITES).map(([value, item]) =>
      createElement('option', { key: value, value }, item.label))),
    createElement('small', { id: id + '-help' }, suite === DEFAULT_LOCAL_SKILL_SUITE
      ? '适用于此 DSH 配置下后续发起的本地生成。'
      : '支持权利要求初稿。请在任务中选择本地 Skills，再核对模型与材料。'),
    createElement('a', { href: LOCAL_SKILL_SUITES[suite].repository, target: '_blank', rel: 'noopener noreferrer' }, '查看 GitHub 仓库'),
    snapshot.savingLocalSkillSuite ? createElement('small', { role: 'status' }, '正在保存…') : null,
    snapshot.localSkillSuiteError ? createElement('small', { role: 'alert' }, snapshot.localSkillSuiteError) : null,
  )
}

function GenerationGuidance() {
  return createElement('div', { style: { display: 'grid', gap: 10 } },
    createElement('small', null, '新任务默认使用本地 Skills，通过 DSH 当前会话所选模型生成；如需专业 API，可在任务中切换并登录绿洲账户。'),
    createElement('small', null, '两种方式的结果均保存到当前 DSH 项目目录，使用 DSH 文件管理查看和编辑。Skills 生成的文件名不加来源标记，专业 API 文件名在扩展名前添加 _OIW。'),
    createElement('small', null, '使用云端模型或专业 API 时，相关材料会发送至对应服务，可能产生费用；生成前会提示并由你确认。'))
}

export function OasisSettingsSection({ controller }) {
  return createElement('section', {
    'data-testid': 'oasis-settings-section',
    'aria-label': '绿洲工作台设置',
    style: { display: 'grid', gap: 12, minWidth: 0 },
  },
  createElement('h2', { style: { margin: 0, fontSize: 18 } }, '绿洲工作台'),
  controller ? createElement(SkillSuiteSettings, { controller }) : null,
  createElement(GenerationGuidance),
  controller ? createElement(OasisAccountSettings, { controller }) : null,
  )
}
