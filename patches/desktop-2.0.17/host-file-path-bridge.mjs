import { readFileSync } from 'node:fs'

export const name = 'desktop-host-file-path-bridge'
export const inject = ['webServer']
const bootstrap = readFileSync(new URL('./host-file-path-bridge.js', import.meta.url), 'utf8')

export function apply(ctx) {
  ctx.on('webserver/index-inject', table => {
    table.push({ kind: 'script', placement: 'head', text: bootstrap })
  })
}
