import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const projectRoot = resolve(process.cwd())
const packageRoot = resolve(projectRoot, 'packages/oasis-professional-service')
const taskRoot = resolve(projectRoot, 'docs/evidence/week3-reaudit-remediation-2026-08-27/task6')
const npmCache = resolve(taskRoot, 'npm-cache')
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const profile = resolve(process.env.USERPROFILE ?? '', '.dsh')

const commands = {
  'npm-config': {
    command: 'npm.cmd',
    args: ['config', 'get', 'cache'],
    cwd: packageRoot,
    shell: true,
  },
  install: {
    command: 'pnpm.cmd',
    args: ['install', '--offline', '--frozen-lockfile'],
    cwd: packageRoot,
    shell: true,
  },
  verify: {
    command: 'pnpm.cmd',
    args: ['--config.verify-deps-before-run=false', 'run', 'verify'],
    cwd: packageRoot,
    shell: true,
  },
  pack: {
    command: 'npm.cmd',
    args: ['pack', '--json', '--pack-destination', resolve(taskRoot, 'package')],
    cwd: packageRoot,
    shell: true,
  },
  week1: {
    command: process.execPath,
    args: [resolve(projectRoot, 'scripts/verify-week1-supplement.mjs')],
    cwd: projectRoot,
    shell: false,
    evidenceRoot: resolve(taskRoot, 'week1'),
  },
  week2: {
    command: process.execPath,
    args: [resolve(projectRoot, 'scripts/verify-week2-persistence.mjs')],
    cwd: projectRoot,
    shell: false,
    evidenceRoot: resolve(taskRoot, 'week2'),
  },
  week3: {
    command: process.execPath,
    args: [resolve(projectRoot, 'scripts/verify-week3-local-loop.mjs')],
    cwd: projectRoot,
    shell: false,
    evidenceRoot: resolve(taskRoot, 'week3'),
  },
  'week1-debug': () => ({
    command: process.execPath,
    args: [
      resolve(projectRoot, 'scripts/dsh-isolated.mjs'),
      '--home',
      readFileSync(resolve(taskRoot, 'week1/runtime/verifier-home.txt'), 'utf8').trim(),
      '--profile', 'web', '--no-open', '--port', '9120',
    ],
    cwd: projectRoot,
    shell: false,
  }),
}

const name = process.argv[2]
const configured = commands[name]
if (!configured) throw new Error(`unknown task6 command: ${String(name)}`)
const selected = typeof configured === 'function' ? configured() : configured

const result = spawnSync(selected.command, selected.args, {
  cwd: selected.cwd,
  env: {
    ...process.env,
    NPM_CONFIG_CACHE: npmCache,
    npm_config_cache: npmCache,
    OASIS_BROWSER_EXECUTABLE: edge,
    OASIS_REAL_DSH_PROFILE: profile,
    HTTP_PROXY: 'http://127.0.0.1:1',
    HTTPS_PROXY: 'http://127.0.0.1:1',
    ALL_PROXY: 'http://127.0.0.1:1',
    NO_PROXY: '127.0.0.1,localhost,::1',
    ...(selected.evidenceRoot ? { OASIS_EVIDENCE_ROOT: selected.evidenceRoot } : {}),
  },
  shell: selected.shell,
  stdio: 'inherit',
  windowsHide: true,
})

if (result.error) throw result.error
if (result.signal) throw new Error(`${name} terminated by signal ${result.signal}`)
process.exitCode = result.status ?? 1
