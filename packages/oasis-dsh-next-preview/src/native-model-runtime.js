import { createDshGenerationAdapter } from './dsh-generation-adapter.js'
import { resolveDshGenerationContext } from './dsh-generation-context.js'
import { loadClaimsSkill } from './claims-skill-pin.js'

// No provider registration, credential copy, fallback or native Skill registration.
export function createNativeModelRuntime(ctx, { BlockAssembler, createUserMessage }, enabled = false) {
  if (enabled !== true || !ctx?.llm || !ctx?.sessions || !ctx?.workspaceRegistry
    || !ctx?.sessionProjections || !ctx?.agentDefaultModel
    || typeof BlockAssembler !== 'function' || typeof createUserMessage !== 'function') return null
  return {
    enabled: true, evidenceKind: 'native-model', loadClaimsV2Skill: loadClaimsSkill,
    resolveContext(identity) {
      const context = resolveDshGenerationContext(ctx, identity)
      if (context.route.provider === 'oasis-offline') throw new Error('Offline provider is not a real model')
      return context
    },
    adapter: createDshGenerationAdapter({ llm: ctx.llm, BlockAssembler, createUserMessage }),
    dispose() {},
  }
}

// Keep the workbench available when optional generation services are absent.
export function bindNativeModelRuntime(ctx, native, enabled = false) {
  let current = null
  const fiber = enabled === true && typeof ctx?.inject === 'function' ? ctx.inject(['llm', 'sessions', 'sessionProjections', 'agentDefaultModel'], child => {
    const candidate = createNativeModelRuntime(child, native, true)
    current = candidate
    return () => { if (current === candidate) current = null; candidate?.dispose() }
  }) : null
  return {
    get enabled() { return current?.enabled === true }, evidenceKind: 'native-model',
    loadClaimsV2Skill: loadClaimsSkill,
    resolveContext(identity) { if (!current) throw new Error('Model unavailable'); return current.resolveContext(identity) },
    adapter: { generate(input) { if (!current) throw new Error('Model unavailable'); return current.adapter.generate(input) } },
    dispose() { current = null; return fiber?.dispose() },
  }
}
