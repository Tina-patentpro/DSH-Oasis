import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {Script} from 'node:vm'
const module=await import('../../patches/dsh-0.2.0-rc.2/draft-checkpoint-lease.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
// RED compares the pre-lease pass-through behavior, not a missing-function error.
const wrap=module.createLeasedDraftCheckpoint??(bind=>bind)
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
function manager(){const held=new Set();return{held,request(key,options,callback){assert.deepEqual(options,{mode:'exclusive',ifAvailable:true});if(held.has(key))return Promise.resolve().then(()=>callback(null));held.add(key);return Promise.resolve().then(()=>callback({name:key})).finally(()=>held.delete(key))}}}
function fixture(locks=manager()){
 let input={draft:'',draftRev:0,phase:'plain',occurrences:[],attachmentIds:[]},owner='w',count=0,disposals=0,flushes=0
 const notes=[],args={workspaceId:'w',sessionId:'s',leaseManager:locks,shell:{state:{getSnapshot:()=>input},notify:(_level,message)=>notes.push(message)},currentWorkspace:()=>owner}
 const bind=wrap(()=>{count++;return{ready:Promise.resolve(),async flush(){flushes++},dispose(){disposals++}}})
 return{args,bind,locks,notes,get count(){return count},get disposals(){return disposals},get flushes(){return flushes},edit(){input={...input,draft:'USER',draftRev:1}},move(){owner='foreign'}}
}
async function close(handle){handle.dispose();await handle.closed}
test('one workspace/session has one checkpoint owner; a loser never calls the underlying binder',async()=>{
 const f=fixture(),a=f.bind(f.args);await a.ready;const b=f.bind(f.args);await b.ready
 assert.equal(f.count,1);assert.ok(f.notes.length);assert.equal(f.locks.held.size,1)
 await close(b);await close(a);const c=f.bind(f.args);await c.ready;assert.equal(f.count,2);await close(c);assert.equal(f.locks.held.size,0)
})
test('different workspace/session pairs use separate leases and do not share a hash-only permission',async()=>{
 const f=fixture(),a=f.bind(f.args),b=f.bind({...f.args,sessionId:'s2'}),c=f.bind({...f.args,workspaceId:'w2',currentWorkspace:()=> 'w2'})
 await Promise.all([a.ready,b.ready,c.ready]);assert.equal(f.count,3);assert.equal(f.locks.held.size,3);await Promise.all([close(a),close(b),close(c)])
})
test('disposing keeps the lease until the underlying write queue drains',async()=>{
 const locks=manager(),gate=deferred();let calls=0
 const f=fixture(locks),bind=wrap(()=>{calls++;return{ready:Promise.resolve(),flush:()=>gate.promise,dispose(){}}})
 const a=bind(f.args);await a.ready;a.dispose();const b=bind(f.args);await b.ready;assert.equal(calls,1);assert.equal(locks.held.size,1)
 gate.resolve();await a.closed;const c=bind(f.args);await c.ready;assert.equal(calls,2);await close(c);await close(b)
})
for(const action of ['edit','dispose','move'])test('a '+action+' before asynchronous lease admission cannot start recovery',async()=>{
 const gate=deferred(),locks={request:async(_key,_options,callback)=>{await gate.promise;return callback({})}},f=fixture(locks),a=f.bind(f.args)
 if(action==='dispose')a.dispose();else f[action]();gate.resolve();await a.ready;assert.equal(f.count,0);await close(a)
})
test('missing Web Locks capability fails closed without underlying store access',async()=>{
 const f=fixture(null),a=f.bind(f.args);await a.ready;assert.equal(f.count,0);assert.ok(f.notes.length);await close(a)
})
test('a rejected lock request is reported without starting a binder or leaking a rejection',async()=>{
 const f=fixture({request:async()=>{throw Error('denied')}}),a=f.bind(f.args);await a.ready;assert.equal(f.count,0);assert.ok(f.notes.length);await close(a)
})
test('a rejected write drain retains ownership rather than admitting a competing writer',async()=>{
 const f=fixture(),bind=wrap(()=>({ready:Promise.resolve(),async flush(){throw Error('uncertain drain')},dispose(){}})),a=bind(f.args);await a.ready;a.dispose()
 await new Promise(resolve=>setImmediate(resolve));assert.equal(f.locks.held.size,1)
 const b=f.bind(f.args);await b.ready;assert.equal(f.count,0);await close(b)
})
test('an exception before creating an underlying handle releases the unused lease',async()=>{
 const f=fixture(),a=wrap(()=>{throw Error('factory failed')})(f.args);await a.ready;await a.closed;assert.equal(f.locks.held.size,0);assert.ok(f.notes.length)
})
test('v4 is an exact fixed-client conversion and cannot reapply or accept source drift',async()=>{
 const api=await import('../../patches/dsh-0.2.0-rc.2/conversation-draft-checkpoint-4.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e})
 assert.equal(typeof api.patchConversationDraftCheckpoint4,'function')
 const path='.local/oasis-follow-up-20261026/desktop217-recovery/mounted/DSH Desktop.app/Contents/Resources/app/node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js',original=readFileSync(path,'utf8'),patched=api.patchConversationDraftCheckpoint4(original)
 new Script(patched);assert.match(api.nativeCheckpoint4Source(),/draft-checkpoint-4/);assert.match(patched,/createLeasedDraftCheckpoint/)
 assert.throws(()=>api.patchConversationDraftCheckpoint4(patched),/mismatch/);assert.throws(()=>api.patchConversationDraftCheckpoint4(original+' '),/mismatch/)
})
