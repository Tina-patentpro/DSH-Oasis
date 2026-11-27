import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'

const project = process.cwd()
const root = resolve(project, '.dsh-test/m06-native-business-recovery-20261108-r1')
const evidence = resolve(project, 'docs/evidence/2026-11-08-r6-execution-r1')
const business = join(root, 'data/home/storages/oasis_workbench.json')
const hash = async () => createHash('sha256').update(await fs.readFile(business)).digest('hex')
const before = await hash()
const { withInstalledWriter } = await import(pathToFileURL(join(root, 'control/scripts/f-installed-runtime.mjs')).href)
const { acquireJsonRootOwnership } = await import(pathToFileURL(join(root, 'control/patches/storage-json-single-owner/ownership.mjs')).href)
const result = await withInstalledWriter(root, 'sdk', async ({ current }) => {
  const owner = await acquireJsonRootOwnership(join(root, 'data/home/storages'))
  try {
    return { current, installedLeaseAcquired: true, jsonOwnershipAcquired: true, businessBackendOpened: false }
  } finally {
    owner.release()
  }
})
const after = await hash()
if (before !== after) throw new Error('Readmission changed business bytes')
await fs.writeFile(join(evidence, 'lease-readmission.json'), JSON.stringify({
  ...result, writerReleased: true, businessSHA256: after, businessUnchanged: true,
}, null, 2) + '\n', { flag: 'wx' })
console.log('PASS: installed lease and JSON ownership reacquired/released; business unchanged')
