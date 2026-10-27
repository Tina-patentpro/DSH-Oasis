const output=document.querySelector('#result'),button=document.querySelector('#run'),frames=new Set(),pending=new Map();let sequence=0
const assert=(condition,message)=>{if(!condition)throw Error(message)}
addEventListener('message',event=>{if(event.origin!==location.origin||![...frames].some(f=>f.contentWindow===event.source)||!event.data?.fixture)return;const p=pending.get(event.data.id);if(p){clearTimeout(p.timeout);pending.delete(event.data.id);event.data.error?p.reject(Error(event.data.error)):p.resolve(event.data.value)}})
async function frame(revision,workspaceId,sessionId){
 const html=await (await fetch('/renderer.html')).text(),f=document.createElement('iframe');frames.add(f)
 f.srcdoc=html.replace('src="renderer.mjs"','src="/renderer.mjs?revision='+revision+'"')
 const ready=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('document load timeout')),10000);const listener=event=>{if(event.source===f.contentWindow&&event.origin===location.origin&&event.data?.ready){clearTimeout(timeout);removeEventListener('message',listener);resolve()}};addEventListener('message',listener)})
 document.body.append(f);await ready
 const command=(action,args)=>new Promise((resolve,reject)=>{const id=++sequence,timeout=setTimeout(()=>{pending.delete(id);reject(Error('fixture command timeout: '+action))},10000);pending.set(id,{resolve,reject,timeout});f.contentWindow.postMessage({fixture:true,id,action,args},location.origin)})
 await command('init',{workspaceId,sessionId});return{f,command}
}
const remove=f=>{frames.delete(f.f);f.f.remove()}
button.onclick=async()=>{
 button.disabled=true;const results=[],prefix='PUBLIC-'+crypto.randomUUID();output.textContent='RUNNING'
 try{
  {
   output.textContent='CASE 1: v3 counterexample';
   const a=await frame(3,prefix+'-old','s'),b=await frame(3,prefix+'-old','s');await a.command('seed');const sa=await a.command('bind'),sb=await b.command('bind');await a.command('edit',{draft:'PUBLIC A'});await b.command('edit',{draft:'PUBLIC B'});const stored=await a.command('read');assert(sa.restores===1&&sb.restores===1&&stored.draft==='PUBLIC B','v3 counterexample not reproduced');results.push({case:'v3-two-writer-counterexample',oldFailureObserved:true,restores:2,lastDraft:stored.draft});await a.command('close');await b.command('close');remove(a);remove(b)
  }
  {
   output.textContent='CASE 2: v4 single owner';
   const a=await frame(4,prefix+'-lease','s'),b=await frame(4,prefix+'-lease','s');await a.command('seed');const sa=await a.command('bind'),sb=await b.command('bind');assert(sa.restores===1&&sb.restores===0&&sb.reads===0&&sb.writes===0&&sb.notes.length,'v4 must refuse loser before storage');await b.command('edit',{draft:'PUBLIC LOSER EDIT'});await a.command('edit',{draft:'PUBLIC OWNER EDIT'});await a.command('close');const waiting=await b.command('summary');assert(waiting.reads===0&&waiting.writes===0&&waiting.draft==='PUBLIC LOSER EDIT','loser cannot automatically take over');await b.command('close');const c=await frame(4,prefix+'-lease','s');const sc=await c.command('bind');assert(sc.draft==='PUBLIC OWNER EDIT'&&sc.restores===1,'explicit new document must recover committed owner');results.push({case:'v4-single-owner-and-explicit-reopen',first:sa,loser:sb,afterOwnerClosed:waiting,reopened:sc});await c.command('close');remove(a);remove(b);remove(c)
  }
  {
   output.textContent='CASE 3: distinct keys';
   const a=await frame(4,prefix+'-separate-a','s'),b=await frame(4,prefix+'-separate-b','s'),c=await frame(4,prefix+'-separate-a','s2');const states=await Promise.all([a.command('bind'),b.command('bind'),c.command('bind')]);assert(states.every(s=>s.reads===1&&!s.notes.length),'distinct keys must not block');results.push({case:'v4-distinct-owner-keys',states});await Promise.all([a.command('close'),b.command('close'),c.command('close')]);remove(a);remove(b);remove(c)
  }
  {
   output.textContent='CASE 4: uncommitted transaction';
   const w=prefix+'-terminated',s='s',a=await frame(4,w,s);await a.command('seed');await a.command('bind');const before=await a.command('read'),prepared=await a.command('uncommitted');assert(prepared.requestSucceeded&&!prepared.transactionCompleted,'transaction window must be pending');remove(a)
   await navigator.locks.request('dsh.native-draft-checkpoint.'+JSON.stringify([w,s]),async()=>{})
   const b=await frame(4,w,s),after=await b.command('read'),state=await b.command('bind');assert(after.draft===before.draft&&after.generation==='COMMITTED'&&after.fence==='UNCOMMITTED','terminated document cannot commit pending transaction');assert(JSON.stringify(after.files)===JSON.stringify(before.files),'committed file bytes changed');assert(state.restores===0&&state.attachmentCount===0&&state.writes===0&&state.notes.length,'new owner must refuse stale checkpoint');results.push({case:'v4-document-termination-before-IDB-commit',prepared,before,after,reopened:state});await b.command('close');remove(b)
  }
  const result={status:'PASS_PUBLIC_BROWSER_HELPER_SUBSET',results,realModelCalls:0,professionalApiCreates:0,uploads:0,sends:0,fees:0,nativeDSHRendererTest:false,userAgent:navigator.userAgent};output.textContent=JSON.stringify(result,null,2);document.title='PASS F public lease fixture';await fetch('/receipt',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(result)})
 }catch(error){output.textContent=JSON.stringify({status:'FAIL',error:String(error.stack),results},null,2);document.title='FAIL F public lease fixture';await fetch('/receipt',{method:'POST',headers:{'content-type':'application/json'},body:output.textContent})}
 finally{for(const f of frames)f.remove();frames.clear()}
}
