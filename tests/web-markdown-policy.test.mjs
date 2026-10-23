import assert from 'node:assert/strict'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import * as patch from '../patches/dsh-0.2.0-rc.2/markdown-resources.mjs'
import { readMacComponentInput } from './helpers/mac-component-inputs.mjs'

const { source } = readMacComponentInput('web')
test('shipped web bundle implements the same explicit native image policy', () => {
  assert.equal(typeof patch.patchMarkdownWebBundle, 'function')
  const start = source.indexOf('function P8('), end = source.indexOf('function zb(', start)
  assert.ok(start >= 0 && end > start, 'Fixed frontend image function boundary missing')
  const renderImage = runInNewContext(source.slice(start, end) + ';P8', {
    dt: { imageAlt: 'alt' }, zb: 'MarkdownImage', l: { jsx: (tag, props) => ({tag, props}) },
  })
  assert.equal(renderImage('https://example.invalid/image', 'alternative', 1, { allowRemoteImages: false }).tag, 'span')
  assert.equal(renderImage('https://example.invalid/image', 'alternative', 1, {}).tag, 'MarkdownImage')
  const refStart = source.indexOf('function Hb('), refEnd = source.indexOf('function Vb(', refStart)
  assert.ok(refStart >= 0 && refEnd > refStart, 'Fixed reference-image boundary missing')
  const renderReference = runInNewContext(source.slice(refStart, refEnd) + ';Hb', { P8: renderImage })
  const reference = { identifier: 'asset', alt: 'reference' }
  const targets = { definitions: new Map([['ASSET', { url: 'https://example.invalid/reference' }]]) }
  assert.equal(renderReference(reference, 1, { targets, allowRemoteImages: false }).tag, 'span')
  assert.equal(renderReference(reference, 1, { targets }).tag, 'MarkdownImage')
  assert.ok(source.includes('allowRemoteImages:oasisAllowImages'))
  assert.ok(source.includes('z8.resourcePolicyVersion=1;'))
  assert.throws(() => patch.patchMarkdownWebBundle(source), /mismatch/)
  assert.throws(() => patch.patchMarkdownWebBundle('unknown build'), /mismatch/)
})

test('fixed frontend safe streaming clears cached streaming output and passes the settled policy', () => {
  const start = source.indexOf('const z8=j.memo(')
  const end = source.indexOf('});z8.resourcePolicyVersion=1;', start) + '});z8.resourcePolicyVersion=1;'.length
  assert.ok(start >= 0 && end > start, 'Fixed frontend component boundary missing')
  const refs = [{ current: null }, { current: null }]
  let index = 0, streamed = 0, settled = 0, policy
  const component = runInNewContext(source.slice(start, end) + ';z8', {
    ue: () => '', dt: {}, l: { jsx: (tag, props) => ({ tag, props }) },
    j: { memo: fn => fn, useRef: () => refs[index++], useMemo: fn => fn() },
    Bb: class { render() { streamed++; return [] } },
    $b(text, labels, mentions, images, flag) { settled++; policy = flag; return [] },
  })
  component({ text: 'text', streaming: true, labels: {} })
  index = 0
  component({ text: 'text', streaming: true, labels: {}, allowRemoteImages: false })
  assert.equal(streamed, 1)
  assert.equal(settled, 1)
  assert.equal(policy, false)
  assert.equal(refs[0].current, null)
  assert.equal(component.resourcePolicyVersion, 1)
})

test('fixed frontend settled context carries safe policy through blocks and footnotes', () => {
  const start = source.indexOf('function $b('), end = source.indexOf('var Bb=class', start)
  assert.ok(start >= 0 && end > start, 'Fixed frontend settled boundary missing')
  const contexts = []
  const fn = source.slice(start, end)
  const render = runInNewContext(fn + ';$b', {
    yb: () => ({ children: [] }), gc: () => ({}), rs() {},
    vc(nodes, context) { contexts.push(context); return [] }, Wc: children => children,
    A8(context) { contexts.push(context); return null },
  })
  render('text', {}, undefined, undefined, false)
  assert.equal(contexts.length, 2)
  assert.ok(contexts.every(context => context.allowRemoteImages === false))
})
