import hashlib,json,re,subprocess
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
E=Path(__file__).resolve().parent;P=E.parents[2]
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def write(name,x):
 with (E/name).open('x',encoding='utf-8') as f:f.write(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
auth=read(E/'authorization.json');preflight=read(E/'preflight.json');root=Path(auth['root'])
nav=['docs/project-current-state.md','docs/evidence/2026-10-23-stage5-progress-and-remaining.md']
inputs=[]
for row in preflight['inputs']:
 p=Path(row['path']);h=sha(p);changed=h!=row['sha256']
 if changed:assert str(p.relative_to(P)) in nav
 inputs.append({**row,'afterSHA256':h,'changed':changed,'disposition':'additive current-entry prefix, old bytes retained' if changed else 'unchanged'})
assert sum(x['changed'] for x in inputs)==2
write('input-check.json',inputs)
for rel in nav:assert (P/rel).read_bytes().endswith((E/'before'/rel).read_bytes())
for row in read(E/'protected-after.json'):assert sha(Path(row['path']))==row['sha256']
prior=E.parent/'2026-11-08-m06-native-business-recovery-installed-r1';previous=read(prior/'verification.json')
for rel,h in previous['artifacts'].items():assert sha(prior/rel)==h
facts=read(E/'business-native-result.json');assert facts['nativeStarts']==2 and facts['nativeNormalExits']==2
assert facts['recordRevisions']['afterNativeRestart']==15 and facts['newRuns']==0
assert facts['firstAndSecondExitBusinessBytesIdentical'] and facts['oldVersionsUnchanged'] and facts['oldWorkspaceFilesUnchanged']
assert facts['workspaceJSONUnchanged'] is False and facts['workspaceIdentityUnchanged']
assert sha(root/'data/home/storages/oasis_workbench.json')==facts['businessAfterSHA256']
assert sha(root/'data/home/storages/workspace.json')==read(E/'workspace-native-delta.json')['afterSHA256']
assert (root/'installation.json').read_bytes()==(E/'before/target-root/installation.json').read_bytes()
assert sha(root/'control/scripts/f-installed-runtime.mjs')==auth['controllerSHA256']
assert sha(Path(read(prior/'bundle-identity.json')['archive']))==auth['archiveSHA256']
assert sha(Path(read(prior/'bundle-identity.json')['bundle'])/'bundle.json')==auth['bundleSHA256']
assert not any((root/n).exists() for n in ['startup.lock','data/startup.lock','RECOVERY_REQUIRED'])
port=subprocess.run(['/usr/sbin/lsof','-nP','-iTCP:57619','-sTCP:LISTEN'],capture_output=True,text=True);assert port.returncode==1 and not port.stdout
ps=subprocess.check_output(['/bin/ps','-axo','pid,ppid,comm'],text=True);assert not any('DSH Desktop' in line for line in ps.splitlines())
assert read(E/'active-writer-refusal.json')['code']=='F_INSTALL_BUSY'
assert read(E/'lease-readmission.json')['writerReleased']
for s in ['before','between','after']:assert read(E/('controller-check-'+s+'.log'))['current']==auth['bundleSHA256']
identity={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=P,text=True).strip(),'branch':subprocess.check_output(['git','branch','--show-current'],cwd=P,text=True).strip()}
assert identity==preflight['git']
status=subprocess.check_output(['git','status','--porcelain=v1','-z','--untracked-files=all'],cwd=P);(E/'git-status.after.bin').write_bytes(status)
paths=lambda data:{x[3:].decode() for x in data.split(b'\0') if x}
before_paths=paths((E/'git-status.before.bin').read_bytes());after_paths=paths(status);assert before_paths<=after_paths
assert all(x.startswith(str(E.relative_to(P))+'/') for x in after_paths-before_paths)
for rel in nav:
 prefix=(P/rel).read_bytes()[:-(E/'before'/rel).stat().st_size].decode()
 for link in re.findall(r'\]\(([^)]+)\)',prefix):
  target=((P/rel).parent/link).resolve()
  if target!=E/'verification.json':assert target.exists(),target
for link in re.findall(r'\]\(([^)]+)\)',(E/'execution-return.md').read_text()):assert (E/link).resolve().exists(),link
commands=[]
for stage in ['first','second']:
 launch=read(E/(stage+'-launch.json'));exit=read(E/(stage+'-exit-observation.json'))['exit']
 assert exit['code']==0 and exit['signal'] is None
 commands.append({'stage':stage,'argv':['/usr/bin/env','-i','PATH=/usr/bin:/bin:/usr/sbin:/sbin','HOME='+str(root/'data/user'),'LANG=en_US.UTF-8',str(root/'control/node'),str(root/'control/scripts/f-installed-runtime.mjs'),'--start',str(root)],'shell':'zsh non-login','execSessionId':launch['execSessionId'],'pid':launch['pid'],'exitCode':0,'signal':None,'exitMethod':'native App menu Exit DSH Desktop'})
commands.extend([{'stage':'controller '+s,'argv':[str(root/'control/node'),str(root/'control/scripts/f-installed-runtime.mjs'),'--check',str(root)],'exitCode':0,'log':'controller-check-'+s+'.log'} for s in ['before','between','after']])
commands.extend([{'stage':'native facts read-only assertions','argv':['python3',str(E/'verify-native-facts.py')],'exitCode':0,'log':'verify-native-facts.log'}, {'stage':'whitespace','argv':['git','diff','--check','--',*nav],'exitCode':0}, {'stage':'active writer negative / final readmission / session read-only API','exitCode':0,'results':['active-writer-refusal.json','lease-readmission.json','native-session-observation.json']}])
write('commands.json',commands)
artifact_hashes={str(p.relative_to(E)):sha(p) for p in E.rglob('*') if p.is_file() and p.name not in ['verification.json','finalize.log']}
result={'status':'EXACT_RC2_NATIVE_SYNTHETIC_RECOVERY_PATH_VERIFIED_WITH_OPEN_UI_GAP','recordedAt':datetime.now(ZoneInfo('Asia/Shanghai')).isoformat(),'executor':'Codex single agent, native CUA plus original controller/official read-only facilities','root':str(root),'bundleSHA256':auth['bundleSHA256'],'archiveSHA256':auth['archiveSHA256'],'controllerSHA256':auth['controllerSHA256'],'nativeStarts':2,'normalExits':2,'normalRestarts':1,'failureRetries':0,'applicationRunning':False,'nativeUIPathVerified':True,'nativeUICompletenessAccepted':False,'openFinding':'UI-RC2-01','workspaceIdentityStable':True,'workspaceBytesUnchanged':False,'workspaceDelta':'only two sessionIds/updatedAt from native new conversations; original bytes and exact metadata events retained','recordRevisionBefore':10,'recordRevisionAfter':15,'businessAfterSHA256':facts['businessAfterSHA256'],'newVersionId':facts['newVersionId'],'newResultSHA256':facts['newResultSHA256'],'warningsByVersion':[7,9,11],'newBusinessRuns':0,'oldVersionsAndFilesRetained':True,'protectedOriginals':33,'checkedInputIdentities':len(inputs),'productSourceOrPackageChanged':False,'realModelAPIUploadPaymentOperationsIssued':0,'messageSend':False,'commitPushPublish':False,'professionalOrUserAccepted':False,'releaseAccepted':False,'limitations':['UI-RC2-01 open; forbidden affordances not clicked natively','Uncommitted result-edit draft across native restart not exercised; tab close/reopen verified, draft then consumed into new version','No full-machine network/model/account instrumentation claimed; only exact disabled candidate and observed operations/metadata','Original observation-tool failures retained and corrected against exact controller receipts/public persistence API, no App/business retries'],'next':'Narrow UI-RC2-01 local fix within approved V0.1, targeted offline verification, another exact candidate; any new candidate startup separately authorized','git':identity,'artifacts':artifact_hashes}
write('verification.json',result)
print(json.dumps({k:v for k,v in result.items() if k!='artifacts'},ensure_ascii=False))
