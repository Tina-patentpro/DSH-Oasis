import { generationSourceSchema } from './generation-contract.js'
import { writebackRelativePathSchema } from './workbench-contract.js'

export function normalizeGenerationPreferences(value = {}) {
  const defaultGenerationSource = generationSourceSchema.parse(value.defaultGenerationSource ?? 'local-skill')
  const raw = value.outputDirectoryPrefix ?? ''
  if (typeof raw !== 'string' || raw.length > 200) throw new TypeError('Invalid output directory prefix')
  const outputDirectoryPrefix = raw.trim().replaceAll('/', '\\')
  if (outputDirectoryPrefix) writebackRelativePathSchema.parse(outputDirectoryPrefix)
  return Object.freeze({ defaultGenerationSource, outputDirectoryPrefix })
}
