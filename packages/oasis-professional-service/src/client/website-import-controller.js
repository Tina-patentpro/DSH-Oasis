import { sanitizeImportDiagnostics } from '../website-import-contract.js'

const empty = () => ({ busy: false, session: null, projects: [], totalProjects: 0, projectPage: 1, parentId: 0, keyword: '',
  project: null, kind: 'history', itemPage: 1, totalItems: 0, items: [], selected: [], result: null, error: null, notice: null, submitted: false })
const explanations = {
  WORKSPACE_OPERATION_BUSY: '当前项目正在导入、解除关联或准备生成，请等待原操作结束后重新确认；不会自动重试。',
  IMPORT_WORKSPACE_BUSY: '当前项目有未结束的生成，请先处理原任务，再导入。',
  AUTH_REQUIRED: '请先在此窗口登录绿洲账户。', IMPORT_ACCOUNT_CHANGED: '账户已变化，请重新读取项目。',
  IMPORT_LINK_CONFLICT: '当前本地项目已关联其他网站项目或账户；请在本窗口明确解除原关联后，重新选择项目。已有本地文件不变。',
  IMPORT_SETTINGS_CHANGED: '设置已变化，请重新读取项目，再确认解除关联；不会覆盖其他修改。',
  IMPORT_BUSY: '当前项目正在导入或解除关联，请等待原操作结束。',
  IMPORT_OWNERSHIP: '网站返回的项目或文件归属无法验证，已阻止导入。',
  IMPORT_REQUEST_FAILED: '网站接口读取失败或暂不支持；没有把失败当作空列表。请稍后明确重试。',
  IMPORT_UNSAFE_PATH: '目录或文件名不安全，已阻止写入。', IMPORT_TOO_LARGE: '所选文件超过本次大小限制。',
  IMPORT_WORKSPACE_CHANGED: '本地项目已变化，请重新打开导入。', IMPORT_EXPIRED: '选择已过期，请重新读取。',
  IMPORT_INCOMPLETE_CHECK_MANIFEST: '导入中断。请在当前项目中查看 .oasis-import- 开头的清单，核对已保存和未完成文件。',
}
function explain(error) {
  const base = Object.hasOwn(explanations, error?.code) ? explanations[error.code] : '操作未完成；请检查连接和导入清单，不会自动重试。'
  const d = sanitizeImportDiagnostics(error?.details)
  const endpoint = { 'project-list': '网站项目列表', 'project-detail': '项目归属核对', 'history-list': '历史内容列表',
    'history-detail': '历史内容详情', 'file-list': '项目文件列表', 'file-metadata': '项目文件元数据', 'file-download': '项目文件下载', 'history-attachment': '历史附件下载' }
  const kind = { http: '接口响应失败', network: '网络或响应传输失败', timeout: '请求超时', json: '返回内容不是有效 JSON',
    contract: '返回内容不符合接口合同', ownership: '项目或文件归属不符', operation: '请求操作未完成' }
  const stage = { authentication: '登录状态检查', request: '发送请求', response: '响应状态', body: '读取响应', json: '解析响应', validation: '校验响应' }
  if (!d.endpoint || !d.kind) return base
  return `${base} ${endpoint[d.endpoint]}：${kind[d.kind]}${d.stage ? `（${stage[d.stage]}）` : ''}${d.httpStatus ? `，HTTP ${d.httpStatus}` : ''}。不会自动重试。`
}
export function createWebsiteImportController({ remote, getWorkspaceId, getAccountRevision }) {
  let snapshot = Object.freeze(empty()), generation = 0, disposed = false
  const listeners = new Set()
  const publish = changes => { if (disposed) return; snapshot = Object.freeze({ ...snapshot, ...changes }); for (const cb of listeners) cb() }
  function current(session) { return session && session.workspaceId === getWorkspaceId() && session.accountRevision === getAccountRevision() }
  const clear = () => { generation++; publish(empty()) }
  async function operation(fn) {
    if (snapshot.busy || disposed) return false
    const g = generation
    publish({ busy: true, error: null })
    try {
      const patch = await fn()
      if (disposed || g !== generation) return false
      if (!current(patch?.session ?? snapshot.session)) { clear(); return false }
      publish(patch); return true
    } catch (error) {
      if (!disposed && g === generation) publish({ error: explain(error) })
      return false
    } finally { if (g === generation) publish({ busy: false }) }
  }
  async function browse({ page = 1, parentId = snapshot.parentId, keyword = snapshot.keyword } = {}) {
    if (!current(snapshot.session)) { clear(); return false }
    return operation(async () => {
      const result = await remote.websiteImport('projects', { token: snapshot.session.token, parentId, page, keyword })
      return { projects: result.items, totalProjects: result.total, projectPage: page, parentId, keyword }
    })
  }
  async function items({ project = snapshot.project, kind = snapshot.kind, page = 1 } = {}) {
    if (!current(snapshot.session) || !project || snapshot.submitted) return false
    const changed = project.id !== snapshot.project?.id
    // Selection survives pagination in the same project; never across projects.
    if (changed) publish({ selected: [], items: [], totalItems: 0, project, result: null })
    return operation(async () => {
      const result = await remote.websiteImport('items', { token: snapshot.session.token, folderId: project.id, kind, page })
      if (result.folderId !== project.id) throw Error('scope')
      return { project, kind, itemPage: page, items: result.items, totalItems: result.total }
    })
  }
  return Object.freeze({
    subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb) }, getSnapshot: () => snapshot,
    invalidate: clear,
    async start() {
      if (snapshot.busy) return false
      clear()
      const g = generation
      return operation(async () => {
        const session = await remote.websiteImport('open', { workspaceId: getWorkspaceId(), confirmed: true })
        if (!current(session) || g !== generation) throw Error('scope')
        publish({ session })
        const result = await remote.websiteImport('projects', { token: session.token, parentId: 0, page: 1, keyword: '' })
        return { session, projects: result.items, totalProjects: result.total }
      })
    },
    browse, items, selectProject: project => items({ project, kind: 'history', page: 1 }),
    toggle(key) {
      if (snapshot.busy || snapshot.submitted || !current(snapshot.session) || !snapshot.items.some(v => v.key === key && v.downloadable)) return
      const selected = new Set(snapshot.selected)
      if (selected.has(key)) selected.delete(key); else if (selected.size < 100) selected.add(key)
      publish({ selected: [...selected] })
    },
    async commit() {
      if (!current(snapshot.session)) { clear(); return false }
      if (!snapshot.project || snapshot.submitted || snapshot.busy) return false
      const { session, project, selected } = snapshot
      return operation(async () => {
        publish({ submitted: true })
        const result = await remote.websiteImport('commit', { token: session.token, folderId: project.id, keys: selected, confirmed: true })
        if (result.workspaceId !== session.workspaceId || result.folderId !== project.id) throw Error('scope')
        return { result }
      })
    },
    async unlink({ confirmed = false } = {}) {
      if (!confirmed || !current(snapshot.session) || !snapshot.session.link || snapshot.busy) return false
      const { session } = snapshot
      const done = await operation(async () => {
        const result = await remote.websiteImport('unlink', { token: session.token, expectedSettingsRevision: session.settingsRevision, confirmed: true })
        if (result.workspaceId !== session.workspaceId || result.status !== 'unlinked') throw Error('scope')
        return {}
      })
      if (done) { clear(); publish({ notice: '关联已解除，本地文件和历史记录保持不变。请重新读取网站项目并选择关联。' }) }
      return done
    },
    dispose() { disposed = true; generation++; listeners.clear() },
  })
}
