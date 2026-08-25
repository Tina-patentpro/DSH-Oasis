import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { access, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'

const modulePath = resolve('scripts/dsh-isolated.mjs')
const wrapperPath = resolve('scripts/dsh-isolated.cmd')

async function runModule(args, env = {}) {
  return await run(process.execPath, [modulePath, ...args], env, false)
}

async function runWrapper(args, env = {}) {
  return await run(wrapperPath, args, env, true)
}

async function run(command, args, env, shell) {
  return await new Promise((resolveRun) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      shell,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('close', (code, signal) => resolveRun({ code, signal, stdout, stderr }))
  })
}

async function withFakeOfficialDsh(callback) {
  const prefix = await mkdtemp(join(tmpdir(), 'oasis-dsh-bin-'))
  const packageRoot = join(prefix, 'node_modules', '@deepseek-ai', 'dsh')
  const cli = join(packageRoot, 'lib', 'bin.js')
  const shim = join(prefix, 'dsh.cmd')
  await mkdir(dirname(cli), { recursive: true })
  await writeFile(join(packageRoot, 'package.json'), JSON.stringify({
    name: '@deepseek-ai/dsh',
    version: '0.1.1-rc.2',
    type: 'module',
    bin: { dsh: 'lib/bin.js' },
  }), 'utf8')
  await writeFile(cli, [
    "import process from 'node:process'",
    "console.log(JSON.stringify({ args: process.argv.slice(2), home: process.env.DSH_HOME }))",
    '',
  ].join('\n'), 'utf8')
  await writeFile(shim, '@echo off\r\nnode "%~dp0\\node_modules\\@deepseek-ai\\dsh\\lib\\bin.js" %*\r\n', 'utf8')
  try {
    return await callback({ prefix, packageRoot, cli, shim })
  } finally {
    await rm(prefix, { recursive: true, force: true })
  }
}

function parseLastJson(stdout) {
  const lines = stdout.trim().split(/\r?\n/)
  return JSON.parse(lines.at(-1))
}

test('DSH_BIN official npm shim resolves to its package Node CLI entry', async () => {
  await withFakeOfficialDsh(async ({ cli, shim }) => {
    const result = await runModule(['--print-bin'], { DSH_BIN: shim })
    assert.equal(result.code, 0, result.stderr)
    assert.equal(result.stdout.trim().toLowerCase(), cli.toLowerCase())
  })
})

test('PATH fallback resolves an official npm shim without executing the shim shell', async () => {
  await withFakeOfficialDsh(async ({ prefix }) => {
    const path = `${prefix};${dirname(process.execPath)};${process.env.SystemRoot}\\System32`
    const home = join(prefix, 'isolated-home')
    const result = await runModule(['--home', home, 'path-fallback'], {
      DSH_BIN: '',
      PATH: path,
      Path: path,
      APPDATA: join(prefix, 'empty-appdata'),
    })
    assert.equal(result.code, 0, result.stderr)
    assert.deepEqual(parseLastJson(result.stdout).args, ['path-fallback'])
  })
})

test('forwards spaces, Unicode, quotes, trailing slashes and CMD metacharacters as exact argv', async () => {
  await withFakeOfficialDsh(async ({ prefix, shim }) => {
    const home = join(prefix, 'isolated-home')
    const args = [
      'space value',
      '中文参数',
      'quote"inside',
      'trailing\\',
      'amp&ersand',
      'pipe|value',
      'less<value',
      'greater>value',
      'caret^value',
      '(parentheses)',
      'percent%value',
      'bang!value',
    ]
    const result = await runModule(['--home', home, ...args], { DSH_BIN: shim })
    assert.equal(result.code, 0, result.stderr)
    assert.deepEqual(parseLastJson(result.stdout).args, args)
  })
})

test('does not execute a second CMD command embedded in one argument', async () => {
  await withFakeOfficialDsh(async ({ prefix, shim }) => {
    const home = join(prefix, 'isolated-home')
    const marker = join(prefix, 'injected.txt')
    const result = await runModule(['--home', home, `safe&echo INJECTED>${marker}`], { DSH_BIN: shim })
    assert.equal(result.code, 0, result.stderr)
    assert.deepEqual(parseLastJson(result.stdout).args, [`safe&echo INJECTED>${marker}`])
    await assert.rejects(access(marker))
  })
})

test('rejects an arbitrary command shim even when DSH_BIN points to it', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'oasis-dsh-arbitrary-'))
  const shim = join(directory, 'dsh.cmd')
  await writeFile(shim, '@echo off\r\necho unsafe\r\n', 'utf8')
  try {
    const result = await runModule(['--print-bin'], { DSH_BIN: shim })
    assert.notEqual(result.code, 0)
    assert.match(`${result.stdout}\n${result.stderr}`, /official @deepseek-ai\/dsh npm layout/i)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('supports the project .dsh-test home', async () => {
  await withFakeOfficialDsh(async ({ shim }) => {
    const home = resolve('.dsh-test')
    const result = await runModule(['--home', home, '--print-home'], { DSH_BIN: shim })
    assert.equal(result.code, 0, result.stderr)
    assert.equal(result.stdout.trim().toLowerCase(), home.toLowerCase())
  })
})

test('supports a declared oasis-dsh temporary home', async () => {
  await withFakeOfficialDsh(async ({ prefix, shim }) => {
    const home = join(prefix, 'isolated-home')
    const result = await runModule(['--home', home, '--print-home'], { DSH_BIN: shim })
    assert.equal(result.code, 0, result.stderr)
    assert.equal(result.stdout.trim().toLowerCase(), resolve(home).toLowerCase())
  })
})

test('rejects the real DSH home and its ancestors or descendants', async () => {
  await withFakeOfficialDsh(async ({ shim }) => {
    const realHome = resolve(process.env.USERPROFILE, '.dsh')
    for (const candidate of [realHome, dirname(realHome), join(realHome, 'profiles', 'web')]) {
      const result = await runModule(['--home', candidate, '--print-home'], { DSH_BIN: shim })
      assert.notEqual(result.code, 0, `unexpectedly accepted ${candidate}`)
      assert.match(`${result.stdout}\n${result.stderr}`, /real DSH Home boundary/i)
    }
  })
})

test('rejects a home whose existing path chain contains a symlink or junction', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'oasis-dsh-link-'))
  const target = join(directory, 'target')
  const link = join(directory, 'linked-home')
  await mkdir(target)
  try {
    try {
      await symlink(target, link, process.platform === 'win32' ? 'junction' : 'dir')
    } catch (error) {
      t.skip(`link creation unavailable: ${error.message}`)
      return
    }
    await withFakeOfficialDsh(async ({ shim }) => {
      const result = await runModule(['--home', link, '--print-home'], { DSH_BIN: shim })
      assert.notEqual(result.code, 0)
      assert.match(`${result.stdout}\n${result.stderr}`, /link|junction|reparse/i)
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('the cmd convenience wrapper still handles ordinary arguments', async () => {
  await withFakeOfficialDsh(async ({ prefix, shim }) => {
    const result = await runWrapper(['--home', join(prefix, 'isolated-home'), 'ordinary'], { DSH_BIN: shim })
    assert.equal(result.code, 0, result.stderr)
    assert.deepEqual(parseLastJson(result.stdout).args, ['ordinary'])
  })
})

test('fails closed when no official DSH package can be resolved', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'oasis-no-dsh-'))
  try {
    const path = `${dirname(process.execPath)};${process.env.SystemRoot}\\System32`
    const result = await runModule(['--print-bin'], {
      DSH_BIN: '',
      PATH: path,
      Path: path,
      APPDATA: join(directory, 'empty-appdata'),
      npm_config_prefix: join(directory, 'empty-prefix'),
    })
    assert.notEqual(result.code, 0)
    assert.match(`${result.stdout}\n${result.stderr}`, /unable to resolve.*DSH/i)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
