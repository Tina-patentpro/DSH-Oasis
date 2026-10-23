// Child-process scheduling probe: real copied files and real filesystem reads, no production hooks.
import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { resolve, dirname, relative, basename } from 'node:path'
import { pathToFileURL } from 'node:url'

const [root, mode] = process.argv.slice(2)
const raw = { ...fs.promises }
const manifest = JSON.parse(await raw.readFile(resolve(root, 'docs/business-baseline/v340-source-mapping.json')))
const manifestPath = 'docs/business-baseline/v340-source-mapping.json'
const target = resolve(root, mode.startsWith('manifest-') ? manifestPath : manifest.legacyReference.resources.at(-1).path)
const parent = dirname(target)
const outside = resolve(dirname(root), 'outside')
await raw.mkdir(outside)
await raw.copyFile(target, resolve(outside, basename(target)))
let changed = false
let restored = false
let reads = 0
let readBytes = 0
let targetReadBytes = 0
let opened = 0
let closed = 0
let leakedBeforeCleanup = 0
const openedOutside = []
const readOutside = []
const handles = new Set()

async function change() {
  if (changed) return
  changed = true
  if (mode.endsWith('file-copy')) {
    await raw.rename(target, target + '-retained')
    await raw.copyFile(target + '-retained', target)
  } else if (mode.endsWith('directory-copy')) {
    await raw.rename(parent, parent + '-retained')
    await raw.mkdir(parent)
    await raw.copyFile(resolve(parent + '-retained', basename(target)), target)
  } else if (mode.endsWith('final-link')) {
    await raw.rename(target, target + '-retained')
    await raw.symlink(resolve(outside, basename(target)), target)
  } else {
    await raw.rename(parent, parent + '-retained')
    await raw.symlink(outside, parent, 'dir')
  }
}
async function restoreParent() {
  await raw.rm(parent)
  await raw.rename(parent + '-retained', parent)
  restored = true
}
fs.promises.lstat = async function(path, ...args) {
  const stat = await raw.lstat(path, ...args)
  if (path === target && /^(resource|manifest)-/.test(mode) && !changed) await change()
  return stat
}
fs.promises.open = async function(path, ...args) {
  const physical = await raw.realpath(path)
  const isTarget = physical === target || physical === resolve(outside, basename(target))
  let file
  try { file = await raw.open(path, ...args) }
  catch (error) {
    if (mode.endsWith('parent-aba') && changed && !restored) await restoreParent()
    throw error
  }
  opened++
  handles.add(file)
  const escaped = relative(root, physical).startsWith('..')
  if (escaped) openedOutside.push(physical)
  if (isTarget && mode.startsWith('after-open-') && !changed) await change()
  if (isTarget && mode.endsWith('parent-aba') && changed && !restored) await restoreParent()
  const oldRead = file.read.bind(file)
  const oldReadFile = file.readFile.bind(file)
  const oldStat = file.stat.bind(file)
  const oldClose = file.close.bind(file)
  file.stat = async (...statArgs) => {
    const value = await oldStat(...statArgs)
    if (isTarget && mode === 'growth-after-stat' && !changed) {
      changed = true
      await raw.appendFile(target, Buffer.alloc(2 * 1024 * 1024 + 1, 32))
    }
    return value
  }
  file.read = async (...readArgs) => {
    reads++
    if (escaped) readOutside.push(physical)
    const value = await oldRead(...readArgs)
    readBytes += value.bytesRead
    if (isTarget) targetReadBytes += value.bytesRead
    return value
  }
  file.readFile = async (...readArgs) => {
    reads++
    if (escaped) readOutside.push(physical)
    const value = await oldReadFile(...readArgs)
    readBytes += value.length
    if (isTarget) targetReadBytes += value.length
    return value
  }
  file.close = async () => {
    try { return await oldClose() }
    finally { closed++; handles.delete(file) }
  }
  return file
}
syncBuiltinESMExports()
if (mode === 'unsupported-platform') Object.defineProperty(process, 'platform', { value: 'unsupported', configurable: true })
let result
try {
  const { verifyV340SourceMapping } = await import(pathToFileURL(resolve(root, 'scripts/check-v340-source-mapping.mjs')))
  try { result = { accepted: true, value: await verifyV340SourceMapping({ repoRoot: root, manifestPath }) } }
  catch (error) { result = { accepted: false, code: error.code } }
} finally {
  fs.promises.lstat = raw.lstat
  fs.promises.open = raw.open
  syncBuiltinESMExports()
  // Preserve leak observations but clean up only the disposable child fixture.
  leakedBeforeCleanup = handles.size
  for (const file of handles) await file.close()
}
process.stdout.write(JSON.stringify({ ...result, changed, restored, openedOutside, readOutside, reads, readBytes, targetReadBytes, opened, closed, leakedBeforeCleanup }) + '\n')
