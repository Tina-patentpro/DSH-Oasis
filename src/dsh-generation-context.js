import { resolve, isAbsolute } from 'node:path'
import { WorkspaceMaterialError } from './workspace-materials.js'

// Fixed 0.1.2-rc.1 public projection/read APIs. No Agent resume, selection mutation or prompt assembly.
export function resolveDshGenerationContext(ctx, { workspaceId, sessionId }, { includeWorkspaceRoot = false } = {}) {
  try {
    const workspace = ctx.workspaceRegistry.get(workspaceId)
    const session = ctx.sessions.get(sessionId)
    const workspacePath = workspace?.path, sessionCwd = session?.header?.cwd
    const owners = ctx.workspaceRegistry.list().filter(item => item.sessionIds.includes(sessionId))
    if (!workspace || workspace.id !== workspaceId || !session || session.id !== sessionId
      || owners.length !== 1 || owners[0].id !== workspaceId || !workspace.sessionIds.includes(sessionId)
      || typeof workspacePath !== 'string' || typeof sessionCwd !== 'string'
      || resolve(workspacePath) !== resolve(sessionCwd)) throw new Error()
    if (includeWorkspaceRoot && (!isAbsolute(workspacePath) || !isAbsolute(sessionCwd)
      || workspacePath.includes('\0') || sessionCwd.includes('\0'))) throw new Error()
    const projection = ctx.sessionProjections.stateOf(session, 'modelSelection')
    if (!projection || !Object.hasOwn(projection, 'pending')) throw new Error()
    let picked = projection.pending
    if (picked === null) {
      const header = session.requestHeader()
      picked = header === undefined ? ctx.agentDefaultModel.currentSelection() : {
        provider: header.config.provider, model: header.config.model,
        ...(header.config.reasoningEffort === undefined || header.adapterDefaults?.reasoningEffort === true
          ? {} : { reasoningEffort: header.config.reasoningEffort }),
      }
    }
    if (!picked || !['provider', 'model'].every(key => typeof picked[key] === 'string' && picked[key].trim() && picked[key].length <= 256)
      || (picked.reasoningEffort !== undefined && (typeof picked.reasoningEffort !== 'string' || !picked.reasoningEffort.trim() || picked.reasoningEffort.length > 64))) throw new Error()
    return Object.freeze({ sessionId, ...(includeWorkspaceRoot ? { workspaceRoot: resolve(workspacePath) } : {}), route: Object.freeze({ provider: picked.provider, model: picked.model,
      ...(picked.reasoningEffort === undefined ? {} : { reasoningEffort: picked.reasoningEffort }) }) })
  } catch {
    throw new WorkspaceMaterialError('GENERATION_CONTEXT_UNAVAILABLE', '当前项目、会话或 DSH 模型配置不可用；未开始生成。')
  }
}
