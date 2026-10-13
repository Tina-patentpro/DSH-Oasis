import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
const patchedMode = false
const { patchMarkdownResources, patchMarkdownWebBundle } = patchedMode
  ? await import('../../../patches/dsh-0.2.0-rc.2/markdown-resources.mjs')
  : { patchMarkdownResources: value => value, patchMarkdownWebBundle: value => value }
const upstream = readFileSync(new URL(process.env.OASIS_MAC_UNPATCHED === '1' ? 'file:///Users/tinadong7036/Applications/DSH%20Desktop.app/Contents/Resources/app/node_modules/@deepseek-ai/dsh-client-ui-primitives/lib/index.js' : '../.dsh-test/mac-dev/packages/dsh-client-ui-primitives/lib/index.js', import.meta.url), 'utf8')
const source = patchMarkdownResources(upstream)
const section = (start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a)
  assert.ok(a >= 0 && b > a, 'Pinned function boundary missing')
  return source.slice(a, b)
}
const jsx = (tag, props, key) => ({ tag, props, key })
const renderImageSource = section('function renderImage(', 'function MarkdownImage(')
const renderReferenceSource = section('function renderImageReference(', 'function renderFootnoteReference(')

test('actual inline/reference image functions block image resolution in safe mode', () => {
  let resolutions = 0
  const api = runInNewContext(renderImageSource + renderReferenceSource + ';({renderImage,renderImageReference})', {
    jsx, markdownCss: { imageAlt: 'alt' }, MarkdownImage: 'MarkdownImage',
    imageSource(url) { resolutions += 1; return url },
  })
  for (const streaming of [false, true]) {
    const context = { streaming, allowRemoteImages: false,
      targets: { definitions: new Map([['ASSET', { url: 'https://example.invalid/reference.png' }]]) } }
    for (const url of ['https://example.invalid/image.png', './local.png', 'file:///C:/private.png']) {
      assert.equal(api.renderImage(url, 'alternative', 'image', context).tag, 'span')
    }
    assert.equal(api.renderImageReference({ identifier: 'asset', alt: 'ref' }, 'reference', context).tag, 'span')
  }
  assert.equal(resolutions, 0, 'Neither remote nor local resolver may run')
})

test('ordinary image callers keep their original resolution path', () => {
  const render = runInNewContext(renderImageSource + ';renderImage', {
    jsx, markdownCss: {}, MarkdownImage: 'MarkdownImage', imageSource: url => url,
  })
  assert.equal(render('https://example.invalid/image.png', 'alt', 'key', {}).tag, 'MarkdownImage')
})

test('actual settled renderer carries the policy into all block and footnote contexts', () => {
  const contexts = []
  const renderSettled = runInNewContext(section('function renderSettled(', '/**\n* Streaming render state') + ';renderSettled', {
    parseGfmWithMath: () => ({ children: [] }), createReferenceTargets: () => ({}), collectReferenceTargets() {},
    renderBlocks(nodes, context) { contexts.push(context); return [] }, wrapBlockChildren: values => values,
    renderFootnoteSection(context) { contexts.push(context); return null },
  })
  renderSettled('text', {}, undefined, { resolve() { throw Error('Resolver must not run') } }, false)
  assert.equal(contexts.length, 2)
  assert.ok(contexts.every(context => context.allowRemoteImages === false))
})

test('actual component drops streaming cache in safe mode and exposes the capability', () => {
  const refs = [{ current: null }, { current: null }]
  let index = 0, settled = 0, streamed = 0, receivedPolicy
  const component = runInNewContext(section('const MarkdownText = memo(', '//#endregion\n//#region lib/types/WebBlock.js') + ';MarkdownText', {
    clsx: () => '', memo: value => value, useRef: () => refs[index++], useMemo: fn => fn(), jsx, markdownCss: {},
    renderSettled(text, labels, mentions, images, policy) { settled += 1; receivedPolicy = policy; return [] },
    StreamingRenderer: class { render() { streamed += 1; return [] } },
  })
  const render = props => { index = 0; component({ text: 'text', labels: {}, ...props }) }
  render({ streaming: true })
  assert.equal(streamed, 1)
  render({ streaming: true, allowRemoteImages: false })
  assert.equal(settled, 1)
  assert.equal(receivedPolicy, false)
  assert.equal(refs[0].current, null)
  assert.equal(component.resourcePolicyVersion, 1)
  assert.match(source, /pathImages,\s*allowRemoteImages\s*\]/)
})

test('patch rejects unknown or already-patched upstream bytes', { skip: !patchedMode }, () => {
  assert.throws(() => patchMarkdownResources('unknown upstream'), /mismatch/)
  assert.throws(() => patchMarkdownResources(patchMarkdownResources(upstream)), /mismatch/)
})
