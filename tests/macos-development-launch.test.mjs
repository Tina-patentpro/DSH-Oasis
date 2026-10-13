import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,realpathSync,rmSync,existsSync,renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
let api;
try { api = await import('../scripts/macos-development-launch.mjs'); }
catch (e) { if(e.code !== 'ERR_MODULE_NOT_FOUND') throw e; api = {}; }
function fixture(t) {
 const root=realpathSync(mkdtempSync(join(tmpdir(),'oasis-mac-中文-')));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 for(const name of ['user','home','userdata','cache','temp','evidence','workspace-a','workspace-b']) mkdirSync(join(root,name));
 const app=join(root,'DSH Desktop.app');mkdirSync(join(app,'Contents/MacOS'),{recursive:true});
 writeFileSync(join(app,'Contents/MacOS/DSH Desktop'),'synthetic');
 return {root,app,node:process.execPath};
}
test('confinement rejects POSIX sibling escape and the root itself',t=>{
 const f=fixture(t);assert.equal(typeof api.assertConfined,'function');
 assert.throws(()=>api.assertConfined(f.root,dirname(f.root)),/escaped/);
 assert.throws(()=>api.assertConfined(f.root,f.root),/escaped/);
 assert.equal(api.assertConfined(f.root,join(f.root,'workspace-a')),join(f.root,'workspace-a'));
});
test('confinement rejects symlink redirection, including an internal link',t=>{
 const f=fixture(t);assert.equal(typeof api.assertConfined,'function');
 symlinkSync(join(f.root,'workspace-a'),join(f.root,'link'));
 assert.throws(()=>api.assertConfined(f.root,join(f.root,'link')),/link/i);
});
test('canonical root accepts an explicit compatibility link without permitting descendant links',t=>{
 const f=fixture(t);const alias=f.root+'-alias';symlinkSync(f.root,alias);t.after(()=>rmSync(alias));
 assert.equal(typeof api.canonicalRoot,'function');assert.equal(api.canonicalRoot(alias),f.root);
});
test('launch environment has private paths, native PATH and no ambient credentials or injection',t=>{
 const f=fixture(t);assert.equal(typeof api.makeLaunchSpec,'function');
 const spec=api.makeLaunchSpec(f,{OPENAI_API_KEY:'secret',NODE_OPTIONS:'--require=bad',DSH_HOME:'/daily'});
 for(const key of ['OPENAI_API_KEY','NODE_OPTIONS','NODE_PATH','DYLD_INSERT_LIBRARIES','USERPROFILE','SSH_AUTH_SOCK']) assert.equal(spec.env[key],undefined);
 assert.equal(spec.env.HOME,join(f.root,'user'));assert.equal(spec.env.DSH_HOME,join(f.root,'home'));
 assert.equal(spec.env.ZDOTDIR,spec.env.HOME);assert.equal(spec.env.TMPDIR,join(f.root,'temp'));
 assert.equal(spec.env.MAC_CHROMIUM_TMPDIR,join(f.root,'temp'));
 assert.equal(spec.env.CFFIXED_USER_HOME,spec.env.HOME);
 assert.match(spec.args[0],/^--user-data-dir=/);assert.equal(spec.exe,join(f.app,'Contents/MacOS/DSH Desktop'));
 assert.equal(spec.shell,false);assert.match(spec.env.PATH,/:\/usr\/bin:/);assert.equal(spec.env.DSH_TELEMETRY_DISABLED,'1');
});
test('startup lock is exclusive, held for runtime lifetime and never removes a replaced lock',t=>{
 const f=fixture(t);assert.equal(typeof api.acquireLaunchLock,'function');
 const release=api.acquireLaunchLock(f.root);assert.throws(()=>api.acquireLaunchLock(f.root),/already|EEXIST/i);
 release();assert.equal(existsSync(join(f.root,'startup.lock')),false);
 const release2=api.acquireLaunchLock(f.root);renameSync(join(f.root,'startup.lock'),join(f.root,'old.lock'));
 writeFileSync(join(f.root,'startup.lock'),'another owner');release2();release2();assert.equal(existsSync(join(f.root,'startup.lock')),true);
});
test('failed process identity inspection leaves no stale startup lock',t=>{
 const f=fixture(t);
 assert.throws(()=>api.acquireLaunchLock(f.root,{identify:()=>{throw Error('synthetic identity failure');}}),/identity failure/);
 assert.equal(existsSync(join(f.root,'startup.lock')),false);
});
test('private runtime paths cannot redirect to another workspace',t=>{
 const f=fixture(t);rmSync(join(f.root,'home'),{recursive:true});symlinkSync(join(f.root,'workspace-b'),join(f.root,'home'));
 assert.equal(typeof api.makeLaunchSpec,'function');assert.throws(()=>api.makeLaunchSpec(f),/link/i);
});
test('network policy allows only loopback IP and confines writes to isolated runtime',t=>{
 const f=fixture(t);assert.equal(typeof api.makeSandboxProfile,'function');
 const policy=api.makeSandboxProfile(f.root,{lab:f.root,app:f.app,actualHome:'/Users/example'});
 assert.match(policy,/deny network\*/);assert.match(policy,/localhost:\*/);
 assert.match(policy,/deny file-write\*/);assert.match(policy,/deny file-read\*/);
 assert.doesNotMatch(policy,/allow network-outbound\s*\)/);
});
test('pin verification rejects manifest drift before launch',t=>{
 const f=fixture(t);const file=join(f.root,'pinned.json');writeFileSync(file,'original');
 assert.equal(typeof api.fileHash,'function');assert.equal(typeof api.verifyPins,'function');
 const pin={files:{[file]:api.fileHash(file)}};api.verifyPins(pin);
 writeFileSync(file,'changed');assert.throws(()=>api.verifyPins(pin),/drift/);
});
test('stop refuses PID reuse and only signals the exact recorded launcher identity',t=>{
 const f=fixture(t);assert.equal(typeof api.stopLaunch,'function');
 writeFileSync(join(f.root,'startup.lock'),JSON.stringify({pid:987654,startTime:'original',command:'pinned launcher'}));
 const signals=[];
 assert.throws(()=>api.stopLaunch(f.root,{inspect:()=>({startTime:'replacement',command:'pinned launcher'}),signal:(...args)=>signals.push(args)}),/identity/i);
 assert.deepEqual(signals,[]);
 api.stopLaunch(f.root,{inspect:()=>({startTime:'original',command:'pinned launcher'}),signal:(...args)=>signals.push(args)});
 assert.deepEqual(signals,[[987654,'SIGTERM']]);
 assert.equal(existsSync(join(f.root,'startup.lock')),true,'only the owning launcher releases its live lock');
});
test('acceptance inspector ports are explicitly loopback and absent from normal launch',t=>{
 const f=fixture(t);const normal=api.makeLaunchSpec(f),acceptance=api.makeLaunchSpec({...f,acceptance:true});
 assert.equal(normal.args.some(a=>a.startsWith('--inspect')),false);
 assert.ok(acceptance.args.includes('--inspect=127.0.0.1:0'));
 assert.ok(acceptance.args.includes('--remote-debugging-address=127.0.0.1'));
 assert.ok(acceptance.args.includes('--remote-debugging-port=0'));
});
test('approved launch starts the signed app directly without an added sandbox or disabling Electron sandbox',t=>{
 const f=fixture(t),spec=api.makeLaunchSpec({...f,acceptance:true}),calls=[];
 assert.equal(typeof api.startOwnedChild,'function');
 const sentinel={pid:123};
 assert.equal(api.startOwnedChild(spec,{stdio:['ignore',10,11],spawnProcess:(...args)=>{calls.push(args);return sentinel;}}),sentinel);
 assert.equal(calls[0][0],spec.exe);assert.deepEqual(calls[0][1],spec.args);
 assert.equal(calls[0][2].env,spec.env);assert.equal(calls[0][2].cwd,spec.cwd);
 assert.equal(calls[0][2].shell,false);assert.deepEqual(calls[0][2].stdio,['ignore',10,11]);
 assert.equal(calls[0][1].includes('--no-sandbox'),false);
});
