import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'

import {
  workbenchDraftSchema,
  workbenchRecordSchema,
  workbenchTaskSchema,
} from './workbench-contract.js'

export {
  workbenchDraftSchema,
  workbenchRecordSchema,
  workbenchTaskSchema,
} from './workbench-contract.js'

export const EMPTY_UPDATED_AT = '1970-01-01T00:00:00.000Z'

export const oasisWorkbenchDomainSpec = defineDomain({
  name: 'oasis_workbench',
  version: 1,
  tables: {
    workspaces: domainTable(workbenchRecordSchema),
  },
})

function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

function parseDetached(schema, input) {
  return deepFreeze(structuredClone(schema.parse(input)))
}

export function createEmptyWorkbenchRecord(workspaceId) {
  return parseWorkbenchRecord(workspaceId, {
    schemaVersion: 1,
    workspaceId,
    revision: 0,
    panelMode: 'hidden',
    activeTaskId: null,
    taskOrder: [],
    tasks: {},
    updatedAt: EMPTY_UPDATED_AT,
  })
}

export function parseWorkbenchDraft(input) {
  return parseDetached(workbenchDraftSchema, input)
}

export function parseWorkbenchRecord(workspaceId, input) {
  const parsed = parseDetached(workbenchRecordSchema, input)
  if (parsed.workspaceId !== workspaceId) {
    throw new Error(`workspaceId does not match storage key: expected ${workspaceId}`)
  }
  return parsed
}
