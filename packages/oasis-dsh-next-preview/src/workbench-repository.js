import {
  createEmptyWorkbenchRecord,
  oasisWorkbenchDomainSpec,
  parseStoredWorkbenchRecord,
  parseWorkbenchEditableDraft,
  parseWorkbenchRecord,
} from './workbench-domain.js'
import { isOasisRemoteExecutionUnresolved } from './workbench-contract.js'
import { canonicalJson } from './local-mock-runner.js'
import { hasPendingUnifiedRun } from './generation-contract.js'

function assertExpectedRevision(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError('expectedRevision must be a non-negative safe integer')
  }
}

function sameWorkflow(left, right) {
  return left.workType === right.workType
    && left.workflowId === right.workflowId
    && left.workflowVersion === right.workflowVersion
}

function workflowIdentityState(task) {
  const values = [task.workType, task.workflowId, task.workflowVersion]
  const nullCount = values.filter((value) => value === null).length
  if (nullCount === values.length) return 'empty'
  if (nullCount === 0) return 'selected'
  return 'partial'
}

function assertWorkflowTransitions(current, candidate) {
  for (const taskId of candidate.taskOrder) {
    const next = candidate.tasks[taskId]
    const previous = current.tasks[taskId]
    if (previous === undefined) {
      if (workflowIdentityState(next) === 'partial') {
        throw new Error('new workflow identity must be complete or entirely empty')
      }
      continue
    }

    const previousState = workflowIdentityState(previous)
    if (previousState !== 'empty' && !sameWorkflow(previous, next)) {
      throw new Error('selected or migrated partial workflow identity is immutable')
    }
    if (previousState === 'empty' && workflowIdentityState(next) === 'partial') {
      throw new Error('workflow identity must be complete or entirely empty')
    }
  }
}

function assertUnresolvedRemoteExecutionsPreserved(current, draft) {
  const retainedTaskIds = new Set(draft.taskOrder)
  for (const taskId of current.taskOrder) {
    const task = current.tasks[taskId]
    if(task.v340&&!retainedTaskIds.has(taskId))throw new Error('V340 tasks cannot be removed by an older draft; unresolved evidence is preserved')
    const unresolved = hasPendingUnifiedRun(task) || task.remoteExecutionOrder.some((executionId) => (
      isOasisRemoteExecutionUnresolved(task.remoteExecutions[executionId])
    ))
    if (unresolved && !retainedTaskIds.has(taskId)) {
      throw new Error('tasks with an unresolved remote execution cannot be removed')
    }
    const next = draft.tasks[taskId]
    if (task.generation !== null && next && next.generation == null) {
      throw new Error('generation metadata cannot be cleared by an older draft')
    }
    if (unresolved && next && (
      canonicalJson(task.formValues) !== canonicalJson(next.formValues)
      || canonicalJson(task.generation) !== canonicalJson(next.generation ?? null)
      || canonicalJson(task.professionalDraft) !== canonicalJson(next.professionalDraft)
    )) throw new Error('task input is locked by an unresolved remote execution')
  }
}

function mergeEditableDraft(current, draft) {
  const tasks = {}
  for (const taskId of draft.taskOrder) {
    const editable = draft.tasks[taskId]
    const previous = current.tasks[taskId]
    if (previous === undefined) {
      if (editable.activeRunId !== null) {
        throw new Error('new tasks cannot select a Host-owned run')
      }
      tasks[taskId] = {
        ...editable,
        generation: editable.generation ?? null,
        inputRefs: [],
        runOrder: [],
        runs: {},
        remoteExecutionOrder: [],
        remoteExecutions: {},
      }
      continue
    }

    tasks[taskId] = {
      ...editable,
      ...(previous.v340 ? {v340:previous.v340} : {}),
      generation: editable.generation ?? null,
      inputRefs: previous.inputRefs,
      runOrder: previous.runOrder,
      runs: previous.runs,
      remoteExecutionOrder: previous.remoteExecutionOrder,
      remoteExecutions: previous.remoteExecutions,
    }
  }
  return {
    schemaVersion: 4,
    panelMode: draft.panelMode,
    activeTaskId: draft.activeTaskId,
    taskOrder: draft.taskOrder,
    tasks,
  }
}

class OasisWorkbenchRepository {
  #accepting = true
  #closePromise
  #domain
  #queues = new Map()
  #table
  #clock

  constructor(domain, { clock }) {
    this.#domain = domain
    this.#table = domain.table('workspaces')
    this.#clock = clock
  }

  #assertOpen() {
    if (!this.#accepting) throw new Error('Oasis workbench repository is closed')
  }

  #read(workspaceId) {
    const stored = this.#table.get(workspaceId)
    return stored === undefined
      ? createEmptyWorkbenchRecord(workspaceId)
      : parseStoredWorkbenchRecord(workspaceId, stored)
  }

  #enqueue(workspaceId, operation) {
    const prior = this.#queues.get(workspaceId) ?? Promise.resolve()
    const job = prior.then(operation)
    const settled = job.then(() => undefined, () => undefined)
    this.#queues.set(workspaceId, settled)
    void settled.then(() => {
      if (this.#queues.get(workspaceId) === settled) this.#queues.delete(workspaceId)
    })
    return job
  }

  async #commit(workspaceId, current, candidate) {
    if (current.revision === Number.MAX_SAFE_INTEGER) {
      throw new RangeError('workbench revision exhausted')
    }
    const {
      workspaceId: _workspaceId,
      revision: _revision,
      updatedAt: _updatedAt,
      ...body
    } = candidate
    const next = parseWorkbenchRecord(workspaceId, {
      ...body,
      schemaVersion: 4,
      workspaceId,
      revision: current.revision + 1,
      updatedAt: this.#clock(),
    })
    assertWorkflowTransitions(current, next)
    await this.#table.put(workspaceId, next)
    return Object.freeze({ committed: true, current: next })
  }

  get(workspaceId) {
    this.#assertOpen()
    return this.#read(workspaceId)
  }

  async replaceEditable(workspaceId, expectedRevision, input) {
    this.#assertOpen()
    assertExpectedRevision(expectedRevision)
    const draft = parseWorkbenchEditableDraft(input)
    return this.#enqueue(workspaceId, async () => {
      const current = this.#read(workspaceId)
      if (current.revision !== expectedRevision) {
        return Object.freeze({ committed: false, reason: 'revision-conflict', current })
      }
      assertUnresolvedRemoteExecutionsPreserved(current, draft)
      const candidate = mergeEditableDraft(current, draft)
      return this.#commit(workspaceId, current, candidate)
    })
  }

  async mutate(workspaceId, expectedRevision, mutation) {
    this.#assertOpen()
    assertExpectedRevision(expectedRevision)
    if (typeof mutation !== 'function') throw new TypeError('mutation must be a function')
    return this.#enqueue(workspaceId, async () => {
      const current = this.#read(workspaceId)
      if (current.revision !== expectedRevision) {
        return Object.freeze({ committed: false, reason: 'revision-conflict', current })
      }
      const candidate = await mutation(current)
      if (candidate === current) {
        return Object.freeze({ committed: true, current })
      }
      return this.#commit(workspaceId, current, candidate)
    })
  }

  close() {
    if (this.#closePromise) return this.#closePromise
    this.#accepting = false
    this.#closePromise = (async () => {
      await Promise.all([...this.#queues.values()])
      await this.#domain.close()
    })()
    return this.#closePromise
  }
}

export async function openOasisWorkbenchRepository(storageDomain, { clock = () => new Date().toISOString() } = {}) {
  const domain = await storageDomain.open(oasisWorkbenchDomainSpec)
  try {
    return new OasisWorkbenchRepository(domain, { clock })
  } catch (error) {
    await domain.close()
    throw error
  }
}
