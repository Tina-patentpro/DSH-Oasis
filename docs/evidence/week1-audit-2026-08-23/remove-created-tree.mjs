import { lstat, realpath, rm } from 'node:fs/promises'
import { basename, resolve, sep } from 'node:path'

const [targetValue, allowedRootValue, expectedBasename] = process.argv.slice(2)
if (!targetValue || !allowedRootValue || !expectedBasename) {
  throw new Error('usage: node remove-created-tree.mjs <target> <allowed-root> <expected-basename>')
}

const target = resolve(targetValue)
const allowedRoot = resolve(allowedRootValue)
const targetStat = await lstat(target)
if (targetStat.isSymbolicLink()) throw new Error(`refusing symlink target: ${target}`)

const [targetReal, allowedRootReal] = await Promise.all([realpath(target), realpath(allowedRoot)])
if (basename(targetReal) !== expectedBasename) {
  throw new Error(`unexpected target basename: ${basename(targetReal)}`)
}
if (!targetReal.startsWith(`${allowedRootReal}${sep}`)) {
  throw new Error(`target is outside allowed root: ${targetReal}`)
}

console.log(JSON.stringify({ target: targetReal, allowedRoot: allowedRootReal, action: 'remove-created-tree' }))
await rm(targetReal, { recursive: true, force: false, maxRetries: 3 })
