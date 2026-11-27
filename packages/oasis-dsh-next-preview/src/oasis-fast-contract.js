import { createHash } from 'node:crypto'
import { canonicalJson } from './local-mock-runner.js'

export const FAST_SERVICE = Object.freeze({ id: 39, name: '权利要求书生成-Fast' })
// Reviewed 2026-09-27 website metadata: price is checked per confirmation, not pinned forever.
const CONTRACT_SHA256 = '4adaf95b2e1579bf495eb9ff79966a5ae6404cd0ee89f79dde352fd97a929303'

export function matchesReleasedFastContract(detail) {
  // Normalization omits unknown constraints: do not silently accept a new required/validation contract.
  const keys = ['type', 'cn_name', 'content', 'en_name']
  for (const schema of [detail.raw?.input_schema, detail.raw?.output_schema]) {
    if (!Array.isArray(schema) || schema.some(field => !field || typeof field !== 'object'
      || Object.keys(field).some(key => !keys.includes(key)))) return false
  }
  const contract = { id: detail.id, name: detail.name, apiType: detail.apiType, price: 0,
    modelName: detail.modelName, executionMode: detail.executionMode,
    inputFields: detail.inputFields, outputFields: detail.outputFields }
  return createHash('sha256').update(canonicalJson(contract), 'utf8').digest('hex') === CONTRACT_SHA256
}
