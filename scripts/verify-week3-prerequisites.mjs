import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { access, mkdir, readdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { collectTree, compareRows, sha256, writeBaselineTsv } from './baseline-capture-core.mjs'
import { resolveDshLaunch } from './dsh-isolated.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageRoot = resolve(projectRoot, 'packages/oasis-professional-service')
const rootTestsRoot = resolve(projectRoot, 'tests/scripts')
const week1Verifier = resolve(projectRoot, 'scripts/verify-week1-supplement.mjs')
const week2Verifier = resolve(projectRoot, 'scripts/verify-week2-persistence.mjs')
const realProfile = resolve(process.env.OASIS_REAL_DSH_PROFILE ?? join(process.env.USERPROFILE ?? '', '.dsh'))
const requestedEvidence = process.argv[2]
  ?? 'docs/evidence/week3-comprehensive-audit-remediation-2026-08-29/task6/prerequisites'
const evidenceRoot = resolve(projectRoot, requestedEvidence)
const runtimeEvidence = resolve(evidenceRoot, 'runtime')
const filesystemEvidence = resolve(evidenceRoot, 'filesystem')

function isWithin(root, target) {
  const rel = relative(root, target)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

async function saveJson(path, value) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function assertFreshEvidenceRoot() {
  assert.equal(isWithin(projectRoot, evidenceRoot), true, 'Task 6 prerequisite evidence must stay inside the project')
  let exists = false
  try {
    await access(evidenceRoot)
    exists = true
  } catch {}
  assert.equal(exists, false, `Task 6 prerequisite evidence root already exists: ${evidenceRoot}`)
  await mkdir(runtimeEvidence, { recursive: true })
  await mkdir(filesystemEvidence, { recursive: true })
}

async function snapshot(path) {
  const rows = await collectTree(realProfile, realProfile)
  await writeBaselineTsv(path, rows)
  return { rows, digest: sha256(JSON.stringify(rows)), root: await realpath(realProfile) }
}

function runCapture(label, command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? projectRoot,
      env: { ...process.env, ...options.env },
      shell: options.shell ?? false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.once('error', rejectRun)
    child.once('close', (code, signal) => {
      void (async () => {
        const output = `${stdout}${stderr}`
        await writeFile(resolve(runtimeEvidence, `${label}.txt`), output, 'utf8')
        const result = { label, code: code ?? 1, signal, stdout, stderr }
        if (result.code === 0) resolveRun(result)
        else rejectRun(Object.assign(new Error(`${label} exited ${result.code}\n${output}`), { result }))
      })().catch(rejectRun)
    })
  })
}

async function runRootTests() {
  const testFiles = (await readdir(rootTestsRoot))
    .filter((name) => name.endsWith('.test.mjs'))
    .sort()
    .map((name) => resolve(rootTestsRoot, name))
  assert.ok(testFiles.length > 0, 'root script tests were not discovered')
  const result = await runCapture('root-tests', process.execPath, ['--test', ...testFiles])
  return { command: `node --test ${testFiles.length} root test files`, testFileCount: testFiles.length, code: result.code }
}

async function runPackageVerify() {
  const args = ['--config.verify-deps-before-run=false', 'run', 'verify']
  const result = await runCapture('package-verify', 'pnpm.cmd', args, {
    cwd: packageRoot,
    shell: process.platform === 'win32',
    env: { CI: 'true' },
  })
  return { command: `pnpm ${args.join(' ')}`, code: result.code }
}

async function runVerifier(label, verifier) {
  const verifierEvidence = resolve(evidenceRoot, label)
  const result = await runCapture(label, process.execPath, [verifier], {
    env: { OASIS_EVIDENCE_ROOT: verifierEvidence },
  })
  return { command: `node ${relative(projectRoot, verifier)}`, evidence: verifierEvidence, code: result.code }
}

async function refreshBaselines() {
  const pnpm = await runCapture('pnpm-version', 'pnpm.cmd', ['--version'], {
    shell: process.platform === 'win32',
  })
  const dsh = await resolveDshLaunch({ cwd: projectRoot })
  const packageManifestPath = resolve(packageRoot, 'package.json')
  const packageManifestBytes = await readFile(packageManifestPath)
  const packageManifest = JSON.parse(packageManifestBytes)
  const skillPath = resolve(projectRoot, '.dsh/skills/dsh-plugin-development/SKILL.md')
  const contractsPath = resolve(projectRoot, '.dsh/skills/dsh-plugin-development/references/official-contracts.md')
  const clientPath = resolve(packageRoot, 'src/client.js')
  const skill = await readFile(skillPath, 'utf8')
  const contracts = await readFile(contractsPath, 'utf8')
  const client = await readFile(clientPath, 'utf8')
  const betterSidebarManifestPath = resolve(realProfile, 'profiles/web/node_modules/dsh-better-sidebar/package.json')
  const betterSidebarManifestBytes = await readFile(betterSidebarManifestPath)
  const betterSidebarManifest = JSON.parse(betterSidebarManifestBytes)

  assert.equal(dsh.packageVersion, '0.1.1-rc.2')
  assert.equal(packageManifest.name, 'oasis-professional-service')
  assert.equal(packageManifest.version, '0.0.1')
  assert.equal(packageManifest.peerDependencies['@deepseek-ai/dsh-client-ui-layout'], '0.1.1-rc.2')
  assert.equal(betterSidebarManifest.name, 'dsh-better-sidebar')
  assert.equal(betterSidebarManifest.version, '0.15.2')
  assert.match(skill, /`conversation\.input\.right`.*`list`/)
  assert.match(skill, /`shell\.overlay`.*`list`/)
  assert.match(skill, /`details`.*`single`/)
  assert.match(client, /slots\.inject\('conversation\.input\.right'/)
  assert.match(client, /slots\.inject\('shell\.overlay'/)
  assert.doesNotMatch(client, /slots\.inject\('details'/)

  const baselines = {
    generatedAt: new Date().toISOString(),
    node: { version: process.version, executable: process.execPath },
    pnpm: { version: pnpm.stdout.trim() },
    dsh: { version: dsh.packageVersion, packageRoot: dsh.packageRoot, cli: dsh.displayPath },
    package: {
      name: packageManifest.name,
      version: packageManifest.version,
      engines: packageManifest.engines,
      peerDependencies: packageManifest.peerDependencies,
      packageJsonSha256: sha256(packageManifestBytes),
    },
    betterSidebar: {
      name: betterSidebarManifest.name,
      version: betterSidebarManifest.version,
      packageJsonSha256: sha256(betterSidebarManifestBytes),
    },
    slots: {
      conversationInputRight: { kind: 'list', use: 'additive entry' },
      shellOverlay: { kind: 'list', use: 'Portal lifecycle bridge' },
      details: { kind: 'single', use: 'forbidden' },
      skillSha256: sha256(await readFile(skillPath)),
      officialContractsSha256: sha256(await readFile(contractsPath)),
      clientSourceSha256: sha256(await readFile(clientPath)),
    },
  }
  await saveJson(resolve(runtimeEvidence, 'baselines.json'), baselines)
  return baselines
}

async function main() {
  await assertFreshEvidenceRoot()
  const before = await snapshot(resolve(filesystemEvidence, 'real-profile-before.tsv'))
  let error = null
  const completed = []
  try {
    await refreshBaselines()
    completed.push({ gate: 'baselines', code: 0 })
    completed.push({ gate: 'root-tests', ...await runRootTests() })
    completed.push({ gate: 'package-verify', ...await runPackageVerify() })
    completed.push({ gate: 'week1', ...await runVerifier('week1', week1Verifier) })
    completed.push({ gate: 'week2', ...await runVerifier('week2', week2Verifier) })
  } catch (caught) {
    error = caught
  } finally {
    const after = await snapshot(resolve(filesystemEvidence, 'real-profile-after.tsv'))
    const diff = compareRows(before.rows, after.rows)
    const comparison = {
      beforeDigest: before.digest,
      afterDigest: after.digest,
      entriesBefore: before.rows.length,
      entriesAfter: after.rows.length,
      resolvedRootBefore: before.root,
      resolvedRootAfter: after.root,
      equal: before.digest === after.digest,
      changes: diff.changes,
    }
    await saveJson(resolve(filesystemEvidence, 'real-profile-compare.json'), comparison)
    if (!comparison.equal && !error) error = new Error('protected real DSH Profile changed during prerequisite verification')
    await saveJson(resolve(runtimeEvidence, 'summary.json'), {
      generatedAt: new Date().toISOString(),
      result: error ? 'FAIL' : 'PASS',
      completed,
      realProfileEqual: comparison.equal,
      error: error?.message ?? null,
    })
  }
  if (error) throw error
  console.log(`Week 3 prerequisite verification passed; evidence: ${evidenceRoot}`)
}

main().catch((error) => {
  console.error(error.stack ?? error.message)
  process.exitCode = 1
})
