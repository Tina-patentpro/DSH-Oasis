import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

const root = resolve(process.cwd())

function run(command, args, shell = false) {
  const result = spawnSync(command, args, {
    cwd: root,
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

const localDshPackage = JSON.parse(await readFile(
  resolve(process.env.APPDATA ?? '', 'npm/node_modules/@deepseek-ai/dsh/package.json'),
  'utf8',
))

const commands = [
  run('git.exe', ['status', '--short', '--branch']),
  run('node.exe', ['--version']),
  run('pnpm.cmd', ['--version'], true),
  run(resolve(root, 'scripts/dsh-isolated.cmd'), ['--print-home'], true),
  run(resolve(root, 'scripts/dsh-isolated.cmd'), ['--version'], true),
]

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  currentDirectory: root,
  localDshPackage: {
    name: localDshPackage.name,
    version: localDshPackage.version,
    bin: localDshPackage.bin,
  },
  commands,
  ok: localDshPackage.name === '@deepseek-ai/dsh'
    && localDshPackage.version === '0.1.1-rc.2'
    && commands.every((item) => item.exitCode === 0),
}, null, 2))
