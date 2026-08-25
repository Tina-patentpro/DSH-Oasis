import {
  workbenchGetResponseSchema,
  workbenchReplaceResponseSchema,
} from '../workbench-contract.js'

const CHANNEL = '/oasis-workbench'

export class WorkbenchRemoteError extends Error {
  constructor(code, message, details) {
    super(message)
    this.name = 'WorkbenchRemoteError'
    this.code = code
    this.details = details
  }
}

function unwrap(result, schema) {
  if (result?.ok === true && Object.hasOwn(result, 'value')) {
    const parsed = schema.safeParse(result.value)
    if (parsed.success) return parsed.data
    throw new WorkbenchRemoteError(
      'malformed-response',
      'Malformed Oasis workbench response payload',
      { issues: parsed.error.issues },
    )
  }
  if (result?.ok === false && result.error && typeof result.error.code === 'string') {
    throw new WorkbenchRemoteError(
      result.error.code,
      typeof result.error.message === 'string' ? result.error.message : 'Oasis workbench request failed',
      result.error.details,
    )
  }
  throw new WorkbenchRemoteError('malformed-response', 'Malformed Oasis workbench Connection result', {})
}

export function createWorkbenchRemote(connection) {
  if (typeof connection?.rpc?.call !== 'function') {
    throw new TypeError('DSH connection.rpc.call is required')
  }

  return Object.freeze({
    async get(workspaceId, signal) {
      return unwrap(await connection.rpc.call(
        CHANNEL,
        'state/get',
        { workspaceId },
        signal,
      ), workbenchGetResponseSchema)
    },

    async replace(workspaceId, expectedRevision, state, signal) {
      return unwrap(await connection.rpc.call(
        CHANNEL,
        'state/replace',
        { workspaceId, expectedRevision, state },
        signal,
      ), workbenchReplaceResponseSchema)
    },
  })
}
