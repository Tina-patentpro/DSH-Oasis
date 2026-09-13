import { createHash } from 'node:crypto'
import { z } from 'zod'
import { CLAIMS_V2_SCHEMA_VERSION, claimsV2DraftValuesSchema } from './generation-contract.js'
import { normalizeOasisFileUrl, normalizeOasisDownloadOrigin } from './oasis-origin-policy.js'

const snapshotSchema = z.object({
  inputSchemaVersion: z.literal(CLAIMS_V2_SCHEMA_VERSION),
  values: claimsV2DraftValuesSchema,
}).strict()

function readValues(snapshot) {
  const { values } = snapshotSchema.parse(snapshot)
  if (!values.disclosure_text.trim()) throw new TypeError('Technical disclosure is required')
  if (!Object.values(values).every(value => value.isWellFormed())) {
    throw new TypeError('Draft contains invalid Unicode')
  }
  return values
}

// Pure Host preparation only; upload and execution remain owned by the existing service.
export function prepareClaimsApiDocument(snapshot) {
  const values = readValues(snapshot)
  const bytes = new TextEncoder().encode(values.disclosure_text)
  return {
    fileName: 'technical-disclosure.txt', mediaType: 'text/plain;charset=utf-8', bytes,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }
}

export function buildClaimsApiDocumentInputs(snapshot, uploadedUrl, allowedOrigins, environmentKind = 'non-production') {
  const values = readValues(snapshot)
  const url = normalizeOasisFileUrl(uploadedUrl, environmentKind)
  if (!Array.isArray(allowedOrigins) || !allowedOrigins.map(origin => normalizeOasisDownloadOrigin(origin, 'download', environmentKind)).includes(new URL(url).origin)) {
    throw new TypeError('Upload URL origin is not approved')
  }
  const instructions = [
    ['撰写要求', values.claim_requirements_text], ['用户指令', values.user_input],
  ].filter(([, value]) => value.length > 0).map(([title, value]) => `【${title}】\n${value}`).join('\n\n')
  return {
    Technical_Disclosure_file: { type: 'document', transfer_method: 'remote_url', url },
    drawings_explain_TD: values.drawings_text,
    User_input: instructions,
  }
}
