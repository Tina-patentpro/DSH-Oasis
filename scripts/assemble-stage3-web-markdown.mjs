import { readFile, realpath, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { patchMarkdownWebBundle } from '../patches/dsh-0.1.2-rc.1/markdown-resources.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packagePath = 'resources/app.asar.unpacked/node_modules/@deepseek-ai/dsh-web-frontend'
const candidate = join(root, '.dsh-test/stage3-desktop-app', packagePath)
const pin = JSON.parse(await readFile(new URL('../patches/dsh-0.1.2-rc.1/web-baseline.json', import.meta.url)))
const hash = bytes => createHash('sha256').update(bytes).digest('hex')

export async function assembleStage3WebMarkdown(installation = 'C:/Users/TinaD/AppData/Local/Programs/DSH Desktop') {
  const source = resolve(installation, packagePath)
  const originals = {}
  for (const [file, expected] of Object.entries(pin.hashes)) {
    for (const base of [source, candidate]) {
      const path = join(base, file)
      if ((await realpath(path)).toLowerCase() !== path.toLowerCase()) throw Error('Redirected web Markdown package')
      const bytes = await readFile(path)
      if (hash(bytes) !== expected) throw Error('Unapproved web Markdown input: ' + file)
      if (base === source) originals[file] = bytes
    }
  }
  const manifest = JSON.parse(originals['package.json'])
  if (manifest.name !== pin.package || manifest.version !== pin.upstreamVersion) throw Error('Web package identity mismatch')
  const bundle = patchMarkdownWebBundle(originals['dist/assets/index-Df-65__b.js'].toString('utf8'))
  const bundleHash = hash(bundle)
  const name = `index-oasis-${bundleHash.slice(0, 16)}.js`
  const originalHtml = originals['dist/index.html'].toString('utf8')
  if (originalHtml.split('./assets/index-Df-65__b.js').length !== 2) throw Error('Web entry mismatch')
  const html = originalHtml.replace('./assets/index-Df-65__b.js', './assets/' + name)
  // A distinct content-named entry prevents an old cached native module hiding the capability.
  await writeFile(join(candidate, 'dist/assets', name), bundle, { flag: 'wx' })
  await writeFile(join(candidate, 'dist/index.html'), html)
  for (const [file, expected] of Object.entries(pin.hashes)) {
    if (hash(await readFile(join(source, file))) !== expected) throw Error('Protected web package changed')
  }
  const evidence = { ...pin, entry: name, outputSha256: bundleHash, htmlSha256: hash(html), createdAt: new Date().toISOString() }
  await writeFile(join(candidate, 'oasis-patch.json'), JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' })
  return evidence
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await assembleStage3WebMarkdown()))
