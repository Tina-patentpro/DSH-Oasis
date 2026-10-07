import test from 'node:test'
import assert from 'node:assert/strict'
const mod = await import('../src/website-record-files.js').catch(() => ({}))
const extract = record => { assert.equal(typeof mod.extractWebsiteRecordFiles, 'function'); return mod.extractWebsiteRecordFiles(record) }
const origin = 'https://lzhxpy.oasisintwrite.com'

test('input objects and JSON arrays preserve field provenance without scanning ordinary text', () => {
  const result = extract({ inputs: JSON.stringify({ disclosure: { type: 'document', transfer_method: 'remote_url', url: '/uploads/a.txt' },
    images: [{ type: 'image', transfer_method: 'remote_url', url: origin + '/files/b.png' }], prose: origin + '/files/not-a-file.txt' }) })
  assert.deepEqual(result.files.map(f => [f.role, f.inputField, f.url]), [['input', 'disclosure', origin + '/uploads/a.txt'], ['input', 'images', origin + '/files/b.png']])
  assert.deepEqual(result.unsupported, [])
})

test('positional output holes cannot shift an attachment onto the preceding object', () => {
  const result = extract({ file_url: [null, '/files/b.docx'], file_output: [{ filename: 'a.docx' }, { filename: 'b.docx' }] })
  assert.deepEqual(result.files.map(f => [f.fileName, f.url]), [['b.docx', origin + '/files/b.docx']])
  assert.equal(result.unsupported.length, 1)
})

test('explicit download URLs win but different unconsumed positional URLs are not silently lost', () => {
  const result = extract({ file_url: ['/files/preview.pdf'], file_output: [{ download_url: '/files/original.docx', filename: 'original.docx' }] })
  assert.deepEqual(result.files.map(f => f.url), [origin + '/files/original.docx', origin + '/files/preview.pdf'])
})

test('known JSON response outputs unwrap without treating answer prose as file objects', () => {
  const result = extract({ response: JSON.stringify({ data: { outputs: { file_output: [{ url: '/storage/report.pdf', name: 'report.pdf' }] } } }),
    answer_text: '{"url":"/files/prose.pdf","type":"document"}' })
  assert.deepEqual(result.files.map(f => [f.role, f.fileName]), [['output', 'report.pdf']])
})

test('multi URLs preserve ordinary commas and canonical duplicates without losing input roles', () => {
  const result = extract({ inputs: { x: { type: 'document', transfer_method: 'remote_url', url: '/files/报告 1.pdf' } },
    file_url: '/files/报告 1.pdf, /files/part,one.pdf?parts=1,2, /files/%E6%8A%A5%E5%91%8A%201.pdf' })
  assert.deepEqual(result.files.map(f => f.role), ['input', 'output', 'output'])
  assert.equal(result.files[2].url, origin + '/files/part,one.pdf?parts=1,2')
})

test('untrusted addresses and unsafe Windows filenames remain explicit unsupported entries', () => {
  const result = extract({ file_output: [
    { url: 'https://evil.example/files/a.txt' }, { url: '/api/user/user/folderdetail/1' },
    { url: '/files/a.txt#fragment' }, { url: '/files/a.txt', filename: '../escape.txt' },
    { url: '/files/CON.txt' }, { url: '/files/%2e%2e/api/user/detail' },
    { url: 'https://user:pass@lzhxpy.oasisintwrite.com/files/a.txt' },
  ] })
  assert.equal(result.files.length, 0)
  assert.equal(result.unsupported.length, 7)
  assert.ok(result.unsupported.every(f => f.reason && !f.url))
})

test('uploaded IDs and malformed structures are not reported as complete empty materials', () => {
  const result = extract({ inputs: '{invalid', file_output: 'not-json', file_url: ['/files/a.pdf', { url: '/files/b.pdf' }] })
  assert.equal(result.files.length, 1)
  assert.equal(result.unsupported.length, 3)
  const ids = extract({ inputs: { upload: { type: 'document', transfer_method: 'local_file', upload_file_id: 'opaque' } } })
  assert.equal(ids.files.length, 0); assert.equal(ids.unsupported.length, 1)
})

test('oversized parsed candidate expansion rejects instead of truncating', () => {
  assert.throws(() => extract({ file_url: Array.from({ length: 2001 }, (_, i) => `/files/${i}.pdf`) }), { code: 'IMPORT_TOO_MANY_ITEMS' })
})

test('nested material arrays are explicit unsupported, never recursively discovered', () => {
  const result = extract({ inputs: { nested: [[{ type: 'document', transfer_method: 'remote_url', url: '/files/a.txt' }]] } })
  assert.equal(result.files.length, 0); assert.equal(result.unsupported.length, 1)
})

for (const key of ['data', 'outputs']) for (const location of ['outputs', 'response.outputs', 'response.data.outputs', 'output.data.outputs'])
  for (const encoded of [false, true]) for (const array of [false, true])
    test(`named ${key} file at ${location} (${encoded ? 'JSON' : 'object'}, ${array ? 'array' : 'single'}) is not a wrapper`, () => {
      const file = { type: 'image', transfer_method: 'tool_file', filename: 'result.webp', url: '/files/tools/result.webp' }
      let value = { [key]: array ? [file] : file }
      const path = location.split('.'), root = path.shift()
      for (const part of path.reverse()) value = { [part]: value }
      const result = extract({ [root]: encoded ? JSON.stringify(value) : value })
      assert.deepEqual(result.files.map(v => [v.role, v.inputField, v.fileName, v.url]),
        [['output', null, 'result.webp', origin + '/files/tools/result.webp']])
      assert.deepEqual(result.unsupported, [])
    })

for (const key of ['data', 'outputs']) for (const invalid of [
  { type: 'unknown' }, { transfer_method: 'unknown' }, { url: 'https://evil.example/files/a.pdf' },
]) test(`invalid named ${key} file is explicitly unsupported: ${JSON.stringify(invalid)}`, () => {
  const result = extract({ outputs: { [key]: { type: 'document', transfer_method: 'tool_file', url: '/files/a.pdf', ...invalid } } })
  assert.equal(result.files.length, 0); assert.equal(result.unsupported.length, 1)
})

test('terminal data object cannot open an extra wrapper discovery level', () => {
  const result = extract({ outputs: { data: { file_output: [{ url: '/files/hidden.pdf' }] } } })
  assert.equal(result.files.length, 0); assert.equal(result.unsupported.length, 1)
})

test('an explicitly marked response data file is not mistaken for an envelope', () => {
  const result = extract({ response: { data: { type: 'document', transfer_method: 'remote_url', url: '/files/a.pdf' },
    file_output: [{ url: '/files/outer.pdf' }] } })
  assert.deepEqual(result.files.map(v => v.fileName).sort(), ['a.pdf', 'outer.pdf'])
  assert.deepEqual(result.unsupported, [])
})

for (const key of ['type', 'transfer_method']) for (const location of ['outputs', 'data'])
  test(`a ${location} wrapper's scalar ${key} field cannot conceal its file outputs`, () => {
    const outputs = { generated: { type: 'document', transfer_method: 'tool_file', url: '/files/a.pdf' } }
    const response = location === 'outputs' ? { outputs: { [key]: 'summary', ...outputs } }
      : { data: { [key]: 'summary', outputs } }
    const result = extract({ response })
    assert.deepEqual(result.files.map(v => v.fileName), ['a.pdf'])
    assert.deepEqual(result.unsupported, [])
  })

for (const file of [
  { type: 'image', url: '/files/a.png' }, { transfer_method: 'tool_file', url: '/files/a.png' },
  { type: 'unknown', transfer_method: 'unknown' },
]) test(`incomplete explicit data file is unsupported rather than an empty envelope: ${JSON.stringify(file)}`, () => {
  const result = extract({ response: { data: file } })
  assert.equal(result.files.length, 0); assert.equal(result.unsupported.length, 1)
})

for (const location of ['outputs', 'data']) test(`known ${location} container with both scalar marker names retains its output fields`, () => {
  const outputs = { generated: { type: 'document', transfer_method: 'tool_file', url: '/files/a.pdf' } }
  const markers = { type: 'summary', transfer_method: 'description' }
  const response = location === 'outputs' ? { outputs: { ...markers, ...outputs } } : { data: { ...markers, outputs } }
  const result = extract({ response })
  assert.deepEqual(result.files.map(v => v.fileName), ['a.pdf'])
  assert.deepEqual(result.unsupported, [])
})

test('a known data attachment collection survives scalar fields named like file markers', () => {
  const result = extract({ response: { data: { type: 'summary', transfer_method: 'description',
    file_output: [{ url: '/files/a.pdf', filename: 'named.pdf' }] } } })
  assert.deepEqual(result.files.map(v => v.fileName), ['named.pdf'])
  assert.deepEqual(result.unsupported, [])
})

test('a named data file duplicate retains explicit sibling attachment metadata', () => {
  const result = extract({ response: { file_output: [{ url: '/files/a.pdf', filename: 'named.pdf', size: 3 }],
    data: { outputs: { data: { type: 'document', transfer_method: 'tool_file', url: '/files/a.pdf' } } } } })
  assert.deepEqual(result.files.map(v => [v.fileName, v.size]), [['named.pdf', 3]])
  assert.deepEqual(result.unsupported, [])
})

test('a named data file cannot conceal a same-address metadata conflict', () => {
  const result = extract({ response: { file_output: [{ url: '/files/a.pdf', filename: 'one.pdf' }],
    data: { outputs: { data: { type: 'document', transfer_method: 'tool_file', url: '/files/a.pdf', filename: 'two.pdf' } } } } })
  assert.equal(result.files.length, 0); assert.equal(result.unsupported.length, 1)
})

test('conflicting explicit metadata for the same file cannot leave a downloadable ambiguous first entry', () => {
  const result = extract({ file_output: [{ url: '/files/a.txt', filename: 'one.txt' }, { url: '/files/a.txt', filename: 'two.txt' }] })
  assert.equal(result.files.length, 0)
  assert.ok(result.unsupported.length > 0)
})

test('website content_type alias is retained as part of attachment metadata', () => {
  const result = extract({ file_output: [{ url: '/files/a.pdf', content_type: 'application/pdf' }] })
  assert.equal(result.files[0].mimeType, 'application/pdf')
})

test('a generic duplicate URL does not discard metadata of an explicit file_output', () => {
  const result = extract({ file_output: [{ download_url: '/files/a.txt', filename: 'named.txt', size: 3 }], file_url: ['/files/a.txt'] })
  assert.deepEqual(result.files.map(v => [v.fileName, v.size]), [['named.txt', 3]])
  assert.deepEqual(result.unsupported, [])
})

test('long field provenance is explicitly unsupported rather than causing a later RPC schema failure', () => {
  const result = extract({ inputs: { ['x'.repeat(2001)]: { type: 'document', transfer_method: 'remote_url', url: '/files/a.txt' } } })
  assert.equal(result.files.length, 0); assert.equal(result.unsupported.length, 1)
  assert.equal(result.unsupported[0].inputField, null)
})

for (const [label, extra] of [
  ['empty download_url', { download_url: '' }],
  ['null own URL', { url: null, file_url: '/files/report.pdf' }],
  ['empty filename', { filename: '', name: 'report.pdf' }],
  ['blank filename', { filename: '  ', fileName: 'report.pdf' }],
  ['empty MIME', { mime_type: '', content_type: 'application/pdf' }],
]) test(`empty alias cannot hide valid attachment metadata: ${label}`, () => {
  const result = extract({ file_output: [{ url: '/files/report.pdf', filename: 'report.pdf', ...extra }] })
  assert.deepEqual(result.files.map(v => [v.url, v.fileName]), [[origin + '/files/report.pdf', 'report.pdf']])
  assert.deepEqual(result.unsupported, [])
  if (label === 'empty MIME') assert.equal(result.files[0].mimeType, 'application/pdf')
})

test('missing preferred collection aliases do not hide populated camel-case fields', () => {
  const result = extract({ file_url: null, fileUrl: '/files/report.pdf', file_output: null,
    fileOutput: [{ download_url: null, downloadUrl: '/files/report.pdf', filename: null, name: 'report.pdf', size: null, file_size: 0 }] })
  assert.deepEqual(result.files.map(v => [v.fileName, v.size]), [['report.pdf', 0]])
  assert.deepEqual(result.unsupported, [])
})

test('nonempty unsafe aliases cannot fall through to a safer URL or filename', () => {
  const result = extract({ file_output: [
    { download_url: 'https://evil.example/files/report.pdf', url: '/files/report.pdf' },
    { url: '/files/report.pdf', filename: '../escape.pdf', name: 'report.pdf' },
    { url: 42, file_url: '/files/report.pdf' },
  ] })
  assert.equal(result.files.length, 0); assert.equal(result.unsupported.length, 3)
})

for (const encoded of [false, true]) test(`known wrapper levels retain sibling attachments (${encoded ? 'JSON' : 'object'})`, () => {
  const response = { file_output: [{ url: '/files/outer.pdf' }],
    outputs: { file_output: [{ url: '/files/direct.pdf' }] },
    data: { file_output: [{ url: '/files/middle.pdf' }], outputs: { file_output: [{ url: '/files/inner.pdf' }] } } }
  const result = extract({ response: encoded ? JSON.stringify(response) : response })
  assert.deepEqual(result.files.map(v => v.fileName).sort(), ['direct.pdf', 'inner.pdf', 'middle.pdf', 'outer.pdf'])
  assert.deepEqual(result.unsupported, [])
})

test('wrapper duplicates share identity without losing metadata or allowing conflicts', () => {
  const result = extract({ response: { file_output: [{ url: '/files/report.pdf', filename: 'named.pdf', size: 3 }],
    data: { outputs: { file_url: '/files/report.pdf' } } } })
  assert.deepEqual(result.files.map(v => [v.fileName, v.size]), [['named.pdf', 3]])
  assert.deepEqual(result.unsupported, [])
  const conflict = extract({ response: { file_output: [{ url: '/files/report.pdf', filename: 'one.pdf' }],
    data: { outputs: { file_output: [{ url: '/files/report.pdf', filename: 'two.pdf' }] } } } })
  assert.equal(conflict.files.length, 0); assert.equal(conflict.unsupported.length, 1)
})

for (const type of ['document', 'image', 'audio', 'video']) test(`typed tool_file output is not governed by input remote_url rules: ${type}`, () => {
  const result = extract({ response: { data: { outputs: { generated: [{ type, transfer_method: 'tool_file',
    filename: 'result.bin', url: '/files/tools/result.bin' }] } } } })
  assert.deepEqual(result.files.map(v => [v.role, v.inputField, v.fileName, v.url]), [['output', null, 'result.bin', origin + '/files/tools/result.bin']])
  assert.deepEqual(result.unsupported, [])
})

test('output compatibility does not open input tool_file, IDs, foreign URLs or unknown transfers', () => {
  const result = extract({ inputs: { material: { type: 'document', transfer_method: 'tool_file', url: '/files/a.pdf' } },
    outputs: { generated: [
      { type: 'document', transfer_method: 'tool_file', upload_file_id: 'opaque' },
      { type: 'document', transfer_method: 'tool_file', url: 'https://evil.example/files/a.pdf' },
      { type: 'document', transfer_method: 'unknown', url: '/files/a.pdf' },
    ] } })
  assert.equal(result.files.length, 0); assert.equal(result.unsupported.length, 4)
})

test('output traversal neither scans arbitrary wrappers nor reclassifies echoed inputs as outputs', () => {
  const result = extract({ inputs: { material: { type: 'document', transfer_method: 'remote_url', url: '/files/input.pdf' } },
    response: { data: { outputs: { inputs: { material: { type: 'document', transfer_method: 'remote_url', url: '/files/input.pdf' } },
      unknown: { deeper: { file_output: [{ url: '/files/hidden.pdf' }] } }, answer: '/files/prose.pdf' } } } })
  assert.deepEqual(result.files.map(v => [v.role, v.fileName]), [['input', 'input.pdf']])
  assert.equal(result.unsupported.length, 1)
})

for (const response of [
  { data: [{ type: 'document', transfer_method: 'remote_url', url: '/files/hidden.pdf' }] },
  { outputs: [{ type: 'document', transfer_method: 'tool_file', url: '/files/hidden.pdf' }] },
  { outputs: { data: { file_output: [{ url: '/files/hidden.pdf' }] } } },
]) test(`unrecognized wrapper shape is explicitly unsupported: ${JSON.stringify(response)}`, () => {
  const result = extract({ response })
  assert.equal(result.files.length, 0); assert.equal(result.unsupported.length, 1)
})
