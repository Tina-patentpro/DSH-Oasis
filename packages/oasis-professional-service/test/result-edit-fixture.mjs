import { fixtureHarness } from './unified-generation-harness.mjs'
import { createWorkbenchStore } from '../src/client/workbench-store.js'
import { createWorkbenchRemote } from '../src/client/workbench-remote.js'
import { createWorkbenchRpcHandler } from '../src/workbench-rpc.js'
import { createConnectionFixture } from './connection-fixture.mjs'

export async function resultEditFixture(t, overrides = () => ({})) {
  const h = await fixtureHarness({ unifiedFixtureEnabled: true })
  await h.service.createUnifiedRun(h.command())
  await h.service.createUnifiedRun(h.command())
  const b = structuredClone(h.state()); b.workspaceId = 'workspace-b'
  h.records.set('workspace-b', b)
  const remote = createWorkbenchRemote(createConnectionFixture(createWorkbenchRpcHandler(h.service)))
  const store = createWorkbenchStore({ remote: { ...remote, ...overrides(remote) }, saveDelayMs: 0 })
  t.after(async () => { await store.dispose(); await h.repository.close() })
  store.syncWorkspaces([{ workspaceId: 'workspace-a' }, { workspaceId: 'workspace-b' }])
  for (const id of ['workspace-a', 'workspace-b']) await store.hydrateWorkspace(id)
  const page = () => store.getWorkspaceState('workspace-a').pages.find(p => p.pageId === 'task-a')
  const draft = (id = 'run-1', ws = 'workspace-a') => store.getWorkspaceState(ws).pageOperations['task-a']?.resultEditDrafts?.[id]
  return { ...h, store, remote, page, draft }
}
