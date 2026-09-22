import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { OasisSettingsSection } from '../src/client/OasisSettingsSection.js'
import { normalizeProductRuntimeConfig } from '../src/oasis-runtime-config.js'
import { bindNativeModelRuntime } from '../src/native-model-runtime.js'
import { generationUnavailableReason } from '../src/generation-contract.js'

test('settings contain only product guidance and account UI, not model switches or project binding', () => {
  const state = { connected: true, credentialWritable: true, credentialStatus: 'ready' }
  const html = renderToStaticMarkup(createElement(OasisSettingsSection, {
    controller: { subscribe: () => () => {}, getSnapshot: () => state },
    remote: {}, coordinator: { getSnapshot: () => { throw Error('Removed binding must not read project context') } },
  }))
  assert.doesNotMatch(html, /type="checkbox"|启用本地|重启 Host|当前项目 API 绑定|当前 DSH 项目：|读取账户、服务与目录/)
  assert.match(html, /当前会话所选模型/)
  assert.match(html, /扩展名前添加/)
  assert.match(html, /生成前会提示并由你确认/)
  assert.match(html, /手机验证码/)
})

test('formal product configuration ignores the obsolete local model opt-in without mutating settings', () => {
  for (const value of [undefined, false, true]) {
    const input = Object.freeze({ localModelEnabled: value })
    assert.equal(normalizeProductRuntimeConfig(input).localModelEnabled, true)
    assert.equal(input.localModelEnabled, value)
  }
})

test('missing optional native services leave generation unavailable, not a crashed workbench', () => {
  const runtime = bindNativeModelRuntime({}, {}, true)
  assert.equal(runtime.enabled, false)
  assert.throws(() => runtime.resolveContext({}), /Model unavailable/)
  runtime.dispose()
  assert.match(generationUnavailableReason('local-skill'), /DSH.*模型/)
  assert.doesNotMatch(generationUnavailableReason('local-skill'), /启用|重启/)
})

test('binding native services never calls the model and capability loss disables generation', () => {
  let release, disposed = 0, calls = 0
  const ctx = { inject(names, callback) {
    assert.deepEqual(names, ['llm', 'sessions', 'sessionProjections', 'agentDefaultModel'])
    release = callback({ llm: { chat: () => calls++ }, sessions: {}, workspaceRegistry: {}, sessionProjections: {}, agentDefaultModel: {} })
    return { dispose() { disposed++; release() } }
  } }
  const runtime = bindNativeModelRuntime(ctx, { BlockAssembler: class {}, createUserMessage: () => ({}) }, true)
  assert.equal(runtime.enabled, true)
  assert.equal(calls, 0)
  runtime.dispose()
  assert.equal(disposed, 1)
  assert.equal(runtime.enabled, false)
})
