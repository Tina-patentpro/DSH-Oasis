import {
  createEmptyWorkbenchRecord,
  oasisWorkbenchDomainSpec,
  parseWorkbenchDraft,
  parseWorkbenchRecord,
} from './workbench-domain.js'

function assertExpectedRevision(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError('expectedRevision must be a non-negative safe integer')
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
      : parseWorkbenchRecord(workspaceId, stored)
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

  get(workspaceId) {
    this.#assertOpen()
    return this.#read(workspaceId)
  }

  async replace(workspaceId, expectedRevision, input) {
    this.#assertOpen()
    assertExpectedRevision(expectedRevision)
    const draft = parseWorkbenchDraft(input)

    return this.#enqueue(workspaceId, async () => {
      const current = this.#read(workspaceId)
      if (current.revision !== expectedRevision) {
        return Object.freeze({
          committed: false,
          reason: 'revision-conflict',
          current,
        })
      }

      if (current.revision === Number.MAX_SAFE_INTEGER) {
        throw new RangeError('workbench revision exhausted')
      }

      const next = parseWorkbenchRecord(workspaceId, {
        ...draft,
        workspaceId,
        revision: current.revision + 1,
        updatedAt: this.#clock(),
      })
      await this.#table.put(workspaceId, next)
      return Object.freeze({ committed: true, current: next })
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
