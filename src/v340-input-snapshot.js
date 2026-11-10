import { V340_LIMITS } from './v340-runtime-contract.js'
import { prepareV340Inputs } from './v340-document.js'
import { canonicalJson } from './local-mock-runner.js'
import { v340Hash } from './v340-catalog.js'

// Keep existing small snapshots byte-compatible. Large preparations contain the
// same file in values, upstream.body and upstream.snapshot; retain its bytes once.
export function captureV340InputSnapshot(snapshot){
  if(Buffer.byteLength(JSON.stringify(snapshot))<=V340_LIMITS.snapshotBytes)return snapshot
  return {...snapshot,preparedEncoding:'values-v1',prepared:{values:structuredClone(snapshot.prepared.values),sha256:v340Hash(canonicalJson(snapshot.prepared))}}
}

// Reconstruct only from frozen input, never from the current project files.
// Historical untagged preparations still undergo their original full comparison.
export function restoreV340Prepared(snapshot){
  if(snapshot.preparedEncoding===undefined)return snapshot.prepared
  if(snapshot.preparedEncoding!=='values-v1'||!snapshot.prepared||Object.keys(snapshot.prepared).length!==2
    ||!Object.hasOwn(snapshot.prepared,'values')||!Object.hasOwn(snapshot.prepared,'sha256'))throw Error('V340 prepared encoding mismatch')
  const prepared=prepareV340Inputs(snapshot.nodeId,snapshot.prepared.values)
  if(canonicalJson(prepared.values)!==canonicalJson(snapshot.prepared.values))throw Error('V340 prepared values integrity mismatch')
  if(v340Hash(canonicalJson(prepared))!==snapshot.prepared.sha256)throw Error('V340 prepared digest integrity mismatch')
  return prepared
}
