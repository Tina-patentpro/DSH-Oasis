import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('../../', import.meta.url))
const runtime = join(root, '.dsh-test/mac-dev')
const inputs = {
  native: ['dsh-client-ui-primitives', 'lib/index.js', '0.2.0-rc.2.oasis-mac.1'],
  web: ['dsh-web-frontend', 'dist/assets/index-5SrrfWpU.js', '0.2.0-rc.2.oasis-mac.1'],
  sidebar: ['dsh-better-sidebar', 'lib/client.js', '0.24.1'],
}

export function readMacComponentInput(name) {
  if (!Object.hasOwn(inputs, name)) throw Error('Unknown fixed Mac test component')
  const admission = JSON.parse(readFileSync(join(runtime, 'evidence/admission.json'), 'utf8'))
  const [directory, entry, version] = inputs[name]
  const packageRoot = join(runtime, 'packages', directory)
  const packageFile = join(packageRoot, 'package.json')
  const file = join(packageRoot, entry)
  for (const path of [packageFile, file]) {
    const expected = admission.files[path]
    if (!/^[a-f0-9]{64}$/.test(expected ?? '')
      || createHash('sha256').update(readFileSync(path)).digest('hex') !== expected) {
      throw Error('Fixed Mac component drift or missing pin: ' + path)
    }
  }
  if (JSON.parse(readFileSync(packageFile, 'utf8')).version !== version) throw Error('Fixed Mac component version mismatch')
  return { root, packageRoot, packageFile, file, source: readFileSync(file, 'utf8') }
}

export function nativeMarkdownTestPackage() {
  // Test-only dependencies from this exact upstream tag/lock, never the installed Desktop.
  const source = join(root, '.local/test-runtimes/dsh-0.2.0-rc.2-639ed015/deepseek-harness-639ed015397290b3745d163aafe02ffee4aa3f84')
  const lock = join(source, 'pnpm-lock.yaml')
  if (createHash('sha256').update(readFileSync(lock)).digest('hex') !== '80fe05eae33582ae26839afd05f1965f9b0e4be11034ddf9797af6085d5ba9b1') {
    throw Error('Fixed native Markdown test dependency lock drift')
  }
  const builtInputs = {
    'packages/client/store/lib/index.js': '1aa492e702b1ec955158e7ff8f99bb966afd3aa880f6e76a9f486ac31d0d679a',
    'packages/util/code-language/lib/index.js': '0b885747a127b7fef510b0ed0d1b3abcc755ea6ef0567b21f36ab0dff3cc6a79',
    'packages/util/workspace-path/lib/index.js': '69063d4119f8a2a68295ae2dfb8985e9698b5b579bdeb7d08d29b257c1a4e120',
  }
  for (const [relative, expected] of Object.entries(builtInputs)) {
    if (createHash('sha256').update(readFileSync(join(source, relative))).digest('hex') !== expected) throw Error('Native test support module drift: ' + relative)
  }
  return { source, packageFile: join(source, 'packages/client/ui-primitives/package.json') }
}
