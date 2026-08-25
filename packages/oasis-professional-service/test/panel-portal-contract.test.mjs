import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { OasisPanelBoundary } from '../src/client/OasisPanelBoundary.js'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

test('the panel uses a React portal while the layout adapter is the only DSH DOM writer', () => {
  const portal = readFileSync(resolve(packageRoot, 'src/client/OasisPanelPortal.js'), 'utf8')
  const adapter = readFileSync(resolve(packageRoot, 'src/client/layout-adapter.js'), 'utf8')
  const clientFiles = [
    'src/client.js',
    'src/client/OasisPanelHost.js',
    'src/client/PanelChrome.js',
    'src/client/WorkbenchEntry.js',
  ].map((path) => readFileSync(resolve(packageRoot, path), 'utf8')).join('\n')

  assert.match(portal, /createPortal/)
  assert.match(adapter, /--oasis-right-rail-width/)
  assert.match(adapter, /data-oasis-layout-owner/)
  assert.doesNotMatch(adapter, /nth-child/)
  assert.doesNotMatch(adapter, /querySelector(?:All)?\([^)]*['"]\.[A-Za-z0-9_-]{6,}/)
  assert.doesNotMatch(clientFiles, /document\.documentElement\.style\.setProperty|data-oasis-layout-owner/)
})

test('the package does not depend on better-sidebar or its excluded workbench stack', () => {
  const manifest = readFileSync(resolve(packageRoot, 'package.json'), 'utf8')
  for (const forbidden of ['dsh-better-sidebar', 'node-pty', '@codemirror', 'xterm']) {
    assert.doesNotMatch(manifest, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
  }
})

test('the React error boundary faults the adapter instead of leaving a pushed layout', () => {
  const reasons = []
  const boundary = new OasisPanelBoundary({
    children: null,
    layoutAdapter: { fault: (reason) => reasons.push(reason) },
  })
  boundary.componentDidCatch(new Error('synthetic render failure'))
  assert.deepEqual(reasons, ['panel-render-error:synthetic render failure'])
})
