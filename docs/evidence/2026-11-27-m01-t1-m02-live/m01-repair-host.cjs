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
  const originalEvidence = join(evidenceRoot, '../2026-11-14-dsh-m01-single-live')
  const prior = read(join(originalEvidence, 'verification.json'))
  const install = read(join(originalEvidence, 'execution-preflight.json'))
  const original = read(resolve(evidenceRoot, '../../../.local/dsh-next-field-diagnostics-20261112/m01-single-20261114/live/live-run.json'))[0]
  const { workspaceId, taskId, runId } = original
  assert.equal(sha(readFileSync(archive)), install.hostAsarSha256)
  assert.equal(sha(readFileSync(join(originalEvidence, 'M01-完整结果.md'))), original.resultSha256)
  assert.equal(sha(readFileSync(join(originalEvidence, 'M01-技术背景研究正文.md'))), original.coreSha256)
  const fixture = read(join(scope, 'batch.json')).cases[0]
  assert.equal(fixture.taskId, taskId)
  for (const field of ['research_request_text','user_input'])
    assert.equal(fixture.expectedValues[field],fixture.draft.textInputs[field])
  const tableEdit = read(join(evidenceRoot, 'm01-t1-edit.json'))
  const nativeToken = randomBytes(32).toString('base64url')
  const headers = { 'x-dsh-desktop-renderer': nativeToken }
  const outboundLog = join(evidenceRoot, 'm01-outbound-blocks.log')
  const actions = join(evidenceRoot, 'm01-actions.jsonl')
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
    assert.equal(snapshot.tables.T1.status,'missing')
    assert.equal(snapshot.tables.T1.rows.length,0)
    const revised = core
    let version, saved, end
    if (mode === 'review') {
      assert.equal(run.resultVersions?.length ?? 0, 0)
      const cmd = { workspaceId, taskId, expectedRevision: initial.revision, runId, baseSha256: original.resultSha256 }
      assert.equal((await rpc(prefix + 'result/draft', { ...cmd, body: revised, format: 'core-markdown' })).committed, true)
      record('draft-persisted', { draftSha256: sha(revised) })
      const drafted = await state()
      const editKey = randomUUID()
      assert.equal((await rpc(prefix + 'result/edit', { ...cmd, expectedRevision: drafted.revision, versionId: runId,
        draftSha256: sha(revised), requestKey: editKey, m01Structure: tableEdit })).committed, true)
      const edited = await state()
      version = runFrom(edited).resultVersions.find(v => v.parentVersionId === runId)
      assert(version)
      record('revision-created', { versionId: version.versionId, sha256: version.result.sha256 })
      assert.equal(version.review.status, 'not-reviewed')
      await assert.rejects(() => rpc(prefix + 'result/prepare-save', target(edited, version)), /V340_REVIEW_REQUIRED|business-rejected/)
      assert.equal(version.result.snapshot.current_result.core_result_markdown, revised)
      assert.equal(version.result.snapshot.tables.T1.status,'generated')
      assert.deepEqual(version.result.snapshot.tables.T1.rows,tableEdit.rows.map(row=>({row_id:row.rowId,data:row.data})))
      for(const name of ['T2','T3','T4','T5','T6'])assert.deepEqual(version.result.snapshot.tables[name],snapshot.tables[name])
      for(const warning of snapshot.warnings.filter(w=>w.warning_id!=='host-Flow-1-1-missing-table-T1'))
        assert.deepEqual(version.result.snapshot.warnings.find(w=>w.warning_id===warning.warning_id),warning)
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
      const old = read(join(evidenceRoot, 'm01-review.json'))
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
    assert.equal(version.result.snapshot.tables.T1.rows.length,9)
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
      workspace: fixture.workspace, files: saved.files, t1Rows:version.result.snapshot.tables.T1.rows.length, coreUnchanged: true, previewMatches: true, review: 'approved-engineering',
      professionalAcceptance: false, userAcceptance: false, newModelRuns: 0, newProfessionalApiRequests: 0 }
    writeFileSync(join(evidenceRoot, 'm01-' + mode + '.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' })
    if(mode==='review')writeFileSync(join(evidenceRoot,'M01-T1修订累计稿.md'),version.result.body,{flag:'wx'})
    console.log(mode, version.versionId, version.result.sha256, saved.writebackId)
  } finally {
    if (child.connected) child.send({ type: 'shutdown' })
    const [code] = await exited
    clearTimeout(deadline)
    assert.equal(code, 0)
  }
}
