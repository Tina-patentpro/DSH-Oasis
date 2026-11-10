import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { setupNative, Assembler, NOW } from './helpers/v340-native-harness.mjs'
import { createM06BusinessNativeCandidate013 } from '../src/v340-native-model.js'
import { createV340RuntimeService } from '../src/v340-runtime-service.js'

// Release integration check: the actual archive must consume the public body,
// refuse a real confirmation from the old internal composition, and never put
// operator qualifications into the synthetic provider's system context.
test('public archive rejects old internal confirmation and consumes the public resource in one synthetic run', async t => {
  if (process.env.OASIS_PUBLIC_ARCHIVE !== '1') return
  const h = await setupNative(t)
  await h.service.closeV340Runtime()
  const executor = createM06BusinessNativeCandidate013({ ctx: h.ctx,
    native: { BlockAssembler: Assembler, createUserMessage: value => ({ role: 'user', ...value }) }, timeoutMs: 500 })
  const service = createV340RuntimeService({ repository: h.repository, preparation: h.preparation, executor, clock: () => NOW })
  try {
    const d = h.task().draft
    const { prepared } = await h.preparation.prepareV340({ workspaceId: 'w', nodeId: 'Flow-2-6',
      confirmed: true, textInputs: d.textInputs, filePaths: d.filePaths, configuration: d.configuration })
    const command = { workspaceId: 'w', taskId: 't', sessionId: 's', expectedRevision: h.repository.get('w').revision, prepared }
    const current = await executor.prepareConfirmation(command)
    // Separate metadata-only process, with the original fixed source, generates
    // the prior confirmation. No original implementation fallback in archive run.
    const script = `
      import { createM06BusinessNativeCandidate013 } from ${JSON.stringify(pathToFileURL(resolve('src/v340-native-model.js')).href)};
      let raw=''; for await (const b of process.stdin) raw+=b;
      const { command, root }=JSON.parse(raw), route={provider:'synthetic-native-test',model:'fixture-model'};
      const workspace={id:'w',path:root,sessionIds:['s'],async status(){return 'ok'}};
      const ctx={workspaceRegistry:{get:id=>id==='w'?workspace:null,list:()=>[workspace]},
        sessions:{get:id=>id==='s'?{id:'s',header:{cwd:root},requestHeader(){}}:null},
        sessionProjections:{stateOf:()=>({pending:route})},agentDefaultModel:{currentSelection:()=>route},
        llm:{prepareCall(){throw Error('No provider dispatch allowed')}}};
      const executor=createM06BusinessNativeCandidate013({ctx,native:{BlockAssembler:class {},createUserMessage:v=>v}});
      process.stdout.write(JSON.stringify(await executor.prepareConfirmation(command)));
    `
    const priorProcess = spawnSync(process.execPath, ['--input-type=module', '-e', script],
      { input: JSON.stringify({ command, root: h.root }), encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: '' } })
    assert.equal(priorProcess.status, 0, priorProcess.stderr)
    const prior = JSON.parse(priorProcess.stdout)
    assert.equal(prior.businessResourceSHA256, '26ec83ae26f26783fb4b56abf7b1ac75081214770d0cefaaf2ca0fd0ec56deca')
    assert.equal(current.businessResourceSHA256, 'e06aa1523338af87b255cbdcb428ae7e693765791820dedc94f69a26ddc37f1d')
    assert.notEqual(current.sha256, prior.sha256)
    await assert.rejects(() => service.createV340Run(h.command({ requestKey: 'public-reject-internal',
      candidate: { sessionId: 's', confirmed: true, sha256: prior.sha256 } })), /V340_NATIVE_CANDIDATE_INVALID/)
    assert.equal(h.seen.prepare, 0)
    await service.createV340Run(h.command({ requestKey: 'public-synthetic-once',
      candidate: { sessionId: 's', confirmed: true, sha256: current.sha256 } }))
    const run = await h.settle()
    assert.equal(run.status, 'completed')
    assert.equal(run.nativeCandidate.businessResourceSHA256, current.businessResourceSHA256)
    assert.equal(h.seen.prepare, 1)
    assert.equal(h.seen.stream, 1)
    assert.doesNotMatch(h.seen.options.system, /\/Users\/|\/Volumes\//)
    const resource = await import('../src/m06-public-resources-r1.js')
    const bytes = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/m06-business-public-r1.json', import.meta.url)))
    // This test file stays outside the archive; use the archived loader's body
    // and the fixed input bundle only for identifying operator exclusion.
    const bundle = resource.verifyM06PublicResources(bytes)
    for (const item of bundle.qualifications) assert.equal(h.seen.options.system.includes(item.content), false)
    if (process.env.OASIS_PUBLIC_BUILD_EVIDENCE) await writeFile(join(process.env.OASIS_PUBLIC_BUILD_EVIDENCE, 'public-native-seam.json'),
      JSON.stringify({ scope: 'synthetic only, actual archive business modules', priorConfirmation: prior,
        currentConfirmation: current, resultStatus: run.status, syntheticProviderPrepare: h.seen.prepare,
        syntheticProviderStream: h.seen.stream, operatorBodiesIncluded: false, realCalls: 0 }, null, 2) + '\n')
  } finally { await service.closeV340Runtime() }
})
