import { z } from 'zod'

const finishKinds = ['stop', 'max-tokens', 'tool-calls', 'error', 'aborted']
const failureStages = ['preparation', 'stream', 'result-contract']
const tokenFields = ['inputTokens', 'outputTokens', 'totalTokens', 'cacheReadTokens', 'reasoningTokens']
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
export const localExecutionSummarySchema = z.object({
  failureStage: z.enum(failureStages).optional(),
  finishKind: z.enum(finishKinds).optional(),
  usage: z.object(Object.fromEntries(tokenFields.map(key => [key, count.optional()]))).strict().optional(),
}).strict()

function ownValue(object, key) {
  try { return Object.getOwnPropertyDescriptor(object, key)?.value }
  catch { return undefined }
}

// Copy only fixed enums and safe counters; never evaluate metadata getters or retain raw payloads.
export function normalizeLocalExecutionSummary(value) {
  const summary = {}
  const finishKind = ownValue(value, 'finishKind')
  const failureStage = ownValue(value, 'failureStage')
  if (finishKinds.includes(finishKind)) summary.finishKind = finishKind
  if (failureStages.includes(failureStage)) summary.failureStage = failureStage
  const usage = ownValue(value, 'usage')
  const counters = {}
  for (const key of tokenFields) {
    const number = ownValue(usage, key)
    if (Number.isSafeInteger(number) && number >= 0) counters[key] = number
  }
  if (Object.keys(counters).length) summary.usage = counters
  return summary
}
