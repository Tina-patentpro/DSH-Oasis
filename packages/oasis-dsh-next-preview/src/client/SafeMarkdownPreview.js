import { createElement } from 'react'

const labels = Object.freeze({ code: Object.freeze({ copyLabel: '复制', copiedLabel: '已复制' }), footnotes: '注释' })

export function SafeMarkdownPreview({ text, markdownRenderer: Renderer, style }) {
  const capable = Renderer?.resourcePolicyVersion === 1
  return createElement('div', { tabIndex: 0, style: { minWidth: 0, overflowWrap: 'anywhere', ...style },
    'data-oasis-preview': capable ? 'native-safe' : 'plain-text' },
  capable ? createElement(Renderer, { text, labels, streaming: false, allowRemoteImages: false })
    : createElement('pre', { style: { margin: 0, whiteSpace: 'pre-wrap', font: 'inherit' } }, text))
}
