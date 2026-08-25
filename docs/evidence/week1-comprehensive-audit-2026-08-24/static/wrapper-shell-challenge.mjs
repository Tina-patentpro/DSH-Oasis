import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const temporaryRoot = await mkdtemp(join(tmpdir(), 'oasis-audit-wrapper-'))
const fakeDsh = join(temporaryRoot, 'dsh.cmd')
const marker = join(temporaryRoot, 'injected.txt')
await writeFile(fakeDsh, '@echo off\r\necho FAKE_DSH:%*\r\n', 'utf8')

const argument = `safe&echo OASIS_INJECTED>${marker}`
const result = await new Promise((done) => {
  const child = spawn(process.execPath, [resolve('scripts/dsh-isolated.mjs'), '--home', join(temporaryRoot, 'home'), argument], {
    cwd: process.cwd(),
    env: { ...process.env, DSH_BIN: fakeDsh },
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk) => { stdout += chunk })
  child.stderr.on('data', (chunk) => { stderr += chunk })
  child.on('close', (code, signal) => done({ code, signal, stdout, stderr }))
})

let injected = false
try {
  const value = await import('node:fs/promises').then(({ readFile }) => readFile(marker, 'utf8'))
  injected = value.includes('OASIS_INJECTED')
} catch {}

console.log(JSON.stringify({ ...result, injected }, null, 2))
await rm(temporaryRoot, { recursive: true, force: true })
