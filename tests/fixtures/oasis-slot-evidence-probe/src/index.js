export const name = 'oasis-slot-evidence-probe'
export const inject = ['agents', 'cordisInspect', 'webServer']
const ALLOWED_ROOTS = new Set(['conversation.input.right', 'shell.overlay', 'details'])

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/__oasis-week1-slot-evidence',
    async handler(req, res) {
      res.setHeader('cache-control', 'no-store')
      res.setHeader('content-type', 'application/json; charset=utf-8')
      if (req.method !== 'GET') {
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'method-not-allowed' }))
        return
      }

      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      const sessionId = url.searchParams.get('sessionId')
      const root = url.searchParams.get('root')
      if (root !== null && !ALLOWED_ROOTS.has(root)) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'root-not-allowed' }))
        return
      }
      const agent = sessionId === null ? undefined : ctx.agents.get(sessionId)
      if (agent === undefined) {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'agent-not-found' }))
        return
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10_000)
      try {
        const data = await ctx.cordisInspect.query(
          'client',
          'Slots',
          'listSubTree',
          root === null ? {} : { root },
          agent,
          controller.signal,
        )
        res.statusCode = 200
        res.end(JSON.stringify(data))
      } catch (error) {
        res.statusCode = controller.signal.aborted ? 504 : 500
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
      } finally {
        clearTimeout(timeout)
      }
    },
  }), 'oasis-slot-evidence-probe: live Slots.listSubTree route')
}
