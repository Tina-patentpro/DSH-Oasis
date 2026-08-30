import { z } from 'zod'

export const WORKBENCH_LIMITS = Object.freeze({
  maxTasksPerWorkspace: 32,
  maxInputRefsPerTask: 64,
  maxRunsPerTask: 8,
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
  executionMode: z.literal('local-mock'),
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

const writebackRelativePathSchema = z.string().min(1).max(1024).refine((value) => {
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

export const runSnapshotSchema = z.object({
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
  review: z.object({
    status: z.enum(['not-reviewed', 'changes-requested', 'approved']),
    note: z.string().max(WORKBENCH_LIMITS.maxReviewNoteChars),
    updatedAt: timestampSchema,
  }).strict(),
  writebacks: z.array(writebackRecordSchema).max(WORKBENCH_LIMITS.maxWritebacksPerRun),
  createdAt: timestampSchema,
  completedAt: timestampSchema,
}).strict().superRefine((value, ctx) => {
  if (value.result.contentStatus === 'blocked' && value.review.status === 'approved') {
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
})

export const workbenchEditableTaskSchema = z.object({
  taskId: identifierSchema,
  title: z.string().min(1).max(200),
  workType: workTypeSchema.nullable(),
  workflowId: identifierSchema.nullable(),
  workflowVersion: identifierSchema.nullable(),
  formValues: jsonRootObjectSchema,
  activeRunId: identifierSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}).strict()

export const workbenchTaskSchema = z.object({
  taskId: identifierSchema,
  title: z.string().min(1).max(200),
  workType: workTypeSchema.nullable(),
  workflowId: identifierSchema.nullable(),
  workflowVersion: identifierSchema.nullable(),
  formValues: jsonRootObjectSchema,
  inputRefs: z.array(materialReferenceSchema).max(WORKBENCH_LIMITS.maxInputRefsPerTask),
  activeRunId: identifierSchema.nullable(),
  runOrder: z.array(identifierSchema).max(WORKBENCH_LIMITS.maxRunsPerTask),
  runs: z.record(identifierSchema, runSnapshotSchema),
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
  for (const [mapKey, run] of Object.entries(value.runs)) {
    if (!seen.has(mapKey)) {
      ctx.addIssue({ code: 'custom', path: ['runs', mapKey], message: `orphan run record: ${mapKey}` })
    }
    if (run.runId !== mapKey) {
      ctx.addIssue({ code: 'custom', path: ['runs', mapKey, 'runId'], message: `run map key does not match runId: ${mapKey}` })
    }
    if (value.workflowId !== run.workflowId || value.workflowVersion !== run.workflowVersion) {
      ctx.addIssue({ code: 'custom', path: ['runs', mapKey, 'workflowId'], message: 'run workflow must match task workflow' })
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
})

const panelModeSchema = z.enum(['hidden', 'normal', 'expanded'])

function enforceWorkspaceInvariants(value, ctx) {
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
  schemaVersion: z.literal(2),
  panelMode: panelModeSchema,
  activeTaskId: identifierSchema.nullable(),
  taskOrder: z.array(identifierSchema).max(WORKBENCH_LIMITS.maxTasksPerWorkspace),
  tasks: z.record(identifierSchema, workbenchEditableTaskSchema),
}

const recordStateFields = {
  schemaVersion: z.literal(2),
  panelMode: panelModeSchema,
  activeTaskId: identifierSchema.nullable(),
  taskOrder: z.array(identifierSchema).max(WORKBENCH_LIMITS.maxTasksPerWorkspace),
  tasks: z.record(identifierSchema, workbenchTaskSchema),
}

export const workbenchEditableDraftSchema = z.object(editableStateFields).strict().superRefine(enforceWorkspaceInvariants)
export const workbenchDraftSchema = workbenchEditableDraftSchema

export const workbenchRecordSchema = z.object({
  ...recordStateFields,
  workspaceId: identifierSchema,
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
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

export const storedWorkbenchRecordSchema = z.union([legacyWorkbenchRecordSchema, workbenchRecordSchema])
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
