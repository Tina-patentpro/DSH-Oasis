import { defineTool } from '@deepseek-ai/dsh-tools'
import { randomUUID } from 'node:crypto'
import { isUnifiedFixtureEnvironment, isNativeOfflineEnvironment } from './unified-fixture-environment.js'
import { createNativeOfflineRuntime } from './native-offline-runtime.js'
import { bindNativeModelRuntime } from './native-model-runtime.js'
export { isUnifiedFixtureEnvironment } from './unified-fixture-environment.js'

import { createOasisApiClient } from './oasis-api-contract.js'
import { createOasisAccountService, OASIS_PRODUCT_ORIGIN } from './oasis-account.js'
import { createOasisRemoteService } from './oasis-remote-service.js'
import { createPluginStatus } from './status.js'
import {
  normalizeProductRuntimeConfig,
  OASIS_SETTINGS_SCHEMA,
  registerOasisSettings,
} from './oasis-runtime-config.js'
import { openOasisWorkbenchRepository } from './workbench-repository.js'
import { createWorkbenchRpcHandler } from './workbench-rpc.js'
import { registerWorkbenchRoutes } from './workbench-connection.js'
import { createWorkbenchService } from './workbench-service.js'
import { createWorkspaceMaterialManager } from './workspace-materials.js'
import { createWebsiteImportService } from './website-import-service.js'
import { hasPendingUnifiedRun } from './generation-contract.js'
import { isOasisRemoteExecutionUnresolved } from './workbench-contract.js'
import { createWorkspaceOperationGuard } from './workspace-operation-guard.js'

export const name = 'oasis-professional-service'
export const Config = OASIS_SETTINGS_SCHEMA.volatile()
export const inject = ['tools', 'storageDomain', 'connection', 'workspaceRegistry', 'settings', 'credentials',
  ...(isNativeOfflineEnvironment() ? ['llm', 'sessions', 'sessionProjections', 'agentDefaultModel'] : []),
]

function registerStatusTool(ctx) {
  return ctx.tools.register(defineTool({
    name: 'oasis_workbench_status',
    description: 'Return the current local integration status for the Oasis technical R&D and Chinese invention patent workbench.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          schemaVersion: { type: 'string', required: true },
          plugin: { type: 'string', required: true },
          phase: { type: 'string', required: true },
          capabilityLevel: { type: 'string', required: true },
          localFirst: { type: 'boolean', required: true },
          externalSystems: { type: 'string', required: true },
          supportedWorkTypes: {
            type: 'array',
            required: true,
            items: { type: 'string' },
          },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: JSON.stringify(value),
      }],
    },
    async execute() {
      return createPluginStatus()
    },
  }))
}

export async function apply(ctx, config) {
  const settingsScope = registerOasisSettings(ctx, config)
  const repository = await openOasisWorkbenchRepository(ctx.storageDomain)
  const materialManager = createWorkspaceMaterialManager({ workspaceRegistry: ctx.workspaceRegistry })
  const nativeOffline = isNativeOfflineEnvironment()
  const fixtureEnabled = isUnifiedFixtureEnvironment() && !nativeOffline
  const accountService = createOasisAccountService({ credentials: ctx.credentials, enabled: !fixtureEnabled && !nativeOffline })
  const workspaceOperations = createWorkspaceOperationGuard()
  const importService = createWebsiteImportService({ workspaceRegistry: ctx.workspaceRegistry, accountService, settings: ctx.settings, workspaceOperations,
    isWorkspaceBusy: workspaceId => Object.values(repository.get(workspaceId).tasks).some(task => hasPendingUnifiedRun(task)
      || Object.values(task.remoteExecutions).some(isOasisRemoteExecutionUnresolved)),
  })
  let localGeneration
  try {
    const modelEnabled = !fixtureEnabled && normalizeProductRuntimeConfig(settingsScope.get()).localModelEnabled
    localGeneration = nativeOffline ? createNativeOfflineRuntime(ctx, await import('@deepseek-ai/dsh-llm'))
      : modelEnabled ? bindNativeModelRuntime(ctx, await import('@deepseek-ai/dsh-llm'), true) : null
  } catch (error) {
    await repository.close()
    throw error
  }
  const service = createWorkbenchService({
    repository,
    workspaceOperations,
    materialManager,
    workspaceRegistry: ctx.workspaceRegistry,
    unifiedFixtureEnabled: fixtureEnabled,
    localGeneration,
  })
  const professionalService = createOasisRemoteService({
    resolveConfig: normalizeProductRuntimeConfig,
    repository,
    workspaceOperations,
    materialManager,
    settings: ctx.settings,
    workspaceRegistry: ctx.workspaceRegistry,
    executionIdFactory: randomUUID,
    runIdFactory: randomUUID,
    async getRuntime() {
      if (fixtureEnabled || nativeOffline) return { enabled: false, environmentKind: 'non-production', apiBaseOrigin: null, credentialConfigured: false, client: null }
      let credentialConfigured = true
      let resolveToken, accountIdentity
      try {
        const session = await accountService.captureSession()
        resolveToken = session.resolveToken
        accountIdentity = session.identity
      } catch (error) {
        if (error?.code !== 'AUTH_REQUIRED') throw error
        credentialConfigured = false
      }
      return {
        enabled: true,
        environmentKind: 'production',
        apiBaseOrigin: OASIS_PRODUCT_ORIGIN,
        credentialConfigured,
        accountIdentity,
        assertCurrent: credentialConfigured ? async () => { await resolveToken() } : null,
        client: credentialConfigured
          ? createOasisApiClient({
              environmentKind: 'production',
              baseUrl: OASIS_PRODUCT_ORIGIN,
              downloadOrigins: [],
              resolveToken,
            })
          : null,
      }
    },
  })
  let disposeTool
  let disposeRpc
  try {
    disposeTool = registerStatusTool(ctx)
    disposeRpc = registerWorkbenchRoutes(
      ctx.connection,
      createWorkbenchRpcHandler(service, professionalService, accountService, importService),
    )
  } catch (error) {
    try {
      disposeTool?.()
    } finally {
      await localGeneration?.dispose()
      await repository.close()
    }
    throw error
  }

  let closePromise
  return function disposeOasisWorkbenchHost() {
    closePromise ??= (async () => {
      accountService.dispose()
      importService.dispose()
      try {
        await disposeRpc()
      } finally {
        try {
          disposeTool()
        } finally {
          await service.closeLocalGeneration()
          await localGeneration?.dispose()
          await repository.close()
        }
      }
    })()
    return closePromise
  }
}
