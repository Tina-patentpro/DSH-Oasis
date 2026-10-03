import { createHash, randomUUID } from 'node:crypto'
import { CLAIMS_TEMPLATE_ID, hasPendingUnifiedRun } from './generation-contract.js'
import { WORKBENCH_LIMITS, isOasisRemoteExecutionUnresolved } from './workbench-contract.js'
import { validateWorkflowForm } from './workflow-catalog.js'
import { createUnifiedResult, unifiedInputSha256 } from './unified-fixture.js'
import { WorkspaceMaterialError } from './workspace-materials.js'
import { missingUpstream } from './claims-v2-result.js'
import { normalizeLocalExecutionSummary } from './local-run-summary.js'
import { createWorkspaceOperationGuard } from './workspace-operation-guard.js'

const fail = (code, message) => { throw new WorkspaceMaterialError(code, message) }
const safeCodes = new Set(['GENERATION_FAILED', 'ABORTED', 'TIMED_OUT', 'INVALID_OUTPUT', 'INVALID_INPUT', 'MODEL_UNAVAILABLE', 'MODEL_LIMITED'])

// Owns only this Host's admitted calls; the repository remains the durable state owner.
export function createLocalGenerationService({ repository, runtime, clock, runIdFactory, upstream, workspaceOperations = createWorkspaceOperationGuard() }) {
  const active = new Map()
  const keyFor = (workspaceId, runId) => JSON.stringify([workspaceId, runId])
  const enabled = () => runtime?.enabled === true && ['native-offline', 'native-model'].includes(runtime.evidenceKind)
  let closing = false
  function taskFor(record, id) {
    const task = record.tasks[id]
    if (!task || task.workflowId !== CLAIMS_TEMPLATE_ID || !task.generation) fail('TASK_NOT_FOUND', '当前文字任务不可用')
    return task
  }
  async function prepareSnapshot({ workspaceId, taskId, sessionId }, task) {
    if (!enabled() || closing) fail('GENERATION_NOT_ENABLED', '本地生成未启用或模型能力不可用。')
    if (runtime.evidenceKind === 'native-model' && task.workflowVersion !== '2') fail('GENERATION_NOT_ENABLED', '真实生成仅支持新版权利要求任务。')
    if (task.generation.source !== 'local-skill') fail('GENERATION_NOT_ENABLED', '此入口只接受本地来源；不会切换来源。')
    let context, bundle
    try { context = runtime.resolveContext({ workspaceId, sessionId }) }
    catch { fail('GENERATION_CONTEXT_UNAVAILABLE', '当前项目、会话或模型不可用；未开始生成。') }
    if (!context || context.sessionId !== sessionId) fail('GENERATION_CONTEXT_UNAVAILABLE', '当前会话不可用；未开始生成。')
    try { if (task.workflowVersion === '2') bundle = await runtime.loadClaimsV2Skill() }
    catch { fail('BUILTIN_SKILL_UNAVAILABLE', '内置 Skill 资源不可用；未开始生成。') }
    if (runtime.evidenceKind === 'native-model' && (bundle?.provenance.skillId !== 'flow-2-6' || bundle?.provenance.skillVersion !== '0.2.2')) {
      fail('BUILTIN_SKILL_UNAVAILABLE', '正式内置 Skill 不可用；未开始生成。')
    }
    const instruction = structuredClone(bundle?.instruction ?? runtime.instruction)
    const contextSnapshot = { ...structuredClone(context), instructionVersion: instruction.version,
      instructionSha256: createHash('sha256').update(instruction.body).digest('hex'),
      ...(bundle ? { skillProvenance: (({ resources, ...provenance }) => provenance)(bundle.provenance) } : {}) }
    const snapshot = { mode: 'dsh-local', evidenceKind: runtime.evidenceKind, executionVersion: task.workflowVersion,
      workflowId: CLAIMS_TEMPLATE_ID, workflowVersion: task.workflowVersion,
      inputSchemaVersion: task.generation.inputSchemaVersion, source: task.generation.source, contextSnapshot,
      ...(task.workflowVersion === '2' ? { compositionVersion: '2' } : {}),
      inputSnapshot: { formValues: validateWorkflowForm(task.workflowId, task.workflowVersion, task.formValues), inputRefs: [], capturedAt: clock(),
        ...(task.workflowVersion === '2' ? { upstreamSnapshot: upstream ? await upstream.capture(workspaceId, task) : missingUpstream } : {}) } }
    snapshot.inputSnapshot.sha256 = unifiedInputSha256(snapshot)
    return { snapshot, instruction, context }
  }
  function confirmationHash(command, snapshot) {
    return createHash('sha256').update(JSON.stringify([command.workspaceId, command.taskId, command.sessionId,
      command.expectedRevision, snapshot.inputSnapshot.sha256])).digest('hex')
  }
  async function settle(workspaceId, taskId, runId, change) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = repository.get(workspaceId)
      const result = await repository.mutate(workspaceId, current.revision, record => {
        const run = record.tasks[taskId]?.runs[runId]
        if (run?.mode !== 'dsh-local' || run.status !== 'prepared') return record
        const next = structuredClone(record)
        Object.assign(next.tasks[taskId].runs[runId], change, { completedAt: clock() })
        next.tasks[taskId].updatedAt = clock()
        return next
      })
      if (result.committed) return result
    }
    fail('GENERATION_PUBLICATION_CONFLICT', '状态尚未写入，请查看原运行；不会重新生成。')
  }
  return {
    get localGenerationEnabled() { return enabled() },
    get localGenerationKind() { return enabled() ? runtime.evidenceKind : null },
    async prepareLocalRun(command) {
      const record = repository.get(command.workspaceId)
      if (record.revision !== command.expectedRevision) fail('GENERATION_CONFIRMATION_STALE', '材料已变更，请刷新后确认。')
      const { snapshot } = await prepareSnapshot(command, taskFor(record, command.taskId))
      return { workspaceId: command.workspaceId, taskId: command.taskId, sessionId: command.sessionId,
        expectedRevision: command.expectedRevision, sha256: confirmationHash(command, snapshot), route: snapshot.contextSnapshot.route,
        skill: snapshot.contextSnapshot.skillProvenance ? { id: snapshot.contextSnapshot.skillProvenance.skillId, version: snapshot.contextSnapshot.skillProvenance.skillVersion } : null,
        upstreamIncluded: snapshot.inputSnapshot.upstreamSnapshot?.status !== 'missing',
        characterCount: Object.values(snapshot.inputSnapshot.formValues).join('').length + (snapshot.inputSnapshot.upstreamSnapshot?.body?.length ?? 0) }
    },
    async createLocalRun({ workspaceId, taskId, sessionId, expectedRevision, requestKey, confirmation }) {
      if (!enabled() || closing) fail('GENERATION_NOT_ENABLED', '本地生成未启用或模型能力不可用。')
      if (runtime.evidenceKind === 'native-model' && confirmation?.confirmed !== true) fail('GENERATION_CONFIRMATION_REQUIRED', '请确认本次模型、材料外传和可能的费用。')
      let instruction, context
      let admitted
      const result = await workspaceOperations.run(workspaceId, () => repository.mutate(workspaceId, expectedRevision, async record => {
        const task = taskFor(record, taskId)
        if (task.generation.source !== 'local-skill') fail('GENERATION_NOT_ENABLED', '此入口只接受本地来源；不会切换来源。')
        const now = clock()
        const prepared = await prepareSnapshot({ workspaceId, taskId, sessionId }, task)
        const { snapshot } = prepared
        ;({ instruction, context } = prepared)
        const prior = Object.values(task.runs).find(run => run.requestKey === requestKey)
        if (prior) {
          if (prior.mode !== 'dsh-local' || prior.inputSnapshot.sha256 !== snapshot.inputSnapshot.sha256) fail('IDEMPOTENCY_CONFLICT', '请求已绑定其他输入或配置。')
          return record
        }
        if (runtime.evidenceKind === 'native-model' && confirmation.sha256 !== confirmationHash({ workspaceId, taskId, sessionId, expectedRevision }, snapshot)) {
          fail('GENERATION_CONFIRMATION_STALE', '模型或材料已变更，请重新确认；未开始生成。')
        }
        if (Object.values(record.tasks).some(t => hasPendingUnifiedRun(t) || Object.values(t.remoteExecutions).some(isOasisRemoteExecutionUnresolved))) {
          fail('WORKSPACE_GENERATION_ACTIVE', '当前项目已有未决生成，请查看原运行。')
        }
        if (task.inputRefs.length) fail('UNSUPPORTED_MATERIAL', '此文字模板不读取文件材料。')
        if (task.runOrder.length >= WORKBENCH_LIMITS.maxRunsPerTask) fail('RUN_LIMIT_REACHED', '运行记录已达上限。')
        const runId = runIdFactory()
        if (Object.hasOwn(task.runs, runId)) fail('RUN_ID_COLLISION', '运行标识冲突。')
        admitted = { ...snapshot, ...(task.workflowVersion === '2' ? { workflowRunUid: randomUUID() } : {}), runId, requestKey, status: 'prepared', failureCode: null, parentRunId: null,
          result: null, review: { status: 'not-reviewed', note: '', updatedAt: now }, writebacks: [], createdAt: now, completedAt: null }
        const next = structuredClone(record)
        next.tasks[taskId].runs[runId] = admitted
        next.tasks[taskId].runOrder.push(runId); next.tasks[taskId].activeRunId = runId; next.tasks[taskId].updatedAt = now
        return next
      }))
      if (!result.committed || !admitted) return result
      const controller = new AbortController()
      const key = keyFor(workspaceId, admitted.runId)
      const work = { controller, promise: null }
      active.set(key, work)
      work.promise = Promise.resolve().then(async () => {
        if (closing || controller.signal.aborted) return
        let change
        try {
          // Recheck membership/config after durable admission, immediately before native dispatch.
          const fresh = runtime.resolveContext({ workspaceId, sessionId })
          if (JSON.stringify(fresh) !== JSON.stringify(context)) throw new Error()
          const output = await runtime.adapter.generate({ runId: admitted.runId, sessionId,
            formValues: admitted.inputSnapshot.formValues, instruction, route: context.route, signal: controller.signal,
            ...(admitted.workflowVersion === '2' ? { workflowVersion: '2', upstreamSnapshot: admitted.inputSnapshot.upstreamSnapshot } : {}) })
          const executionSummary = normalizeLocalExecutionSummary(output.executionSummary)
          if (output.status === 'completed') {
            delete executionSummary.failureStage
            try { change = { status: 'completed', failureCode: null, result: createUnifiedResult(output.body, admitted), executionSummary } }
            catch { change = { status: 'failed', failureCode: 'INVALID_OUTPUT', result: null,
              executionSummary: { ...executionSummary, failureStage: 'result-contract' } } }
          }
          else change = { status: output.status === 'unknown' ? 'unknown' : 'failed',
            failureCode: safeCodes.has(output.code) ? output.code : 'GENERATION_FAILED', result: null, executionSummary }
        } catch { change = { status: 'unknown', failureCode: 'GENERATION_FAILED', result: null } }
        await settle(workspaceId, taskId, admitted.runId, change)
      }).catch(() => { /* Durable prepared stays unresolved on storage failure; observation never replays. */ })
        .finally(() => active.delete(key))
      return result
    },
    async observeLocalRun({ workspaceId, taskId, runId }) {
      const record = repository.get(workspaceId)
      const run = taskFor(record, taskId).runs[runId]
      if (!run || run.mode !== 'dsh-local') fail('RUN_NOT_FOUND', '未找到本地运行。')
      if (run.status === 'prepared' && !active.has(keyFor(workspaceId, runId))) {
        return settle(workspaceId, taskId, runId, { status: 'unknown', failureCode: 'INTERRUPTED', result: null })
      }
      return { committed: true, current: record }
    },
    async stopLocalRun({ workspaceId, taskId, runId, expectedRevision }) {
      const result = await repository.mutate(workspaceId, expectedRevision, record => {
        const run = taskFor(record, taskId).runs[runId]
        if (!run || run.mode !== 'dsh-local') fail('RUN_NOT_FOUND', '未找到本地运行。')
        if (run.status !== 'prepared') return record
        const next = structuredClone(record)
        Object.assign(next.tasks[taskId].runs[runId], { status: 'unknown', failureCode: 'ABORTED', completedAt: clock() })
        return next
      })
      if (result.committed) active.get(keyFor(workspaceId, runId))?.controller.abort()
      return result
    },
    async closeLocalGeneration() {
      closing = true
      for (const work of active.values()) work.controller.abort()
      await Promise.all([...active.values()].map(work => work.promise))
    },
  }
}
