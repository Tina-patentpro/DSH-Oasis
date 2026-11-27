import hashlib,json,os,shutil,stat,subprocess
from pathlib import Path
P=Path(__file__).resolve().parents[3];E=Path(__file__).resolve().parent
read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
write=lambda p,x:p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
prior=E.parent/'2026-11-08-m06-native-business-recovery-installed-r1';base=read(prior/'bundle-identity.json')
candidate=read(E/'candidate-identity.json');old=Path(base['bundle']);new=P/'.local/m06-recovery-ui-gap-20261108-r1/bundle'
assert sha(old/'bundle.json')==base['bundleSHA256'];assert sha(Path(candidate['archive']))==candidate['archiveSHA256'];assert not new.exists()
subprocess.run(['/bin/cp','-cR',str(old),str(new)],check=True)
payload=new/'payload';c3=payload/'components/c3';shutil.rmtree(c3);shutil.copytree(candidate['unpack'],c3,symlinks=True)
source=P/'scripts/f-installed-runtime.mjs';before=source.read_bytes();token=b"'oasis-professional-service':'0.0.1'";assert before.count(token)==1
controller=payload/'controller/scripts/f-installed-runtime.mjs';controller.write_bytes(before.replace(token,b"'oasis-professional-service':'0.1.0-rc.3'"))
template=read(payload/'profile-template.json');policy=template['nativeBusinessRecovery'];assert 'nativeZeroGeneration' not in template
old_policy=read(old/'payload/profile-template.json')['nativeBusinessRecovery'];policy['archiveSHA256']=candidate['archiveSHA256'];policy['guardedFiles']={p:sha(c3/p) for p in policy['guardedFiles']}
assert policy['scope']==old_policy['scope'] and policy['budget']==dict.fromkeys(['model','api','upload','payment'],0)
assert [p for p,h in policy['guardedFiles'].items() if h!=old_policy['guardedFiles'][p]]==['lib/client.js']
write(payload/'profile-template.json',template)
files={};links={}
def walk(directory):
 for p in sorted(directory.iterdir()):
  k=str(p.relative_to(payload));s=p.lstat()
  if stat.S_ISLNK(s.st_mode):links[k]=os.readlink(p)
  elif stat.S_ISDIR(s.st_mode):walk(p)
  else:assert stat.S_ISREG(s.st_mode) and s.st_nlink==1;files[k]=sha(p)
walk(payload)
manifest=read(old/'bundle.json');old_files=manifest['files'];old_links=manifest['links'];assert old_links==links
manifest['source']={'baseBundle':str(old),'baseBundleSHA256':base['bundleSHA256'],'archive':candidate['archive'],'archiveSHA256':candidate['archiveSHA256'],'scope':'UI-RC2-01 prepared rc.3 bundle only; not installed, no App/Host or business execution; intended future scope unchanged','controllerAdaptation':{'revision':'rc3-ui-gap-version-table-r1','baseSHA256':sha(source),'derivedSHA256':sha(controller),'change':'Only component version 0.0.1 -> 0.1.0-rc.3 in reviewed current controller; guards/leases unchanged','preparedHandoffHelperSHA256':sha(P/'scripts/f-installed-controller-handoff.mjs')},'previousNativeEvidence':str(E.parent/'2026-11-08-m06-rc2-native-r1/verification.json'),'nativeAcceptanceForThisBundle':False}
manifest['files']=files;manifest['links']=links
write(new/'bundle.json',manifest)
changes=sorted(k for k in set(old_files)|set(files) if old_files.get(k)!=files.get(k))
assert changes==sorted(['components/c3/'+p for p in candidate['changedFromRc2']]+['controller/scripts/f-installed-runtime.mjs','profile-template.json'])
write(E/'bundle-identity.json',{'status':'PREPARED_EXACT_RC3_BUNDLE_NOT_INSTALLED_NOT_STARTED','bundle':str(new),'bundleSHA256':sha(new/'bundle.json'),'archive':candidate['archive'],'archiveSHA256':candidate['archiveSHA256'],'controller':str(controller),'controllerSHA256':sha(controller),'sourceControllerSHA256':sha(source),'baseBundleSHA256':base['bundleSHA256'],'memberCount':candidate['memberCount'],'files':len(files),'links':len(links),'changedFromRc2':changes,'scope':policy['scope'],'budget':policy['budget'],'guardChanges':['lib/client.js'],'installationChanged':False,'AppHostBoot':False,'nativeAcceptance':False})
print(json.dumps({'bundleSHA256':sha(new/'bundle.json'),'archiveSHA256':candidate['archiveSHA256'],'controllerSHA256':sha(controller),'files':len(files),'links':len(links),'changedMembers':changes},ensure_ascii=False))
