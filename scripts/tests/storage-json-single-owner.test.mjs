import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, symlink, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fork } from 'node:child_process'
import { once } from 'node:events'

const entry = new URL('../../patches/storage-json-single-owner/ownership.mjs', import.meta.url)
async function acquire(root) {
  const api = await import(entry).catch(error => {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url === entry.href) return {}
    throw error
  })
  assert.equal(typeof api.acquireJsonRootOwnership, 'function', 'root ownership guard must exist')
  return api.acquireJsonRootOwnership(root)
}
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-json-owner-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  return root
}
async function contender(t, root) {
  const child = fork(new URL('./fixtures/storage-json-owner-child.mjs', import.meta.url), [root], {
    execPath: process.execPath, execArgv: [], stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  })
  let stderr = ''; child.stderr.on('data', b => { stderr += b })
  const ended = once(child, 'close')
  t.after(async () => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); await ended })
  const message = await Promise.race([
    once(child, 'message').then(([message]) => message),
    ended.then(exit => { throw Error(`child exited before ownership response: ${exit}; ${stderr}`) }),
  ])
  return { child, message, ended }
}

test('a second independent process is refused while the first owns the same canonical root', async t => {
  const root = await fixture(t), owner = await acquire(root); t.after(() => owner.release())
  const next = await contender(t, root)
  assert.equal(next.message.acquired, false)
  assert.equal(next.message.code, 'DSH_STORAGE_ROOT_BUSY')
  assert.deepEqual(await next.ended, [0, null])
})

test('normal release permits a new process, without deleting ownership metadata', async t => {
  const root = await fixture(t), owner = await acquire(root)
  await owner.release(); await owner.release()
  const next = await contender(t, root)
  assert.equal(next.message.acquired, true)
  next.child.send('release'); assert.deepEqual(await next.ended, [0, null])
})

test('OS releases a killed owner and a new process can acquire without stale-PID removal', async t => {
  const root = await fixture(t), first = await contender(t, root)
  assert.equal(first.message.acquired, true)
  first.child.kill('SIGKILL'); assert.deepEqual(await first.ended, [null, 'SIGKILL'])
  const next = await contender(t, root); assert.equal(next.message.acquired, true)
  next.child.send('release'); await next.ended
})

test('a symlink alias of an owned root contends for that same owner', async t => {
  const root = await fixture(t), real = join(root, 'real'), alias = join(root, 'alias')
  await mkdir(real); await symlink(real, alias)
  const owner = await acquire(real); t.after(() => owner.release())
  const next = await contender(t, alias)
  assert.equal(next.message.acquired, false); assert.equal(next.message.code, 'DSH_STORAGE_ROOT_BUSY')
})

test('independent roots can be owned concurrently', async t => {
  const root = await fixture(t), owner = await acquire(join(root, 'a')); t.after(() => owner.release())
  const next = await contender(t, join(root, 'b')); assert.equal(next.message.acquired, true)
  next.child.send('release'); await next.ended
})

test('foreign or symlink metadata fails closed and its target bytes are preserved', async t => {
  const root = await fixture(t), target = join(root, 'public-keep.txt'), metadata = join(root, '.dsh-json-single-owner.sqlite')
  await writeFile(target, 'DO NOT REPLACE')
  await symlink(target, metadata)
  await assert.rejects(() => acquire(root), { code: 'DSH_STORAGE_ROOT_UNSAFE' })
  assert.equal(await readFile(target, 'utf8'), 'DO NOT REPLACE')
})

test('a non-SQLite pre-existing metadata file is not truncated or replaced', async t => {
  const root = await fixture(t), metadata = join(root, '.dsh-json-single-owner.sqlite')
  await writeFile(metadata, 'FOREIGN CONTENT PRESERVED')
  await assert.rejects(() => acquire(root))
  assert.equal(await readFile(metadata, 'utf8'), 'FOREIGN CONTENT PRESERVED')
})

test('ownership remains held until the delegated backend finishes draining writes', async t => {
  const root = await fixture(t)
  const { createSingleOwnerJsonBackend } = await import('../../patches/storage-json-single-owner/index.mjs')
  let finish
  class DrainingBackend { kv = { open() {} }; close() { return new Promise(resolve => { finish = resolve }) } }
  const backend = await createSingleOwnerJsonBackend(root, DrainingBackend)
  const closing = backend.close()
  const blocked = await contender(t, root)
  assert.equal(blocked.message.acquired, false)
  assert.equal(blocked.message.code, 'DSH_STORAGE_ROOT_BUSY')
  finish(); await closing
  const next = await contender(t, root); assert.equal(next.message.acquired, true)
  next.child.send('release'); await next.ended
})

test('backend construction failure releases ownership without opening a second data writer', async t => {
  const root = await fixture(t)
  const { createSingleOwnerJsonBackend } = await import('../../patches/storage-json-single-owner/index.mjs')
  class BrokenBackend { constructor() { throw Error('synthetic construction failure') } }
  await assert.rejects(() => createSingleOwnerJsonBackend(root, BrokenBackend), /synthetic construction/)
  const next = await contender(t, root); assert.equal(next.message.acquired, true)
  next.child.send('release'); await next.ended
})
