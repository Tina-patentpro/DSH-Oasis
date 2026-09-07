// Exercise the actual fixed-version native renderer, not a replacement renderer.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerHooks, createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const app = resolve('.dsh-test/stage3-desktop-app/resources/app.asar.unpacked')
const require = createRequire(pathToFileURL(`${app}/package.json`))
registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', source: 'export default {}', shortCircuit: true }
  return nextLoad(url, context)
} })
const { createElement } = await import(pathToFileURL(require.resolve('react')))
const { renderToStaticMarkup } = await import(pathToFileURL(require.resolve('react-dom/server')))
const { MarkdownText } = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-client-ui-primitives')))
const labels = { code: { copyLabel: 'Copy', copiedLabel: 'Copied' }, footnotes: 'Notes' }
const render = (text, props = {}) => renderToStaticMarkup(createElement(MarkdownText, { text, labels, ...props }))

test('safe native preview suppresses inline and reference images, including streaming input', () => {
  const text = '![inline](https://example.invalid/a.png)\n\n![reference][asset]\n\n[asset]: https://example.invalid/b.png'
  for (const streaming of [false, true]) {
    const html = render(text, { allowRemoteImages: false, streaming })
    assert.doesNotMatch(html, /<img\b|\bsrc=|<link\b/)
    assert.match(html, /inline/)
    assert.match(html, /reference/)
  }
})

test('native rich text survives safe mode and untrusted HTML is inert', () => {
  // TeX needs the real browser DOMParser and is checked in Desktop acceptance.
  const html = render('# Heading\n\n**Strong**\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n<img src="https://example.invalid/html.png" onerror="alert(1)">\n\n<script>alert(1)</script>', { allowRemoteImages: false })
  assert.match(html, /<h1[^>]*>Heading/)
  assert.match(html, /<strong>Strong/)
  assert.match(html, /<table/)
  assert.doesNotMatch(html, /<img\b|<script\b|<iframe\b/)
})

test('ordinary native callers retain image support and safe capability is explicit', () => {
  assert.match(render('![original](https://example.invalid/original.png)'), /<img\b/)
  assert.equal(MarkdownText.resourcePolicyVersion, 1)
})
