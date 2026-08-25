import { spawn } from 'node:child_process'
import { constants } from 'node:fs'
import { access, lstat, readFile, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const projectTestHome = resolve(projectRoot, '.dsh-test')
const realDshHome = resolve(process.env.USERPROFILE ?? '', '.dsh')
const temporaryRoot = resolve(tmpdir())

function normalizeForCompare(path) {
  const normalized = resolve(path)
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized
}

function isWithin(root, target) {
  const rel = relative(resolve(root), resolve(target))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

async function isFile(path) {
  try {
    const info = await lstat(path)
    return info.isFile() && !info.isSymbolicLink()
  } catch {
    return false
  }
}

function absolutePath(path, cwd) {
  return isAbsolute(path) ? resolve(path) : resolve(cwd, path)
}

async function firstExisting(candidates, cwd) {
  for (const candidate of candidates) {
    const path = absolutePath(candidate, cwd)
    if (await isFile(path)) return path
  }
}

async function resolveFromPath(env, cwd) {
  const names = process.platform === 'win32' ? ['dsh.cmd'] : ['dsh']
  const pathValue = env.PATH ?? env.Path ?? env.path ?? ''
  const directories = pathValue.split(delimiter).map((entry) => entry.trim()).filter(Boolean)
  return await firstExisting(
    directories.flatMap((directory) => names.map((name) => resolve(directory, name))),
    cwd,
  )
}

async function resolveFromKnownPrefixes(env, cwd) {
  const prefixes = []
  if (env.npm_config_prefix?.trim()) prefixes.push(absolutePath(env.npm_config_prefix.trim(), cwd))
  if (process.platform === 'win32' && env.APPDATA?.trim()) prefixes.push(resolve(env.APPDATA.trim(), 'npm'))
  const unique = [...new Set(prefixes.map(normalizeForCompare))]
  const candidates = unique.map((prefix) => (
    process.platform === 'win32' ? resolve(prefix, 'dsh.cmd') : resolve(prefix, 'bin', 'dsh')
  ))
  return await firstExisting(candidates, cwd)
}

function packageBinPath(manifest) {
  if (typeof manifest.bin === 'string') return manifest.bin
  if (manifest.bin && typeof manifest.bin.dsh === 'string') return manifest.bin.dsh
  throw new Error('official @deepseek-ai/dsh package does not declare bin.dsh')
}

async function readManifest(packageRoot) {
  const packageJson = resolve(packageRoot, 'package.json')
  let manifest
  try {
    manifest = JSON.parse(await readFile(packageJson, 'utf8'))
  } catch {
    throw new Error(`DSH shim is not backed by an official @deepseek-ai/dsh npm layout: ${packageJson}`)
  }
  if (manifest.name !== '@deepseek-ai/dsh') {
    throw new Error(`DSH shim is not backed by an official @deepseek-ai/dsh npm layout: ${packageJson}`)
  }
  return manifest
}

async function launchFromPackage(packageRoot, sourcePath, expectedCli) {
  const manifest = await readManifest(packageRoot)
  const rootReal = await realpath(packageRoot)
  const cli = resolve(rootReal, packageBinPath(manifest))
  const cliReal = await realpath(cli).catch(() => {
    throw new Error(`official @deepseek-ai/dsh CLI entry does not exist: ${cli}`)
  })
  if (!isWithin(rootReal, cliReal)) throw new Error('official @deepseek-ai/dsh CLI entry escapes its package root')
  const cliInfo = await lstat(cli)
  if (!cliInfo.isFile() || cliInfo.isSymbolicLink()) throw new Error('official @deepseek-ai/dsh CLI entry must be a regular file')
  if (expectedCli && normalizeForCompare(expectedCli) !== normalizeForCompare(cliReal)) {
    throw new Error('DSH_BIN JavaScript entry does not match the official package bin.dsh entry')
  }
  return Object.freeze({
    command: process.execPath,
    argsPrefix: Object.freeze([cliReal]),
    displayPath: cliReal,
    sourcePath,
    packageRoot: rootReal,
    packageVersion: String(manifest.version ?? ''),
  })
}

async function launchFromShim(shim) {
  if (process.platform === 'win32' && extname(shim).toLowerCase() !== '.cmd') {
    throw new Error('Windows DSH shim must be the official npm dsh.cmd')
  }
  const packageRoot = process.platform === 'win32'
    ? resolve(dirname(shim), 'node_modules', '@deepseek-ai', 'dsh')
    : resolve(dirname(await realpath(shim)), '..')
  return await launchFromPackage(packageRoot, shim)
}

async function launchFromJavaScript(cli) {
  let current = dirname(cli)
  for (;;) {
    try {
      const manifest = await readManifest(current)
      if (manifest.name === '@deepseek-ai/dsh') return await launchFromPackage(current, cli, cli)
    } catch {
      // Keep walking until the filesystem root; only the exact package is accepted.
    }
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  throw new Error('DSH_BIN JavaScript entry is not inside an official @deepseek-ai/dsh package')
}

export async function resolveDshLaunch({ env = process.env, cwd = process.cwd() } = {}) {
  let candidate
  if (env.DSH_BIN?.trim()) {
    candidate = absolutePath(env.DSH_BIN.trim(), cwd)
    if (!await isFile(candidate)) throw new Error(`DSH_BIN does not exist or is not a regular file: ${candidate}`)
  } else {
    candidate = await resolveFromPath(env, cwd) ?? await resolveFromKnownPrefixes(env, cwd)
  }
  if (!candidate) throw new Error('unable to resolve an official DSH executable')
  const extension = extname(candidate).toLowerCase()
  if (['.js', '.mjs', '.cjs'].includes(extension)) return await launchFromJavaScript(candidate)
  return await launchFromShim(candidate)
}

export async function resolveDshExecutable(options) {
  return (await resolveDshLaunch(options)).displayPath
}

async function assertPlainPathChain(base, target) {
  const rel = relative(base, target)
  const parts = rel === '' ? [] : rel.split(/[\\/]+/)
  let current = resolve(base)
  for (const part of ['', ...parts]) {
    if (part) current = join(current, part)
    try {
      const info = await lstat(current)
      if (info.isSymbolicLink()) throw new Error(`isolated DSH Home path contains a link or junction: ${current}`)
      const currentReal = await realpath(current)
      if (normalizeForCompare(currentReal) !== normalizeForCompare(current)) {
        throw new Error(`isolated DSH Home path contains a reparse redirect: ${current}`)
      }
    } catch (error) {
      if (error?.code === 'ENOENT') break
      throw error
    }
  }
}

export async function validateIsolatedHome(path, { cwd = process.cwd() } = {}) {
  const target = absolutePath(path, cwd)
  if (isWithin(realDshHome, target) || isWithin(target, realDshHome)) {
    throw new Error(`isolated DSH Home crosses the real DSH Home boundary: ${target}`)
  }

  let allowedRoot
  if (isWithin(projectTestHome, target)) {
    allowedRoot = projectTestHome
  } else if (isWithin(temporaryRoot, target)) {
    const firstSegment = relative(temporaryRoot, target).split(/[\\/]+/)[0]
    if (!firstSegment.toLowerCase().startsWith('oasis-dsh-')) {
      throw new Error(`temporary DSH Home must use an oasis-dsh-* root: ${target}`)
    }
    allowedRoot = resolve(temporaryRoot, firstSegment)
  } else {
    throw new Error(`DSH Home must be inside the project .dsh-test or an oasis-dsh-* temporary root: ${target}`)
  }

  await assertPlainPathChain(allowedRoot, target)
  return target
}

async function main() {
  const args = process.argv.slice(2)
  if (args[0] === '--resolve-bin') {
    console.log(await resolveDshExecutable())
    return
  }

  let requestedHome = projectTestHome
  if (args[0] === '--home') {
    if (!args[1]) throw new Error('--home requires a directory')
    requestedHome = args[1]
    args.splice(0, 2)
  }
  const dshHome = await validateIsolatedHome(requestedHome)

  if (args[0] === '--print-home') {
    console.log(dshHome)
    return
  }

  const launch = await resolveDshLaunch()
  if (args[0] === '--print-bin') {
    console.log(launch.displayPath)
    return
  }

  const exitCode = await new Promise((resolveExit, reject) => {
    const child = spawn(launch.command, [...launch.argsPrefix, ...args], {
      env: { ...process.env, DSH_HOME: dshHome },
      shell: false,
      stdio: 'inherit',
      windowsHide: true,
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (signal) reject(new Error(`DSH terminated by signal ${signal}`))
      else resolveExit(code ?? 1)
    })
  })
  process.exitCode = exitCode
}

const isDirectRun = process.argv[1]
  && resolve(process.argv[1]) === resolve(dirname(fileURLToPath(import.meta.url)), 'dsh-isolated.mjs')

if (isDirectRun) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
