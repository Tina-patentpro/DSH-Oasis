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
import { createM06BusinessNativeCandidate013 } from './v340-native-model.js'
import {createM06NativeBusinessRecovery,loadNativeBusinessRecoveryScope} from './m06-native-business-recovery.js'

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

export async function apply(ctx, config) { return applyWorkbench(ctx,config,false) }
// Selected only by the explicit subpath entry, never by user/RPC configuration.
export async function applyM06ControlledCandidate013(ctx, config) { return applyWorkbench(ctx,config,true) }
export async function applyM06NativeBusinessRecovery(ctx, config) { return applyWorkbench(ctx,config,true,false,true) }
// Explicit trusted composition for actual local M06 plus native website association.
// Existing controlled/no-account candidates and all remote generation gates remain intact.
export async function applyM06WorkareaCandidate013(ctx, config) { return applyWorkbench(ctx,config,true,true) }

async function applyWorkbench(ctx, config, controlledM06, websiteAccount = false, recoveryEntry = false) {
  const recoveryScope=recoveryEntry?await loadNativeBusinessRecoveryScope():null
  if(!recoveryEntry&&process.env.OASIS_NATIVE_BUSINESS_RECOVERY!==undefined)throw Error('Recovery mode requires its dedicated trusted entry')
  const nativeZeroGeneration=process.env.OASIS_NATIVE_ZERO_GENERATION==='1'
  if(nativeZeroGeneration&&!controlledM06)throw new Error('Native zero-generation requires the controlled M06 entry.')
  if(controlledM06&&!recoveryEntry&&(process.env.OASIS_UNIFIED_FIXTURE==='1'||process.env.OASIS_NATIVE_OFFLINE==='1'
    ||typeof ctx?.llm?.prepareCall!=='function'||typeof ctx?.sessions?.get!=='function'
    ||typeof ctx?.sessionProjections?.stateOf!=='function'||typeof ctx?.agentDefaultModel?.currentSelection!=='function')){
    throw new Error('M06受控入口需要当前DSH原生模型上下文，且不能混用旧合成模式。')
  }
  const settingsScope = registerOasisSettings(ctx, config)
  // Native settings are owned by the actual loader entry id, including explicit
  // controlled entries; this trusted identity is never supplied by business RPC.
  const settingsNamespace = ctx.fiber?.entry?.options?.id ?? 'oasis-professional-service'
  const repository = await openOasisWorkbenchRepository(ctx.storageDomain)
  const materialManager = createWorkspaceMaterialManager({ workspaceRegistry: ctx.workspaceRegistry })
  const nativeOffline = isNativeOfflineEnvironment()
  const fixtureEnabled = isUnifiedFixtureEnvironment() && !nativeOffline
  const accountService = recoveryEntry?null:createOasisAccountService({ credentials: ctx.credentials, enabled: !fixtureEnabled && !nativeOffline && (!controlledM06 || websiteAccount) })
  const workspaceOperations = createWorkspaceOperationGuard()
  const importService = recoveryEntry?null:createWebsiteImportService({ workspaceRegistry: ctx.workspaceRegistry, accountService, settings: ctx.settings, settingsNamespace, workspaceOperations,
    isWorkspaceBusy: workspaceId => Object.values(repository.get(workspaceId).tasks).some(task => hasPendingUnifiedRun(task)
      || Object.values(task.remoteExecutions).some(isOasisRemoteExecutionUnresolved)),
  })
  let localGeneration
  let v340Executor
  try {
    if(controlledM06&&!recoveryEntry)v340Executor=createM06BusinessNativeCandidate013({ctx,native:await import('@deepseek-ai/dsh-llm')})
    const modelEnabled = !fixtureEnabled && normalizeProductRuntimeConfig(settingsScope.get()).localModelEnabled
    localGeneration = controlledM06 ? null : nativeOffline ? createNativeOfflineRuntime(ctx, await import('@deepseek-ai/dsh-llm'))
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
    v340Executor,
  })
  const professionalService = recoveryEntry?null:createOasisRemoteService({
    resolveConfig: normalizeProductRuntimeConfig,
    repository,
    workspaceOperations,
    materialManager,
    settings: ctx.settings,
    settingsNamespace,
    workspaceRegistry: ctx.workspaceRegistry,
    executionIdFactory: randomUUID,
    runIdFactory: randomUUID,
    async getRuntime() {
      if (fixtureEnabled || nativeOffline || controlledM06) return { enabled: false, environmentKind: 'non-production', apiBaseOrigin: null, credentialConfigured: false, client: null }
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
    const nativeBusinessRecovery=recoveryEntry?createM06NativeBusinessRecovery({repository,workspaceRegistry:ctx.workspaceRegistry,scope:recoveryScope}):null
    if(nativeBusinessRecovery)await nativeBusinessRecovery.validate()
    disposeTool = registerStatusTool(ctx)
    disposeRpc = registerWorkbenchRoutes(
      ctx.connection,
      createWorkbenchRpcHandler(service, professionalService, accountService, importService,{m06Candidate013:controlledM06,nativeZeroGeneration,nativeBusinessRecovery}),
      {m06Candidate013:controlledM06,nativeBusinessRecovery},
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
      accountService?.dispose()
      importService?.dispose()
      try {
        await disposeRpc()
      } finally {
        try {
          disposeTool()
        } finally {
          await service.closeV340Runtime()
          await service.closeLocalGeneration()
          await localGeneration?.dispose()
          await repository.close()
        }
      }
    })()
    return closePromise
  }
}
