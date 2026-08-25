import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'

const scriptPath = resolve('scripts/dsh-local-api-smoke.mjs')

async function runCli(args) {
  return await new Promise((resolveRun) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('close', (code, signal) => resolveRun({ code, signal, stdout, stderr }))
  })
}

async function withRpcServer(payload, callback, host = '127.0.0.1') {
  const requests = []
  const server = createServer((request, response) => {
    requests.push({ method: request.method, url: request.url })
    request.resume()
    request.on('end', () => {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify(payload))
    })
  })
  await new Promise((resolveListen) => server.listen(0, host, resolveListen))
  const address = server.address()
  try {
    const urlHost = host === '::1' ? '[::1]' : host
    return await callback(`http://${urlHost}:${address.port}`, requests)
  } finally {
    await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()))
  }
}

async function withRequestFile(callback) {
  const directory = await mkdtemp(join(tmpdir(), 'oasis-rpc-test-'))
  const requestPath = join(directory, 'request.json')
  await writeFile(requestPath, '{}', 'utf8')
  try {
    return await callback(requestPath)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('HTTP 200 with result.ok=false exits non-zero', async () => {
  await withRequestFile(async (requestPath) => {
    await withRpcServer({ result: { ok: false, error: { code: 'TEST_FAILURE', message: 'expected failure' } } }, async (baseUrl) => {
      const result = await runCli([baseUrl, 'workspace.list', requestPath])
      assert.notEqual(result.code, 0)
      assert.match(result.stderr, /RPC.*result\.ok|TEST_FAILURE/i)
    })
  })
})

test('rejects non-http protocols before fetching', async () => {
  await withRequestFile(async (requestPath) => {
    const result = await runCli(['ftp://localhost:1234', 'workspace.list', requestPath])
    assert.notEqual(result.code, 0)
    assert.match(result.stderr, /refusing.*protocol/i)
  })
})

test('rejects non-loopback hosts before fetching', async () => {
  await withRequestFile(async (requestPath) => {
    const result = await runCli(['http://example.com', 'workspace.list', requestPath])
    assert.notEqual(result.code, 0)
    assert.match(result.stderr, /refusing non-loopback/i)
  })
})

test('rejects endpoints outside the fixed allowlist', async () => {
  await withRequestFile(async (requestPath) => {
    await withRpcServer({ result: { ok: true, value: {} } }, async (baseUrl, requests) => {
      const result = await runCli([baseUrl, 'settings.get', requestPath])
      assert.notEqual(result.code, 0)
      assert.match(result.stderr, /endpoint.*allowlist/i)
      assert.equal(requests.length, 0)
    })
  })
})

test('rejects dot-segment endpoint traversal', async () => {
  await withRequestFile(async (requestPath) => {
    await withRpcServer({ result: { ok: true, value: {} } }, async (baseUrl, requests) => {
      const result = await runCli([baseUrl, '../settings', requestPath])
      assert.notEqual(result.code, 0)
      assert.match(result.stderr, /endpoint.*allowlist|invalid endpoint/i)
      assert.equal(requests.length, 0)
    })
  })
})

test('fails when the RPC envelope has no boolean result.ok', async () => {
  await withRequestFile(async (requestPath) => {
    await withRpcServer({ result: { value: {} } }, async (baseUrl) => {
      const result = await runCli([baseUrl, 'workspace.list', requestPath])
      assert.notEqual(result.code, 0)
      assert.match(result.stderr, /result\.ok/i)
    })
  })
})

test('accepts a valid skill.list response with expected skills', async () => {
  await withRequestFile(async (requestPath) => {
    const payload = {
      result: {
        ok: true,
        value: {
          skills: [
            { name: 'dsh-plugin-development', modelInvocable: true },
            { name: 'oasis-rd-intake', modelInvocable: true },
          ],
        },
      },
    }
    await withRpcServer(payload, async (baseUrl, requests) => {
      const result = await runCli([
        baseUrl,
        'skill.list',
        requestPath,
        'dsh-plugin-development',
        'oasis-rd-intake',
      ])
      assert.equal(result.code, 0, result.stderr)
      assert.match(result.stdout, /dsh-plugin-development/)
      assert.match(result.stdout, /oasis-rd-intake/)
      assert.deepEqual(requests, [{ method: 'POST', url: '/api/skill.list' }])
    })
  })
})

test('accepts the bracketed IPv6 loopback hostname emitted by URL', async () => {
  await withRequestFile(async (requestPath) => {
    await withRpcServer({ result: { ok: true, value: { workspaces: [] } } }, async (baseUrl, requests) => {
      const result = await runCli([baseUrl, 'workspace.list', requestPath])
      assert.equal(result.code, 0, result.stderr)
      assert.deepEqual(requests, [{ method: 'POST', url: '/api/workspace.list' }])
    }, '::1')
  })
})
