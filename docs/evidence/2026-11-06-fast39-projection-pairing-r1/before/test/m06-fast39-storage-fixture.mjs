import { mkdtempSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { prepareV340Inputs } from '../src/v340-document.js'
import { prepareM06WorkareaConstrainedCalibration } from '../src/m06-workarea-material-packet.js'
import { buildM06Fast39Registry, fast39CanonicalJson, renderM06Fast39Pending, renderM06Fast39Output } from '../src/m06-fast39-result.js'
import { computeOasisRemoteInputSha256 } from '../src/workbench-domain.js'
import { openOasisWorkbenchRepository } from '../src/workbench-repository.js'
import { createOasisRemoteService } from '../src/oasis-remote-service.js'
import { createOasisApiClient } from '../src/oasis-api-contract.js'
import { createWorkspaceOperationGuard } from '../src/workspace-operation-guard.js'
import { createMaterialReference, createV3Record, NOW } from './workbench-fixtures.mjs'

export const hash = text => createHash('sha256').update(text).digest('hex')
export async function storageFixture(t, examples, patch = {}) {
  const root = mkdtempSync(join(tmpdir(), 'oasis-fast39-storage-')), file = join(root, 'records.json')
  const prepared = prepareV340Inputs('Flow-2-6', { disclosure_text: '合成材料：构件甲。\r\n😀' })
  const proposal = prepareM06WorkareaConstrainedCalibration(prepared), packetText = new TextDecoder().decode(proposal.document.bytes)
  const context = { prepared, packetText, User_input: proposal.apiTextInputs.User_input, documentCount: 1,
    directFields: Object.fromEntries(['technical_field', 'background_art_TD', 'technical_solutions', 'beneficial_effects_TD', 'embodiments_TD', 'drawings_explain_TD'].map(k => [k, ''])) }
  const registry = buildM06Fast39Registry(context), q = structuredClone(examples.quality_report)
  Object.assign(q, { source_registry_sha256: hash(fast39CanonicalJson(registry)), input_warnings: registry.input_warnings,
    limitations: registry.limitations, required_missing_input_lines: registry.required_missing_input_lines })
  const outputs = { ...structuredClone(examples.structured_result.outputs), quality_report: JSON.stringify(q) }
  outputs.pending_confirmation = renderM06Fast39Pending(q); outputs.output = renderM06Fast39Output(outputs, q)
  const key = 'synthetic-c4-request', runId = examples.structured_result.workflow_run_id
  const body = JSON.stringify({ workflow_run_id: runId, data: { id: runId, status: 'succeeded', outputs } }, null, 2) + '\n'
  const fragment = { structured_result: { contract_version: 'flow26-fast-result-3', request_key: key, workflow_run_id: runId,
    provider_status: 'succeeded', outputs, provider_response_receipt: { hash_version: 'provider-http-content-bytes-1',
      sha256: hash(body), byte_length: Buffer.byteLength(body), http_status: 200, body_retention: 'hash_only' } } }
  const material = createMaterialReference({ referenceId: 'packet-ref', relativePath: 'materials/m06-materials-r2.txt',
    displayName: 'm06-materials-r2.txt', mediaType: 'text/plain', sizeBytes: Buffer.byteLength(packetText), sha256: hash(packetText) })
  const provider = { environmentKind: 'non-production', accountId: 101, apiBaseOrigin: 'https://oasis-staging.example',
    apiId: 9876, catalogEntryId: 9860, apiEndpoint: 'synthetic-c4', apiProcess: 'synthetic-only', folderId: 7654, price: 2 }
  const formValues = { ...context.directFields, User_input: context.User_input, Technical_Disclosure_file: material.referenceId }
  const execution = { executionId: 'execution-fast39', requestKey: key, status: 'submitting', inputSha: computeOasisRemoteInputSha256({
    providerSnapshot: provider, formValues, inputRefs: [material] }), formValues, environmentKind: provider.environmentKind,
    accountId: 101, apiBaseOrigin: provider.apiBaseOrigin, serviceSnapshot: { apiId: provider.apiId, catalogEntryId: provider.catalogEntryId,
      apiEndpoint: provider.apiEndpoint, apiProcess: provider.apiProcess, schemaHash: hash('synthetic C4 schema') },
    folderSnapshot: { folderId: provider.folderId, folderName: 'synthetic' }, priceSnapshot: { price: 2, balance: 20 },
    materialSnapshots: [material], uploadedFiles: [{ fieldId: 'Technical_Disclosure_file', referenceId: material.referenceId,
      url: 'https://files-staging.example/packet.txt', sha256: material.sha256, uploadedAt: NOW }], safeError: null,
    createdAt: NOW, updatedAt: NOW, submittedAt: NOW, completedAt: null }
  const initial = createV3Record('workspace-a'); initial.schemaVersion = 4
  Object.assign(initial.tasks['task-a'], { workType: 'cn-invention-patent', workflowId: 'cn-invention-patent', workflowVersion: '1',
    generation: null,
    inputRefs: [material], remoteExecutionOrder: [execution.executionId], remoteExecutions: { [execution.executionId]: execution } })
  writeFileSync(file, JSON.stringify({ 'workspace-a': initial }))
  const h = { root, file, context, registry, fragment, outputs, initial, writes: 0, failWrites: false, fakeCreates: 0, userId: 101,
    workspacePath: root, newRequests: 0 }
  // Substitute only the Domain I/O. Repository serialization, integrity, revision
  // conflict handling and service mutation paths are production code.
  h.storageDomain = { async open() { return { table() { return {
    get(id) { return JSON.parse(readFileSync(file, 'utf8'))[id] },
    async put(id, value) { if (h.failWrites) throw Error('synthetic disk failure'); const all = JSON.parse(readFileSync(file, 'utf8'))
      all[id] = value; writeFileSync(file + '.tmp', JSON.stringify(all)); renameSync(file + '.tmp', file); h.writes++ },
  } }, async close() {} } } }
  h.repository = await openOasisWorkbenchRepository(h.storageDomain, { clock: () => NOW })
  const httpClient = createOasisApiClient({ baseUrl: provider.apiBaseOrigin, downloadOrigins: ['https://files-staging.example'],
    resolveToken: async () => 'synthetic-test-only', fetchImpl: async (url, init) => {
      if (init.method !== 'POST' || new URL(url).pathname !== '/api/apicategories/create') throw Error('unexpected request')
      h.fakeCreates++; return new Response(JSON.stringify({ data: { id: 81, key, answer_text: outputs.output, file_url: '', ...h.fragment } }), { status: 200 })
    } })
  h.transport = () => httpClient.createWorkflow({ id: provider.apiId, key, inputs: {}, apiProcess: provider.apiProcess, folderId: provider.folderId })
  h.runtime = { enabled: true, credentialConfigured: true, environmentKind: provider.environmentKind, apiBaseOrigin: provider.apiBaseOrigin,
    assertCurrent: async () => {}, client: { getUserDetail: async () => ({ id: h.userId, balance: 20 }),
      createWorkflow: async () => { h.newRequests++; throw Error('unexpected create') }, queryProcess: async () => { h.newRequests++; throw Error('unexpected query') } } }
  h.delivery = { ...context, frozenDeliverySha256: hash('synthetic frozen delivery; not deployed'), originalEnqueueFact: 'unknown',
    workspaceId: 'workspace-a', workspacePath: root, taskId: 'task-a', executionId: execution.executionId, requestKey: key,
    workflowId: 'cn-invention-patent', workflowVersion: '1', inputSha: execution.inputSha, ...provider, schemaHash: execution.serviceSnapshot.schemaHash }
  h.workspaceOperations = createWorkspaceOperationGuard()
  h.serviceFor = (delivery = h.delivery) => createOasisRemoteService({ repository: h.repository,
    materialManager: { recheckAll: async () => { throw Error('unexpected read') }, readForUpload: async () => { throw Error('unexpected upload') } },
    getRuntime: async () => h.runtime, workspaceRegistry: { get: id => id === 'workspace-a' ? h.workspace : undefined },
    fast39Delivery: delivery, workspaceOperations: h.workspaceOperations, clock: () => NOW, executionIdFactory: () => 'never-create', runIdFactory: () => 'run-fast39' })
  h.workspace = { get path() { return h.workspacePath }, async status() { return 'ok' } }
  h.service = h.serviceFor(patch.delivery === false ? undefined : { ...h.delivery, ...patch.delivery })
  h.command = result => ({ workspaceId: 'workspace-a', taskId: 'task-a', executionId: execution.executionId,
    expectedRevision: h.repository.get('workspace-a').revision, result })
  h.record = () => h.repository.get('workspace-a')
  h.execution = () => h.record().tasks['task-a'].remoteExecutions[execution.executionId]
  h.pad = async target => h.repository.mutate('workspace-a', h.record().revision, current => {
    const candidate = structuredClone(current), values = candidate.tasks['task-a'].formValues
    let index = 0
    while (Buffer.byteLength(JSON.stringify(candidate)) < target) {
      const key = 'padding' + index++; values[key] = ''
      const length = Math.min(200000, target - Buffer.byteLength(JSON.stringify(candidate)))
      if (length <= 0) break
      values[key] = 'x'.repeat(length)
    }
    return candidate
  })
  t.after(async () => { await h.repository.close(); rmSync(root, { recursive: true, force: true }) })
  return h
}
