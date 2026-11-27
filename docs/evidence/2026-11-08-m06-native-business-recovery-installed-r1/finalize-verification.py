import hashlib,json,re,subprocess
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
E=Path(__file__).resolve().parent;P=E.parents[2]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text())
def write(p,x):
 if p.exists():assert read(p)==x,p;return
 with p.open('x',encoding='utf-8') as f:f.write(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
nav=['docs/project-current-state.md','docs/evidence/2026-10-23-stage5-progress-and-remaining.md']
for rel in nav:
 assert (P/rel).read_bytes().endswith((E/'before'/rel).read_bytes()),rel
changes=[];inputs=[]
for row in read(E/'preflight.json')['inputs']:
 p=Path(row['path']);current=sha(p);changed=current!=row['sha256']
 if changed:assert str(p.relative_to(P)) in nav;changes.append(str(p))
 inputs.append({'path':str(p),'beforeSHA256':row['sha256'],'afterSHA256':current,'changed':changed,'disposition':'only additive current-entry prefix' if changed else 'unchanged'})
assert len(changes)==2
write(E/'input-check.json',inputs)
for row in read(E/'protected-before.json'):assert sha(Path(row['path']))==row['sha256']
identity=read(E/'bundle-identity.json');auth=read(E/'authorization.json');root=Path(auth['root'])
assert sha(Path(identity['bundle'])/'bundle.json')==identity['bundleSHA256']
assert sha(Path(identity['archive']))==identity['archiveSHA256']
assert sha(root/'control/scripts/f-installed-runtime.mjs')==identity['controllerSHA256']
assert sha(P/'scripts/f-installed-runtime.mjs')==identity['sourceControllerSHA256']
derived=read(E/'controller-derivation.json')
assert sha(E/'executed-handoff-source.mjs')==derived['handoffHelperSHA256']
assert sha(P/'scripts/f-installed-controller-handoff.mjs')!=derived['handoffHelperSHA256']
assert (E/'handoff-red.log').read_text().count('journaled controller handoff must exist')>=1
assert 'DSH_STORAGE_ROOT_BUSY' in (E/'handoff-snapshot-red.log').read_text()
green=(E/'handoff-green-reviewed.log').read_text();assert 'tests 19' in green and 'pass 19' in green and 'fail 0' in green
installed=read(E/'installed-result.json');cold=read(E/'cold-result.json');assert installed['pid']!=cold['pid']
for r in [installed,cold]:
 assert not any(r['counters'].values());assert not r['AppHostBoot'];assert not r['nativeUIAccepted'];assert r['recordRevision']==10
 assert r['bundleSHA256']==identity['bundleSHA256'];assert r['actualInstalledBusinessCode'];assert not r['sourceFallback']
 assert r['businessSHA256']=='560f825eab3c54449b909a3bfc57ceb2c1e8d75cf0b0d7922774f2267eada4a7'
finalcheck=read(E/'installed-final-check.log');assert finalcheck['current']==identity['bundleSHA256']
assert len(read(E/'protected-after.json'))==35
assert read(E/'preservation-result.json')['oldReleaseProgramAndProfileUnchanged']
assert not any((root/p).exists() for p in ['RECOVERY_REQUIRED','startup.lock','data/startup.lock'])
githead=subprocess.check_output(['git','rev-parse','HEAD'],cwd=P,text=True).strip()
branch=subprocess.check_output(['git','branch','--show-current'],cwd=P,text=True).strip()
assert {'branch':branch,'head':githead}==read(E/'git-identity.json')
status=subprocess.check_output(['git','status','--porcelain=v1','-z','--untracked-files=all'],cwd=P)
write_status=E/'git-status.after.bin';write_status.write_bytes(status)
before={x[3:] for x in (E/'git-status.before.bin').read_bytes().split(b'\0') if x}
after={x[3:] for x in status.split(b'\0') if x};assert before<=after
new={x.decode() for x in after-before}
allowed={'scripts/f-installed-controller-handoff.mjs','scripts/tests/f-installed-controller-handoff.test.mjs'}
assert all(x in allowed or x.startswith(str(E.relative_to(P))+'/') for x in new),sorted(new)
for rel in nav:
 prefix=(P/rel).read_bytes()[:-(E/'before'/rel).stat().st_size].decode()
 for link in re.findall(r'\]\(([^)]+)\)',prefix):
  target=(P/rel).parent/link
  if target.resolve()!=E/'verification.json':assert target.exists(),link
for link in re.findall(r'\]\(([^)]+)\)',(E/'execution-return.md').read_text()):
 if link!='verification.json':assert (E/link).exists(),link
commands=[
 {'argv':['tools/bin/node','--test','scripts/tests/f-installed-controller-handoff.test.mjs'],'stage':'missing helper RED','exitCode':1,'log':'handoff-red.log'},
 {'argv':['tools/bin/node','--test','scripts/tests/f-installed-controller-handoff.test.mjs'],'stage':'snapshot ownership RED','exitCode':1,'log':'handoff-snapshot-red.log'},
 {'argv':['tools/bin/node','--test','scripts/tests/f-installed-controller-handoff.test.mjs','scripts/tests/f-installed-native-business-recovery.test.mjs','scripts/tests/f-installed-native-zero.test.mjs'],'stage':'final reviewed GREEN','exitCode':0,'tests':19,'log':'handoff-green-reviewed.log'},
 {'argv':['python3',str(E/'prepare-bundle.py')],'exitCode':0,'log':'prepare-bundle.log'},
 {'argv':['tools/bin/node',str(E/'install-candidate.mjs')],'exitCode':0,'log':'install-candidate.log'},
 *[{'argv':['tools/bin/node',str(E/'verify-installed.mjs'),s],'exitCode':0,'log':('installed' if s=='installed' else 'cold')+'-probe.log'} for s in ['installed','cold']],
 {'argv':['python3',str(E/'verify-preservation.py')],'exitCode':0,'log':'preservation.log'},
 {'argv':[str(root/'control/node'),str(root/'control/scripts/f-installed-runtime.mjs'),'--check',str(root)],'exitCode':0,'log':'installed-final-check.log'},
 *[{'argv':['tools/bin/node','--check',p],'exitCode':0} for p in sorted(allowed)],
 {'argv':['git','diff','--check','--',*nav],'exitCode':0},
]
write(E/'commands.json',commands)
artifacts={str(p.relative_to(E)):sha(p) for p in E.rglob('*') if p.is_file() and p.name not in ['verification.json','finalize.log']}
result={'status':'R5_P3_EXACT_RC2_INSTALLATION_AND_OFFLINE_RECOVERY_VERIFIED_NO_APP_START','recordedAt':datetime.now(ZoneInfo('Asia/Shanghai')).isoformat(),'executor':'Codex single agent self-review; no independent code review','root':str(root),'bundleSHA256':identity['bundleSHA256'],'archiveSHA256':identity['archiveSHA256'],'controllerSHA256':identity['controllerSHA256'],'executedHandoffHelperSHA256':derived['handoffHelperSHA256'],'finalReviewedHandoffHelperSHA256':sha(P/'scripts/f-installed-controller-handoff.mjs'),'helperCorrection':'snapshot read now inside try/finally; local failure test only; original executed helper bytes retained, bundle/controller/receipt not replaced','affectedTests':{'passed':19,'failed':0,'exitCode':0},'actualInstallationCheckExitCode':0,'actualInstalledPackageMembers':125,'independentSDKPids':[installed['pid'],cold['pid']],'recordRevision':10,'businessJSONSHA256':cold['businessSHA256'],'protectedOriginals':35,'oldReleaseAndSnapshotsUnchanged':True,'historicalNavigationBytesRetained':True,'checkedInputs':len(inputs),'inputChanges':changes,'gitHead':githead,'branch':branch,'AppHostBoot':False,'newBusinessExecutions':0,'modelAPIUploadFees':0,'sendCommitPushPublish':False,'nativeUIAccepted':False,'professionalOrUserAccepted':False,'next':'P4 exact native acceptance scope prepared, requires separate explicit authorization; no startup yet','artifacts':artifacts}
write(E/'verification.json',result)
print(json.dumps({k:v for k,v in result.items() if k!='artifacts'},ensure_ascii=False))
