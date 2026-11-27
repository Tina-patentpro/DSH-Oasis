// One bounded archive-composition proof. External Host services are synthetic;
// all project entry/resources below are loaded from the actual unpacked archive.
// No create/run/submit endpoint is invoked. This is not installed-Host acceptance.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'
import { setupM06ControlledHost } from '../../../packages/oasis-professional-service/test/helpers/m06-controlled-host-harness.mjs'

assert.ok(process.env.OASIS_ARCHIVE_PROOF_ROOT, 'explicit unpacked archive root required')
assert.ok(process.env.OASIS_ARCHIVE_PROOF_OBSERVATION, 'explicit new observation path required')
const root = pathToFileURL(process.env.OASIS_ARCHIVE_PROOF_ROOT.replace(/\/$/, '') + '/')
const requireFromArchive = createRequire(new URL('package.json', root))
const ordinaryPath = requireFromArchive.resolve('oasis-professional-service')
const controlledPath = requireFromArchive.resolve('oasis-professional-service/m06-controlled-host-013')
assert.ok(pathToFileURL(ordinaryPath).href.startsWith(root.href))
assert.ok(pathToFileURL(controlledPath).href.startsWith(root.href))
const ordinary = await import(pathToFileURL(ordinaryPath).href)
const controlled = await import(pathToFileURL(controlledPath).href)
const resources = await import(new URL('src/m06-business-resources-0.1.3.js', root))

test('archive self exports resolve its own ordinary and explicit controlled entries', () => {
  assert.equal(controlled.apply, ordinary.applyM06ControlledCandidate013)
  assert.notEqual(controlled.apply, ordinary.apply)
  for (const id of ['llm', 'sessions', 'sessionProjections', 'agentDefaultModel']) {
    assert.ok(controlled.inject.includes(id))
  }
})

test('archive loader verifies exact eight payloads and keeps two qualifications out of instruction body', async () => {
  const bytes = await readFile(new URL('src/m06-business-candidate-0.1.3.json', root))
  const bundle = resources.verifyM06BusinessResources013(bytes)
  const instruction = resources.loadM06BusinessInstruction013()
  assert.equal(bundle.resources.length, 8)
  assert.equal(bundle.qualifications.length, 2)
  assert.equal(bundle.candidateOnly, true)
  assert.equal(instruction.provenance.skillVersion, '0.1.3')
  assert.equal(instruction.provenance.businessResourceSHA256,
    '26ec83ae26f26783fb4b56abf7b1ac75081214770d0cefaaf2ca0fd0ec56deca')
  assert.equal(instruction.body,
    bundle.resources.map(item => `## Fixed M06 resource: ${item.path}\n\n${item.content}`).join('\n\n'))
  for (const item of bundle.qualifications) {
    assert.equal(item.role, 'operator-only-not-generation')
    assert.ok(!instruction.body.includes(item.content))
  }
  const changed = Buffer.from(bytes)
  changed[changed.length - 1] ^= 1
  assert.throws(() => resources.verifyM06BusinessResources013(changed),
    error => error.code === 'M06_BUSINESS_RESOURCE_UNAVAILABLE')
})

test('archive controlled entry registers only M06 candidate and prepares without any dispatch', async t => {
  let forbiddenPrepareCalls = 0
  const f = await setupM06ControlledHost(t, {
    entry: controlled,
    beforeApply(ctx) {
      const llm = ctx.llm
      ctx.llm = new Proxy(llm, {
        get(target, property) {
          if (property === 'prepareCall') return () => {
            forbiddenPrepareCalls++
            assert.fail('model preparation/dispatch budget is zero')
          }
          const value = Reflect.get(target, property)
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
    },
  })
  const catalog = await f.rpc('workflow/v340/catalog', {})
  assert.equal(catalog.ok, true)
  assert.equal(catalog.value.dispatchEnabled, false)
  const candidates = catalog.value.nodes.filter(node => node.m06Candidate)
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].nodeId, 'Flow-2-6')
  assert.equal(candidates[0].m06Candidate.skillId, 'm06-claims-draft')
  assert.equal(candidates[0].m06Candidate.skillVersion, '0.1.3')
  const remote = await f.rpc('professional/bootstrap', {})
  assert.equal(remote.ok, true)
  assert.equal(remote.value.remoteEnabled, false)
  const legacy = await f.rpc('workflow/catalog', {})
  assert.equal(legacy.value.localGenerationEnabled, false)
  assert.equal(legacy.value.apiExecutionAvailable, false)
  const before = await f.state()
  const preview = await f.preview()
  assert.equal(preview.ok, true)
  assert.equal(preview.value.businessSkillVersion, '0.1.3')
  const after = await f.state()
  assert.deepEqual(after, before)
  assert.equal(Object.keys(after.tasks.t.v340.runs).length, 0)
  assert.equal(forbiddenPrepareCalls, 0)
  assert.equal(f.h.seen.prepare, 0)
  assert.equal(f.calls.adapter, 0)
  assert.equal(f.calls.credentials, 0)
  assert.equal(f.calls.network, 0)
  await writeFile(process.env.OASIS_ARCHIVE_PROOF_OBSERVATION, JSON.stringify({
    scope: 'ARCHIVE_EXPORT_AND_REGISTERED_IN_MEMORY_ROUTES_WITH_INSTALLED_SDK_AND_FAKE_EXTERNAL_SERVICES',
    actualDesktopOrInstalledHost: false,
    ordinaryPath,
    controlledPath,
    unpackedRoot: fileURLToPath(root),
    businessSkillId: candidates[0].m06Candidate.skillId,
    businessSkillVersion: candidates[0].m06Candidate.skillVersion,
    candidateNodes: candidates.map(node => node.nodeId),
    remoteEnabled: remote.value.remoteEnabled,
    legacyLocalEnabled: legacy.value.localGenerationEnabled,
    legacyApiEnabled: legacy.value.apiExecutionAvailable,
    previewReadOnly: true,
    createdRuns: 0,
    forbiddenPrepareCalls,
    adapterCalls: f.calls.adapter,
    credentialCalls: f.calls.credentials,
    guardedFetchCalls: f.calls.network,
    generationContext: 'existing public synthetic fixture; no model output consumed',
  }, null, 2) + '\n', { flag: 'wx' })
})

test('archive ordinary entry does not expose candidate preparation/run routes', async t => {
  const f = await setupM06ControlledHost(t, { candidate: false, entry: ordinary })
  for (const suffix of ['candidate/prepare', 'candidate/run', 'run/create']) {
    assert.equal(f.routes.has('/api/oasis-workbench/workflow/v340/' + suffix), false)
  }
  const catalog = await f.rpc('workflow/v340/catalog', {})
  assert.equal(catalog.ok, true)
  assert.equal(catalog.value.dispatchEnabled, false)
  assert.equal(catalog.value.nodes.filter(node => node.m06Candidate).length, 0)
  assert.equal(f.calls.adapter, 0)
  assert.equal(f.calls.credentials, 0)
  assert.equal(f.calls.network, 0)
})

test('archive controlled entry refuses absent native context before registering routes', async t => {
  let observed
  await assert.rejects(() => setupM06ControlledHost(t, {
    entry: controlled,
    beforeApply(ctx, calls, routes) {
      observed = { calls, routes }
      ctx.sessions = undefined
    },
  }), /M06受控入口需要/)
  assert.equal(observed.routes.size, 0)
  assert.equal(observed.calls.adapter, 0)
  assert.equal(observed.calls.credentials, 0)
  assert.equal(observed.calls.network, 0)
})
