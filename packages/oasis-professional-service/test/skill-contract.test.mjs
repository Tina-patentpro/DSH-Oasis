import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const skillPath = resolve(packageRoot, '../../.dsh/skills/oasis-rd-intake/SKILL.md')

test('publishes a project-local DSH skill with an explicit scope boundary', () => {
  assert.equal(existsSync(skillPath), true, 'project DSH skill must exist')
  if (!existsSync(skillPath)) return

  const skill = readFileSync(skillPath, 'utf8')
  assert.match(skill, /^---\r?\n/)
  assert.match(skill, /name:\s*oasis-rd-intake/)
  assert.match(skill, /description:/)
  assert.match(skill, /Dify和收费系统作为既有稳定外部能力/)
  assert.match(skill, /不得替代工程验证或专利专业人员复核/)
})
