import { createElement } from 'react'

import { OasisAccountSettings } from './OasisAccountSettings.js'
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
  createElement(GenerationGuidance),
  controller ? createElement(OasisAccountSettings, { controller }) : null,
  )
}
