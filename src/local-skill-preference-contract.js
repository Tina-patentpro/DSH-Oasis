import { z } from 'zod'
import { DEFAULT_LOCAL_SKILL_SUITE, PATENT_DISCLOSURE_SUITE } from './local-skill-suites.js'

export const localSkillPreferenceSchema = z.object({
  suite: z.enum([DEFAULT_LOCAL_SKILL_SUITE, PATENT_DISCLOSURE_SUITE]),
}).strict()
