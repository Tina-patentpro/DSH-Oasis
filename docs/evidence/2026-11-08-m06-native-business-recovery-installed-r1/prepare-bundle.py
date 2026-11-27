"""One-shot exact local bundle derivation; does not start or install an application."""
import hashlib,json,os,shutil,stat,subprocess
from pathlib import Path
P=Path(__file__).resolve().parents[3]
E=Path(__file__).resolve().parent
old=P/'.local/m06-public-installed-20261107-r1/bundle'
new=P/'.local/m06-native-business-recovery-installed-20261108-r1/bundle'
archive=P/'.local/m06-native-business-recovery-20261108-r1/oasis-professional-service-0.1.0-rc.2.tgz'
package=P/'.local/m06-native-business-recovery-20261108-r1/unpacked/package'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
write=lambda p,x:p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
assert sha(old/'bundle.json')=='061d3e6eb6dafb6183f0f1b3e85255010ddc741360913db997f93b17df701c9c'
assert sha(archive)=='836f658e658988a224880a249a65afdc7b5a2c32b18a578035a20d691f8368ac'
assert not new.exists(),'one-shot preparation refuses existing output'
identity=json.loads((P/'docs/evidence/2026-11-08-m06-native-business-recovery-offline-r1/candidate-identity.json').read_text())
new.parent.mkdir(parents=True,exist_ok=True)
subprocess.run(['/bin/cp','-cR',str(old),str(new)],check=True)
payload=new/'payload';component=payload/'components/c3'
shutil.rmtree(component);shutil.copytree(package,component,symlinks=True)
original=(P/'scripts/f-installed-runtime.mjs').read_bytes()
before=b"'oasis-professional-service':'0.0.1'";after=b"'oasis-professional-service':'0.1.0-rc.2'"
assert original.count(before)==1
derived=original.replace(before,after)
controller=payload/'controller/scripts/f-installed-runtime.mjs';controller.write_bytes(derived)
scope=json.loads((P/'docs/evidence/2026-11-08-m06-native-business-recovery-offline-r1/recovery-scope.json').read_text())
template=json.loads((payload/'profile-template.json').read_text());assert template.pop('nativeZeroGeneration')['archiveSHA256']=='a7cf9a5dd59db1da2c7fe34fb4eac413c3dbb0d2baad7ab88147c7bfaab63bc3'
guards=['src/index.js','src/workbench-rpc.js','src/workbench-connection.js','src/m06-native-business-recovery.js','src/v340-runtime-contract.js','lib/client.js']
template['nativeBusinessRecovery']={'schemaVersion':1,'policy':'m06-native-business-recovery-v1','archiveSHA256':sha(archive),'budget':dict.fromkeys(['model','api','upload','payment'],0),'guardedFiles':{f:sha(component/f) for f in guards},'scope':scope}
replaced=[]
def patch(v):
 if isinstance(v,list):
  for x in v:patch(x)
 elif isinstance(v,dict):
  if v.get('id')=='oasis-professional-service-m06-controlled-013':
   assert v['name']=='@OASIS_RELEASE_ROOT@/components/c3/src/m06-controlled-host-013.js'
   v['id']='oasis-professional-service-m06-native-recovery';v['name']='@OASIS_RELEASE_ROOT@/components/c3/src/m06-native-business-recovery-host.js';replaced.append(True)
  for x in v.values():patch(x)
patch(template['patch']);assert len(replaced)==1
write(payload/'profile-template.json',template)
files={};links={}
def walk(directory):
 for p in sorted(directory.iterdir()):
  rel=str(p.relative_to(payload));mode=p.lstat().st_mode
  if stat.S_ISLNK(mode):links[rel]=os.readlink(p)
  elif stat.S_ISDIR(mode):walk(p)
  else:assert stat.S_ISREG(mode) and p.stat().st_nlink==1;files[rel]=sha(p)
walk(payload)
manifest=json.loads((old/'bundle.json').read_text())
manifest['source']={'baseBundle':str(old),'baseBundleSHA256':sha(old/'bundle.json'),'archive':str(archive),'archiveSHA256':sha(archive),'scope':'rc.2 exact existing isolated root offline transition; no App/Host boot or live call/release acceptance','controllerAdaptation':{'revision':'rc2-native-business-recovery-version-table-r1','baseSHA256':hashlib.sha256(original).hexdigest(),'derivedSHA256':sha(controller),'change':'Only component version literal 0.0.1 -> 0.1.0-rc.2 in the current reviewed controller; existing native-recovery guard implementation retained','handoffHelperSHA256':sha(P/'scripts/f-installed-controller-handoff.mjs')}}
manifest['files']=files;manifest['links']=links
if 'businessPackageVersion' in manifest:manifest['businessPackageVersion']='0.1.0-rc.2'
write(new/'bundle.json',manifest)
oldm=json.loads((old/'bundle.json').read_text());changed=[k for k in set(files)|set(oldm['files']) if files.get(k)!=oldm['files'].get(k)]
assert all(k.startswith('components/c3/') or k in ['profile-template.json','controller/scripts/f-installed-runtime.mjs'] for k in changed)
assert links==oldm['links']
members={str(p.relative_to(component)):sha(p) for p in component.rglob('*') if p.is_file()};assert len(members)==125
assert members=={str(p.relative_to(package)):sha(p) for p in package.rglob('*') if p.is_file()}
result={'bundle':str(new),'bundleSHA256':sha(new/'bundle.json'),'archive':str(archive),'archiveSHA256':sha(archive),'controller':str(controller),'controllerSHA256':sha(controller),'sourceControllerSHA256':hashlib.sha256(original).hexdigest(),'componentVersion':json.loads((component/'package.json').read_text())['version'],'members':len(members),'files':len(files),'links':len(links),'changedFromOld':sorted(changed),'scope':scope,'AppHostBoot':False,'realCallBudget':0}
write(E/'bundle-identity.json',result);write(E/'controller-derivation.json',manifest['source']['controllerAdaptation']);write(E/'installed-package-expected.json',members)
print(json.dumps({k:v for k,v in result.items() if k not in ['changedFromOld','scope']},ensure_ascii=False))
