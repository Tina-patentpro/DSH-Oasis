import {
  oasisProfessionalBootstrapSchema,
  oasisProfessionalDetailSchema,
  oasisProfessionalStopResponseSchema,
  workbenchGetResponseSchema,
  workbenchReplaceResponseSchema,
  writebackCommitResponseSchema,
  writebackPrepareResponseSchema,
  workflowCatalogResponseSchema,
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

    async getWorkflowCatalog(workType, signal) {
      const payload = workType === undefined ? {} : { workType }
      return unwrap(await connection.rpc.call(
        CHANNEL,
        'workflow/catalog',
        payload,
        signal,
      ), workflowCatalogResponseSchema)
    },

    async getProfessionalBootstrap(signal) {
      return unwrap(await connection.rpc.call(
        CHANNEL,
        'professional/bootstrap',
        {},
        signal,
      ), oasisProfessionalBootstrapSchema)
    },

    async getProfessionalDetail(apiEndpoint, signal) {
      return unwrap(await connection.rpc.call(
        CHANNEL,
        'professional/detail',
        { apiEndpoint },
        signal,
      ), oasisProfessionalDetailSchema)
    },

    async startProfessional(payload, signal) {
      return unwrap(await connection.rpc.call(
        CHANNEL,
        'professional/start',
        payload,
        signal,
      ), workbenchReplaceResponseSchema)
    },

    async continueProfessional(payload, signal) {
      return unwrap(await connection.rpc.call(
        CHANNEL,
        'professional/continue',
        payload,
        signal,
      ), workbenchReplaceResponseSchema)
    },

    async stopProfessional(payload, signal) {
      return unwrap(await connection.rpc.call(
        CHANNEL,
        'professional/stop',
        payload,
        signal,
      ), oasisProfessionalStopResponseSchema)
    },

    async addMaterial(payload, signal) {
      return unwrap(await connection.rpc.call(
        CHANNEL,
        'material/add',
        payload,
        signal,
      ), workbenchReplaceResponseSchema)
    },

    async refreshMaterial(payload, signal) {
      return unwrap(await connection.rpc.call(
        CHANNEL,
        'material/refresh',
        payload,
        signal,
      ), workbenchReplaceResponseSchema)
    },

    async removeMaterial(payload, signal) {
      return unwrap(await connection.rpc.call(
        CHANNEL,
        'material/remove',
        payload,
        signal,
      ), workbenchReplaceResponseSchema)
    },

    async createRun(payload, signal) {
      return unwrap(await connection.rpc.call(
        CHANNEL,
        'task/create',
        payload,
        signal,
      ), workbenchReplaceResponseSchema)
    },

    async reviewRun(payload, signal) {
      return unwrap(await connection.rpc.call(
        CHANNEL,
        'task/review',
        payload,
        signal,
      ), workbenchReplaceResponseSchema)
    },

    async prepareWriteback(payload, signal) {
      return unwrap(await connection.rpc.call(
        CHANNEL,
        'artifact/prepare-writeback',
        payload,
        signal,
      ), writebackPrepareResponseSchema)
    },

    async commitWriteback(confirmationToken, signal) {
      return unwrap(await connection.rpc.call(
        CHANNEL,
        'artifact/commit-writeback',
        { confirmationToken },
        signal,
      ), writebackCommitResponseSchema)
    },
  })
}
