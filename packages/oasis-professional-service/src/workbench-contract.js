import { z } from 'zod'

export const WORKBENCH_LIMITS = Object.freeze({
  maxTasksPerWorkspace: 32,
  maxInputRefsPerTask: 64,
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

const jsonStringSchema = z.string().refine(
  (value) => utf8Bytes(value) <= WORKBENCH_LIMITS.maxJsonStringBytes,
  `JSON strings must not exceed ${WORKBENCH_LIMITS.maxJsonStringBytes} UTF-8 bytes`,
)

const jsonPrimitiveSchema = z.union([
  jsonStringSchema,
  z.number(),
  z.boolean(),
  z.null(),
])

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

const jsonValueSchema = createJsonValueSchema(WORKBENCH_LIMITS.maxJsonDepth)
const jsonRootObjectSchema = jsonObjectSchema(jsonValueSchema)

export const workbenchTaskSchema = z.object({
  taskId: identifierSchema,
  title: z.string().min(1).max(200),
  workType: z.enum(['technical-rd', 'cn-invention-patent']).nullable(),
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

const stateFields = {
  schemaVersion: z.literal(1),
  panelMode: z.enum(['hidden', 'normal', 'expanded']),
  activeTaskId: identifierSchema.nullable(),
  taskOrder: z.array(identifierSchema).max(WORKBENCH_LIMITS.maxTasksPerWorkspace),
  tasks: z.record(identifierSchema, workbenchTaskSchema),
}

function enforceTaskInvariants(value, ctx) {
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
    ctx.addIssue({
      code: 'custom',
      path: ['tasks'],
      message: `workspace tasks must not exceed ${WORKBENCH_LIMITS.maxTasksPerWorkspace}`,
    })
  }

  const draft = {
    schemaVersion: value.schemaVersion,
    panelMode: value.panelMode,
    activeTaskId: value.activeTaskId,
    taskOrder: value.taskOrder,
    tasks: value.tasks,
  }
  if (utf8Bytes(JSON.stringify(draft)) > WORKBENCH_LIMITS.maxDraftBytes) {
    ctx.addIssue({
      code: 'custom',
      message: `workspace draft must not exceed ${WORKBENCH_LIMITS.maxDraftBytes} UTF-8 bytes`,
    })
  }
}

export const workbenchDraftSchema = z.object(stateFields).strict().superRefine(enforceTaskInvariants)

export const workbenchRecordSchema = z.object({
  ...stateFields,
  workspaceId: identifierSchema,
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  updatedAt: timestampSchema,
}).strict().superRefine(enforceTaskInvariants)

export const workbenchGetResponseSchema = workbenchRecordSchema

export const workbenchReplaceResponseSchema = z.discriminatedUnion('committed', [
  z.object({
    committed: z.literal(true),
    current: workbenchRecordSchema,
  }).strict(),
  z.object({
    committed: z.literal(false),
    reason: z.literal('revision-conflict'),
    current: workbenchRecordSchema,
  }).strict(),
])
