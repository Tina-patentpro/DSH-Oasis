import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { fixtureHarness } from './unified-generation-harness.mjs'
import { createOasisRemoteService } from '../src/oasis-remote-service.js'
import { normalizeApiDetail } from '../src/oasis-api-contract.js'
import { canonicalJson } from '../src/local-mock-runner.js'

export async function executionHarness(t, serviceOptions = {}) {
  const h = await fixtureHarness({ claimsV2: true, ...serviceOptions })
  t.after(() => h.repository.close())
  const draft = h.draft(); draft.tasks['task-a'].generation.source = 'oasis-api'
  await h.service.replaceState('workspace-a', h.state().revision, draft)
  const { raw, ...detail } = normalizeApiDetail({ id: 39, name: 'synthetic-claims', api_type: 'Workflow', is_async: 0, price: 2, model_name: 'test',
    input_schema: [{ en_name: 'Technical_Disclosure_file', cn_name: '交底', type: 'file', content: '' },
      { en_name: 'drawings_explain_TD', cn_name: '附图', type: 'paragraph', content: '' }, { en_name: 'User_input', cn_name: '指令', type: 'paragraph', content: '' }],
    output_schema: [{ en_name: 'answer', cn_name: '正文', type: 'paragraph', content: '' }] })
  const workspace = { path: 'D:\\synthetic\\a', status: async () => 'ok' }
  const binding = { workspaceId: 'workspace-a', workspacePath: workspace.path, environmentKind: 'non-production', apiBaseOrigin: 'https://oasis-staging.example',
    accountId: 101, folderId: 8, folderName: 'test', apiId: 39, apiEndpoint: 'synthetic-claims', apiProcess: 'one',
    schemaHash: createHash('sha256').update(canonicalJson(detail)).digest('hex'), confirmedAt: '2026-09-20T00:00:00.000Z' }
  const value = { apiBaseUrl: binding.apiBaseOrigin, credentialOrigin: binding.apiBaseOrigin, workspaceApiBindings: [binding], downloadOrigins: ['https://files-staging.example'] }
  const user = { id: 101, balance: 20 }, calls = []; let seq = 0, revision = 7, runtimeChanged = false
  const reply = { answerText: '1. 一种控制器，其特征在于包括日志存储器。', fileUrls: [] }
  const client = {
    getUserDetail: async () => structuredClone(user),
    getCategoryCatalog: async () => [{ categoryId: 1, categoryName: 'test', group: 'test', description: '', apiDescription: '', apiId: 39, apiEndpoint: 'synthetic-claims', apiProcess: 'one' }],
    getApiDetail: async () => structuredClone(detail), getFolderDetail: async () => ({ id: 8, name: 'test' }),
    uploadFile: async file => { calls.push({ kind: 'upload', file }); return 'https://files-staging.example/disclosure.txt' },
    createWorkflow: async body => { calls.push({ kind: 'create', body }); return { resolved: true, result: { ...reply, key: body.key, recordId: 11 } } },
    queryProcess: async key => { calls.push({ kind: 'query', key }); return { status: 'running', result: null } },
  }
  const active = { enabled: true, credentialConfigured: true, environmentKind: 'non-production', apiBaseOrigin: binding.apiBaseOrigin,
    client, assertCurrent: async () => { if (runtimeChanged) throw Object.assign(new Error('changed'), { code: 'REMOTE_RUNTIME_CHANGED' }) } }
  const options = { repository: h.repository, settings: { describe: () => [{ ns: 'oasis-professional-service', revision, value }] },
    workspaceRegistry: { get: id => id === 'workspace-a' ? workspace : undefined }, getRuntime: async () => active,
    materialManager: { recheckAll: () => assert.fail('derived TXT must not read project materials'), readForUpload: () => assert.fail('not a project file') },
    executionIdFactory: () => `api-${++seq}`, runIdFactory: () => `api-run-${++seq}`, pollLimit: 1, pollIntervalMs: 0 }
  const professional = createOasisRemoteService(options)
  const base = () => ({ workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: h.state().revision, expectedSettingsRevision: revision })
  const preview = async () => {
    const prepared = await professional.prepareClaimsMapping(base())
    return professional.previewClaims({ ...base(), preparationSha256: prepared.preparationSha256, remoteReadConfirmed: true })
  }
  return { ...h, professional, options, base, preview, detail, rawDetail: raw, active, binding, value, client, user, calls, reply, workspace,
    changeRuntime: () => { runtimeChanged = true }, bumpSettings: () => revision++,
    start: async (p, patch = {}) => professional.startClaims({ ...base(), confirmationToken: p.confirmationToken, requestKey: 'test-api-key',
      priceConfirmed: true, externalTransferConfirmed: true, ...patch }),
    execute: async () => { const p = await preview(); const result = await professional.startClaims({ ...base(), confirmationToken: p.confirmationToken,
      requestKey: 'test-api-key', priceConfirmed: true, externalTransferConfirmed: true }); assert.equal(result.committed, true)
      const executionId = h.state().tasks['task-a'].remoteExecutionOrder[0]
      await professional.continue({ workspaceId: 'workspace-a', taskId: 'task-a', executionId }); return h.state().tasks['task-a'] },
  }
}
