export const name = 'oasis-api-phase4-slot-probe'
export const inject = ['agents', 'cordisInspect', 'webServer']
export const ROOTS = Object.freeze(['settings.section', 'settings.plugins.tab', 'settings.plugin.item', 'conversation.input.right', 'shell.overlay', 'details'])
export const ROUTE = '/__oasis-phase4-slot-contract'

export function createProbeHandler(ctx, { timeoutMs = 10_000 } = {}) {
  return async (req, res) => {
    res.setHeader('cache-control', 'no-store')
    res.setHeader('content-type', 'application/json; charset=utf-8')
    const reply = (status, body) => { res.statusCode = status; res.end(JSON.stringify(body)) }
    const host = req.headers?.host ?? ''
    if (!['127.0.0.1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress)
      || !/^127\.0\.0\.1:[1-9]\d{0,4}$/.test(host)
      || (req.headers.origin !== undefined && req.headers.origin !== `http://${host}`)) return reply(403, { error: 'origin-rejected' })
    if (req.method !== 'GET') return reply(405, { error: 'method-not-allowed' })
    let url
    try { url = new URL(req.url, `http://${host}`) } catch { return reply(400, { error: 'invalid-url' }) }
    if (url.origin !== `http://${host}` || url.pathname !== ROUTE) return reply(404, { error: 'route-not-found' })
    if ([...url.searchParams.keys()].some(key => !['sessionId', 'root'].includes(key))
      || url.searchParams.getAll('sessionId').length !== 1 || url.searchParams.getAll('root').length > 1) return reply(400, { error: 'invalid-parameters' })
    const sessionId = url.searchParams.get('sessionId'); const root = url.searchParams.get('root')
    if (!/^[a-z0-9_-]{1,128}$/i.test(sessionId) || (root !== null && !ROOTS.includes(root))) return reply(400, { error: 'invalid-parameters' })
    const agent = ctx.agents.get(sessionId)
    if (agent === undefined) return reply(404, { error: 'agent-not-found' })
    const controller = new AbortController(); let timer
    try {
      const result = await Promise.race([
        ctx.cordisInspect.query('client', 'Slots', 'listSubTree', root === null ? {} : { root }, agent, controller.signal),
        new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')) }, timeoutMs) }),
      ])
      if (Buffer.byteLength(JSON.stringify(result) ?? '') > 2 * 1024 * 1024) return reply(500, { error: 'response-too-large' })
      return reply(200, result)
    } catch {
      return reply(controller.signal.aborted ? 504 : 500, { error: controller.signal.aborted ? 'probe-timeout' : 'probe-failed' })
    } finally { clearTimeout(timer); controller.abort() }
  }
}

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: ROUTE, handler: createProbeHandler(ctx) }), 'phase4: read-only live Slot contract')
}
