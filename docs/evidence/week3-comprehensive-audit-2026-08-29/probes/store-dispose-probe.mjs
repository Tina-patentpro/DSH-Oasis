import { createWorkbenchStore } from '../../../../packages/oasis-professional-service/src/client/workbench-store.js'
import { createV2Record } from '../../../../packages/oasis-professional-service/test/workbench-fixtures.mjs'

let replaceStarted = false
const remote = {
  async get(workspaceId) {
    return createV2Record(workspaceId, 0, { empty: true })
  },
  async replace(_workspaceId, _revision, _draft, signal) {
    replaceStarted = true
    return new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true })
    })
  },
}
const store = createWorkbenchStore({
  remote,
  createId: () => 'task-a',
  clock: () => '2026-08-29T04:00:00.000Z',
  saveDelayMs: 0,
})
store.syncWorkspaces([{ workspaceId: 'workspace-a' }])
await store.hydrateWorkspace('workspace-a')
store.openPanel('workspace-a')

const disposePromise = store.dispose().then(
  () => 'resolved',
  (error) => `rejected:${error instanceof Error ? error.message : String(error)}`,
)
const outcome = await Promise.race([
  disposePromise,
  new Promise((resolve) => setTimeout(() => resolve('timeout'), 150)),
])
const report = {
  generatedAt: new Date().toISOString(),
  replaceStarted,
  outcome,
  disposeCompleted: outcome !== 'timeout',
}
console.log(JSON.stringify(report, null, 2))
if (!report.disposeCompleted) process.exitCode = 1
