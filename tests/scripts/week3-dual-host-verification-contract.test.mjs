import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'

test('Week 3 runtime verifier keeps standalone and Better Sidebar hosts isolated and reversible', async () => {
  const source = await readFile(resolve('scripts/verify-week3-local-loop.mjs'), 'utf8')

  assert.match(source, /OASIS_PANEL_HOST_MODE/)
  assert.match(source, /const BETTER_SIDEBAR_VERSION = '0\.15\.2'/)
  assert.match(source, /copyPluginSource\(packageRoot/)
  assert.match(source, /copyOfficialDshRuntime\(/)
  assert.match(source, /dereference: true/)
  assert.match(source, /DSH_BIN: dshLaunch\.displayPath/)
  assert.match(source, /official-dsh-runtime\.json/)
  assert.match(source, /copyPluginSource\(\s*betterSidebarSource/)
  assert.match(source, /packPluginSource\(/)
  assert.match(source, /'--config\.ignore-scripts=true', 'pack', '--pack-destination'/)
  assert.match(source, /collectInstalledDependencyClosure\(/)
  assert.match(source, /prepareOfflineDependencyOverrides\(/)
  assert.match(source, /pnpm-workspace\.yaml/)
  assert.match(source, /overrides:\\n/)
  assert.match(source, /setIsolatedResolutionOverrides\(/)
  assert.match(source, /'--store-dir', installStoreCanonical/)
  assert.match(source, /installArgs\.push\('--offline', '--trust-lockfile', '--ignore-scripts'\)/)
  assert.match(source, /assertReparseTargetsWithin\(/)
  assert.match(source, /isolated Profile reparse target escapes declared root/)
  assert.match(source, /'remove', 'dsh-better-sidebar'/)
  assert.match(source, /dump-config-after-better-sidebar-remove\.yml/)
  assert.match(source, /week3-better-sidebar-cleanup-browser\.test\.mjs/)
  assert.doesNotMatch(source, /plugin[^\n]+add[^\n]+packageRoot/)
})

test('Week 3 browser verifies public embedded markers without private Better Sidebar selectors', async () => {
  const source = await readFile(resolve('tests/integration/week3-local-loop-browser.test.mjs'), 'utf8')

  assert.match(source, /oasis-embedded-workbench/)
  assert.match(source, /data-dsh-better-sidebar/)
  assert.match(source, /entryHostVersion/)
  assert.match(source, /better-sidebar-owned/)
  assert.match(source, /name: '折叠侧边栏', exact: true/)
  assert.match(source, /name: '展开侧边栏', exact: true/)
  assert.doesNotMatch(source, /dsh-better-sidebar[^\n]*(?:className|localStorage|__store|querySelector\(['"]\.)/)
})

test('Week 3 dual-host orchestrator runs both isolated modes and gates the whole real Profile', async () => {
  const source = await readFile(resolve('scripts/verify-week3-dual-host.mjs'), 'utf8')

  assert.match(source, /runMode\('standalone'\)/)
  assert.match(source, /runMode\('better-sidebar'\)/)
  assert.match(source, /collectTree\(realProfile, realProfile\)/)
  assert.match(source, /real-profile-before\.tsv/)
  assert.match(source, /real-profile-after\.tsv/)
  assert.match(source, /protected real DSH Profile changed during dual-host verification/)
  assert.match(source, /Task 6 evidence root already exists/)
})

test('Week 3 closure verifier refreshes baselines and reruns package, root, Week 1, and Week 2 gates', async () => {
  const source = await readFile(resolve('scripts/verify-week3-prerequisites.mjs'), 'utf8').catch(() => '')

  assert.match(source, /baselines\.json/)
  assert.match(source, /runRootTests\(/)
  assert.match(source, /runPackageVerify\(/)
  assert.match(source, /runVerifier\('week1'/)
  assert.match(source, /runVerifier\('week2'/)
  assert.match(source, /collectTree\(realProfile, realProfile\)/)
  assert.match(source, /protected real DSH Profile changed during prerequisite verification/)
  assert.match(source, /Task 6 prerequisite evidence root already exists/)
})
