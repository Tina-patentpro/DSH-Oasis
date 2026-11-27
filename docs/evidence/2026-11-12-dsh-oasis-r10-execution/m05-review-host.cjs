const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const { createHash, randomBytes, randomUUID } = require('node:crypto')
const { existsSync, readFileSync, appendFileSync, writeFileSync } = require('node:fs')
const { join, resolve } = require('node:path')
const { once } = require('node:events')

if (require.main !== module) {
  const original = globalThis.fetch
  globalThis.fetch = (target, options) => {
    const url = new URL(typeof target === 'string' || target instanceof URL ? target : target.url)
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
      appendFileSync(process.env.OASIS_R10_OUTBOUND_LOG, 'blocked outbound request\n')
      throw new Error('R10 local-only Host')
    }
    return original(target, options)
  }
} else {
  execute().catch(error => {
    console.error(String(error.stack).replace(/([?&]token=)[^\s"]+/g, '$1[redacted]'))
    process.exitCode = 1
  })
}

async function execute() {
  const [app, scope, evidence, mode] = process.argv.slice(2)
  assert(['review', 'observe'].includes(mode))
  const archive = join(app, 'Contents/Resources/app.asar')
  const data = join(scope, 'dsh-home')
  const profile = join(data, 'profiles/desktop')
  const sha = content => createHash('sha256').update(content).digest('hex')
  const read = path => JSON.parse(readFileSync(path, 'utf8'))
  const evidenceRoot = resolve(evidence)
  const originalEvidence = join(evidenceRoot, '../2026-11-12-dsh-m05-single-live')
  const prior = read(join(originalEvidence, 'verification.json'))
  const install = read(join(originalEvidence, 'execution-preflight.json'))
  const original = prior.hostRun
  const { workspaceId, taskId, runId } = original
  assert.equal(sha(readFileSync(archive)), install.hostAsarSha256)
  assert.equal(sha(readFileSync(join(originalEvidence, 'M05-完整结果.md'))), original.resultSha256)
  assert.equal(sha(readFileSync(join(originalEvidence, 'M05-技术交底正文.md'))), original.coreSha256)
  const fixture = read(join(scope, 'batch.json')).cases[0]
  assert.equal(fixture.taskId, taskId)
  assert.equal(sha(readFileSync(join(fixture.workspace, 'public-disclosure.md'))), prior.sourceReceiptDigests.technical_disclosure_file)
  for (const field of ['drawings_text', 'supplemental_data_text', 'user_input'])
    assert.equal(sha(fixture.expectedValues[field]), prior.sourceReceiptDigests[field])
  const nativeToken = randomBytes(32).toString('base64url')
  const headers = { 'x-dsh-desktop-renderer': nativeToken }
  const outboundLog = join(evidenceRoot, 'm05-outbound-blocks.log')
  const actions = join(evidenceRoot, 'm05-actions.jsonl')
  const record = (action, fields = {}) => appendFileSync(actions, JSON.stringify({ mode, action, ...fields }) + '\n', { mode: 0o600 })
  const child = spawn(join(app, 'Contents/MacOS/DSH NEXT'), [
    '--require', __filename, '--expose-internals', join(archive, 'lib/host.js'), archive, profile,
    join(app, 'Contents/Resources/runtime', process.arch, 'primary-runtime'),
  ], { cwd: profile, env: {
    ...process.env, ELECTRON_RUN_AS_NODE: '1', DSH_HOME: data, DSH_TELEMETRY_DISABLED: '1',
    DSH_NEXT_NATIVE_TOKEN: nativeToken, OASIS_NEXT_TEXT_TEST: '1', OASIS_R10_OUTBOUND_LOG: outboundLog,
  }, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] })
  const exited = once(child, 'exit')
  const deadline = setTimeout(() => child.kill('SIGTERM'), 45000)
  try {
    const ready = await new Promise((ok, fail) => {
      child.on('message', m => { if (m.type === 'ready') ok(m) })
      child.once('error', fail)
      child.once('exit', code => fail(new Error('Host exited before ready: ' + code)))
    })
    const url = new URL(ready.url)
    assert.equal(url.hostname, '127.0.0.1')
    const login = await fetch(url, { redirect: 'manual', headers })
    assert.equal(login.status, 303)
    const cookie = login.headers.get('set-cookie').split(';')[0]
    await login.body?.cancel()
    const prefix = 'oasis-workbench/workflow/v340/'
    async function rpc(method, payload) {
      const rpcId = randomUUID()
      const response = await fetch(url.origin + '/api/' + method, {
        method: 'POST', headers: { ...headers, cookie, origin: url.origin, 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', rpcId, method, payload }), signal: AbortSignal.timeout(10000),
      })
      assert.equal(response.status, 200, method)
      const reply = await response.json()
      assert.equal(reply.rpcId, rpcId)
      if (!reply.result.ok) throw new Error(method + ' ' + reply.result.error.code + ' ' + reply.result.error.message)
      return reply.result.value
    }
    const state = () => rpc('oasis-workbench/state/get', { workspaceId })
    const runFrom = s => s.tasks[taskId].v340.runs[runId]
    const target = (s, v) => ({ workspaceId, taskId, expectedRevision: s.revision, runId,
      versionId: v.versionId, resultSha256: v.result.sha256 })
    const initial = await state()
    const run = runFrom(initial)
    assert.equal(run.requestKey, original.requestKey)
    assert.equal(run.status, 'completed')
    assert.equal(run.inputSha256, original.inputSha256)
    assert.equal(sha(run.result.body), original.resultSha256)
    const snapshot = run.result.snapshot
    const core = snapshot.current_result.core_result_markdown
    assert.equal(sha(core), original.coreSha256)
    for (const term of ['底座', '导向槽', '滑块', '锁止件', 'F3', 'F4', '实测']) assert(core.includes(term), term)
    assert.deepEqual(['T1', 'T2', 'T3'].map(k => snapshot.tables[k].rows.length), [1, 4, 1])
    const before = '滑块与导向槽配合，沿第一方向在两状态间运动；锁止件处于允许态时滑块可移动，处于限制态时滑块移动受限。'
    const after = '滑块与导向槽配合。锁止件处于允许状态时，滑块可沿导向槽在第一方向移动。锁止件处于限制状态时，滑块移动受限。'
    assert.equal(core.split(before).length, 2)
    const revised = core.replace(before, after)
    let version, saved, end
    if (mode === 'review') {
      assert.equal(run.resultVersions?.length ?? 0, 0)
      const cmd = { workspaceId, taskId, expectedRevision: initial.revision, runId, baseSha256: original.resultSha256 }
      assert.equal((await rpc(prefix + 'result/draft', { ...cmd, body: revised, format: 'core-markdown' })).committed, true)
      record('draft-persisted', { draftSha256: sha(revised) })
      const drafted = await state()
      const editKey = randomUUID()
      assert.equal((await rpc(prefix + 'result/edit', { ...cmd, expectedRevision: drafted.revision, versionId: runId,
        draftSha256: sha(revised), requestKey: editKey })).committed, true)
      const edited = await state()
      version = runFrom(edited).resultVersions.find(v => v.parentVersionId === runId)
      assert(version)
      record('revision-created', { versionId: version.versionId, sha256: version.result.sha256 })
      assert.equal(version.review.status, 'not-reviewed')
      await assert.rejects(() => rpc(prefix + 'result/prepare-save', target(edited, version)), /V340_REVIEW_REQUIRED|business-rejected/)
      assert.equal(version.result.snapshot.current_result.core_result_markdown, revised)
      assert.deepEqual(version.result.snapshot.tables, snapshot.tables)
      assert.deepEqual(version.result.snapshot.warnings.slice(0, snapshot.warnings.length), snapshot.warnings)
      assert.equal((await rpc(prefix + 'result/review', { ...target(edited, version), confirmed: true })).committed, true)
      record('engineering-review', { versionId: version.versionId })
      const reviewed = await state()
      version = runFrom(reviewed).resultVersions.find(v => v.versionId === version.versionId)
      assert.equal(version.review.status, 'approved')
      const plan = await rpc(prefix + 'result/prepare-save', target(reviewed, version))
      assert.equal(plan.manifest.absoluteTarget, fixture.workspace)
      assert.equal(plan.manifest.artifactId, 'sha256:' + version.result.sha256)
      for (const file of plan.manifest.files) assert(!existsSync(file.absolutePath), file.relativePath)
      record('save-targets-available', { targets: plan.manifest.files.map(file => file.relativePath) })
      assert.equal((await rpc(prefix + 'result/commit-save', { confirmationToken: plan.confirmationToken })).committed, true)
      end = await state()
      version = runFrom(end).resultVersions.find(v => v.versionId === version.versionId)
      saved = version.writebacks[0]
      assert(saved)
      record('save-completed', { writebackId: saved.writebackId })
    } else {
      const old = read(join(evidenceRoot, 'm05-review.json'))
      end = initial
      version = run.resultVersions.find(v => v.versionId === old.versionId)
      saved = version?.writebacks.find(w => w.writebackId === old.writebackId)
      assert(saved)
      assert.equal(end.revision, old.afterRevision)
    }
    assert.deepEqual(end.tasks[taskId].v340.runOrder, initial.tasks[taskId].v340.runOrder)
    assert.equal(runFrom(end).result.sha256, original.resultSha256)
    assert.equal(sha(runFrom(end).result.body), original.resultSha256)
    assert.equal(version.review.status, 'approved')
    assert.equal(version.result.snapshot.current_result.core_result_markdown, revised)
    const preview = await rpc(prefix + 'result/preview-file', { ...target(end, version), writebackId: saved.writebackId })
    assert(preview.matchesReviewed)
    assert.equal(sha(preview.text), version.result.sha256)
    assert.equal(saved.files.length, 2)
    for (const file of saved.files) assert.equal(sha(readFileSync(join(fixture.workspace, file.relativePath))), file.sha256)
    assert(!existsSync(outboundLog))
    const receipt = { mode, runId, originalSha256: original.resultSha256, originalCoreSha256: original.coreSha256,
      beforeRevision: initial.revision, afterRevision: end.revision, versionId: version.versionId,
      reviewedSha256: version.result.sha256, editedCoreSha256: sha(revised), writebackId: saved.writebackId,
      workspace: fixture.workspace, files: saved.files, previewMatches: true, review: 'approved-engineering',
      professionalAcceptance: false, userAcceptance: false, newModelRuns: 0, newProfessionalApiRequests: 0 }
    writeFileSync(join(evidenceRoot, 'm05-' + mode + '.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' })
    console.log(mode, version.versionId, version.result.sha256, saved.writebackId)
  } finally {
    if (child.connected) child.send({ type: 'shutdown' })
    const [code] = await exited
    clearTimeout(deadline)
    assert.equal(code, 0)
  }
}
