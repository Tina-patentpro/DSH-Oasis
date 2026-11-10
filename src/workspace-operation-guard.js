import { WorkspaceMaterialError } from './workspace-materials.js'

// One Host shares this guard across import/settings changes and generation admission.
// Durable unresolved runs protect the Workspace after admission releases the guard.
export function createWorkspaceOperationGuard() {
  const busy = new Set()
  return Object.freeze({
    isBusy: workspaceId => busy.has(workspaceId),
    async run(workspaceId, operation) {
      if (busy.has(workspaceId)) {
        throw new WorkspaceMaterialError('WORKSPACE_OPERATION_BUSY', '当前项目正在导入、解除关联或准备生成，请等待原操作结束后重新确认；不会自动重试。')
      }
      busy.add(workspaceId)
      try { return await operation() }
      finally { busy.delete(workspaceId) }
    },
  })
}
