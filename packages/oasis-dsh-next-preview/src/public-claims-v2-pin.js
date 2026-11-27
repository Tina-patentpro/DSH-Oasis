import { fileURLToPath } from 'node:url'
import { loadBuiltinSkill } from './builtin-skill-loader.js'

// Public substitute only; never resolve authoring resources or user-supplied paths.
export const loadPublicClaimsV2Skill = () => loadBuiltinSkill({
  root: fileURLToPath(new URL('./public-claims-v2/', import.meta.url)),
  manifestSha256: 'f26448b70bfebe82528d6c207f69881e9a49366270c332ef5f2ed31f4903c9db',
  expected: {"skillId":"flow-2-6","skillVersion":"public-4e2-1","inputSchemaVersion":"claims-disclosure-2","outputSchemaVersion":"claims-cumulative-2","executionContractVersion":"single-call-cumulative-1"},
})
