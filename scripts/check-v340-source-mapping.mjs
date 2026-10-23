import { createHash } from 'node:crypto'
import { lstat, realpath, open } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolve, relative, isAbsolute, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

// One frozen B-batch evidence snapshot, not a production router or a generic schema registry.
// Only built-ins are imported; resource files and their instructions are never executed.
const ROOT = fileURLToPath(new URL('../', import.meta.url))
const P = 'packages/oasis-professional-service/'
const PACK = P + 'src/v340-contracts.json'
const LEGACY = P + 'src/builtin-skills/flow-2-6/0.2.2/'
const DATE = '2026-10-23'
const EVIDENCE = [
  ['business', 'docs/business-baseline/14节点清单V3.4.0.md', 'a0de1ecd22a74b72c236bc9dc73b71f0e48b2c88fdda0eef35b3b231bd6d10d6', 'static-original', 'V3.4.0-business-original'],
  ['pack', PACK, '6858c8edee9de850d60e927a9fdc8bd3bfbfe4a8785ee50c79fd62337787e761', 'static-resource', 'V3.4.0-fixed-host-pack'],
  ['catalog', P + 'src/v340-catalog.js', 'e8d45a8984b1909b303fce0ef9c2bb879744dd2de56710c8f46cb708435217cb', 'static-code', 'assembly-order-and-disabled-sources'],
  ['legacy-manifest', LEGACY + 'manifest.json', 'f81d427db60ab671dcd552a24794f68c1a323d2dd1b440510bb26f9bfe23d706', 'historical-resource', 'legacy-only-not-V3.4.0'],
  ['legacy-loader', P + 'src/builtin-skill-loader.js', 'f60f09dc80c54b52f1178ffa117e9493dd20c1414acbbac5b530bb248aa9e94e', 'static-code', 'legacy-loader-only'],
  ['api-baseline', P + 'docs/api/oasis-professional-service-baseline.json', '01051469cfb66bf829e4fb18ac71a80f7401444ec89b5fbfe1c92b366fa0b6a8', 'historical-contract', 'legacy-endpoints-only-no-node-binding'],
  ['api-contract', P + 'src/oasis-api-contract.js', '8b56d9374c508304bef84d6f2bf5b7257b633230af5a118532e8e031653f785f', 'static-code', 'legacy-normalization-not-deployment'],
  ['workspace-binding', P + 'src/oasis-workspace-binding.js', '1c848580a357c6e705fb5746d7898c85459cbba4fc97e9077c1709957ae506bf', 'static-code', 'binding-requirements-not-actual-account'],
].map(([id, path, sha256, evidenceKind, scope]) => ({ id, path, sha256, checkedAt: DATE, evidenceKind, scope }))
const LOCAL_GAPS = ['LOCAL_ADAPTER_UNWIRED', 'LOCAL_REAL_CALL_UNVERIFIED']
const API_GAPS = ['API_SERVICE_COORDINATES_MISSING', 'API_SCHEMA_MISSING', 'API_INPUT_MAPPING_UNVERIFIED',
  'API_RESULT_BODY_UNVERIFIED', 'API_PROJECT_ACCOUNT_BINDING_MISSING', 'API_REAL_CALL_UNVERIFIED']
const GLOBAL_GAPS = ['NON_TEXT_EXTRACTION_UNVERIFIED', 'CURRENT_DESKTOP_UNVERIFIED']
const hash = value => createHash('sha256').update(value).digest('hex')
function fail(code) { throw Object.assign(new Error(code), { code }) }
function same(actual, expected) {
  if (!isDeepStrictEqual(actual, expected)) fail('MAPPING_INVALID')
}
function parse(bytes) {
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) }
  catch { fail('MAPPING_INVALID') }
}

const READ_LIMIT = 2 * 1024 * 1024
const READ_ERRORS = ['MAPPING_INVALID', 'MAPPING_PATH', 'MAPPING_RESOURCE_DRIFT', 'MAPPING_READ_UNSUPPORTED']
function sameIdentity(actual, admitted, directory) {
  if (actual.isSymbolicLink() || (directory ? !actual.isDirectory() : !actual.isFile())
    || actual.dev !== admitted.dev || actual.ino !== admitted.ino) fail('MAPPING_PATH')
}
async function readInside(root, name, rootIdentity) {
  if (typeof name !== 'string' || !name || name.includes('\0')) fail('MAPPING_PATH')
  const target = resolve(root, name)
  const rel = relative(root, target)
  if (!rel || rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) fail('MAPPING_PATH')
  let cursor = root
  sameIdentity(await lstat(root, { bigint: true }), rootIdentity, true)
  const checked = [{ path: root, stat: rootIdentity }]
  const parts = rel.split(sep)
  for (const [index, part] of parts.entries()) {
    cursor = resolve(cursor, part)
    const stat = await lstat(cursor, { bigint: true })
    if (stat.isSymbolicLink() || (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) fail('MAPPING_PATH')
    checked.push({ path: cursor, stat })
  }
  const handles = []
  try {
    let file
    const flags = constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
    if (process.platform === 'darwin') {
      // Darwin sys/fcntl.h: O_NOFOLLOW_ANY=0x20000000. Node 24 does not export it.
      // The kernel rejects symlinks in EVERY component, including a concurrently replaced parent.
      // Darwin rejects combining O_NOFOLLOW and O_NOFOLLOW_ANY; the latter includes the final file.
      file = await open(target, constants.O_RDONLY | constants.O_NONBLOCK | 0x20000000)
      handles.push(file)
    } else if (process.platform === 'linux') {
      // Anchor each component to an already-open directory; do not re-resolve a mutable parent path.
      let directory = await open(root, flags | constants.O_DIRECTORY)
      handles.push(directory)
      sameIdentity(await directory.stat({ bigint: true }), rootIdentity, true)
      for (const [index, part] of parts.entries()) {
        const isDirectory = index < parts.length - 1
        const next = await open(`/proc/self/fd/${directory.fd}/${part}`, flags | (isDirectory ? constants.O_DIRECTORY : 0))
        handles.push(next)
        sameIdentity(await next.stat({ bigint: true }), checked[index + 1].stat, isDirectory)
        if (isDirectory) directory = next
        else file = next
      }
    } else {
      // No path-only fallback when a platform cannot enforce the read boundary.
      fail('MAPPING_READ_UNSUPPORTED')
    }
    const admitted = checked.at(-1).stat
    const stat = await file.stat({ bigint: true })
    sameIdentity(stat, admitted, false)
    if (stat.size > BigInt(READ_LIMIT)) fail('MAPPING_INVALID')
    // Reject directory/file replacement after open, before any content is read.
    for (const [index, item] of checked.entries()) {
      sameIdentity(await lstat(item.path, { bigint: true }), item.stat, index < checked.length - 1)
    }
    // Bound the actual read too: a growing file must not bypass the stat-size guard.
    const chunks = []
    let length = 0
    while (length <= READ_LIMIT) {
      const buffer = Buffer.allocUnsafe(Math.min(65536, READ_LIMIT + 1 - length))
      const { bytesRead } = await file.read(buffer, 0, buffer.length, length)
      if (!bytesRead) break
      length += bytesRead
      if (length > READ_LIMIT) fail('MAPPING_INVALID')
      chunks.push(buffer.subarray(0, bytesRead))
    }
    const after = await file.stat({ bigint: true })
    if (after.size !== stat.size || after.mtimeNs !== stat.mtimeNs || after.ctimeNs !== stat.ctimeNs
      || BigInt(length) !== stat.size) fail('MAPPING_RESOURCE_DRIFT')
    return Buffer.concat(chunks, length)
  } finally {
    const closed = await Promise.allSettled(handles.reverse().map(handle => handle.close()))
    if (closed.some(result => result.status === 'rejected')) fail('MAPPING_INVALID')
  }
}

export async function verifyV340SourceMapping({ manifestPath, repoRoot = ROOT } = {}) {
  try {
    const root = resolve(repoRoot instanceof URL ? fileURLToPath(repoRoot) : repoRoot)
    if (await realpath(root) !== root) fail('MAPPING_PATH')
    const rootIdentity = await lstat(root, { bigint: true })
    if (rootIdentity.isSymbolicLink() || !rootIdentity.isDirectory()) fail('MAPPING_PATH')
    if (typeof manifestPath !== 'string') fail('MAPPING_PATH')
    const manifestRel = relative(root, resolve(root, manifestPath)).split(sep).join('/')
    // Restrict the entry file as well as resource reads. Never parse Profile/credential files
    // merely because a caller supplied their path. The other two forms are disposable test copies.
    if (manifestRel !== 'docs/business-baseline/v340-source-mapping.json' && manifestRel !== 'mapping.json'
      && !/^\.local\/v340-mapping-test-[a-zA-Z0-9]+\/(mapping|linked)\.json$/.test(manifestRel)) fail('MAPPING_PATH')
    const manifest = parse(await readInside(root, manifestPath, rootIdentity))
    const files = new Map()
    // Manifest-supplied resource paths are never read. Only these fixed evidence paths are.
    for (const e of EVIDENCE) {
      const bytes = await readInside(root, e.path, rootIdentity)
      if (hash(bytes) !== e.sha256) fail('MAPPING_RESOURCE_DRIFT')
      files.set(e.id, bytes)
    }
    const pack = parse(files.get('pack'))
    const old = parse(files.get('legacy-manifest'))
    const resources = []
    for (const entry of old.resources) {
      const path = LEGACY + entry.path
      if (hash(await readInside(root, path, rootIdentity)) !== entry.sha256) fail('MAPPING_RESOURCE_DRIFT')
      resources.push({ path, role: entry.role, sha256: entry.sha256 })
    }
    const legacyReference = Object.fromEntries(['skillId', 'skillVersion', 'inputSchemaVersion',
      'outputSchemaVersion', 'executionContractVersion'].map(k => [k, old[k]]))
    Object.assign(legacyReference, { appliesToV340: false, manifestEvidenceId: 'legacy-manifest', resources })
    const nodes = pack.nodes.map(n => {
      const pieces = [['common', pack.common], ['nodes.' + n.nodeId + '.instruction', n.instruction], ['tables', pack.tables]]
      return {
        ...Object.fromEntries(['nodeId', 'title', 'upstreamNodeId', 'filenamePrefix', 'inputs'].map(k => [k, n[k]])),
        local: {
          sourceId: 'local-skill', enabled: false, realCallVerified: false, status: 'STATIC_ONLY',
          resources: pieces.map(([selector, body]) => ({ path: PACK, selector, sha256: hash(body) })),
          assembledSHA256: hash(pieces.map(([, body]) => body).join('\n\n')),
          inputSchemaSHA256: hash(JSON.stringify(n.inputs)), resultContract: 'host-cumulative-markdown-T1-T6-provenance',
          evidenceIds: ['business', 'pack', 'catalog'], gaps: LOCAL_GAPS,
        },
        api: {
          sourceId: 'oasis-api', enabled: false, realCallVerified: false, status: 'BLOCKED',
          serviceId: null, method: null, path: null,
          inputMapping: n.inputs.map(i => ({ inputId: i.id, apiField: null, required: null, transform: null })),
          resultMapping: { resultType: null, bodyField: null, urlField: null, bodyDelivered: false },
          schemaSHA256: null, projectAccountEvidence: null,
          evidenceIds: ['api-baseline', 'api-contract', 'workspace-binding'], gaps: API_GAPS,
        },
      }
    })
    // Exact frozen semantics reject unknown readiness fields and keep missing API coordinates null.
    // This intentionally does not certify a future populated mapping; that requires new evidence/review.
    same(manifest, {
      schemaVersion: 1, businessVersion: pack.businessVersion, sourceSHA256: pack.sourceSHA256,
      resourceSHA256: EVIDENCE[1].sha256, checkedAt: DATE, dispatchEnabled: false, realCallVerified: false,
      evidence: EVIDENCE, legacyReference, gaps: GLOBAL_GAPS, nodes,
    })
    const gaps = [
      ...GLOBAL_GAPS.map(code => ({ nodeId: null, sourceId: null, code })),
      ...nodes.flatMap(n => ['local', 'api'].flatMap(s => n[s].gaps.map(code => ({ nodeId: n.nodeId, sourceId: n[s].sourceId, code })))),
    ]
    return { businessVersion: pack.businessVersion, nodeCount: nodes.length, sourceCellCount: nodes.length * 2,
      gaps, dispatchEnabled: false, realCallVerified: false }
  } catch (error) {
    if (READ_ERRORS.includes(error.code)) throw error
    if (['ELOOP', 'ENOTDIR'].includes(error.code)) fail('MAPPING_PATH')
    if (error.code === 'ENOENT') fail('MAPPING_RESOURCE_DRIFT')
    fail('MAPPING_INVALID')
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== '--manifest') fail('MAPPING_INVALID')
    const result = await verifyV340SourceMapping({ manifestPath: process.argv[3] })
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  } catch (error) {
    process.stderr.write((READ_ERRORS.includes(error.code) ? error.code : 'MAPPING_INVALID') + '\n')
    process.exitCode = 1
  }
}
