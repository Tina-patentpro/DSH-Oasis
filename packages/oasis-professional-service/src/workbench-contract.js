import { z } from 'zod'

import { isCanonicalOasisNonProductionOrigin, isSafeOasisFileUrl } from './oasis-origin-policy.js'
import { CLAIMS_TEMPLATE_ID, claimsDraftValuesSchema, claimsV2DraftValuesSchema, claimsInputVersion, claimsUpstreamSnapshotSchema, generationDraftSchema, generationSourceSchema, hasPendingUnifiedRun, isUnifiedRun } from './generation-contract.js'

export const WORKBENCH_LIMITS = Object.freeze({
  maxTasksPerWorkspace: 32,
  maxInputRefsPerTask: 64,
  maxRunsPerTask: 8,
  maxRemoteExecutionsPerTask: 8,
  maxWritebacksPerRun: 8,
  maxResultItems: 64,
  maxWritebackFiles: 2,
  maxReviewNoteChars: 2000,
  maxArtifactBytes: 256 * 1024,
  maxJsonDepth: 8,
  maxJsonArrayItems: 1024,
  maxJsonObjectKeys: 256,
  maxJsonStringBytes: 256 * 1024,
  maxDraftBytes: 1024 * 1024,
})

const textEncoder = new TextEncoder()

function utf8Bytes(value) {
  return textEncoder.encode(value).byteLength
}

export const identifierSchema = z.string()
  .min(1)
  .max(256)
  .refine((value) => value.trim() === value, 'identifier must not have surrounding whitespace')

export const timestampSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false
  const epoch = Date.parse(value)
  return !Number.isNaN(epoch) && new Date(epoch).toISOString() === value
}, 'must be an ISO-8601 UTC timestamp with millisecond precision')

export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/, 'must be a lowercase SHA-256 hex digest')

export const workTypeSchema = z.enum(['technical-rd', 'cn-invention-patent'])

const workflowFieldBase = {
  fieldId: identifierSchema,
  label: z.string().min(1).max(200),
  description: z.string().max(1000),
  required: z.boolean(),
}

const textWorkflowFieldSchema = z.object({
  ...workflowFieldBase,
  control: z.enum(['short-text', 'long-text']),
  maxChars: z.number().int().positive().max(256 * 1024),
}).strict()

const stringListWorkflowFieldSchema = z.object({
  ...workflowFieldBase,
  control: z.literal('string-list'),
  maxItems: z.number().int().positive().max(256),
  itemMaxChars: z.number().int().positive().max(16 * 1024),
}).strict()

const selectWorkflowFieldSchema = z.object({
  ...workflowFieldBase,
  control: z.literal('select'),
  options: z.array(z.object({
    value: identifierSchema,
    label: z.string().min(1).max(200),
  }).strict()).min(1).max(64),
}).strict()

export const workflowFormFieldSchema = z.union([
  textWorkflowFieldSchema,
  stringListWorkflowFieldSchema,
  selectWorkflowFieldSchema,
])

export const workflowDefinitionSchema = z.object({
  workflowId: identifierSchema,
  workflowVersion: identifierSchema,
  workType: workTypeSchema,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  executionMode: z.enum(['local-mock', 'unified-text']),
  materialPolicy: z.object({
    acceptedExtensions: z.array(z.string().regex(/^\.[a-z0-9]+$/)).max(32),
    maxFiles: z.number().int().positive().max(256),
    maxFileBytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    contentReadMode: z.literal('metadata-only'),
  }).strict(),
  outputSections: z.array(identifierSchema).min(1).max(64),
  form: z.object({
    fields: z.array(workflowFormFieldSchema).max(64),
  }).strict().superRefine((value, ctx) => {
    const seen = new Set()
    for (const [index, field] of value.fields.entries()) {
      if (seen.has(field.fieldId)) {
        ctx.addIssue({ code: 'custom', path: ['fields', index, 'fieldId'], message: `duplicate field id: ${field.fieldId}` })
      }
      seen.add(field.fieldId)
    }
  }),
}).strict()

export const workflowCatalogResponseSchema = z.object({
  schemaVersion: z.literal(1),
  workflows: z.array(workflowDefinitionSchema).max(16),
  unifiedFixtureEnabled: z.boolean().optional(),
  localGenerationEnabled: z.boolean().optional(),
  localGenerationKind: z.enum(['native-offline', 'native-model']).nullable().optional(),
}).strict()

const jsonStringSchema = z.string().refine(
  (value) => utf8Bytes(value) <= WORKBENCH_LIMITS.maxJsonStringBytes,
  `JSON strings must not exceed ${WORKBENCH_LIMITS.maxJsonStringBytes} UTF-8 bytes`,
)

const jsonPrimitiveSchema = z.union([jsonStringSchema, z.number(), z.boolean(), z.null()])

function jsonObjectSchema(valueSchema) {
  return z.record(jsonStringSchema, valueSchema).superRefine((value, ctx) => {
    if (Object.keys(value).length > WORKBENCH_LIMITS.maxJsonObjectKeys) {
      ctx.addIssue({
        code: 'custom',
        message: `JSON objects must not exceed ${WORKBENCH_LIMITS.maxJsonObjectKeys} keys`,
      })
    }
  })
}

function createJsonValueSchema(depthRemaining) {
  if (depthRemaining === 0) return jsonPrimitiveSchema
  const childSchema = createJsonValueSchema(depthRemaining - 1)
  return z.union([
    jsonPrimitiveSchema,
    z.array(childSchema).max(WORKBENCH_LIMITS.maxJsonArrayItems),
    jsonObjectSchema(childSchema),
  ])
}

export const jsonValueSchema = createJsonValueSchema(WORKBENCH_LIMITS.maxJsonDepth)
export const jsonRootObjectSchema = jsonObjectSchema(jsonValueSchema)

export const projectMaterialReferenceSchema = z.object({
  referenceId: identifierSchema,
  kind: z.literal('project-file'),
  relativePath: z.string().min(1).max(1024),
  displayName: z.string().min(1).max(255),
  mediaType: z.string().min(1).max(128),
  sizeBytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  sha256: sha256Schema,
  observedAt: timestampSchema,
  confirmedAt: timestampSchema,
}).strict()

export const legacyMaterialReferenceSchema = z.object({
  referenceId: identifierSchema,
  kind: z.literal('legacy-v1'),
  legacyValue: jsonRootObjectSchema,
}).strict()

export const materialReferenceSchema = z.discriminatedUnion('kind', [
  projectMaterialReferenceSchema,
  legacyMaterialReferenceSchema,
])

export const writebackRelativePathSchema = z.string().min(1).max(1024).refine((value) => {
  if (
    value.includes('\0')
    || value.includes('/')
    || value.startsWith('\\')
    || /^[a-z]:/i.test(value)
  ) return false
  const segments = value.split('\\')
  return segments.every((segment) => {
    const stem = segment.split('.')[0].replace(/[ .]+$/, '')
    return segment.length > 0
      && segment.length <= 255
      && segment !== '.'
      && segment !== '..'
      && !/[\x00-\x1f<>:"|?*]/.test(segment)
      && !/[ .]$/.test(segment)
      && !/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(stem)
  })
}, 'must be a normalized safe relative Windows path')

export const writebackFileSchema = z.object({
  relativePath: writebackRelativePathSchema,
  sha256: sha256Schema,
  mediaType: z.string().min(1).max(128),
}).strict()

export const writebackRecordSchema = z.object({
  writebackId: identifierSchema,
  artifactId: identifierSchema,
  relativeDirectory: writebackRelativePathSchema,
  files: z.array(writebackFileSchema).length(WORKBENCH_LIMITS.maxWritebackFiles),
  reviewStatus: z.literal('approved'),
  committedAt: timestampSchema,
}).strict().superRefine((value, ctx) => {
  const prefix = `${value.relativeDirectory.toLocaleLowerCase('en-US')}\\`
  const paths = new Set()
  const mediaTypes = new Set()
  for (const [index, file] of value.files.entries()) {
    const path = file.relativePath.toLocaleLowerCase('en-US')
    if (!path.startsWith(prefix)) {
      ctx.addIssue({ code: 'custom', path: ['files', index, 'relativePath'], message: 'writeback file must be inside its relative directory' })
    }
    if (paths.has(path)) {
      ctx.addIssue({ code: 'custom', path: ['files', index, 'relativePath'], message: 'writeback file paths must be unique' })
    }
    paths.add(path)
    mediaTypes.add(file.mediaType)
  }
  if (!mediaTypes.has('text/markdown') || !mediaTypes.has('application/json')) {
    ctx.addIssue({ code: 'custom', path: ['files'], message: 'writeback must contain Markdown and JSON files' })
  }
})

const writebackAbsolutePathSchema = z.string().min(1).max(32 * 1024).refine(
  (value) => /^(?:[a-z]:\\|\\\\[^\\]+\\[^\\]+\\)/i.test(value),
  'must be an absolute Windows path',
)

const transientWritebackFileSchema = writebackFileSchema.extend({
  absolutePath: writebackAbsolutePathSchema,
  sizeBytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
}).strict()

export const writebackRecoveryManifestSchema = z.object({
  schemaVersion: z.literal(1),
  workspaceId: identifierSchema,
  taskId: identifierSchema,
  runId: identifierSchema,
  artifactId: identifierSchema,
  relativeDirectory: writebackRelativePathSchema,
  files: z.array(writebackFileSchema).length(WORKBENCH_LIMITS.maxWritebackFiles),
}).strict()

const writebackTransientManifestSchema = writebackRecoveryManifestSchema.extend({
  absoluteTarget: writebackAbsolutePathSchema,
  files: z.array(transientWritebackFileSchema).length(WORKBENCH_LIMITS.maxWritebackFiles),
  expiresAt: timestampSchema,
}).strict().superRefine((value, ctx) => {
  const prefix = `${value.absoluteTarget.toLocaleLowerCase('en-US')}\\`
  for (const [index, file] of value.files.entries()) {
    if (!file.absolutePath.toLocaleLowerCase('en-US').startsWith(prefix)) {
      ctx.addIssue({ code: 'custom', path: ['files', index, 'absolutePath'], message: 'manifest file must be inside its absolute target' })
    }
  }
})

export const writebackPrepareResponseSchema = z.object({
  confirmationToken: z.string().min(1).max(512),
  manifest: writebackTransientManifestSchema,
}).strict()

const resultSectionSchema = z.object({
  sectionId: identifierSchema,
  title: z.string().min(1).max(200),
  body: jsonStringSchema,
}).strict()

const artifactBodySchema = z.string().refine(
  (value) => utf8Bytes(value) <= WORKBENCH_LIMITS.maxArtifactBytes,
  `artifact body must not exceed ${WORKBENCH_LIMITS.maxArtifactBytes} UTF-8 bytes`,
)

const artifactSchema = z.object({
  artifactId: z.string().regex(/^sha256:[a-f0-9]{64}$/, 'artifactId must be content-addressed'),
  suggestedFileName: z.string().min(1).max(255),
  mediaType: z.literal('text/markdown'),
  body: artifactBodySchema,
  sha256: sha256Schema,
}).strict().superRefine((value, ctx) => {
  if (value.artifactId !== `sha256:${value.sha256}`) {
    ctx.addIssue({ code: 'custom', path: ['artifactId'], message: 'artifactId must match artifact sha256' })
  }
})

const reviewSchema = z.object({
  status: z.enum(['not-reviewed', 'changes-requested', 'approved']),
  note: z.string().max(WORKBENCH_LIMITS.maxReviewNoteChars),
  updatedAt: timestampSchema,
}).strict()

function enforceReviewAndWritebacks(value, ctx, { blocked = false } = {}) {
  if (blocked && value.review.status === 'approved') {
    ctx.addIssue({ code: 'custom', path: ['review', 'status'], message: 'blocked results cannot be approved' })
  }
  if (value.review.status === 'changes-requested' && value.review.note.trim().length === 0) {
    ctx.addIssue({ code: 'custom', path: ['review', 'note'], message: 'changes-requested review requires a note' })
  }
  for (const [index, writeback] of value.writebacks.entries()) {
    if (writeback.artifactId !== value.result.artifact.artifactId) {
      ctx.addIssue({
        code: 'custom',
        path: ['writebacks', index, 'artifactId'],
        message: 'writeback artifactId must belong to the run artifact',
      })
    }
  }
}

export const localRunSnapshotSchema = z.object({
  runId: identifierSchema,
  requestKey: identifierSchema,
  mode: z.literal('local-mock'),
  mockVersion: z.literal('1'),
  status: z.literal('completed'),
  workflowId: identifierSchema,
  workflowVersion: identifierSchema,
  inputSnapshot: z.object({
    formValues: jsonRootObjectSchema,
    inputRefs: z.array(projectMaterialReferenceSchema).max(WORKBENCH_LIMITS.maxInputRefsPerTask),
    sha256: sha256Schema,
    capturedAt: timestampSchema,
  }).strict(),
  result: z.object({
    contentStatus: z.enum(['warning', 'blocked']),
    sections: z.array(resultSectionSchema).min(1).max(WORKBENCH_LIMITS.maxResultItems),
    risks: z.array(jsonStringSchema).max(WORKBENCH_LIMITS.maxResultItems),
    questions: z.array(jsonStringSchema).max(WORKBENCH_LIMITS.maxResultItems),
    disclaimer: z.string().min(1).max(4000),
    artifact: artifactSchema,
  }).strict(),
  review: reviewSchema,
  writebacks: z.array(writebackRecordSchema).max(WORKBENCH_LIMITS.maxWritebacksPerRun),
  createdAt: timestampSchema,
  completedAt: timestampSchema,
}).strict().superRefine((value, ctx) => {
  enforceReviewAndWritebacks(value, ctx, { blocked: value.result.contentStatus === 'blocked' })
})

const httpUrlSchema = z.string().min(1).max(4096).refine((value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}, 'must be an absolute HTTP(S) URL')

const httpOriginSchema = httpUrlSchema.refine(
  isCanonicalOasisNonProductionOrigin,
  'must contain only a non-production HTTP(S) origin',
)

const nonProductionHttpUrlSchema = httpUrlSchema.refine(
  isSafeOasisFileUrl,
  'must be a non-production file URL without credentials, query or fragment',
)

export const oasisRemoteExecutionStatusSchema = z.enum([
  'prepared',
  'uploading',
  'ready-to-submit',
  'submitting',
  'submission-unknown',
  'waiting-result',
  'wait-stopped',
  'auth-required',
  'completed',
  'failed',
])

const OASIS_REMOTE_TERMINAL_STATUSES = new Set(['completed', 'failed'])

export function isOasisRemoteExecutionUnresolved(execution) {
  return !OASIS_REMOTE_TERMINAL_STATUSES.has(execution?.status)
}

const oasisServiceSummarySchema = z.object({
  categoryId: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  categoryName: z.string().min(1).max(200),
  group: z.string().max(200),
  description: z.string().max(4000),
  apiId: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  apiEndpoint: identifierSchema,
  apiProcess: z.string().max(4000),
  apiDescription: z.string().max(4000),
}).strict()

const oasisServiceFieldSchema = z.object({
  fieldId: identifierSchema,
  label: z.string().min(1).max(200),
  description: z.string().max(4000),
  type: identifierSchema,
  control: z.enum(['short-text', 'long-text', 'single-file', 'text-output', 'file-output']),
}).strict()

export const oasisProfessionalBootstrapSchema = z.object({
  environmentKind: z.literal('non-production'),
  remoteEnabled: z.boolean(),
  credentialConfigured: z.boolean(),
  balance: z.number().nonnegative().finite().nullable(),
  services: z.array(oasisServiceSummarySchema).max(256),
  folders: z.array(z.object({
    id: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    name: z.string().min(1).max(200),
  }).strict()).max(1000),
}).strict()

export const oasisProfessionalDetailSchema = z.object({
  id: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  name: identifierSchema,
  apiType: z.literal('Workflow'),
  price: z.number().nonnegative().finite(),
  modelName: z.string().max(200),
  executionMode: z.literal('sync'),
  inputFields: z.array(oasisServiceFieldSchema).max(128),
  outputFields: z.array(oasisServiceFieldSchema).max(128),
  schemaHash: sha256Schema,
}).strict()

export const oasisProfessionalStopResponseSchema = z.object({ stopped: z.boolean() }).strict()

const oasisRunningWaterItemSchema = z.object({
  id: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  linkId: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  type: z.string().min(1).max(100).refine((value) => value.trim().length > 0),
  money: z.number().finite(),
  balance: z.number().finite(),
  createTime: z.string().min(1).max(100).nullable().default(null),
}).strict()

export const oasisRunningWaterPageSchema = z.object({
  total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  items: z.array(oasisRunningWaterItemSchema),
}).strict().refine((value) => value.total >= value.items.length, 'total must cover the returned page')

export const oasisRunningWaterObservationSchema = z.object({
  status: z.enum(['observed', 'not-observed', 'unverifiable']),
  associationStatus: z.literal('unverified'),
  runId: identifierSchema,
  recordId: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
  scope: z.literal('current-page'),
  total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
  item: oasisRunningWaterItemSchema.nullable(),
  observedAt: timestampSchema,
}).strict().superRefine((value, ctx) => {
  if (value.status === 'observed' && (value.recordId === null || value.item === null)) {
    ctx.addIssue({ code: 'custom', path: ['item'], message: 'observed running water requires one correlated item' })
  }
  if (value.status === 'observed' && (value.item?.linkId !== value.recordId || value.total === null || value.total < 1)) {
    ctx.addIssue({ code: 'custom', path: ['item'], message: 'observed requires a matching candidate and a nonempty page' })
  }
  if (value.status === 'not-observed' && (value.recordId === null || value.item !== null)) {
    ctx.addIssue({ code: 'custom', path: ['item'], message: 'not-observed running water requires a record id and no item' })
  }
  if (value.status === 'not-observed' && value.total === null) {
    ctx.addIssue({ code: 'custom', path: ['total'], message: 'not-observed requires a validated page total' })
  }
  if (value.status === 'unverifiable' && (value.recordId !== null || value.total !== null || value.item !== null)) {
    ctx.addIssue({ code: 'custom', path: ['status'], message: 'unverifiable running water cannot claim remote observations' })
  }
})

const oasisProviderSnapshotSchema = z.object({
  apiBaseOrigin: httpOriginSchema,
  apiId: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  apiEndpoint: identifierSchema,
  apiProcess: z.string().max(4000),
  folderId: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  price: z.number().nonnegative().finite(),
}).strict()

export const oasisRemoteExecutionSchema = z.object({
  executionId: identifierSchema,
  recordId: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable().optional(),
  recordIdSource: z.literal('create').nullable().optional(),
  requestKey: identifierSchema,
  status: oasisRemoteExecutionStatusSchema,
  inputSha: sha256Schema,
  formValues: jsonRootObjectSchema,
  apiBaseOrigin: httpOriginSchema,
  serviceSnapshot: z.object({
    apiId: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    apiEndpoint: identifierSchema,
    apiProcess: z.string().max(4000),
    schemaHash: sha256Schema,
  }).strict(),
  folderSnapshot: z.object({
    folderId: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    folderName: z.string().min(1).max(200),
  }).strict(),
  priceSnapshot: z.object({
    price: z.number().nonnegative().finite(),
    balance: z.number().nonnegative().finite(),
  }).strict(),
  materialSnapshots: z.array(projectMaterialReferenceSchema).max(WORKBENCH_LIMITS.maxInputRefsPerTask),
  uploadedFiles: z.array(z.object({
    fieldId: identifierSchema,
    referenceId: identifierSchema,
    url: nonProductionHttpUrlSchema,
    sha256: sha256Schema,
    uploadedAt: timestampSchema,
  }).strict()).max(WORKBENCH_LIMITS.maxInputRefsPerTask),
  safeError: z.object({
    code: identifierSchema,
    message: z.string().min(1).max(1000),
  }).strict().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  submittedAt: timestampSchema.nullable(),
  completedAt: timestampSchema.nullable(),
}).strict().superRefine((value, ctx) => {
  if (value.recordIdSource === 'create' && !Number.isSafeInteger(value.recordId)) {
    ctx.addIssue({ code: 'custom', path: ['recordId'], message: 'create provenance requires a record id' })
  }
  if (value.status === 'completed') {
    if (value.completedAt === null) ctx.addIssue({ code: 'custom', path: ['completedAt'], message: 'completed execution requires completedAt' })
    if (value.submittedAt === null) ctx.addIssue({ code: 'custom', path: ['submittedAt'], message: 'completed execution requires submittedAt' })
    if (value.safeError !== null) ctx.addIssue({ code: 'custom', path: ['safeError'], message: 'completed execution cannot retain an error' })
  }
  if (['submission-unknown', 'wait-stopped', 'auth-required', 'failed'].includes(value.status) && value.safeError === null) {
    ctx.addIssue({ code: 'custom', path: ['safeError'], message: `${value.status} execution requires a safe error` })
  }
})

export const oasisRemoteRunSnapshotSchema = z.object({
  runId: identifierSchema,
  requestKey: identifierSchema,
  mode: z.literal('oasis-legacy'),
  status: z.literal('completed'),
  executionId: identifierSchema,
  providerSnapshot: oasisProviderSnapshotSchema,
  inputSnapshot: z.object({
    formValues: jsonRootObjectSchema,
    inputRefs: z.array(projectMaterialReferenceSchema).max(WORKBENCH_LIMITS.maxInputRefsPerTask),
    sha256: sha256Schema,
    capturedAt: timestampSchema,
  }).strict(),
  result: z.object({
    answerText: jsonStringSchema,
    fileUrls: z.array(nonProductionHttpUrlSchema).max(WORKBENCH_LIMITS.maxResultItems),
    fileStatus: z.literal('undownloaded-unverified'),
    responseSha: sha256Schema,
    artifact: artifactSchema,
  }).strict(),
  review: reviewSchema,
  writebacks: z.array(writebackRecordSchema).max(WORKBENCH_LIMITS.maxWritebacksPerRun),
  createdAt: timestampSchema,
  completedAt: timestampSchema,
}).strict().superRefine((value, ctx) => enforceReviewAndWritebacks(value, ctx))

export const runSnapshotSchema = z.discriminatedUnion('mode', [
  localRunSnapshotSchema,
  oasisRemoteRunSnapshotSchema,
])

export const unifiedRunSnapshotSchema = z.object({
  runId: identifierSchema, requestKey: identifierSchema,
  mode: z.literal('unified-fixture'), evidenceKind: z.literal('synthetic'), fixtureVersion: z.literal('1'),
  source: generationSourceSchema, inputSchemaVersion: z.enum(['1', 'claims-disclosure-2']),
  workflowId: z.literal(CLAIMS_TEMPLATE_ID), workflowVersion: z.enum(['1', '2']),
  compositionVersion: z.literal('2').optional(), workflowRunUid: z.string().uuid().optional(),
  status: z.enum(['prepared', 'completed', 'failed', 'stopped']),
  parentRunId: identifierSchema.nullable(),
  inputSnapshot: z.object({ formValues: z.union([claimsDraftValuesSchema, claimsV2DraftValuesSchema]), inputRefs: z.array(z.never()).length(0),
    upstreamSnapshot: claimsUpstreamSnapshotSchema.optional(),
    sha256: sha256Schema, capturedAt: timestampSchema }).strict(),
  result: z.object({ contentStatus: z.literal('warning'), riskAssessment: z.literal('not-assessed'),
    questionAssessment: z.literal('not-assessed'), artifact: artifactSchema }).strict().nullable(),
  review: reviewSchema,
  writebacks: z.array(writebackRecordSchema).max(WORKBENCH_LIMITS.maxWritebacksPerRun),
  createdAt: timestampSchema, completedAt: timestampSchema.nullable(),
}).strict().superRefine((run, ctx) => {
  const v2 = run.workflowVersion === '2'
  if (Boolean(run.compositionVersion) !== Boolean(run.workflowRunUid) || run.compositionVersion && !v2
    || !run.compositionVersion && run.inputSnapshot.upstreamSnapshot && run.inputSnapshot.upstreamSnapshot.status !== 'missing') {
    ctx.addIssue({ code: 'custom', message: 'cumulative composition identity mismatch' })
  }
  if (run.inputSchemaVersion !== claimsInputVersion(run.workflowVersion)
    || !(v2 ? claimsV2DraftValuesSchema : claimsDraftValuesSchema).safeParse(run.inputSnapshot.formValues).success
    || v2 !== (run.inputSnapshot.upstreamSnapshot !== undefined)) {
    ctx.addIssue({ code: 'custom', message: 'generation input and workflow contract mismatch' })
  }
  if (run.status === 'completed') {
    if (run.result === null || run.completedAt === null) {
      ctx.addIssue({ code: 'custom', message: 'completed generation requires an artifact and completion time' })
    } else enforceReviewAndWritebacks(run, ctx)
  } else if (run.result !== null || run.review.status !== 'not-reviewed' || run.writebacks.length || run.parentRunId !== null) {
    ctx.addIssue({ code: 'custom', message: 'incomplete generation cannot contain result, edits, review or writebacks' })
  }
  if ((run.status === 'prepared') !== (run.completedAt === null)) {
    ctx.addIssue({ code: 'custom', message: 'prepared and terminal completion time mismatch' })
  }
})

export const dshLocalRunSnapshotSchema = unifiedRunSnapshotSchema.safeExtend({
  mode: z.literal('dsh-local'), source: z.literal('local-skill'), evidenceKind: z.enum(['native-offline', 'native-model']),
  fixtureVersion: z.never().optional(), executionVersion: z.enum(['1', '2']),
  status: z.enum(['prepared', 'completed', 'failed', 'unknown']),
  failureCode: z.enum(['GENERATION_FAILED', 'ABORTED', 'TIMED_OUT', 'INVALID_OUTPUT', 'INVALID_INPUT',
    'MODEL_UNAVAILABLE', 'MODEL_LIMITED', 'INTERRUPTED']).nullable(),
  contextSnapshot: z.object({ sessionId: identifierSchema,
    route: z.object({ provider: identifierSchema, model: identifierSchema, reasoningEffort: z.string().min(1).max(64).optional() }).strict(),
    instructionVersion: identifierSchema, instructionSha256: sha256Schema,
    skillProvenance: z.object({ skillId: z.literal('flow-2-6'), skillVersion: z.enum(['public-4e2-1', '0.2.0']),
      inputSchemaVersion: z.literal('claims-disclosure-2'), outputSchemaVersion: z.literal('claims-cumulative-2'),
      executionContractVersion: z.literal('single-call-cumulative-1'), manifestSha256: sha256Schema, assemblySha256: sha256Schema,
    }).strict().optional(),
  }).strict(),
}).superRefine((run, ctx) => {
  if (run.evidenceKind === 'native-model' && (run.workflowVersion !== '2' || run.compositionVersion !== '2'
    || run.contextSnapshot.skillProvenance?.skillVersion !== '0.2.0')) {
    ctx.addIssue({ code: 'custom', message: 'real model requires formal contract 2 resources' })
  }
  if (run.executionVersion !== run.workflowVersion || (run.workflowVersion === '2') !== Boolean(run.contextSnapshot.skillProvenance)
    || (run.contextSnapshot.skillProvenance && run.contextSnapshot.instructionSha256 !== run.contextSnapshot.skillProvenance.assemblySha256)) {
    ctx.addIssue({ code: 'custom', message: 'local resource provenance contract mismatch' })
  }
  if ((['failed', 'unknown'].includes(run.status)) !== (run.failureCode !== null)) {
    ctx.addIssue({ code: 'custom', message: 'local failure requires a safe failure code' })
  }
})

export const localGenerationPreviewSchema = z.object({
  workspaceId: identifierSchema, taskId: identifierSchema, sessionId: identifierSchema,
  expectedRevision: z.number().int().nonnegative(), sha256: sha256Schema,
  route: z.object({ provider: identifierSchema, model: identifierSchema, reasoningEffort: z.string().min(1).max(64).optional() }).strict(),
  upstreamIncluded: z.boolean(), characterCount: z.number().int().nonnegative(),
}).strict()

export const conversationDraftResponseSchema = z.object({
  workspaceId: identifierSchema, taskId: identifierSchema, runId: identifierSchema,
  artifactId: z.string().regex(/^sha256:[a-f0-9]{64}$/), text: z.string().min(1).max(150000),
}).strict()

export const savedFileResponseSchema = z.object({
  workspaceId: identifierSchema, taskId: identifierSchema, runId: identifierSchema,
  artifactId: z.string().regex(/^sha256:[a-f0-9]{64}$/), writebackId: identifierSchema,
  absolutePath: writebackAbsolutePathSchema, kind: z.literal('current-file'),
}).strict()

export const professionalDraftSchema = z.object({
  selectedApiEndpoint: identifierSchema,
  selectedApiId: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  schemaHash: sha256Schema,
  formValues: jsonRootObjectSchema,
  folderId: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  updatedAt: timestampSchema,
}).strict()

const workbenchEditableTaskV3Schema = z.object({
  taskId: identifierSchema,
  title: z.string().min(1).max(200),
  workType: workTypeSchema.nullable(),
  workflowId: identifierSchema.nullable(),
  workflowVersion: identifierSchema.nullable(),
  formValues: jsonRootObjectSchema,
  professionalDraft: professionalDraftSchema.nullable(),
  activeRunId: identifierSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}).strict()

const workbenchTaskV3Schema = z.object({
  taskId: identifierSchema,
  title: z.string().min(1).max(200),
  workType: workTypeSchema.nullable(),
  workflowId: identifierSchema.nullable(),
  workflowVersion: identifierSchema.nullable(),
  formValues: jsonRootObjectSchema,
  professionalDraft: professionalDraftSchema.nullable(),
  inputRefs: z.array(materialReferenceSchema).max(WORKBENCH_LIMITS.maxInputRefsPerTask),
  activeRunId: identifierSchema.nullable(),
  runOrder: z.array(identifierSchema).max(WORKBENCH_LIMITS.maxRunsPerTask),
  runs: z.record(identifierSchema, runSnapshotSchema),
  remoteExecutionOrder: z.array(identifierSchema).max(WORKBENCH_LIMITS.maxRemoteExecutionsPerTask),
  remoteExecutions: z.record(identifierSchema, oasisRemoteExecutionSchema),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}).strict().superRefine((value, ctx) => {
  const referenceIds = new Set()
  for (const [index, reference] of value.inputRefs.entries()) {
    if (referenceIds.has(reference.referenceId)) {
      ctx.addIssue({ code: 'custom', path: ['inputRefs', index], message: `duplicate reference id: ${reference.referenceId}` })
    }
    referenceIds.add(reference.referenceId)
  }

  const seen = new Set()
  for (const [index, runId] of value.runOrder.entries()) {
    if (seen.has(runId)) {
      ctx.addIssue({ code: 'custom', path: ['runOrder', index], message: `duplicate run id: ${runId}` })
    }
    seen.add(runId)
    if (!(runId in value.runs)) {
      ctx.addIssue({ code: 'custom', path: ['runOrder', index], message: `missing run record: ${runId}` })
    }
  }
  const requestKeys = new Set()
  const remoteRunExecutionIds = new Set()
  for (const [mapKey, run] of Object.entries(value.runs)) {
    if (!seen.has(mapKey)) {
      ctx.addIssue({ code: 'custom', path: ['runs', mapKey], message: `orphan run record: ${mapKey}` })
    }
    if (run.runId !== mapKey) {
      ctx.addIssue({ code: 'custom', path: ['runs', mapKey, 'runId'], message: `run map key does not match runId: ${mapKey}` })
    }
    if (run.mode === 'local-mock' && (value.workflowId !== run.workflowId || value.workflowVersion !== run.workflowVersion)) {
      ctx.addIssue({ code: 'custom', path: ['runs', mapKey, 'workflowId'], message: 'run workflow must match task workflow' })
    }
    if (run.mode === 'oasis-legacy') {
      if (remoteRunExecutionIds.has(run.executionId)) {
        ctx.addIssue({ code: 'custom', path: ['runs', mapKey, 'executionId'], message: 'remote execution can produce only one completed run' })
      }
      remoteRunExecutionIds.add(run.executionId)
      const execution = value.remoteExecutions[run.executionId]
      if (!execution || execution.status !== 'completed') {
        ctx.addIssue({ code: 'custom', path: ['runs', mapKey, 'executionId'], message: 'remote run requires a completed Host execution' })
      } else {
        if (execution.requestKey !== run.requestKey || execution.inputSha !== run.inputSnapshot.sha256) {
          ctx.addIssue({ code: 'custom', path: ['runs', mapKey, 'executionId'], message: 'remote run must match its Host execution snapshot' })
        }
        const provider = run.providerSnapshot
        if (
          execution.serviceSnapshot.apiId !== provider.apiId
          || execution.apiBaseOrigin !== provider.apiBaseOrigin
          || execution.serviceSnapshot.apiEndpoint !== provider.apiEndpoint
          || execution.serviceSnapshot.apiProcess !== provider.apiProcess
          || execution.folderSnapshot.folderId !== provider.folderId
          || execution.priceSnapshot.price !== provider.price
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['runs', mapKey, 'providerSnapshot'],
            message: 'remote run provider must match its Host service, folder, and price snapshots',
          })
        }
      }
    }
    if (requestKeys.has(run.requestKey)) {
      ctx.addIssue({
        code: 'custom',
        path: ['runs', mapKey, 'requestKey'],
        message: `duplicate run request key: ${run.requestKey}`,
      })
    }
    requestKeys.add(run.requestKey)
  }
  if (value.activeRunId !== null && !seen.has(value.activeRunId)) {
    ctx.addIssue({ code: 'custom', path: ['activeRunId'], message: 'activeRunId must reference runOrder' })
  }

  const executionIds = new Set()
  const executionRequestKeys = new Set()
  let inFlight = 0
  const inFlightStatuses = new Set([
    'prepared',
    'uploading',
    'ready-to-submit',
    'submitting',
    'submission-unknown',
    'waiting-result',
    'wait-stopped',
    'auth-required',
  ])
  for (const [index, executionId] of value.remoteExecutionOrder.entries()) {
    if (executionIds.has(executionId)) {
      ctx.addIssue({ code: 'custom', path: ['remoteExecutionOrder', index], message: `duplicate remote execution id: ${executionId}` })
    }
    executionIds.add(executionId)
    if (!(executionId in value.remoteExecutions)) {
      ctx.addIssue({ code: 'custom', path: ['remoteExecutionOrder', index], message: `missing remote execution: ${executionId}` })
    }
  }
  for (const [mapKey, execution] of Object.entries(value.remoteExecutions)) {
    if (!executionIds.has(mapKey)) {
      ctx.addIssue({ code: 'custom', path: ['remoteExecutions', mapKey], message: `orphan remote execution: ${mapKey}` })
    }
    if (execution.executionId !== mapKey) {
      ctx.addIssue({ code: 'custom', path: ['remoteExecutions', mapKey, 'executionId'], message: 'remote execution map key must match executionId' })
    }
    if (executionRequestKeys.has(execution.requestKey)) {
      ctx.addIssue({ code: 'custom', path: ['remoteExecutions', mapKey, 'requestKey'], message: `duplicate remote request key: ${execution.requestKey}` })
    }
    executionRequestKeys.add(execution.requestKey)
    const uploadedFields = new Set()
    for (const [index, upload] of execution.uploadedFiles.entries()) {
      if (uploadedFields.has(upload.fieldId)) {
        ctx.addIssue({ code: 'custom', path: ['remoteExecutions', mapKey, 'uploadedFiles', index, 'fieldId'], message: 'uploaded field ids must be unique' })
      }
      uploadedFields.add(upload.fieldId)
      const reference = execution.materialSnapshots.find((item) => item.referenceId === upload.referenceId)
      if (!reference || reference.sha256 !== upload.sha256) {
        ctx.addIssue({ code: 'custom', path: ['remoteExecutions', mapKey, 'uploadedFiles', index], message: 'uploaded file must match its confirmed material snapshot' })
      }
    }
    if (execution.status === 'completed' && !remoteRunExecutionIds.has(execution.executionId)) {
      ctx.addIssue({ code: 'custom', path: ['remoteExecutions', mapKey, 'status'], message: 'completed remote execution requires its completed run snapshot' })
    }
    if (inFlightStatuses.has(execution.status)) inFlight += 1
  }
  if (inFlight > 1) {
    ctx.addIssue({ code: 'custom', path: ['remoteExecutions'], message: 'concurrent unresolved remote executions are forbidden' })
  }
})

function enforceGenerationDraft(task, ctx) {
  const claims = task.workflowId === CLAIMS_TEMPLATE_ID
  if (!claims && task.generation !== null) {
    ctx.addIssue({ code: 'custom', path: ['generation'], message: 'legacy tasks cannot be relabeled as Skills or API' })
  }
  if (claims) {
    if (task.workflowVersion !== '2' && task.generation?.upstream) ctx.addIssue({ code: 'custom', message: 'upstream requires claims v2' })
    if (!['1', '2'].includes(task.workflowVersion) || task.workType !== 'cn-invention-patent' || task.generation === null
      || task.generation?.inputSchemaVersion !== claimsInputVersion(task.workflowVersion)) {
      ctx.addIssue({ code: 'custom', path: ['generation'], message: 'claims task requires its versioned generation draft' })
    }
    if (task.professionalDraft !== null) {
      ctx.addIssue({ code: 'custom', path: ['professionalDraft'], message: 'unified task cannot contain a second professional form' })
    }
    if (!(task.workflowVersion === '2' ? claimsV2DraftValuesSchema : claimsDraftValuesSchema).safeParse(task.formValues).success) {
      ctx.addIssue({ code: 'custom', path: ['formValues'], message: 'claims draft requires its versioned bounded text fields' })
    }
  }
  for (const [id, run] of Object.entries(task.runs ?? {})) {
    if (isUnifiedRun(run) && (run.workflowVersion !== task.workflowVersion || run.inputSchemaVersion !== task.generation?.inputSchemaVersion)) {
      ctx.addIssue({ code: 'custom', path: ['runs', id], message: 'run workflow must match task workflow' })
    }
    if (isUnifiedRun(run) !== claims) {
      ctx.addIssue({ code: 'custom', path: ['runs', id], message: 'unified evidence cannot be mixed with legacy tasks or runs' })
    }
    if (isUnifiedRun(run) && run.parentRunId !== null) {
      const parent = task.runs[run.parentRunId]
      if (!parent || parent.mode !== run.mode || parent.status !== 'completed' || parent.source !== run.source
        || parent.inputSnapshot.sha256 !== run.inputSnapshot.sha256
        || task.runOrder.indexOf(run.parentRunId) >= task.runOrder.indexOf(id)) {
        ctx.addIssue({ code: 'custom', path: ['runs', id], message: 'edited artifact must retain an earlier completed parent and input' })
      }
    }
  }
}

export const workbenchEditableTaskSchema = workbenchEditableTaskV3Schema.extend({
  generation: generationDraftSchema.nullable(),
}).superRefine(enforceGenerationDraft)

export const workbenchTaskSchema = workbenchTaskV3Schema.safeExtend({
  generation: generationDraftSchema.nullable(),
  runs: z.record(identifierSchema, z.discriminatedUnion('mode', [localRunSnapshotSchema, oasisRemoteRunSnapshotSchema, unifiedRunSnapshotSchema, dshLocalRunSnapshotSchema])),
}).superRefine(enforceGenerationDraft)

const panelModeSchema = z.enum(['hidden', 'normal', 'expanded'])

function enforceWorkspaceInvariants(value, ctx) {
  const activeTasks = Object.values(value.tasks).filter(task => hasPendingUnifiedRun(task)
    || Object.values(task.remoteExecutions ?? {}).some(isOasisRemoteExecutionUnresolved))
  const pendingUnified = Object.values(value.tasks).flatMap(task => Object.values(task.runs ?? {}))
    .filter(run => hasPendingUnifiedRun({ runs: { run } })).length
  if (pendingUnified > 1 || (pendingUnified && activeTasks.length > 1)) {
    ctx.addIssue({ code: 'custom', path: ['tasks'], message: 'Workspace already has an active generation' })
  }
  const seen = new Set()
  for (const [index, taskId] of value.taskOrder.entries()) {
    if (seen.has(taskId)) {
      ctx.addIssue({ code: 'custom', path: ['taskOrder', index], message: `duplicate task id: ${taskId}` })
    }
    seen.add(taskId)
    if (!(taskId in value.tasks)) {
      ctx.addIssue({ code: 'custom', path: ['taskOrder', index], message: `missing task record: ${taskId}` })
    }
  }
  for (const [mapKey, task] of Object.entries(value.tasks)) {
    if (!seen.has(mapKey)) {
      ctx.addIssue({ code: 'custom', path: ['tasks', mapKey], message: `orphan task record: ${mapKey}` })
    }
    if (task.taskId !== mapKey) {
      ctx.addIssue({ code: 'custom', path: ['tasks', mapKey, 'taskId'], message: `task map key does not match taskId: ${mapKey}` })
    }
  }
  if (value.activeTaskId !== null && !seen.has(value.activeTaskId)) {
    ctx.addIssue({ code: 'custom', path: ['activeTaskId'], message: 'activeTaskId must reference taskOrder' })
  }
  if (Object.keys(value.tasks).length > WORKBENCH_LIMITS.maxTasksPerWorkspace) {
    ctx.addIssue({ code: 'custom', path: ['tasks'], message: `workspace tasks must not exceed ${WORKBENCH_LIMITS.maxTasksPerWorkspace}` })
  }
  if (utf8Bytes(JSON.stringify(value)) > WORKBENCH_LIMITS.maxDraftBytes) {
    ctx.addIssue({ code: 'custom', message: `workspace data must not exceed ${WORKBENCH_LIMITS.maxDraftBytes} UTF-8 bytes` })
  }
}

const editableStateFields = {
  schemaVersion: z.literal(3),
  panelMode: panelModeSchema,
  activeTaskId: identifierSchema.nullable(),
  taskOrder: z.array(identifierSchema).max(WORKBENCH_LIMITS.maxTasksPerWorkspace),
  tasks: z.record(identifierSchema, workbenchEditableTaskV3Schema),
}

const recordStateFields = {
  schemaVersion: z.literal(3),
  panelMode: panelModeSchema,
  activeTaskId: identifierSchema.nullable(),
  taskOrder: z.array(identifierSchema).max(WORKBENCH_LIMITS.maxTasksPerWorkspace),
  tasks: z.record(identifierSchema, workbenchTaskV3Schema),
}

export const workbenchEditableDraftV3Schema = z.object(editableStateFields).strict().superRefine(enforceWorkspaceInvariants)
export const workbenchEditableDraftV4Schema = z.object({
  ...editableStateFields,
  schemaVersion: z.literal(4),
  tasks: z.record(identifierSchema, workbenchEditableTaskSchema),
}).strict().superRefine(enforceWorkspaceInvariants)
export const workbenchEditableDraftSchema = z.discriminatedUnion('schemaVersion', [workbenchEditableDraftV3Schema, workbenchEditableDraftV4Schema])
export const workbenchDraftSchema = workbenchEditableDraftSchema

export const workbenchRecordV3Schema = z.object({
  ...recordStateFields,
  workspaceId: identifierSchema,
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  updatedAt: timestampSchema,
}).strict().superRefine(enforceWorkspaceInvariants)

export const workbenchRecordV4Schema = workbenchRecordV3Schema.safeExtend({
  schemaVersion: z.literal(4),
  tasks: z.record(identifierSchema, workbenchTaskSchema),
})
export const workbenchRecordSchema = z.discriminatedUnion('schemaVersion', [workbenchRecordV3Schema, workbenchRecordV4Schema])

const workbenchTaskV2Schema = z.object({
  taskId: identifierSchema,
  title: z.string().min(1).max(200),
  workType: workTypeSchema.nullable(),
  workflowId: identifierSchema.nullable(),
  workflowVersion: identifierSchema.nullable(),
  formValues: jsonRootObjectSchema,
  inputRefs: z.array(materialReferenceSchema).max(WORKBENCH_LIMITS.maxInputRefsPerTask),
  activeRunId: identifierSchema.nullable(),
  runOrder: z.array(identifierSchema).max(WORKBENCH_LIMITS.maxRunsPerTask),
  runs: z.record(identifierSchema, localRunSnapshotSchema),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}).strict()

export const workbenchRecordV2Schema = z.object({
  schemaVersion: z.literal(2),
  workspaceId: identifierSchema,
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  panelMode: panelModeSchema,
  activeTaskId: identifierSchema.nullable(),
  taskOrder: z.array(identifierSchema).max(WORKBENCH_LIMITS.maxTasksPerWorkspace),
  tasks: z.record(identifierSchema, workbenchTaskV2Schema),
  updatedAt: timestampSchema,
}).strict().superRefine(enforceWorkspaceInvariants)

const legacyTaskSchema = z.object({
  taskId: identifierSchema,
  title: z.string().min(1).max(200),
  workType: workTypeSchema.nullable(),
  workflowId: identifierSchema.nullable(),
  workflowVersion: identifierSchema.nullable(),
  inputRefs: z.array(jsonRootObjectSchema).max(WORKBENCH_LIMITS.maxInputRefsPerTask),
  formValues: jsonRootObjectSchema,
  run: z.null(),
  preview: z.null(),
  review: z.literal('not-reviewed'),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}).strict()

export const legacyWorkbenchRecordSchema = z.object({
  schemaVersion: z.literal(1),
  workspaceId: identifierSchema,
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  panelMode: panelModeSchema,
  activeTaskId: identifierSchema.nullable(),
  taskOrder: z.array(identifierSchema).max(WORKBENCH_LIMITS.maxTasksPerWorkspace),
  tasks: z.record(identifierSchema, legacyTaskSchema),
  updatedAt: timestampSchema,
}).strict().superRefine(enforceWorkspaceInvariants)

export const storedWorkbenchRecordSchema = z.union([
  legacyWorkbenchRecordSchema,
  workbenchRecordV2Schema,
  workbenchRecordSchema,
])
export const workbenchGetResponseSchema = workbenchRecordSchema
export const workbenchReplaceResponseSchema = z.discriminatedUnion('committed', [
  z.object({ committed: z.literal(true), current: workbenchRecordSchema }).strict(),
  z.object({
    committed: z.literal(false),
    reason: z.literal('revision-conflict'),
    current: workbenchRecordSchema,
  }).strict(),
])
export const writebackCommitResponseSchema = workbenchReplaceResponseSchema
