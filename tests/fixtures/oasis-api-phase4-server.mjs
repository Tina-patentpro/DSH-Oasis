import assert from 'node:assert/strict'
import { createServer } from 'node:http'

// Public, synthetic test values, never a real credential or user material.
export const FIXTURE_TOKEN = 'oasis-phase4-synthetic-credential-not-a-jwt'
export const FIXTURE_MATERIAL = 'OASIS_PHASE4_SYNTHETIC_MATERIAL_ONLY\n'
export const FIXTURE_SERVICE = Object.freeze({ id: 7301, endpoint: 'phase4_synthetic_workflow', process: 'phase4_process', folderId: 4701 })
export const FIXTURE_OPERATIONS = Object.freeze([
  { method: 'GET', path: '/api/user/detail', operation: 'user' },
  { method: 'GET', path: '/api/apicategories/detail', operation: 'catalog' },
  { method: 'POST', path: '/api/apicategories/apidetail', operation: 'detail' },
  { method: 'GET', path: '/api/user/user/folderlist', operation: 'folders' },
  { method: 'GET', path: '/api/user/user/folderdetail/{id}', operation: 'folder' },
  { method: 'POST', path: '/api/user/upload', operation: 'upload' },
  { method: 'POST', path: '/api/apicategories/create', operation: 'create' },
  { method: 'GET', path: '/api/apicategories/queryprocess/{key}', operation: 'query' },
  { method: 'GET', path: '/api/user/runningwater/list', operation: 'ledger' },
].map(Object.freeze))
const SCENARIOS = new Set(['success', 'receipt', 'lost-create', 'no-create-id', 'unauthorized', 'ledger-raw', 'ledger-empty', 'ledger-duplicate', 'ledger-malformed', 'unsafe-query', 'unsafe-fragment', 'unsafe-userinfo', 'waiting'])
function exactKeys(value, keys) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value))
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort())
}

export async function startFixture({ scenario = 'success', textOnly = false } = {}) {
  assert.ok(SCENARIOS.has(scenario), 'unsupported fixture scenario')
  assert.equal(typeof textOnly, 'boolean')
  const events = []; const violations = []; const counts = {}
  let origin; let originalKey
  const recordId = 8801
  const folder = { id: FIXTURE_SERVICE.folderId, name: 'Phase 4 synthetic folder' }
  const result = key => {
    let url = `${origin}/files/result-a.txt`
    if (scenario === 'unsafe-query') url += '?synthetic=unsafe'
    if (scenario === 'unsafe-fragment') url += '#unsafe'
    if (scenario === 'unsafe-userinfo') url = url.replace('http://', 'http://synthetic@')
    return { ...(scenario === 'no-create-id' ? {} : { id: recordId }), key, answer_text: 'Synthetic Phase 4 result; no real service was called.', file_url: textOnly ? [] : [url, `${origin}/files/result-b.txt`] }
  }
  const server = createServer(async (req, res) => {
    let operation = 'unexpected'
    const respond = (status, data) => {
      events.push({ operation, status })
      res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(data))
    }
    try {
      assert.equal(req.socket.remoteAddress, '127.0.0.1')
      assert.equal(req.headers.host, new URL(origin).host)
      const url = new URL(req.url, origin)
      assert.equal(url.origin, origin)
      assert.equal(url.search, ''); assert.equal(url.hash, '')
      if (req.method === 'GET' && ['/files/material.txt', '/files/result-a.txt', '/files/result-b.txt'].includes(url.pathname)) {
        operation = 'file'; counts.file = (counts.file ?? 0) + 1
        events.push({ operation, status: 200 })
        res.writeHead(200, { 'content-type': 'text/plain' }); res.end('Synthetic file, not a verified business output.'); return
      }
      const route = FIXTURE_OPERATIONS.find(item => item.method === req.method && (item.path === url.pathname
        || (item.operation === 'folder' && url.pathname === `/api/user/user/folderdetail/${FIXTURE_SERVICE.folderId}`)
        || (item.operation === 'query' && /^\/api\/apicategories\/queryprocess\/[^/]+$/.test(url.pathname))))
      assert.ok(route)
      operation = route.operation; counts[operation] = (counts[operation] ?? 0) + 1
      if (scenario === 'unauthorized' || req.headers.authorization !== `Bearer ${FIXTURE_TOKEN}`) { respond(401, { code: 401 }); return }
      const chunks = []; let length = 0
      for await (const chunk of req) {
        length += chunk.length; assert.ok(length <= 64 * 1024); chunks.push(chunk)
      }
      const bytes = Buffer.concat(chunks)
      if (req.method === 'GET') assert.equal(bytes.length, 0)
      let body
      if (req.method === 'POST' && operation !== 'upload') {
        assert.match(req.headers['content-type'] ?? '', /^application\/json(?:;|$)/)
        body = JSON.parse(bytes.toString('utf8'))
      }
      const envelope = data => ({ code: 0, data })
      switch (operation) {
        case 'user': respond(200, envelope({ id: 17, balance: 100 })); break
        case 'catalog': respond(200, envelope({ synthetic: [{ id: 71, name: 'Phase 4 synthetic services', is_active: true, apis: [{ id: FIXTURE_SERVICE.id, api_endpoint: FIXTURE_SERVICE.endpoint, api_process: FIXTURE_SERVICE.process, api_description: 'Local synthetic validation only' }] }] })); break
        case 'detail':
          exactKeys(body, ['name']); assert.equal(body.name, FIXTURE_SERVICE.endpoint)
          respond(200, envelope({ id: FIXTURE_SERVICE.id, name: FIXTURE_SERVICE.endpoint, api_type: 'Workflow', is_async: 0, price: 1, model_name: 'synthetic', input_schema: [{ type: 'paragraph', en_name: 'topic', cn_name: '合成主题' }, ...(textOnly ? [] : [{ type: 'file', en_name: 'material', cn_name: '合成材料' }])], output_schema: [{ type: 'paragraph', en_name: 'answer_text', cn_name: '合成结果' }, ...(textOnly ? [] : [{ type: 'file', en_name: 'file_url', cn_name: '结果文件' }])] })); break
        case 'folders': respond(200, envelope({ total: 1, items: [folder] })); break
        case 'folder': respond(200, envelope(folder)); break
        case 'upload': {
          assert.equal(textOnly, false, 'text-only scenario does not accept uploads')
          assert.match(req.headers['content-type'] ?? '', /^multipart\/form-data; boundary=/)
          const form = await new Response(bytes, { headers: { 'content-type': req.headers['content-type'] } }).formData()
          assert.deepEqual([...form.keys()], ['file'])
          const file = form.get('file'); assert.equal(typeof file, 'object')
          assert.equal(file.name, 'material.txt'); assert.equal(await file.text(), FIXTURE_MATERIAL)
          respond(200, envelope({ saved_path: `${origin}/files/material.txt` })); break
        }
        case 'create':
          exactKeys(body, ['id', 'key', 'inputs', 'api_process', 'folder_id'])
          assert.equal(body.id, FIXTURE_SERVICE.id); assert.equal(body.api_process, FIXTURE_SERVICE.process); assert.equal(body.folder_id, FIXTURE_SERVICE.folderId)
          assert.equal(typeof body.key, 'string'); assert.ok(body.key.length > 0 && body.key.length < 300)
          exactKeys(body.inputs, textOnly ? ['topic'] : ['topic', 'material']); assert.equal(typeof body.inputs.topic, 'string')
          if (!textOnly) {
            exactKeys(body.inputs.material, ['type', 'transfer_method', 'url'])
            assert.deepEqual(body.inputs.material, { type: 'document', transfer_method: 'remote_url', url: `${origin}/files/material.txt` })
          }
          assert.equal(originalKey, undefined, 'unexpected second create')
          originalKey = body.key
          if (scenario === 'lost-create') { events.push({ operation, status: 'connection-lost' }); req.socket.destroy(); break }
          respond(200, envelope(['receipt', 'waiting'].includes(scenario) ? { id: recordId, key: originalKey } : result(originalKey))); break
        case 'query': {
          const key = decodeURIComponent(url.pathname.split('/').at(-1)); assert.equal(key, originalKey)
          respond(200, envelope(scenario === 'waiting' ? { key, progress_percent: 10 } : { ...result(key), is_completed: true, progress_percent: 100 })); break
        }
        case 'ledger': {
          const item = { id: 9901, link_id: recordId, type: 'consume', money: 1, balance: 99, create_time: '2026-09-02 12:00:00' }
          const items = scenario === 'ledger-empty' ? [] : scenario === 'ledger-duplicate' ? [item, { ...item, id: 9902 }] : scenario === 'ledger-malformed' ? [{ ...item, money: 'invalid' }] : [item]
          const page = { total: items.length, items }
          respond(200, scenario === 'ledger-raw' ? page : envelope(page)); break
        }
        default: throw new Error('unexpected operation')
      }
    } catch {
      // Never retain assertion errors: their actual/expected fields can contain bodies.
      violations.push({ operation, code: 'FIXTURE_CONTRACT_VIOLATION' })
      if (!res.destroyed && !res.headersSent) respond(400, { code: 400 })
      else res.destroy()
    }
  })
  server.requestTimeout = 5000
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  origin = `http://127.0.0.1:${server.address().port}`
  return Object.freeze({
    origin,
    snapshot: () => structuredClone({ scenario, counts, events, violations }),
    setScenario(next) { assert.ok(SCENARIOS.has(next)); scenario = next },
    async close() { server.closeAllConnections(); await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())) },
  })
}
