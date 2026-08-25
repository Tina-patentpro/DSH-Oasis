import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const workspace = process.cwd()
const evidence = resolve('docs/evidence/week1-audit-2026-08-23')
const browser = resolve('output/playwright/week1-audit')
const readEvidence = (name) => readFileSync(resolve(evidence, name), 'utf8')

const baseline = readEvidence('source-hashes-before.txt').trim().split(/\r?\n/)
for (const row of baseline) {
  const expectedHash = row.slice(0, 64)
  const relativePath = row.slice(66)
  const current = readFileSync(resolve(workspace, relativePath))
  const actualHash = createHash('sha256').update(current).digest('hex').toUpperCase()
  assert.equal(actualHash, expectedHash, `original file changed during audit: ${relativePath}`)
}

assert.equal(
  readEvidence('profile-hashes-before.txt'),
  readEvidence('profile-hashes-after.txt'),
  'real Profile hashes changed during audit',
)

assert.match(readEvidence('build.txt'), /Build complete/)
const tests = readEvidence('tests.txt')
assert.match(tests, /# pass 8/)
assert.match(tests, /# fail 0/)

const commit = JSON.parse(readEvidence('official-master-commit.json'))
assert.equal(commit.sha, 'b150a551b8d465e31e418e1b2eaf5e79bbb7d28e')
assert.equal(JSON.parse(readEvidence('npm-pack-dry-run-success.json'))[0].entryCount, 7)

const audit = JSON.parse(readEvidence('pnpm-audit-verified.json'))
assert.deepEqual(audit.metadata.vulnerabilities, {
  info: 0,
  low: 0,
  moderate: 0,
  high: 0,
  critical: 0,
})

const skills = JSON.parse(readEvidence('skill-list-response.json')).skills.map((skill) => skill.name)
assert.deepEqual(skills, ['dsh-plugin-development', 'oasis-rd-intake'])
assert.match(readEvidence('client-http-body.js'), /window\.__ModuleLoader__\.load/)

const event = JSON.parse(readFileSync(resolve(browser, 'event-result.json'), 'utf8'))
assert.equal(event.eventsObserved, 1)
assert.equal(event.details[0].source, 'conversation.input.right')
assert.match(readFileSync(resolve(browser, 'snapshot.txt'), 'utf8'), /打开技术研发与中国发明专利工作台/)
assert.match(readFileSync(resolve(browser, 'console.txt'), 'utf8'), /Errors: 0, Warnings: 0/)
assert.ok(statSync(resolve(browser, 'page.png')).size > 10_000)

const report = readFileSync(resolve('docs/第一周-深度反思与审计报告.md'), 'utf8')
assert.match(report, /审计状态：\*\*FAIL\*\*/)
for (let index = 1; index <= 8; index += 1) {
  assert.match(report, new RegExp(`P2-${String(index).padStart(2, '0')}`))
}

assert.equal(existsSync(resolve('.playwright-cli')), false)
assert.equal(existsSync(resolve(process.env.TEMP, 'oasis-dsh-week1-audit-20260823')), false)
assert.equal(existsSync(resolve(process.env.TEMP, 'oasis-npm-audit-cache-20260823')), false)

console.log(JSON.stringify({
  originalFilesUnchanged: baseline.length,
  realProfileUnchanged: true,
  testsPassed: 8,
  officialCommit: commit.sha,
  runtimeSkills: skills,
  browserEventObserved: event.eventsObserved,
  reportP2Findings: 8,
  result: 'verified',
}))
