"""One-shot private rc.3 projection/build/pack; no installation or App/Host activation."""
import hashlib,json,shutil,subprocess,tarfile
from pathlib import Path,PurePosixPath
P=Path(__file__).resolve().parents[3];E=Path(__file__).resolve().parent
base=P/'.local/m06-native-business-recovery-20261108-r1/unpacked/package'
out=P/'.local/m06-recovery-ui-gap-20261108-r1';stage=out/'package'
old=E.parent/'2026-11-08-m06-native-business-recovery-offline-r1'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text())
def write(p,x):
 with p.open('w',encoding='utf-8') as f:f.write(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
prior=read(old/'candidate-identity.json');expected={x['path']:x['sha256'] for x in prior['members']}
assert sha(Path(prior['archive']))==prior['archiveSHA256']
assert {str(p.relative_to(base)):sha(p) for p in base.rglob('*') if p.is_file()}==expected
assert not out.exists(),'do not replace an existing candidate'
out.mkdir();shutil.copytree(base,stage)
changed=['src/client/PanelPages.js','src/client/PanelChrome.js']
for rel in changed:
 assert sha(stage/rel)==sha(E/'before/packages/oasis-professional-service'/rel)
 shutil.copy2(P/'packages/oasis-professional-service'/rel,stage/rel)
pkg=read(stage/'package.json');assert pkg['version']=='0.1.0-rc.2' and pkg['private'] is True
pkg['version']='0.1.0-rc.3';write(stage/'package.json',pkg)
facts=read(stage/'PUBLIC-RELEASE.json');old_identity=facts['packageVersion'];assert old_identity=='0.1.0-rc.1'
facts['packageVersion']='0.1.0-rc.3'
facts['sourceSelectionCountMeaning']='Historical original formal-scope selection count; not the current archive member count'
facts['candidateMemberCount']=len(expected)
facts['candidateSourceMemberCount']=sum(p.is_file() for p in (stage/'src').rglob('*'))
facts['candidateDerivation']={'basePackageVersion':'0.1.0-rc.2','baseArchiveSHA256':prior['archiveSHA256'],'basePublicManifestPackageVersion':old_identity,'fix':'UI-RC2-01 existing recovery empty-view and task-strip guards','nativeAcceptance':False,'realGenerationVerified':False,'publicationAuthorized':False}
facts['derivedSources'] += [{'path':r,'originalSHA256':expected[r],'derivedSHA256':sha(stage/r),'change':'UI-RC2-01 approved V0.1 recovery restrictions, existing FunctionCenter/creation callback only'} for r in changed]
write(stage/'PUBLIC-RELEASE.json',facts)
home=P/'.local/build-home/m06-recovery-ui-gap-20261108-r1';home.mkdir(parents=True)
for name in ['empty-user.npmrc','empty-global.npmrc']:(home/name).write_text('')
env={'HOME':str(home),'PATH':str(P/'tools/bin')+':/usr/bin:/bin:/usr/sbin:/sbin','COREPACK_ENABLE_NETWORK':'0','NPM_CONFIG_USERCONFIG':str(home/'empty-user.npmrc'),'NPM_CONFIG_GLOBALCONFIG':str(home/'empty-global.npmrc'),'NPM_CONFIG_CACHE':str(P/'.local/build-cache'),'npm_config_manage_package_manager_versions':'false','NPM_CONFIG_OFFLINE':'true','CI':'true','LANG':'en_US.UTF-8'}
def run(name,argv,cwd):
 with (E/(name+'.stdout.log')).open('wb') as stdout,(E/(name+'.stderr.log')).open('wb') as stderr:
  r=subprocess.run(argv,cwd=cwd,env=env,stdout=stdout,stderr=stderr)
 write(E/(name+'-command.json'),{'argv':argv,'cwd':str(cwd),'exitCode':r.returncode,'privateHOME':str(home),'offline':True,'lifecycleScriptsDisabled':True})
 assert r.returncode==0,name
source=P/'packages/oasis-professional-service'
run('candidate-client-build',[str(P/'tools/bin/node'),str(source/'node_modules/.pnpm/tsdown@0.22.14/node_modules/tsdown/dist/run.mjs'),'--config','tsdown.config.mjs','--out-dir',str(stage/'lib')],source)
run('candidate-pack',[str(P/'tools/bin/npm'),'pack','--ignore-scripts','--offline','--json','--pack-destination',str(out)],stage)
pack=read(E/'candidate-pack.stdout.log');assert len(pack)==1 and len(pack[0]['files'])==125
archive=out/pack[0]['filename'];assert archive.name=='oasis-professional-service-0.1.0-rc.3.tgz'
unpack=out/'unpacked';unpack.mkdir()
with tarfile.open(archive,'r:gz') as tar:
 members=tar.getmembers();assert len(members)==125
 for m in members:
  path=PurePosixPath(m.name);assert m.isfile() and path.parts[0]=='package' and '..' not in path.parts and not path.is_absolute()
  dest=unpack/str(path);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(tar.extractfile(m).read())
actual={str(p.relative_to(unpack/'package')):sha(p) for p in (unpack/'package').rglob('*') if p.is_file()}
assert set(actual)==set(expected)
delta=sorted(k for k in actual if actual[k]!=expected[k])
assert delta==sorted(changed+['lib/client.js','lib/client.js.map','package.json','PUBLIC-RELEASE.json']),delta
assert sha(unpack/'package/LICENSE')==expected['LICENSE']
assert read(unpack/'package/PUBLIC-RELEASE.json')['packageVersion']==read(unpack/'package/package.json')['version']
write(E/'candidate-identity.json',{'status':'PRIVATE_RC3_CANDIDATE_BUILT_NOT_INSTALLED_NOT_NATIVE_ACCEPTED_NOT_PUBLISHED','packageVersion':'0.1.0-rc.3','private':True,'archive':str(archive),'archiveSHA256':sha(archive),'unpack':str(unpack/'package'),'baseArchiveSHA256':prior['archiveSHA256'],'memberCount':len(actual),'sourceMemberCount':facts['candidateSourceMemberCount'],'members':[{'path':k,'sha256':v} for k,v in sorted(actual.items())],'changedFromRc2':delta,'unchangedFromRc2':len(actual)-len(delta),'resourceAndLicenseUnchanged':True,'metadataCorrection':'rc.2 carried historical rc.1 packageVersion; new rc.3 manifest now matches package.json, historical formal-selection count labeled, original rc.2 untouched','sourceMapPaths':'local build-relative; no publication normalization claimed','AppHostBoot':False})
print(json.dumps({'archive':str(archive),'archiveSHA256':sha(archive),'members':len(actual),'changedFromRc2':delta,'unchangedFromRc2':len(actual)-len(delta)},ensure_ascii=False))
