export const name = 'oasis-session-visibility-probe'
export const inject = ['agents', 'webServer']

function nextTurn(events) {
  let latest = -1
  for (const event of events) {
    if (event.type === 'turn/start' && Number.isSafeInteger(event.data?.turn)) {
      latest = Math.max(latest, event.data.turn)
    }
  }
  return latest + 1
}

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/__oasis-week3-session-visible',
    async handler(req, res) {
      res.setHeader('cache-control', 'no-store')
      res.setHeader('content-type', 'application/json; charset=utf-8')
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'method-not-allowed' }))
        return
      }

      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      const sessionId = url.searchParams.get('sessionId')
      const agent = sessionId === null ? undefined : ctx.agents.get(sessionId)
      if (agent === undefined) {
        res.statusCode = 404
        res.end(JSON.stringify({ error: 'agent-not-found' }))
        return
      }

      const turn = nextTurn(agent.session.events)
      agent.session.append('turn/start', { turn })
      agent.session.append('turn/end', { turn, reason: { kind: 'completed' } })
      res.statusCode = 200
      res.end(JSON.stringify({ sessionId, turn, visible: true }))
    },
  }), 'oasis-session-visibility-probe: deterministic empty-turn route')
}
