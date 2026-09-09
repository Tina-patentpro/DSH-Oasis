import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveDshGenerationContext } from '../src/dsh-generation-context.js'

function harness() {
  const selected = { provider: 'offline', model: 'text', reasoningEffort: 'high' }
  const session = { id: 'session-a', header: { cwd: 'D:\\sample' }, requestHeader: () => undefined }
  const workspace = { id: 'workspace-a', path: 'D:\\sample', sessionIds: ['session-a'] }
  const ctx = { workspaceRegistry: { get: () => workspace, list: () => [workspace] },
    sessions: { get: () => session }, sessionProjections: { stateOf: () => ({ pending: selected, lastUsed: null }) },
    agentDefaultModel: { currentSelection: () => ({ provider: 'default', model: 'default' }) } }
  return { ctx, selected, session, workspace }
}

test('Host resolves detached current model and exact Workspace Session ownership', () => {
  const h = harness()
  const result = resolveDshGenerationContext(h.ctx, { workspaceId: 'workspace-a', sessionId: 'session-a' })
  assert.deepEqual(result, { sessionId: 'session-a', route: h.selected })
  h.selected.model = 'changed'
  assert.equal(result.route.model, 'text')
  assert.ok(Object.isFrozen(result.route))
})

test('missing, ambiguous or mismatched native identity fails closed without reflecting errors', () => {
  for (const change of [h => { h.workspace.sessionIds = [] },
    h => { h.session.header.cwd = 'D:\\elsewhere' }, h => { h.session.id = 'another' },
    h => { h.ctx.workspaceRegistry.list = () => [h.workspace, { id: 'other', sessionIds: ['session-a'] }] },
    h => { h.ctx.sessionProjections = null },
    h => { h.ctx.sessions.get = () => { throw new Error('PUBLIC_CANARY') } }]) {
    const h = harness(); change(h)
    assert.throws(() => resolveDshGenerationContext(h.ctx, { workspaceId: 'workspace-a', sessionId: 'session-a' }),
      error => error.code === 'GENERATION_CONTEXT_UNAVAILABLE' && !error.message.includes('PUBLIC_CANARY'))
  }
})

test('pending selection wins; last request omits adapter default effort; empty session uses native default', () => {
  const h = harness()
  h.ctx.sessionProjections.stateOf = () => ({ pending: null, lastUsed: null })
  assert.equal(resolveDshGenerationContext(h.ctx, { workspaceId: 'workspace-a', sessionId: 'session-a' }).route.provider, 'default')
  h.session.requestHeader = () => ({ config: { provider: 'last', model: 'text', reasoningEffort: 'high' }, adapterDefaults: { reasoningEffort: true }, system: 'PUBLIC_CANARY' })
  assert.deepEqual(resolveDshGenerationContext(h.ctx, { workspaceId: 'workspace-a', sessionId: 'session-a' }).route, { provider: 'last', model: 'text' })
})
