import { createWorkspaceMaterialManager, WorkspaceMaterialError } from './workspace-materials.js'
import { claimsUpstreamReferenceSchema, claimsUpstreamSnapshotSchema, hasPendingUnifiedRun } from './generation-contract.js'
import { isOasisRemoteExecutionUnresolved } from './workbench-contract.js'

const policy = { acceptedExtensions: ['.md'], maxFileBytes: 65536, contentReadMode: 'metadata-only' }
const missing = Object.freeze({ status: 'missing', reason: 'not-connected' })
const fail = (code, message) => { throw new WorkspaceMaterialError(code, message) }
const headings = ['文档信息', '核心结论', '核心结果', '下游读取区', '风险与待确认事项']
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i

export function inspectClaimsUpstream(body, relativePath, sha256) {
  if (!body || body.length > 24000 || body.includes('\0')) fail('UPSTREAM_TOO_LARGE', '上游文稿为空、编码不支持或超出完整读取上限。')
  const normalized = body.replaceAll('\r\n', '\n')
  const issues = []
  const main = [...normalized.matchAll(/^## (.+)$/gm)].map(m => m[1])
  if (JSON.stringify(main) !== JSON.stringify(headings)) issues.push('上游五章节结构异常')
  const info = normalized.split(/^## 文档信息\n/m)[1]?.split(/^## /m)[0] ?? ''
  const get = key => {
    const values = [...info.matchAll(new RegExp(`^(?:- )?${key}: *([^\\n]+)$`, 'gm'))]
    return values.length === 1 ? values[0][1].trim() : null
  }
  const sourceNode = get('node_id') === 'Flow-1-5' ? 'Flow-1-5' : null
  const id = get('workflow_run_uid'), workflowRunUid = id && uuid.test(id) ? id.toLowerCase() : null
  const generatedAt = get('generated_at')
  const time = generatedAt && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(generatedAt) ? new Date(generatedAt) : null
  const name = relativePath.split(/[\\/]/).at(-1)
  const stamp = time && Number.isFinite(time.getTime()) ? new Date(time.getTime() + 8 * 3600000).toISOString().slice(0,19).replace(/[-T:]/g, '') : null
  if (!sourceNode || !workflowRunUid || !stamp || get('filename') !== name
    || name !== `disclosure_${stamp}_${workflowRunUid?.replaceAll('-', '').slice(0,8)}.md`) issues.push('上游节点、运行身份或文件名未核实')
  return claimsUpstreamSnapshotSchema.parse({ status: issues.length ? 'warning' : 'accepted', body, relativePath, sha256,
    sourceNode, workflowRunUid, generatedAt: stamp ? generatedAt : null, issues })
}

// Separate explicit text-read use; existing material registration remains metadata-only.
export function createClaimsUpstreamService({ repository, workspaceRegistry, clock }) {
  const reader = workspaceRegistry ? createWorkspaceMaterialManager({ workspaceRegistry, clock }) : null
  async function read(workspaceId, reference) {
    if (!reader) fail('UPSTREAM_UNAVAILABLE', '当前项目文件读取不可用。')
    const bytes = await reader.readForUpload(workspaceId, claimsUpstreamReferenceSchema.parse(reference), policy)
    let body
    try { body = new TextDecoder('utf-8', { fatal: true }).decode(bytes.bytes) }
    catch { fail('UPSTREAM_ENCODING', '上游文稿必须为 UTF-8 Markdown。') }
    return inspectClaimsUpstream(body, reference.relativePath, bytes.sha256)
  }
  return {
    async capture(workspaceId, task) {
      return task.generation?.upstream ? read(workspaceId, task.generation.upstream) : missing
    },
    async selectClaimsUpstream({ workspaceId, taskId, expectedRevision, relativePath, confirmed }) {
      if (confirmed !== true) fail('UPSTREAM_CONFIRMATION_REQUIRED', '请确认读取当前项目的上游文稿。')
      return repository.mutate(workspaceId, expectedRevision, async current => {
        const task = current.tasks[taskId]
        if (task?.workflowId !== 'patent-claims' || task.workflowVersion !== '2' || !task.generation) fail('WORKFLOW_MISMATCH', '当前任务不支持上游文稿。')
        if (Object.values(current.tasks).some(t => hasPendingUnifiedRun(t) || Object.values(t.remoteExecutions).some(isOasisRemoteExecutionUnresolved))) fail('WORKSPACE_GENERATION_ACTIVE', '已有未决运行，不能更换材料。')
        let reference
        if (relativePath !== null) {
          if (!reader) fail('UPSTREAM_UNAVAILABLE', '当前项目文件读取不可用。')
          const { observedAt, ...inspected } = await reader.inspect(workspaceId, relativePath, policy)
          reference = claimsUpstreamReferenceSchema.parse({ kind: 'project-file', ...inspected })
          await read(workspaceId, reference)
        }
        const next = structuredClone(current)
        if (reference) next.tasks[taskId].generation.upstream = reference
        else delete next.tasks[taskId].generation.upstream
        next.tasks[taskId].updatedAt = clock()
        return next
      })
    },
  }
}
