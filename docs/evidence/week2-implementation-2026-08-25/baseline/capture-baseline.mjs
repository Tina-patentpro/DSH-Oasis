import { spawnSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

import { captureFilesystemBaseline } from '../../../../scripts/baseline-capture-core.mjs'

const projectRoot = resolve(process.cwd())
const outputRoot = resolve(projectRoot, 'docs/evidence/week2-implementation-2026-08-25/baseline')
const profileRoot = resolve(process.env.USERPROFILE ?? '', '.dsh')
const label = process.argv[2]

const productRoots = [
  '.dsh/skills',
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
  'docs/evidence/week2-implementation-2026-08-25/baseline/capture-baseline.mjs',
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

const toolchain = [
  run('git.exe', ['status', '--short', '--branch']),
  run('node.exe', ['--version']),
  run('pnpm.cmd', ['--version'], true),
  run(resolve(projectRoot, 'scripts/dsh-isolated.cmd'), ['--print-bin'], true),
  run(resolve(projectRoot, 'scripts/dsh-isolated.cmd'), ['--print-home'], true),
  run(resolve(projectRoot, 'scripts/dsh-isolated.cmd'), ['--version'], true),
]

const { summary } = await captureFilesystemBaseline({
  projectRoot,
  profileRoot,
  outputRoot,
  label,
  productRoots,
  command: `node docs/evidence/week2-implementation-2026-08-25/baseline/capture-baseline.mjs ${label}`,
  productHashesStem: 'source-hashes',
  summaryStem: 'baseline-summary',
  extraSummary: {
    toolchainExitCodes: toolchain.map(({ command, exitCode }) => ({ command, exitCode })),
    nodeVersion: process.version,
  },
})
await writeFile(resolve(outputRoot, `toolchain-${label}.json`), `${JSON.stringify(toolchain, null, 2)}\n`, 'utf8')

console.log(`source_entries=${summary.productEntries}`)
console.log(`profile_entries=${summary.profileEntries}`)
console.log(`profile_links=${summary.profileLinks}`)
console.log(`toolchain_failures=${toolchain.filter((item) => item.exitCode !== 0).length}`)
