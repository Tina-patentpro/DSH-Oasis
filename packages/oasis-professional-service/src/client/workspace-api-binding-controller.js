// Transient settings-view state only. The Host's native settings remain the sole binding owner.
export function createWorkspaceApiBindingController({ remote, getWorkspaceId, getConfiguration }) {
  const listeners = new Set()
  const empty = () => ({ busy: false, options: null, detail: null, endpoint: '', folderId: '', error: null, notice: null })
  let snapshot = Object.freeze(empty()), generation = 0, scope = null
  const publish = changes => { snapshot = Object.freeze({ ...snapshot, ...changes }); for (const listener of listeners) listener() }
  function assertScope() {
    if (!scope || scope.workspaceId !== getWorkspaceId() || scope.config !== getConfiguration() || !scope.config?.canSubmit) {
      throw new Error('当前项目或连接配置已变化，请重新读取并确认')
    }
  }
  async function operate(operation) {
    if (snapshot.busy) throw new Error('请等待当前设置操作完成')
    const captured = generation
    publish({ busy: true, error: null, notice: null })
    try {
      const changes = await operation()
      if (captured !== generation) return
      assertScope(); publish(changes)
    } catch (error) {
      if (captured !== generation) return
      publish({ error: `项目绑定操作未完成（${error?.code ?? '项目、设置或选择失效'}），请重新读取。` })
      throw error
    } finally { if (captured === generation) publish({ busy: false }) }
  }
  return Object.freeze({
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    getSnapshot: () => snapshot,
    invalidate() { generation++; scope = null; publish(empty()) },
    async read() {
      const workspaceId = getWorkspaceId(), config = getConfiguration()
      if (!workspaceId || !config?.canSubmit) throw new Error('请先选择当前项目并配置 API 连接')
      scope = { workspaceId, config }
      return operate(async () => {
        const options = await remote.getBindingOptions({ workspaceId, remoteReadConfirmed: true })
        assertScope()
        if (options.workspaceId !== workspaceId) throw new Error('项目身份不一致')
        return { options, detail: null, endpoint: '', folderId: '' }
      })
    },
    async selectService(endpoint) {
      assertScope()
      const selected = snapshot.options?.services.find(s => s.apiEndpoint === endpoint)
      if (!selected) throw new Error('请从已读取目录中选择服务')
      publish({ detail: null, endpoint })
      return operate(async () => {
        const detail = await remote.getProfessionalDetail(endpoint)
        assertScope()
        if (!Number.isSafeInteger(detail.id) || detail.id < 0 || detail.name !== selected.apiEndpoint) throw new Error('服务已变化')
        return { detail }
      })
    },
    selectFolder(folderId) {
      assertScope()
      if (snapshot.busy || !snapshot.options.folders.some(f => String(f.id) === String(folderId))) throw new Error('请选择有效目录')
      publish({ folderId: String(folderId), notice: null })
    },
    async confirm(confirmed) {
      assertScope()
      const { options, detail, endpoint, folderId } = snapshot
      const service = options?.services.find(s => s.apiEndpoint === endpoint)
      if (confirmed !== true || !scope.config.settingsWritable || !service || !detail || folderId === '') throw new Error('请明确确认所选项目绑定')
      const payload = { workspaceId: options.workspaceId, workspacePath: options.workspacePath,
        expectedSettingsRevision: options.settingsRevision, environmentKind: options.environmentKind, apiBaseOrigin: options.apiBaseOrigin,
        accountId: options.accountId, folderId: Number(folderId), apiId: detail.id, catalogEntryId: service.apiId, apiEndpoint: service.apiEndpoint,
        apiProcess: service.apiProcess, schemaHash: detail.schemaHash, confirmed: true }
      return operate(async () => {
        await remote.confirmWorkspaceBinding(payload)
        return { options: null, detail: null, endpoint: '', folderId: '', notice: '项目绑定已保存到原生设置；未上传材料或生成。每次生成仍需确认。' }
      })
    },
  })
}
