import { applyM06ControlledCandidate013, applyM06NextOffline, inject as ordinaryInject } from './index.js'

export { name, Config } from './index.js'
export const inject = [...new Set([...ordinaryInject, 'llm', 'sessions', 'sessionProjections', 'agentDefaultModel'])]

export async function apply(ctx, config) {
  const mode = process.env.OASIS_NEXT_OFFLINE
  if (mode !== undefined && mode !== '1') throw new Error('Invalid Oasis NEXT offline mode.')
  return mode === '1' ? applyM06NextOffline(ctx, config) : applyM06ControlledCandidate013(ctx, config)
}
