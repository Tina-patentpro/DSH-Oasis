import { resolve } from 'node:path'
import process from 'node:process'

import { captureFilesystemBaseline } from '../../../scripts/baseline-capture-core.mjs'

const projectRoot = resolve(process.cwd())
const outputRoot = resolve(projectRoot, 'docs/evidence/week2-audit-2026-08-25/baseline')
const profileRoot = resolve(process.env.USERPROFILE ?? '', '.dsh')
const label = process.argv[2]

const productRoots = [
  '.dsh/skills',
  'packages/oasis-professional-service/src',
  'packages/oasis-professional-service/test',
  'packages/oasis-professional-service/lib',
  'packages/oasis-professional-service/package.json',
  'packages/oasis-professional-service/pnpm-lock.yaml',
  'packages/oasis-professional-service/cordis.patch.yml',
  'packages/oasis-professional-service/tsdown.config.mjs',
  'scripts',
  'tests',
  'README.md',
  '.gitignore',
  'docs/plans/2026-08-25-week2-design.md',
  'docs/plans/2026-08-25-week2-implementation.md',
  'docs/plans/2026-08-24-dsh-beta-overall-plan.md',
  'docs/evidence/week2-implementation-2026-08-25',
  'docs/evidence/week2-audit-2026-08-25/capture-audit-baseline.mjs',
]

const { summary } = await captureFilesystemBaseline({
  projectRoot,
  profileRoot,
  outputRoot,
  label,
  productRoots,
  command: `node docs/evidence/week2-audit-2026-08-25/capture-audit-baseline.mjs ${label}`,
})

console.log(`product_entries=${summary.productEntries}`)
console.log(`product_links=${summary.productLinks}`)
console.log(`profile_entries=${summary.profileEntries}`)
console.log(`profile_links=${summary.profileLinks}`)
