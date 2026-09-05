import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { apply } from '../src/client.js'
import { ProfessionalServicePanel } from '../src/client/ProfessionalServicePanel.js'

const ui = await import('../src/client/OasisConnectionSettings.js').catch((error) => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
  return {}
})
function nodes(value, result = []) {
  if (Array.isArray(value)) value.forEach((item) => nodes(item, result))
  else if (value && typeof value === 'object') { result.push(value); nodes(value.props?.children, result) }
  else if (typeof value === 'string') result.push(value)
  return result
}

test('configuration form offers separate writes and clears password before sending and when collapsed', () => {
  assert.equal(typeof ui.ConnectionSettingsForm, 'function', 'D1 settings form must exist')
  const passwordRef = { current: { value: 'synthetic-token' } }
  const calls = []
  const form = ui.ConnectionSettingsForm({
    snapshot: { connected: true, settingsStatus: 'ready', settingsWritable: true, credentialWritable: true, credentialStatus: 'ready', credentialConfigured: false, busy: false },
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

test('client optionally binds configuration service without adding Slot registrations and disposes it', async () => {
  const optional = []
  const slots = []
  const disposed = []
  const dispose = apply({
    connection: { rpc: { call: async () => ({ ok: true, value: {} }) } },
    slots: { inject(_name, fn) { return fn() }, register(options) { slots.push(options.name); return () => {} } },
    inject(names) { optional.push(names); return { dispose: () => disposed.push(names) } },
  })
  assert.ok(optional.some((names) => names.includes('settingsScope')))
  assert.deepEqual(slots.sort(), ['conversation.input.right', 'shell.overlay'])
  await dispose()
  assert.ok(disposed.some((names) => names.includes('settingsScope')))
  const source = await readFile(new URL('../src/client/OasisWorkbenchSurface.js', import.meta.url), 'utf8')
  assert.match(source, /createElement\(OasisConnectionSettings/)
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
