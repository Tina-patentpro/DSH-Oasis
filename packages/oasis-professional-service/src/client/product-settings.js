import { OASIS_PRODUCT_ORIGIN, accountStatusSchema } from '../oasis-account-contract.js'

const initial = () => ({ connected: false, settingsStatus: 'unavailable', settingsWritable: false,
  environmentKind: 'production', apiBaseUrl: OASIS_PRODUCT_ORIGIN, credentialOrigin: OASIS_PRODUCT_ORIGIN, downloadOrigins: [],
  defaultGenerationSource: 'local-skill', outputDirectoryPrefix: '',
  credentialStatus: 'unavailable', credentialStored: false, credentialConfigured: false, credentialWritable: false,
  accountId: null, accountRevision: null, retryAfterSeconds: 0,
  busy: false, restartRequired: false, canSubmit: false, error: null, notice: null })

export function createProductSettings({ remote, onInvalidated = () => {} }) {
  let snapshot = Object.freeze(initial())
  const listeners = new Set()
  let scope, generation = 0, readId = 0, disposed = false, pending = false
  let detach = () => {}
  const invalidate = () => { try { Promise.resolve(onInvalidated({ reload: false })).catch(() => {}) } catch {} }
  function publish(patch) {
    if (disposed) return
    const next = { ...snapshot, ...patch }
    next.canSubmit = next.connected && next.settingsStatus === 'ready' && next.credentialConfigured && !next.busy && !next.restartRequired
    snapshot = Object.freeze(next)
    for (const listener of listeners) listener()
  }
  function readSettings() {
    try {
      const view = scope?.getSnapshot()
      if (view?.status !== 'ready' || view.mode !== 'host') throw Error()
      publish({ settingsStatus: 'ready', settingsWritable: snapshot.connected && view.writable === true })
    } catch { publish({ settingsStatus: 'unavailable', settingsWritable: false }) }
  }
  function receive(result) {
    const value = accountStatusSchema.parse(result)
    if (snapshot.accountRevision !== value.revision) invalidate()
    publish({ credentialStatus: 'ready', credentialConfigured: value.authenticated, credentialStored: value.authenticated,
      credentialWritable: value.available && value.writable, accountId: value.accountId, accountRevision: value.revision, retryAfterSeconds: value.retryAfterSeconds })
  }
  async function refresh() {
    readSettings()
    if (!snapshot.connected) return false
    const current = generation, id = ++readId
    try {
      const value = await remote.accountStatus()
      if (disposed || current !== generation || id !== readId) return false
      receive(value)
      return true
    } catch {
      if (!disposed && current === generation && id === readId) publish({ credentialStatus: 'error', credentialConfigured: false, credentialWritable: false })
      return false
    }
  }
  async function action(method, payload) {
    if (disposed || pending || !snapshot.connected || !snapshot.credentialWritable) return false
    const current = generation
    pending = true
    ++readId
    publish({ busy: true, error: null, notice: null })
    if (method !== 'accountSms') invalidate()
    try {
      const result = await remote[method](payload)
      if (disposed || current !== generation) return false
      receive(result)
      publish({ notice: method === 'accountSms' ? '验证码已发送，请查看手机。' : method === 'accountLogout' ? '已退出本插件账户；未退出网站。' : '登录成功。可在工作台“从网站导入”中选择项目和文件。' })
      return true
    } catch (error) {
      if (!disposed && current === generation) {
        await refresh()
        publish({ error: error?.code === 'SMS_COOLDOWN' ? '请稍候再发送验证码。' : '账户操作未完成，请检查手机号、验证码或密码；不会自动重试。' })
      }
      return false
    } finally { pending = false; publish({ busy: false }) }
  }
  return Object.freeze({
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    bind(services) {
      detach()
      const disposers = []
      let active = true
      detach = () => {
        if (!active) return
        active = false; generation++; readId++
        for (const fn of disposers) fn()
        scope = null
        publish({ ...initial(), busy: pending, restartRequired: snapshot.restartRequired })
        invalidate()
      }
      try {
        const connection = services.connection
        if (!connection?.isLoopback || !services.remote?.$host?.isLoopback) throw Error()
        scope = typeof services.configForms?.get === 'function'
          ? services.configForms.get('oasis-professional-service')
          : services.settingsScope.bind({ namespace: 'oasis-professional-service' })
        const onHost = () => {
          generation++; readId++
          publish({ connected: connection.generation.getSnapshot() != null, credentialConfigured: false, credentialWritable: false })
          invalidate(); void refresh()
        }
        disposers.push(scope.subscribe(() => { readSettings(); invalidate() }), connection.generation.subscribe(onHost))
        if (services.remote.$on) disposers.push(services.remote.$on('credentials/record-updated', key => {
          if (key === 'oasis-professional-service/website-account') { invalidate(); void refresh() }
        }))
        onHost()
      } catch { detach() }
      return detach
    },
    refresh,
    login: payload => action('accountLogin', payload),
    sendSms: payload => action('accountSms', payload),
    logout: () => action('accountLogout', { confirmed: true }),
    dispose() { detach(); disposed = true; listeners.clear() },
  })
}
