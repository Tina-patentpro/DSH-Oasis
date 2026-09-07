import { cp, lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { patchSidebarSafePreview } from '../patches/better-sidebar-0.18.0/safe-file-preview.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, '.dsh-test/stage2-desktop/profiles/web/node_modules/dsh-better-sidebar')
const destination = join(root, '.dsh-test/stage3-desktop-app/resources/app.asar.unpacked/node_modules/dsh-better-sidebar')
const pin = JSON.parse(await readFile(new URL('../patches/better-sidebar-0.18.0/baseline.json', import.meta.url)))
const hash = bytes => createHash('sha256').update(bytes).digest('hex')

export async function assembleStage3Sidebar() {
  for (const path of [source, dirname(destination)]) {
    if ((await realpath(path)).toLowerCase() !== path.toLowerCase()) throw Error('Redirected Sidebar package path')
  }
  const originals = {}
  const patched = {}
  for (const [file, expected] of Object.entries(pin.hashes)) {
    const path = join(source, file)
    if ((await realpath(path)).toLowerCase() !== path.toLowerCase()) throw Error('Redirected Sidebar input')
    originals[file] = await readFile(path)
    if (hash(originals[file]) !== expected) throw Error('Unapproved Sidebar input: ' + file)
    if (file !== 'package.json') patched[file] = patchSidebarSafePreview(file, originals[file].toString('utf8'))
  }
  const manifest = JSON.parse(originals['package.json'])
  if (manifest.name !== pin.package || manifest.version !== pin.upstreamVersion) throw Error('Sidebar identity mismatch')
  let exists = true
  try { await lstat(destination) } catch(e) { if(e.code !== 'ENOENT') throw e; exists = false }
  if (!exists) {
    await mkdir(destination)
    await cp(source, destination, { recursive: true, force: false, errorOnExist: true,
      filter: async path => { if((await lstat(path)).isSymbolicLink()) throw Error('Redirected Sidebar child'); return true } })
  }
  // Also supports the already copied, never patched candidate; never overwrite unknown bytes.
  for (const [file, expected] of Object.entries(pin.hashes)) {
    const path = join(destination, file)
    if ((await realpath(path)).toLowerCase() !== path.toLowerCase()) throw Error('Redirected Sidebar output')
    if (hash(await readFile(path)) !== expected) throw Error('Candidate is not the unpatched approved Sidebar: ' + file)
  }
  for (const [file, text] of Object.entries(patched)) await writeFile(join(destination, file), text)
  for (const [file, expected] of Object.entries(pin.hashes)) {
    if (hash(await readFile(join(source, file))) !== expected) throw Error('Protected Sidebar source changed')
  }
  const evidence = { ...pin, outputHashes: Object.fromEntries(Object.entries(patched).map(([file,text])=>[file,hash(text)])), createdAt: new Date().toISOString() }
  await writeFile(join(destination, 'oasis-patch.json'), JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' })
  return evidence
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await assembleStage3Sidebar()))
