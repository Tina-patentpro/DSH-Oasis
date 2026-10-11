import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { apply } from '../src/client.js'
import { ProfessionalServicePanel } from '../src/client/ProfessionalServicePanel.js'

const ui = await import('../src/client/OasisConnectionSettings.js').catch((error) => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
  return {}
})
const settingsUi = await import('../src/client/OasisSettingsSection.js').catch((error) => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
  return {}
})
function nodes(value, result = []) {
  if (Array.isArray(value)) value.forEach((item) => nodes(item, result))
  else if (value && typeof value === 'object') { result.push(value); nodes(value.props?.children, result) }
  else if (typeof value === 'string') result.push(value)
  return result
}

test('native settings use website login without address, token, environment or output preference controls', () => {
  const html = renderToStaticMarkup(createElement(settingsUi.OasisSettingsSection, { controller: {
    subscribe: () => () => {}, getSnapshot: () => ({ connected: true, settingsWritable: true,
      defaultGenerationSource: 'oasis-api', outputDirectoryPrefix: '产物', apiBaseUrl: '', downloadOrigins: [] }),
  } }))
  assert.match(html, /手机验证码/)
  assert.match(html, /手机号与密码/)
  assert.doesNotMatch(html, /默认生成来源|保存目录前缀|API origin|JWT|非生产|Skill 正文|模型密钥/)
})

test('configuration form offers separate writes and clears password before sending and when collapsed', () => {
  assert.equal(typeof ui.ConnectionSettingsForm, 'function', 'D1 settings form must exist')
  const passwordRef = { current: { value: 'synthetic-token' } }
  const calls = []
  const form = ui.ConnectionSettingsForm({
    snapshot: { connected: true, settingsStatus: 'ready', settingsWritable: true, apiBaseUrl: 'http://127.0.0.1:6326', credentialWritable: true, credentialStatus: 'ready', credentialConfigured: false, busy: false },
    apiDraft: '', downloadDraft: '', passwordRef,
    onApiDraft() {}, onDownloadDraft() {},
    controller: {
      saveApiBaseUrl: (value) => calls.push(['address', value]),
      saveDownloadOrigins: (value) => calls.push(['downloads', value]),
      updateCredential(value) { assert.equal(passwordRef.current.value, ''); calls.push(['jwt', value]) },
    },
  })
  const elements = nodes(form)
  const password = elements.find((x) => x?.props?.type === 'password')
  assert.ok(password)
  assert.equal(password.props.value, undefined)
  const submit = elements.find((x) => x?.props?.['data-testid'] === 'oasis-credential-save')
  submit.props.onClick()
  assert.deepEqual(calls, [['jwt', 'synthetic-token']])
  passwordRef.current.value = 'another-synthetic-token'
  form.props.onToggle({ currentTarget: { open: false } })
  assert.equal(passwordRef.current.value, '')
  assert.match(elements.filter((x) => typeof x === 'string').join(' '), /非生产/)
})

test('disabled configuration is explanatory, not a disabled local workbench', () => {
  assert.equal(typeof ui.ConnectionSettingsForm, 'function')
  const form = ui.ConnectionSettingsForm({ snapshot: { connected: false, settingsWritable: false, credentialWritable: false, busy: false }, passwordRef: { current: null }, controller: {} })
  const elements = nodes(form)
  assert.ok(elements.filter((x) => x?.type === 'button').every((x) => x.props.disabled))
  assert.match(elements.filter((x) => typeof x === 'string').join(' '), /本地工作流/)
})

test('client binds one configuration owner into the native DSH settings section and disposes it', async () => {
  const optional = []
  const slots = []
  const disposed = []
  const dispose = apply({
    connection: { rpc: { call: async () => ({ ok: true, value: {} }) } },
    slots: { inject(_name, fn) { return fn() }, register(options, component) { slots.push({ options, component }); return () => {} } },
    inject(names) { optional.push(names); return { dispose: () => disposed.push(names) } },
  })
  assert.ok(optional.some((names) => names.includes('configForms')))
  assert.deepEqual(slots.map(({ options }) => options.name).sort(), ['conversation.input.right', 'settings.section', 'shell.overlay'])
  const nativeSettings = slots.find(({ options }) => options.name === 'settings.section')
  assert.equal(nativeSettings.options.id, 'oasis-professional-settings')
  assert.equal(typeof settingsUi.OasisSettingsSection, 'function')
  assert.equal(nativeSettings.component({ close() {} }).type, settingsUi.OasisSettingsSection)
  await dispose()
  assert.ok(disposed.some((names) => names.includes('configForms')))
  const source = await readFile(new URL('../src/client/OasisWorkbenchSurface.js', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /createElement\(OasisConnectionSettings/)
})

test('configuration changes do not hide the stop-waiting action for an existing remote execution', () => {
  const stopped = []
  const form = ProfessionalServicePanel({
    state: { professionalConfigurationBlocked: true, professionalStatus: 'idle' },
    page: { remoteExecutionOrder: ['existing'], remoteExecutions: { existing: { executionId: 'existing' } } },
    operation: { activeOperation: 'professional-continue' },
    onStop: (id) => stopped.push(id),
  })
  const stop = nodes(form).find((x) => x?.props?.['data-testid'] === 'oasis-professional-stop')
  assert.ok(stop, 'configuration refresh must not hide stop waiting')
  stop.props.onClick()
  assert.deepEqual(stopped, ['existing'])
})

test('professional service states direct users to the native DSH settings without test-only wording', () => {
  const page = { remoteExecutionOrder: [], remoteExecutions: {} }
  const operation = { activeOperation: null }
  const panels = [
    ProfessionalServicePanel({
      state: { professionalConfigurationBlocked: true, professionalStatus: 'idle' }, page, operation,
    }),
    ProfessionalServicePanel({
      state: {
        professionalConfigurationBlocked: false, professionalStatus: 'ready',
        professionalBootstrap: { remoteEnabled: false },
      }, page, operation,
    }),
    ProfessionalServicePanel({
      state: {
        professionalConfigurationBlocked: false, professionalStatus: 'ready',
        professionalBootstrap: { remoteEnabled: true, credentialConfigured: false },
      }, page, operation,
    }),
  ]
  const copy = panels.flatMap((panel) => nodes(panel))
    .filter((value) => typeof value === 'string').join(' ')
  assert.match(copy, /DSH 设置 → 绿洲工作台/)
  assert.doesNotMatch(copy, /上方连接配置|隔离 Host/)
})
