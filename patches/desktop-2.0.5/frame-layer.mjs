// Patch the Desktop-owned frame, never the Oasis plugin or host hash classes.
const body = 'body:is([data-dsh-desktop-mode="compatibility"], [data-dsh-desktop-mode="extended"])'
const root = `${body} #root {\n  box-sizing: border-box;\n  position: fixed;\n  top: 36px;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  width: auto;\n  height: auto;\n  padding-top: 0;\n  overflow: hidden;\n  transform: translateZ(0);\n}`
const isolation = `${body}\n  [data-dsh-desktop-content-viewport],\n${body}\n  [data-dsh-desktop-frame="titlebar"] {\n  isolation: isolate;\n}`

export function patchDesktopFrame(text, { source = false } = {}) {
  const rootRule = source ? root.replace('36px', '${DESKTOP_FRAME_HEIGHT}px') : root
  for (const needle of [rootRule, isolation]) {
    if (text.split(needle).length !== 2) throw new Error('Desktop 2.0.5 upstream frame mismatch')
  }
  return text.replace(rootRule, rootRule.replace('position: fixed;', 'position: absolute;').replace('transform: translateZ(0);', 'transform: none;'))
    .replace(isolation, `/* Native modals share the body stack with sibling plugin panels.\n   Only Desktop chrome, not the content viewport, isolates its stack. */\n${body}\n  [data-dsh-desktop-frame="titlebar"] {\n  isolation: isolate;\n}`)
}
