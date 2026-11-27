// Evidence-only mapping to the actual unpacked candidate. No implementation
// stubs, installs or fallback to the original business source are permitted.
import { registerHooks } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
const evidence = dirname(fileURLToPath(import.meta.url))
const root = resolve(evidence, '../../..')
const proof = JSON.parse(readFileSync(join(evidence, 'package-member-inspection.json')))
const original = pathToFileURL(join(root, 'packages/oasis-professional-service/src') + '/').href
const archived = pathToFileURL(join(proof.unpack, 'src') + '/').href
const peerParent = new URL('index.js', original).href
const observed = new Set()
registerHooks({ resolve(specifier, context, next) {
  const local = /^(file:|\.|\/)/.test(specifier)
  const candidate = local ? new URL(specifier, context.parentURL ?? import.meta.url).href : null
  const mapped = candidate?.startsWith(original) ? archived + candidate.slice(original.length) : specifier
  const peerContext = !local && !specifier.startsWith('node:') && context.parentURL?.startsWith(archived)
    ? { ...context, parentURL: peerParent } : context
  const result = next(mapped, peerContext)
  if (result.url.startsWith(original)) throw Error('Original business source fallback forbidden')
  if (result.url.startsWith(archived)) observed.add(result.url)
  return result
} })
process.on('exit', () => writeFileSync(join(evidence, `archive-loads-${process.pid}.json`), JSON.stringify({
  process: process.pid, original, archived, loaded: [...observed].sort(),
  peers: 'existing fixed development dependencies; no new materialization', implementationStubs: false,
}, null, 2) + '\n'))
