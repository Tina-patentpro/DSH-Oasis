import { clientRequestSchema } from '@deepseek-ai/dsh-client-connection'

const endpoints = Object.freeze([
  'import/open','import/projects','import/items','import/commit','import/unlink',
  'account/status','account/sms','account/login','account/logout',
  'state/get','state/replace','workflow/catalog',
  'professional/bootstrap','professional/detail','professional/start','professional/continue','professional/stop','professional/running-water',
  'professional/binding/get','professional/binding/confirm',
  'professional/binding/options','task/preview-api','task/start-api',
  'material/add','material/refresh','material/remove',
  'task/create','task/create-unified','task/select-upstream','task/prepare-local','task/prepare-api','task/check-api','task/create-local','task/observe-local','task/stop-unified','task/edit-result','task/review',
  'artifact/conversation-draft','artifact/saved-file','artifact/prepare-writeback','artifact/commit-writeback',
])

export function registerWorkbenchRoutes(connection, handler) {
  if (typeof connection?.fetch?.register !== 'function' || typeof handler !== 'function') {
    throw new TypeError('DSH exact Fetch registration and business handler are required')
  }
  const disposers = []
  try {
    for (const endpoint of endpoints) {
      const method = 'oasis-workbench/' + endpoint
      const path = '/api/' + method
      const dispose = connection.fetch.register({
        path, methods:['POST'], requestBody:'buffered',
        async fetch(request) {
          if (request.method !== 'POST' || new URL(request.url).pathname !== path) return new Response('Not found',{status:404})
          if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return new Response('Unsupported media type',{status:415})
          let envelope
          try { envelope = clientRequestSchema.safeParse(await request.json()) }
          catch { return new Response('Invalid JSON',{status:400}) }
          if (!envelope.success || envelope.data.method !== method) return new Response('Invalid envelope',{status:400})
          const {rpcId,payload} = envelope.data
          const result = await handler(endpoint,payload)
          return Response.json({type:'server-response',rpcId,result},{headers:{'cache-control':'no-store'}})
        },
      })
      if (typeof dispose !== 'function') throw new TypeError('Invalid DSH Fetch route disposer')
      disposers.push(dispose)
    }
  } catch (error) {
    for (const dispose of disposers.reverse()) { try { dispose() } catch {} }
    throw error
  }
  let released = false
  return async () => {
    if (released) return
    released = true
    const errors = []
    for (const dispose of disposers.reverse()) { try { await dispose() } catch (error) { errors.push(error) } }
    if (errors.length) throw new AggregateError(errors,'Oasis route cleanup failed')
  }
}
