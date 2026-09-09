import { createDshGenerationAdapter } from './dsh-generation-adapter.js'
import { resolveDshGenerationContext } from './dsh-generation-context.js'
import { WorkspaceMaterialError } from './workspace-materials.js'
import { loadClaimsSkill } from './claims-skill-pin.js'
import { publicClaimsV2Output } from './claims-v2-result.js'
import { claimsUpstreamSnapshotSchema } from './generation-contract.js'

// Formal v2 resources, synthetic output only; enabled by the exact isolated-Home gate in index.js.
export function createNativeOfflineRuntime(ctx, { LlmAdapter, BlockAssembler, createUserMessage }) {
  if (!ctx.llm || !ctx.sessions || !ctx.workspaceRegistry || !ctx.sessionProjections || !ctx.agentDefaultModel
    || !LlmAdapter || !BlockAssembler || !createUserMessage) return null
  if (ctx.llm.listProviders().some(provider => provider.id === 'oasis-offline')) {
    throw new WorkspaceMaterialError('OFFLINE_PROVIDER_COLLISION', '离线提供方标识已占用；不覆盖现有注册。')
  }
  class OfflineProvider extends LlmAdapter {
    async listModels() { return [{ id: 'text', name: '绿洲离线文字' }, { id: 'slow', name: '绿洲离线慢速' }, { id: 'error', name: '绿洲离线错误' }]
      .map(model => ({ provider: 'oasis-offline', inputModalities: ['text'], ...model })) }
    async *stream(options) {
      if (options.provider !== 'oasis-offline' || !['text', 'slow', 'error'].includes(options.model)) throw new Error('offline route only')
      await new Promise(resolve => {
        const done = () => { clearTimeout(timer); options.signal.removeEventListener('abort', done); resolve() }
        const timer = setTimeout(done, options.model === 'slow' ? 10000 : 300)
        options.signal.addEventListener('abort', done, { once: true })
        if (options.signal.aborted) done()
      })
      if (options.signal.aborted) { yield { type: 'finish', reason: { kind: 'aborted' } }; return }
      if (options.model === 'error') throw Object.assign(new Error('PUBLIC_STAGE4C_ERROR_CANARY'), { code: 'AUTH' })
      const fields = JSON.parse(options.messages[0].content[0].text)
      if (Object.hasOwn(fields, 'upstream_snapshot')) {
        const { upstream_snapshot, ...values } = fields
        claimsUpstreamSnapshotSchema.parse(upstream_snapshot)
        yield { type: 'text-delta', index: 0, text: JSON.stringify(publicClaimsV2Output(values, upstream_snapshot)) }
        yield { type: 'finish', reason: { kind: 'stop' } }
        return
      }
      yield { type: 'text-delta', index: 0, text: `# 权利要求书（原生离线验收）\n\n${fields.claims}\n\n> 公开样本，无真实模型或私有 Skill 调用；风险及待确认问题未评估。\n` }
      yield { type: 'finish', reason: { kind: 'stop' } }
    }
  }
  const dispose = ctx.llm.registerAdapter(['oasis-offline'], new OfflineProvider())
  return { enabled: true, evidenceKind: 'native-offline', dispose,
    loadClaimsV2Skill: loadClaimsSkill,
    instruction: Object.freeze({ version: 'public-stage4c-1', body: 'PUBLIC_STAGE4C_INSTRUCTION: produce the explicit offline sample only.' }),
    resolveContext(identity) {
      const snapshot = resolveDshGenerationContext(ctx, identity)
      if (snapshot.route.provider !== 'oasis-offline' || !['text', 'slow', 'error'].includes(snapshot.route.model)) {
        throw new WorkspaceMaterialError('GENERATION_CONTEXT_UNAVAILABLE', '请在 DSH 原生模型选择中选择绿洲离线模型；不会改用真实模型。')
      }
      return snapshot
    },
    adapter: createDshGenerationAdapter({ llm: ctx.llm, BlockAssembler, createUserMessage }),
  }
}
