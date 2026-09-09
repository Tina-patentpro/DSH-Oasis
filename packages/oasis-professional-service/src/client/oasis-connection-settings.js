import { normalizeOasisOrigin } from '../oasis-origin-policy.js'
import { normalizeGenerationPreferences } from '../generation-preferences.js'

const REFERENCE = 'OASIS_USER_JWT'
const initial = () => ({
  connected: false, settingsStatus: 'unavailable', settingsWritable: false,
  apiBaseUrl: '', credentialOrigin: '', downloadOrigins: Object.freeze([]),
  ...normalizeGenerationPreferences(),
  localModelEnabled: false,
  credentialStatus: 'unavailable', credentialStored: false,
  credentialConfigured: false, credentialWritable: false,
  busy: false, restartRequired: false, notice: null, error: null, canSubmit: false,
})

export function createOasisConnectionSettings({ onInvalidated = () => {} } = {}) {
  let snapshot = Object.freeze(initial())
  const listeners = new Set()
  let scope = null
  let connection = null
  let remote = null
  let generation = 0
  let credentialRead = 0
  let lastSettings = null
  let pendingWrite = false
  let disposed = false
  let detachCurrent = () => {}

  function publish(patch) {
    if (disposed) return
    const next = { ...snapshot, ...patch }
    next.credentialConfigured = next.credentialStatus === 'ready'
      && next.credentialStored === true
      && next.apiBaseUrl !== ''
      && next.credentialOrigin === next.apiBaseUrl
    next.canSubmit = next.connected && next.settingsStatus === 'ready'
      && next.apiBaseUrl !== '' && next.credentialStatus === 'ready'
      && next.credentialConfigured && !next.busy && !next.restartRequired
    snapshot = Object.freeze(next)
    for (const listener of listeners) listener()
  }

  function invalidate(reload = false) {
    try { Promise.resolve(onInvalidated({ reload })).catch(() => {}) } catch {}
  }

  function readSettings() {
    try {
      const view = scope?.getSnapshot()
      if (view?.status !== 'ready' || view.mode !== 'host') throw new Error('unavailable')
      const value = view.value
      const rawCredentialOrigin = value?.credentialOrigin ?? ''
      if (value?.environmentKind !== 'non-production' || value.credentialRef !== REFERENCE
        || typeof value.apiBaseUrl !== 'string' || typeof rawCredentialOrigin !== 'string'
        || !Array.isArray(value.downloadOrigins)) throw new Error('invalid')
      const apiBaseUrl = value.apiBaseUrl === '' ? '' : normalizeOasisOrigin(value.apiBaseUrl)
      const credentialOrigin = rawCredentialOrigin === '' ? '' : normalizeOasisOrigin(rawCredentialOrigin)
      const downloadOrigins = Object.freeze([...new Set(value.downloadOrigins.map((origin) => normalizeOasisOrigin(origin)))])
      const preferences = normalizeGenerationPreferences(value)
      const localModelEnabled = value.localModelEnabled ?? false
      if (typeof localModelEnabled !== 'boolean') throw new Error('invalid')
      const settings = JSON.stringify([apiBaseUrl, credentialOrigin, downloadOrigins, localModelEnabled])
      const restartRequired = snapshot.restartRequired || (lastSettings !== null && settings !== lastSettings)
      lastSettings = settings
      publish({ settingsStatus: 'ready', settingsWritable: snapshot.connected && view.writable === true,
        apiBaseUrl, credentialOrigin, downloadOrigins, restartRequired, localModelEnabled, ...preferences })
    } catch {
      publish({ settingsStatus: 'unavailable', settingsWritable: false, apiBaseUrl: '',
        credentialOrigin: '', downloadOrigins: Object.freeze([]), localModelEnabled: false, ...normalizeGenerationPreferences() })
    }
  }

  async function refreshCredential() {
    const current = generation
    const read = ++credentialRead
    const api = remote?.credentials
    if (!snapshot.connected || typeof api?.describe !== 'function') {
      publish({ credentialStatus: 'unavailable', credentialStored: false, credentialWritable: false })
      return false
    }
    publish({ credentialStatus: 'loading', credentialWritable: false })
    try {
      const response = await api.describe([REFERENCE])
      if (disposed || current !== generation || read !== credentialRead) return false
      const info = response?.ok === true ? response.value?.[REFERENCE] : null
      if (typeof info?.configured !== 'boolean' || typeof info.writable !== 'boolean') throw new Error('invalid')
      publish({ credentialStatus: 'ready', credentialStored: info.configured,
        credentialWritable: info.writable && typeof api.set === 'function' })
      return true
    } catch {
      if (!disposed && current === generation && read === credentialRead) {
        publish({ credentialStatus: 'error', credentialStored: false, credentialWritable: false })
      }
      return false
    }
  }

  async function write(kind, action) {
    if (disposed || pendingWrite || !snapshot.connected || snapshot.settingsStatus !== 'ready'
      || !(kind === 'credential' ? snapshot.credentialWritable : snapshot.settingsWritable)) return false
    const current = generation
    pendingWrite = true
    publish({ busy: true, error: null, notice: null })
    if (kind !== 'preference') invalidate()
    try {
      await action()
      if (disposed || generation !== current) return false
      if (kind === 'credential') {
        const described = await refreshCredential()
        if (disposed || generation !== current) return false
        publish({ notice: described ? '凭据已更新；后续操作使用新凭据。' : '凭据已写入，但状态读取失败；请刷新状态后再使用。' })
        invalidate(described)
      } else if (kind === 'preference') {
        readSettings()
        publish({ notice: '已保存，仅用于新任务。' })
      } else {
        readSettings()
        publish({ restartRequired: true, notice: '设置已保存。请手工重启隔离 Host 并刷新页面后再提交任务。' })
      }
      return true
    } catch (error) {
      if (!disposed && generation === current) {
        publish({
          ...(error?.code === 'CREDENTIAL_ORIGIN_BINDING_FAILED' ? { credentialStored: true } : {}),
          error: error?.code === 'CREDENTIAL_ORIGIN_BINDING_FAILED'
            ? '凭据已写入，但未能绑定当前 API 地址；远程服务保持禁用，请刷新状态后重试。'
            : kind === 'credential'
              ? '凭据更新失败；请检查可写状态后重试。'
              : '设置保存失败；请刷新后检查冲突或输入。',
          notice: null,
        })
      }
      return false
    } finally {
      pendingWrite = false
      publish({ busy: false, ...(kind === 'settings' && current !== generation ? {
        restartRequired: true, notice: '连接已变更，设置保存结果待确认；请检查保存值、重启 Host 并刷新页面。',
      } : {}) })
    }
  }

  return Object.freeze({
    getSnapshot: () => snapshot,
    subscribe(listener) { if (disposed) return () => {}; listeners.add(listener); return () => listeners.delete(listener) },
    bind(services) {
      if (disposed) return () => {}
      detachCurrent()
      const disposers = []
      let active = true
      const detach = () => {
        if (!active) return
        active = false
        generation += 1
        credentialRead += 1
        for (const dispose of disposers.splice(0)) { try { dispose() } catch {} }
        scope = null
        connection = null
        remote = null
        publish({ ...initial(), busy: pendingWrite, restartRequired: snapshot.restartRequired })
        invalidate()
      }
      detachCurrent = detach
      try {
        connection = services.connection
        remote = services.remote
        if (connection?.isLoopback !== true || remote?.$host?.isLoopback !== true
          || typeof connection.generation?.subscribe !== 'function'
          || typeof connection.generation?.getSnapshot !== 'function') throw new Error('unavailable')
        scope = services.settingsScope.bind({ namespace: 'oasis-professional-service' })
        if (typeof scope?.set !== 'function' || typeof scope?.subscribe !== 'function') throw new Error('unavailable')
        const onHost = () => {
          if (!active) return
          generation += 1
          credentialRead += 1
          publish({ connected: connection.generation.getSnapshot() != null,
            credentialStored: false, credentialWritable: false, error: null, notice: null })
          readSettings()
          invalidate()
          void refreshCredential().then((ok) => { if (active && ok) invalidate(true) })
        }
        disposers.push(scope.subscribe(() => { if (active) { readSettings(); invalidate() } }))
        disposers.push(connection.generation.subscribe(onHost))
        if (typeof remote.$on === 'function') {
          disposers.push(remote.$on('credentials/reference-updated', (ref) => {
            if (!active || ref !== REFERENCE) return
            invalidate()
            void refreshCredential().then((ok) => { if (active && ok) invalidate(true) })
          }))
        }
        onHost()
      } catch { detach() }
      return detach
    },
    async refresh() {
      readSettings()
      const ok = await refreshCredential()
      if (ok) invalidate(true)
      return ok
    },
    async saveApiBaseUrl(value) {
      let origin
      try { origin = value.trim() === '' ? '' : normalizeOasisOrigin(value.trim()) } catch {
        publish({ error: 'API 地址必须是非生产 HTTP(S) origin，不含路径、凭据或查询参数。', notice: null })
        return false
      }
      return write('settings', () => scope.set('apiBaseUrl', origin))
    },
    async saveLocalModelEnabled(value) {
      if (typeof value !== 'boolean') return false
      return write('settings', () => scope.set('localModelEnabled', value))
    },
    async savePreference(key, value) {
      if (!['defaultGenerationSource', 'outputDirectoryPrefix'].includes(key)) return false
      let normalized
      try { normalized = normalizeGenerationPreferences({ [key]: value })[key] } catch {
        publish({ error: key === 'outputDirectoryPrefix' ? '请填写安全的项目内相对目录，或留空。' : '请选择本地 Skills 或专业 API。', notice: null })
        return false
      }
      return write('preference', () => scope.set(key, normalized))
    },
    async saveDownloadOrigins(value) {
      let origins
      try { origins = [...new Set(value.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean).map((item) => normalizeOasisOrigin(item)))] } catch {
        publish({ error: '下载来源必须逐行填写非生产 HTTP(S) origin。', notice: null })
        return false
      }
      return write('settings', () => scope.set('downloadOrigins', origins))
    },
    async updateCredential(value) {
      if (typeof value !== 'string' || value.trim() === '') return false
      if (snapshot.apiBaseUrl === '' || !snapshot.settingsWritable) {
        publish({ error: '请先在 DSH 设置 → 绿洲工作台保存当前 API 地址，再更新凭据。', notice: null })
        value = ''
        return false
      }
      const targetOrigin = snapshot.apiBaseUrl
      return write('credential', async () => {
        try {
          const response = await remote.credentials.set(REFERENCE, value)
          if (response?.ok !== true) throw new Error('failed')
          if (snapshot.credentialOrigin !== targetOrigin) {
            try {
              await scope.set('credentialOrigin', targetOrigin)
            } catch {
              const error = new Error('credential origin binding failed')
              error.code = 'CREDENTIAL_ORIGIN_BINDING_FAILED'
              throw error
            }
          }
        } finally { value = '' }
      })
    },
    dispose() {
      if (disposed) return
      detachCurrent()
      disposed = true
      listeners.clear()
    },
  })
}
