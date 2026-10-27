// Exact bounded lease delta; frozen v2/v3 converters and byte identities remain.
import {readFileSync} from 'node:fs'
import {nativeCheckpoint3Source,patchConversationDraftCheckpoint3} from './conversation-draft-checkpoint-3.mjs'
export function nativeCheckpoint4Source() {
  const original=nativeCheckpoint3Source(),anchor='export function bindDraftCheckpoint('
  if(original.split(anchor).length!==2)throw Error('checkpoint v4 binder anchor mismatch')
  const lease=readFileSync(new URL('./draft-checkpoint-lease.mjs',import.meta.url),'utf8')
  return original.replace("draft-checkpoint-3'","draft-checkpoint-4'")
    .replace(anchor,'function bindUnleasedDraftCheckpoint(')
    +'\n'+lease+'\nexport const bindDraftCheckpoint = createLeasedDraftCheckpoint(bindUnleasedDraftCheckpoint)\n'
}
export function patchConversationDraftCheckpoint4(original) {
  const patched=patchConversationDraftCheckpoint3(original),before=nativeCheckpoint3Source().replace(/^export /gm,''),after=nativeCheckpoint4Source().replace(/^export /gm,'')
  if(patched.split(before).length!==2)throw Error('checkpoint v4 helper mismatch')
  return patched.replace(before,after)
}
