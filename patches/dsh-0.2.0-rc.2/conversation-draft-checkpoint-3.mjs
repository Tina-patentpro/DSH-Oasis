// Bounded revision on the frozen v2 checkpoint. Old R7 sources/pins stay unchanged.
import {readFileSync}from'node:fs'
import {createHash}from'node:crypto'
import {patchConversationDraftCheckpoint}from'./conversation-draft-checkpoint.mjs'
const frozenV2='11eb0016a2fe5242a9d5156e82ff2d09ade95f28d832b4e3670b8456d3e5f6f2'
function source2(){const source=readFileSync(new URL('./draft-checkpoint.mjs',import.meta.url),'utf8');if(createHash('sha256').update(source).digest('hex')!==frozenV2)throw Error('frozen checkpoint v2 source mismatch');return source}
export function nativeCheckpoint3Source(){
 const original=source2(),anchor='  function persist() {',before='if (loading) { changed = true; return }'
 if(original.split(anchor).length!==2||original.split(before).length!==2)throw Error('checkpoint v3 anchor mismatch')
 return original.replace("draft-checkpoint-1'","draft-checkpoint-3'")
  .replace(anchor,'  const initialFingerprint = fingerprint(initial)\n'+anchor)
  .replace(before,'if (loading) { if (fingerprint(shell.state.getSnapshot()) !== initialFingerprint) changed = true; return }')
}
export function patchConversationDraftCheckpoint3(original){
 const patched=patchConversationDraftCheckpoint(original),before=source2().replace(/^export /gm,''),after=nativeCheckpoint3Source().replace(/^export /gm,'')
 if(patched.split(before).length!==2)throw Error('checkpoint v3 embedded helper mismatch')
 return patched.replace(before,after)
}
