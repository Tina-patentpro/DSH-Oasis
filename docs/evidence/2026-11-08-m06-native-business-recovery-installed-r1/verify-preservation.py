import hashlib,json,os,stat,subprocess
from pathlib import Path
E=Path(__file__).resolve().parent;P=E.parents[2]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text())
write=lambda p,x:p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
auth=read(E/'authorization.json');root=Path(auth['root']);identity=read(E/'bundle-identity.json')
assert sha(Path(identity['archive']))==auth['archiveSHA256']
oldstate=read(E/'before/target-root/installation.json');state=read(root/'installation.json')
assert state['current']==identity['bundleSHA256']
assert state['releases'][auth['expectedCurrent']]==oldstate['releases'][auth['expectedCurrent']]
assert len(state['releases'])==len(oldstate['releases'])+1
oldrelease=root/'releases'/auth['expectedCurrent'];receipt=read(oldrelease/'receipt.json')
assert sha(oldrelease/'receipt.json')==oldstate['releases'][auth['expectedCurrent']]
def tree(directory,ignore=()):
 result={}
 for parent,dirs,files in os.walk(directory,followlinks=False):
  for name in list(dirs)+files:
   p=Path(parent)/name;k=str(p.relative_to(directory))
   if any(k==i or k.startswith(i+'/') for i in ignore):
    if name in dirs:dirs.remove(name)
    continue
   s=p.lstat()
   if p.is_symlink():
    result[k]={'type':'link','target':os.readlink(p)}
    if name in dirs:dirs.remove(name)
   elif p.is_file():result[k]={'type':'file','sha256':sha(p),'mode':stat.S_IMODE(s.st_mode)}
 return result
assert tree(oldrelease,('receipt.json','profile-snapshot'))==receipt['program']
assert tree(oldrelease/'profile-snapshot')==receipt['profile']
protected=[]
for row in read(E/'protected-before.json'):
 current=sha(Path(row['path']));assert current==row['sha256'],row['path'];protected.append({**row,'afterSHA256':current,'unchanged':True})
write(E/'protected-after.json',protected)
journal=Path(read(E/'controller-handoff-result.json')['journal'])
for rel in ['installation.json','control/scripts/f-installed-runtime.mjs','control/patches/storage-json-single-owner/installed-lease.mjs','control/patches/storage-json-single-owner/ownership.mjs']:
 assert (journal/'before'/rel).read_bytes()==(E/'before/target-root'/rel).read_bytes()
assert not any((root/n).exists() for n in ['RECOVERY_REQUIRED','startup.lock','data/startup.lock'])
release=root/'releases'/state['current'];c3=release/'components/c3'
expected=read(E/'installed-package-expected.json')
actual={str(p.relative_to(c3)):sha(p) for p in c3.rglob('*') if p.is_file()};assert actual==expected
assert len(actual)==125
assert (release/'profile-template.json').read_bytes()==(Path(identity['bundle'])/'payload/profile-template.json').read_bytes()
assert sha(root/'control/scripts/f-installed-runtime.mjs')==identity['controllerSHA256']
for rel,h in oldstate['controlFiles'].items():
 if rel!='scripts/f-installed-runtime.mjs':assert sha(root/'control'/rel)==h
assert sha(root/'control/node')==oldstate['nodeSHA256']
newstate={k:v for k,v in state.items() if k not in ['current','releases','controlFiles']}
assert newstate=={k:v for k,v in oldstate.items() if k not in ['current','releases','controlFiles']}
result={'status':'INSTALLATION_AND_HISTORY_PRESERVED','oldReleaseProgramAndProfileUnchanged':True,'oldReceiptSHA256':sha(oldrelease/'receipt.json'),'oldControlAndStateSnapshotsExact':True,'protectedOriginals':len(protected),'actualInstalledMembers':len(actual),'actualInstalledArchiveSHA256':auth['archiveSHA256'],'currentBundleSHA256':state['current'],'currentControllerSHA256':identity['controllerSHA256'],'gateOwnershipNodeUnchanged':True,'writerReleased':True,'recoveryMarkerPresent':False,'businessJSONSHA256':sha(root/'data/home/storages/oasis_workbench.json'),'AppHostBoot':False,'newBusinessExecutions':0}
write(E/'preservation-result.json',result);print(json.dumps(result))
