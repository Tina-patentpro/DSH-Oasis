import { fileURLToPath } from 'node:url'
import { loadBuiltinSkill } from './builtin-skill-loader.js'

// Host-owned composition, not a user/model-selected path. Resource identity is independent of the provider.
export const loadClaimsSkill = () => loadBuiltinSkill({
  root: fileURLToPath(new URL('./builtin-skills/flow-2-6/0.2.0/', import.meta.url)),
  manifestSha256: '63254666e5e1af582b2251423a003686cc2f112f655b35ed088900fbb5cdaaa1',
  expected: { skillId: 'flow-2-6', skillVersion: '0.2.0', inputSchemaVersion: 'claims-disclosure-2',
    outputSchemaVersion: 'claims-cumulative-2', executionContractVersion: 'single-call-cumulative-1' },
})
