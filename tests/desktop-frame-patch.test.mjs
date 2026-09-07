import test from 'node:test'
import assert from 'node:assert/strict'
import { patchDesktopFrame } from '../patches/desktop-2.0.5/frame-layer.mjs'

const body = 'body:is([data-dsh-desktop-mode="compatibility"], [data-dsh-desktop-mode="extended"])'
const root = `${body} #root {\n  box-sizing: border-box;\n  position: fixed;\n  top: 36px;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  width: auto;\n  height: auto;\n  padding-top: 0;\n  overflow: hidden;\n  transform: translateZ(0);\n}`
const isolation = `${body}\n  [data-dsh-desktop-content-viewport],\n${body}\n  [data-dsh-desktop-frame="titlebar"] {\n  isolation: isolate;\n}`

test('Desktop frame leaves the native modal stack shared with body panels, without altering chrome', () => {
  const css = `before\n${root}\n${body} [data-shell-overlay] { transform: translateZ(0); }\n${isolation}\nafter`
  const result = patchDesktopFrame(css)
  assert.match(result, /#root \{[^}]*position: absolute;[^}]*transform: none;/)
  assert.ok(!result.includes('[data-dsh-desktop-content-viewport]'))
  assert.ok(result.includes('[data-dsh-desktop-frame="titlebar"] {\n  isolation: isolate;'))
  assert.ok(result.includes('[data-shell-overlay] { transform: translateZ(0); }'))
  assert.equal(result.split('\n').length, css.split('\n').length, 'preserve generated line positions')
  assert.ok(result.startsWith('before\n') && result.endsWith('\nafter'))
})

test('changed, duplicate, or already patched upstream is rejected rather than approximately modified', () => {
  assert.throws(() => patchDesktopFrame(root), /upstream/)
  assert.throws(() => patchDesktopFrame(`${root}\n${root}\n${isolation}`), /upstream/)
  assert.throws(() => patchDesktopFrame(`${root.replace('top: 36px', 'top: 40px')}\n${isolation}`), /upstream/)
  assert.throws(() => patchDesktopFrame(patchDesktopFrame(`${root}\n${isolation}`)), /upstream/)
})

test('source-map input preserves the upstream frame-height variable', () => {
  const css = `${root.replace('36px', '${DESKTOP_FRAME_HEIGHT}px')}\n${isolation}`
  const result = patchDesktopFrame(css, { source: true })
  assert.ok(result.includes('top: ${DESKTOP_FRAME_HEIGHT}px;'))
  assert.match(result, /position: absolute;/)
})
