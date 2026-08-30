import { spawnSync } from 'node:child_process'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

import {
  captureFilesystemBaseline,
  collectTree,
  compareRows,
  parseBaselineTsv,
  sha256,
  writeBaselineTsv,
} from '../../../../scripts/baseline-capture-core.mjs'

const projectRoot = resolve(process.cwd())
const evidenceRootName = 'week3-reaudit-remediation-2026-08-27'
const outputRoot = resolve(projectRoot, `docs/evidence/${evidenceRootName}/baseline`)
const profileRoot = resolve(process.env.USERPROFILE ?? '', '.dsh')
const label = process.argv[2]

if (!['before', 'after'].includes(label)) {
  throw new Error('usage: node capture-remediation-baseline.mjs <before|after>')
}

const productRoots = [
  '.dsh/skills/dsh-plugin-development',
  'packages/oasis-professional-service/src',
  'packages/oasis-professional-service/test',
  'packages/oasis-professional-service/lib',
  'packages/oasis-professional-service/package.json',
  'packages/oasis-professional-service/pnpm-lock.yaml',
  'packages/oasis-professional-service/cordis.patch.yml',
  'packages/oasis-professional-service/tsdown.config.mjs',
  'scripts',
  'tests',
  'README.md',
  '.gitignore',
  'docs/plans/2026-08-24-dsh-beta-overall-plan.md',
  'docs/plans/2026-08-25-week3-design.md',
  'docs/plans/2026-08-25-week3-implementation.md',
  'docs/plans/2026-08-26-week3-reaudit-remediation.md',
  'docs/第三周-本地闭环验证报告.md',
  'docs/第三周-全面审计报告.md',
  'docs/第三周-全面复审报告.md',
]

const workspaceContractFiles = [
  'package.json',
  'lib/types/index.d.ts',
  'lib/types/types.d.ts',
  'README.zh.md',
]

const previousAuditProfileSha256 = '6C8DACD3E431B211653DDB575E4CE42FD1F7ABEE247E8AD9864D57214FF6BD97'
const expectedWorkspaceContracts = new Map([
  ['package.json', '0DBF7F622E4B7D930734135368907ED8256A707FAB6F990582444772A78E790F'],
  ['lib/types/index.d.ts', 'E0C43056B485B269A62E30FFD1921BB54565686A6A106A7BE717753378462AE1'],
  ['lib/types/types.d.ts', '099BF994F6A09CDE62FD31249CA5DC126CB34128ECB7D8DCEC713044FFCC1FB4'],
  ['README.zh.md', '08A909818269EE759919F5EA21C987F1841E98A7573ECDAC80395260C6BA1697'],
])

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? projectRoot,
    encoding: 'utf8',
    shell: options.shell ?? false,
    windowsHide: true,
  })
  return {
    command: [command, ...args].join(' '),
    cwd: options.cwd ?? projectRoot,
    exitCode: result.status,
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
  }
}

function rowsSha256(rows) {
  return sha256(JSON.stringify(rows.map((row) => ({
    path: row.path,
    kind: row.kind,
    size: row.size,
    sha256: row.sha256,
    target: row.target ?? '',
  }))))
}

const evidenceDirectory = resolve(projectRoot, 'docs/evidence')
const evidenceInputRoots = (await readdir(evidenceDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && entry.name !== evidenceRootName)
  .map((entry) => `docs/evidence/${entry.name}`)
  .sort((left, right) => left.localeCompare(right, 'en'))

const packageRoot = resolve(projectRoot, 'packages/oasis-professional-service')
const workspaceRoot = resolve(packageRoot, 'node_modules/@deepseek-ai/dsh-workspace')
const workspaceContracts = []
for (const relativePath of workspaceContractFiles) {
  const content = await readFile(resolve(workspaceRoot, relativePath))
  workspaceContracts.push({ relativePath, sha256: sha256(content) })
}

const evidenceRows = []
for (const root of evidenceInputRoots) {
  evidenceRows.push(...await collectTree(resolve(projectRoot, root), projectRoot))
}
evidenceRows.sort((left, right) => left.path.localeCompare(right.path, 'en'))
const evidenceInputsSha256 = sha256(JSON.stringify(evidenceRows.map((row) => ({
  path: row.path,
  kind: row.kind,
  size: row.size,
  sha256: row.sha256,
  target: row.target ?? '',
}))))
await writeBaselineTsv(resolve(outputRoot, `historical-evidence-hashes-${label}.tsv`), evidenceRows)

const toolchain = [
  run('git.exe', ['status', '--short', '--branch']),
  run('git.exe', ['diff', '--check']),
  run('git.exe', ['rev-parse', 'HEAD']),
  run('node.exe', ['--version']),
  run('pnpm.cmd', ['--version'], { shell: true }),
  run(resolve(projectRoot, 'scripts/dsh-isolated.cmd'), ['--print-bin'], { shell: true }),
  run(resolve(projectRoot, 'scripts/dsh-isolated.cmd'), ['--print-home'], { shell: true }),
  run(resolve(projectRoot, 'scripts/dsh-isolated.cmd'), ['--version'], { shell: true }),
]

const { profileRows, summary } = await captureFilesystemBaseline({
  projectRoot,
  profileRoot,
  outputRoot,
  label,
  productRoots,
  command: `node docs/evidence/${evidenceRootName}/baseline/capture-remediation-baseline.mjs ${label}`,
  productHashesStem: 'product-hashes',
  summaryStem: 'baseline-summary',
  extraSummary: {
    gitHeadAtRemediationStart: run('git.exe', ['rev-parse', 'HEAD']).stdout,
    evidenceInputRoots,
    historicalEvidenceEntries: evidenceRows.length,
    historicalEvidenceSha256: evidenceInputsSha256,
    toolchainExitCodes: toolchain.map(({ command, cwd, exitCode }) => ({ command, cwd, exitCode })),
    nodeVersion: process.version,
    workspaceContracts,
    previousAuditProfileSha256,
  },
})

await writeFile(resolve(outputRoot, `toolchain-${label}.json`), `${JSON.stringify(toolchain, null, 2)}\n`, 'utf8')
await writeFile(resolve(outputRoot, `workspace-contracts-${label}.json`), `${JSON.stringify(workspaceContracts, null, 2)}\n`, 'utf8')

const toolchainFailures = toolchain.filter((item) => item.exitCode !== 0)
if (toolchainFailures.length > 0) {
  throw new Error(`toolchain preflight failed: ${toolchainFailures.map((item) => item.command).join(', ')}`)
}
if (label === 'after') {
  const remediationStartRows = parseBaselineTsv(await readFile(
    resolve(outputRoot, 'profile-hashes-before.tsv'),
    'utf8',
  ))
  const task6ConfirmedRows = parseBaselineTsv(await readFile(resolve(
    projectRoot,
    `docs/evidence/${evidenceRootName}/task6/runtime/profile-confirmed.tsv`,
  ), 'utf8'))
  const remediationStartComparison = compareRows(remediationStartRows, profileRows)
  const task6Comparison = compareRows(task6ConfirmedRows, profileRows)

  Object.assign(summary, {
    remediationStartProfileEqual: remediationStartComparison.changes.length === 0,
    remediationStartProfileChangeCount: remediationStartComparison.changes.length,
    task6ConfirmedProfileSha256: rowsSha256(task6ConfirmedRows),
    task6ProfileEqual: task6Comparison.changes.length === 0,
    task6ProfileChangeCount: task6Comparison.changes.length,
  })
  await writeFile(
    resolve(outputRoot, 'profile-closing-comparison.json'),
    `${JSON.stringify({
      generatedAt: summary.generatedAt,
      remediationStart: {
        equal: summary.remediationStartProfileEqual,
        changeCount: summary.remediationStartProfileChangeCount,
        changes: remediationStartComparison.changes,
      },
      task6Confirmed: {
        equal: summary.task6ProfileEqual,
        changeCount: summary.task6ProfileChangeCount,
        changes: task6Comparison.changes,
      },
    }, null, 2)}\n`,
    'utf8',
  )
  await writeFile(
    resolve(outputRoot, 'baseline-summary-after.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
    'utf8',
  )
  if (!summary.task6ProfileEqual) {
    throw new Error(`real Profile changed after the confirmed Task 6 baseline: expected ${summary.task6ConfirmedProfileSha256}, got ${summary.profileContentSha256}`)
  }
}
for (const contract of workspaceContracts) {
  const expected = expectedWorkspaceContracts.get(contract.relativePath)
  if (contract.sha256 !== expected) {
    throw new Error(`workspace contract drifted: ${contract.relativePath}; expected ${expected}, got ${contract.sha256}`)
  }
}

console.log(`product_entries=${summary.productEntries}`)
console.log(`profile_entries=${summary.profileEntries}`)
console.log(`profile_links=${summary.profileLinks}`)
console.log(`profile_sha256=${summary.profileContentSha256}`)
console.log(`previous_audit_profile_equal=${summary.profileContentSha256 === previousAuditProfileSha256}`)
console.log(`historical_evidence_entries=${evidenceRows.length}`)
console.log(`historical_evidence_sha256=${evidenceInputsSha256}`)
console.log(`workspace_contracts=${workspaceContracts.length}`)
console.log(`toolchain_failures=${toolchainFailures.length}`)
