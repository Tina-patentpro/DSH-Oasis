import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const projectRoot = resolve(packageRoot, '../..')
const skill = readFileSync(resolve(projectRoot, '.dsh/skills/dsh-plugin-development/SKILL.md'), 'utf8')
const contracts = readFileSync(resolve(projectRoot, '.dsh/skills/dsh-plugin-development/references/official-contracts.md'), 'utf8')
const combined = `${skill}\n${contracts}`

test('requires a live whole-tree query followed by exact rooted Slot queries', () => {
  assert.match(combined, /Slots\.listSubTree[^\n]*(?:不带|without)[^\n]*root/i)
  assert.match(combined, /Slots\.listSubTree[^\n]*(?:带|with)[^\n]*root/i)
  assert.match(combined, /purpose[^\n]*kind[^\n]*scope/i)
  assert.match(combined, /current occupants|当前占用者/i)
})

test('forbids guessed options and replacement of DSH structural single slots', () => {
  assert.match(combined, /禁止猜测|do not guess/i)
  for (const slot of ['root', 'sidebar', 'conversation', 'details']) {
    assert.match(combined, new RegExp(`(?:禁止|不得|never)[^\\n]*${slot}`, 'i'))
  }
})

test('records the approved additive entry and overlay decisions', () => {
  assert.match(combined, /conversation\.input\.right[^\n]*(?:list|列表)/i)
  assert.match(combined, /shell\.overlay[^\n]*(?:list|列表|additive|增量)/i)
  assert.match(combined, /details[^\n]*(?:single|单槽)[^\n]*(?:禁止|不得|never)/i)
  assert.match(combined, /(?:禁止|不得|never)[^\n]*openDetails/i)
})
