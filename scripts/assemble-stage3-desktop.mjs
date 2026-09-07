// Create a NEW local Desktop candidate from the exact installed 2.0.5 bytes.
// Never edit the installation, a Profile, or an existing output directory.
import { cp, lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { patchDesktopFrame } from '../patches/desktop-2.0.5/frame-layer.mjs'
import { patchMarkdownResources } from '../patches/dsh-0.1.2-rc.1/markdown-resources.mjs'
import { assembleStage3Sidebar } from './assemble-stage3-sidebar.mjs'
import { assembleStage3WebMarkdown } from './assemble-stage3-web-markdown.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(process.argv[2] ?? 'C:/Users/TinaD/AppData/Local/Programs/DSH Desktop')
const scratch = join(root, '.dsh-test')
const destination = join(scratch, 'stage3-desktop-app')
const appPath = 'resources/app.asar.unpacked'
const pin = JSON.parse(await readFile(new URL('../patches/desktop-2.0.5/baseline.json', import.meta.url), 'utf8'))
const markdownPin = JSON.parse(await readFile(new URL('../patches/dsh-0.1.2-rc.1/baseline.json', import.meta.url), 'utf8'))
const markdownPath = 'node_modules/@deepseek-ai/dsh-client-ui-primitives'
const hash = value => createHash('sha256').update(value).digest('hex')
if ((await realpath(scratch)).toLowerCase() !== scratch.toLowerCase()) throw Error('Scratch directory is redirected')
if ((await realpath(source)).toLowerCase() !== source.toLowerCase()) throw Error('Source installation is redirected')
try { await lstat(destination); throw Error('Candidate already exists; refusing overwrite') } catch (error) { if (error.code !== 'ENOENT') throw error }
const originals = {}
for (const [file, expected] of Object.entries(pin.hashes)) {
  originals[file] = await readFile(join(source, appPath, file))
  if (hash(originals[file]) !== expected) throw Error(`Unapproved Desktop bytes: ${file}`)
}
const manifest = JSON.parse(originals['package.json'])
if (manifest.name !== pin.package || manifest.version !== pin.upstreamVersion) throw Error('Desktop identity mismatch')
const client = patchDesktopFrame(originals['lib/client.js'].toString('utf8'))
const map = JSON.parse(originals['lib/client.js.map'])
const sourceIndexes = map.sources.map((name, index) => name.endsWith('/client/extended-styles.ts') ? index : -1).filter(index => index >= 0)
if (sourceIndexes.length !== 1) throw Error('Desktop frame source map mismatch')
map.sourcesContent[sourceIndexes[0]] = patchDesktopFrame(map.sourcesContent[sourceIndexes[0]], { source: true })
const markdownOriginals = {}
for (const [file, expected] of Object.entries(markdownPin.hashes)) {
  markdownOriginals[file] = await readFile(join(source, appPath, markdownPath, file))
  if (hash(markdownOriginals[file]) !== expected) throw Error(`Unapproved native Markdown bytes: ${file}`)
}
const markdownManifest = JSON.parse(markdownOriginals['package.json'])
if (markdownManifest.name !== markdownPin.package || markdownManifest.version !== markdownPin.upstreamVersion) throw Error('Native Markdown identity mismatch')
const markdown = patchMarkdownResources(markdownOriginals['lib/index.js'].toString('utf8'))
await mkdir(destination) // atomic non-overwrite reservation
await cp(source, destination, { recursive: true, errorOnExist: true, force: false,
  filter: async path => {
    if ((await lstat(path)).isSymbolicLink()) throw Error('Refusing redirected installation entry')
    return true
  },
})
const output = join(destination, appPath)
for (const path of [output, join(output, 'lib')]) {
  if ((await realpath(path)).toLowerCase() !== path.toLowerCase()) throw Error('Candidate package is redirected')
}
await writeFile(join(output, 'lib/client.js'), client)
await writeFile(join(output, 'lib/client.js.map'), JSON.stringify(map))
await writeFile(join(output, markdownPath, 'lib/index.js'), markdown)
for (const [file, expected] of Object.entries(pin.hashes)) {
  if (hash(await readFile(join(source, appPath, file))) !== expected) throw Error(`Protected installation changed: ${file}`)
}
for (const [file, expected] of Object.entries(markdownPin.hashes)) {
  if (hash(await readFile(join(source, appPath, markdownPath, file))) !== expected) throw Error(`Protected native Markdown changed: ${file}`)
}
await writeFile(join(destination, 'oasis-markdown-patch.json'), JSON.stringify({ ...markdownPin, outputSha256: hash(markdown), createdAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx' })
const evidence = { upstreamVersion: pin.upstreamVersion, patchRevision: pin.patchRevision, source, destination,
  sourceHashes: pin.hashes, outputHashes: { 'lib/client.js': hash(client), 'lib/client.js.map': hash(JSON.stringify(map)) },
  sourceMap: 'CSS-only patch preserves generated and source line counts; source content updated', createdAt: new Date().toISOString() }
await writeFile(join(destination, 'oasis-patch.json'), JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify(evidence))
console.log(JSON.stringify(await assembleStage3Sidebar()))
console.log(JSON.stringify(await assembleStage3WebMarkdown(source)))
