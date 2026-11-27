import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const pin = '6858c8edee9de850d60e927a9fdc8bd3bfbfe4a8785ee50c79fd62337787e761'
export const v340Hash = value => createHash('sha256').update(value).digest('hex')
export function freezeV340(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeV340)
    Object.freeze(value)
  }
  return value
}
export function verifyV340Pack(bytes) {
  if (v340Hash(bytes) !== pin) throw new Error('V340_RESOURCE_UNAVAILABLE')
  return freezeV340(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)))
}
// Fixed Host resource; never a user-selected path or a native agent Skill registration.
const pack = verifyV340Pack(readFileSync(new URL('./v340-contracts.json', import.meta.url)))
const sourceStatus = freezeV340({
  'local-skill': { enabled: false, reason: '新版原生模型接线及实际验收待完成' },
  'oasis-api': { enabled: false, reason: '逐节点实际字段/结果映射与账户项目绑定待核实' },
})
const nodes = freezeV340(pack.nodes.map(({ instruction, ...node }) => ({ ...node, sources: sourceStatus })))
export const getV340Catalog = () => freezeV340({ businessVersion: 'V3.4.0', sourceSHA256: pack.sourceSHA256,
  resourceSHA256: pin, capability: 'runtime-persistence-only', dispatchEnabled: false, nodes })
export function getV340Node(nodeId) {
  const found = nodes.find(node => node.nodeId === nodeId)
  if (!found) throw new Error('V340_NODE_UNAVAILABLE')
  return found
}
export async function loadV340Instruction(nodeId) {
  getV340Node(nodeId)
  const body = [pack.common, pack.nodes.find(node => node.nodeId === nodeId).instruction, pack.tables].join('\n\n')
  return freezeV340({ nodeId, version: 'V3.4.0', body, sha256: v340Hash(body), resourceSHA256: pin })
}
