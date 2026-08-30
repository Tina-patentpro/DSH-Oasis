import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const before = JSON.parse(await readFile(resolve(here, 'baseline-summary-before.json'), 'utf8'))
const after = JSON.parse(await readFile(resolve(here, 'baseline-summary-after.json'), 'utf8'))
const contractsBefore = JSON.parse(await readFile(resolve(here, 'workspace-contracts-before.json'), 'utf8'))
const contractsAfter = JSON.parse(await readFile(resolve(here, 'workspace-contracts-after.json'), 'utf8'))

const comparison = {
  generatedAt: new Date().toISOString(),
  gitHeadEqual: before.gitHeadAtReviewStart === after.gitHeadAtReviewStart,
  productRootsEqual: before.productRootsSha256 === after.productRootsSha256,
  productContentEqual: before.productContentSha256 === after.productContentSha256,
  realProfileEqual: before.profileContentSha256 === after.profileContentSha256,
  historicalEvidenceEqual: before.evidenceInputsSha256 === after.evidenceInputsSha256,
  workspaceContractsEqual: JSON.stringify(contractsBefore) === JSON.stringify(contractsAfter),
  before: {
    gitHead: before.gitHeadAtReviewStart,
    productRootsSha256: before.productRootsSha256,
    productContentSha256: before.productContentSha256,
    realProfileSha256: before.profileContentSha256,
    historicalEvidenceSha256: before.evidenceInputsSha256,
  },
  after: {
    gitHead: after.gitHeadAtReviewStart,
    productRootsSha256: after.productRootsSha256,
    productContentSha256: after.productContentSha256,
    realProfileSha256: after.profileContentSha256,
    historicalEvidenceSha256: after.evidenceInputsSha256,
  },
  environmentLimitation: 'tasklist.exe returned access denied in both captures; all other recorded toolchain commands exited 0',
}
comparison.equal = [
  comparison.gitHeadEqual,
  comparison.productRootsEqual,
  comparison.productContentEqual,
  comparison.realProfileEqual,
  comparison.historicalEvidenceEqual,
  comparison.workspaceContractsEqual,
].every(Boolean)

await writeFile(resolve(here, 'final-comparison.json'), `${JSON.stringify(comparison, null, 2)}\n`, 'utf8')
console.log(`equal=${comparison.equal}`)
