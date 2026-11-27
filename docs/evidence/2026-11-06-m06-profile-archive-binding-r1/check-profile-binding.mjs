// Bounded real boot/include configuration and local dependency-resolution proof.
// No boot(), plugin apply(), Desktop launch, env/credential/session store loading.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { join, dirname, isAbsolute } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const evidence = dirname(fileURLToPath(import.meta.url))
const root = fileURLToPath(new URL('../../../', import.meta.url))
const preflight = JSON.parse(await fs.readFile(join(evidence, 'preflight.json'), 'utf8'))
const receipt = JSON.parse(await fs.readFile(join(root, 'docs/evidence/2026-10-29-flow26-controlled-profile-r2.json'), 'utf8'))
const targets = JSON.parse(await fs.readFile(join(evidence, 'original-link-targets.json'), 'utf8'))
const archiveRoot = preflight.archive_root
const installation = join(preflight.scratch, 'installation-view')
const profile = join(installation, 'profiles/desktop')
const oldProfile = preflight.old_profile
const oldRuntime = preflight.old_runtime_manifest
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
let fetchAttempts = 0
globalThis.fetch = () => { fetchAttempts++; throw Error('External Fetch budget is zero') }

const oldRequire = createRequire(oldRuntime)
const bootPath = oldRequire.resolve('@deepseek-ai/dsh-app-boot')
const includePath = oldRequire.resolve('@deepseek-ai/cordis-plugin-include')
assert.equal(hash(await fs.readFile(bootPath)), receipt.identities[2].sha256)
assert.equal(hash(await fs.readFile(includePath)), receipt.identities[3].sha256)
const boot = await import(pathToFileURL(bootPath).href)
const include = await import(pathToFileURL(includePath).href)

// Copy only a declared compatibility-policy file if the real profile has one.
const optionalInputs = []
const compatibilityName = boot.PROFILE_COMPATIBILITY_FILENAME
assert.equal(typeof compatibilityName, 'string')
assert.ok(!compatibilityName.includes('/') && !compatibilityName.includes('..'))
try {
  const source = join(oldProfile, compatibilityName)
  assert.ok((await fs.lstat(source)).isFile())
  const bytes = await fs.readFile(source)
  await fs.writeFile(join(profile, compatibilityName), bytes, { flag: 'wx' })
  optionalInputs.push({ path: source, bytes: bytes.length, sha256: hash(bytes), copiedTo: join(profile, compatibilityName) })
} catch (error) { if (error.code !== 'ENOENT') throw error }

const compose = loaded => {
  const warnings = []
  const entries = include.applyEntryPatches([], [...loaded.layers.flatMap(layer => layer.patches), ...loaded.patches], (...args) => warnings.push(args))
  return { entries, warnings }
}
const business = entries => entries.filter(entry => String(entry.id).includes('oasis-professional-service') || String(entry.name).includes('oasis-professional-service') || String(entry.name).includes('m06-controlled-host-013'))
const activeBusiness = entries => business(entries).filter(entry => !entry.disabled)
const oldLoaded = boot.loadProfileDirectory('m06-source-readonly', oldProfile, oldRuntime)
const nextLoaded = boot.loadProfileDirectory('m06-archive-isolated', profile, join(installation, 'package.json'))
assert.deepEqual(oldLoaded.skippedBundles, [])
assert.deepEqual(nextLoaded.skippedBundles, [])
const old = compose(oldLoaded)
const next = compose(nextLoaded)
assert.equal(activeBusiness(old.entries).length, 1)
assert.equal(activeBusiness(next.entries).length, 1)
const oldActive = activeBusiness(old.entries)[0]
const nextActive = activeBusiness(next.entries)[0]
assert.equal(nextActive.id, oldActive.id, 'keep existing plugin/settings identity')
assert.equal(nextActive.name, 'oasis-professional-service/m06-controlled-host-013')
assert.equal(next.entries.find(entry => entry.id === 'oasis-professional-service').disabled, true)
assert.deepEqual(next.warnings, old.warnings, 'do not hide existing non-business patch warnings')

const oldPatch = JSON.parse(await fs.readFile(join(oldProfile, 'cordis.patch.yml'), 'utf8'))
const nextPatch = JSON.parse(await fs.readFile(join(profile, 'cordis.patch.yml'), 'utf8'))
const expectedPatch = structuredClone(oldPatch)
let changedNames = 0
for (const patch of expectedPatch) for (const item of patch.insert ?? []) {
  if (item.id === oldActive.id) { item.name = nextActive.name; changedNames++ }
}
assert.equal(changedNames, 1)
assert.deepEqual(nextPatch, expectedPatch, 'only existing controlled insert name changes')
const unaffected = entries => entries.filter(entry => !business(entries).includes(entry))
assert.deepEqual(unaffected(next.entries), unaffected(old.entries))

const linkChecks = []
for (const original of targets) {
  const base = original.scope === 'installation' ? installation : profile
  const wanted = original.name === 'oasis-professional-service' ? archiveRoot : original.target
  const actual = await fs.realpath(join(base, 'node_modules', original.name))
  assert.equal(actual, await fs.realpath(wanted))
  linkChecks.push({ scope: original.scope, name: original.name, actual, matches: true })
}
assert.equal(linkChecks.length, 604)

const installationRequire = createRequire(join(installation, 'package.json'))
const profileRequire = createRequire(join(profile, 'package.json'))
const rootHost = installationRequire.resolve('oasis-professional-service/m06-controlled-host-013')
const profileHost = profileRequire.resolve('oasis-professional-service/m06-controlled-host-013')
const rootClient = installationRequire.resolve('oasis-professional-service/client')
const profileClient = profileRequire.resolve('oasis-professional-service/client')
assert.equal(rootHost, profileHost)
assert.equal(rootClient, profileClient)
assert.equal(await fs.realpath(rootHost), await fs.realpath(join(archiveRoot, 'src/m06-controlled-host-013.js')))
assert.equal(await fs.realpath(rootClient), await fs.realpath(join(archiveRoot, 'lib/client.js')))
const oasisLayer = nextLoaded.layers.find(layer => layer.packageName === 'oasis-professional-service')
assert.equal(await fs.realpath(oasisLayer.packageDir), await fs.realpath(archiveRoot))
const selectedModule = await import(pathToFileURL(rootHost).href)
assert.equal(typeof selectedModule.apply, 'function')
for (const name of ['llm', 'sessions', 'sessionProjections', 'agentDefaultModel']) assert.ok(selectedModule.inject.includes(name))

const candidate = JSON.parse(await fs.readFile(join(root, 'docs/evidence/2026-11-06-m06-notice-packaging-r1/local-package-candidate.json'), 'utf8'))
for (const member of candidate.files) {
  const bytes = await fs.readFile(join(archiveRoot, member.path))
  assert.equal(hash(bytes), member.sha256)
}
const negativeWarnings = []
const unsupportedRename = include.applyEntryPatches(old.entries, [{ id: oldActive.id, name: nextActive.name }], (...args) => negativeWarnings.push(args))
assert.deepEqual(unsupportedRename, old.entries)
assert.equal(negativeWarnings.length, 1)
assert.equal(fetchAttempts, 0)

const records = []
for (const path of [bootPath, includePath, join(oldProfile, 'package.json'), join(oldProfile, 'cordis.patch.yml'),
  join(installation, 'package.json'), join(installation, 'pnpm-lock.yaml'), join(profile, 'package.json'), join(profile, 'pnpm-lock.yaml'),
  join(profile, 'cordis.patch.yml'), rootHost, rootClient]) {
  const bytes = await fs.readFile(path)
  records.push({ path, bytes: bytes.length, sha256: hash(bytes) })
}
const project = entries => business(entries).map(({ id, name, disabled }) => ({ id, name, disabled: !!disabled }))
const result = {
  scope: 'REAL_FIXED_BOOT_INCLUDE_AND_FROZEN_PNPM_DEPENDENCY_VIEW_NOT_RUNNING_HOST',
  existingProfileAlreadyControlled: true,
  previousBarePackageGapInferenceCorrected: true,
  sourceProfileReadOnly: true,
  oldSelected: project(old.entries),
  candidateSelected: project(next.entries),
  existingPluginIdentityPreserved: oldActive.id === nextActive.id,
  activeBusinessHostCount: 1,
  skippedBundles: nextLoaded.skippedBundles,
  preservedWarnings: next.warnings,
  unaffectedEntriesPreserved: true,
  sourcePatchOnlyControlledNameChanged: true,
  installationAndProfileSameArchive: true,
  resolvedHost: rootHost,
  resolvedClient: rootClient,
  businessLayerRoot: oasisLayer.packageDir,
  resolvedHostSHA256: hash(await fs.readFile(rootHost)),
  resolvedClientSHA256: hash(await fs.readFile(rootClient)),
  linkedTargetCount: linkChecks.length,
  linkChecks,
  unsupportedRenameRejected: true,
  optionalInputs,
  identities: records,
  hostStarted: false,
  pluginApplyInvoked: false,
  credentialsRead: false,
  generationInvoked: false,
  fetchAttempts,
  originalProfileWritten: false,
  actualDesktopOrInstallerAcceptance: false,
}
await fs.writeFile(join(evidence, 'profile-binding-result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ result: 'PASS', existingProfileAlreadyControlled: true,
  activeBusinessHostCount: 1, linkedTargets: linkChecks.length, skippedBundles: 0,
  hostAndClientSameArchive: true, pluginId: nextActive.id, warnings: next.warnings,
  hostStarted: false, generationInvoked: false, fetchAttempts }, null, 2))
