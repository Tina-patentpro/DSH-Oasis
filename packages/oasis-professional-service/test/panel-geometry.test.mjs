import assert from 'node:assert/strict'
import test from 'node:test'

import { calculatePanelGeometry } from '../src/client/panel-geometry.js'

const regions = {
  frame: { left: 0, right: 1440 },
  sidebar: { left: 0, right: 280 },
  details: { left: 1080, right: 1440 },
}

test('normal geometry uses a fixed right rail without opening the DSH details modal', () => {
  assert.deepEqual(calculatePanelGeometry('normal', { ...regions, details: null }), { left: 1080, width: 360 })
})

test('expanded geometry starts after the rendered sidebar', () => {
  assert.deepEqual(calculatePanelGeometry('expanded', regions), { left: 280, width: 1160 })
})

test('hidden geometry has no panel rectangle', () => {
  assert.equal(calculatePanelGeometry('hidden', regions), null)
})
