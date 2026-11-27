import { z } from 'zod'

const sha=z.string().regex(/^[a-f0-9]{64}$/)
const label=z.string().trim().min(1).max(256)
export const v340NativeRouteSchema=z.object({provider:label,model:label,reasoningEffort:z.string().trim().min(1).max(64).optional()}).strict()
export const v340CandidateConfirmationSchema=z.object({sessionId:label,confirmed:z.literal(true),sha256:sha}).strict()
// This is an injected candidate receipt, never evidence of a real model acceptance run.
const legacyCandidateSchema=z.object({version:z.literal('v340-native-candidate-1'),executionScope:z.literal('injected-only'),
  dispatchEnabled:z.literal(false),realCallVerified:z.literal(false),sessionId:label,route:v340NativeRouteSchema,
  inputSHA256:sha,resourceSHA256:sha,instructionSHA256:sha,systemSHA256:sha,preparedSHA256:sha,requestSHA256:sha,
  confirmationSHA256:sha,confirmedRevision:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  budget:z.object({maxCalls:z.literal(1),usedCalls:z.literal(1)}).strict(),admissionSHA256:sha,
}).strict()
export const v340NativeCandidateSchema=z.discriminatedUnion('version',[
  legacyCandidateSchema,
  legacyCandidateSchema.extend({version:z.literal('v340-native-candidate-2'),nodeId:label,
    workspaceRoot:z.string().min(1).max(4096).refine(v=>!v.includes('\0')),contextSHA256:sha}).strict(),
  legacyCandidateSchema.extend({version:z.literal('v340-native-candidate-3'),nodeId:z.literal('Flow-2-6'),
    workspaceRoot:z.string().min(1).max(4096).refine(v=>!v.includes('\0')),contextSHA256:sha,
    businessSkillId:z.literal('m06-claims-draft'),businessSkillVersion:z.enum(['0.1.2','0.1.3']),
    businessManifestSHA256:sha,businessResourceSHA256:sha}).strict(),
])
