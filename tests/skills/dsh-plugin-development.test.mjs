import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const skillPath = resolve('.dsh/skills/dsh-plugin-development/SKILL.md')
const referencePath = resolve('.dsh/skills/dsh-plugin-development/references/official-contracts.md')

test('publishes a discoverable DSH plugin development skill', () => {
  assert.equal(existsSync(skillPath), true, 'DSH plugin development skill must exist')
  if (!existsSync(skillPath)) return

  const skill = readFileSync(skillPath, 'utf8')
  assert.match(skill, /^---\r?\nname:\s*dsh-plugin-development\r?\ndescription:\s*Use when /)
  assert.match(skill, /dsh --version/)
  assert.match(skill, /隔离.*DSH_HOME|DSH_HOME.*隔离/)
  assert.match(skill, /Bundle.*Profile|Profile.*Bundle/)
  assert.match(skill, /dsh\.bundle/)
  assert.match(skill, /dsh\.client/)
  assert.match(skill, /lazy-CJS|__ModuleLoader__/)
  assert.match(skill, /lib\/client\.js/)
  assert.match(skill, /不得修改.*现有.*Profile/)
  assert.match(skill, /Dify和收费管理.*既有稳定外部能力/)
})

test('routes unstable API details to an official-contract reference', () => {
  assert.equal(existsSync(referencePath), true, 'official contract reference must exist')
  if (!existsSync(referencePath)) return

  const reference = readFileSync(referencePath, 'utf8')
  assert.match(reference, /github\.com\/deepseek-ai\/deepseek-harness/)
  assert.match(reference, /0\.1\.1-rc\.2/)
  assert.match(reference, /conversation\.input\.right/)
  assert.match(reference, /window\.__ModuleLoader__\.load/)
  assert.match(reference, /\.\/lib\/client\.js/)
  assert.match(reference, /pnpm install/)
  assert.match(reference, /浏览器控制台/)
  assert.match(reference, /<projectRoot>\/\.dsh\/skills/)
  assert.match(reference, /dsh-isolated\.cmd plugin --profile web add/)
})
