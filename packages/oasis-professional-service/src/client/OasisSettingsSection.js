import { createElement } from 'react'

import { OasisConnectionSettings } from './OasisConnectionSettings.js'

export function OasisSettingsSection({ controller }) {
  return createElement('section', {
    'data-testid': 'oasis-settings-section',
    'aria-label': '绿洲工作台设置',
    style: { display: 'grid', gap: 12, minWidth: 0 },
  },
  createElement('h2', { style: { margin: 0, fontSize: 18 } }, '绿洲工作台'),
  createElement(OasisConnectionSettings, {
    controller,
    surface: 'settings',
    visible: true,
  }))
}
