// Evidence-only resolution mapping: execute the actual unpacked candidate while
// retaining the same test inputs and fixed ancestor peer dependency resolution.
import { registerHooks } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve, join } from 'node:path'
const evidence = dirname(fileURLToPath(import.meta.url))
const root = resolve(evidence, '../../..')
const proof = JSON.parse(readFileSync(process.env.OASIS_ZERO_PREVIEW_ARCHIVE_INSPECTION ?? join(evidence, 'package-member-inspection.json'), 'utf8'))
const original = pathToFileURL(join(root, 'packages/oasis-professional-service/src') + '/').href
const archived = pathToFileURL(join(proof.unpack, 'src') + '/').href
const observed = new Set()
registerHooks({ resolve(specifier, context, next) {
  let candidate
  if (specifier.startsWith('file:') || specifier.startsWith('.') || specifier.startsWith('/')) {
    candidate = new URL(specifier, context.parentURL ?? import.meta.url).href
  }
  const result = next(candidate?.startsWith(original) ? archived + candidate.slice(original.length) : specifier, context)
  if (result.url.startsWith(original)) throw Error('Original source fallback is forbidden in the archive proof')
  if (result.url.startsWith(archived)) observed.add(result.url)
  return result
} })
process.on('exit', () => writeFileSync(join(evidence, `archive-loads-${process.pid}.json`), JSON.stringify({
  process: process.pid, original, archived, loaded: [...observed].sort(), business_implementation_replaced: false,
  note: 'Only source URL resolution was changed; no business function or fixed peer was stubbed by this loader',
}, null, 2) + '\n'))
