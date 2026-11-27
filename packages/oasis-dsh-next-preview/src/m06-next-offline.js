import { createDshV340GenerationAdapter } from './dsh-generation-adapter.js'
import { loadM06PublicInstruction, M06_PUBLIC_RESOURCE_SHA256 } from './m06-public-resources-r1.js'
import { getV340Node, v340Hash } from './v340-catalog.js'
import { parseV340ModelOutput } from './v340-document.js'
import { createOasisApiClient, normalizeApiDetail } from './oasis-api-contract.js'
import { buildM06ApiCreateBody, M06_API_CONTRACT_SHA256, m06ApiDetailFingerprint, parseM06ApiResult } from './m06-api-contract-adapter.js'

const nodeId = 'Flow-2-6'
const route = Object.freeze({ provider: 'oasis-m06-offline', model: 'fixture' })
const origin = 'https://m06-offline.invalid'
const endpoint = 'offline-m06'
const detail = normalizeApiDetail({
  id: 101, name: endpoint, api_type: 'Workflow', is_async: 0, price: 0,
  input_schema: getV340Node(nodeId).inputs.map(({ id }) => ({ type: 'paragraph', en_name: id, cn_name: id })),
  output_schema: [{ type: 'paragraph', en_name: 'm06_output_json', cn_name: '结构结果' }],
})

function fixtureOutput(source) {
  return {
    summary: `${source}离线合成验收`,
    core_result_markdown: `${source}离线合成结果，仅供验证数据合同与流程。`,
    updates: [], tables: {}, terms_master: [], warnings: [], model_completions: [],
  }
}

function createOfflineApi() {
  return createOasisApiClient({
    baseUrl: origin,
    resolveToken: async () => 'offline-fixture',
    async fetchImpl(url, init) {
      if (url !== `${origin}/api/apicategories/create` || init.method !== 'POST') {
        throw new Error('Unexpected offline API request')
      }
      init.signal?.throwIfAborted()
      const request = JSON.parse(init.body)
      return Response.json({ data: { key: request.key, answer_text: JSON.stringify(fixtureOutput('专业 API')) } })
    },
  })
}

async function generateApi(api, { workspaceId, runId, prepared, signal }) {
  const context = {
    workspaceId, workspacePath: '/m06-offline-fixture', environmentKind: 'non-production',
    apiBaseOrigin: origin, accountId: 1, folderId: 2,
  }
  const service = {
    apiBaseOrigin: origin, apiId: detail.id, catalogEntryId: 102, apiEndpoint: endpoint,
    apiProcess: 'offline-fixture', schemaHash: m06ApiDetailFingerprint(detail),
  }
  const binding = { ...context, ...service, folderName: '离线合成项目', confirmedAt: '2026-11-11T00:00:00.000Z' }
  const delivery = {
    version: 'flow26-m06-api-binding-1', contractSHA256: M06_API_CONTRACT_SHA256,
    resourceSHA256: M06_PUBLIC_RESOURCE_SHA256, service, status: 'accepted-for-integration',
    workflow: { applicationId: 'offline-m06', version: 'fixture', dslSHA256: v340Hash('offline fixture DSL') },
    acceptanceReceiptSHA256: v340Hash('offline fixture receipt'),
  }
  const { request } = buildM06ApiCreateBody({ prepared, key: runId, binding, delivery, context, detail })
  const response = await api.createWorkflow({
    id: request.id, key: request.key, inputs: request.inputs, apiProcess: request.api_process, folderId: request.folder_id,
  }, { signal })
  if (response.resolved !== true) return { status: 'unknown', code: 'EXECUTION_UNCONFIRMED' }
  return { status: 'completed', output: parseM06ApiResult(response, runId) }
}

export function createNextOfflineRuntime(llm, { LlmAdapter, BlockAssembler, createUserMessage }) {
  const instruction = loadM06PublicInstruction()
  const adapter = createDshV340GenerationAdapter({ llm, BlockAssembler, createUserMessage })
  const api = createOfflineApi()
  class FixtureProvider extends LlmAdapter {
    async resolveModel(provider, model) {
      if (provider !== route.provider || model !== route.model) throw new Error('Unexpected offline model')
      return { provider, id: model, name: model }
    }

    async *stream({ signal }) {
      signal.throwIfAborted()
      yield { type: 'text-delta', index: 0, text: JSON.stringify(fixtureOutput('本地 Skills')) }
      yield { type: 'finish', reason: { kind: 'stop' } }
    }
  }

  const dispose = llm.registerAdapter([route.provider], new FixtureProvider())
  const canExecute = (node, source) => node === nodeId && ['local-skill', 'oasis-api'].includes(source)
  const executor = {
    evidenceKind: 'synthetic',
    canExecute,
    async generate(input) {
      const { nodeId: node, source, runId, workspaceId, prepared, signal } = input
      if (!canExecute(node, source)) return { status: 'failed', code: 'INVALID_INPUT' }
      signal.throwIfAborted()
      if (source === 'oasis-api') return generateApi(api, input)
      const result = await adapter.generate({
        runId, sessionId: workspaceId, route, instruction: { version: 'V3.4.0', body: instruction.body }, signal,
        requestText: JSON.stringify({ businessVersion: 'V3.4.0', nodeId, runId, values: prepared.values, receipts: prepared.receipts }),
        assertCurrent: () => signal.throwIfAborted(),
      })
      if (result.status !== 'completed') return result
      return {
        status: 'completed', output: parseV340ModelOutput(JSON.parse(result.body)),
        executionSummary: result.executionSummary,
      }
    },
  }
  return { executor, dispose }
}
