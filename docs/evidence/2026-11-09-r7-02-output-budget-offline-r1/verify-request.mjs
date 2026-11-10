import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

const [bundle, templatePath, previousRunPath, expectedTokenText] = process.argv.slice(2)
const expectedTokens = Number(expectedTokenText)
const read = path => JSON.parse(readFileSync(path))
const hash = text => createHash('sha256').update(text).digest('hex')
const load = (root, path) => import(pathToFileURL(join(root, path)).href)
const payload = join(bundle, 'payload')
const app = join(payload, 'App/DSH Desktop.app/Contents/Resources/app/node_modules/@deepseek-ai')
const business = join(payload, 'components/c3/src')
const previous = read(previousRunPath)
const template = read(templatePath)
const provider = template.patch.find(row => row.id === 'llm-deepseek')
const model = template.patch.find(row => row.id === 'agent-default-model')
const route = model.config

test('fixed rc.5 and SDK serialize a single Low Messages request without retries', async t => {
  const requests = []
  // This process uses only synthetic authentication and an intercepted HTTP boundary.
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url: String(url), method: options.method, body: JSON.parse(options.body) })
    return new Response('{"error":{"message":"offline fixture","type":"overloaded_error"}}', { status: 503 })
  })
  const { Context } = await load(app, 'cordis/lib/index.js')
  const { LlmRuntime, BlockAssembler, createUserMessage } = await load(app, 'dsh-llm/lib/index.js')
  const { DeepSeekAdapter } = await load(app, 'dsh-llm-deepseek/lib/index.js')
  const { resolveAdapterOptions } = await load(app, 'dsh-llm-deepseek-api-key/lib/index.js')
  const { createM06BusinessNativeCandidate013 } = await load(business, 'v340-native-model.js')
  const { canonicalJson } = await load(business, 'local-mock-runner.js')
  const sdk = new Context()
  sdk.provide('workspaceRegistry', { get: () => undefined })
  t.after(() => sdk.fiber.dispose())
  await sdk.plugin(LlmRuntime).await()
  const connection = resolveAdapterOptions(provider.config)
  const adapter = new DeepSeekAdapter({
    options: () => connection,
    resolveFiles: () => ({}),
    resolveAuth: async () => ({ headers: {} }),
    resolveUserId: () => 'offline-fixture',
    prepareExtensions: async () => ({ fields: {}, accept: async () => {} }),
  })
  t.after(sdk.llm.registerAdapter([route.provider], adapter))
  const uid = 'offline-r7-02-wire-fixture'
  const snapshot = { ...previous.inputSnapshot, runId: 'v340-' + uid, workflowRunUid: uid, requestKey: uid }
  const { workspaceId, taskId, nodeId, source, prepared, runId } = snapshot
  const { sessionId, workspaceRoot } = previous.nativeCandidate
  const workspace = { id: workspaceId, path: workspaceRoot, sessionIds: [sessionId] }
  const session = { id: sessionId, header: { cwd: workspaceRoot }, requestHeader: () => undefined }
  const sdkPreparation = []
  const ctx = {
    llm: {
      async prepareCall(...args) {
        const call = await sdk.llm.prepareCall(...args)
        sdkPreparation.push({ config: call.config, retryPolicy: call.retryPolicy })
        return call
      },
    },
    workspaceRegistry: { get: () => workspace, list: () => [workspace] },
    sessions: { get: () => session },
    sessionProjections: { stateOf: () => ({ pending: null }) },
    agentDefaultModel: { currentSelection: () => route },
  }
  const executor = createM06BusinessNativeCandidate013({ ctx, native: { BlockAssembler, createUserMessage } })
  const expectedRevision = 84
  const preview = await executor.prepareConfirmation({ workspaceId, taskId, sessionId, expectedRevision, prepared })
  assert.deepEqual(preview.route, { provider: 'deepseek-official', model: 'deepseek-flash', reasoningEffort: 'low' })
  const inputSha256 = hash(canonicalJson(snapshot))
  const nativeCandidate = await executor.prepareAdmission({
    inputSnapshot: snapshot, inputSha256, expectedRevision,
    confirmation: { sessionId, confirmed: true, sha256: preview.sha256 },
  })
  for (const key of ['preparedSHA256', 'instructionSHA256', 'systemSHA256', 'businessResourceSHA256', 'businessManifestSHA256']) {
    assert.equal(nativeCandidate[key], previous.nativeCandidate[key], key)
  }
  const candidateRun = {
    runId, workflowRunUid: uid, workspaceId, taskId, nodeId, source,
    status: 'prepared', evidenceKind: 'native-model-candidate',
    inputSnapshot: snapshot, inputSha256, nativeCandidate,
  }
  const args = { runId, workflowRunUid: uid, workspaceId, taskId, nodeId, source, prepared, candidateRun, signal: new AbortController().signal }
  const result = await executor.generate(args)
  assert.notEqual(result.status, 'completed')
  assert.deepEqual(await executor.generate(args), { status: 'unknown', code: 'EXECUTION_UNCONFIRMED' })
  assert.equal(requests.length, 1)
  assert.equal(sdkPreparation.length, 1)
  assert.equal(sdkPreparation[0].retryPolicy.mode, 'normal')
  assert.equal(sdkPreparation[0].retryPolicy.maxRetries, 0)
  const { url, method, body } = requests[0]
  assert.equal(url, 'https://api.deepseek.com/anthropic/v1/messages')
  assert.equal(method, 'POST')
  assert.equal(body.model, 'deepseek-flash')
  assert.equal(body.max_tokens, expectedTokens, 'actual serialized max_tokens')
  assert.equal(sdkPreparation[0].config.maxTokens, expectedTokens)
  assert.deepEqual(body.thinking, { type: 'enabled' })
  assert.deepEqual(body.output_config, { effort: 'low' })
  assert.equal(body.tools, undefined)
  assert.equal(body.messages.length, 1)
  assert.equal(body.messages[0].role, 'user')
  assert.equal(body.messages[0].content.length, 1)
  const text = body.messages[0].content[0]
  assert.equal(text.type, 'text')
  const sent = JSON.parse(text.text)
  assert.equal(sent.runId, runId)
  assert.deepEqual(sent.values, prepared.values)
  assert.deepEqual(sent.receipts, prepared.receipts)
  assert.equal(hash(body.system), nativeCandidate.systemSHA256)
  t.diagnostic(JSON.stringify({
    url, method, model: body.model, max_tokens: body.max_tokens, thinking: body.thinking,
    effort: body.output_config.effort, maxRetries: sdkPreparation[0].retryPolicy.maxRetries,
    interceptedRequests: requests.length, responseFixtureStatus: 503, realCalls: 0,
    preparedInputHash: prepared.inputHash, preparedSHA256: nativeCandidate.preparedSHA256,
    systemSHA256: nativeCandidate.systemSHA256, resourceSHA256: nativeCandidate.businessResourceSHA256,
  }))
})
