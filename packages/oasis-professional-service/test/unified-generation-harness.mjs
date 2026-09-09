import { createWorkbenchService } from '../src/workbench-service.js'
import { openOasisWorkbenchRepository } from '../src/workbench-repository.js'
import { parseStoredWorkbenchRecord } from '../src/workbench-domain.js'
import { recordToWorkspaceState, workspaceStateToDraft } from '../src/client/workbench-model.js'
import { createV3Record, NOW } from './workbench-fixtures.mjs'

export async function fixtureHarness(options = {}) {
  const { claimsV2 = false, ...serviceOptions } = options
  const original = structuredClone(parseStoredWorkbenchRecord('workspace-a', createV3Record()))
  Object.assign(original.tasks['task-a'], {
    workType: 'cn-invention-patent', workflowId: 'patent-claims', workflowVersion: '1',
    generation: { inputSchemaVersion: '1', source: 'local-skill' },
    formValues: { claims: '一种控制器数据保存方法。', technicalField: '控制器', background: '', benefits: '', embodiments: '', drawings: '', instructions: '' },
  })
  if (claimsV2) Object.assign(original.tasks['task-a'], {
    workflowVersion: '2', generation: { inputSchemaVersion: 'claims-disclosure-2', source: 'local-skill' },
    formValues: { disclosure_text: '控制器按分段写入日志，校验后更新索引。', drawings_text: '', claim_requirements_text: '', user_input: '' },
  })
  const records = new Map([['workspace-a', original]])
  const repository = await openOasisWorkbenchRepository({ async open() { return {
    table() { return { get: id => records.get(id), async put(id, value) { records.set(id, value) } } }, async close() {},
  } } }, { clock: () => NOW })
  let sequence = 0
  const service = createWorkbenchService({ repository, clock: () => NOW,
    runIdFactory: () => `run-${++sequence}`,
    materialManager: { confirm() { throw Error('no files') }, refresh() { throw Error('no files') }, recheckAll() { throw Error('no files') } },
    ...serviceOptions,
  })
  const state = () => repository.get('workspace-a')
  const command = (extra = {}) => ({ workspaceId: 'workspace-a', taskId: 'task-a', expectedRevision: state().revision, requestKey: `request-${sequence + 1}`, ...extra })
  const draft = () => structuredClone(workspaceStateToDraft(recordToWorkspaceState(state())))
  return { repository, service, state, command, draft, records }
}
