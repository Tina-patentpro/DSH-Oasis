// Only inspect metadata, import modules and construct a launch spec callback.
// Never invoke plugin apply, startFInstallation or the native executable.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const evidence = dirname(fileURLToPath(import.meta.url))
const input = JSON.parse(fs.readFileSync(join(evidence, 'installation-spec.json')))
const root = input.root, release = join(root, 'releases', input.target.expectedSHA256)
const controller = await import(pathToFileURL(join(root, 'control/scripts/f-installed-runtime.mjs')))
const { acquireJsonRootOwnership } = await import(pathToFileURL(join(root, 'control/patches/storage-json-single-owner/ownership.mjs')))
const template = JSON.parse(fs.readFileSync(join(release, 'profile-template.json')))
const profile = join(root, 'data/home/profiles/desktop')
const pkg = JSON.parse(fs.readFileSync(join(release, 'components/c3/package.json')))
assert.equal(pkg.version, '0.1.0-rc.1')
assert.equal(pkg.private, true)
assert.equal(pkg.license, 'SEE LICENSE IN LICENSE')
assert.deepEqual(template.nativeZeroGeneration, input.new_zero_policy)
assert.deepEqual(template.nativeZeroGeneration.budget, { model:0, api:0, upload:0, payment:0 })
const components = []
for (const [name, path] of Object.entries(template.components)) {
  const actual = fs.realpathSync(join(profile, 'node_modules', name))
  assert.equal(actual, fs.realpathSync(join(release, path)))
  const metadata = JSON.parse(fs.readFileSync(join(actual, 'package.json')))
  components.push({ name, version:metadata.version, path:actual })
}
assert.equal(components.length, 7)
const workbench = join(root, 'data/home/storages/oasis_workbench.json')
assert.equal(fs.existsSync(workbench), false)
globalThis.fetch = () => { throw Error('Offline installed inspection cannot fetch') }
const moduleUrl = name => pathToFileURL(join(release, 'components/c3/src', name)).href
const resource = await import(moduleUrl('m06-public-resources-r1.js'))
const instruction = resource.loadM06PublicInstruction()
assert.equal(instruction.provenance.resourceVersion, '0.1.3-public.1')
assert.equal(instruction.provenance.businessResourceSHA256, 'e06aa1523338af87b255cbdcb428ae7e693765791820dedc94f69a26ddc37f1d')
const host = await import(moduleUrl('m06-controlled-host-013.js'))
assert.equal(host.name, 'oasis-professional-service')
assert.equal(typeof host.apply, 'function')
for (const name of ['llm','sessions','sessionProjections','agentDefaultModel']) assert.ok(host.inject.includes(name))
const require = createRequire(join(release, 'components/c3/package.json'))
const zod = JSON.parse(fs.readFileSync(require.resolve('zod/package.json')))
assert.equal(zod.version, '4.4.3')
let report
await controller.withInstalledLaunchSpec(root, async spec => {
  assert.equal(spec.nativeZeroGeneration, true)
  assert.equal(spec.realCallBudget, 0)
  assert.equal(spec.current, input.target.expectedSHA256)
  assert.equal(spec.env.OASIS_NATIVE_ZERO_GENERATION, '1')
  assert.equal(spec.env.DSH_OASIS_INSTALL_ROOT, root)
  assert.equal(spec.env.DSH_HOME, join(root, 'data/home'))
  assert.equal(spec.env.HOME, join(root, 'data/user'))
  assert.equal(spec.cwd, release)
  assert.equal(spec.exe, join(release, 'App/DSH Desktop.app/Contents/MacOS/DSH Desktop'))
  assert.equal(spec.shell, false)
  for (const key of ['NODE_OPTIONS','NODE_PATH','OPENAI_API_KEY','ANTHROPIC_API_KEY']) assert.equal(Object.hasOwn(spec.env,key),false)
  assert.equal(fs.existsSync(join(root,'startup.lock')),true)
  assert.equal(fs.existsSync(join(root,'data/startup.lock')),true)
  const owner = await acquireJsonRootOwnership(join(root,'data/home/storages'))
  owner.release()
  report = { root, current:spec.current, archiveSHA256:input.archiveSHA256,
    businessVersion:pkg.version, components, zodVersion:zod.version,
    nativeZeroGeneration:spec.nativeZeroGeneration, budget:template.nativeZeroGeneration.budget,
    resourceVersion:instruction.provenance.resourceVersion,
    resourceSHA256:instruction.provenance.businessResourceSHA256,
    controlledHostImported:true, pluginApplyInvoked:false,
    profileAndReleaseAnchorsMatch:true, writerLocksObserved:true,
    ownershipEnvironmentBound:!!spec.env.DSH_OASIS_WRITER_NONCE,
    exe:spec.exe, args:spec.args, cwd:spec.cwd,
    AppOrHostLaunchInvoked:false }
})
assert.equal(fs.existsSync(join(root,'startup.lock')),false)
assert.equal(fs.existsSync(join(root,'data/startup.lock')),false)
const owner = await acquireJsonRootOwnership(join(root,'data/home/storages'))
owner.release()
assert.equal(fs.existsSync(workbench),false)
assert.equal(fs.readdirSync(join(root,'data/evidence')).some(name => name.startsWith('installed-launch-')),false)
report.writerLocksReleased = true
report.providerOwnershipReacquiredAfterRelease = true
report.businessStateCreated = false
report.oldProfileOrCredentialsCopied = false
fs.writeFileSync(join(evidence,'installed-import-and-spec.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'})
console.log('installed rc1 imports and 7 components verified; zero launch spec; locks/provider released; no App/Host')
