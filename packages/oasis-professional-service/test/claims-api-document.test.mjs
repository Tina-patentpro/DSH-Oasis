import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareClaimsApiDocument, prepareClaimsApiMapping, buildClaimsApiDocumentInputs } from '../src/claims-api-document.js'
import { createOasisApiClient } from '../src/oasis-api-contract.js'

const snapshot = () => ({ inputSchemaVersion: 'claims-disclosure-2', values: {
  disclosure_text: '技术交底\r\n原文  空格\n😀\t末尾\n', drawings_text: '图1：结构\n',
  claim_requirements_text: ' 保留两项独立权利要求 ', user_input: '不要编造参数\n',
} })
const origins = ['https://files-staging.example']

test('UTF-8 document preserves full text and does not mutate the draft', () => {
  const s = snapshot(); const before = structuredClone(s)
  const a = prepareClaimsApiDocument(s)
  assert.equal(new TextDecoder().decode(a.bytes), s.values.disclosure_text)
  assert.equal(a.fileName, 'technical-disclosure.txt')
  assert.equal(a.mediaType, 'text/plain;charset=utf-8')
  assert.equal(a.sha256.length, 64)
  assert.deepEqual(s, before)
  assert.equal(prepareClaimsApiDocument(s).sha256, a.sha256)
  s.values.disclosure_text += '修改'
  assert.notEqual(prepareClaimsApiDocument(s).sha256, a.sha256)
})

test('maps only approved fields with distinct requirement headings', () => {
  const s = snapshot()
  assert.deepEqual(buildClaimsApiDocumentInputs(s, 'https://files-staging.example/a.txt', origins), {
    Technical_Disclosure_file: { type: 'document', transfer_method: 'remote_url', url: 'https://files-staging.example/a.txt' },
    drawings_explain_TD: s.values.drawings_text,
    User_input: `【撰写要求】\n${s.values.claim_requirements_text}\n\n【用户指令】\n${s.values.user_input}`,
  })
  s.values.drawings_text = ''; s.values.claim_requirements_text = ''; s.values.user_input = ''
  const inputs = buildClaimsApiDocumentInputs(s, 'https://files-staging.example/a.txt', origins)
  assert.equal(Object.hasOwn(inputs, 'User_input'), false)
  assert.equal(Object.hasOwn(inputs, 'drawings_explain_TD'), false)
  assert.equal(Object.hasOwn(inputs, 'technical_solutions'), false)
})

test('minimal disclosure produces only a TXT file input without fabricated chapters or optional empty fields', () => {
  const s = { inputSchemaVersion: 'claims-disclosure-2', values: {
    disclosure_text: '连接件', drawings_text: '', claim_requirements_text: '', user_input: '',
  } }
  const before = structuredClone(s)
  assert.equal(new TextDecoder().decode(prepareClaimsApiDocument(s).bytes), '连接件')
  assert.deepEqual(prepareClaimsApiMapping(s).textInputs, {})
  assert.deepEqual(buildClaimsApiDocumentInputs(s, 'https://files-staging.example/a.txt', origins), {
    Technical_Disclosure_file: { type: 'document', transfer_method: 'remote_url', url: 'https://files-staging.example/a.txt' },
  })
  assert.deepEqual(s, before)
})

for (const [field, content, expected] of [
  ['drawings_text', '图 1\r\n', { drawings_explain_TD: '图 1\r\n' }],
  ['claim_requirements_text', ' 保留要求 ', { User_input: '【撰写要求】\n 保留要求 ' }],
  ['user_input', '\t保留指令\n', { User_input: '【用户指令】\n\t保留指令\n' }],
]) test(`minimal mapping preserves independently supplied ${field}`, () => {
  const s = { inputSchemaVersion: 'claims-disclosure-2', values: {
    disclosure_text: '连接件', drawings_text: '', claim_requirements_text: '', user_input: '', [field]: content,
  } }
  assert.deepEqual(prepareClaimsApiMapping(s).textInputs, expected)
  const inputs = buildClaimsApiDocumentInputs(s, 'https://files-staging.example/a.txt', origins)
  const { Technical_Disclosure_file, ...text } = inputs
  assert.deepEqual(text, expected)
  assert.equal(Technical_Disclosure_file.url, 'https://files-staging.example/a.txt')
})

test('rejects missing upload, unsafe or unapproved URLs', () => {
  for (const url of [undefined, '', 'https://evil.example/a.txt', 'https://u:p@files-staging.example/a.txt', 'https://files-staging.example/a.txt?token=secret', 'https://files-staging.example/a.txt#x', 'file:///a.txt', 'https://lzhxpy.oasisintwrite.com/a.txt']) {
    assert.throws(() => buildClaimsApiDocumentInputs(snapshot(), url, origins))
  }
  assert.throws(() => buildClaimsApiDocumentInputs(snapshot(), 'https://files-staging.example/a.txt', []))
})

test('rejects invalid drafts and unhandled upstream instead of silently dropping materials', () => {
  for (const patch of [{ inputSchemaVersion: '1' }, { upstream: { kind: 'project-file' } }]) {
    assert.throws(() => prepareClaimsApiDocument({ ...snapshot(), ...patch }))
  }
  for (const disclosure_text of ['', ' \r\n', 'x'.repeat(20001)]) {
    const s = snapshot(); s.values.disclosure_text = disclosure_text
    assert.throws(() => prepareClaimsApiDocument(s))
  }
  const s = snapshot(); s.values.extra = 'must not drop'
  assert.throws(() => prepareClaimsApiDocument(s))
  const badUnicode = snapshot(); badUnicode.values.disclosure_text = '\uD800'
  assert.throws(() => prepareClaimsApiDocument(badUnicode), /Unicode/)
})

test('prepared document uses the existing multipart upload contract with mock transport only', async () => {
  const s = snapshot(); let calls = 0
  const client = createOasisApiClient({
    baseUrl: 'https://oasis-staging.example', downloadOrigins: origins,
    resolveToken: async () => 'synthetic-only',
    fetchImpl: async (url, init) => {
      calls++
      assert.equal(new URL(url).pathname, '/api/user/upload')
      assert.equal(init.method, 'POST')
      const file = init.body.get('file')
      assert.equal(file.name, 'technical-disclosure.txt')
      assert.deepEqual(new Uint8Array(await file.arrayBuffer()), prepareClaimsApiDocument(s).bytes)
      return new Response(JSON.stringify({ data: { url: 'https://files-staging.example/a.txt' } }), { status: 200 })
    },
  })
  const url = await client.uploadFile(prepareClaimsApiDocument(s))
  assert.equal(buildClaimsApiDocumentInputs(s, url, origins).Technical_Disclosure_file.url, url)
  assert.equal(calls, 1)
})
