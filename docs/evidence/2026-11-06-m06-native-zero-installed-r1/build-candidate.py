"""New offline candidate from selected retained program payload, never original data/.
Uses the existing F bundle schema; does not modify or re-sign any old bundle.
"""
from pathlib import Path
import datetime,hashlib,json,os,subprocess,tarfile

repo=Path(__file__).resolve().parents[3]
evidence=Path(__file__).resolve().parent
read=lambda p:json.loads(p.read_bytes())
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,x):
 p.parent.mkdir(parents=True,exist_ok=True)
 with p.open('x') as f:json.dump(x,f,ensure_ascii=False,indent=2);f.write('\n')
assembly=read(repo/'docs/evidence/2026-11-06-m06-native-zero-assembly-r1/assembly-inputs.json')
inspection=read(repo/'docs/evidence/2026-11-06-m06-native-zero-generation-r1/archive-inspection.json')
source=Path(assembly['source_app']).parent.parent
archive=Path(inspection['archive'])
assert digest(archive)=='c07f2120a42e1a9d8110901eb35ed314eb5dd7225b1b35234c5b8d770fb03494'
scratch=repo/'.local/m06-native-zero-installed-20261106-r1'
bundle=scratch/'bundle';payload=bundle/'payload'
root=repo/'.dsh-test/m06-native-zero-installed-20261106-r1'
assert not scratch.exists() and not root.exists()
payload.mkdir(parents=True)
commands=[]
for name in ['App','node','pnpm','runtime-extra','package.json','pnpm-workspace.yaml','NOTICE.installation-candidate.md']:
 args=['/bin/cp','-cR',str(source/name),str(payload/name)]
 r=subprocess.run(args,capture_output=True,text=True);commands.append({'argv':args,'exit_code':r.returncode,'stderr':r.stderr});r.check_returncode()
for i in [0,1,2,4,5,6]:
 target=payload/f'components/c{i}';target.parent.mkdir(exist_ok=True)
 args=['/bin/cp','-cR',str(source/f'components/c{i}'),str(target)]
 r=subprocess.run(args,capture_output=True,text=True);commands.append({'argv':args,'exit_code':r.returncode,'stderr':r.stderr});r.check_returncode()
component=payload/'components/c3';component.mkdir()
with tarfile.open(archive,'r:gz') as tf:
 members=tf.getmembers();assert len(members)==134
 for m in members:
  assert m.isfile() and m.name.startswith('package/') and '..' not in Path(m.name).parts
  p=component/Path(m.name).relative_to('package');p.parent.mkdir(parents=True,exist_ok=True)
  with p.open('xb') as f:f.write(tf.extractfile(m).read())
  p.chmod(m.mode&0o777)
for name in ['scripts/f-installed-runtime.mjs','patches/storage-json-single-owner/installed-lease.mjs','patches/storage-json-single-owner/ownership.mjs']:
 target=payload/'controller'/name;target.parent.mkdir(parents=True,exist_ok=True)
 subprocess.run(['/bin/cp','-c',str(repo/name),str(target)],check=True)
template=read(source/'profile-template.json')
for row in template['patch']:
 if row.get('id')=='desktop-shell':row['config']['port']=57619
template['nativeZeroGeneration']={'schemaVersion':1,'policy':'m06-native-zero-generation-installed-v1',
 'archiveSHA256':digest(archive),'budget':{'model':0,'api':0,'upload':0,'payment':0},
 'guardedFiles':{n:digest(component/n) for n in ['src/index.js','src/workbench-rpc.js']}}
save(payload/'profile-template.json',template)
files={};links={};source_files={};source_links={}
def walk(folder,files,links):
 for parent,dirs,names in os.walk(folder,followlinks=False):
  for n in list(dirs):
   p=Path(parent)/n
   if p.is_symlink():links[str(p.relative_to(folder))]=os.readlink(p);dirs.remove(n)
  for n in names:
   p=Path(parent)/n;k=str(p.relative_to(folder))
   if p.is_symlink():links[k]=os.readlink(p)
   else:files[k]=digest(p)
walk(payload,files,links)
walk(source,source_files,source_links)
save(evidence/'source-release-baseline.json',{'root':str(source),'files':source_files,'links':source_links})
manifest={'schemaVersion':1,'kind':'OASIS_F_OFFLINE_BUNDLE','realCallBudget':0,
 'versions':{'desktop':'2.0.17','dsh':'0.2.0-rc.2','cordis':'4.0.4','sidebar':'0.24.1','node':'24.21.0','pnpm':'11.8.0'},
 'checkpoint':template['checkpoint'],'source':{'release':str(source),'receiptSHA256':digest(source/'receipt.json'),
 'archive':str(archive),'archiveSHA256':digest(archive),'scope':'selected frozen program only; no original data, Profile or derived root node_modules'},
 'files':dict(sorted(files.items())),'links':dict(sorted(links.items()))}
save(bundle/'bundle.json',manifest)
spec={'bundle':str(bundle),'expectedSHA256':digest(bundle/'bundle.json'),'root':str(root)}
save(evidence/'install-spec.json',spec);save(evidence/'copy-commands.json',commands)
save(evidence/'candidate-inputs.json',{'created':datetime.datetime.now().astimezone().isoformat(),**spec,
 'source_release':str(source),'archive':str(archive),'archiveSHA256':digest(archive),'payload_file_count':len(files),'payload_link_count':len(links),
 'component_archive_members':134,'controllerSHA256':digest(repo/'scripts/f-installed-runtime.mjs'),'app_started':False})
print(json.dumps({'bundle_sha256':spec['expectedSHA256'],'files':len(files),'links':len(links),'root':str(root)}))
