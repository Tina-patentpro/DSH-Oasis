import { mkdir, realpath, open, lstat } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const failure = (code, message, cause) => Object.assign(new Error(message, { cause }), { code })

// Only ownership metadata is SQLite. All domain data remains with the original JSON backend.
export async function acquireJsonRootOwnership(root) {
  if (typeof root !== 'string' || !isAbsolute(root)) throw new TypeError('JSON storage root must be absolute')
  await mkdir(root, { recursive: true, mode: 0o700 })
  const canonicalRoot = await realpath(root)
  const path = join(canonicalRoot, '.dsh-json-single-owner.sqlite')
  try { const file = await open(path, 'wx', 0o600); await file.close() }
  catch (error) { if (error.code !== 'EEXIST') throw error }
  const before = await lstat(path)
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) {
    throw failure('DSH_STORAGE_ROOT_UNSAFE', 'Storage ownership metadata is not a private regular file')
  }
  let db
  try {
    db = new DatabaseSync(path, { timeout: 0, enableForeignKeyConstraints: false })
    db.exec('BEGIN EXCLUSIVE')
    const after = await lstat(path)
    if (!after.isFile() || after.nlink !== 1 || before.dev !== after.dev || before.ino !== after.ino) {
      throw failure('DSH_STORAGE_ROOT_UNSAFE', 'Storage ownership metadata changed while opening')
    }
  } catch (error) {
    db?.close()
    if (error.errcode === 5 || error.errcode === 6) {
      throw failure('DSH_STORAGE_ROOT_BUSY', 'Another Host owns this JSON storage root; no storage backend was opened', error)
    }
    throw error
  }
  let released = false
  return Object.freeze({
    root: canonicalRoot,
    release() {
      if (released) return
      // Closing the connection rolls back the transaction and releases OS locks.
      db.close()
      released = true
    },
  })
}
