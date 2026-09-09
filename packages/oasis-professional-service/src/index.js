import { defineTool } from '@deepseek-ai/dsh-tools'
import { randomUUID } from 'node:crypto'
import { isUnifiedFixtureEnvironment, isNativeOfflineEnvironment } from './unified-fixture-environment.js'
import { createNativeOfflineRuntime } from './native-offline-runtime.js'
import { bindNativeModelRuntime } from './native-model-runtime.js'
export { isUnifiedFixtureEnvironment } from './unified-fixture-environment.js'

import { createOasisApiClient } from './oasis-api-contract.js'
import { createOasisRemoteService } from './oasis-remote-service.js'
import { createPluginStatus } from './status.js'
import {
  normalizeOasisRuntimeConfig,
  registerOasisSettings,
  resolveOasisJwt,
} from './oasis-runtime-config.js'
import { openOasisWorkbenchRepository } from './workbench-repository.js'
import { createWorkbenchRpcHandler, OASIS_WORKBENCH_RPC_CHANNEL } from './workbench-rpc.js'
import { createWorkbenchService } from './workbench-service.js'
import { createWorkspaceMaterialManager } from './workspace-materials.js'

export const name = 'oasis-professional-service'
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

export async function apply(ctx) {
  const settingsScope = registerOasisSettings(ctx)
  const repository = await openOasisWorkbenchRepository(ctx.storageDomain)
  const materialManager = createWorkspaceMaterialManager({ workspaceRegistry: ctx.workspaceRegistry })
  const nativeOffline = isNativeOfflineEnvironment()
  const fixtureEnabled = isUnifiedFixtureEnvironment() && !nativeOffline
  let localGeneration
  try {
    const modelEnabled = !fixtureEnabled && normalizeOasisRuntimeConfig(settingsScope.get()).localModelEnabled
    localGeneration = nativeOffline ? createNativeOfflineRuntime(ctx, await import('@deepseek-ai/dsh-llm'))
      : modelEnabled ? bindNativeModelRuntime(ctx, await import('@deepseek-ai/dsh-llm'), true) : null
  } catch (error) {
    await repository.close()
    throw error
  }
  const service = createWorkbenchService({
    repository,
    materialManager,
    workspaceRegistry: ctx.workspaceRegistry,
    unifiedFixtureEnabled: fixtureEnabled,
    localGeneration,
  })
  const professionalService = createOasisRemoteService({
    repository,
    materialManager,
    executionIdFactory: randomUUID,
    runIdFactory: randomUUID,
    async getRuntime() {
      if (fixtureEnabled || nativeOffline) return { enabled: false, environmentKind: 'non-production', apiBaseOrigin: null, credentialConfigured: false, client: null }
      const config = normalizeOasisRuntimeConfig(settingsScope.get())
      if (!config.remoteEnabled) {
        return {
          enabled: false,
          environmentKind: config.environmentKind,
          apiBaseOrigin: null,
          credentialConfigured: false,
          client: null,
        }
      }
      if (!config.credentialBound) {
        return {
          enabled: true,
          environmentKind: config.environmentKind,
          apiBaseOrigin: config.apiBaseUrl,
          credentialConfigured: false,
          client: null,
        }
      }
      let credentialConfigured = true
      try {
        await resolveOasisJwt(ctx.credentials, config.credentialRef)
      } catch (error) {
        if (error?.code !== 'AUTH_REQUIRED') throw error
        credentialConfigured = false
      }
      return {
        enabled: true,
        environmentKind: config.environmentKind,
        apiBaseOrigin: config.apiBaseUrl,
        credentialConfigured,
        client: credentialConfigured
          ? createOasisApiClient({
              baseUrl: config.apiBaseUrl,
              downloadOrigins: config.downloadOrigins,
              resolveToken: () => resolveOasisJwt(ctx.credentials, config.credentialRef),
            })
          : null,
      }
    },
  })
  let disposeTool
  let disposeRpc
  try {
    disposeTool = registerStatusTool(ctx)
    disposeRpc = ctx.connection.rpc.handle(
      OASIS_WORKBENCH_RPC_CHANNEL,
      createWorkbenchRpcHandler(service, professionalService),
      { authority: 'loopback' },
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
