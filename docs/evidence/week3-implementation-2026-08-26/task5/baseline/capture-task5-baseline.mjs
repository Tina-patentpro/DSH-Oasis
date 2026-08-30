import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

import { captureFilesystemBaseline, sha256 } from '../../../../../scripts/baseline-capture-core.mjs'

const projectRoot = resolve(process.cwd())
const outputRoot = resolve(projectRoot, 'docs/evidence/week3-implementation-2026-08-26/task5/baseline')
const profileRoot = resolve(process.env.USERPROFILE ?? '', '.dsh')
const label = process.argv[2]

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
  'docs/plans/2026-08-25-week3-design.md',
  'docs/plans/2026-08-25-week3-implementation.md',
  'docs/evidence/week3-implementation-2026-08-26/task5/evidence-ledger.md',
  'docs/evidence/week3-implementation-2026-08-26/task5/baseline/capture-task5-baseline.mjs',
]

const workspaceContractFiles = [
  'package.json',
  'lib/types/index.d.ts',
  'lib/types/types.d.ts',
  'README.zh.md',
]

function run(command, args, shell = false) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    shell,
    windowsHide: true,
  })
  return {
    command: [command, ...args].join(' '),
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

const toolchain = [
  run('git.exe', ['status', '--short', '--branch']),
  run('git.exe', ['rev-parse', 'HEAD']),
  run('node.exe', ['--version']),
  run('pnpm.cmd', ['--version'], true),
  run(resolve(projectRoot, 'scripts/dsh-isolated.cmd'), ['--print-bin'], true),
  run(resolve(projectRoot, 'scripts/dsh-isolated.cmd'), ['--print-home'], true),
  run(resolve(projectRoot, 'scripts/dsh-isolated.cmd'), ['--version'], true),
  run('node.exe', [
    '-e',
    "import('./packages/oasis-professional-service/node_modules/@deepseek-ai/dsh-workspace/package.json',{with:{type:'json'}}).then(m=>console.log(m.default.version))",
  ]),
]

const { summary } = await captureFilesystemBaseline({
  projectRoot,
  profileRoot,
  outputRoot,
  label,
  productRoots,
  command: `node docs/evidence/week3-implementation-2026-08-26/task5/baseline/capture-task5-baseline.mjs ${label}`,
  productHashesStem: 'source-hashes',
  summaryStem: 'baseline-summary',
  extraSummary: {
    userConfirmedBetterSidebar: true,
    toolchainExitCodes: toolchain.map(({ command, exitCode }) => ({ command, exitCode })),
    nodeVersion: process.version,
    workspaceContracts,
  },
})
await writeFile(resolve(outputRoot, `toolchain-${label}.json`), `${JSON.stringify(toolchain, null, 2)}\n`, 'utf8')
await writeFile(resolve(outputRoot, `workspace-contracts-${label}.json`), `${JSON.stringify(workspaceContracts, null, 2)}\n`, 'utf8')

console.log(`source_entries=${summary.productEntries}`)
console.log(`profile_entries=${summary.profileEntries}`)
console.log(`profile_links=${summary.profileLinks}`)
console.log(`workspace_contracts=${workspaceContracts.length}`)
console.log(`toolchain_failures=${toolchain.filter((item) => item.exitCode !== 0).length}`)
