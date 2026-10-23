// Exercise the actual fixed-version native renderer, not a replacement renderer.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerHooks, createRequire } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { realpathSync } from 'node:fs'
import { sep } from 'node:path'
import { readMacComponentInput, nativeMarkdownTestPackage } from './helpers/mac-component-inputs.mjs'

const component = readMacComponentInput('native')
const runtime = nativeMarkdownTestPackage()
const require = createRequire(runtime.packageFile)
const componentPrefix = pathToFileURL(component.packageRoot + sep).href
registerHooks({ resolve(specifier, context, nextResolve) {
  if (context.parentURL?.startsWith(componentPrefix) && !specifier.startsWith('.') && !specifier.startsWith('node:')) {
    const resolved = nextResolve(specifier, { ...context, parentURL: pathToFileURL(runtime.packageFile).href })
    const file = realpathSync(fileURLToPath(resolved.url))
    assert.ok(file.startsWith(runtime.source + sep), 'Native test dependency escaped its frozen fixture')
    return resolved
  }
  return nextResolve(specifier, context)
}, load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', source: 'export default {}', shortCircuit: true }
  return nextLoad(url, context)
} })
const { createElement } = await import(pathToFileURL(require.resolve('react')))
const { renderToStaticMarkup } = await import(pathToFileURL(require.resolve('react-dom/server')))
assert.equal(require('react/package.json').version, '18.3.1')
assert.equal(require('react-dom/package.json').version, '18.3.1')
const { MarkdownText } = await import(pathToFileURL(component.file))
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
