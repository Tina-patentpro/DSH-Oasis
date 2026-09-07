import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import * as patch from '../patches/dsh-0.1.2-rc.1/markdown-resources.mjs'

const source = await readFile('C:/Users/TinaD/AppData/Local/Programs/DSH Desktop/resources/app.asar.unpacked/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/index-Df-65__b.js', 'utf8')
test('shipped web bundle implements the same explicit native image policy', () => {
  assert.equal(typeof patch.patchMarkdownWebBundle, 'function')
  const result = patch.patchMarkdownWebBundle(source)
  const imageFunction = result.slice(result.indexOf('function tc('), result.indexOf('function nc('))
  const renderImage = runInNewContext(imageFunction + ';tc', {
    yp: value => value, Ku: value => value, Wl: value => value,
    w1: { imageAlt: 'alt', image: 'image' }, d: { jsx: (tag, props) => ({tag, props}) },
  })
  assert.equal(renderImage('https://example.invalid/image', 'alternative', 1, false).tag, 'span')
  assert.equal(renderImage('https://example.invalid/image', 'alternative', 1).tag, 'img')
  assert.ok(result.includes('tc(n.url,n.alt??"",i,o.allowRemoteImages)'))
  assert.ok(result.includes('tc(l.url,n.alt??"",i,o.allowRemoteImages)'))
  assert.ok(result.includes('allowRemoteImages:oasisAllowImages'))
  assert.ok(result.includes('ic.resourcePolicyVersion=1;'))
  assert.throws(() => patch.patchMarkdownWebBundle(result), /mismatch/)
  assert.throws(() => patch.patchMarkdownWebBundle('unknown build'), /mismatch/)
})
