/** Mac-only, no-account/no-model development launcher. Windows entries are preserved. */
import {createHash,randomUUID} from 'node:crypto';
import {openSync,closeSync,writeFileSync,readFileSync,unlinkSync,lstatSync,realpathSync,existsSync} from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
import {resolve,relative,isAbsolute,join,dirname,delimiter,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const canonicalRoot = path => realpathSync(resolve(path));
export const fileHash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
export function assertConfined(root,path) {
 const base=canonicalRoot(root),target=resolve(path),rel=relative(base,target);
 if(!rel || rel==='..' || rel.startsWith('..'+sep) || isAbsolute(rel)) throw Error('Path escaped confined root');
 let current=base;
 for(const part of rel.split(sep)) {
  current=join(current,part);
  if(lstatSync(current).isSymbolicLink()) throw Error('Descendant link refused: '+current);
 }
 if(realpathSync(target)!==target) throw Error('Noncanonical confined path');
 return target;
}
export function makeLaunchSpec({root,app,node,acceptance=false}) {
 root=canonicalRoot(root);app=canonicalRoot(app);node=realpathSync(node);
 for(const name of ['user','home','userdata','cache','temp','evidence','workspace-a','workspace-b']) assertConfined(root,join(root,name));
 const env={PATH:[dirname(node),'/usr/bin','/bin','/usr/sbin','/sbin'].join(delimiter),
  HOME:join(root,'user'),CFFIXED_USER_HOME:join(root,'user'),ZDOTDIR:join(root,'user'),DSH_HOME:join(root,'home'),TMPDIR:join(root,'temp'),MAC_CHROMIUM_TMPDIR:join(root,'temp'),
  XDG_CACHE_HOME:join(root,'cache'),XDG_CONFIG_HOME:join(root,'user/.config'),XDG_DATA_HOME:join(root,'user/.local/share'),
  NPM_CONFIG_USERCONFIG:'/dev/null',NPM_CONFIG_GLOBALCONFIG:join(root,'cache/empty-global.npmrc'),NPM_CONFIG_CACHE:join(root,'cache/npm'),
  npm_config_store_dir:join(root,'cache/pnpm'),SHELL:'/bin/zsh',LANG:'en_US.UTF-8',LC_ALL:'en_US.UTF-8',
  DSH_TELEMETRY_DISABLED:'1',OASIS_UNIFIED_FIXTURE:'1',HTTP_PROXY:'http://127.0.0.1:9',HTTPS_PROXY:'http://127.0.0.1:9',
  ALL_PROXY:'http://127.0.0.1:9',NO_PROXY:'127.0.0.1,localhost,::1',CI:'true'};
 return {exe:join(app,'Contents/MacOS/DSH Desktop'),args:[
  '--user-data-dir='+join(root,'userdata'),'--proxy-server=http://127.0.0.1:9',
  '--proxy-bypass-list=localhost;127.0.0.1;[::1]','--disable-background-networking',
  ...(acceptance ? ['--inspect=127.0.0.1:0','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0'] : [])],
  env,cwd:root,shell:false};
}
export function acquireLaunchLock(root,{identify=processIdentity}={}) {
 const path=join(canonicalRoot(root),'startup.lock');
 // Inspect before creating the lock, so a denied/failed inspection leaves no stale lock.
 const payload=JSON.stringify({pid:process.pid,...identify(process.pid),nonce:randomUUID(),createdAt:new Date().toISOString()});
 const fd=openSync(path,'wx',0o600),identity=lstatSync(path);
 try {writeFileSync(fd,payload);}
 catch(error) {
  closeSync(fd);
  if(existsSync(path)) {const current=lstatSync(path);if(current.dev===identity.dev && current.ino===identity.ino)unlinkSync(path);}
  throw error;
 }
 let held=true;
 return ()=>{
  if(!held)return;held=false;closeSync(fd);
  if(existsSync(path)) { const current=lstatSync(path);if(current.dev===identity.dev && current.ino===identity.ino)unlinkSync(path); }
 };
}
export function processIdentity(pid) {
 const env={PATH:'/usr/bin:/bin',LC_ALL:'C'};
 const query=field=>execFileSync('/bin/ps',['-ww','-p',String(pid),'-o',field+'='],{env,encoding:'utf8',timeout:3000}).trim();
 return {startTime:query('lstart'),command:query('command')};
}
export function stopLaunch(root,{inspect=processIdentity,signal=(pid,sig)=>process.kill(pid,sig)}={}) {
 const lock=JSON.parse(readFileSync(assertConfined(root,join(root,'startup.lock')),'utf8'));
 if(!Number.isSafeInteger(lock.pid) || lock.pid<=0 || lock.pid===process.pid || !lock.command || !lock.startTime)throw Error('Invalid launcher identity');
 const actual=inspect(lock.pid);
 if(actual.startTime!==lock.startTime || actual.command!==lock.command)throw Error('Launcher process identity changed; refusing signal');
 signal(lock.pid,'SIGTERM');
 return {status:'shutdown-requested',launcherPid:lock.pid};
}
export function makeSandboxProfile(root,{lab,app,actualHome}) {
 const quote=value=>JSON.stringify(canonicalRoot(value));
 const ancestors=new Set();
 for(const path of [canonicalRoot(lab),canonicalRoot(app)]) {
  for(let p=dirname(path);p===resolve(actualHome) || p.startsWith(resolve(actualHome)+sep);p=dirname(p)) ancestors.add(p);
 }
 // Explicit compatibility roots are canonicalized once. Descendant runtime links fail above.
 return `(version 1)\n(allow default)\n(deny network*)\n`+
  `(allow network-bind (local ip "localhost:*"))\n`+
  `(allow network-inbound (local ip "localhost:*"))\n`+
  `(allow network-outbound (remote ip "localhost:*"))\n`+
  `(deny file-write*)\n(allow file-write* (subpath ${quote(root)}) (literal "/dev/null") (literal "/dev/tty"))\n`+
  `(deny file-read* (subpath ${JSON.stringify(resolve(actualHome))}))\n`+
  `(allow file-read* (subpath ${quote(root)}) (subpath ${quote(lab)}) (subpath ${quote(app)}))\n`+
  (ancestors.size ? `(allow file-read-metadata ${[...ancestors].map(p=>`(literal ${JSON.stringify(p)})`).join(' ')})\n` : '');
}
export function verifyPins(pin) {
 if(!pin.files || !Object.keys(pin.files).length)throw Error('Missing admission pins');
 for(const [path,hash] of Object.entries(pin.files)) {
  if(!/^[a-f0-9]{64}$/.test(hash) || fileHash(path)!==hash) throw Error('Pinned file drift: '+path);
 }
}
export function startOwnedChild(spec,{stdio,spawnProcess=spawn}={}) {
 // User-approved: remove only this project's outer sandbox-exec wrapper.
 // Keep signed Electron's native sandbox, clean environment and isolated paths.
 return spawnProcess(spec.exe,spec.args,{cwd:spec.cwd,env:spec.env,shell:false,stdio});
}
async function main() {
 if(process.platform!=='darwin')throw Error('Mac launcher requires darwin');
 const args=process.argv.slice(2);
 if(!['--check','--start','--stop'].includes(args[0]) || args.length>2 || (args.length===2 && (args[0]!=='--start' || args[1]!=='--acceptance')))throw Error('Use --check, --start [--acceptance], or --stop');
 const source=canonicalRoot(join(dirname(fileURLToPath(import.meta.url)),'..'));
 const root=canonicalRoot(join(source,'.dsh-test/mac-dev'));
 if(args[0]==='--stop'){console.log(JSON.stringify(stopLaunch(root)));return;}
 const pinPath=assertConfined(root,join(root,'evidence/admission.json'));
 const pin=JSON.parse(readFileSync(pinPath,'utf8'));
 if(pin.root!==root || pin.policy!=='no-model-private-profile-v2')throw Error('Invalid Mac admission');
 verifyPins(pin);
 if(realpathSync(process.execPath)!==realpathSync(pin.node))throw Error('Use pinned private Node');
 const spec=makeLaunchSpec({root,app:pin.app,node:pin.node,acceptance:args.includes('--acceptance')});
 if(args[0]==='--check') {console.log(JSON.stringify({status:'preflight-only',runtimeAcceptance:pin.runtime_acceptance?.status ?? 'unverified',root,exe:spec.exe,home:spec.env.HOME,dshHome:spec.env.DSH_HOME,userData:join(root,'userdata'),network:'Profile loopback; no outer kernel network/file guard',launch:'direct signed Electron; native sandbox unchanged'}));return;}
 const release=acquireLaunchLock(root);
 const runId=Date.now(),base=join(root,'evidence','launch-'+runId);
 const out=openSync(base+'.stdout.log','wx',0o600),err=openSync(base+'.stderr.log','wx',0o600);
 let child,stopping=false;
 const shutdown=()=>{if(child && !stopping){stopping=true;child.kill('SIGTERM');}};
 process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
 try {
  child=startOwnedChild(spec,{stdio:['ignore',out,err]});
  await new Promise((ok,fail)=>{child.once('spawn',ok);child.once('error',fail);});
  const record={runId,pid:child.pid,launcherPid:process.pid,exe:spec.exe,root,home:spec.env.HOME,dshHome:spec.env.DSH_HOME,userData:join(root,'userdata'),acceptance:args.includes('--acceptance'),status:'spawned; acceptance pending'};
  writeFileSync(base+'.json',JSON.stringify(record,null,2),{flag:'wx',mode:0o600});
  console.log(JSON.stringify(record));
  const result=await new Promise(ok=>child.once('close',(code,signal)=>ok({code,signal})));
  writeFileSync(base+'.exit.json',JSON.stringify({...result,requestedShutdown:stopping,endedAt:new Date().toISOString()},null,2),{flag:'wx',mode:0o600});
  process.exitCode=result.code ?? 1;
 } finally {process.off('SIGTERM',shutdown);process.off('SIGINT',shutdown);closeSync(out);closeSync(err);release();}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(error=>{console.error(error.message);process.exitCode=1;});
