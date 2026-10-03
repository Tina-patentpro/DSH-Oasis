import {spawn, execFileSync} from 'node:child_process';
import {dirname, join, resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openSync, closeSync, unlinkSync, readFileSync, writeFileSync, lstatSync, realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';

export function makeLaunchSpec(parent, root, {s6UiCheck = false} = {}) {
  const system = parent.SystemRoot ?? parent.SYSTEMROOT;
  if (!system || !isAbsolute(system)) throw Error('Absolute SystemRoot required');
  const env = {SystemRoot:system, windir:system, ComSpec:join(system,'System32','cmd.exe'),
    PATH:join(root,'runtime')+';'+join(system,'System32')+';'+system, PATHEXT:'.COM;.EXE;.BAT;.CMD', OS:'Windows_NT'};
  for (const [key, part] of Object.entries({USERPROFILE:'user', HOME:'user', APPDATA:'user/AppData/Roaming',
    LOCALAPPDATA:'user/AppData/Local', TEMP:'temp', TMP:'temp', DSH_HOME:'home',
    npm_config_cache:'cache/npm', npm_config_store_dir:'cache/pnpm', XDG_CACHE_HOME:'cache'})) env[key]=join(root,part);
  Object.assign(env, {HTTP_PROXY:'http://127.0.0.1:9', HTTPS_PROXY:'http://127.0.0.1:9',
    ALL_PROXY:'http://127.0.0.1:9', NO_PROXY:'127.0.0.1,localhost,::1', DSH_HOST:'127.0.0.1',
    OASIS_UNIFIED_FIXTURE:'1', CI:'true'});
  if (s6UiCheck) delete env.OASIS_UNIFIED_FIXTURE;
  return {exe:join(root,'app','DSH Desktop.exe'), args:['--user-data-dir='+join(root,'userdata'),
    '--proxy-server=http://127.0.0.1:9','--proxy-bypass-list=localhost;127.0.0.1;[::1]'], env};
}

export function assertConfined(root, path) {
  const r=resolve(root), p=resolve(path), rel=relative(r,p);
  if (!rel || rel==='..' || rel.startsWith('..\\') || isAbsolute(rel)) throw Error('Path escaped confined root');
  for (let current=p;; current=dirname(current)) {
    if (lstatSync(current).isSymbolicLink()) throw Error('Link/junction refused: '+current);
    if (dirname(current)===current) break;
  }
  if (realpathSync(p).toLowerCase()!==p.toLowerCase()) throw Error('Noncanonical confined path');
  return p;
}

export function acquireLaunchLock(root) {
  const path=join(root,'startup.lock');
  const fd=openSync(path,'wx');
  writeFileSync(fd,JSON.stringify({pid:process.pid,createdAt:new Date().toISOString()}));
  let held=true;
  return () => { if (held) { held=false; closeSync(fd); unlinkSync(path); } };
}

const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
export function assertS6UiAdmission(root) {
  const file=assertConfined(root,join(root,'evidence/s6-ui-20260920/admission.json'));
  const proof=JSON.parse(readFileSync(file,'utf8'));
  const required=['home/profiles/desktop/cordis.yml','home/profiles/desktop/cordis.patch.yml',
    'evidence/candidate-pin.json','evidence/profile-installation-pin.json','launch.mjs'];
  if (proof.mode!=='s6-ui-check' || proof.admissionVersion!==3 || proof.home!==join(root,'home') ||
    proof.settingsPolicy!=='dsh-native-mutable' || Object.keys(proof.checkedFiles ?? {}).length!==required.length ||
    proof.apiPolicy!=='release-fixed-explicit-user-actions' || proof.nativeModelPolicy!=='user-confirmed-generation' ||
    required.some(name=>!/^[a-f0-9]{64}$/.test(proof.checkedFiles?.[name] ?? ''))) throw Error('Invalid S6 UI admission');
  for (const [name,expected] of Object.entries(proof.checkedFiles)) {
    const target=assertConfined(root,join(root,name));
    if (!/^[a-f0-9]{64}$/.test(expected) || hash(target)!==expected) throw Error('S6 admission input changed; recheck immutable installation before startup');
  }
  const settings=assertConfined(root,join(root,'home/settings.yaml'));
  if (!lstatSync(settings).isFile()) throw Error('Native settings must be an ordinary file');
}
function candidates(spec) {
  const ps=join(spec.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe');
  const script='$p=@(Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object { $_.ExecutablePath -eq '+
    "'"+spec.exe.replaceAll("'","''")+"'"+' } | Select-Object ProcessId,ParentProcessId,ExecutablePath); ConvertTo-Json -InputObject $p -Compress';
  return JSON.parse(execFileSync(ps,['-NoProfile','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],
    {encoding:'utf8',windowsHide:true,timeout:20000}));
}

const root=dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).some(arg=>!['--check','--s6-ui-check'].includes(arg))) throw Error('Unsupported launch arguments');
  const s6UiCheck=process.argv.includes('--s6-ui-check');
  const spec=makeLaunchSpec(process.env,root,{s6UiCheck});
  for (const path of [spec.exe,join(root,'runtime/node.exe'),join(root,'home'),join(root,'userdata'),
    join(root,'user'),join(root,'temp'),join(root,'cache'),join(root,'workspace-a'),join(root,'workspace-b'),join(root,'evidence')]) assertConfined(root,path);
  const release=acquireLaunchLock(root);
  try {
    const pin=JSON.parse(readFileSync(join(root,'evidence/candidate-pin.json'),'utf8'));
    const nodePath=join(root,'runtime/node.exe');
    if (realpathSync(process.execPath).toLowerCase()!==realpathSync(nodePath).toLowerCase() || hash(nodePath)!==pin.node_sha256) throw Error('Private Node mismatch');
    for (const [name, expected] of Object.entries(pin.app)) {
      const path=assertConfined(root,join(root,'app',name));
      if (hash(path)!==expected) throw Error('Pinned application drift: '+name);
    }
    for (const [name, files] of Object.entries(pin.dependency_files)) for (const [file, expected] of Object.entries(files)) {
      const path=assertConfined(root,join(root,'home/profiles/desktop/node_modules',name,file));
      if (hash(path)!==expected) throw Error('Pinned dependency drift: '+name+'/'+file);
    }
    if (hash(join(root,'home/profiles/desktop/pnpm-lock.yaml'))!==pin.lock_sha256) throw Error('Lockfile drift');
    const installation=JSON.parse(readFileSync(join(root,'evidence/profile-installation-pin.json'),'utf8'));
    for (const [file,expected] of Object.entries(installation.files)) {
      const path=assertConfined(root,join(root,'home/profiles/desktop',file));
      if (hash(path)!==expected) throw Error('Profile installation metadata drift: '+file);
    }
    if (s6UiCheck) assertS6UiAdmission(root);
    const running=candidates(spec);
    if (running.length) throw Error('Development copy already running; second Host refused');
    if (process.argv.includes('--check')) console.log(JSON.stringify({status:'preflight-only',home:spec.env.DSH_HOME,exe:spec.exe}));
    else {
      const base=join(root,'evidence','launch-'+Date.now());
      const out=openSync(base+'.stdout.log','wx'),err=openSync(base+'.stderr.log','wx');
      let child;
      try {
        child=spawn(spec.exe,spec.args,{cwd:root,env:spec.env,detached:true,windowsHide:false,
          shell:false,stdio:['ignore',out,err]});
        await new Promise((ok,fail)=>{child.once('spawn',ok);child.once('error',fail);});
      } finally {closeSync(out);closeSync(err);}
      child.unref();
      writeFileSync(base+'.json',JSON.stringify({pid:child.pid,exe:spec.exe,args:spec.args,home:spec.env.DSH_HOME,
        userData:join(root,'userdata'),mode:s6UiCheck?'s6-ui-check':'synthetic',status:'spawned; runtime and UI acceptance pending'},null,2),{flag:'wx'});
      await new Promise(ok=>setTimeout(ok,1500));
      if (!candidates(spec).some(p=>p.ProcessId===child.pid)) throw Error('Spawned main process not confirmed; inspect evidence, do not retry blindly');
      console.log(JSON.stringify({pid:child.pid,evidence:base+'.json',status:'main process present; UI acceptance pending'}));
    }
  } finally {release();}
}
