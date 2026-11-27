import { OASIS_PRODUCT_ORIGIN, accountStatusSchema } from '../oasis-account-contract.js'
import { DEFAULT_LOCAL_SKILL_SUITE, LOCAL_SKILL_SUITES, OASIS_PLUGIN_NAMESPACE_PATTERN } from '../local-skill-suites.js'

const initial = () => ({ connected: false, settingsStatus: 'unavailable', settingsWritable: false,
  environmentKind: 'production', apiBaseUrl: OASIS_PRODUCT_ORIGIN, credentialOrigin: OASIS_PRODUCT_ORIGIN, downloadOrigins: [],
  defaultGenerationSource: 'local-skill', outputDirectoryPrefix: '',
  localSkillSuite: DEFAULT_LOCAL_SKILL_SUITE, managedSkillSuite: false, savingLocalSkillSuite: false, localSkillSuiteError: null,
  credentialStatus: 'unavailable', credentialStored: false, credentialConfigured: false, credentialWritable: false,
  accountId: null, accountRevision: null, retryAfterSeconds: 0,
  busy: false, restartRequired: false, canSubmit: false, error: null, notice: null, nativeZeroGeneration:false,nativeBusinessRecovery:false })

export function createProductSettings({ remote, onInvalidated = () => {} }) {
  let snapshot = Object.freeze(initial())
  const listeners = new Set()
  let scope, generation = 0, readId = 0, disposed = false, pending = false
  let detach = () => {}
  let detachScope = () => {}, configForms, scopeNamespace
  function watchScope(next, namespace) {
    if (scope === next && scopeNamespace === namespace) return
    detachScope()
    scope = next
    scopeNamespace = namespace
    detachScope = scope.subscribe(() => { readSettings(); invalidate() })
    readSettings()
  }
  const invalidate = () => { try { Promise.resolve(onInvalidated({ reload: false })).catch(() => {}) } catch {} }
  function publish(patch) {
    if (disposed) return
    const next = { ...snapshot, ...patch }
    next.canSubmit = next.connected && next.settingsStatus === 'ready' && next.credentialConfigured && !next.busy && !next.restartRequired
    snapshot = Object.freeze(next)
    for (const listener of listeners) listener()
  }
  function readSettings() {
    if (snapshot.managedSkillSuite) return
    try {
      const view = scope?.getSnapshot()
      if (view?.status !== 'ready' || view.mode !== 'host') throw Error()
      const localSkillSuite = view.value?.localSkillSuite ?? DEFAULT_LOCAL_SKILL_SUITE
      if (!Object.hasOwn(LOCAL_SKILL_SUITES, localSkillSuite)) throw Error()
      publish({ settingsStatus: 'ready', settingsWritable: snapshot.connected && view.writable === true, localSkillSuite })
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
    if (!snapshot.connected || snapshot.nativeZeroGeneration || snapshot.nativeBusinessRecovery) return false
    const current = generation, id = ++readId
    try {
      if(typeof remote.getV340Catalog==='function'){
        const catalog=await remote.getV340Catalog()
        if(disposed||current!==generation||id!==readId)return false
        if (catalog.managedSkillSuite === true) {
          publish({ managedSkillSuite: true, settingsWritable: false })
          const { suite } = await remote.getLocalSkillSuite()
          if (disposed || current !== generation || id !== readId) return false
          publish({ settingsStatus: 'ready', settingsWritable: true, localSkillSuite: suite })
        }
        const namespace = catalog.settingsNamespace
        if (configForms && typeof namespace === 'string' && OASIS_PLUGIN_NAMESPACE_PATTERN.test(namespace)
          && namespace !== scopeNamespace) watchScope(configForms.get(namespace), namespace)
        if(catalog.nativeZeroGeneration===true||catalog.nativeBusinessRecovery){
          publish({nativeZeroGeneration:catalog.nativeZeroGeneration===true,nativeBusinessRecovery:!!catalog.nativeBusinessRecovery,credentialStatus:'unavailable',credentialConfigured:false,credentialStored:false,credentialWritable:false,accountId:null,accountRevision:null});return false
        }
      }
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
        detachScope()
        detachScope = () => {}
        scope = null
        scopeNamespace = null
        configForms = null
        publish({ ...initial(), busy: pending, restartRequired: snapshot.restartRequired })
        invalidate()
      }
      try {
        const connection = services.connection
        if (!connection?.isLoopback || !services.remote?.$host?.isLoopback) throw Error()
        configForms = typeof services.configForms?.get === 'function' ? services.configForms : null
        const namespace = 'oasis-professional-service'
        watchScope(configForms ? configForms.get(namespace) : services.settingsScope.bind({ namespace }), namespace)
        const onHost = () => {
          generation++; readId++
          publish({ connected: connection.generation.getSnapshot() != null, credentialConfigured: false, credentialWritable: false,
            nativeZeroGeneration: false, nativeBusinessRecovery: false, managedSkillSuite: false, savingLocalSkillSuite: false, localSkillSuiteError: null })
          invalidate(); void refresh()
        }
        disposers.push(connection.generation.subscribe(onHost))
        if (services.remote.$on) disposers.push(services.remote.$on('credentials/record-updated', key => {
          if (key === 'oasis-professional-service/website-account') { invalidate(); void refresh() }
        }))
        onHost()
      } catch { detach() }
      return detach
    },
    refresh,
    async saveLocalSkillSuite(suite) {
      if (!Object.hasOwn(LOCAL_SKILL_SUITES, suite) || !snapshot.settingsWritable || snapshot.savingLocalSkillSuite
        || snapshot.nativeZeroGeneration || snapshot.nativeBusinessRecovery
        || (!snapshot.managedSkillSuite && typeof scope?.set !== 'function')) return false
      if (suite === snapshot.localSkillSuite) return true
      const activeScope = scope, current = generation, managed = snapshot.managedSkillSuite
      publish({ savingLocalSkillSuite: true, localSkillSuiteError: null })
      try {
        if (managed) {
          const saved = await remote.setLocalSkillSuite(suite)
          if (disposed || generation !== current) return false
          if (saved.suite !== suite) throw Error()
          ++readId
          publish({ localSkillSuite: suite })
          invalidate()
          return true
        }
        const accepted = await activeScope.set('localSkillSuite', suite)
        if (disposed || generation !== current || scope !== activeScope) return false
        readSettings()
        if (!accepted || snapshot.localSkillSuite !== suite) throw Error()
        return true
      } catch {
        if (!disposed && generation === current) publish({ localSkillSuiteError: '未能保存 Skills 套件，请重新选择。' })
        return false
      } finally {
        if (!disposed && generation === current) publish({ savingLocalSkillSuite: false })
      }
    },
    login: payload => action('accountLogin', payload),
    sendSms: payload => action('accountSms', payload),
    logout: () => action('accountLogout', { confirmed: true }),
    dispose() { detach(); disposed = true; listeners.clear() },
  })
}
