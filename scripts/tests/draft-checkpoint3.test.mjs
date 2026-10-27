import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync}from'node:fs'
import {pathToFileURL}from'node:url'
import {Script}from'node:vm'
const api=await import('../../patches/dsh-0.2.0-rc.2/conversation-draft-checkpoint-3.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const stores=await import(pathToFileURL(process.cwd()+'/.local/test-runtimes/dsh-0.2.0-rc.2-639ed015/deepseek-harness-639ed015397290b3745d163aafe02ffee4aa3f84/packages/client/store/lib/index.js'))
async function recover(change){
 const source=api.nativeCheckpoint3Source(),m=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
 const initial={draft:'',draftRev:0,phase:'plain',occurrences:[],attachmentIds:[],queue:[]},state=stores.createSnapshotStore(initial);let release,restores=0;const gate=new Promise(resolve=>release=resolve),notices=[]
 const record={schemaVersion:1,workspaceId:'w',sessionId:'s',generation:'g',draft:'PUBLIC_KEPT',occurrences:[],attachments:[]}
 const handle=m.bindDraftCheckpoint({workspaceId:'w',sessionId:'s',shell:{state,notify:(level,message)=>notices.push(message),restoreCheckpoint(){restores++;return true}},conversation:{restoreCheckpointAttachments:()=>[],releaseDraftAttachment(){}},currentWorkspace:()=> 'w',store:{async get(){await gate;return record},async put(){assert.fail('cannot write during restore')}},fences:{get:()=> 'g',set(){assert.fail('cannot change fence')}}})
 change(state,initial);release();await handle.ready;handle.dispose();return{restores,notices,state:state.getSnapshot()}
}
test('F-LR-01: a fixed native Store publication without an input change cannot block cold recovery',async()=>{
 const r=await recover((state,initial)=>state.set({...initial,queue:[]}));assert.equal(r.restores,1);assert.equal(r.notices.length,0)
})
test('a real user draft change during load still refuses overwrite',async()=>{
 const r=await recover((state,initial)=>state.set({...initial,draft:'USER_EDIT',draftRev:1}));assert.equal(r.restores,0);assert.equal(r.state.draft,'USER_EDIT');assert.ok(r.notices.length)
})
test('a user edit then clear with advanced revision cannot be mistaken for an incidental notification',async()=>{
 const r=await recover((state,initial)=>{state.set({...initial,draft:'USER_EDIT',draftRev:1});state.set({...initial,draftRev:2})});assert.equal(r.restores,0);assert.ok(r.notices.length)
})
test('version3 transforms only the fixed official client and refuses repeat or drift',()=>{
 const path='.local/oasis-follow-up-20261026/desktop217-recovery/mounted/DSH Desktop.app/Contents/Resources/app/node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js',original=readFileSync(path,'utf8'),patched=api.patchConversationDraftCheckpoint3(original)
 new Script(patched);assert.throws(()=>api.patchConversationDraftCheckpoint3(patched),/mismatch/);assert.throws(()=>api.patchConversationDraftCheckpoint3(original+' '),/mismatch/)
})
