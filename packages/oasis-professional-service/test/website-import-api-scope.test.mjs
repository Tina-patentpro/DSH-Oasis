import test from 'node:test'
import assert from 'node:assert/strict'
import { executionHarness } from './claims-api-execution-harness.mjs'

test('imported website project never silently reuses a different legacy API folder binding', async t => {
  const h = await executionHarness(t)
  const { workspaceId, workspacePath, apiBaseOrigin, accountId, folderName, confirmedAt } = h.binding
  h.value.websiteProjectLinks = [{ workspaceId, workspacePath, apiBaseOrigin, accountId, folderName, confirmedAt, folderId: 9 }]
  await assert.rejects(h.professional.prepareClaimsMapping(h.base()), { code: 'WEBSITE_PROJECT_LINK_CONFLICT' })
  assert.deepEqual(h.calls, [])
})
test('imported project without an approved service mapping reports the actual missing contract', async t => {
  const h = await executionHarness(t)
  const { workspaceId, workspacePath, apiBaseOrigin, accountId, folderName, confirmedAt, folderId } = h.binding
  h.value.websiteProjectLinks = [{ workspaceId, workspacePath, apiBaseOrigin, accountId, folderName, confirmedAt, folderId }]
  h.value.workspaceApiBindings = []
  await assert.rejects(h.professional.prepareClaimsMapping(h.base()), { code: 'API_SERVICE_MAPPING_REQUIRED' })
  assert.deepEqual(h.calls, [])
})
