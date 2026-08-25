import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

const root = resolve(process.cwd())
const auditRoot = resolve(root, 'docs/evidence/week2-audit-2026-08-25')

async function text(path) {
  return await readFile(resolve(auditRoot, path), 'utf8')
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex').toUpperCase()
}

const files = {
  frozenInstall: await text('verification/frozen-offline-install.txt'),
  packageVerify: await text('verification/package-verify.txt'),
  rootTests: await text('verification/root-script-skill-tests.txt'),
  pack: await text('verification/pack-dry-run.json'),
  staticScan: await text('verification/static-contract-scan.json'),
  toolchain: await text('verification/toolchain-snapshot.json'),
  negativeProbe: await text('verification/client-response-validation-probe.txt'),
  productBefore: await text('baseline/product-hashes-before.tsv'),
  productAfter: await text('baseline/product-hashes-after.tsv'),
  profileBefore: await text('baseline/profile-hashes-before.tsv'),
  profileAfter: await text('baseline/profile-hashes-after.tsv'),
}

const result = {
  generatedAt: new Date().toISOString(),
  commands: {
    install: 'set CI=true&& pnpm install --frozen-lockfile --offline --registry=https://registry.npmjs.org',
    packageVerify: 'set npm_config_cache=../../output/npm-cache-week2-audit&& set CI=true&& pnpm run verify',
    rootTests: 'node --test tests/scripts/dsh-isolated.test.mjs tests/scripts/dsh-local-api-smoke.test.mjs tests/skills/dsh-plugin-development-discovery.test.mjs tests/skills/dsh-plugin-development.test.mjs',
    negativeProbe: 'node --test docs/evidence/week2-audit-2026-08-25/verification/client-response-validation-probe.test.mjs',
  },
  results: {
    frozenOfflineInstall: /Already up to date[\s\S]*Done in/.test(files.frozenInstall),
    packageTests: { total: 81, pass: 81, fail: 0, observed: /# tests 81[\s\S]*# pass 81[\s\S]*# fail 0/.test(files.packageVerify) },
    rootTests: { total: 22, pass: 22, fail: 0, observed: /# tests 22[\s\S]*# pass 22[\s\S]*# fail 0/.test(files.rootTests) },
    packEntryCount: JSON.parse(files.pack)[0]?.entryCount,
    staticScanOk: JSON.parse(files.staticScan).ok === true,
    toolchainOk: JSON.parse(files.toolchain).ok === true,
    negativeProbeConfirmed: /# fail 1/.test(files.negativeProbe) && /Missing expected exception/.test(files.negativeProbe),
    productBaselineUnchanged: files.productBefore === files.productAfter,
    realProfileUnchanged: files.profileBefore === files.profileAfter,
  },
  evidenceSha256: Object.fromEntries(Object.entries(files).map(([name, value]) => [name, sha256(value)])),
}

console.log(JSON.stringify(result, null, 2))
