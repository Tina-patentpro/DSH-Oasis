import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {validateDraftCheckpoint} from '../../patches/dsh-0.2.0-rc.2/draft-checkpoint.mjs'
const {seedLegacyDraft}=await import('../../patches/f-host-assembly/legacy-draft-seed.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
const digest=async data=>createHash('sha256').update(data).digest('hex')
function fixture(){
 const bytes=Buffer.from('OLD_PUBLIC_BYTES'),pack={workspaceId:'w',sessionId:'A',draft:'OLD_UNSENT',attachments:[{name:'old.md',type:'text/markdown',bytes:16,sha256:createHash('sha256').update(bytes).digest('hex'),base64:bytes.toString('base64')}]},key=JSON.stringify(['w','A']),records=new Map(),markers=new Map();let active='B',live=true,owner=true,adds=0
 const fences={get:k=>markers.has(k)?markers.get(k):null,set:(k,v)=>markers.set(k,v),remove:k=>markers.delete(k)}
 const store={async get(k){return records.get(k)},async addIfAbsent(k,v){adds++;if(records.has(k)){const e=Error('exists');e.name='ConstraintError';throw e}records.set(k,v)}}
 return {pack,key,records,markers,fences,store,get adds(){return adds},options:{pack,store,fences,validate:validateDraftCheckpoint,digest,live:()=>live,ownerMatches:()=>owner,activeSessionId:()=>active},edit(){records.set(key,{draft:'USER_EDIT',generation:'USER'});markers.set(key,'USER')},move(){owner=false},activate(){active='A'},dispose(){live=false}}
}
test('a verified staged package creates one checkpoint with exact File bytes and no receipt',async()=>{
 const f=fixture(),result=await seedLegacyDraft(f.options);assert.equal(result.status,'seeded');const r=f.records.get(f.key);assert.equal(r.draft,'OLD_UNSENT');assert.equal(await r.attachments[0].file.text(),'OLD_PUBLIC_BYTES');assert.equal('receiptId'in r,false);assert.equal(f.markers.get(f.key),r.generation);assert.equal(f.adds,1)
})
test('F-LA-A03: a user checkpoint arriving during digest survives with its original fence',async()=>{
 const f=fixture();let release;const gate=new Promise(resolve=>release=resolve);const work=seedLegacyDraft({...f.options,digest:async bytes=>{await gate;return digest(bytes)}});f.edit();release();const result=await work;assert.equal(result.status,'present');assert.equal(f.records.get(f.key).draft,'USER_EDIT');assert.equal(f.markers.get(f.key),'USER');assert.equal(f.adds,0)
})
test('F-LA-A03: atomic insertion refuses a writer arriving after the absence read',async()=>{
 const f=fixture();f.store.addIfAbsent=async()=>{f.edit();const e=Error('exists');e.name='ConstraintError';throw e};const result=await seedLegacyDraft(f.options);assert.equal(result.status,'present');assert.equal(f.records.get(f.key).draft,'USER_EDIT');assert.equal(f.markers.get(f.key),'USER')
})
for(const change of ['activate','dispose','move'])test('a target becoming '+change+' during digest blocks seed before persistence',async()=>{
 const f=fixture();let release;const gate=new Promise(resolve=>release=resolve);const work=seedLegacyDraft({...f.options,digest:async bytes=>{await gate;return digest(bytes)}});f[change]();release();assert.equal((await work).status,'blocked');assert.equal(f.records.size,0);assert.equal(f.markers.size,0);assert.equal(f.adds,0)
})
test('an existing fence alone prevents recovery and a failed add removes only its own fence',async()=>{
 const f=fixture();f.markers.set(f.key,'UNCOMMITTED_USER');assert.equal((await seedLegacyDraft(f.options)).status,'present');assert.equal(f.markers.get(f.key),'UNCOMMITTED_USER');f.markers.clear();f.store.addIfAbsent=async()=>{throw Error('quota')};assert.equal((await seedLegacyDraft(f.options)).status,'failed');assert.equal(f.markers.size,0)
})
