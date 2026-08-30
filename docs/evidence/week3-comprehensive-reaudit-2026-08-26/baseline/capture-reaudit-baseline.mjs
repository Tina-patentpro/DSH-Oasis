import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

import {
  captureFilesystemBaseline,
  collectTree,
  sha256,
  writeBaselineTsv,
} from '../../../../scripts/baseline-capture-core.mjs'

const projectRoot = resolve(process.cwd())
const outputRoot = resolve(projectRoot, 'docs/evidence/week3-comprehensive-reaudit-2026-08-26/baseline')
const profileRoot = resolve(process.env.USERPROFILE ?? '', '.dsh')
const label = process.argv[2]

if (!['before', 'after'].includes(label)) {
  throw new Error('usage: node capture-reaudit-baseline.mjs <before|after>')
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
  'docs/第三周-本地闭环验证报告.md',
  'docs/第三周-全面审计报告.md',
]

const evidenceInputRoots = [
  'docs/evidence/week1-audit-2026-08-23',
  'docs/evidence/week1-audit-remediation-2026-08-24',
  'docs/evidence/week1-comprehensive-audit-2026-08-24',
  'docs/evidence/week1-supplement-2026-08-24',
  'docs/evidence/week2-audit-2026-08-25',
  'docs/evidence/week2-implementation-2026-08-25',
  'docs/evidence/week2-persistence-2026-08-25',
  'docs/evidence/week2-repair-2026-08-25',
  'docs/evidence/week3-implementation-2026-08-25',
  'docs/evidence/week3-implementation-2026-08-26',
  'docs/evidence/week3-local-loop-2026-08-26',
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
evidenceRows.sort((a, b) => a.path.localeCompare(b.path, 'en'))
const evidenceInputsSha256 = sha256(JSON.stringify(evidenceRows.map((row) => ({
  path: row.path,
  kind: row.kind,
  size: row.size,
  sha256: row.sha256,
  target: row.target ?? '',
}))))
await writeBaselineTsv(resolve(outputRoot, `evidence-inputs-${label}.tsv`), evidenceRows)

const toolchain = [
  run('git.exe', ['status', '--short', '--branch']),
  run('git.exe', ['diff', '--check']),
  run('git.exe', ['rev-parse', 'HEAD']),
  run('node.exe', ['--version']),
  run('pnpm.cmd', ['--version'], { shell: true }),
  run(resolve(projectRoot, 'scripts/dsh-isolated.cmd'), ['--print-bin'], { shell: true }),
  run(resolve(projectRoot, 'scripts/dsh-isolated.cmd'), ['--print-home'], { shell: true }),
  run(resolve(projectRoot, 'scripts/dsh-isolated.cmd'), ['--version'], { shell: true }),
  run('tasklist.exe', ['/FI', 'IMAGENAME eq node.exe']),
]

const { summary } = await captureFilesystemBaseline({
  projectRoot,
  profileRoot,
  outputRoot,
  label,
  productRoots,
  command: `node docs/evidence/week3-comprehensive-reaudit-2026-08-26/baseline/capture-reaudit-baseline.mjs ${label}`,
  productHashesStem: 'source-hashes',
  summaryStem: 'baseline-summary',
  extraSummary: {
    gitHeadAtReviewStart: run('git.exe', ['rev-parse', 'HEAD']).stdout,
    evidenceInputRoots,
    evidenceInputEntries: evidenceRows.length,
    evidenceInputsSha256,
    toolchainExitCodes: toolchain.map(({ command, cwd, exitCode }) => ({ command, cwd, exitCode })),
    nodeVersion: process.version,
    workspaceContracts,
  },
})
await writeFile(resolve(outputRoot, `toolchain-${label}.json`), `${JSON.stringify(toolchain, null, 2)}\n`, 'utf8')
await writeFile(resolve(outputRoot, `workspace-contracts-${label}.json`), `${JSON.stringify(workspaceContracts, null, 2)}\n`, 'utf8')

console.log(`source_entries=${summary.productEntries}`)
console.log(`profile_entries=${summary.profileEntries}`)
console.log(`profile_links=${summary.profileLinks}`)
console.log(`evidence_entries=${evidenceRows.length}`)
console.log(`evidence_sha256=${evidenceInputsSha256}`)
console.log(`workspace_contracts=${workspaceContracts.length}`)
console.log(`toolchain_failures=${toolchain.filter((item) => item.exitCode !== 0).length}`)
