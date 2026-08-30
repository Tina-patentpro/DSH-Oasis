import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'

const browserTests = [
  'tests/integration/week1-supplement-browser.test.mjs',
  'tests/integration/week2-persistence-browser.test.mjs',
  'tests/integration/week3-local-loop-browser.test.mjs',
  'tests/integration/week3-better-sidebar-cleanup-browser.test.mjs',
]

test('browser integrations resolve only real executable files', async () => {
  for (const relativePath of browserTests) {
    const source = await readFile(resolve(relativePath), 'utf8')
    assert.match(source, /\brealpath\b/, `${relativePath} must canonicalize the executable path`)
    assert.match(source, /\bstat\b/, `${relativePath} must inspect the executable path`)
    assert.match(source, /\.isFile\(\)/, `${relativePath} must reject directories and broken path aliases`)
    assert.match(source, /return await realpath\(path\)/, `${relativePath} must launch the canonical path`)

    const edgeIndex = source.indexOf('Microsoft\\\\Edge')
    const chromeIndex = source.indexOf('Google/Chrome')
    assert.ok(edgeIndex >= 0 && chromeIndex >= 0 && edgeIndex < chromeIndex,
      `${relativePath} must prefer the system Edge executable before the user Chrome path`)
  }
})
