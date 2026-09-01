import { defineTool } from '@deepseek-ai/dsh-tools'

import { createPluginStatus } from './status.js'
import { registerOasisSettings } from './oasis-runtime-config.js'
import { openOasisWorkbenchRepository } from './workbench-repository.js'
import { createWorkbenchRpcHandler, OASIS_WORKBENCH_RPC_CHANNEL } from './workbench-rpc.js'
import { createWorkbenchService } from './workbench-service.js'

export const name = 'oasis-professional-service'
export const inject = ['tools', 'storageDomain', 'connection', 'workspaceRegistry', 'settings', 'credentials']

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
  registerOasisSettings(ctx)
  const repository = await openOasisWorkbenchRepository(ctx.storageDomain)
  const service = createWorkbenchService({ repository, workspaceRegistry: ctx.workspaceRegistry })
  let disposeTool
  let disposeRpc
  try {
    disposeTool = registerStatusTool(ctx)
    disposeRpc = ctx.connection.rpc.handle(
      OASIS_WORKBENCH_RPC_CHANNEL,
      createWorkbenchRpcHandler(service),
      { authority: 'loopback' },
    )
  } catch (error) {
    try {
      disposeTool?.()
    } finally {
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
          await repository.close()
        }
      }
    })()
    return closePromise
  }
}
