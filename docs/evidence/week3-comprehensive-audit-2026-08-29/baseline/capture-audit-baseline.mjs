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
const evidenceRootName = 'week3-comprehensive-audit-2026-08-29'
const outputRoot = resolve(projectRoot, `docs/evidence/${evidenceRootName}/baseline`)
const profileRoot = resolve(process.env.USERPROFILE ?? '', '.dsh')
const label = process.argv[2]

if (!['before', 'after'].includes(label)) {
  throw new Error('usage: node capture-audit-baseline.mjs <before|after>')
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
  'docs/PRD-DSH免费工作台.md',
  'docs/plans/2026-08-24-dsh-beta-overall-plan.md',
  'docs/plans/2026-08-25-week3-design.md',
  'docs/plans/2026-08-25-week3-implementation.md',
  'docs/plans/2026-08-26-week3-reaudit-remediation.md',
  'docs/第三周-本地闭环验证报告.md',
  'docs/第三周-全面审计报告.md',
  'docs/第三周-全面复审报告.md',
  'docs/第三周-全面复审修复报告.md',
]

const workspaceContractFiles = [
  'package.json',
  'lib/types/index.d.ts',
  'lib/types/types.d.ts',
  'README.zh.md',
]

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

const evidenceDirectory = resolve(projectRoot, 'docs/evidence')
const evidenceInputRoots = (await readdir(evidenceDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && entry.name !== evidenceRootName)
  .map((entry) => `docs/evidence/${entry.name}`)
  .sort((left, right) => left.localeCompare(right, 'en'))

const evidenceRows = []
for (const root of evidenceInputRoots) {
  evidenceRows.push(...await collectTree(resolve(projectRoot, root), projectRoot))
}
evidenceRows.sort((left, right) => left.path.localeCompare(right.path, 'en'))
await writeBaselineTsv(resolve(outputRoot, `historical-evidence-hashes-${label}.tsv`), evidenceRows)

const packageRoot = resolve(projectRoot, 'packages/oasis-professional-service')
const workspaceRoot = resolve(packageRoot, 'node_modules/@deepseek-ai/dsh-workspace')
const workspaceContracts = []
for (const relativePath of workspaceContractFiles) {
  const content = await readFile(resolve(workspaceRoot, relativePath))
  workspaceContracts.push({ relativePath, sha256: sha256(content) })
}

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

const { summary } = await captureFilesystemBaseline({
  projectRoot,
  profileRoot,
  outputRoot,
  label,
  productRoots,
  command: `node docs/evidence/${evidenceRootName}/baseline/capture-audit-baseline.mjs ${label}`,
  extraSummary: {
    gitHead: run('git.exe', ['rev-parse', 'HEAD']).stdout,
    evidenceInputRoots,
    historicalEvidenceEntries: evidenceRows.length,
    historicalEvidenceSha256: sha256(JSON.stringify(evidenceRows)),
    workspaceContracts,
    toolchainExitCodes: toolchain.map(({ command, cwd, exitCode }) => ({ command, cwd, exitCode })),
  },
})

await writeFile(resolve(outputRoot, `toolchain-${label}.json`), `${JSON.stringify(toolchain, null, 2)}\n`, 'utf8')
await writeFile(resolve(outputRoot, `workspace-contracts-${label}.json`), `${JSON.stringify(workspaceContracts, null, 2)}\n`, 'utf8')

const toolchainFailures = toolchain.filter((item) => item.exitCode !== 0)
if (toolchainFailures.length > 0) {
  throw new Error(`toolchain preflight failed: ${toolchainFailures.map((item) => item.command).join(', ')}`)
}

if (label === 'after') {
  const comparisons = {}
  for (const stem of ['product-hashes', 'profile-hashes', 'historical-evidence-hashes']) {
    const beforeRows = parseBaselineTsv(await readFile(resolve(outputRoot, `${stem}-before.tsv`), 'utf8'))
    const afterRows = parseBaselineTsv(await readFile(resolve(outputRoot, `${stem}-after.tsv`), 'utf8'))
    comparisons[stem] = compareRows(beforeRows, afterRows)
  }
  const beforeContracts = JSON.parse(await readFile(resolve(outputRoot, 'workspace-contracts-before.json'), 'utf8'))
  comparisons.workspaceContractsEqual = JSON.stringify(beforeContracts) === JSON.stringify(workspaceContracts)
  comparisons.gitHeadEqual = JSON.parse(await readFile(resolve(outputRoot, 'summary-before.json'), 'utf8')).gitHead === summary.gitHead
  await writeFile(resolve(outputRoot, 'closing-comparison.json'), `${JSON.stringify(comparisons, null, 2)}\n`, 'utf8')
  if (!comparisons['product-hashes'].ok
      || !comparisons['profile-hashes'].ok
      || !comparisons['historical-evidence-hashes'].ok
      || !comparisons.workspaceContractsEqual
      || !comparisons.gitHeadEqual) {
    throw new Error('audit preservation baseline changed; inspect closing-comparison.json')
  }
}

console.log(`product_entries=${summary.productEntries}`)
console.log(`profile_entries=${summary.profileEntries}`)
console.log(`profile_links=${summary.profileLinks}`)
console.log(`profile_sha256=${summary.profileContentSha256}`)
console.log(`historical_evidence_entries=${evidenceRows.length}`)
console.log(`workspace_contracts=${workspaceContracts.length}`)
console.log(`toolchain_failures=${toolchainFailures.length}`)
