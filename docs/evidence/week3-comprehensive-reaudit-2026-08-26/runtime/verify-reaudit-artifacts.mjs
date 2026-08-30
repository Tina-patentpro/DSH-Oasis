import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const evidenceRoot = resolve(here, '..')
const repositoryRoot = resolve(evidenceRoot, '../../..')
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))

const finalComparison = await readJson(resolve(evidenceRoot, 'baseline/final-comparison.json'))
const standardVerifiers = await readJson(resolve(here, 'standard-verifiers-summary.json'))
const week1ProfileWeb = await readJson(resolve(here, 'week1-profile-web-summary.json'))
const packageAudit = await readJson(resolve(evidenceRoot, 'package/package-audit.json'))
const report = await readFile(resolve(repositoryRoot, 'docs/第三周-全面复审报告.md'), 'utf8')
const traceability = await readFile(resolve(evidenceRoot, 'findings/requirements-traceability.md'), 'utf8')
const findings = await readFile(resolve(evidenceRoot, 'findings/findings-register.md'), 'utf8')

if (finalComparison.equal !== true) throw new Error('before/after comparison is not equal')
if (JSON.stringify(standardVerifiers.map((entry) => entry.status)) !== JSON.stringify([1, 0, 0])) {
  throw new Error('unexpected Week 1/2/3 verifier status vector')
}
if (week1ProfileWeb.status !== 0) throw new Error('Week 1 profiles/web verification did not pass')
if (packageAudit.status !== 'PASS' || packageAudit.tarball.entryCount !== 33 || packageAudit.findings.length !== 0) {
  throw new Error('unexpected package audit result')
}
if (!report.includes('- 最终状态：`FAIL`')) throw new Error('final report status is missing')
if (!report.includes('173/173') || !report.includes('29/29')) throw new Error('test totals are missing')
for (const id of ['W3R-01', 'W3R-02', 'W3R-03', 'W3R-04', 'W3R-05', 'W3R-06']) {
  if (!report.includes(id) || !findings.includes(id)) throw new Error(`finding is not fully traced: ${id}`)
}
for (let task = 1; task <= 9; task += 1) {
  if (!traceability.includes(`| ${task} |`)) throw new Error(`Task ${task} is missing from traceability`)
}

console.log('reaudit-artifacts=valid')
