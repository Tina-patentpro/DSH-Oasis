import { fileURLToPath } from 'node:url'
import { loadBuiltinSkill } from './builtin-skill-loader.js'

// Host-owned composition, not a user/model-selected path. Resource identity is independent of the provider.
export const loadClaimsSkill = () => loadBuiltinSkill({
  root: fileURLToPath(new URL('./builtin-skills/flow-2-6/0.2.2/', import.meta.url)),
  manifestSha256: 'f81d427db60ab671dcd552a24794f68c1a323d2dd1b440510bb26f9bfe23d706',
  expected: { skillId: 'flow-2-6', skillVersion: '0.2.2', inputSchemaVersion: 'claims-disclosure-2',
    outputSchemaVersion: 'claims-cumulative-2', executionContractVersion: 'single-call-cumulative-1' },
})
