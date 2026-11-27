"""One-shot private rc.4 diagnostic projection; no installation or real request."""
import hashlib,json,shutil,subprocess,tarfile
from pathlib import Path,PurePosixPath
P=Path(__file__).resolve().parents[3];E=Path(__file__).resolve().parent
prior=json.loads((E.parent/'2026-11-08-m06-recovery-ui-gap-r1/candidate-identity.json').read_text())
base=Path(prior['unpack']);out=P/'.local/m06-execution-summary-20261108-r2';stage=out/'package'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text())
def write(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
expected={x['path']:x['sha256'] for x in prior['members']}
assert sha(Path(prior['archive']))==prior['archiveSHA256']
assert {str(p.relative_to(base)):sha(p) for p in base.rglob('*') if p.is_file()}==expected
assert not out.exists(),'do not replace an existing candidate'
out.mkdir();shutil.copytree(base,stage)
names=['v340-native-model.js','v340-runtime-contract.js','v340-runtime-service.js']
before_import="import { loadM06BusinessInstruction013 } from './m06-business-resources-0.1.3.js'"
public_import="import { loadM06PublicInstruction as loadM06BusinessInstruction013 } from './m06-public-resources-r1.js'"
changes=[]
for name in names:
 old=(E/'before-execution-summary-r2'/name).read_text();new=(P/'packages/oasis-professional-service/src'/name).read_text()
 if name=='v340-native-model.js':
  assert old.count(before_import)==new.count(before_import)==1
  old=old.replace(before_import,public_import);new=new.replace(before_import,public_import)
 assert hashlib.sha256(old.encode()).hexdigest()==expected['src/'+name],name
 (stage/'src'/name).write_text(new)
 changes.append({'path':'src/'+name,'originalSHA256':expected['src/'+name],'derivedSHA256':sha(stage/'src'/name),'change':'optional sanitized execution metadata; no raw output, prompt, retry or acceptance change'})
pkg=read(stage/'package.json');assert pkg['version']=='0.1.0-rc.3' and pkg['private'] is True
pkg['version']='0.1.0-rc.4';write(stage/'package.json',pkg)
facts=read(stage/'PUBLIC-RELEASE.json');assert facts['packageVersion']=='0.1.0-rc.3'
facts['packageVersion']='0.1.0-rc.4';facts['derivedSources']+=changes
facts['candidateDerivation']={'basePackageVersion':'0.1.0-rc.3','baseArchiveSHA256':prior['archiveSHA256'],'fix':'preserve existing safe finishKind/failureStage/usage through native candidate/runtime; old records unchanged','nativeAcceptance':False,'realGenerationVerified':False,'publicationAuthorized':False}
write(stage/'PUBLIC-RELEASE.json',facts)
home=P/'.local/build-home/m06-execution-summary-20261108-r2';home.mkdir(parents=True)
for name in ['empty-user.npmrc','empty-global.npmrc']:(home/name).write_text('')
env={'HOME':str(home),'PATH':str(P/'tools/bin')+':/usr/bin:/bin:/usr/sbin:/sbin','COREPACK_ENABLE_NETWORK':'0','NPM_CONFIG_USERCONFIG':str(home/'empty-user.npmrc'),'NPM_CONFIG_GLOBALCONFIG':str(home/'empty-global.npmrc'),'NPM_CONFIG_CACHE':str(P/'.local/build-cache'),'npm_config_manage_package_manager_versions':'false','NPM_CONFIG_OFFLINE':'true','CI':'true','LANG':'en_US.UTF-8'}
def run(name,argv,cwd):
 with (E/(name+'.stdout.log')).open('xb') as stdout,(E/(name+'.stderr.log')).open('xb') as stderr:r=subprocess.run(argv,cwd=cwd,env=env,stdout=stdout,stderr=stderr)
 write(E/(name+'-command.json'),{'argv':argv,'cwd':str(cwd),'exitCode':r.returncode,'privateHOME':str(home),'offline':True,'lifecycleScriptsDisabled':True})
 assert r.returncode==0,name
source=P/'packages/oasis-professional-service'
run('diagnostic-client-build-r2',[str(P/'tools/bin/node'),str(source/'node_modules/.pnpm/tsdown@0.22.14/node_modules/tsdown/dist/run.mjs'),'--config','tsdown.config.mjs','--out-dir',str(stage/'lib')],source)
run('diagnostic-pack-r2',[str(P/'tools/bin/npm'),'pack','--ignore-scripts','--offline','--json','--pack-destination',str(out)],stage)
pack=read(E/'diagnostic-pack-r2.stdout.log');assert len(pack)==1 and len(pack[0]['files'])==125
archive=out/pack[0]['filename'];assert archive.name=='oasis-professional-service-0.1.0-rc.4.tgz'
unpack=out/'unpacked';unpack.mkdir()
with tarfile.open(archive,'r:gz') as tar:
 members=tar.getmembers();assert len(members)==125
 for m in members:
  path=PurePosixPath(m.name);assert m.isfile() and path.parts[0]=='package' and '..' not in path.parts and not path.is_absolute()
  dest=unpack/str(path);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(tar.extractfile(m).read())
actual={str(p.relative_to(unpack/'package')):sha(p) for p in (unpack/'package').rglob('*') if p.is_file()}
assert set(actual)==set(expected)
delta=sorted(k for k in actual if actual[k]!=expected[k])
assert delta==sorted(['src/'+n for n in names]+['lib/client.js','lib/client.js.map','package.json','PUBLIC-RELEASE.json']),delta
# Every inlined own source must be the candidate's actual source bytes.
source_map=read(unpack/'package/lib/client.js.map');own=0
for path,content in zip(source_map['sources'],source_map['sourcesContent']):
 marker='/packages/oasis-professional-service/src/'
 if marker in path:
  assert (unpack/'package/src'/path.split(marker,1)[1]).read_text()==content,path
  own+=1
assert own>=50,own
result={'status':'PRIVATE_RC4_DIAGNOSTIC_CANDIDATE_BUILT_NOT_INSTALLED','packageVersion':'0.1.0-rc.4','private':True,'archive':str(archive),'archiveSHA256':sha(archive),'unpack':str(unpack/'package'),'baseArchiveSHA256':prior['archiveSHA256'],'memberCount':len(actual),'members':[{'path':k,'sha256':v} for k,v in sorted(actual.items())],'changedFromRc3':delta,'unchangedFromRc3':len(actual)-len(delta),'resourceAndLicenseUnchanged':True,'ownSourceMapMembersVerified':own,'AppHostBoot':False,'newModelCalls':0,'publicationAuthorized':False}
write(E/'diagnostic-candidate-identity-r2.json',result)
print(json.dumps({k:result[k] for k in ['status','archiveSHA256','memberCount','changedFromRc3','ownSourceMapMembersVerified']}))
