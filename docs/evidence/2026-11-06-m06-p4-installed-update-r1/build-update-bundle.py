from pathlib import Path
import json,hashlib,subprocess,tarfile,shutil,os
repo=Path(__file__).resolve().parents[3];e=Path(__file__).resolve().parent
read=lambda p:json.loads(p.read_bytes());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,v):
 with p.open('x') as f:json.dump(v,f,ensure_ascii=False,indent=2);f.write('\n')
base=read(repo/'docs/evidence/2026-11-06-m06-native-zero-installed-r1/install-spec.json')
assert sha(Path(base['bundle'])/'bundle.json')==base['expectedSHA256']=='db673f66ad8a0a84b93f421faf923dce4d0fbfa823d5317e2d8c51691c2989d3'
archiveInfo=read(repo/'docs/evidence/2026-11-06-m06-structured-revision-r1/archive-inspection-r2.json');archive=Path(archiveInfo['archive'])
assert sha(archive)=='6f2f16e771cb56bf5514b35de87bbf0903d6bd4faabad36cfef4f4ac327504bb'
scratch=repo/'.local/m06-p4-installed-update-20261106-r1';scratch.mkdir()
bundle=scratch/'bundle';bundle.mkdir();payload=bundle/'payload'
root=repo/'.dsh-test/m06-p4-unknown-update-20261106-r1';assert not root.exists()
cmd=['/bin/cp','-cR',str(Path(base['bundle'])/'payload'),str(payload)]
r=subprocess.run(cmd,capture_output=True,text=True);save(e/'copy-command.json',{'argv':cmd,'exit_code':r.returncode,'stderr':r.stderr});r.check_returncode()
component=payload/'components/c3';assert component.is_relative_to(payload);shutil.rmtree(component);component.mkdir()
with tarfile.open(archive,'r:gz') as tf:
 for m in tf.getmembers():
  assert m.isfile() and m.name.startswith('package/') and '..' not in Path(m.name).parts
  p=component/Path(m.name).relative_to('package');p.parent.mkdir(parents=True,exist_ok=True)
  with p.open('xb') as f:f.write(tf.extractfile(m).read())
  p.chmod(m.mode&0o777)
template=read(payload/'profile-template.json');template['nativeZeroGeneration']['archiveSHA256']=sha(archive)
assert all(sha(component/p)==h for p,h in template['nativeZeroGeneration']['guardedFiles'].items())
(payload/'profile-template.json').write_text(json.dumps(template,ensure_ascii=False,indent=2)+'\n')
files={};links={}
for parent,dirs,names in os.walk(payload,followlinks=False):
 for n in list(dirs):
  p=Path(parent)/n
  if p.is_symlink():links[str(p.relative_to(payload))]=os.readlink(p);dirs.remove(n)
 for n in names:
  p=Path(parent)/n;k=str(p.relative_to(payload))
  if p.is_symlink():links[k]=os.readlink(p)
  else:files[k]=sha(p)
old=read(Path(base['bundle'])/'bundle.json');manifest={**old,'source':{'baseBundle':base['bundle'],'baseBundleSHA256':base['expectedSHA256'],'archive':str(archive),'archiveSHA256':sha(archive),'scope':'new local installed candidate; no App/real call/publication acceptance'},'files':dict(sorted(files.items())),'links':dict(sorted(links.items()))}
save(bundle/'bundle.json',manifest)
changed=sorted(k for k,v in files.items() if old['files'].get(k)!=v)
assert changed==['components/c3/src/v340-document.js','components/c3/src/v340-result-service.js','components/c3/src/v340-runtime-contract.js','profile-template.json'],changed
spec={'root':str(root),'base':{'bundle':base['bundle'],'expectedSHA256':base['expectedSHA256']},'target':{'bundle':str(bundle),'expectedSHA256':sha(bundle/'bundle.json')},'archive':str(archive),'archiveSHA256':sha(archive),'changedFromBase':changed,'versions':manifest['versions'],'files':len(files),'links':len(links)}
save(e/'update-spec.json',spec);print(json.dumps({'targetBundleSHA256':spec['target']['expectedSHA256'],'files':len(files),'links':len(links),'changes':changed}))
