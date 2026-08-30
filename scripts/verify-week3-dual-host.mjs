import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { access, mkdir, realpath, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { collectTree, compareRows, sha256, writeBaselineTsv } from './baseline-capture-core.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const verifier = resolve(projectRoot, 'scripts/verify-week3-local-loop.mjs')
const realProfile = resolve(process.env.OASIS_REAL_DSH_PROFILE ?? join(process.env.USERPROFILE ?? '', '.dsh'))
const requestedEvidence = process.argv[2]
  ?? 'docs/evidence/week3-comprehensive-audit-remediation-2026-08-29/task6/dual-host'
const evidenceRoot = resolve(projectRoot, requestedEvidence)
const filesystemEvidence = resolve(evidenceRoot, 'filesystem')
const runtimeEvidence = resolve(evidenceRoot, 'runtime')

function isWithin(root, target) {
  const rel = relative(root, target)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

async function assertFreshEvidenceRoot() {
  assert.equal(isWithin(projectRoot, evidenceRoot), true, 'Task 6 evidence root must stay inside the project')
  let exists = false
  try {
    await access(evidenceRoot)
    exists = true
  } catch {}
  assert.equal(exists, false, `Task 6 evidence root already exists: ${evidenceRoot}`)
  await mkdir(filesystemEvidence, { recursive: true })
  await mkdir(runtimeEvidence, { recursive: true })
}

async function snapshot(path) {
  const rows = await collectTree(realProfile, realProfile)
  await writeBaselineTsv(path, rows)
  return { rows, digest: sha256(JSON.stringify(rows)), root: await realpath(realProfile) }
}

function runMode(mode) {
  return new Promise((resolveRun, rejectRun) => {
    const modeEvidence = resolve(evidenceRoot, mode)
    const child = spawn(process.execPath, [verifier], {
      cwd: projectRoot,
      env: {
        ...process.env,
        OASIS_PANEL_HOST_MODE: mode,
        OASIS_EVIDENCE_ROOT: modeEvidence,
      },
      shell: false,
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
    child.once('close', async (code, signal) => {
      const output = `${stdout}${stderr}`
      await writeFile(resolve(runtimeEvidence, `${mode}.txt`), output, 'utf8')
      if ((code ?? 1) === 0) resolveRun({ mode, code, signal, evidence: modeEvidence })
      else rejectRun(Object.assign(new Error(`${mode} verification exited ${code}\n${output}`), { code, signal }))
    })
  })
}

async function main() {
  await assertFreshEvidenceRoot()
  const before = await snapshot(resolve(filesystemEvidence, 'real-profile-before.tsv'))
  let error = null
  const modes = []
  try {
    modes.push(await runMode('standalone'))
    modes.push(await runMode('better-sidebar'))
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
      completedModes: modes.map(({ mode }) => mode),
    }
    await writeFile(
      resolve(filesystemEvidence, 'real-profile-compare.json'),
      `${JSON.stringify(comparison, null, 2)}\n`,
      'utf8',
    )
    if (!comparison.equal && !error) error = new Error('protected real DSH Profile changed during dual-host verification')
  }
  if (error) throw error
  console.log(`Week 3 dual-host verification passed; evidence: ${evidenceRoot}`)
}

main().catch((error) => {
  console.error(error.stack ?? error.message)
  process.exitCode = 1
})
